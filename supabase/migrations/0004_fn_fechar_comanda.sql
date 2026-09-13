-- ============================================================================
-- Migration 0004: fn_fechar_comanda
--
-- Implementa, nesta ordem: Seção 11.1 (validações de fechamento),
-- 11.3.1 (rateio de desconto, método do maior resto), 11.2 (cálculo de
-- taxa), 11.3.2 (base de comissão + rateio de taxa), 11.3.3 (comissão de
-- produto), 11.4 (baixa de estoque, sem bloqueio — v2.4).
--
-- PRESSUPOSTO: os itens da comanda já foram inseridos em comanda_itens
-- antes desta chamada (fluxo normal de CRUD, Protocolo A) — esta RPC não
-- recebe itens, só finaliza uma comanda ABERTA que já tem itens e,
-- opcionalmente, desconto+motivo já setados em comandas.desconto /
-- comandas.motivo_desconto_id.
--
-- IDEMPOTÊNCIA (Seção 11.1): se a comanda já estiver FINALIZADA, a RPC
-- não reprocessa — devolve o resultado já gravado. Isso cobre retry de
-- rede do cliente sem duplicar comissão/estoque.
-- ============================================================================

create or replace function fn_fechar_comanda(
  p_comanda_id uuid,
  p_pagamentos jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_salon_id uuid := auth_helpers.current_salon_id();
  v_comanda public.comandas%rowtype;
  v_subtotal numeric(10,2) := 0;
  v_total_pagamentos numeric(10,2) := 0;
  v_valor_esperado numeric(10,2);
  v_soma_desconto_alocado numeric(10,2) := 0;
  v_resto_desconto numeric(10,2);
  v_item record;
  v_pagamento jsonb;
  v_config record;
  v_taxa_percentual numeric(5,2);
  v_taxa_valor numeric(10,2);
  v_taxa_alocada_item numeric(10,2);
  v_reducao_taxa_comissao numeric(10,2);
  v_base_comissao numeric(10,2);
  v_percentual_comissao numeric(5,2);
  v_comissao_valor numeric(10,2);
  v_motivo_afeta_comissao boolean;
  v_count_itens integer;
begin
  if v_salon_id is null then
    raise exception 'Sessão sem salon_id — usuário não autenticado corretamente.';
  end if;

  select * into v_comanda from public.comandas
  where id = p_comanda_id and salon_id = v_salon_id
  for update;

  if not found then
    raise exception 'Comanda % não encontrada neste salão.', p_comanda_id;
  end if;

  if v_comanda.status = 'FINALIZADA' then
    return jsonb_build_object(
      'comanda_id', v_comanda.id,
      'status', v_comanda.status,
      'total', v_comanda.total,
      'idempotente', true
    );
  end if;

  if v_comanda.status = 'CANCELADA' then
    raise exception 'Comanda % está cancelada, não pode ser finalizada.', p_comanda_id;
  end if;

  select coalesce(sum(preco_unitario * quantidade), 0), count(*)
  into v_subtotal, v_count_itens
  from public.comanda_itens where comanda_id = p_comanda_id;

  if v_count_itens = 0 then
    raise exception 'Comanda % não possui itens.', p_comanda_id;
  end if;

  select coalesce(sum((p->>'valor_bruto')::numeric), 0)
  into v_total_pagamentos
  from jsonb_array_elements(p_pagamentos) p;

  v_valor_esperado := v_subtotal - coalesce(v_comanda.desconto, 0);

  if abs(v_total_pagamentos - v_valor_esperado) > 0.01 then
    raise exception
    'Pagamentos (%) não conferem com o valor esperado (%) da comanda %.',
    v_total_pagamentos, v_valor_esperado, p_comanda_id;
  end if;

  v_motivo_afeta_comissao := true;
  if v_comanda.motivo_desconto_id is not null then
    select afeta_comissao into v_motivo_afeta_comissao
    from public.motivos_desconto where id = v_comanda.motivo_desconto_id;
  end if;

  drop table if exists pg_temp.tmp_calc_item;

  create temporary table tmp_calc_item (
    item_id uuid primary key,
    valor_bruto numeric(10,2),
    desconto_alocado numeric(10,2) default 0,
    resto_desconto numeric(10,4) default 0,
    reducao_taxa_comissao numeric(10,2) default 0
  ) on commit drop;

  insert into pg_temp.tmp_calc_item (item_id, valor_bruto)
  select id, preco_unitario * quantidade from public.comanda_itens where comanda_id = p_comanda_id;

  if coalesce(v_comanda.desconto, 0) > 0 then
    update pg_temp.tmp_calc_item
    set resto_desconto = (v_comanda.desconto * valor_bruto / v_subtotal),
        desconto_alocado = floor((v_comanda.desconto * valor_bruto / v_subtotal) * 100) / 100;

    select coalesce(sum(desconto_alocado), 0) into v_soma_desconto_alocado from pg_temp.tmp_calc_item;
    v_resto_desconto := round(v_comanda.desconto - v_soma_desconto_alocado, 2);

    declare
      v_item_id_maior_resto uuid;
    begin
      while v_resto_desconto > 0 loop
        select item_id into v_item_id_maior_resto
        from pg_temp.tmp_calc_item
        order by (resto_desconto - floor(resto_desconto * 100) / 100) desc, item_id
        limit 1;

        update pg_temp.tmp_calc_item
        set desconto_alocado = desconto_alocado + 0.01,
            resto_desconto = 0
        where item_id = v_item_id_maior_resto;

        v_resto_desconto := v_resto_desconto - 0.01;
      end loop;
    end;
  end if;

  for v_pagamento in select * from jsonb_array_elements(p_pagamentos)
  loop
    select taxa_percentual into v_taxa_percentual
    from public.config_taxas
    where salon_id = v_salon_id and metodo = (v_pagamento->>'metodo') and ativo;

    if v_taxa_percentual is null then
      raise exception 'Método de pagamento "%" sem taxa configurada em config_taxas.', v_pagamento->>'metodo';
    end if;

    v_taxa_valor := round((v_pagamento->>'valor_bruto')::numeric * v_taxa_percentual / 100, 2);

    insert into public.pagamentos (salon_id, comanda_id, metodo, valor_bruto, taxa_percentual, taxa_valor, valor_liquido)
    values (
      v_salon_id, p_comanda_id, v_pagamento->>'metodo',
      (v_pagamento->>'valor_bruto')::numeric, v_taxa_percentual, v_taxa_valor,
      (v_pagamento->>'valor_bruto')::numeric - v_taxa_valor
    );

    for v_item in select * from public.comanda_itens where comanda_id = p_comanda_id
    loop
      select * into v_config from pg_temp.tmp_calc_item where item_id = v_item.id;

      v_taxa_alocada_item := round(v_taxa_valor * (v_item.preco_unitario * v_item.quantidade) / v_subtotal, 2);

      select coalesce(cc_esp.rateio_taxa, cc_prof.rateio_taxa, 'SALAO'::public.rateio_taxa_tipo) as rateio_taxa,
             coalesce(cc_esp.rateio_taxa_por_forma_pagamento, cc_prof.rateio_taxa_por_forma_pagamento) as rateio_jsonb
      into v_config
      from (select 1) dummy
      left join public.config_comissoes cc_esp
      on cc_esp.salon_id = v_salon_id and cc_esp.profissional_id = v_item.profissional_id
      and cc_esp.servico_id = v_item.servico_id
      left join public.config_comissoes cc_prof
      on cc_prof.salon_id = v_salon_id and cc_prof.profissional_id = v_item.profissional_id
      and cc_prof.servico_id is null;

      if v_config.rateio_taxa = 'SALAO' then
        v_reducao_taxa_comissao := 0;
      elsif v_config.rateio_taxa = 'PROFISSIONAL_PROPORCIONAL' then
        v_reducao_taxa_comissao := v_taxa_alocada_item;
      elsif v_config.rateio_taxa = 'POR_FORMA_PAGAMENTO' then
        if v_config.rateio_jsonb is null or not (v_config.rateio_jsonb ? (v_pagamento->>'metodo')) then
          raise exception
          'Forma de pagamento "%" sem rateio configurado em rateio_taxa_por_forma_pagamento (profissional %).',
          v_pagamento->>'metodo', v_item.profissional_id;
        end if;
        v_reducao_taxa_comissao := round(
          v_taxa_alocada_item * (v_config.rateio_jsonb->>(v_pagamento->>'metodo'))::numeric / 100, 2
        );
      end if;

      update pg_temp.tmp_calc_item
      set reducao_taxa_comissao = reducao_taxa_comissao + v_reducao_taxa_comissao
      where item_id = v_item.id;
    end loop;
  end loop;

  for v_item in select * from public.comanda_itens where comanda_id = p_comanda_id
  loop
    select * into v_config from pg_temp.tmp_calc_item where item_id = v_item.id;

    declare
      v_base_calculo public.base_calculo_comissao;
      v_comissao_sobre_produto boolean;
      v_percentual_produto numeric(5,2);
    begin
      select
        coalesce(cc_esp.comissao_percentual, cc_prof.comissao_percentual, prof.comissao_percentual_padrao),
        coalesce(cc_esp.base_calculo, cc_prof.base_calculo, 'BRUTO'::public.base_calculo_comissao),
        coalesce(cc_esp.comissao_sobre_produto, cc_prof.comissao_sobre_produto, false)
      into v_percentual_comissao, v_base_calculo, v_comissao_sobre_produto
      from public.profissionais prof
      left join public.config_comissoes cc_esp
      on cc_esp.salon_id = v_salon_id and cc_esp.profissional_id = v_item.profissional_id
      and cc_esp.servico_id = v_item.servico_id
      left join public.config_comissoes cc_prof
      on cc_prof.salon_id = v_salon_id and cc_prof.profissional_id = v_item.profissional_id
      and cc_prof.servico_id is null
      where prof.id = v_item.profissional_id;

      if v_item.tipo = 'PRODUTO' then
        if not v_comissao_sobre_produto then
          v_percentual_comissao := 0;
        else
          select percentual_comissao into v_percentual_produto
          from public.produtos where id = v_item.produto_id;
          if v_percentual_produto is not null then
            v_percentual_comissao := v_percentual_produto;
          end if;
        end if;
      end if;

      if v_base_calculo = 'LIQUIDO_APOS_DESCONTO' and v_motivo_afeta_comissao then
        v_base_comissao := (v_item.preco_unitario * v_item.quantidade) - v_config.desconto_alocado;
      else
        v_base_comissao := v_item.preco_unitario * v_item.quantidade;
      end if;
      v_base_comissao := greatest(v_base_comissao - v_config.reducao_taxa_comissao, 0);

      v_comissao_valor := round(v_base_comissao * v_percentual_comissao / 100, 2);
    end;

    update public.comanda_itens set
      desconto = v_config.desconto_alocado,
      motivo_desconto_id = v_comanda.motivo_desconto_id,
      comissao_percentual_snapshot = v_percentual_comissao,
      comissao_valor_snapshot = v_comissao_valor,
      comissao_processada = true,
      total = (preco_unitario * quantidade) - v_config.desconto_alocado
    where id = v_item.id;

    if v_item.tipo = 'PRODUTO' then
      insert into public.movimentacoes_estoque (
        salon_id, produto_id, tipo, quantidade, custo_unitario, origem_tipo, origem_id
      )
      select v_salon_id, v_item.produto_id, 'VENDA', -v_item.quantidade, preco_custo, 'comanda_item', v_item.id
      from public.produtos where id = v_item.produto_id;

      update public.produtos set estoque_atual = estoque_atual - v_item.quantidade
      where id = v_item.produto_id;
    end if;
  end loop;

  update public.comandas set
    status = 'FINALIZADA',
    subtotal = v_subtotal,
    total = v_valor_esperado,
    closed_at = now(),
    closed_by = auth_helpers.current_usuario_id()
  where id = p_comanda_id;

  return jsonb_build_object(
    'comanda_id', p_comanda_id,
    'status', 'FINALIZADA',
    'subtotal', v_subtotal,
    'desconto', v_comanda.desconto,
    'total', v_valor_esperado,
    'idempotente', false
  );
end;
$$;
