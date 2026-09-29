# Spec: Gate de comissão sobre produto

> feature: gate-comissao-produto
> status: implementada

## Contexto

Ao fechar uma comenda, `fn_fechar_comanda` decide se um item do tipo `PRODUTO`
gera comissão. A decisão tem duas etapas: primeiro o gate
`config_comissoes.comissao_sobre_produto` liga ou desliga a comissão de produtos;
**só quando o gate está ligado** o percentual próprio do produto
(`produtos.percentual_comissao`) é considerado.

Essa regra está implementada em `supabase/migrations/0004_fn_fechar_comanda.sql:221-231`
e declarada no plano (`plano-arquitetura-salao-beleza-v2_4.md:952` e `:2060`;
`plano-arquitetura-salao-beleza-v2_5.md:789`). **Nenhum teste automatizado prova
o ramo em que o gate está desligado.** Hoje o único teste que cria item `PRODUTO`
com percentual de produto preenchido — `supabase/tests/005_fn_fechar_comanda_produto_estoque.sql` —
usa o gate **ligado** (`comissao_sobre_produto = true`, linha 18) e prova o
resultado 7.50.

A consequência é que a metade da regra que **evita** comissão está sem prova. Se
alguém inverter a condição em `0004:222`, nenhum teste falha, e o `audit --ci`
continua saindo 0: o comportamento errado ficaria invisível.

Esta feature **não altera comportamento**. Ela cria a prova que falta.

## Decisões desta feature

- **Nenhuma decisão de produto é necessária.** O comportamento-alvo já está
  implementado e documentado no plano. A feature só registra, em forma de teste
  automatizado, o que a norma e o código já determinam. Essa é a razão de esta
  feature existir separada da feature de integridade de `config_comissoes`:
  esta não exige decisão de produto alguma. A feature `integridade-config-comissoes`
  é justamente onde as três decisões de produto que um dia bloquearam o trabalho
  foram tomadas: o segundo salvamento é rejeitado e não faz `upsert`, medido como
  inexpressível no PostgREST atual sem exigir RPC; a exclusão de configuração é
  adiada para feature de ciclo de vida própria; e a ordem deixou de ser bloqueio
  quando os fixtures passaram a se isolar por `delete` estreito.
- **O teste replica o `005` com o gate invertido.** Mesmo produto, mesmo
  profissional, mesmos valores, mudando apenas `comissao_sobre_produto` de
  `true` para `false`. Assim os dois testes ficam diretamente comparáveis: 7.50
  com o gate ligado, 0.00 com o gate desligado, **com `percentual_comissao = 15`
  preenchido nos dois casos**. É essa simetria que dá poder discriminante ao
  teste: sem o gate funcionando, o resultado seria 7.50 nos dois.

## Histórias

### US-020 - Responsável financeiro confia no valor de comissão sem conferência manual

Como responsável financeiro do salão, quero que a venda de um produto não gere
comissão quando o gate `comissao_sobre_produto` estiver desligado, para que o
valor apurado no fechamento eu confio sem precisar conferir item a item.

#### AC-046 - Produto com gate desligado não gera comissão, mesmo com percentual próprio preenchido

- **Dado** um profissional com `config_comissoes` de nível profissional
  (`servico_id` nulo) com `comissao_percentual = 40` e
  `comissao_sobre_produto = false`, e um produto com
  `percentual_comissao = 15` preenchido
- **Quando** uma comanda com um item do tipo `PRODUTO` de 2 unidades a 25.00
  (total 50.00) é fechada
- **Então** a comissão do item fica em 0.00, e não 7.50 — o
  `percentual_comissao` do produto é ignorado porque o gate está desligado

## Evidência/origem do requisito

| Requisito | Origem no código | Origem no plano |
|---|---|---|
| Gate desligado zera a comissão de produto | `0004_fn_fechar_comanda.sql:221-223` (`if not v_comissao_sobre_produto then v_percentual_comissao := 0`) | `v2_4:952` — *"Produtos só geram comissão se `config_comissoes.comissao_sobre_produto = true`"*; `v2_5:789` |
| O percentual do produto só entra **dentro** do gate ligado | `0004_fn_fechar_comanda.sql:224-230` (busca de `percentual_comissao` no `else`) | `v2_4:2060` — *"on/off por profissional via `comissao_sobre_produto`; percentual específico por produto via `produtos.percentual_comissao` (override opcional)"* |
| Precedência serviço > profissional > padrão | `0004:207-219` (`coalesce(cc_esp…, cc_prof…, padrao)`) | `v2_4:2060` |
| Ausência de prova do ramo desligado | `supabase/tests/005…sql:18` usa o gate ligado; nenhum outro teste combina item `PRODUTO` com o gate desligado | — |

## Fora de escopo

- **Não altera** `fn_fechar_comanda` nem qualquer migration. O comportamento
  testado já está implementado; se o teste reprovar, isso é um achado de
  defeito, não motivo para "consertar" o código dentro desta feature.
- **Não** cria índice, **não** migra schema, **não** implementa `upsert`, **não**
  cria `delete` em `config_comissoes`. Isso pertence à feature de integridade de
  `config_comissoes`, `integridade-config-comissoes`, que já decidiu esses três
  pontos e os deixou fora do próprio escopo — ver Q-022, Q-023 e a nota de T-044.
