# Spec: Integridade da configuração de comissões

> feature: integridade-config-comissoes
> status: rascunho

## Contexto

`public.config_comissoes` guarda a configuração de comissão por profissional, com
`servico_id` opcional: nulo significa "vale para qualquer serviço" (nível
profissional), preenchido significa "vale para este serviço" (nível serviço). A
tabela é declarada em `supabase/migrations/0001_initial_schema.sql:128-142`, e o
plano fixa a restrição em `plano-arquitetura-salao-beleza-v2_4.md:679-681`:

> Constraint: `UNIQUE (salon_id, profissional_id, servico_id)`.

O problema: em índice único do PostgreSQL, `NULL` é considerado distinto de
`NULL`. A restrição acima, portanto, **não protege o nível profissional**, que é
exatamente o nível onde `servico_id` é nulo. Duas configurações de nível
profissional para o mesmo `(salon_id, profissional_id)` são aceitas, e a segunda
salvamento pela tela produz as duas.

Isso já foi observado. Em 2026-09-26 havia duas linhas de nível profissional para o
mesmo profissional, uma com `comissao_sobre_produto = false` e outra com `true`.
Ao fechar uma comenda, `fn_fechar_comanda` resolve a configuração com
`select … into` em `0004:207-219` e `:166-175`, **sem `LIMIT`, sem `ORDER BY` e
sem `DISTINCT ON`**. Com duas linhas, o `LEFT JOIN` multiplica e o `select … into`
toma uma arbitrariamente. O registro daquela sessão: a linha `false` foi escolhida,
a comissão saiu 0.00, e o teste `005_fn_fechar_comanda_produto_estoque.sql:51`
("Percentual próprio do produto (15%) prevalece sobre o default do profissional
(40%)") reprovou no G7.

Ou seja: a configuração duplicada **não é só um registro a mais**. Ela torna o
cálculo de comissão não determinístico, e o resultado é congelado em
`comanda_itens.comissao_valor_snapshot` no fechamento.

### A invariante não é protegida em três camadas

| Camada | Estado medido |
|---|---|
| Schema | UNIQUE de três colunas com `servico_id` anulável; **nenhum índice parcial** em nenhuma das 15 migrations. `pg_indexes` confirma apenas `config_comissoes_pkey` e `config_comissoes_salon_id_profissional_id_servico_id_key`. |
| RPC | `0004:166-175` e `:207-219` não detectam cardinalidade nem ordenam o resultado. |
| Fixtures | `011:29` e `012:32` usam `on conflict (salon_id, profissional_id, servico_id) do nothing`, que **nunca dispara** no nível profissional porque `NULL` não gera conflito. |

### Estado atual no banco local

Medido em 2026-09-29: `config_comissoes` tem **0 linhas** (0 de nível profissional,
0 de nível serviço), sem duplicatas. A tabela está vazia porque o `db reset` do
stack novo limpou, e o `seed.sql` não a popula. O defeito é **latente e
reproduzível**, não um incidente ativo com dados corrompidos em produção. Isso
enquadra a feature como prevenção, não como correção de dado.

### Evidência que não cobre a invariante

Vale registrar por que a prova existente não serve, porque é o padrão que motivou
esta feature:

- `014_fn_fechar_comanda_gate_comissao_produto.sql` prova (AC-046, PASS) que o
  gate desligado zera a comissão de produto. A asserção usa **uma única** linha de
  configuração, e o item de teste não tem `servico_id`, de modo que o ramo
  `cc_esp` de `0004:213-215` nunca casa. Se existissem duas linhas de nível
  profissional, uma `false` e outra `true`, a mesma chamada devolveria 0.00 ou
  7.50 conforme o planejador. **AC-046 é verdadeiro e insuficiente**: prova o
  comportamento dado um estado que o sistema não garante.
- `005:51` é o teste que efetivamente demonstrou controlar essa ambiguidade, e
  está entre os arquivos pgTAP **sem tag `@spec:`**, invisíveis a `audit --ci`.

Nenhum teste pgTAP afirma unicidade de `config_comissoes`, e nenhum dos 7 arquivos
que tocam a tabela faz `select` sobre ela: são sempre `insert` (mais um `update`
em `004:45`). A invariante de unicidade não tem prova.

## Decisões desta feature

O contrato é:

> **Configuração duplicada é rejeitada. A API traduz a violação. Atualização e
> exclusão pertencem a outra feature.**

A feature `gate-comissao-produto` registrava esta feature de integridade como
"bloqueada em três decisões de produto" (`gate-comissao-produto/spec.md:33-34` e
`:76-77`). As três foram resolvidas, e nenhuma bloqueia mais a escrita:

1. **Segundo salvamento: `upsert`.** Resolvido como **fora de escopo**, por
   motivo mecânico, não de preferência. Medido: `on conflict (salon_id,
   profissional_id, servico_id) do update` **falha** com `duplicate key value
   violates unique constraint` sobre o índice parcial; apenas
   `on conflict (salon_id, profissional_id) where servico_id is null do update`
   funciona. O parâmetro `on_conflict` do PostgREST aceita somente nomes de
   coluna e gera `ON CONFLICT (cols)`, sem predicado. Logo `upsert` no nível
   profissional **não é expressável pelo caminho de dados atual**: exigiria RPC
   própria, com nova migration, nova função, novo grant e nova função de API.
2. **Criar `delete`.** Resolvido como **fora de escopo**. Não existe tela nem uso
   de exclusão hoje; a ausência é lacuna possível, não obrigação. Corrigir
   configuração errada pertence a feature de ciclo de vida própria.
3. **Ordem entre índice e escrita.** Resolvida: índice e fixtures são **trilhos
   independentes**. Com limpeza explícita e estreita nos fixtures, eles não
   dependem um do outro. Ver "Estratégia de testes".

Além disso, e por decisão desta feature:

4. **A RPC ganha defesa, não AC.** `LIMIT 1` e `ORDER BY` em `0004:166-175` e
   `:207-219` protegem contra corrupção ou dado legado anterior ao índice. Não há
   AC para isso, e a ausência é deliberada: depois do índice o estado duplicado
   fica inalcançável pela interface normal, e um AC que exigisse determinismo
   nesse estado testaria uma condição que o sistema passou a proibir. Seria a
   mesma classe de prova insuficiente de AC-046.
5. **A violação vira erro de domínio, não erro cru.** O `.insert()` continua sendo
   criação; a constraint é a garantia de integridade; a API traduz `23505` em
   mensagem compreensível.

## Histórias

### US-024 - O responsável pelo salão não consegue criar duas configurações conflitantes para o mesmo profissional

Como responsável pelo salão, quero que uma segunda configuração de nível
profissional para o mesmo profissional seja recusada no momento da gravação, para
que eu nunca veja um valor de comissão apurado que eu não defini.

#### AC-063 - Uma segunda configuração de nível profissional é rejeitada

- **Dado** um profissional com uma configuração de nível profissional já gravada
  (`servico_id` nulo, `comissao_percentual = 40`)
- **Quando** é gravada uma segunda configuração de nível profissional para o mesmo
  `(salon_id, profissional_id)`, também com `servico_id` nulo
- **Então** a gravação é rejeitada por violação de unicidade, e a tabela passa a
  conter exatamente uma linha de nível profissional para aquele profissional

### US-025 - A rejeição não impede as configurações legítimas

Como responsável pelo salão, quero que o nível profissional e o nível serviço
coexistam para o mesmo profissional, para que eu pueda ter um percentual padrão e
um override por serviço ao mesmo tempo.

#### AC-064 - Nível profissional e nível serviço coexistem para o mesmo profissional

- **Dado** um profissional sem nenhuma configuração
- **Quando** são gravadas, para o mesmo `(salon_id, profissional_id)`, uma
  configuração de nível profissional (`servico_id` nulo) e uma de nível serviço
  (`servico_id` preenchido)
- **Então** as duas gravações são aceitas e as duas linhas coexistem

Esse critério protege contra a forma mais provável de erro na implementação: criar
o índice único em `(salon_id, profissional_id)` **sem** a cláusula `WHERE
servico_id IS NULL`, o que proibiria indevidamente toda configuração de nível
serviço.

### US-026 - O responsável entende por que a gravação falhou

Como responsável pelo salão, quero ver uma mensagem que diga o que aconteceu, para
que eu não receba um erro técnico e fique sem saber o que corrigir.

#### AC-065 - A violação de unicidade é traduzida em erro de domínio, nomeando o nível

O `23505` chega hoje de **duas** constraints distintas: `config_comissoes_prof_nivel_uniq`,
criada em T-044, para duplicata de nível profissional; e
`config_comissoes_salon_id_profissional_id_servico_id_key`, preexistente, para duplicata de
nível serviço. As duas foram medidas em 2026-09-29 pela fronteira PostgREST, e as duas
entregam `code = '23505'`, com `details` e `hint` vazios, diferindo apenas no texto de
`message`. Como a mensagem do banco não pode ser usada como discriminante, o nível vem do
payload, que a API já tem em mãos em `config_comissoes.ts:16`.

- **Dado** um profissional que já possui uma configuração no nível `N`
- **Quando** a API de criação tenta gravar uma segunda configuração no mesmo nível `N`
  e o banco rejeita por violação de unicidade
- **Então** a API lança um `Error` comum, sem classe nova, cujo `.message` distingue
  o nível: a do padrão do profissional quando `servico_id` é nulo, a do override do
  serviço quando preenchido. As duas mensagens são entre si diferentes, nenhuma delas
  é igual à mensagem técnica devolvida pelo banco no respectivo caso, e nenhuma contém
  nome de constraint nem o código `23505`

Os dois valores de `N` são cenários obrigatórios da prova: a mensagem por nível só é
verificada se ambos forem exercitados. E a cláusula de não-exposição é exigível
mecanicamente — asserção negativa sobre o texto da mensagem — ao contrário de "não expor",
que um teste que verifica apenas que a API lançou um erro não distinguiria.

## Evidência/origem do requisito

| Requisito | Origem no código | Origem no plano |
|---|---|---|
| Restrição de unicidade | `0001_initial_schema.sql:141` (`unique (salon_id, profissional_id, servico_id)`) | `v2_4:679-681` |
| Nível profissional definido por `servico_id` nulo | `0001:132` (comentário `-- NULL = aplica a qualquer serviço`) | `v2_4:668` |
| Precedência serviço > profissional > padrão do salão | `0004:207-219` (`coalesce(cc_esp…, cc_prof…, padrao)`) | `v2_4:679-681` |
| Ausência de índice parcial | grep de `create index` em `supabase/migrations/`: **zero ocorrências**; `pg_indexes` confirma só 2 índices | — |
| Escolha arbitrária com duplicata | `0004:166-175` e `:207-219` (`select … into` sem `LIMIT`/`ORDER BY`) | — |
| Ocorrência real de resultado não determinístico | `005:51` reprovou no G7 de 2026-09-26; registro em `.spec/releases/r-2026-09-26.md:114-116` | — |
| Escrita é criação pura | `src/lib/api/config_comissoes.ts:35-39` (`.insert()`), sem `upsert`, sem `onConflict`, sem tratamento de `23505` | — |
| Não há exclusão nem atualização em uso | grep de `.delete(` em `src/lib/api/`: **zero ocorrências**; `updateConfigComissao` tem **1 match** no repositório, a própria definição | — |
| Fixtures com isolamento alegado e não efetivo | `011:29`, `012:32` (`on conflict` de três colunas com `servico_id` nulo) | — |
| Funções sob teste não leem a tabela | `0010_fn_fechar_competencia_comissao.sql` e `0011_fn_calcular_cmv.sql`: **zero** ocorrências de `config_comissoes` ou `comissao_percentual` | — |
| Nenhum teste afirma unicidade | grep de `config_comissoes` em `supabase/tests/`: 9 ocorrências, todas `insert` ou `update`; nenhum `select`, nenhuma asserção | — |

## Fora de escopo

- **Não** implementa `upsert`. Bloqueado mecanicamente pelo PostgREST no caminho
  atual; exigiria RPC, o que é feature própria.
- **Não** cria `delete` nem expõe `updateConfigComissao`. Ciclo de vida da
  configuração é feature própria, com decisão de produto.
- **Não** trata as três FKs sem `ON DELETE` (`config_comissoes_profissional_id_fkey`,
  `config_comissoes_salon_id_fkey`, `config_comissoes_servico_id_fkey`). Medido:
  nada referencia `config_comissoes`, então não há cascata; mas excluir
  profissional ou serviço referenciado falha por erro de FK, e essa é uma decisão
  de ciclo de vida, feature separada.
- **Não** altera `fn_fechar_comanda` quanto a comportamento observável. O
  `LIMIT 1`/`ORDER BY` é defesa contra estado inalcançável, sem AC.
- **Não** trata taxa, CMV, fechamento de competência nem relatórios.
- **Não** adiciona `@spec:` aos arquivos pgTAP sem tag, e **não** cria AC para
  regras do banco pré-ONP que não têm critério de aceite. Ver a ressalva sobre o
  alcance de `audit --ci` registrada na release desta rodada.
- **Não** altera RLS, policies, seeds, norma, adapter ou ferramentas do motor.
- **Não** cria AC para os inserts de `config_comissoes` em `011` e `012`: isso é
  decisão de escopo de fixture, não comportamento observável. Ver T-048.

## Impacto técnico

- **Uma migration nova** com índice único parcial. É a única alteração de schema.
- **Um arquivo de teste pgTAP novo** para AC-063 e AC-064, mais um ajuste
  pontual em `011` e a remoção de um insert em `012`.
- **`src/lib/api/config_comissoes.ts`**: tradução de `23505` em erro de domínio.
  Arquivo já existente, sem mudança de contrato público de sucesso.
- **`ConfigComissoesPage.tsx`**: sem alteração. A mensagem de erro já é exibida
  por `setErro` e renderizada em `ErrorMessage` (`ConfigComissoesPage.tsx:71-73`,
  `:207`); o que muda é o **conteúdo** da mensagem, não o fluxo.
- **Dois arquivos de spec existentes** citando a feature como bloqueada em três
  decisões de produto, que dejarão de estar corretos (T-050).

## Estratégia de testes

**Testes pgTAP** para AC-063 e AC-064: o comportamento vive no schema e numa
função SQL. O título da asserção carrega `@spec:AC-063` e `@spec:AC-064`, que é o
que o motor `onp-spec verify` mapeia à prova. Sem a tag no **título**, o AC fica
sem prova.

**Teste Vitest** para AC-065: a tradução de `23505` acontece na função de API, e o
caminho mais direto é mockar o cliente Supabase devolvendo `{ code: '23505' }` e
verificar o erro de domínio. Nenhum teste Vitest existente exercita a API; os seis
que renderizam `ConfigComissoesPage` apenas a mockam
(`tests/ui/recuperacao-carga.spec.tsx:66` e cinco outros), sem `@spec:`.

### Fixtures: limpeza explícita e estreita

`011` e `012` passam a **não depender de a tabela estar vazia**, que hoje é verdade
só por acaso do ambiente. A limpeza é estreita por obrigação: um `delete` apenas
por `(salon_id, profissional_id)` apagaria overrides de serviço legítimos do mesmo
profissional.

```sql
delete from config_comissoes
where salon_id = '…' and profissional_id = '…' and servico_id is null;
```

Os dois arquivos recebem veredictos **diferentes**, porque os testes exercitam
domínios diferentes:

- **`012:30-32` é removido.** `fn_calcular_cmv` (`0011`) calcula
  `preco_custo * quantidade` sobre movimentações de venda e não lê nada de comissão.
  A linha é de outro domínio, não compartilha coluna com o que a função faz, e ainda
  diverge de `011` em `comissao_sobre_produto` (`:31` tem `true`, `011:27-29` tem
  `false`), ou seja, nem é cópia fiel. Nenhuma das 5 asserções de `012` depende
  dela, porque nenhum teste assere nada a partir dessa tabela.
- **`011:27-29` é mantido como procedência.** `fn_fechar_competencia_comissao`
  (`0010`) lê `comanda_itens.comissao_valor_snapshot`, e o teste escreve esse valor
  diretamente (`:44-45`, `40.00`). A linha de config diz `comissao_percentual = 40`,
  o mesmo valor de `profissionais.comissao_percentual_padrao` (`:14-16`): ela
  documenta de onde veio o snapshot, mas com um valor indistinguível de outras duas
  fontes. Fica com comentário dizendo que é procedência e não entrada, e com a
  limpeza estreita acima.

Registrado explicitamente: **`011` e `012` não cobrem unicidade.** Eles cobrem
isolamento de fixture. O único teste da invariante é o de AC-063. Isso precisa
constar para que ninguém mais tarde conte `011`/`012` como cobertura da
invariante.

### Mutation check — medido em 2026-09-29

Executado contra `supabase/tests/016_config_comissoes_uniq_profissional.sql`
(`plan(4)`). O plano previa um mapeamento 1:1 entre mutação e critério destruído.
**A medição desmentiu o 1:1 em duas das três mutações.** Registro do observado.

**Baseline** — índice intacto:

```text
ok 1 - Segunda configuracao de nivel profissional rejeitada por violacao de unicidade @spec:AC-063
ok 2 - Permanece exatamente uma configuracao de nivel profissional @spec:AC-063
ok 3 - Configuracao de nivel servico convive com a de nivel profissional @spec:AC-064
ok 4 - As duas configuracoes coexistem para o mesmo profissional @spec:AC-064
```

**Mutação (a) — remover o índice parcial inteiro.** O plano dizia: AC-063 reprova.
Observado: **três** asserções reprovam.

```text
not ok 1 - ... @spec:AC-063   caught: no exception / wanted: 23505
not ok 2 - ... @spec:AC-063   have: 2   want: 1
ok     3 - ... @spec:AC-064
not ok 4 - ... @spec:AC-064   have: 3   want: 2
# Looks like you failed 3 tests of 4
```

A asserção 4 conta **todas** as linhas do profissional, e por isso também é sensível à
unicidade de nível profissional. Ela está tagueada `@spec:AC-064` mas não é prova
exclusiva de AC-064. O defeito é de **tagueamento da asserção**, não de força do AC.

**Mutação (b) — remover apenas a cláusula `WHERE servico_id is null`.** O plano dizia:
AC-064 reprova. Observado: a inserção de nível serviço levanta violação, **aborta a
transação**, e as asserções 3 e 4 nunca executam.

```text
ok 1 - ... @spec:AC-063
ok 2 - ... @spec:AC-063
ERROR:  duplicate key value violates unique constraint "config_comissoes_prof_nivel_uniq"
ERROR:  current transaction is aborted, commands ignored until end of transaction block
```

A mutação é detectada — alta e sem ambiguidade — mas **não** como um `not ok` limpo
atribuível a AC-064. O insert de nível serviço não está dentro de `lives_ok`, então a
falha derruba a transação em vez de reprovar uma asserção. Efeito prático: sob esta
mutação o `onp-spec verify` não veria prova `fail` de AC-064, e sim prova ausente ou
quebrada.

**Mutação (c) — remover a tradução de `23505` em `config_comissoes.ts`.** **Não
executada.** T-047 não está implementada, logo não existe tradução a remover. Só
poderá ser aferida quando T-047 existir.

### Correções que este mutation check impõe

Registradas, **não aplicadas** — T-051 manda registrar em vez de ajustar o teste.

1. A tabela de mutações **não é 1:1**, e a spec não deve afirmar que é. A mutação (a)
   destrói AC-063 e também parte de AC-064.
2. A asserção 4 de `016` está sobrecarretada: ela mede coexistência **e** unicidade de
   nível profissional ao mesmo tempo, mas está tagueada só com `@spec:AC-064`.
3. O insert de nível serviço em `016` deveria estar dentro de `lives_ok`, para que a
   mutação (b) produza reprovação limpa em vez de transação abortada.

Mutation Check é **experimental** e não é gate, conforme a norma. Segue o precedente de
`gate-comissao-produto/spec.md:134-150`.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| ASM-035 | A configuração de nível profissional é única por `(salon_id, profissional_id)`. | confirmada | É a intenção declarada da restrição em `v2_4:679-681`, lida com a semântica de `NULL` do PostgreSQL. A restrição foi escrita com a intenção de cobrir os dois níveis e não cobre o profissional. |
| ASM-036 | O profissional pode ter, ao mesmo tempo, um percentual padrão e um override por serviço. | confirmada | `v2_4:2061` ("config_comissoes tem servico_id opcional, permitindo override por combinação profissional+serviço") e a precedência em `0004:207-219` pressupõem as duas linhas existindo. |
| ASM-037 | Não há dado corrompido a corrigir; a feature é de prevenção. | confirmada | Medido em 2026-09-29: 0 linhas, 0 duplicatas. Registrado em "Estado atual no banco local". |
| ASM-038 | Traduzir `23505` na camada de API é suficiente e não exige RPC. | aberta | A existência e o formato de `error.code = '23505'` na fronteira real foram confirmados por medição em 2026-09-29, com a violação de unicidade provocada em `config_comissoes` através de `createClient` + `.insert().select().single()`: o cliente recebeu `code` valendo `'23505'`, com `details` e `hint` vazios. A tradução pode ocorrer em `config_comissoes.ts` sem alterar o banco. **T-047 verifica a tradução feita pelo código da aplicação, não o comportamento do PostgREST**, que já tem evidência independente. Pendentes: o comportamento específico após o índice parcial de T-044 ainda não foi medido, e a parte C desta suposição — "traduzir basta" — continua sem prova, por ser afirmação de projeto. |
| ASM-039 | `seed.sql` não popula `config_comissoes`, e por isso os testes partem de tabela vazia. | confirmada | `grep` de `config_comiss` em `supabase/seed.sql`: 2 ocorrências, ambas em `motivos_desconto` e `profissionais`. Confirmado por medição: 0 linhas após `db reset`. |

## Perguntas em aberto

Nenhuma pergunta bloqueia a execução. Nenhuma decisão de produto é pendente.

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| Q-022 | O segundo salvamento do mesmo par deve atualizar (upsert) ou ser rejeitado? | respondida | Rejeitado, por esta spec. `upsert` é mecanicamente inexpressível no PostgREST atual e exigiria RPC; a decisão de produto sobre "salvar" vs "criar" fica para a feature de ciclo de vida. |
| Q-023 | Deve existir operação de exclusão de configuração? | respondida | Fora de escopo. Ausência é lacuna possível, não obrigação; decide-se em feature própria. |
| Q-024 | Como tratar dados duplicados já existentes em ambientes outros que o local? | respondida | Não há dado local. Para ambiente com dado, a migration precisa de passo de detecção antes do índice, porque o índice parcial falha ao ser criado se já houver duplicata. Registrado como risco de execução em G3, não como AC: o ambiente-alvo do produto não foi definido. |
| Q-025 | As três FKs sem `ON DELETE` devem ganhar `CASCADE` ou `SET NULL`? | respondida | Fora de escopo; feature de ciclo de vida referencial. |

## Estado dos gates (2026-09-29)

A feature permanece `rascunho`: T-047 não está implementada e AC-065 não tem prova.
G0 a G3 abaixo refletem o que foi medido; G4 em diante não foram executados.

| Gate | Estado | Evidência |
|---|---|---|
| G0 Escopo | **PASS** | escopo fechado nesta spec; as três decisões de produto que bloqueavam a feature estão resolvidas (Q-022, Q-023, e a ordem deixou de ser bloqueio) |
| G1 SPEC Review | **revisão semântica executada; falta o aval do dono** | Mecanicamente limpo: `audit` sem `ID_DUPLICADO`, `AC_INCOMPLETO`, `US_SEM_AC`. Revisão semântica executada: 12+ citações conferidas contra fonte primária; base normativa de AC-063 e AC-064 reforçada por `v2_4:681` e `:2061`; poder discriminante de AC-064 medido. Dois achados já corrigidos: T-047 subespecificada (nota reescrita) e a referência de ASM-038 na spec, que ainda apontava T-047 como prova do PostgREST. |
| G2 Test/Evidence | **PASS com ressalva** | cada AC tem prova declarada: AC-063 e AC-064 em `supabase/tests/016…sql`, AC-065 em Vitest. A ressalva vem do mutation check: o mapeamento 1:1 **não se confirmou**, e duas correções de tagueamento estão registradas sem aplicadas. |
| G3 Feature Verify | **parcial** | `integridade-config-comissoes 2/2 critério(s) com prova PASS · 5 teste(s) lidos · exit 0`; artefato `.spec/verification/integridade-config-comissoes.json` com `AC-063` e `AC-064` em `pass`. **AC-065 não tem prova** e o gate não fecha enquanto T-047 não existir. |
| G4 QA funcional | **pendente, e não é N/A** | o índice muda comportamento observável: um segundo salvamento do mesmo par passa a ser recusado, onde antes criava duplicata. Verificado por fronteira, mas o cenário de usuário real não foi exercido. |
| G5 QA visual | **pendente, e não é N/A** | AC-065 altera a mensagem exibida ao usuário. Além disso, a mensagem atual vaza o nome da constraint, medido. |
| G6 Diff/Scope Review | **pendente** | 3 arquivos criados: migration `0015`, teste `016`, artefato de prova. Nenhuma alteração em `src/`, RLS, `seed.sql` ou motor. |
| G7 Global Regression | **parcial** | suíte pgTAP: `80 ok · 0 not ok`, incluindo os 4 asserts novos. A/B do índice: `76 ok · 0 not ok` com e sem ele, logo neutro. **Ressalva:** o `audit` reporta 8 `VERIFY_OBSOLETO` em outras features — ver a seção seguinte. |
| G8 Audit | **pendente** | `exit 1`. Estado atual e causa da invalidação alheia, na seção seguinte. |

### Estado do `audit --ci` neste momento

`9 erro(s), 1 aviso(s)`, `exit 1`, `53/54` ACs com prova.

Composição dos 9 erros:

- **1** `AC_SEM_TESTE` de AC-065, esperada: T-047 não existe.
- **8** `VERIFY_OBSOLETO`, um por feature — `dashboard-gerencial`, `diagnostico-jwt`,
  `fundacao-ui`, `gate-comissao-produto`, `legado-baseline`, `recuperacao-carga`,
  `refinamento-interface`, `relatorios-gerenciais`.

**Os 8 são falso positivo do mecanismo, e a causa está medida em `core/audit.js:378-381`:**

```js
const codeMtime = latestMtime(config.rootDir, [
  ...project.srcFiles,   // globs GLOBAIS do projeto
  ...project.testFiles,   // globs GLOBAIS do projeto
]);
if (codeMtime > Date.parse(verification.timestamp)) { /* VERIFY_OBSOLETO */ }
```

`project.srcFiles` e `project.testFiles` são as listas **globais**, construídas de
`srcGlobs` (`src/**`) e `testGlobs` (`test/**`, `tests/**`) em
`onpspec.config.json`. O nome da feature escolhe apenas **qual timestamp** comparar.
A regra efetiva é: **qualquer arquivo de código ou teste novo no projeto invalida a
prova de todas as features.**

Criar `supabase/tests/016_config_comissoes_uniq_profissional.sql` invalidou as 8 provas
mesmo que, semanticamente, nada naquelas features tenha mudado. Nenhuma delas é
instância deste feature nem foi tocada por T-044, T-045 ou T-046.

Renovar essas provas é caminho conhecido (L-01, sem `db reset`) e não foi feito aqui:
está fora do escopo desta feature e é dívida de mecanismo, não dela. Registrado em vez
de tratado.
