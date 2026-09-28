-- ============================================================================
-- Teste pgTAP: fn_dashboard_indicadores (migration 0014)
--
-- Prova AC-048 a AC-051, AC-053, AC-056 e AC-057 da feature
-- dashboard-gerencial, mais duas guardas sem AC: isolamento de salão e
-- falha ruidosa sem contexto.
--
-- Sem `set local role authenticated`: a função é SECURITY DEFINER e resolve o
-- salão pelo GUC `request.jwt.claims`, não por RLS. Nenhuma asserção lê tabela
-- diretamente, então trocar de role só introduziria risco de RLS sem
-- acrescentar cobertura.
--
-- Competências usadas (uma por cenário, para não interferir entre si):
--   2026-01  pagamento com taxa de maquininha  -> AC-048, AC-049
--   2026-02  movimentação de estoque VENDA    -> AC-050, AC-057
--   2026-03  despesa + fechamento de comissão -> AC-051
--   2026-04  nada                             -> AC-053
--   2026-05  só despesa                        -> AC-056
--   2026-06  só despesa de OUTRO salão        -> guarda de isolamento
-- ============================================================================

begin;
select plan(9);

select set_config('request.jwt.claims',
  '{"sub": "40000000-0000-0000-0000-00000000002d", "role": "authenticated", "app_metadata": {"salon_id": "00000000-0000-0000-0000-000000000001"}}', true);

insert into usuarios (id, salon_id, auth_user_id, nome, perfil)
values ('40000000-0000-0000-0000-00000000002c', '00000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-00000000002d', 'Admin de Teste 015', 'ADMIN');

-- Salão intruso, para a guarda de isolamento.
insert into saloes (id, nome) values ('00000000-0000-0000-0000-0000000000ff', 'Salao Intruso');

-- ---------------------------------------------------------------------------
-- 2026-01: um pagamento de 100,00 com taxa de 2,00 -> liquido 98,00
-- ---------------------------------------------------------------------------
insert into comandas (id, salon_id, uuid_cliente, status, subtotal, total, opened_at, closed_at)
values ('40000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000001', gen_random_uuid(),
        'FINALIZADA', 100.00, 100.00, '2026-01-15 11:00:00', '2026-01-15 12:00:00');

insert into pagamentos (id, salon_id, comanda_id, metodo, valor_bruto, taxa_percentual, taxa_valor, valor_liquido, parcelas, paid_at)
values ('40000000-0000-0000-0000-000000000200', '00000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000100',
        'PIX', 100.00, 2.00, 2.00, 98.00, 1, '2026-01-15 12:05:00');

-- ---------------------------------------------------------------------------
-- 2026-02: venda de produto SEM pagamento. 2 x 10,00 de custo = CMV 20,00
-- ---------------------------------------------------------------------------
insert into movimentacoes_estoque (id, salon_id, produto_id, tipo, quantidade, custo_unitario, created_at)
values ('40000000-0000-0000-0000-000000000400', '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000301', 'VENDA', 2, 10.00, '2026-02-10 10:00:00');

-- ---------------------------------------------------------------------------
-- 2026-03: despesa 50,00 e um repasse de comissão 77,00 na MESMA competência
-- ---------------------------------------------------------------------------
insert into despesas (id, salon_id, descricao, categoria, tipo, valor, data_competencia, data_pagamento, status)
values ('40000000-0000-0000-0000-000000000500', '00000000-0000-0000-0000-000000000001', 'Aluguel de teste', 'FIXA', 'FIXA', 50.00,
        '2026-03-10', '2026-03-10', 'PAGO');

insert into fechamentos_comissao (id, salon_id, profissional_id, competencia, status, total_pago, fechado_em)
values ('40000000-0000-0000-0000-000000000600', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000101',
        '2026-03', 'FECHADO', 77.00, '2026-03-20 10:00:00');

-- ---------------------------------------------------------------------------
-- 2026-05: só despesa de 25,00, sem pagamento e sem venda
-- ---------------------------------------------------------------------------
insert into despesas (id, salon_id, descricao, categoria, tipo, valor, data_competencia, data_pagamento, status)
values ('40000000-0000-0000-0000-000000000700', '00000000-0000-0000-0000-000000000001', 'Material de teste', 'VARIAVEL', 'VARIAVEL', 25.00,
        '2026-05-10', '2026-05-10', 'PAGO');

-- ---------------------------------------------------------------------------
-- 2026-06: 999,00 de despesa em salão QUE NÃO É o do GUC
-- ---------------------------------------------------------------------------
insert into despesas (id, salon_id, descricao, categoria, tipo, valor, data_competencia, data_pagamento, status)
values ('40000000-0000-0000-0000-000000000800', '00000000-0000-0000-0000-0000000000ff', 'Despesa do intruso', 'FIXA', 'FIXA', 999.00,
        '2026-06-10', '2026-06-10', 'PAGO');

-- ===========================================================================
-- ACs
-- ===========================================================================

