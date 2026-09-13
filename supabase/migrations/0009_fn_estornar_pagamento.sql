-- ============================================================================
-- Migration 0009: fn_estornar_pagamento
--
-- Implementa Seção 41 (fn_estornar_pagamento) + Seção 10.8 (múltiplos
-- pagamentos por comanda). Escopo deliberadamente restrito:
--   - NÃO mexe em estoque.
--   - NÃO recalcula/ajusta comissão automaticamente.
--   - NÃO muda o status da comanda.
--
-- LIMITAÇÃO CONHECIDA: sem chave natural de idempotência por estorno, um
-- retry intencional da mesma solicitação cria dois estornos.
-- ============================================================================

create or replace function fn_estornar_pagamento(
  p_pagamento_id uuid,
  p_valor numeric,
  p_motivo text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_salon_id uuid := auth_helpers.current_salon_id();
  v_pagamento public.pagamentos%rowtype;
  v_comanda_status text;
  v_total_estornado_anterior numeric(10,2);
  v_saldo_restante numeric(10,2);
begin
  if v_salon_id is null then
    raise exception 'Sessão sem salon_id — usuário não autenticado corretamente.';
  end if;

  if auth_helpers.current_perfil() not in ('ADMIN', 'GERENTE') then
    raise exception 'Apenas ADMIN ou GERENTE podem estornar um pagamento.';
  end if;

  if p_motivo is null or trim(p_motivo) = '' then
    raise exception 'Estorno exige motivo.';
  end if;

  if p_valor is null or p_valor <= 0 then
    raise exception 'Valor do estorno deve ser positivo.';
  end if;

  select * into v_pagamento from public.pagamentos
  where id = p_pagamento_id and salon_id = v_salon_id
  for update;

  if not found then
    raise exception 'Pagamento % não encontrado neste salão.', p_pagamento_id;
  end if;

  select status::text into v_comanda_status
  from public.comandas where id = v_pagamento.comanda_id;

  if v_comanda_status = 'CANCELADA' then
    raise exception
    'Comanda já está CANCELADA — o estorno deste pagamento já foi coberto por fn_cancelar_comanda.';
  end if;

  select coalesce(sum(valor), 0) into v_total_estornado_anterior
  from public.pagamento_estornos where pagamento_id = p_pagamento_id;

  v_saldo_restante := v_pagamento.valor_bruto - v_total_estornado_anterior;

  if p_valor > v_saldo_restante then
    raise exception
    'Valor do estorno (%) excede o saldo restante do pagamento (%).',
    p_valor, v_saldo_restante;
  end if;

  insert into public.pagamento_estornos (salon_id, pagamento_id, valor, motivo, created_by)
  values (v_salon_id, p_pagamento_id, p_valor, p_motivo, auth_helpers.current_usuario_id());

  if (v_total_estornado_anterior + p_valor) >= v_pagamento.valor_bruto then
    update public.pagamentos set estornado = true, estornado_em = now()
    where id = p_pagamento_id;
  end if;

  insert into public.audit_log (salon_id, user_id, entity, entity_id, action, old_data, new_data)
  values (
    v_salon_id, auth_helpers.current_usuario_id(), 'pagamentos', p_pagamento_id, 'ESTORNO',
    jsonb_build_object('saldo_antes', v_saldo_restante),
    jsonb_build_object('valor_estornado', p_valor, 'motivo', p_motivo)
  );

  return jsonb_build_object(
    'pagamento_id', p_pagamento_id,
    'valor_estornado', p_valor,
    'saldo_restante', v_saldo_restante - p_valor,
    'totalmente_estornado', (v_total_estornado_anterior + p_valor) >= v_pagamento.valor_bruto
  );
end;
$$;
