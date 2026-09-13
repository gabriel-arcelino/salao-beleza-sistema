-- ============================================================================
-- Teste pgTAP: rateio de taxa PROFISSIONAL_PROPORCIONAL e POR_FORMA_PAGAMENTO
-- sem entrada mapeada (deve falhar explicitamente, Seção 11.3.2/v2.3).
-- ============================================================================

begin;
select plan(2);

insert into usuarios (id, salon_id, auth_user_id, nome, perfil)
values ('30000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-00000000000d', 'Admin de Teste 004', 'ADMIN');

select set_config('request.jwt.claims',
'{"sub": "30000000-0000-0000-0000-00000000000d", "role": "authenticated", "app_metadata": {"salon_id": "00000000-0000-0000-0000-000000000001"}}', true);

insert into config_comissoes (id, salon_id, profissional_id, servico_id, comissao_percentual, base_calculo, rateio_taxa, comissao_sobre_produto, timing_repasse)
values (
'30000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001',
'00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000201',
40, 'BRUTO', 'PROFISSIONAL_PROPORCIONAL', false, 'IMEDIATO'
);

insert into comandas (id, salon_id, uuid_cliente, status)
values ('30000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000001', gen_random_uuid(), 'ABERTA');

insert into comanda_itens (id, salon_id, comanda_id, tipo, servico_id, descricao_snapshot,
quantidade, preco_unitario, total, profissional_id)
values ('30000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000001',
'30000000-0000-0000-0000-00000000000a', 'SERVICO', '00000000-0000-0000-0000-000000000201',
'Corte de Teste', 1, 100.00, 100.00, '00000000-0000-0000-0000-000000000101');

set local role authenticated;
select fn_fechar_comanda(
'30000000-0000-0000-0000-00000000000a'::uuid,
'[{"metodo": "CREDITO", "valor_bruto": 100.00}]'::jsonb
);

select results_eq(
$$ select comissao_valor_snapshot from comanda_itens where id = '30000000-0000-0000-0000-00000000000b' $$,
$$ values (38.60::numeric) $$,
'PROFISSIONAL_PROPORCIONAL: comissão = 40% de (100 - 3,50 de taxa) = 38,60'
);

reset role;

update config_comissoes
set rateio_taxa = 'POR_FORMA_PAGAMENTO',
    rateio_taxa_por_forma_pagamento = '{"PIX": 100}'::jsonb
where id = '30000000-0000-0000-0000-000000000000';

insert into comandas (id, salon_id, uuid_cliente, status)
values ('30000000-0000-0000-0000-00000000001a', '00000000-0000-0000-0000-000000000001', gen_random_uuid(), 'ABERTA');

insert into comanda_itens (id, salon_id, comanda_id, tipo, servico_id, descricao_snapshot,
quantidade, preco_unitario, total, profissional_id)
values ('30000000-0000-0000-0000-00000000001b', '00000000-0000-0000-0000-000000000001',
'30000000-0000-0000-0000-00000000001a', 'SERVICO', '00000000-0000-0000-0000-000000000201',
'Corte de Teste', 1, 100.00, 100.00, '00000000-0000-0000-0000-000000000101');

set local role authenticated;

select throws_like(
$$ select fn_fechar_comanda(
'30000000-0000-0000-0000-00000000001a'::uuid,
'[{"metodo": "CREDITO", "valor_bruto": 100.00}]'::jsonb
) $$,
'%Forma de pagamento "%" sem rateio configurado%',
'Forma de pagamento não mapeada em rateio_taxa_por_forma_pagamento falha explicitamente'
);

select * from finish();
rollback;
