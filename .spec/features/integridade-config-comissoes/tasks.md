# Tasks: Integridade da configuração de comissões

> feature: integridade-config-comissoes

<!--
  Como ler este arquivo (o formato é verificado por `onp-spec audit`):
  - T-xxx = tarefa (código de rastreio, único no projeto inteiro).
  - Toda tarefa referencia em `Refs:` pelo menos uma história de usuário
    (US-xxx) ou critério de aceite (AC-xxx).
  - Toda tarefa lista os arquivos que cria/altera em `Arquivos:` — capriche:
    é o que decide o que `onp-spec plano` roda em PARALELO (arquivos
    disjuntos) e o que roda em sequência.
  - Campos opcionais por tarefa, usados pelo plano de execução:
    `- Modelo: claude-sonnet-5` e `- Esforço: alto` (baixo|medio|alto|xalto|max).
  - Uma tarefa só pode virar [concluida] quando os critérios de aceite dela
    tiverem prova PASS registrada por `onp-spec verify`.
  Status: pendente | em-andamento | concluida
    (atalho: `onp-spec tarefa <feature> <T-xxx> <status>`)
-->

## T-044 — Migration 0015: índice único parcial de nível profissional [concluida]
- Refs: US-024, US-025, AC-063, AC-064
- Arquivos: supabase/migrations/0015_config_comissoes_uniq_profissional.sql
- Esforço: baixo
- Notas: criar `supabase/migrations/0015_config_comissoes_uniq_profissional.sql`
  com **um** índice:
  `CREATE UNIQUE INDEX config_comissoes_prof_nivel_uniq ON public.config_comissoes (salon_id, profissional_id) WHERE servico_id IS NULL;`
  A cláusula `WHERE servico_id IS NULL` é **obrigatória** e é o que T-046
  verifica: sem ela, toda configuração de nível serviço do mesmo profissional
  passa a ser indevidamente proibida. Não usar `CONCURRENTLY` — as migrations
  rodam dentro de transação e `CREATE INDEX CONCURRENTLY` falha nela. Não
  remover nem alterar o `unique (salon_id, profissional_id, servico_id)` de
  `0001:141`, que continua protegendo o nível serviço. Medido em 2026-09-29:
  `config_comissoes` tem 0 linhas, então a criação não falha por duplicata
  existente. Registrar no cabeçalho da migration que a criação falha se já
  houver duplicata de nível profissional em ambiente com dado (Q-024).

## T-045 — Prova pgTAP de AC-063: segunda configuração profissional é rejeitada [concluida]
- Refs: US-024, AC-063
- Arquivos: supabase/tests/016_config_comissoes_uniq_profissional.sql
- Esforço: baixo
- Notas: criar `supabase/tests/016_config_comissoes_uniq_profissional.sql` com
  `begin` / `select plan(N)` / `rollback`, no padrão dos demais pgTAP. Inserir
  uma configuração de nível profissional para o profissional `…0101` e então
  tentar inserir uma segunda, também de nível profissional, para o mesmo
  `(salon_id, profissional_id)`. Asserção 1: `throws_ok` com
  `errcode => '23505'`, cujo **título** carrega `@spec:AC-063` — é o título que
  `onp-spec verify` lê; tag em comentário não produz prova. Asserção 2: contagem
  de linhas de nível profissional para aquele profissional é exatamente 1,
  título com `@spec:AC-063`, provando que a rejeição não bastou sozinha se a
  segunda linha tivesse entrado. Este é o **único** teste da feature que cobre a
  invariante de unicidade; `011` e `012` não a cobrem (ver T-048). Não alterar
  o valor esperado para fazer o teste passar: a rejeição vem do índice criado em
  T-044, e se o teste reprovar isso é achado de defeito.

## T-046 — Prova pgTAP de AC-064: nível profissional e nível serviço coexistem [concluida]
- Refs: US-025, AC-064
- Arquivos: supabase/tests/016_config_comissoes_uniq_profissional.sql
- Esforço: baixo
- Notas: **no mesmo arquivo de T-045**, porque a mutação que este AC precisa
  detectar (remover a cláusula `WHERE` do índice) só é visível se o mesmo
  profissional tiver as duas linhas. Reusar o profissional `…0101` e o salão
  `…0001`; inserir uma configuração de nível profissional (`servico_id` nulo) e
  uma de nível serviço (`servico_id = '…0201'`, o serviço do seed), e asserir que
  ambas coexistem. O **título** da asserção carrega `@spec:AC-064`. Aumentar
  `plan(N)` conforme o número final de asserções. Se este AC reprovar depois de
  T-044, a causa provável é a cláusula `WHERE` ausente ou incorreta no índice —
  verificar `0015_config_comissoes_uniq_profissional.sql` antes de tocar no
  teste.

