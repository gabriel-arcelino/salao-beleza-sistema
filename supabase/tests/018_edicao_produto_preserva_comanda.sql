-- ============================================================================
-- Teste pgTAP: editar um produto nao reescreve o historico de comandas, e o
-- percentual novo vale para a comanda que ainda esta aberta.
--
-- Feature edicao-clientes-produtos, task 4.1. Cobre AC-010 e AC-011.
--
-- Cobre as DUAS faces da semantica de `percentual_comissao`, que so fazem sentido
-- juntas:
--
--   AC-010 - editar ANTES de fechar: o fechamento usa o percentual NOVO
--             (leitura ao vivo). Medido na fronteira em 2026-09-29, cenario A:
--             10 -> 25 antes de fechar rendeu comissao_valor_snapshot = 25.00.
--
--   AC-011 - editar DEPOIS de fechar: comissao_percentual_snapshot e
--             comissao_valor_snapshot permanecem. Medido no mesmo dia, cenario B:
--             fechou em 10.00 e continuou 10.00 depois de o produto ir a 40.
--             O mesmo criterio verifica `preco_unitario` e `total` de um item
--             de comanda ABERTA apos a edicao de `preco_venda`.
--
-- POR QUE AS DUAS ASSERCOES DE CONTROLE EXISTEM
-- O arquivo inteiro passa a serio se o UPDATE de `produtos` nao tivesse
-- acontecendo: as demais asercoes leem `comanda_itens`, que o UPDATE nao toca.
-- As duas primeiras asercoes provam que o produto MUDOU de verdade, e so depois
-- disso as demais passam a significar alguma coisa.
--
-- O QUE ESTE ARQUIVO NAO GUARDA
-- Ele prova que os valores gravados em `comanda_itens` nao sao reescritos. Nao
-- prova nada sobre a interface — essa parte tem prova em
-- tests/ui/edicao-cadastros.spec.tsx.
--
-- Depende do seed para salao (...0001), profissional (...0101) e servico
-- (...0201), assim como os demais testes pgTAP.
-- ============================================================================

begin;
select plan(9);

-- ---------------------------------------------------------------------------
-- Cenario 1: percentual alterado ANTES do fechamento de comanda ABERTA.
-- O fechamento deve usar o valor novo. (AC-010)
-- ---------------------------------------------------------------------------

-- Fixture de identidade: o role authenticated precisa de um ADMIN para ler os
-- itens apos a RPC (mesmo padrao de 002 e 009).
insert into usuarios (id, salon_id, auth_user_id, nome, perfil)
values (
  '18000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '18000000-0000-0000-0000-000000000002',
  'Admin Edicao Produto',
  'ADMIN'
);

-- Produto com percentual proprio. O preco de custo vem de 10 e a venda de 100,
-- para que o total do item seja facil de conferir.
insert into produtos (id, salon_id, nome, preco_custo, preco_venda, percentual_comissao,
                      estoque_atual, ativo)
values ('18000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001',
        'Produto Edicao 018', 10, 100, 10, 100, true);

set local role authenticated;

select set_config('request.jwt.claims',
  '{"sub": "18000000-0000-0000-0000-000000000002", "role": "authenticated", "app_metadata": {"salon_id": "00000000-0000-0000-0000-000000000001"}}', true);

-- Config com `comissao_sobre_produto = true` e 0%: e o que faz o percentual do
-- PRODUTO vencer o do profissional. Sem esta flag o percentual do produto nem
-- entra no calculo e o cenario nao testaria o que diz testar.
insert into config_comissoes (salon_id, profissional_id, servico_id, comissao_percentual,
                              base_calculo, rateio_taxa, comissao_sobre_produto, timing_repasse)
values ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000101',
        null, 0, 'BRUTO', 'SALAO', true, 'IMEDIATO');

insert into comandas (id, salon_id, uuid_cliente, status)
values ('18000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001',
        gen_random_uuid(), 'ABERTA');

insert into comanda_itens (id, salon_id, comanda_id, tipo, produto_id, descricao_snapshot,
                           quantidade, preco_unitario, total, profissional_id)
values ('18000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000001',
        '18000000-0000-0000-0000-000000000020', 'PRODUTO',
        '18000000-0000-0000-0000-000000000010', 'Produto Edicao 018',
        1, 100.00, 100.00, '00000000-0000-0000-0000-000000000101');

-- A EDICAO, antes de qualquer fechamento.
update produtos set percentual_comissao = 25
where id = '18000000-0000-0000-0000-000000000010';

select is(
  (select percentual_comissao from produtos where id = '18000000-0000-0000-0000-000000000010'),
  25.00::numeric,
  'CONTROLE: o percentual do produto foi de fato alterado antes do fechamento'
);

-- Fecha a comanda pela porta real da aplicacao.
select fn_fechar_comanda(
  '18000000-0000-0000-0000-000000000020'::uuid,
  '[{"metodo": "PIX", "valor_bruto": 100.00}]'::jsonb
);

-- 25% de 100.00 = 25.00. Se a implementacao CONGELASSE o percentual no momento
-- em que o item foi adicionado, daria 10.00 e esta asercao reprovaria.
select is(
  (select comissao_valor_snapshot from comanda_itens where id = '18000000-0000-0000-0000-000000000021'),
  25.00::numeric,
  'comanda aberta: o fechamento usou o percentual NOVO do produto (AC-010)'
);

select is(
  (select comissao_percentual_snapshot from comanda_itens where id = '18000000-0000-0000-0000-000000000021'),
  25.00::numeric,
  'comanda aberta: o percentual gravado no item e o novo'
);

-- ---------------------------------------------------------------------------
-- Cenario 2: percentual e preco de venda alterados DEPOIS do fechamento.
-- Nada do que foi apurado pode mudar. (AC-011)
-- ---------------------------------------------------------------------------

update produtos
set percentual_comissao = 40, preco_venda = 250, preco_custo = 50
where id = '18000000-0000-0000-0000-000000000010';

select is(
  (select percentual_comissao from produtos where id = '18000000-0000-0000-0000-000000000010'),
  40.00::numeric,
  'CONTROLE: o percentual foi de fato alterado depois do fechamento'
);

select is(
  (select comissao_valor_snapshot from comanda_itens where id = '18000000-0000-0000-0000-000000000021'),
  25.00::numeric,
  'comanda fechada: o valor de comissao apurado permanece (AC-011)'
);

select is(
  (select comissao_percentual_snapshot from comanda_itens where id = '18000000-0000-0000-0000-000000000021'),
  25.00::numeric,
  'comanda fechada: o percentual apurado permanece (AC-011)'
);

-- O preco unitario e o total do item tambem nao podem mudar: sao gravados no
-- momento em que o item entra na comanda, e nenhuma funcao do banco le
-- `produtos.preco_venda` no calculo.
select is(
  (select preco_unitario from comanda_itens where id = '18000000-0000-0000-0000-000000000021'),
  100.00::numeric,
  'preco_unitario do item permanece, mesmo com preco_venda alterado (AC-011)'
);

select is(
  (select total from comanda_itens where id = '18000000-0000-0000-0000-000000000021'),
  100.00::numeric,
  'total do item permanece, mesmo com preco_venda alterado (AC-011)'
);

-- A descricao tambem e snapshot do momento da adicao.
select is(
  (select descricao_snapshot from comanda_itens where id = '18000000-0000-0000-0000-000000000021'),
  'Produto Edicao 018',
  'descricao_snapshot do item permanece'
);

select * from finish();
rollback;
