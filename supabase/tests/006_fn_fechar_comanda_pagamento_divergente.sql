-- ============================================================================
-- Teste pgTAP: pagamentos que não conferem com o valor esperado da comanda
-- devem ser rejeitados (Seção 11.1, item 2).
-- ============================================================================

begin;
select plan(1);

insert into usuarios (id, salon_id, auth_user_id, nome, perfil)
values ('60000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-00000000000d', 'Admin de Teste 006', 'ADMIN');

select set_config('request.jwt.claims',
'{"sub": "60000000-0000-0000-0000-00000000000d", "role": "authenticated", "app_metadata": {"salon_id": "00000000-0000-0000-0000-000000000001"}}', true);

insert into comandas (id, salon_id, uuid_cliente, status)
values ('60000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000001', gen_random_uuid(), 'ABERTA');

insert into comanda_itens (id, salon_id, comanda_id, tipo, servico_id, descricao_snapshot,
quantidade, preco_unitario, total, profissional_id)
values ('60000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000001',
'60000000-0000-0000-0000-00000000000a', 'SERVICO', '00000000-0000-0000-0000-000000000201',
'Corte de Teste', 1, 50.00, 50.00, '00000000-0000-0000-0000-000000000101');

set local role authenticated;
select throws_like(
$$ select fn_fechar_comanda(
'60000000-0000-0000-0000-00000000000a'::uuid,
'[{"metodo": "PIX", "valor_bruto": 30.00}]'::jsonb
) $$,
'%não conferem com o valor esperado%',
'Pagamento divergente do valor esperado da comanda é rejeitado'
);

select * from finish();
rollback;
