-- ============================================================================
-- Migration 0012: fn_relatorio_caixa
--
-- Implements the caixa report as per the plan.
--
-- Parameters:
--   p_data_inicio: date (inclusive)
--   p_data_fim: date (inclusive)
--
-- Returns a table with:
--   data_inicio, data_fim, total_vendas, total_entradas, total_saidas, saldo_inicial, saldo_final
-- ============================================================================

create or replace function fn_relatorio_caixa(
    p_data_inicio date,
    p_data_fim date
)
returns table (
    data_inicio date,
    data_fim date,
    total_vendas numeric(10,2),
    total_entradas numeric(10,2),
    total_saidas numeric(10,2),
    saldo_inicial numeric(10,2),
    saldo_final numeric(10,2)
)
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_salon_id uuid := auth_helpers.current_salon_id();
begin
    if v_salon_id is null then
        raise exception 'Sessão sem salon_id — usuário não autenticado corretamente.';
    end if;

    -- We'll compute the cumulative sums up to a given date for entradas and saídas.
    -- We'll use a helper function or compute in the query.

    -- We'll do a single query that computes:
    --   the interval aggregates and the cumulative sums for inicio-1 and fim.

    return query
    with max_date as (
        select p_data_fim as max_dt
    ),
    date_helpers as (
        select
            p_data_inicio as inicio,
            p_data_fim as fim,
            (p_data_inicio - interval '1 day') as inicio_minus_one
    ),
    pagamentos_data as (
        select
            paid_at::date as pago_date,
            valor_bruto,
            valor_liquido
        from public.pagamentos
        where salon_id = v_salon_id
          and paid_at::date >= (select inicio_minus_one from date_helpers)
          and paid_at::date <= (select max_dt from max_date)
          and (estorno is null or estorno = false)
    ),
    despesas_data as (
        select
            data_pagamento as pago_date,
            valor
        from public.despesas
        where salon_id = v_salon_id
          and data_pagamento >= (select inicio_minus_one from date_helpers)
          and data_pagamento <= (select max_dt from max_date)
    ),
    fechamentos_comissao_data as (
        select
            closed_at::date as pago_date,
            total_pago
        from public.fechamentos_comissao
        where salon_id = v_salon_id
          and closed_at::date >= (select inicio_minus_one from date_helpers)
          and closed_at::date <= (select max_dt from max_date)
    ),
    agg as (
        select
            -- Interval aggregates (between inicio and fim)
            coalesce(sum(case when pago_date between (select inicio from date_helpers) and (select fim from date_helpers) then valor_bruto end), 0) as total_vendas_interval,
            coalesce(sum(case when pago_date between (select inicio from date_helpers) and (select fim from date_helpers) then valor_liquido end), 0) as total_entradas_interval,
            coalesce(sum(case when pago_date between (select inicio from date_helpers) and (select fim from date_helpers) then valor end), 0) as total_saidas_despesas_interval,
            coalesce(sum(case when pago_date between (select inicio from date_helpers) and (select fim from date_helpers) then total_pago end), 0) as total_saidas_fechamentos_interval,
            -- Cumulative up to inicio_minus_one
            coalesce(sum(case when pago_date <= (select inicio_minus_one from date_helpers) then valor_liquido end), 0) as total_entradas_up_to_inicio_minus_one,
            coalesce(sum(case when pago_date <= (select inicio_minus_one from date_helpers) then valor end), 0) as total_saidas_despesas_up_to_inicio_minus_one,
            coalesce(sum(case when pago_date <= (select inicio_minus_one from date_helpers) then total_pago end), 0) as total_saidas_fechamentos_up_to_inicio_minus_one,
            -- Cumulative up to fim
            coalesce(sum(case when pago_date <= (select fim from date_helpers) then valor_liquido end), 0) as total_entradas_up_to_fim,
            coalesce(sum(case when pago_date <= (select fim from date_helpers) then valor end), 0) as total_saidas_despesas_up_to_fim,
            coalesce(sum(case when pago_date <= (select fim from date_helpers) then total_pago end), 0) as total_saidas_fechamentos_up_to_fim
        from (
            select pago_date, valor_bruto, valor_liquido, 0::numeric as valor, 0::numeric as total_pago from pagamentos_data
            union all
            select pago_date, 0::numeric as valor_bruto, 0::numeric as valor_liquido, valor, 0::numeric as total_pago from despesas_data
            union all
            select pago_date, 0::numeric as valor_bruto, 0::numeric as valor_liquido, 0::numeric as valor, total_pago from fechamentos_comissao_data
        ) as combined
    )
    select
        (select inicio from date_helpers) as data_inicio,
        (select fim from date_helpers) as data_fim,
        total_vendas_interval,
        total_entradas_interval,
        (total_saidas_despesas_interval + total_saidas_fechamentos_interval) as total_saidas,
        (total_entradas_up_to_inicio_minus_one - total_saidas_despesas_up_to_inicio_minus_one - total_saidas_fechamentos_up_to_inicio_minus_one) as saldo_inicial,
        (total_entradas_up_to_fim - total_saidas_despesas_up_to_fim - total_saidas_fechamentos_up_to_fim) as saldo_final
    from agg;
end;
$$;