## T-047 — Traduzir violação `23505` em erro de domínio, com prova Vitest [concluida]
- Refs: US-026, AC-065
- Arquivos: src/lib/api/config_comissoes.ts, tests/api/config_comissoes.spec.ts
- Esforço: medio
- Notas: em `src/lib/api/config_comissoes.ts`, dentro de `createConfigComissao`
  (hoje `.insert()` puro em `:35-39`), tratar o retorno `error` quando
  `error.code === '23505'` lançando erro de domínio **por nível**, com o nível
  lido de `input.servico_id`, que já está em mãos em `:16`: nulo significa padrão
  do profissional, preenchido significa override do serviço. A mensagem **não**
  pode conter o código `23505` nem o nome de constraint. Qualquer outro `error.code`
  continua propagando como hoje, sem mudança de comportamento. Não alterar
  `ConfigComissoesPage.tsx`: o fluxo de exibição de erro já existe
  (`setErro` em `:71-73`, `ErrorMessage` em `:207`); muda o conteúdo da mensagem,
  não o caminho. Criar `tests/api/config_comissoes.spec.ts` com o cliente Supabase
  mockado devolvendo `{ code: '23505' }`. São **quatro** asserts tagueados
  `@spec:AC-065`, todos por **igualdade de mensagem**, nunca por substring:

  1. a mensagem de domínio do nível profissional e a do nível serviço são
     **diferentes entre si**;
  2. a do nível profissional é **diferente** da mensagem técnica real devolvida pelo
     banco nesse caso;
  3. a do nível serviço é **diferente** da mensagem técnica real devolvida pelo banco
     nesse caso;
  4. **nenhuma das duas** — a de nível profissional e a de nível serviço, ambas
     obrigatórias — contém nome de constraint nem o código `23505`.

  **Não** provar tradução com `contains('profissional')` nem `contains('servico')`.
  Medido: a mensagem técnica do nível serviço é
  `duplicate key value violates unique constraint "config_comissoes_salon_id_profissional_id_servico_id_key"`,
  que contém `profissional` **e** `servico`. Uma prova por substring passaria com o erro
  não traduzido. E `contains('23505')` seria tautologia: `23505` vive em `error.code`,
  nunca em `error.message`, então a mensagem crua também não o contém. A prova separa
  os casos por igualdade, não por grafia, acento ou token.

  As duas mensagens técnicas a comparar são as **medidas** em 2026-09-29, uma por
  cenário, e a distinção de caso não pode ser perdida: a de nível profissional vem de
  `config_comissoes_prof_nivel_uniq`, a de nível serviço de
  `config_comissoes_salon_id_profissional_id_servico_id_key`. Nenhum dos seis testes
  Vitest existentes exercita esta API — os que renderizam `ConfigComissoesPage` apenas a
  mockam, e sem `@spec:`.
  **O papel deste teste é a tradução feita pelo código da aplicação, não o
  comportamento do PostgREST.** A forma do erro foi observada por medição real em
  2026-09-29, através da mesma fronteira que a aplicação usa (`createClient` +
  `.insert().select().single()`), com a violação de unicidade provocada em
  `config_comissoes`. O objeto de erro chegou ao cliente com as quatro chaves
  `code`, `details`, `hint` e `message`: `code` valeu `'23505'`, e `details` e
  `hint` vieram como `null` no corpo HTTP e como `""` no objeto do cliente. Disso
  resultam três restrições para a tradução: ancorar em `error.code === '23505'`;
  não usar `details` nem `hint`, que chegam vazios; e não usar o texto de
  `message` como discriminante da regra, porque é texto técnico que varia por
  versão e locale. A mesma medição mostrou que `message` carrega hoje o nome da
  constraint e que `ConfigComissoesPage.tsx:72` faz `setErro((e as Error).message)`,
  ou seja, sem a tradução o usuário leria esse texto técnico na tela.

  **Limitações que esta tarefa não fecha.** A medição foi feita contra a
  constraint de três colunas; o comportamento específico do índice parcial de
  T-044 ainda não foi medido, porque o índice não existe. ASM-038/C — "traduzir
  basta" — continua sem prova, por ser afirmação de projeto. E o caminho real de
  login do GoTrue não foi medido: a verificação foi feita na fronteira abaixo
  dele. O registro durável da medição também ainda não existe; isto fica anotado
  para que ninguém trate o teste desta tarefa como substituto da medição de
  fronteira.

