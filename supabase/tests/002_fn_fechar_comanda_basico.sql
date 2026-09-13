-- ============================================================================
-- Teste pgTAP: fn_fechar_comanda — caminho feliz + idempotência
-- Ponto de partida. Ainda faltam (Protocolo B, checklist completo):
--   - desconto com motivo que afeta/não afeta comissão
--   - rateio de taxa PROFISSIONAL_PROPORCIONAL e POR_FORMA_PAGAMENTO
--   - forma de pagamento sem entrada no jsonb (deve falhar explicitamente)
--   - produto com percentual_comissao próprio
--   - baixa de estoque indo negativo (não deve bloquear)
--   - pagamentos que não conferem com o total (deve falhar)
-- ============================================================================

begin;
select plan(4);

-- Fixture de identidade: o role authenticated precisa de um usuario ADMIN
-- para que as policies de leitura enxerguem o item após a RPC.
insert into usuarios (id, salon_id, auth_user_id, nome, perfil)
values (
	'10000000-0000-0000-0000-000000000003',
	'00000000-0000-0000-0000-000000000001',
	'10000000-0000-0000-0000-000000000004',
	'Admin de Teste',
	'ADMIN'
);

select set_config('request.jwt.claims',
'{"sub": "10000000-0000-0000-0000-000000000004", "role": "authenticated", "app_metadata": {"salon_id": "00000000-0000-0000-0000-000000000001"}}', true);

-- Setup: usa os dados do seed.sql (salão, profissional, serviço, taxas)
-- + uma comanda aberta com um item de serviço.
insert into comandas (id, salon_id, uuid_cliente, status)
values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
gen_random_uuid(), 'ABERTA');

insert into comanda_itens (id, salon_id, comanda_id, tipo, servico_id, descricao_snapshot,
quantidade, preco_unitario, total, profissional_id)
values ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
'10000000-0000-0000-0000-000000000001', 'SERVICO',
'00000000-0000-0000-0000-000000000201', 'Corte de Teste',
1, 50.00, 50.00, '00000000-0000-0000-0000-000000000101');

-- O setup de dados é feito como postgres; apenas a chamada da RPC deve
-- representar o role autenticado que a aplicação usa via PostgREST.
set local role authenticated;

-- 1. Fechamento com pagamento exato deve funcionar sem levantar exceção.
select lives_ok(
$$ select fn_fechar_comanda(
'10000000-0000-0000-0000-000000000001'::uuid,
'[{"metodo": "PIX", "valor_bruto": 50.00}]'::jsonb
) $$,
'fn_fechar_comanda processa um fechamento simples sem erro'
);

-- 2. Comissão default do profissional (40%, do seed) deve ter sido
--    aplicada sobre a base bruta (sem desconto, taxa PIX = 0%).
select results_eq(
$$ select comissao_valor_snapshot from comanda_itens
where id = '10000000-0000-0000-0000-000000000002' $$,
$$ values (20.00::numeric) $$,
'Comissão calculada = 40% de R$ 50,00 = R$ 20,00'
);

-- 3. Comanda deve estar FINALIZADA.
select results_eq(
$$ select status::text from comandas where id = '10000000-0000-0000-0000-000000000001' $$,
$$ values ('FINALIZADA') $$,
'Comanda passa para FINALIZADA após o fechamento'
);

-- 4. Idempotência: chamar de novo não deve reprocessar nem lançar erro —
--    deve devolver o mesmo resultado com idempotente = true.
select results_eq(
$$ select (fn_fechar_comanda(
'10000000-0000-0000-0000-000000000001'::uuid,
'[{"metodo": "PIX", "valor_bruto": 50.00}]'::jsonb
)->>'idempotente')::boolean $$,
$$ values (true) $$,
'Chamar fn_fechar_comanda de novo na mesma comanda é idempotente'
);

select * from finish();
rollback;
