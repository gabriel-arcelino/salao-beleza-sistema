-- ============================================================================
-- Teste pgTAP: fn_fechar_competencia_comissao
-- Implementa testes para Seção 10.12, 11.7, 11.7.1
-- ============================================================================

begin;
select plan(14);

-- Setup: salão, profissional, serviços, configurações
insert into saloes (id, nome) values
  ('00000000-0000-0000-0000-000000000001', 'Salão Teste')
on conflict do nothing;

insert into profissionais (id, salon_id, nome, comissao_percentual_padrao) values
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 'Profissional Teste', 40)
on conflict do nothing;

insert into servicos (id, salon_id, nome, preco) values
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000001', 'Corte Teste', 100.00)
on conflict do nothing;

insert into config_taxas (salon_id, metodo, taxa_percentual) values
  ('00000000-0000-0000-0000-000000000001', 'PIX', 0),
  ('00000000-0000-0000-0000-000000000001', 'DINHEIRO', 0)
on conflict (salon_id, metodo) do nothing;

insert into config_comissoes (salon_id, profissional_id, servico_id, comissao_percentual, base_calculo, rateio_taxa, comissao_sobre_produto, timing_repasse) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000101', null, 40, 'BRUTO', 'SALAO', false, 'IMEDIATO')
on conflict (salon_id, profissional_id, servico_id) do nothing;

-- Usuários para testar perfis
insert into usuarios (id, salon_id, auth_user_id, nome, perfil) values
  ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', 'Recepcionista', 'RECEPCAO'),
  ('a0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000b', 'Admin Teste', 'ADMIN')
on conflict do nothing;

-- Todos os dados de teste são inseridos como postgres (antes do switch de role);
-- apenas as chamadas de RPC e as queries de verificação usam authenticated + JWT.
--
-- 1. Comanda fechada na competência 2026-01 (bruto = 40, sem adiantamentos)
insert into comandas (id, salon_id, uuid_cliente, status, closed_at)
values ('a0000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', gen_random_uuid(), 'FINALIZADA', '2026-01-15 10:00:00+00');

insert into comanda_itens (id, salon_id, comanda_id, tipo, servico_id, descricao_snapshot, quantidade, preco_unitario, total, profissional_id, comissao_valor_snapshot, comissao_processada)
values ('a0000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000010', 'SERVICO', '00000000-0000-0000-0000-000000000201', 'Corte Teste', 1, 100.00, 100.00, '00000000-0000-0000-0000-000000000101', 40.00, false);

-- 2. Comanda fechada na competência 2026-02 (bruto = 40, adiantamento = 100)
insert into comandas (id, salon_id, uuid_cliente, status, closed_at)
values ('a0000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001', gen_random_uuid(), 'FINALIZADA', '2026-02-10 10:00:00+00');

insert into comanda_itens (id, salon_id, comanda_id, tipo, servico_id, descricao_snapshot, quantidade, preco_unitario, total, profissional_id, comissao_valor_snapshot, comissao_processada)
values ('a0000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000020', 'SERVICO', '00000000-0000-0000-0000-000000000201', 'Corte Teste', 1, 100.00, 100.00, '00000000-0000-0000-0000-000000000101', 40.00, false);

-- Adiantamento de 100 na competência 2026-02 (excede comissão de 40)
insert into despesas (salon_id, descricao, categoria, tipo, valor, profissional_id, data_competencia, status)
values ('00000000-0000-0000-0000-000000000001', 'Adiantamento teste', 'ADIANTAMENTO', 'VARIAVEL', 100.00, '00000000-0000-0000-0000-000000000101', '2026-02-01', 'PAGO');

-- 3. Comanda fechada na competência 2026-03 (bruto = 40, abate saldo anterior 60)
insert into comandas (id, salon_id, uuid_cliente, status, closed_at)
values ('a0000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000001', gen_random_uuid(), 'FINALIZADA', '2026-03-10 10:00:00+00');

insert into comanda_itens (id, salon_id, comanda_id, tipo, servico_id, descricao_snapshot, quantidade, preco_unitario, total, profissional_id, comissao_valor_snapshot, comissao_processada)
values ('a0000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000030', 'SERVICO', '00000000-0000-0000-0000-000000000201', 'Corte Teste', 1, 100.00, 100.00, '00000000-0000-0000-0000-000000000101', 40.00, false);

-- Simula usuário ADMIN autenticado
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-0000-0000-00000000000b", "role": "authenticated", "app_metadata": {"salon_id": "00000000-0000-0000-0000-000000000001"}}', true);