## T-048 — Alinhar as fixtures de `011` e `012` à invariante [concluida]
- Refs: US-024
- Arquivos: supabase/tests/011_fn_fechar_competencia_comissao.sql, supabase/tests/012_fn_calcular_cmv.sql
- Esforço: baixo
- Notas: os dois arquivos recebem tratamentos **diferentes**, porque exercitam
  domínios diferentes. Em `012:30-32`, **remover** o `insert into config_comissoes`:
  `fn_calcular_cmv` (`0011`) calcula `preco_custo * quantidade` sobre movimentações
  de venda e não lê nada de comissão — grep de `config_comissoes` e
  `comissao_percentual` em `0011` retorna zero. A linha é de outro domínio e ainda
  diverge de `011` em `comissao_sobre_produto` (`:31` tem `true`, `011:27-29` tem
  `false`), ou seja, nem é cópia fiel. Nenhuma das 5 asserções de `012` depende
  dela. Em `011:27-29`, **manter** a linha como procedência — `0010` lê
  `comanda_itens.comissao_valor_snapshot` e o teste escreve esse valor direto
  (`:44-45`, `40.00`), que é o mesmo valor de
  `profissionais.comissao_percentual_padrao` (`:14-16`) —, substituir o
  `on conflict (salon_id, profissional_id, servico_id) do nothing` por limpeza
  estreita e explícita antes do insert:
  `delete from config_comissoes where salon_id = '…' and profissional_id = '…' and servico_id is null;`
  O `and servico_id is null` é **obrigatório**: um delete só por
  `(salon_id, profissional_id)` apagaria overrides de serviço legítimos do mesmo
  profissional. Comentar a linha dizendo que é procedência do snapshot e não
  entrada da função. Não usar `on conflict do nothing` sem alvo: ele resolve o
  erro mas esconde se o fixture entrou ou colidiu. Esta tarefa é
  **independente de T-044** — pode rodar em qualquer ordem. Registrar no
  cabeçalho de ambos que `011` e `012` **não cobrem unicidade**; cobrem isolamento
  de fixture. O único teste da invariante é o de AC-063.

## T-049 — Defesa determinística em `fn_fechar_comanda`, sem AC [concluida]
- Refs: US-024
- Arquivos: supabase/migrations/0004_fn_fechar_comanda.sql
- Esforço: baixo
- Notas: **esta tarefa não tem AC e não deve receber um.** Acrescentar `limit 1` e
  um `order by` determinístico às duas consultas de resolução de configuração em
  `0004_fn_fechar_comanda.sql` — a de rateio de taxa (`:166-175`) e a de
  percentual, base e gate de produto (`:207-219`). Ambas usam `select … into` sem
  ordenação, e com duplicata o `left join` multiplica e o `into` toma linha
  arbitrária. A defesa protege contra corrupção ou dado legado anterior ao índice
  de T-044. O `order by` precisa ser uma ordem que não altere o resultado no caso
  não duplicado (por exemplo, `created_at`), sob pena de mudar o comportamento
  de `fn_fechar_comanda` e violar o "fora de escopo" da spec.

## T-050 — Corrigir as referências que citam a feature como bloqueada [concluida]
- Refs: US-024, AC-063
- Arquivos: .spec/features/gate-comissao-produto/spec.md
- Esforço: baixo
- Notas: `gate-comissao-produto/spec.md:33-34` e `:76-77` afirmam que esta
  feature de integridade "exige três decisões de produto" e está "bloqueada em
  três decisões". As três foram resolvidas (Q-022, Q-023, e a ordem deixou de ser
  bloqueio) e a afirmação ficará incorreta. Atualizar para apontar esta feature
  como o local onde as três foram decididas, com as decisões resumidas. **Não
  alterar** `status: implementada`, AC-046, T-027, a tabela de gates nem o
  mutation check de `gate-comissao-produto` — a feature está encerrada e correta;
  corrige-se apenas a referência cruzada que envelheceu. Motivo de existir nesta
  feature e não noutra: a afirmação envelhece porque esta feature a resolve, então
  o ajuste pertence a quem a resolve.

## T-051 — Mutation check planejado e execução dos gates [concluida]
- Refs: US-024, US-025, US-026, AC-063, AC-064, AC-065
- Arquivos: .spec/features/integridade-config-comissoes/spec.md
- Esforço: medio
- Notas: executar o mutation check de 1:1 declarado na seção "Mutation check
  planejado" da spec, e registrar o TAP de cada mutação na seção "Força da
  prova" da spec, no formato de `gate-comissao-produto/spec.md:134-150`:
  (a) remover o índice parcial de T-044 deve reprovar **AC-063**; (b) remover a
  cláusula `where servico_id is null` desse índice deve reprovar **AC-064**;
  (c) remover a tradução de `23505` de T-047 deve reprovar **AC-065**. Se
  alguma mutação não destruir o AC correspondente, o AC é mais fraco do que
  declara e precisa ser reescrito — registrar isso, não ajustar o teste. Mutation
  Check é experimental e não é gate. Depois, preencher a tabela "Estado dos
  gates" da spec, que está como pendente. `G4` e `G5` só são N/A se a
  justificativa for escrita: AC-065 altera mensagem visível ao usuário, então
  `G5` QA visual não é automaticamente N/A.
