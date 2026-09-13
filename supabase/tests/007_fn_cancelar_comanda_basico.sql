-- ============================================================================
-- Teste pgTAP: fn_cancelar_comanda — casos básicos
-- ============================================================================

begin;
select plan(8);

insert into usuarios (id, salon_id, auth_user_id, nome, perfil)
values ('70000000-0000-0000-0000-00000000000e', '00000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-00000000000f', 'Admin de Teste 007', 'ADMIN');

select set_config('request.jwt.claims',
'{"sub": "70000000-0000-0000-0000-00000000000f", "role": "authenticated", "app_metadata": {"salon_id": "00000000-0000-0000-0000-000000000001"}}', true);

insert into comandas (id, salon_id, uuid_cliente, status)
values ('70000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-000000000001', gen_random_uuid(), 'ABERTA');

insert into comandas (id, salon_id, uuid_cliente, status)
values ('70000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000001', gen_random_uuid(), 'ABERTA');

insert into comanda_itens (id, salon_id, comanda_id, tipo, servico_id, descricao_snapshot, quantidade, preco_unitario, total, profissional_id)
values ('70000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-00000000000a', 'SERVICO', '00000000-0000-0000-0000-000000000201', 'Corte de Teste', 1, 50.00, 50.00, '00000000-0000-0000-0000-000000000101');

insert into comanda_itens (id, salon_id, comanda_id, tipo, produto_id, descricao_snapshot, quantidade, preco_unitario, total, profissional_id)
values ('70000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-00000000000a', 'PRODUTO', '00000000-0000-0000-0000-000000000301', 'Produto de Teste', 3, 25.00, 75.00, '00000000-0000-0000-0000-000000000101');

set local role authenticated;

select throws_like(
$$ select fn_cancelar_comanda('70000000-0000-0000-0000-00000000000c'::uuid, 'Teste') $$,
'%está ABERTA%',
'Comanda ABERTA é rejeitada pela RPC de cancelamento'
);

select fn_fechar_comanda('70000000-0000-0000-0000-00000000000a'::uuid, '[{"metodo": "PIX", "valor_bruto": 125.00}]'::jsonb);

select results_eq(
$$ select estoque_atual from produtos where id = '00000000-0000-0000-0000-000000000301' $$,
$$ values (97.00::numeric) $$,
'Pré-condição: estoque baixou para 97 após o fechamento, antes do cancelamento'
);

select lives_ok(
$$ select fn_cancelar_comanda('70000000-0000-0000-0000-00000000000a'::uuid, 'Cliente desistiu') $$,
'Cancelamento de comanda FINALIZADA processa sem erro'
);

select results_eq(
$$ select status::text from comandas where id = '70000000-0000-0000-0000-00000000000a' $$,
$$ values ('CANCELADA') $$,
'Comanda passa para CANCELADA após o cancelamento'
);

select results_eq(
$$ select estornado from pagamentos where comanda_id = '70000000-0000-0000-0000-00000000000a' $$,
$$ values (true) $$,
'Pagamento é marcado como estornado, não removido'
);

select results_eq(
$$ select estoque_atual from produtos where id = '00000000-0000-0000-0000-000000000301' $$,
$$ values (100.00::numeric) $$,
'Estoque é devolvido integralmente no cancelamento (97 + 3 = 100)'
);

select results_eq(
$$ select (fn_cancelar_comanda('70000000-0000-0000-0000-00000000000a'::uuid, 'Tentativa repetida')->>'idempotente')::boolean $$,
$$ values (true) $$,
'Cancelar de novo a mesma comanda é idempotente'
);

select results_eq(
$$ select estoque_atual from produtos where id = '00000000-0000-0000-0000-000000000301' $$,
$$ values (100.00::numeric) $$,
'Chamada idempotente NÃO duplica a devolução de estoque (continua 100, não 103)'
);

select * from finish();
rollback;
