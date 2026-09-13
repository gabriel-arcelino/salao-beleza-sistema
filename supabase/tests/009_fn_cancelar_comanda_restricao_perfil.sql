-- ============================================================================
-- Teste pgTAP: só ADMIN/GERENTE podem cancelar (RECEPCAO é rejeitado)
-- ============================================================================

begin;
select plan(2);

-- Fixtures como postgres (mesmo padrão já corrigido nos testes 007/008):
-- dois usuários de perfis diferentes, ligados ao salão do seed.
insert into usuarios (id, salon_id, auth_user_id, nome, perfil)
values
('90000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
'90000000-0000-0000-0000-00000000000a', 'Recepcionista de Teste', 'RECEPCAO'),
('90000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
'90000000-0000-0000-0000-00000000000b', 'Admin de Teste', 'ADMIN');

set local role authenticated;

-- Comanda finalizada como RECEPCAO (fechar comanda não tem essa restrição).
select set_config('request.jwt.claims',
'{"sub": "90000000-0000-0000-0000-00000000000a", "app_metadata": {"salon_id": "00000000-0000-0000-0000-000000000001"}}', true);

insert into comandas (id, salon_id, uuid_cliente, status)
values ('90000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-000000000001',
gen_random_uuid(), 'ABERTA');

insert into comanda_itens (id, salon_id, comanda_id, tipo, servico_id, descricao_snapshot, quantidade, preco_unitario, total, profissional_id)
values ('90000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-000000000001',
'90000000-0000-0000-0000-00000000000c', 'SERVICO', '00000000-0000-0000-0000-000000000201',
'Corte de Teste', 1, 50.00, 50.00, '00000000-0000-0000-0000-000000000101');

select fn_fechar_comanda(
'90000000-0000-0000-0000-00000000000c'::uuid,
'[{"metodo": "PIX", "valor_bruto": 50.00}]'::jsonb
);

-- Caso 1: RECEPCAO tentando cancelar é rejeitado.
select throws_like(
$$ select fn_cancelar_comanda('90000000-0000-0000-0000-00000000000c'::uuid, 'Tentativa de recepção') $$,
'%Apenas ADMIN ou GERENTE%',
'RECEPCAO não pode cancelar comanda finalizada'
);

-- Caso 2: ADMIN consegue cancelar a mesma comanda sem erro.
select set_config('request.jwt.claims',
'{"sub": "90000000-0000-0000-0000-00000000000b", "app_metadata": {"salon_id": "00000000-0000-0000-0000-000000000001"}}', true);

select lives_ok(
$$ select fn_cancelar_comanda('90000000-0000-0000-0000-00000000000c'::uuid, 'Cancelamento autorizado por admin') $$,
'ADMIN consegue cancelar a mesma comanda sem erro'
);

select * from finish();
rollback;
