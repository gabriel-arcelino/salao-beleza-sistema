-- ============================================================================
-- Test 012: fn_relatorio_caixa
--
-- Tests the caixa report function.
-- ============================================================================

begin;

-- Insert test data (executed as superuser, bypassing RLS)
-- Insert usuario (created_by/closed_by)
insert into public.usuarios (id, salon_id, auth_user_id, nome, perfil, profissional_id, ativo, created_at)
values ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'User Test', 'ADMIN', null, true, now());

-- Insert profissional
insert into public.profissionais (id, salon_id, nome, telefone, comissao_percentual_padrao, ativo, created_at, updated_at)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000001', 'Prof Test', '(11) 9999-9999', 0, true, now(), now());

-- Insert cliente
insert into public.clientes (id, salon_id, nome, telefone, email, observacoes, ativo, created_at, updated_at)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000001', 'Cliente Test', '(11) 8888-8888', 'test@example.com', 'Obs', true, now(), now());

-- Insert comanda (finalizada)
insert into public.comandas (id, salon_id, uuid_cliente, cliente_id, profissional_id, status, subtotal, desconto, total, opened_at, closed_at, created_by, closed_by, created_at, updated_at)
values ('cccccccc-cccc-cccc-cccc-cccccccccccc', '00000000-0000-0000-0000-000000000001', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'FINALIZADA', 0, 0, 0, now(), now(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', now(), now());

-- Insert a pagamento within the interval (Jan), not estornado
insert into public.pagamentos (id, salon_id, comanda_id, metodo, valor_bruto, taxa_percentual, taxa_valor, valor_liquido, parcelas, identificador_transacao, data_liquidacao_bancaria, paid_at, estornado)
values ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'DINHEIRO', 100.00, 0, 0, 100.00, 1, null, null, '2026-01-15 10:00:00', false);

-- Insert a pagamento outside the interval (before), not estornado
insert into public.pagamentos (id, salon_id, comanda_id, metodo, valor_bruto, taxa_percentual, taxa_valor, valor_liquido, parcelas, identificador_transacao, data_liquidacao_bancaria, paid_at, estornado)
values ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'DINHEIRO', 50.00, 0, 0, 50.00, 1, null, null, '2025-12-31 10:00:00', false);

-- Insert a pagamento that is estornado total (should be excluded)
insert into public.pagamentos (id, salon_id, comanda_id, metodo, valor_bruto, taxa_percentual, taxa_valor, valor_liquido, parcelas, identificador_transacao, data_liquidacao_bancaria, paid_at, estornado)
values ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'DINHEIRO', 200.00, 0, 0, 200.00, 1, null, null, '2026-01-20 10:00:00', true);

-- Insert a despesa within the interval (Jan)
insert into public.despesas (id, salon_id, descricao, categoria, tipo, valor, profissional_id, data_competencia, data_pagamento, status, observacao, created_by, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Despesa teste', 'TESTE', 'FIXA', 30.00, null, '2026-01-10', '2026-01-10', 'PAGO', 'Obs', '00000000-0000-0000-0000-000000000001', now(), now());

-- Insert a fechamento_comissao within the interval (Jan)
insert into public.fechamentos_comissao (id, salon_id, profissional_id, competencia, status, total_bruto_calculado, total_adiantamentos_abatidos, saldo_anterior_competencia, total_ajustes, total_pago, saldo_devedor_gerado, fechado_em, fechado_por, created_at)
values ('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-01', 'FECHADO', 0, 0, 0, 0, 20.00, 0, '2026-01-25 10:00:00', '00000000-0000-0000-0000-000000000001', now());

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