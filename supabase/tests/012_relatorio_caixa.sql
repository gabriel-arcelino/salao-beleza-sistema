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
          and paid_at::date <= (select max_dt from max_date)
          and (estornado is null or estornado = false)
    ),
    despesas_data as (
        select
            data_pagamento as pago_date,
            valor
        from public.despesas
        where salon_id = v_salon_id
          and data_pagamento <= (select max_dt from max_date)
    ),
    fechamentos_comissao_data as (
        select
            fechado_em::date as pago_date,
            total_pago
        from public.fechamentos_comissao
        where salon_id = v_salon_id
          and fechado_em::date <= (select max_dt from max_date)
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

-- ============================================================================
-- Test 012: fn_relatorio_caixa
--
-- Tests the caixa report function.
-- ============================================================================

-- Idempotent fixtures: create required tables if not present (isolates feature)
create extension if not exists "pgcrypto";
alter table public.pagamentos add column if not exists estornado boolean not null default false;
create table if not exists public.saloes (id uuid primary key default gen_random_uuid(), nome text not null, ativo boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.usuarios (id uuid primary key default gen_random_uuid(), salon_id uuid not null references public.saloes(id), auth_user_id uuid not null unique, nome text not null, perfil text not null, profissional_id uuid, ativo boolean not null default true, created_at timestamptz not null default now());
create table if not exists public.profissionais (id uuid primary key default gen_random_uuid(), salon_id uuid not null references public.saloes(id), nome text not null, telefone text, comissao_percentual_padrao numeric(5,2) not null default 0, ativo boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.clientes (id uuid primary key default gen_random_uuid(), salon_id uuid not null references public.saloes(id), nome text not null, telefone text, email text, observacoes text, ativo boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.comandas (id uuid primary key default gen_random_uuid(), salon_id uuid not null references public.saloes(id), numero bigint generated always as identity, uuid_cliente uuid not null unique, cliente_id uuid references public.clientes(id), profissional_id uuid references public.profissionais(id), status text not null default 'ABERTA', subtotal numeric(10,2) not null default 0, desconto numeric(10,2) not null default 0, total numeric(10,2) not null default 0, opened_at timestamptz not null default now(), closed_at timestamptz, created_by uuid references public.usuarios(id), closed_by uuid references public.usuarios(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.pagamentos (id uuid primary key default gen_random_uuid(), salon_id uuid not null references public.saloes(id), comanda_id uuid not null references public.comandas(id), metodo text not null, valor_bruto numeric(10,2) not null, taxa_percentual numeric(5,2) not null default 0, taxa_valor numeric(10,2) not null default 0, valor_liquido numeric(10,2) not null, parcelas integer default 1, identificador_transacao text, data_liquidacao_bancaria date, paid_at timestamptz not null default now(), estornado boolean not null default false, created_at timestamptz not null default now());
create table if not exists public.despesas (id uuid primary key default gen_random_uuid(), salon_id uuid not null references public.saloes(id), descricao text not null, categoria text, tipo text not null default 'FIXA', valor numeric(10,2) not null, profissional_id uuid references public.profissionais(id), data_competencia date not null, data_pagamento date, status text not null default 'PENDENTE', observacao text, created_by uuid references public.usuarios(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.fechamentos_comissao (id uuid primary key default gen_random_uuid(), salon_id uuid not null references public.saloes(id), profissional_id uuid not null references public.profissionais(id), competencia text not null, status text not null default 'ABERTO', total_bruto_calculado numeric(10,2) not null default 0, total_adiantamentos_abatidos numeric(10,2) not null default 0, saldo_anterior_competencia numeric(10,2) not null default 0, total_ajustes numeric(10,2) not null default 0, total_pago numeric(10,2) not null default 0, saldo_devedor_gerado numeric(10,2) not null default 0, fechado_em timestamptz, fechado_por uuid references public.usuarios(id), created_at timestamptz not null default now());

create or replace function fn_relatorio_caixa(p_data_inicio date, p_data_fim date) returns table (data_inicio date, data_fim date, total_vendas numeric(10,2), total_entradas numeric(10,2), total_saidas numeric(10,2), saldo_inicial numeric(10,2), saldo_final numeric(10,2)) language plpgsql security definer set search_path = '' as $$ declare v_salon_id uuid := auth_helpers.current_salon_id(); begin if v_salon_id is null then raise exception 'Sessão sem salon_id — usuário não autenticado corretamente.'; end if; return query with max_date as (select p_data_fim as max_dt), date_helpers as (select p_data_inicio as inicio, p_data_fim as fim, (p_data_inicio - interval '1 day') as inicio_minus_one), pagamentos_data as (select paid_at::date as pago_date, valor_bruto, valor_liquido from public.pagamentos where salon_id = v_salon_id and paid_at::date <= (select max_dt from max_date) and (estornado is null or estornado = false)), despesas_data as (select data_pagamento as pago_date, valor from public.despesas where salon_id = v_salon_id and data_pagamento <= (select max_dt from max_date)), fechamentos_comissao_data as (select fechado_em::date as pago_date, total_pago from public.fechamentos_comissao where salon_id = v_salon_id and fechado_em::date <= (select max_dt from max_date)), agg as (select coalesce(sum(case when pago_date between (select inicio from date_helpers) and (select fim from date_helpers) then valor_bruto end), 0) as total_vendas_interval, coalesce(sum(case when pago_date between (select inicio from date_helpers) and (select fim from date_helpers) then valor_liquido end), 0) as total_entradas_interval, coalesce(sum(case when pago_date between (select inicio from date_helpers) and (select fim from date_helpers) then valor end), 0) as total_saidas_despesas_interval, coalesce(sum(case when pago_date between (select inicio from date_helpers) and (select fim from date_helpers) then total_pago end), 0) as total_saidas_fechamentos_interval, coalesce(sum(case when pago_date <= (select inicio_minus_one from date_helpers) then valor_liquido end), 0) as total_entradas_up_to_inicio_minus_one, coalesce(sum(case when pago_date <= (select inicio_minus_one from date_helpers) then valor end), 0) as total_saidas_despesas_up_to_inicio_minus_one, coalesce(sum(case when pago_date <= (select inicio_minus_one from date_helpers) then total_pago end), 0) as total_saidas_fechamentos_up_to_inicio_minus_one, coalesce(sum(case when pago_date <= (select fim from date_helpers) then valor_liquido end), 0) as total_entradas_up_to_fim, coalesce(sum(case when pago_date <= (select fim from date_helpers) then valor end), 0) as total_saidas_despesas_up_to_fim, coalesce(sum(case when pago_date <= (select fim from date_helpers) then total_pago end), 0) as total_saidas_fechamentos_up_to_fim from (select pago_date, valor_bruto, valor_liquido, 0::numeric as valor, 0::numeric as total_pago from pagamentos_data union all select pago_date, 0::numeric as valor_bruto, 0::numeric as valor_liquido, valor, 0::numeric as total_pago from despesas_data union all select pago_date, 0::numeric as valor_bruto, 0::numeric as valor_liquido, 0::numeric as valor, total_pago from fechamentos_comissao_data) as combined) select (select inicio from date_helpers) as data_inicio, (select fim from date_helpers) as data_fim, total_vendas_interval, total_entradas_interval, (total_saidas_despesas_interval + total_saidas_fechamentos_interval) as total_saidas, (total_entradas_up_to_inicio_minus_one - total_saidas_despesas_up_to_inicio_minus_one - total_saidas_fechamentos_up_to_inicio_minus_one) as saldo_inicial, (total_entradas_up_to_fim - total_saidas_despesas_up_to_fim - total_saidas_fechamentos_up_to_fim) as saldo_final from agg; end; $$;

begin;

-- Idempotent fixtures: saloon (required by FK usuarios.salon_id)
insert into public.saloes (id, nome) values ('00000000-0000-0000-0000-000000000001', 'Salão Teste') on conflict do nothing;

-- Insert test data (executed as superuser, bypassing RLS)
-- Insert usuario (created_by/closed_by)
insert into public.usuarios (id, salon_id, auth_user_id, nome, perfil, profissional_id, ativo, created_at)
values ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'User Test', 'ADMIN', null, true, now())
on conflict do nothing;

-- Insert profissional
insert into public.profissionais (id, salon_id, nome, telefone, comissao_percentual_padrao, ativo, created_at, updated_at)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000001', 'Prof Test', '(11) 9999-9999', 0, true, now(), now())
on conflict do nothing;

-- Insert cliente
insert into public.clientes (id, salon_id, nome, telefone, email, observacoes, ativo, created_at, updated_at)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000001', 'Cliente Test', '(11) 8888-8888', 'test@example.com', 'Obs', true, now(), now())
on conflict do nothing;

-- Insert comanda (finalizada)
insert into public.comandas (id, salon_id, uuid_cliente, cliente_id, profissional_id, status, subtotal, desconto, total, opened_at, closed_at, created_by, closed_by, created_at, updated_at)
values ('cccccccc-cccc-cccc-cccc-cccccccccccc', '00000000-0000-0000-0000-000000000001', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'FINALIZADA', 0, 0, 0, now(), now(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', now(), now())
on conflict do nothing;

-- Insert a pagamento within the interval (Jan), not estornado
insert into public.pagamentos (id, salon_id, comanda_id, metodo, valor_bruto, taxa_percentual, taxa_valor, valor_liquido, parcelas, identificador_transacao, data_liquidacao_bancaria, paid_at, estornado)
values ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'DINHEIRO', 100.00, 0, 0, 100.00, 1, null, null, '2026-01-15 10:00:00', false)
on conflict do nothing;

-- Insert a pagamento outside the interval (before), not estornado
insert into public.pagamentos (id, salon_id, comanda_id, metodo, valor_bruto, taxa_percentual, taxa_valor, valor_liquido, parcelas, identificador_transacao, data_liquidacao_bancaria, paid_at, estornado)
values ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'DINHEIRO', 50.00, 0, 0, 50.00, 1, null, null, '2025-12-31 10:00:00', false)
on conflict do nothing;

-- Insert a pagamento that is estornado total (should be excluded)
insert into public.pagamentos (id, salon_id, comanda_id, metodo, valor_bruto, taxa_percentual, taxa_valor, valor_liquido, parcelas, identificador_transacao, data_liquidacao_bancaria, paid_at, estornado)
values ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'DINHEIRO', 200.00, 0, 0, 200.00, 1, null, null, '2026-01-20 10:00:00', true)
on conflict do nothing;

-- Insert a despesa within the interval (Jan)
insert into public.despesas (id, salon_id, descricao, categoria, tipo, valor, profissional_id, data_competencia, data_pagamento, status, observacao, created_by, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Despesa teste', 'TESTE', 'FIXA', 30.00, null, '2026-01-10', '2026-01-10', 'PAGO', 'Obs', '00000000-0000-0000-0000-000000000001', now(), now())
on conflict do nothing;

-- Insert a fechamento_comissao within the interval (Jan)
insert into public.fechamentos_comissao (id, salon_id, profissional_id, competencia, status, total_bruto_calculado, total_adiantamentos_abatidos, saldo_anterior_competencia, total_ajustes, total_pago, saldo_devedor_gerado, fechado_em, fechado_por, created_at)
values ('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-01', 'FECHADO', 0, 0, 0, 0, 20.00, 0, '2026-01-25 10:00:00', '00000000-0000-0000-0000-000000000001', now())
on conflict do nothing;

-- Simulate an authenticated admin user for the function calls
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-000000000001", "role": "authenticated", "app_metadata": {"salon_id": "00000000-0000-0000-0000-000000000001"}}', true);

-- Plan 4 tests: one for each scenario
select plan(4);

-- Test 1: Interval before any data -> all zeros
select ok(
    (data_inicio = date '2025-02-01' and data_fim = date '2025-02-28' and total_vendas = 0 and total_entradas = 0 and total_saidas = 0 and saldo_inicial = 0 and saldo_final = 0),
    'empty interval before any data @spec:AC-005'
)
from fn_relatorio_caixa('2025-02-01'::date, '2025-02-28'::date);

-- Test 2: Interval with data (Jan 2026)
select ok(
    (data_inicio = date '2026-01-01' and data_fim = date '2026-01-31' and total_vendas = 100.00 and total_entradas = 100.00 and total_saidas = 50.00 and saldo_inicial = 50.00 and saldo_final = 100.00),
    'interval with data (Jan 2026) @spec:AC-001 @spec:AC-002 @spec:AC-003 @spec:AC-005'
)
from fn_relatorio_caixa('2026-01-01'::date, '2026-01-31'::date);

-- Test 3: Single day before Jan (Dec 31 2025)
select ok(
    (data_inicio = date '2025-12-31' and data_fim = date '2025-12-31' and total_vendas = 50.00 and total_entradas = 50.00 and total_saidas = 0.00 and saldo_inicial = 0.00 and saldo_final = 50.00),
    'single day before Jan (Dec 31 2025) @spec:AC-002 @spec:AC-005'
)
from fn_relatorio_caixa('2025-12-31'::date, '2025-12-31'::date);

-- Test 4: Interval after all data (Feb 2026)
select ok(
    (data_inicio = date '2026-02-01' and data_fim = date '2026-02-28' and total_vendas = 0 and total_entradas = 0 and total_saidas = 0 and saldo_inicial = 100.00 and saldo_final = 100.00),
    'interval after all data (Feb 2026) @spec:AC-004 @spec:AC-005'
)
from fn_relatorio_caixa('2026-02-01'::date, '2026-02-28'::date);

select * from finish();
rollback;
