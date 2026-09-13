-- ============================================================================
-- Teste pgTAP: fn_estornar_pagamento
-- ============================================================================

begin;
select plan(8);

insert into usuarios (id, salon_id, auth_user_id, nome, perfil)
values
('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
'a0000000-0000-0000-0000-00000000000a', 'Recepcionista de Teste', 'RECEPCAO'),
('a0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
'a0000000-0000-0000-0000-00000000000b', 'Admin de Teste', 'ADMIN');

insert into comandas (id, salon_id, uuid_cliente, status)
values ('a0000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-000000000001',
gen_random_uuid(), 'ABERTA');

insert into comanda_itens (id, salon_id, comanda_id, tipo, servico_id, descricao_snapshot, quantidade, preco_unitario, total, profissional_id)
values ('a0000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-000000000001',
'a0000000-0000-0000-0000-00000000000c', 'SERVICO', '00000000-0000-0000-0000-000000000201',
'Corte de Teste (valor ajustado p/ teste)', 1, 300.00, 300.00, '00000000-0000-0000-0000-000000000101');

set local role authenticated;
select set_config('request.jwt.claims',
'{"sub": "a0000000-0000-0000-0000-00000000000b", "app_metadata": {"salon_id": "00000000-0000-0000-0000-000000000001"}}', true);

select fn_fechar_comanda(
'a0000000-0000-0000-0000-00000000000c'::uuid,
'[{"metodo": "PIX", "valor_bruto": 100.00}, {"metodo": "CREDITO", "valor_bruto": 200.00}]'::jsonb
);

select id as pagamento_credito_id from pagamentos
where comanda_id = 'a0000000-0000-0000-0000-00000000000c' and metodo = 'CREDITO' \gset

select set_config('request.jwt.claims',
'{"sub": "a0000000-0000-0000-0000-00000000000a", "app_metadata": {"salon_id": "00000000-0000-0000-0000-000000000001"}}', true);

select throws_like(
format($$ select fn_estornar_pagamento('%s'::uuid, 50.00, 'Tentativa de recepção') $$, :'pagamento_credito_id'),
'%Apenas ADMIN ou GERENTE%',
'RECEPCAO não pode estornar pagamento'
);

select set_config('request.jwt.claims',
'{"sub": "a0000000-0000-0000-0000-00000000000b", "app_metadata": {"salon_id": "00000000-0000-0000-0000-000000000001"}}', true);

select lives_ok(
format($$ select fn_estornar_pagamento('%s'::uuid, 50.00, 'Estorno parcial de teste') $$, :'pagamento_credito_id'),
'Estorno parcial processa sem erro'
);

select results_eq(
format($$ select estornado from pagamentos where id = '%s' $$, :'pagamento_credito_id'),
$$ values (false) $$,
'Após estorno parcial (50 de 200), pagamento ainda NÃO está totalmente estornado'
);

select results_eq(
$$ select estornado from pagamentos where comanda_id = 'a0000000-0000-0000-0000-00000000000c' and metodo = 'PIX' $$,
$$ values (false) $$,
'Pagamento em PIX permanece intocado — só o de CREDITO foi estornado'
);

select lives_ok(
format($$ select fn_estornar_pagamento('%s'::uuid, 150.00, 'Completando o estorno') $$, :'pagamento_credito_id'),
'Segundo estorno completando o saldo restante processa sem erro'
);

select results_eq(
format($$ select estornado from pagamentos where id = '%s' $$, :'pagamento_credito_id'),
$$ values (true) $$,
'Após estornar o total (50+150=200), pagamento fica marcado como totalmente estornado'
);

select throws_like(
format($$ select fn_estornar_pagamento('%s'::uuid, 1.00, 'Além do saldo') $$, :'pagamento_credito_id'),
'%excede o saldo restante%',
'Estornar além do saldo restante é rejeitado'
);

select results_eq(
$$ select status::text from comandas where id = 'a0000000-0000-0000-0000-00000000000c' $$,
$$ values ('FINALIZADA') $$,
'Comanda continua FINALIZADA — fn_estornar_pagamento nunca cancela a comanda'
);

select * from finish();
rollback;
