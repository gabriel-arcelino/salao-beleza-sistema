-- ============================================================================
-- Teste pgTAP: percentual_comissao próprio de produto (Seção 11.3.3) e
-- venda com estoque insuficiente não bloqueia o fechamento (Seção 11.1/v2.4).
-- ============================================================================

begin;
select plan(3);

insert into usuarios (id, salon_id, auth_user_id, nome, perfil)
values ('40000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-00000000000d', 'Admin de Teste 005', 'ADMIN');

select set_config('request.jwt.claims',
'{"sub": "40000000-0000-0000-0000-00000000000d", "role": "authenticated", "app_metadata": {"salon_id": "00000000-0000-0000-0000-000000000001"}}', true);

insert into config_comissoes (salon_id, profissional_id, servico_id, comissao_percentual, base_calculo, rateio_taxa, comissao_sobre_produto, timing_repasse)
values (
'00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000101',
null, 40, 'BRUTO', 'SALAO', true, 'IMEDIATO'
);

update produtos set percentual_comissao = 15
where id = '00000000-0000-0000-0000-000000000301';

insert into comandas (id, salon_id, uuid_cliente, status)
values ('40000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000001', gen_random_uuid(), 'ABERTA');

insert into comanda_itens (id, salon_id, comanda_id, tipo, produto_id, descricao_snapshot,
quantidade, preco_unitario, total, profissional_id)
values ('40000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000001',
'40000000-0000-0000-0000-00000000000a', 'PRODUTO', '00000000-0000-0000-0000-000000000301',
'Produto de Teste', 2, 25.00, 50.00, '00000000-0000-0000-0000-000000000101');

insert into comandas (id, salon_id, uuid_cliente, status)
values ('40000000-0000-0000-0000-00000000001a', '00000000-0000-0000-0000-000000000001', gen_random_uuid(), 'ABERTA');

insert into comanda_itens (id, salon_id, comanda_id, tipo, produto_id, descricao_snapshot,
quantidade, preco_unitario, total, profissional_id)
values ('40000000-0000-0000-0000-00000000001b', '00000000-0000-0000-0000-000000000001',
'40000000-0000-0000-0000-00000000001a', 'PRODUTO', '00000000-0000-0000-0000-000000000301',
'Produto de Teste', 200, 25.00, 5000.00, '00000000-0000-0000-0000-000000000101');

set local role authenticated;
select fn_fechar_comanda(
'40000000-0000-0000-0000-00000000000a'::uuid,
'[{"metodo": "PIX", "valor_bruto": 50.00}]'::jsonb
);

select results_eq(
$$ select comissao_valor_snapshot from comanda_itens where id = '40000000-0000-0000-0000-00000000000b' $$,
$$ values (7.50::numeric) $$,
'Percentual próprio do produto (15%) prevalece sobre o default do profissional (40%)'
);

select lives_ok(
$$ select fn_fechar_comanda(
'40000000-0000-0000-0000-00000000001a'::uuid,
'[{"metodo": "PIX", "valor_bruto": 5000.00}]'::jsonb
) $$,
'Venda com estoque insuficiente (200 de um saldo de 100) fecha sem erro — v2.4'
);

select results_eq(
$$ select estoque_atual from produtos where id = '00000000-0000-0000-0000-000000000301' $$,
$$ values (-102.00::numeric) $$,
'Saldo de estoque fica negativo (-102) em vez de bloquear a venda'
);

select * from finish();
rollback;