-- AC-048: o faturamento do dashboard é o MESMO valor de total_vendas do caixa,
-- lido no mesmo teste. É essa comparação que impede reimplementar a fórmula.
select is(
    (select d.faturamento from public.fn_dashboard_indicadores('2026-01') d),
    (select c.total_vendas from public.fn_relatorio_caixa('2026-01-01'::date, '2026-01-31'::date) c),
    'Faturamento do dashboard e igual a total_vendas do relatorio de caixa na mesma competencia @spec:AC-048'
);

-- AC-049: idem contra total_entradas, e a receita liquida tem de ser menor que
-- o faturamento, porque ha taxa de maquininha.
select ok(
    (select d.receita_liquida from public.fn_dashboard_indicadores('2026-01') d)
      = (select c.total_entradas from public.fn_relatorio_caixa('2026-01-01'::date, '2026-01-31'::date) c)
    and (select d.receita_liquida from public.fn_dashboard_indicadores('2026-01') d)
      < (select d.faturamento from public.fn_dashboard_indicadores('2026-01') d),
    'Receita liquida e igual a total_entradas do caixa e menor que o faturamento com taxa @spec:AC-049'
);

-- AC-050: o CMV e o MESMO valor que fn_calcular_cmv devolve para a competência.
select is(
    (select d.cmv from public.fn_dashboard_indicadores('2026-02') d),
    (select public.fn_calcular_cmv('2026-02')),
    'CMV do dashboard e igual ao de fn_calcular_cmv para a mesma competencia @spec:AC-050'
);

-- AC-051: despesas isoladas. A competência tem 50,00 de despesa E 77,00 de
-- repasse; se a função somasse os dois, daria 127,00.
select is(
    (select d.despesas from public.fn_dashboard_indicadores('2026-03') d),
    50.00::numeric,
    'Despesas do dashboard somam so a despesa e NAO incluem o total_pago do fechamento @spec:AC-051'
);

-- AC-053: competência totalmente vazia e "sem movimento", nao R$ 0,00.
select is(
    (select d.tem_movimento from public.fn_dashboard_indicadores('2026-04') d),
    false,
    'Competencia sem pagamento, venda ou despesa e marcada como sem movimento @spec:AC-053'
);

-- AC-056: só despesa. Despesa sozinha JÁ é movimento, e o Faturamento zero é
-- apurado, não ausência de dado.
select ok(
    (select d.tem_movimento from public.fn_dashboard_indicadores('2026-05') d)
    and (select d.faturamento from public.fn_dashboard_indicadores('2026-05') d) = 0
    and (select d.despesas from public.fn_dashboard_indicadores('2026-05') d) = 25.00,
    'So despesa: tem_movimento verdadeiro e Faturamento zero apurado @spec:AC-056'
);

-- AC-057: só venda de estoque, sem pagamento e sem despesa. E o ÚNICO cenário
-- que reprova um tem_movimento definido só por pagamentos e despesas.
-- As três condições no mesmo teste: tem movimento E o zero de Faturamento e
-- apurado E o CMV existe — é a combinação que prova os dois estados juntos.
select ok(
    (select d.tem_movimento from public.fn_dashboard_indicadores('2026-02') d)
    and (select d.faturamento from public.fn_dashboard_indicadores('2026-02') d) = 0
    and (select d.cmv from public.fn_dashboard_indicadores('2026-02') d) > 0,
    'So venda de estoque: tem_movimento verdadeiro, Faturamento zero apurado e CMV maior que zero @spec:AC-057'
);

-- ===========================================================================
-- Guardas sem AC — segurança, não funcionalidade
-- ===========================================================================

-- Isolamento de salão: a despesa de 999,00 pertence a outro salão e não pode
-- aparecer. Se o filtro por salão fosse removido, daria 999,00.
select is(
    (select d.despesas from public.fn_dashboard_indicadores('2026-06') d),
    0::numeric,
    'Despesa de outro salao e ignorada: isolamento por tenant preservado'
);

-- Falha sem contexto: limpar o GUC faz current_salon_id() devolver NULL e a
-- função ABORTAR. A garantia é que ela NUNCA devolve zero silencioso, que é o
-- que a regra do projeto chama de zero que parece valor apurado.
--
-- Precisa ser o ÚLTIMO teste: limpar o GUC afeta a transação inteira.
--
-- Sobre a forma de throws_ok: o 2º argumento das formas de 2 e 3 argumentos é a
-- MENSAGEM ESPERADA, não a descrição — usar a descrição ali reprova mesmo
-- quando a exceção é a correta. Por isso a forma de 4 argumentos
-- (sql, errcode, errmsg, description). O errmsg vai como NULL de propósito:
-- fixa o SQLSTATE P0001 sem comparar texto, o que tornaria o teste dependente
-- do round-trip de UTF-8 do runner. Verificado que a forma discrimina: com o
-- GUC presente a mesma chamada acusa "caught: no exception".
select set_config('request.jwt.claims', '', true);
select throws_ok(
    $$ select public.fn_dashboard_indicadores('2026-01') $$,
    'P0001',
    NULL::text,
    'Sem contexto de salao a funcao aborta em vez de devolver zero'
);

select * from finish();
rollback;
