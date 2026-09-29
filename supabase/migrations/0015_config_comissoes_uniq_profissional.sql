-- ============================================================================
-- Migration 0015: indice unico parcial do nivel profissional de comissoes
--
-- Gap: a constraint de `0001_initial_schema.sql:141`,
--   unique (salon_id, profissional_id, servico_id),
-- nao protege o nivel profissional. Em indice unico do PostgreSQL, NULL e
-- distinto de NULL, e o nivel profissional e exatamente o caso em que
-- `servico_id` IS NULL. Duas configuracoes de nivel profissional para o mesmo
-- profissional sao aceitas, e o resultado disso e que
-- `fn_fechar_comanda` resolve a configuracao sem ordem definida
-- (`0004_fn_fechar_comanda.sql:166-175` e `:207-219`, `select ... into` sem
-- LIMIT nem ORDER BY), congelando um valor de comissao arbitrario em
-- `comanda_itens.comissao_valor_snapshot`.
--
-- Origem da regra:
--   plano-arquitetura-salao-beleza-v2_4.md:679  ("Constraint: UNIQUE (salon_id,
--     profissional_id, servico_id)")
--   plano-arquitetura-salao-beleza-v2_4.md:681  (a cadeia de resolucao "buscar
--     override especifico; se nao existir, usar o do profissional" so tem
--     sentido se cada nivel tiver no maximo uma linha)
--
-- ATENCAO - Q-024: a criacao deste indice FALHA se ja existir duplicata de
-- nivel profissional em ambiente com dado, porque `CREATE UNIQUE INDEX`
-- valida as linhas existentes. Em 2026-09-29 a tabela local media 0 linhas e a
-- criacao passou. Em ambiente com dado, rode antes a deteccao:
--   select profissional_id, count(*) from public.config_comissoes
--    where servico_id is null group by profissional_id having count(*) > 1;
-- Nao ha passo de correcao automatica, porque decidir qual das linhas
-- conflitantes sobrevive e decisao de produto.
--
-- Prova: AC-063 e AC-064 (feature integridade-config-comissoes).
-- ============================================================================

create unique index config_comissoes_prof_nivel_uniq
  on public.config_comissoes (salon_id, profissional_id)
  where servico_id is null;
