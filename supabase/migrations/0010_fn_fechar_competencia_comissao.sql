-- ============================================================================
-- Migration 0010: fn_fechar_competencia_comissao
--
-- Implementa Seção 10.12, 11.7, 11.7.1 do plano de arquitetura.
--
-- Consolida todos os itens de comissão não processados de um profissional
-- dentro de uma competência (mês/ano definido por comandas.closed_at).
-- Aplica abatimento de adiantamentos/vales (despesas vinculadas ao profissional),
-- considera saldo devedor rolado da competência anterior e ajustes da competência
-- atual. Nunca permite total_pago negativo — excedente vira saldo_devedor_gerado
-- para a competência seguinte.
--
-- Parâmetros:
--   p_profissional_id: UUID do profissional
--   p_competencia: texto no formato 'YYYY-MM'
--
-- Retorna JSON com o fechamento criado/atualizado.
-- ============================================================================

create or replace function fn_fechar_competencia_comissao(
  p_profissional_id uuid,
  p_competencia text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_salon_id uuid := auth_helpers.current_salon_id();
  v_profissional public.profissionais%rowtype;
  v_fechamento public.fechamentos_comissao%rowtype;
  v_total_bruto_calculado numeric(10,2) := 0;
  v_total_adiantamentos_abatidos numeric(10,2) := 0;
  v_saldo_anterior_competencia numeric(10,2) := 0;
  v_total_ajustes numeric(10,2) := 0;
  v_total_pago numeric(10,2) := 0;
  v_saldo_devedor_gerado numeric(10,2) := 0;
  v_competencia_anterior text;
  v_fechamento_anterior public.fechamentos_comissao%rowtype;
  v_fechamento_existente boolean := false;
  v_count_itens integer := 0;
begin
  -- Validações básicas
  if v_salon_id is null then
    raise exception 'Sessão sem salon_id — usuário não autenticado corretamente.';
  end if;

  if auth_helpers.current_perfil() not in ('ADMIN', 'GERENTE') then
    raise exception 'Apenas ADMIN ou GERENTE podem fechar competência de comissão.';
  end if;

  if p_competencia !~ '^\d{4}-\d{2}$' then
    raise exception 'Competência deve estar no formato YYYY-MM.';
  end if;

  -- Verifica se o profissional pertence ao salão
  select * into v_profissional from public.profissionais
  where id = p_profissional_id and salon_id = v_salon_id;

  if not found then
    raise exception 'Profissional % não encontrado neste salão.', p_profissional_id;
  end if;

  -- Verifica se já existe fechamento para esta competência
  select * into v_fechamento from public.fechamentos_comissao
  where salon_id = v_salon_id
    and profissional_id = p_profissional_id
    and competencia = p_competencia;

  v_fechamento_existente := found;

  if v_fechamento_existente and v_fechamento.status = 'FECHADO' then
    raise exception 'Competência % já está fechada para o profissional %.', p_competencia, p_profissional_id;
  end if;

  -- Calcula competência anterior (mês anterior)
  v_competencia_anterior := to_char((p_competencia || '-01')::date - interval '1 month', 'YYYY-MM');

  -- Busca saldo devedor da competência anterior (se houver fechamento anterior FECHADO)
  select * into v_fechamento_anterior from public.fechamentos_comissao
  where salon_id = v_salon_id
    and profissional_id = p_profissional_id
    and competencia = v_competencia_anterior
    and status = 'FECHADO';

  if found then
    v_saldo_anterior_competencia := v_fechamento_anterior.saldo_devedor_gerado;
  end if;

  -- 1. Soma comissões dos itens não processados da competência
  select coalesce(sum(comissao_valor_snapshot), 0), count(*)
  into v_total_bruto_calculado, v_count_itens
  from public.comanda_itens ci
  join public.comandas c on c.id = ci.comanda_id
  where ci.salon_id = v_salon_id
    and ci.profissional_id = p_profissional_id
    and ci.comissao_processada = false
    and c.status = 'FINALIZADA'
    and to_char(c.closed_at, 'YYYY-MM') = p_competencia;

  -- 2. Soma adiantamentos/vales da competência (despesas vinculadas ao profissional)
  select coalesce(sum(valor), 0)
  into v_total_adiantamentos_abatidos
  from public.despesas
  where salon_id = v_salon_id
    and profissional_id = p_profissional_id
    and categoria = 'ADIANTAMENTO'
    and to_char(data_competencia, 'YYYY-MM') = p_competencia;

  -- 3. Soma ajustes da competência atual
  select coalesce(sum(valor), 0)
  into v_total_ajustes
  from public.ajustes_comissao
  where salon_id = v_salon_id
    and profissional_id = p_profissional_id
    and competencia_lancamento = p_competencia;

  -- 4. Calcula total_pago (nunca negativo) e saldo_devedor_gerado
  -- total_pago = MAX(0, total_bruto - adiantamentos - saldo_anterior + ajustes)
  v_total_pago := greatest(
    v_total_bruto_calculado - v_total_adiantamentos_abatidos - v_saldo_anterior_competencia + v_total_ajustes,
    0
  );

  -- saldo_devedor_gerado = excedente que não foi coberto (será abatido na próxima competência)
  v_saldo_devedor_gerado := greatest(
    v_total_adiantamentos_abatidos + v_saldo_anterior_competencia - v_total_ajustes - v_total_bruto_calculado,
    0
  );

  -- 5. Cria ou atualiza o fechamento
  if v_fechamento_existente then
    update public.fechamentos_comissao set
      total_bruto_calculado = v_total_bruto_calculado,
      total_adiantamentos_abatidos = v_total_adiantamentos_abatidos,
      saldo_anterior_competencia = v_saldo_anterior_competencia,
      total_ajustes = v_total_ajustes,
      total_pago = v_total_pago,
      saldo_devedor_gerado = v_saldo_devedor_gerado,
      status = 'FECHADO',
      fechado_em = now(),
      fechado_por = auth_helpers.current_usuario_id()
    where id = v_fechamento.id
    returning * into v_fechamento;
  else
    insert into public.fechamentos_comissao (
      salon_id, profissional_id, competencia,
      total_bruto_calculado, total_adiantamentos_abatidos,
      saldo_anterior_competencia, total_ajustes,
      total_pago, saldo_devedor_gerado,
      status, fechado_em, fechado_por
    ) values (
      v_salon_id, p_profissional_id, p_competencia,
      v_total_bruto_calculado, v_total_adiantamentos_abatidos,
      v_saldo_anterior_competencia, v_total_ajustes,
      v_total_pago, v_saldo_devedor_gerado,
      'FECHADO', now(), auth_helpers.current_usuario_id()
    )
    returning * into v_fechamento;
  end if;

  -- 6. Marca itens como processados e vincula ao fechamento
  update public.comanda_itens
  set comissao_processada = true,
      fechamento_comissao_id = v_fechamento.id
  where salon_id = v_salon_id
    and profissional_id = p_profissional_id
    and comissao_processada = false
    and id in (
      select ci.id
      from public.comanda_itens ci
      join public.comandas c on c.id = ci.comanda_id
      where ci.salon_id = v_salon_id
        and ci.profissional_id = p_profissional_id
        and ci.comissao_processada = false
        and c.status = 'FINALIZADA'
        and to_char(c.closed_at, 'YYYY-MM') = p_competencia
    );

  -- 7. Auditoria
  insert into public.audit_log (salon_id, user_id, entity, entity_id, action, new_data)
  values (
    v_salon_id, auth_helpers.current_usuario_id(),
    'fechamentos_comissao', v_fechamento.id, 'FECHAMENTO_COMISSAO_MENSAL',
    jsonb_build_object(
      'profissional_id', p_profissional_id,
      'competencia', p_competencia,
      'total_bruto_calculado', v_total_bruto_calculado,
      'total_adiantamentos_abatidos', v_total_adiantamentos_abatidos,
      'saldo_anterior_competencia', v_saldo_anterior_competencia,
      'total_ajustes', v_total_ajustes,
      'total_pago', v_total_pago,
      'saldo_devedor_gerado', v_saldo_devedor_gerado,
      'itens_processados', v_count_itens
    )
  );

  return jsonb_build_object(
    'id', v_fechamento.id,
    'profissional_id', p_profissional_id,
    'competencia', p_competencia,
    'status', v_fechamento.status,
    'total_bruto_calculado', v_total_bruto_calculado,
    'total_adiantamentos_abatidos', v_total_adiantamentos_abatidos,
    'saldo_anterior_competencia', v_saldo_anterior_competencia,
    'total_ajustes', v_total_ajustes,
    'total_pago', v_total_pago,
    'saldo_devedor_gerado', v_saldo_devedor_gerado,
    'itens_processados', v_count_itens,
    'fechado_em', v_fechamento.fechado_em
  );
end;
$$;