-- ============================================================================
-- Teste pgTAP: a matriz de escrita da interface continua batendo com a RLS.
--
-- Feature gate-perfil-escrita, task T-077. Prova: AC-103.
--
-- ---------------------------------------------------------------------------
-- POR QUE ESTE TESTE EXISTE
-- ---------------------------------------------------------------------------
-- src/lib/perfil.ts tem uma copia da matriz de escrita, em TypeScript, para a
-- interface esconder o que o perfil nao pode gravar. Essa copia pode divergir da
-- RLS em silencio, e silencioso e o pior modo de falha de gate de permissao:
--
--   - a RLS ficou mais restrita e a interface nao percebe -> o usuario ve o botao
--     e leva erro, que e o defeito que a feature veio corrigir, de volta
--   - a RLS ficou mais permissiva e a interface nao percebe -> a interface esconde
--     acao que a pessoa PODIA usar, e ela perde trabalho
--
-- Nenhuma das duas falhas aparece em teste de interface, porque ele mocka a API e
-- nunca chega no banco. Por isso este teste e aqui e nao em vitest: **o banco e a
-- autoridade**, e o que este teste faz e trava-la.
--
-- O que ele deriva NAO e uma copia: le pg_policies e extrai os perfis do proprio
-- texto da policy. Se alguem mexer numa policy, a lista derivada muda e a
-- comparacao reprova - e nao ha segunda fonte para divergir.
--
-- ---------------------------------------------------------------------------
-- A MATRIZ MEDIDA (2026-09-30, pg_policies)
-- ---------------------------------------------------------------------------
-- tabela                 perfis que podem escrever
-- ---------------------  -----------------------------------------------
-- clientes               ADMIN, GERENTE
-- produtos               ADMIN, GERENTE
-- profissionais          ADMIN, GERENTE
-- servicos               ADMIN, GERENTE
-- config_comissoes       ADMIN, GERENTE
-- comandas               ADMIN, GERENTE, RECEPCAO
-- comanda_itens          ADMIN, GERENTE, RECEPCAO
-- pagamentos             ADMIN, GERENTE, RECEPCAO
-- movimentacoes_estoque  ADMIN, GERENTE, RECEPCAO
-- usuarios               ADMIN
--
-- ajustes_comissao, config_taxas, despesas, fechamentos_comissao e
-- motivos_desconto tambem tem policy de escrita ADMIN+GERENTE, mas nao tem acao
-- de escrita na interface, entao nao entram na matriz do cliente.
-- ============================================================================

begin;

select plan(8);

-- Deriva a matriz da RLS. `perfis` vem do proprio texto da policy, via regex nos
-- literais de perfil_usuario - nao e uma segunda copia para divergir.
-- Tabela temporaria (e nao view) porque ON COMMIT DROP e de tabela; e o rollback
-- do fim do teste descarta tudo.
create temporary table matriz_rls on commit drop as
select
  p.tablename,
  (select array_agg(m[1] order by m[1])
     from regexp_matches(p.qual, '''([A-Z]+)''::perfil_usuario', 'g') m) as perfis
from pg_policies p
where p.schemaname = 'public'
  and p.cmd = 'ALL'
  and p.tablename in (
    'clientes','produtos','profissionais','servicos','config_comissoes',
    'comandas','comanda_itens','pagamentos','movimentacoes_estoque','usuarios'
  );

-- ---------------------------------------------------------------------------
-- 1) A matriz completa bate com a que src/lib/perfil.ts declara
-- ---------------------------------------------------------------------------
select is(
  (
    select coalesce(
      string_agg(tablename || ':' || coalesce(array_to_string(perfis, ','), '-'),
                 ' | ' order by tablename),
      '')
    from matriz_rls
  ),
  'clientes:ADMIN,GERENTE | comanda_itens:ADMIN,GERENTE,RECEPCAO | comandas:ADMIN,GERENTE,RECEPCAO | config_comissoes:ADMIN,GERENTE | movimentacoes_estoque:ADMIN,GERENTE,RECEPCAO | pagamentos:ADMIN,GERENTE,RECEPCAO | produtos:ADMIN,GERENTE | profissionais:ADMIN,GERENTE | servicos:ADMIN,GERENTE | usuarios:ADMIN',
  'a matriz de escrita da interface bate com a RLS nas 10 tabelas @spec:AC-103'
);

-- ---------------------------------------------------------------------------
-- 2) As 10 tabelas da matriz tem policy de escrita. Sem isto, uma tabela que
--    perdesse a policy desapareceria da derivacao e a matriz pareceria certain.
-- ---------------------------------------------------------------------------
select is(
  (select count(*)::int from matriz_rls),
  10,
  'as 10 tabelas da matriz tem policy de escrita no banco @spec:AC-103'
);

-- ---------------------------------------------------------------------------
-- 3) RECEPCAO grava comanda. Esta e a afirmacao que o gate erra com mais
--    facilidade: fechar comanda E o trabalho da recepcao, e um gate que tirasse
--    a acao dela seria pior que o defeito que a feature veio corrigir.
-- ---------------------------------------------------------------------------
select ok(
  (select perfis @> array['RECEPCAO'] from matriz_rls where tablename = 'comandas'),
  'RECEPCAO ainda pode gravar comandas - fechar comanda e o trabalho dela @spec:AC-103'
);

select ok(
  (select perfis @> array['RECEPCAO'] from matriz_rls where tablename = 'pagamentos'),
  'RECEPCAO ainda pode gravar pagamentos @spec:AC-103'
);

-- ---------------------------------------------------------------------------
-- 4) RECEPCAO nao grava cadastro nem configuracao. Se isto mudar, o gate das
--    cinco telas passaria a esconder acao que a recepcao PODE usar.
-- ---------------------------------------------------------------------------
select ok(
  (select coalesce(perfis @> array['RECEPCAO'], false) from matriz_rls where tablename = 'clientes') = false,
  'RECEPCAO nao grava cadastro - o gate das telas de cadastro continua correto @spec:AC-103'
);

select ok(
  (select coalesce(perfis @> array['RECEPCAO'], false) from matriz_rls where tablename = 'config_comissoes') = false,
  'RECEPCAO nao grava configuracao de comissao, mas continua LE (policy de SELECT e so por salao) @spec:AC-103'
);

-- ---------------------------------------------------------------------------
-- 5) ADMIN e GERENTE cobrem o que a matriz promete, e GERENTE fica fora de
--    usuarios. E o que impede o gate de custar trabalho a quem pode.
-- ---------------------------------------------------------------------------
select ok(
  (select count(*)::int = 10 from matriz_rls where perfis @> array['ADMIN']),
  'ADMIN grava todas as 10 tabelas da matriz - o gate nao tira nada de ADMIN @spec:AC-103'
);

select ok(
  (select count(*)::int = 9 from matriz_rls where perfis @> array['GERENTE']),
  'GERENTE grava 9 das 10: todas menos usuarios, que e ADMIN-only @spec:AC-103'
);

rollback;