-- 1. Teste básico: fechar competência sem adiantamentos nem ajustes
select lives_ok(
  $$ select fn_fechar_competencia_comissao('00000000-0000-0000-0000-000000000101'::uuid, '2026-01') $$,
  'Fechamento básico de competência processa sem erro'
);

select results_eq(
  $$ select status::text from fechamentos_comissao where profissional_id = '00000000-0000-0000-0000-000000000101' and competencia = '2026-01' $$,
  $$ values ('FECHADO') $$,
  'Fechamento fica com status FECHADO'
);

select results_eq(
  $$ select total_bruto_calculado from fechamentos_comissao where profissional_id = '00000000-0000-0000-0000-000000000101' and competencia = '2026-01' $$,
  $$ values (40.00) $$,
  'Total bruto calculado = 40.00 (comissão do item)'
);

select results_eq(
  $$ select total_pago from fechamentos_comissao where profissional_id = '00000000-0000-0000-0000-000000000101' and competencia = '2026-01' $$,
  $$ values (40.00) $$,
  'Total pago = 40.00 (sem adiantamentos, sem saldo anterior)'
);

select results_eq(
  $$ select comissao_processada from comanda_itens where id = 'a0000000-0000-0000-0000-000000000011' $$,
  $$ values (true) $$,
  'Item da comanda marcado como comissao_processada = true'
);

select results_eq(
  $$ select fechamento_comissao_id from comanda_itens where id = 'a0000000-0000-0000-0000-000000000011' $$,
  $$ select id from fechamentos_comissao where profissional_id = '00000000-0000-0000-0000-000000000101' and competencia = '2026-01' $$,
  'Item vinculado ao fechamento_comissao_id correto'
);

-- 2. Teste: RECEPCAO não pode fechar competência
select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-0000-0000-00000000000a", "role": "authenticated", "app_metadata": {"salon_id": "00000000-0000-0000-0000-000000000001"}}', true);

select throws_like(
  $$ select fn_fechar_competencia_comissao('00000000-0000-0000-0000-000000000101'::uuid, '2026-02') $$,
  '%Apenas ADMIN ou GERENTE%',
  'RECEPCAO não pode fechar competência'
);

-- 3. Teste: fechar competência com adiantamento que excede a comissão (saldo devedor rolado)
-- Volta para ADMIN
select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-0000-0000-00000000000b", "role": "authenticated", "app_metadata": {"salon_id": "00000000-0000-0000-0000-000000000001"}}', true);

select lives_ok(
  $$ select fn_fechar_competencia_comissao('00000000-0000-0000-0000-000000000101'::uuid, '2026-02') $$,
  'Fechamento com adiantamento maior que comissão processa sem erro'
);

select results_eq(
  $$ select total_pago from fechamentos_comissao where profissional_id = '00000000-0000-0000-0000-000000000101' and competencia = '2026-02' $$,
  $$ values (0.00::numeric) $$,
  'Total pago = 0 (adiantamento 100 > comissão 40, não pode ser negativo)'
);

select results_eq(
  $$ select saldo_devedor_gerado from fechamentos_comissao where profissional_id = '00000000-0000-0000-0000-000000000101' and competencia = '2026-02' $$,
  $$ values (60.00) $$,
  'Saldo devedor gerado = 60.00 (100 - 40) para rolar para competência seguinte'
);

-- 4. Teste: competência seguinte abate saldo anterior
select lives_ok(
  $$ select fn_fechar_competencia_comissao('00000000-0000-0000-0000-000000000101'::uuid, '2026-03') $$,
  'Fechamento competência seguinte abate saldo anterior'
);

select results_eq(
  $$ select saldo_anterior_competencia from fechamentos_comissao where profissional_id = '00000000-0000-0000-0000-000000000101' and competencia = '2026-03' $$,
  $$ values (60.00) $$,
  'Saldo anterior competência = 60.00 (rolado de 2026-02)'
);

select results_eq(
  $$ select total_pago from fechamentos_comissao where profissional_id = '00000000-0000-0000-0000-000000000101' and competencia = '2026-03' $$,
  $$ values (0.00::numeric) $$,
  'Total pago = 0 (comissão 40 - saldo anterior 60 = -20, vira 0)'
);

select results_eq(
  $$ select saldo_devedor_gerado from fechamentos_comissao where profissional_id = '00000000-0000-0000-0000-000000000101' and competencia = '2026-03' $$,
  $$ values (20.00) $$,
  'Novo saldo devedor = 20.00 (60 anterior - 40 comissão = 20)'
);

select * from finish();
rollback;
