-- ============================================================================
-- Teste pgTAP: o gate comissao_sobre_produto DESLIGADO zera a comissao de um
-- item do tipo PRODUTO, mesmo com produtos.percentual_comissao preenchido.
--
-- Complementa 005_fn_fechar_comanda_produto_estoque.sql, que cobre o ramo
-- LIGADO do mesmo gate (gate = true -> 7.50). Aqui gate = false -> 0.00, e o
-- percentual proprio do produto continua preenchido (15) nos dois casos. E
-- essa combinacao -- gate desligado COM percentual de produto -- que nao
-- existia em nenhum teste do projeto.
--
-- Origem da regra:
--   plano-arquitetura-salao-beleza-v2_4.md:952  ("Produtos so geram comissao
--     se config_comissoes.comissao_sobre_produto = true")
--   plano-arquitetura-salao-beleza-v2_4.md:2060 ("on/off por profissional via
--     comissao_sobre_produto; percentual especifico por produto via
--     produtos.percentual_comissao (override opcional)")
-- Implementacao: 0004_fn_fechar_comanda.sql:221-231
--
-- Prova: AC-046 (feature gate-comissao-produto).
-- ============================================================================

begin;
select plan(1);

insert into usuarios (id, salon_id, auth_user_id, nome, perfil)
values ('40000000-0000-0000-0000-00000000002c', '00000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-00000000002d', 'Admin de Teste 014', 'ADMIN');

select set_config('request.jwt.claims',
'{"sub": "40000000-0000-0000-0000-00000000002d", "role": "authenticated", "app_metadata": {"salon_id": "00000000-0000-0000-0000-000000000001"}}', true);

-- Gate DESLIGADO. Unica diferenca de montagem em relacao ao 005 (linha 18),
-- que usa true. Defaults e percentual do profissional sao os mesmos.
insert into config_comissoes (salon_id, profissional_id, servico_id, comissao_percentual, base_calculo, rateio_taxa, comissao_sobre_produto, timing_repasse)
values (
'00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000101',
null, 40, 'BRUTO', 'SALAO', false, 'IMEDIATO'
);

-- Percentual proprio do produto PREENCHIDO. Mantido de proposito: e ele que
-- daria 7.50 se o gate nao fosse respeitado, e portanto torna a assercao
-- capaz de distinguir "gate desligado" de "gate ligado".
update produtos set percentual_comissao = 15
where id = '00000000-0000-0000-0000-000000000301';

insert into comandas (id, salon_id, uuid_cliente, status)
values ('40000000-0000-0000-0000-00000000002a', '00000000-0000-0000-0000-000000000001', gen_random_uuid(), 'ABERTA');

insert into comanda_itens (id, salon_id, comanda_id, tipo, produto_id, descricao_snapshot,
quantidade, preco_unitario, total, profissional_id)
values ('40000000-0000-0000-0000-00000000002b', '00000000-0000-0000-0000-000000000001',
'40000000-0000-0000-0000-00000000002a', 'PRODUTO', '00000000-0000-0000-0000-000000000301',
'Produto de Teste', 2, 25.00, 50.00, '00000000-0000-0000-0000-000000000101');

set local role authenticated;
select fn_fechar_comanda(
'40000000-0000-0000-0000-00000000002a'::uuid,
'[{"metodo": "PIX", "valor_bruto": 50.00}]'::jsonb
);

-- 0.00 e o valor esperado porque a regra esta no plano (v2_4:952) e no codigo
-- (0004:222-223). Nao e o valor "observado": se o resultado for diferente, o
-- achado e de defeito, e a tarefa nao pode ser marcada como concluida.
select results_eq(
$$ select comissao_valor_snapshot from comanda_itens where id = '40000000-0000-0000-0000-00000000002b' $$,
$$ values (0.00::numeric) $$,
'Gate desligado zera comissao de PRODUTO mesmo com percentual 15 no produto @spec:AC-046'
);

select * from finish();
rollback;
