-- ============================================================================
-- Test 013: fn_relatorio_comissao
-- ============================================================================

begin;

-- Insert test data (executed as superuser, bypassing RLS)
-- Insert saloon
insert into public.saloes (id, nome) values
('00000000-0000-0000-0000-000000000001', 'Salão Teste')
on conflict do nothing;

-- Insert usuario (for created_by/closed_by foreign keys)
insert into public.usuarios (id, salon_id, auth_user_id, nome, perfil, profissional_id, ativo, created_at)
values ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Admin User', 'ADMIN', null, true, now());

-- Insert profissional
insert into public.profissionais (id, salon_id, nome, telefone, comissao_percentual_padrao, ativo, created_at, updated_at)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000001', 'Prof Test', '(11) 9999-9999', 0, true, now(), now())
on conflict do nothing;

-- Insert cliente
insert into public.clientes (id, salon_id, nome, telefone, email, observacoes, ativo, created_at, updated_at)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000001', 'Cliente Test', '(11) 8888-8888', 'test@example.com', 'Obs', true, now(), now())
on conflict do nothing;

-- Insert servico (for comission)
insert into public.servicos (id, salon_id, nome, preco)
values ('cccccccc-cccc-cccc-cccc-cccccccccccc', '00000000-0000-0000-0000-000000000001', 'Serviço Teste', 100.00)
on conflict do nothing;

-- Insert config_comissoes (default)
insert into public.config_comissoes (salon_id, profissional_id, servico_id, comissao_percentual, base_calculo, rateio_taxa, comissao_sobre_produto, timing_repasse)
values ('00000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null, 20, 'BRUTO', 'SALAO', false, 'IMEDIATO')
on conflict do nothing;

-- Insert comanda (finalizada) within competência 2026-01
insert into public.comandas (id, salon_id, uuid_cliente, cliente_id, profissional_id, status, subtotal, desconto, total, opened_at, closed_at, created_by, closed_by, created_at, updated_at)
values ('dddddddd-dddd-dddd-dddd-dddddddddddd', '00000000-0000-0000-0000-000000000001', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'FINALIZADA', 100.00, 0, 100.00, now(), now(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', now(), now())
on conflict do nothing;

-- Insert comanda_item for the above comanda (serviço)
insert into public.comanda_itens (id, salon_id, comanda_id, tipo, servico_id, descricao_snapshot, quantidade, preco_unitario, total, profissional_id, comissao_percentual_snapshot, comissao_valor_snapshot, comissao_processada)
values ('ffffffff-ffff-ffff-ffff-ffffffffffff', '00000000-0000-0000-0000-000000000001', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'SERVICO', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Serviço Teste', 1, 100.00, 100.00, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 20, 20.00, false)
on conflict do nothing;

-- Insert a comanda_item that is already processed (should be excluded)
insert into public.comandas (id, salon_id, uuid_cliente, cliente_id, profissional_id, status, subtotal, desconto, total, opened_at, closed_at, created_by, closed_by, created_at, updated_at)
values ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'FINALIZADA', 50.00, 0, 50.00, now(), now(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', now(), now())
on conflict do nothing;

insert into public.comanda_itens (id, salon_id, comanda_id, tipo, servico_id, descricao_snapshot, quantidade, preco_unitario, total, profissional_id, comissao_percentual_snapshot, comissao_valor_snapshot, comissao_processada)
values ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'SERVICO', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Serviço Teste', 1, 50.00, 50.00, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 20, 10.00, true) -- already processed
on conflict do nothing;

-- Insert an adiantamento (despesa) within competência 2026-01
insert into public.despesas (id, salon_id, descricao, categoria, tipo, valor, profissional_id, data_competencia, data_pagamento, status, observacao, created_by, created_at, updated_at)
values ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000001', 'Adiantamento teste', 'ADIANTAMENTO', 'VARIAVEL', 30.00, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-01-10', '2026-01-10', 'PAGO', 'Obs', '00000000-0000-0000-0000-000000000001', now(), now())
on conflict do nothing;

-- Insert an ajuste de comissão (positive) within competência 2026-01
insert into public.ajustes_comissao (id, salon_id, profissional_id, competencia_origem, competencia_lancamento, valor, motivo, created_by)
values ('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null, '2026-01', 15.00, 'Teste', '00000000-0000-0000-0000-000000000001')
on conflict do nothing;

-- Insert another ajuste negativo (to test subtraction)
insert into public.ajustes_comissao (id, salon_id, profissional_id, competencia_origem, competencia_lancamento, valor, motivo, created_by)
values ('66666666-6666-6666-6666-666666666666', '00000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null, '2026-01', -5.00, 'Teste', '00000000-0000-0000-0000-000000000001')
on conflict do nothing;

-- Simulate an authenticated admin user for the function calls
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-000000000001", "role": "authenticated", "app_metadata": {"salon_id": "00000000-0000-0000-0000-000000000001"}}', true);

-- Plan 5 tests
select plan(5);

-- Test 1: Competência antes de qualquer data (vazio)
select ok(
    (select count(*)::integer from fn_relatorio_comissao('2025-01', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')) = 1 and
    (select items::jsonb from fn_relatorio_comissao('2025-01', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')) = '[]'::jsonb and
    (select total_bruto from fn_relatorio_comissao('2025-01', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')) = 0 and
    (select total_comissao from fn_relatorio_comissao('2025-01', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')) = 0,
    'empty competencia before any data @spec:AC-006 @spec:AC-007 @spec:AC-008'
);

-- Test 2: Competência com dados (Jan 2026) sem adiantamentos nem ajustes (exceto aqueles inseridos)
-- We have one item with total 100, comissao_valor_snapshot 20.
-- Also we have adiantamento 30 and ajustes +15 -5 = +10 net.
-- total_bruto = 100
-- total_comissao_raw = 20
-- total_adiantamentos = 30
-- total_ajustes = 10
-- total_comissao = greatest(20 - 30 + 10, 0) = 0
select ok(
    (select total_bruto from fn_relatorio_comissao('2026-01', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')) = 100.00 and
    (select total_comissao from fn_relatorio_comissao('2026-01', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')) = 0.00,
    'competencia with data (Jan 2026) @spec:AC-006 @spec:AC-007 @spec:AC-008'
);

-- Test 3: Competência apenas com adiantamento maior que comissao (zero already tested above)
-- We'll also verify items count
select ok(
    (select jsonb_array_length(items) from fn_relatorio_comissao('2026-01', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')) = 1,
    'items count matches @spec:AC-006'
);

-- Test 4: Competência com outro profissional (sem dados) -> zero
insert into public.profissionais (id, salon_id, nome, telefone, comissao_percentual_padrao, ativo, created_at, updated_at)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000001', 'Prof Test 2', '(11) 9999-9998', 0, true, now(), now())
on conflict do nothing;

select ok(
    (select total_bruto from fn_relatorio_comissao('2026-01', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')) = 0 and
    (select total_comissao from fn_relatorio_comissao('2026-01', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')) = 0,
    'other profissional with no data @spec:AC-006 @spec:AC-007 @spec:AC-008'
);

-- Test 5: Verificar que comissao_processada = true é excluída
-- We already have one processed item (comissao_valor_snapshot 10). It should not appear in items nor affect totals.
-- The only item in items should be the unprocessed one (comissao 20).
select ok(
    (select jsonb_array_length(items) from fn_relatorio_comissao('2026-01', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')) = 1 and
    (select (items->0->>'comissaoValorSnapshot')::numeric from fn_relatorio_comissao('2026-01', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')) = 20.00,
    'processed items excluded @spec:AC-006'
);

select * from finish();
rollback;