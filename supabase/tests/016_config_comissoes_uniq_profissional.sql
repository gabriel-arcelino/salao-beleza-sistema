-- ============================================================================
-- Teste pgTAP: unicidade da configuracao de nivel profissional em
-- config_comissoes, e coexistencia com o nivel servico.
--
-- Cobre AC-063 e AC-064 (feature integridade-config-comissoes).
--
-- Por que o mesmo profissional nos dois cenarios: a mutacao que AC-064
-- precisa detectar e a remocao da clausula `WHERE servico_id IS NULL`
-- do indice `config_comissoes_prof_nivel_uniq`. Essa remocao so fica
-- visivel se o mesmo profissional tiver as DUAS configuracoes ao mesmo
-- tempo -- com uma unica linha de nivel profissional, um unique em
-- (salon_id, profissional_id) sem WHERE nao produziria erro nenhum.
--
-- Origem da regra:
--   plano-arquitetura-salao-beleza-v2_4.md:679  ("Constraint: UNIQUE
--     (salon_id, profissional_id, servico_id)")
--   plano-arquitetura-salao-beleza-v2_4.md:681  (a cadeia de resolucao
--     "buscar override especifico; se nao existir, usar o do
--     profissional" so tem sentido se cada nivel tiver no maximo uma
--     linha, e o segundo passo so e alcancavel se os dois coexistirem)
--
-- Implementacao: 0015_config_comissoes_uniq_profissional.sql
--   create unique index config_comissoes_prof_nivel_uniq
--     on public.config_comissoes (salon_id, profissional_id)
--     where servico_id is null;
--
-- Depende do seed para salao (...0001), profissional (...0101) e
-- servico (...0201), assim como os demais testes pgTAP.
--
-- A limpeza inicial e estreita de proposito: sem ela o teste passaria a
-- depender de config_comissoes estar vazia no ambiente, pre-condicao que
-- nada garante. E a mesma razao pela qual T-048 exige limpeza estreita
-- em 011 e 012. O escopo e (salon_id, profissional_id) mais o nivel, o
-- que impede que overrides de servico legítimos sejam apagados.
-- ============================================================================

begin;
select plan(4);

-- Estado inicial conhecido. Nao apaga overrides de servico: o filtro de
-- nivel profissional e o do servico do teste sao explicitos e separados.
delete from config_comissoes
where salon_id = '00000000-0000-0000-0000-000000000001'
  and profissional_id = '00000000-0000-0000-0000-000000000101'
  and servico_id is null;

delete from config_comissoes
where salon_id = '00000000-0000-0000-0000-000000000001'
  and profissional_id = '00000000-0000-0000-0000-000000000101'
  and servico_id = '00000000-0000-0000-0000-000000000201';

-- ---------------------------------------------------------------------------
-- AC-063: a segunda configuracao de nivel profissional e rejeitada.
-- ---------------------------------------------------------------------------

insert into config_comissoes (
  salon_id, profissional_id, servico_id, comissao_percentual,
  base_calculo, rateio_taxa, comissao_sobre_produto, timing_repasse
)
values (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000101',
  null, 40, 'BRUTO', 'SALAO', false, 'IMEDIATO'
);

-- Terceira argumento NULL: o pgTAP passa a conferir apenas o SQLSTATE,
-- sem casar a mensagem, que e texto tecnico do Postgres e varia por
-- versao e locale. O codigo e o que o cliente recebe em error.code.
select throws_ok(
  $$
    insert into config_comissoes (
      salon_id, profissional_id, servico_id, comissao_percentual,
      base_calculo, rateio_taxa, comissao_sobre_produto, timing_repasse
    )
    values (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000101',
      null, 55, 'BRUTO', 'SALAO', false, 'IMEDIATO'
    )
  $$,
  '23505',
  null,
  'Segunda configuracao de nivel profissional rejeitada por violacao de unicidade @spec:AC-063'
);

-- A rejeicao precisa ter efeito observavel: a segunda linha nao pode ter
-- entrado. Sem esta assercao, um throws_ok que falhasse por outro motivo
-- ainda poderia ser lido como "unicidade garantida".
select is(
  (
    select count(*)::int
    from config_comissoes
    where salon_id = '00000000-0000-0000-0000-000000000001'
      and profissional_id = '00000000-0000-0000-0000-000000000101'
      and servico_id is null
  ),
  1,
  'Permanece exatamente uma configuracao de nivel profissional @spec:AC-063'
);

-- ---------------------------------------------------------------------------
-- AC-064: o nivel servico convive com o nivel profissional. Este e o AC
-- que quebra se a clausula WHERE for removida do indice.
-- ---------------------------------------------------------------------------

insert into config_comissoes (
  salon_id, profissional_id, servico_id, comissao_percentual,
  base_calculo, rateio_taxa, comissao_sobre_produto, timing_repasse
)
values (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000201', 55, 'BRUTO', 'SALAO', false, 'IMEDIATO'
);

select is(
  (
    select count(*)::int
    from config_comissoes
    where salon_id = '00000000-0000-0000-0000-000000000001'
      and profissional_id = '00000000-0000-0000-0000-000000000101'
      and servico_id = '00000000-0000-0000-0000-000000000201'
  ),
  1,
  'Configuracao de nivel servico convive com a de nivel profissional @spec:AC-064'
);

select is(
  (
    select count(*)::int
    from config_comissoes
    where salon_id = '00000000-0000-0000-0000-000000000001'
      and profissional_id = '00000000-0000-0000-0000-000000000101'
  ),
  2,
  'As duas configuracoes coexistem para o mesmo profissional @spec:AC-064'
);

select * from finish();
rollback;
