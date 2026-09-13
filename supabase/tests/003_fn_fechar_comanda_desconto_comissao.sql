-- ============================================================================
-- Teste pgTAP: efeito do motivo_desconto.afeta_comissao na base de comissão
-- Exige base_calculo = LIQUIDO_APOS_DESCONTO para o efeito aparecer — com
-- BRUTO (default), o desconto nunca afetaria a comissão de qualquer forma.
-- ============================================================================

begin;
select plan(2);

insert into usuarios (id, salon_id, auth_user_id, nome, perfil)
values ('20000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-00000000000d', 'Admin de Teste 003', 'ADMIN');

select set_config('request.jwt.claims',
'{"sub": "20000000-0000-0000-0000-00000000000d", "role": "authenticated", "app_metadata": {"salon_id": "00000000-0000-0000-0000-000000000001"}}', true);

insert into config_comissoes (salon_id, profissional_id, servico_id, comissao_percentual, base_calculo, rateio_taxa, comissao_sobre_produto, timing_repasse)
values (
'00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000101',
'00000000-0000-0000-0000-000000000201', 40, 'LIQUIDO_APOS_DESCONTO', 'SALAO', false, 'IMEDIATO'
);

insert into comandas (id, salon_id, uuid_cliente, status, desconto, motivo_desconto_id)
select '20000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000001',
gen_random_uuid(), 'ABERTA', 20.00, id
from motivos_desconto where descricao = 'Desconto por erro/reclamação';

insert into comanda_itens (id, salon_id, comanda_id, tipo, servico_id, descricao_snapshot,
quantidade, preco_unitario, total, profissional_id)
values ('20000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000001',
'20000000-0000-0000-0000-00000000000a', 'SERVICO', '00000000-0000-0000-0000-000000000201',
'Corte de Teste', 1, 100.00, 100.00, '00000000-0000-0000-0000-000000000101');

insert into comandas (id, salon_id, uuid_cliente, status, desconto, motivo_desconto_id)
select '20000000-0000-0000-0000-00000000001a', '00000000-0000-0000-0000-000000000001',
gen_random_uuid(), 'ABERTA', 20.00, id
from motivos_desconto where descricao = 'Desconto comercial';

insert into comanda_itens (id, salon_id, comanda_id, tipo, servico_id, descricao_snapshot,
quantidade, preco_unitario, total, profissional_id)
values ('20000000-0000-0000-0000-00000000001b', '00000000-0000-0000-0000-000000000001',
'20000000-0000-0000-0000-00000000001a', 'SERVICO', '00000000-0000-0000-0000-000000000201',
'Corte de Teste', 1, 100.00, 100.00, '00000000-0000-0000-0000-000000000101');

set local role authenticated;
select fn_fechar_comanda(
'20000000-0000-0000-0000-00000000000a'::uuid,
'[{"metodo": "PIX", "valor_bruto": 80.00}]'::jsonb
);

select results_eq(
$$ select comissao_valor_snapshot from comanda_itens where id = '20000000-0000-0000-0000-00000000000b' $$,
$$ values (32.00::numeric) $$,
'Desconto com motivo afeta_comissao=true reduz a base: comissão = 40% de (100-20) = 32,00'
);

select fn_fechar_comanda(
'20000000-0000-0000-0000-00000000001a'::uuid,
'[{"metodo": "PIX", "valor_bruto": 80.00}]'::jsonb
);

select results_eq(
$$ select comissao_valor_snapshot from comanda_itens where id = '20000000-0000-0000-0000-00000000001b' $$,
$$ values (40.00::numeric) $$,
'Desconto com motivo afeta_comissao=false NÃO reduz a base: comissão = 40% de 100 = 40,00'
);

select * from finish();
rollback;
