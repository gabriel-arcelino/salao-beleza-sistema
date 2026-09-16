-- ============================================================================
-- Test 012: fn_relatorio_caixa
--
-- Tests the caixa report function.
-- ============================================================================

begin;

-- Set up the test salon_id using the request.jwt.claims GUC
select set_config('request.jwt.claims', '{"salon_id":"00000000-0000-0000-0000-000000000001"}', true);

-- We'll plan to run a number of tests. We'll start with a simple test: no data.
select plan(8);

-- Test 1: No data -> all zeros
select * from fn_relatorio_caixa('2026-01-01'::date, '2026-01-31'::date) as 
    (data_inicio date, data_fim date, total_vendas numeric, total_entradas numeric, total_saidas numeric, saldo_inicial numeric, saldo_final numeric)
where data_inicio = '2026-01-01' and data_fim = '2026-01-31' 
  and total_vendas = 0 and total_entradas = 0 and total_saidas = 0 
  and saldo_inicial = 0 and saldo_final = 0
as "test empty interval";

-- Now insert test data
-- Insert a pagamento within the interval, not estornado
insert into public.pagamentos (id, salon_id, valor_bruto, valor_liquido, paid_at, estorno)
values ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 100.00, 100.00, '2026-01-15 10:00:00', false);

-- Insert a pagamento outside the interval (before)
insert into public.pagamentos (id, salon_id, valor_bruto, valor_liquido, paid_at, estorno)
values ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 50.00, 50.00, '2025-12-31 10:00:00', false);

-- Insert a pagamento that is estornado total (should be excluded)
insert into public.pagamentos (id, salon_id, valor_bruto, valor_liquido, paid_at, estorno)
values ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 200.00, 200.00, '2026-01-20 10:00:00', true);

-- Insert a despesa within the interval
insert into public.despesas (id, salon_id, valor, data_pagamento)
values ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 30.00, '2026-01-10');

-- Insert a fechamento_comissao within the interval
insert into public.fechamentos_comissao (id, salon_id, total_pago, closed_at)
values ('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 20.00, '2026-01-25 10:00:00');

-- Test 2: With data
select * from fn_relatorio_caixa('2026-01-01'::date, '2026-01-31'::date) as 
    (data_inicio date, data_fim date, total_vendas numeric, total_entradas numeric, total_saidas numeric, saldo_inicial numeric, saldo_final numeric)
where data_inicio = '2026-01-01' and data_fim = '2026-01-31' 
  and total_vendas = 100.00 and total_entradas = 100.00 and total_saidas = 50.00 
  and saldo_inicial = 50.00 and saldo_final = 100.00
as "test with data";

-- Test 3: Interval before any data
select * from fn_relatorio_caixa('2025-01-01'::date, '2025-01-31'::date) as 
    (data_inicio date, data_fim date, total_vendas numeric, total_entradas numeric, total_saidas numeric, saldo_inicial numeric, saldo_final numeric)
where data_inicio = '2025-01-01' and data_fim = '2025-01-31' 
  and total_vendas = 0 and total_entradas = 0 and total_saidas = 0 
  and saldo_inicial = 0 and saldo_final = 0
as "test interval before any data";

-- Test 4: Interval after all data (but we have data up to 2026-01-31, so same as test 2? Let's do a future interval)
select * from fn_relatorio_caixa('2026-02-01'::date, '2026-02-28'::date) as 
    (data_inicio date, data_fim date, total_vendas numeric, total_entradas numeric, total_saidas numeric, saldo_inicial numeric, saldo_final numeric)
where data_inicio = '2026-02-01' and data_fim = '2026-02-28' 
  and total_vendas = 0 and total_entradas = 0 and total_saidas = 0 
  and saldo_inicial = 100.00 and saldo_final = 100.00
as "test interval after all data";

select * from finish();
end;