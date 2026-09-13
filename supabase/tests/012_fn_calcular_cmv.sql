-- ============================================================================
-- Teste pgTAP: fn_calcular_cmv (Seção 42)
--
-- Valida o cálculo do CMV (Custo do Mercadoria Vendida) com pelo menos 3
-- cenários de preço de custo diferente. O CMV é a soma de
-- custo_unitario * |quantidade| para movimentações do tipo VENDA.
-- ============================================================================

begin;
select plan(5);

-- Setup: salão, profissional, usuário ADMIN, taxas
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
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000101', null, 40, 'BRUTO', 'SALAO', true, 'IMEDIATO')
on conflict (salon_id, profissional_id, servico_id) do nothing;

insert into usuarios (id, salon_id, auth_user_id, nome, perfil) values
  ('a0000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000001c', 'Admin Teste CMV', 'ADMIN')
on conflict do nothing;

-- Cria 3 produtos com preços de custo diferentes (cenários de entrada diversa)
insert into produtos (id, salon_id, nome, preco_custo, preco_venda, estoque_atual) values
  ('c0000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 'Produto Custo 10', 10.00, 20.00, 100),
  ('c0000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000001', 'Produto Custo 25', 25.00, 50.00, 100),
  ('c0000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000001', 'Produto Custo 50', 50.00, 100.00, 100)
on conflict do nothing;

-- Simula usuário ADMIN autenticado
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-0000-0000-00000000001c", "role": "authenticated", "app_metadata": {"salon_id": "00000000-0000-0000-0000-000000000001"}}', true);

-- Cenário 1: vende 3 unidades do produto de custo 10 → CMV = 30
insert into comandas (id, salon_id, uuid_cliente, status)
values ('c1000000-0000-0000-0000-00000000001a', '00000000-0000-0000-0000-000000000001', gen_random_uuid(), 'ABERTA');

insert into comanda_itens (id, salon_id, comanda_id, tipo, produto_id, descricao_snapshot,
quantidade, preco_unitario, total, profissional_id)
values ('c1000000-0000-0000-0000-00000000001b', '00000000-0000-0000-0000-000000000001',
'c1000000-0000-0000-0000-00000000001a', 'PRODUTO', 'c0000000-0000-0000-0000-000000000101',
'Produto Custo 10', 3, 20.00, 60.00, '00000000-0000-0000-0000-000000000101');

select fn_fechar_comanda(
  'c1000000-0000-0000-0000-00000000001a'::uuid,
  '[{"metodo": "PIX", "valor_bruto": 60.00}]'::jsonb
);

-- Cenário 2: vende 2 unidades do produto de custo 25 → CMV = 50
insert into comandas (id, salon_id, uuid_cliente, status)
values ('c2000000-0000-0000-0000-00000000002a', '00000000-0000-0000-0000-000000000001', gen_random_uuid(), 'ABERTA');

insert into comanda_itens (id, salon_id, comanda_id, tipo, produto_id, descricao_snapshot,
quantidade, preco_unitario, total, profissional_id)
values ('c2000000-0000-0000-0000-00000000002b', '00000000-0000-0000-0000-000000000001',
'c2000000-0000-0000-0000-00000000002a', 'PRODUTO', 'c0000000-0000-0000-0000-000000000201',
'Produto Custo 25', 2, 50.00, 100.00, '00000000-0000-0000-0000-000000000101');

select fn_fechar_comanda(
  'c2000000-0000-0000-0000-00000000002a'::uuid,
  '[{"metodo": "PIX", "valor_bruto": 100.00}]'::jsonb
);

-- Cenário 3: vende 1 unidade do produto de custo 50 → CMV = 50
insert into comandas (id, salon_id, uuid_cliente, status)
values ('c3000000-0000-0000-0000-00000000003a', '00000000-0000-0000-0000-000000000001', gen_random_uuid(), 'ABERTA');

insert into comanda_itens (id, salon_id, comanda_id, tipo, produto_id, descricao_snapshot,
quantidade, preco_unitario, total, profissional_id)
values ('c3000000-0000-0000-0000-00000000003b', '00000000-0000-0000-0000-000000000001',
'c3000000-0000-0000-0000-00000000003a', 'PRODUTO', 'c0000000-0000-0000-0000-000000000301',
'Produto Custo 50', 1, 100.00, 100.00, '00000000-0000-0000-0000-000000000101');

select fn_fechar_comanda(
  'c3000000-0000-0000-0000-00000000003a'::uuid,
  '[{"metodo": "PIX", "valor_bruto": 100.00}]'::jsonb
);

-- CMV total para o mês atual = 30 + 50 + 50 = 130.00
select results_eq(
  $$ select fn_calcular_cmv(to_char(current_date, 'YYYY-MM')) $$,
  $$ values (130.00::numeric) $$,
  'CMV total = 30 + 50 + 50 = 130.00 (três preços de custo diferentes)'
);

-- Cenário 4: CMV para competência sem vendas = 0
select results_eq(
  $$ select fn_calcular_cmv('1999-01') $$,
  $$ values (0::numeric) $$,
  'CMV para competência sem vendas = 0'
);

-- Cenário 5: cada movimentação VENDA tem o custo_unitario correto
select results_eq(
  $$ select custo_unitario, abs(quantidade) from movimentacoes_estoque
     where tipo = 'VENDA' and origem_tipo = 'comanda_item'
     order by custo_unitario $$,
  $$ values (10.00::numeric, 3::numeric), (25.00::numeric, 2::numeric), (50.00::numeric, 1::numeric) $$,
  'Cada movimentação VENDA registra o custo_unitario correto do produto no momento da venda'
);

-- Validação: CMV reflete custo, não preço de venda
select results_eq(
  $$ select fn_calcular_cmv(to_char(current_date, 'YYYY-MM')) $$,
  $$ values (130.00::numeric) $$,
  'CMV usa preco_custo (10+25+50), nao preco_venda (20+50+100)'
);

-- Validação: competência futura retorna 0
select results_eq(
  $$ select fn_calcular_cmv('2099-12') $$,
  $$ values (0::numeric) $$,
  'CMV para competência futura sem movimentações = 0'
);

select * from finish();
rollback;