- **Não** corrige `processo-dev-salao-beleza.md:47`, que resume a regra e omite o
  gate. Divergência de documentação registrada, behandada em outra rodada.
- **Não** adiciona `@spec:` aos outros 12 arquivos pgTAP sem tag.
- **Não** cria teste para o ramo do gate ligado — já existe (`005`).
- **Não** altera adapter, norma, gates ou qualquer ferramenta.

## Impacto técnico

- Nenhuma alteração em `src/`, `supabase/migrations/` ou `supabase/seed.sql`.
- Um arquivo novo em `supabase/tests/`, que já está em `testGlobs` do
  `onpspec.config.json`.
- A prova de que a regra é respeitada passa a ser verificável por
  `onp-spec verify`, e o AC deixa de ser invisível ao `audit`.

## Estratégia de testes

- **Teste pgTAP**, porque o comportamento vive numa função SQL. Vitest não
  alcançaria a regra.
- O título da asserção carrega `@spec:AC-046`, que é o que o motor
  `onp-spec verify` usa para mapear o AC à prova. Sem a tag no **título**, o AC
  fica sem prova — a tag em comentário não serve.
- `plan(1)`: uma única asserção, para que o AC e a prova sejam 1:1.
- O arquivo usa `begin` / `rollback`, como os demais testes pgTAP, e depende do
  `seed.sql` para profissional e produto (o `005` também depende).
- Sem container `supabase_db` em execução o teste é ignorado — ver a limitação
  registrada no relatório de execução.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| ASM-015 | O comportamento atual de `fn_fechar_comanda` (gate desligado zera a comissão) está correto e deve ser preservado. | confirmada | Não é suposição: está no plano (`v2_4:952`, `v2_4:2060`, `v2_5:789`) e implementado (`0004:221-231`). A feature existe para **provar**, não para definir. |
| ASM-016 | `seed.sql` fornece o profissional e o produto usados pelo fixture. | confirmada | `supabase/seed.sql:30-32` cria o profissional `…0101`; `:38-40` cria o produto `…0301`. `onp-feature-verify.cjs` roda `db reset` antes, que reaplica seed. |

## Perguntas em aberto

Nenhuma pergunta bloqueia a execução. Nenhuma decisão de produto é necessária.

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| Q-016 | O gate desligado deve zerar a comissão ou aplicar outro tratamento (por exemplo, manter o valor mas marcar como não repassável)? | respondida | Não é pergunta em aberto: o plano e o código já decidem — zerar (`v2_4:952`, `0004:223`). Registrada aqui só para deixar explícito que **a decisão de produto já existe** e não precisa ser tomada nesta feature. |

## Estado dos gates (2026-09-27)

| Gate | Estado | Evidência |
|---|---|---|
| G0 Escopo | **PASS** | escopo fechado nesta spec; zero decisão de produto pendente |
| G1 SPEC Review | **PASS** | `audit --ci` sem `AC_INCOMPLETO`, `US_SEM_AC`, `ID_DUPLICADO` |
| G2 Test/Evidence | **PASS** | `36/36 com teste`; `AC-046` mapeado a `supabase/tests/014_…sql:66` |
| G3 Feature Verify | **PASS** | `1/1 critério(s) com prova PASS · 1 teste(s) lidos · exit 0`; artefato `results["AC-046"].status = "pass"` |
| G4 QA funcional | **N/A** | **Justificativa:** a feature não altera comportamento observável por usuário — só adiciona um teste que exercita uma função SQL já existente. Não há tela, fluxo nem estado novo para testar em cenário real. |
| G5 QA visual | **N/A** | **Justificativa:** não há mudança perceptível. Zero arquivo de `src/` alterado. |
| G6 Diff/Scope Review | **PASS** | 3 arquivos criados, todos declarados em `Arquivos:` de T-027; nenhuma alteração em `src/`, `supabase/migrations/`, `seed.sql`, adapter ou norma |
| G7 Global Regression | **PASS** | `exit 0` · pgTAP `67 ok · 0 not ok` · vitest `108 ok · 0 not ok` |
| G8 Audit | **PASS** | `audit --ci` → `6 feature(s) · 36/36 provados · 0 aviso(s)`, exit 0 |

**Força da prova — mutation check.** O AC não é tautológico. Executando o mesmo
SQL com `comissao_sobre_produto = true` (mutação em memória, **sem** tocar no
arquivo do repositório), o TAP devolve:

```text
not ok 1 - Gate desligado zera comissao de PRODUTO mesmo com percentual 15 no produto @spec:AC-046
#         have: (7.50)
#         want: (0.00)
# Looks like you failed 1 test of 1
```

Ou seja: o teste distingue o ramo desligado do ligado. O `7.50` é exatamente o
que `005_fn_fechar_comanda_produto_estoque.sql` produz com o gate ligado — a
simetria entre os dois testes é o que dá poder discriminante ao AC.

Mutation Check é **experimental** e não é gate. Foi usado aqui como aferição de
força de prova, conforme recomendado pela norma.

## Resumo executivo (para auditoria)

Uma feature de prova. Não muda produto, schema nem arquitetura: adiciona um
teste pgTAP que cobre o ramo da regra `comissao_sobre_produto` que hoje não tem
nenhuma verificação automatizada. 1 história, 1 critério de aceite, 1 tarefa, 1
arquivo de teste. Zero decisões de produto pendentes — é o que a distingue da
feature de integridade de `config_comissoes`.
