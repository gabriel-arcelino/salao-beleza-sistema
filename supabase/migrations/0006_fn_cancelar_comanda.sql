-- ============================================================================
-- Migration 0006: fn_cancelar_comanda
--
-- Implementa Seção 11.5 (cancelamento e estorno) + 11.6 (competência).
--
-- SEGURANÇA: security definer com search_path fixo em '' e todas as
-- referências de tabela qualificadas com "public." — previne que um
-- schema anterior no search_path do chamador sombreie uma tabela e a
-- função opere sobre um objeto falso com privilégio elevado (prática
-- oficial do Supabase para funções SECURITY DEFINER).
--
-- REGRA CENTRAL: a checagem "competência já fechada?" é POR ITEM
-- (profissional pode variar item a item dentro da mesma comanda).
--   - Competência aberta → só marca CANCELADA; a comissão desaparece
--     naturalmente do cálculo futuro (fn_fechar_competencia_comissao só
--     soma comandas FINALIZADA).
--   - Competência já FECHADA → gera ajustes_comissao (negativo) na
--     competência aberta vigente, referenciando o item original.
--
-- IDEMPOTÊNCIA: comanda já CANCELADA → devolve sem reprocessar.
-- ============================================================================

create or replace function fn_cancelar_comanda(
  p_comanda_id uuid,
  p_motivo text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_salon_id uuid := auth_helpers.current_salon_id();
  v_comanda public.comandas%rowtype;
  v_item record;
  v_competencia_original text;
  v_competencia_atual text := to_char(current_date, 'YYYY-MM');
  v_ja_fechada boolean;
begin
  if v_salon_id is null then
    raise exception 'Sessão sem salon_id — usuário não autenticado corretamente.';
  end if;

  if p_motivo is null or trim(p_motivo) = '' then
    raise exception 'Cancelamento exige motivo (Seção 11.5 — "deve deixar histórico").';
  end if;

  if auth_helpers.current_perfil() not in ('ADMIN', 'GERENTE') then
    raise exception 'Apenas ADMIN ou GERENTE podem cancelar uma comanda finalizada (decisão de restrição de perfil, seguindo padrão de mercado de PDV).';
  end if;

  select * into v_comanda from public.comandas
  where id = p_comanda_id and salon_id = v_salon_id
  for update;

  if not found then
    raise exception 'Comanda % não encontrada neste salão.', p_comanda_id;
  end if;

  if v_comanda.status = 'CANCELADA' then
    return jsonb_build_object('comanda_id', v_comanda.id, 'status', v_comanda.status, 'idempotente', true);
  end if;

  if v_comanda.status = 'ABERTA' then
    raise exception
    'Comanda % está ABERTA — cancelamento via RPC é só para comandas FINALIZADA; uma comanda aberta se exclui via CRUD normal.',
    p_comanda_id;
  end if;

  v_competencia_original := to_char(v_comanda.closed_at, 'YYYY-MM');

  for v_item in select * from public.comanda_itens where comanda_id = p_comanda_id
  loop
    select exists(
      select 1 from public.fechamentos_comissao
      where salon_id = v_salon_id
        and profissional_id = v_item.profissional_id
        and competencia = v_competencia_original
        and status = 'FECHADO'
    ) into v_ja_fechada;

    if v_ja_fechada then
      insert into public.ajustes_comissao (
        salon_id, profissional_id, competencia_origem, competencia_lancamento,
        comanda_item_id, valor, motivo, created_by
      ) values (
        v_salon_id, v_item.profissional_id, v_competencia_original, v_competencia_atual,
        v_item.id, -coalesce(v_item.comissao_valor_snapshot, 0),
        format('Ajuste por cancelamento da comanda %s: %s', p_comanda_id, p_motivo),
        auth_helpers.current_usuario_id()
      );
    end if;

    if v_item.tipo = 'PRODUTO' then
      insert into public.movimentacoes_estoque (
        salon_id, produto_id, tipo, quantidade, custo_unitario, origem_tipo, origem_id, observacao
      )
      select v_salon_id, v_item.produto_id, 'DEVOLUCAO', v_item.quantidade, preco_custo,
        'cancelamento_comanda', p_comanda_id, p_motivo
      from public.produtos where id = v_item.produto_id;

      update public.produtos set estoque_atual = estoque_atual + v_item.quantidade
      where id = v_item.produto_id;
    end if;
  end loop;

  update public.pagamentos set estornado = true, estornado_em = now()
  where comanda_id = p_comanda_id and not estornado;

  update public.comandas set
    status = 'CANCELADA',
    motivo_cancelamento = p_motivo,
    cancelado_em = now(),
    cancelado_por = auth_helpers.current_usuario_id()
  where id = p_comanda_id;

  insert into public.audit_log (salon_id, user_id, entity, entity_id, action, old_data, new_data)
  values (
    v_salon_id, auth_helpers.current_usuario_id(), 'comandas', p_comanda_id, 'CANCELAMENTO',
    jsonb_build_object('status', v_comanda.status),
    jsonb_build_object('status', 'CANCELADA', 'motivo', p_motivo)
  );

  return jsonb_build_object(
    'comanda_id', p_comanda_id,
    'status', 'CANCELADA',
    'competencia_original', v_competencia_original,
    'idempotente', false
  );
end;
$$;
