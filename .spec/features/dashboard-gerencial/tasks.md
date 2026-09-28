# Tasks: Dashboard gerencial

> feature: dashboard-gerencial

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

## Mapa de dependências

```text
T-028  0014_fn_dashboard_indicadores.sql
   │
   └──> T-029  015_fn_dashboard_indicadores.sql   (prova de valor, no banco)

T-030  src/types.ts            ──>  T-031  src/lib/api/dashboard.ts
                                          │
                                          └──>  T-032  src/pages/DashboardPage.tsx
                                                       │
                                                       └──>  T-033  tests/ui/dashboard-gerencial-*.spec.tsx
```

O contrato de retorno de T-028 está **congelado** na spec (seção "Contrato
congelado da função nova"). É isso que permite a Onda A. Se o contrato mudar,
T-030 precisa ser refeito — e a Onda A perde a validade.

---

## T-028 - Migration 0014: função compositora dos indicadores [concluida]
- Refs: US-021
- Arquivos: supabase/migrations/0014_fn_dashboard_indicadores.sql
- Esforço: baixo
- Objetivo: criar `public.fn_dashboard_indicadores(p_competencia text)`, que
  **delega** Faturamento e Receita líquida a `fn_relatorio_caixa`, **delega** CMV
  a `fn_calcular_cmv`, e calcula Despesas por agregação própria.
- Depende de: nada. `0011` e `0012` já existem e não são tocados.
- ACs que habilita: AC-048, AC-049, AC-050, AC-051, AC-053. Nenhum AC é
  implementado aqui — esta é a única tarefa de infraestrutura sem AC.
- Constraint obrigatória: `security definer` **e** `set search_path = ''`. Por
  isso, as chamadas internas **precisam** ser qualificadas:
  `public.fn_relatorio_caixa(...)` e `public.fn_calcular_cmv(...)`. Sem o
  prefixo, a função não compila — verificado, ver G3 na spec.
- Despesas é a **única** fórmula nova. O comentário da migration **precisa**
  referenciar `0012:64-71,108` como origem da semântica, para que a duplicação
  de um único agregado fique documentada e rastreável.
- Contrato de retorno, exato e sem campo a mais:
  `faturamento numeric, receita_liquida numeric, despesas numeric, cmv numeric, tem_movimento boolean`.
- O intervalo de datas é derivado em SQL: primeiro dia do mês da competência até
  o último dia. `fn_calcular_cmv` recebe a competência direto, sem derivação.
- Prova esperada: nenhuma prova própria. A prova é T-029.
- Critério objetivo de conclusão: a migration aplica sem erro; a função existe em
  `public`; `security definer` e `set search_path = ''` presentes; as duas
  chamadas internas aparecem qualificadas com `public.` no corpo; e uma chamada
  direta com uma competência vazia devolve uma linha com os quatro numéricos e
  `tem_movimento = false`, **sem** exceção.

## T-029 - Prova pgTAP das agregações da competência [pendente]

- Refs: AC-048, AC-049, AC-050, AC-051, AC-053, AC-056, AC-057
- Arquivos: supabase/tests/015_fn_dashboard_indicadores.sql
- Esforço: medio
- Objetivo: provar, no banco, que os quatro indicadores têm o valor correto e que
  a competência sem movimento é distinguível de valor zero apurado.
- Depende de: **T-028**. Sem a função, o arquivo não tem o que exercitar.
- Testes/provas esperados: arquivo pgTAP com `plan(N)` e asserções cujo
  **título** carrega a tag `@spec:AC-xxx` — é o título que o `onp-spec verify`
  lê; tag em comentário não produz prova. Sete asserções no mínimo:
  - `AC-048`: o `faturamento` devolvido é **igual** ao que
    `public.fn_relatorio_caixa` devolve no mesmo intervalo, lido de
    `total_vendas`, **no mesmo teste** — é essa comparação que impede uma
    reimplementação da fórmula
  - `AC-049`: idem contra `total_entradas`, com ao menos um pagamento com taxa de
    maquininha, e `receita_liquida < faturamento`
  - `AC-050`: o `cmv` devolvido é **igual** ao que `public.fn_calcular_cmv`
    devolve para a mesma competência
  - `AC-051`: fixture com **despesa e `fechamentos_comissao` na mesma
    competência**; o `despesas` devolvido é igual à soma das despesas e **não**
    inclui o `total_pago` do fechamento
  - `AC-053`: competência sem pagamento, sem movimentação `VENDA` e sem despesa
    devolve `tem_movimento = false`
  - `AC-056`: competência **com** despesa e **sem** pagamento e **sem**
    movimentação `VENDA` devolve `tem_movimento = true`, com `faturamento = 0`
    e `despesas` igual à despesa inserida
  - `AC-057`: competência **com** movimentação `VENDA` e **sem** pagamento e
    **sem** despesa devolve `tem_movimento = true`, com `faturamento = 0` e
    `cmv` maior que zero. **Este é o único teste que reprova uma implementação de
    `tem_movimento` que ignore `movimentacoes_estoque`** — `AC-053` e `AC-056`
    passam contra ela, porque as duas definiem movimento só por pagamento ou
    despesa. Fixture: uma linha em `movimentacoes_estoque` com `tipo = 'VENDA'`,
    `produto_id` do produto do `seed.sql` (`…0301`), `quantidade` e
    `custo_unitario` positivos, e `created_at` dentro da competência. As três
    asserções — `tem_movimento = true`, `faturamento = 0`, `cmv > 0` — precisam
    estar **no mesmo teste**, porque é a combinação que prova que a competência
    tem movimento **e** que o Faturamento zero é apurado, e não ausência de dado
- Critério objetivo de conclusão: o arquivo roda sob
  `node scripts/onp-feature-verify.cjs dashboard-gerencial` com `exit 0`; todas as
  asserções com tag saem `ok`; `plan(N)` bate com o número de asserções; e
  `.spec/verification/dashboard-gerencial.json` tem `results` com `pass` para os
  sete ACs.

## T-030 - Contrato TypeScript dos indicadores [concluida]
- Refs: US-021
- Arquivos: src/types.ts
- Esforço: baixo
- Objetivo: declarar o tipo que a API e a interface vão consumir, com os cinco
  campos do contrato congelado.
- Depende de: **leitura** do contrato congelado na spec. Não depende do
  resultado de T-028 — depende de a spec continuar valendo, que é condição de
  Onda A, não dependência de artefato.
- Testes/prova esperada: nenhum teste próprio. É tipo, coberto pelo uso em T-031 e
  T-032.
- Critério objetivo de conclusão: existe o tipo dos indicadores com os quatro
  campos numéricos mapeados para `number` e `tem_movimento` para `boolean`, com
  os nomes do contrato preservados; `npx tsc -b` passa.

## T-031 - API de consulta dos indicadores [pendente]

- Refs: US-021
- Arquivos: src/lib/api/dashboard.ts
- Esforço: baixo
- Objetivo: expor a leitura dos indicadores da competência para a interface.
- Depende de: **T-030**, porque importa o tipo.
- Testes/prova esperada: nenhuma prova própria; exercitada por T-032 e T-033.
- Critério objetivo de conclusão: o módulo exporta a função de consulta; ela
  chama `supabase.rpc` com o nome da função de T-028 e o parâmetro
  `p_competencia`; converte os numéricos que chegam do Postgres para `number`,
  no mesmo padrão de `relatorios.ts:37-38`; lança em `error`; e
  `npx tsc -b` passa.

## T-032 - DashboardPage: seletor de competência e indicadores [pendente]

- Refs: AC-047, AC-053, AC-056, AC-057
- Arquivos: src/pages/DashboardPage.tsx
- Esforço: medio
- Objetivo: substituir a competência fixa por um seletor e renderizar os quatro
  indicadores, com estado de "sem movimento".
- Depende de: **T-031** (a consulta) e **T-030** (o tipo).
- Não pode remover: o alerta de estoque negativo (`AC-054`) e a seção de
  demonstração de e-mail (`AC-055`). Preservar é condição, não opção.
- Testes/prova esperada: nenhum teste próprio; exercitada por T-033.
- Critério objetivo de conclusão: a constante `new Date().toISOString().slice(0, 7)`
  deixa de ser o valor fixo e passa a vir do seletor; os quatro indicadores
  renderizam rótulo e valor; quando `tem_movimento` é falso, renderizam a
  mensagem de período sem movimento **em vez de** `R$ 0,00`; quando
  `tem_movimento` é verdadeiro e `faturamento` é `0`, renderizam **`R$ 0,00` com
  rótulo e valor**, e **não** a mensagem — é a distinção de ASM-022, e vale para
  as **duas** origens de `faturamento = 0` com movimento: só despesa (`AC-056`) e
  só venda de estoque (`AC-057`). A interface **não** distingue as duas; ambas
  renderizam o mesmo estado. A distinção é da fonte do dado, provada em T-029; o controle de
  competência tem `label` associado com `id`, seguindo o padrão de
  acessibilidade já provado por `AC-031` de `refinamento-interface`; e o alerta
  de estoque e a demonstração de e-mail continuam no JSX.

## T-033 - Provas de apresentação dos indicadores [pendente]

- Refs: AC-047, AC-048, AC-049, AC-050, AC-051, AC-052, AC-053, AC-054, AC-055, AC-056, AC-057
- Arquivos: tests/ui/dashboard-gerencial-competencia.spec.tsx, tests/ui/dashboard-gerencial-indicadores.spec.tsx, tests/ui/dashboard-gerencial-preservado.spec.tsx
- Esforço: medio
- Objetivo: provar, na interface, que a competência é selecionável, que os
  indicadores aparecem com rótulo e valor, que "sem movimento" é distinguível de
  valor zero apurado, e que o conteúdo preexistente sobreviveu.
- Depende de: **T-032**.
- Testes/prova esperada: três arquivos, agrupados por preocupação, seguindo o
  padrão de `refinamento-interface` (um arquivo por grupo de AC, não um por AC):
  - `…-competencia.spec.tsx` → `AC-047` (seletor altera o rótulo) e `AC-052`
    (dados em duas competências mudam ao alternar)
  - `…-indicadores.spec.tsx` → `AC-048`, `AC-049`, `AC-050`, `AC-051` (rótulo e
    valor renderizados), mais a **fronteira de ASM-022** em três estados
    distintos e mutuamente exclusivos:
    - `AC-053` — sem pagamento, sem venda, sem despesa: mostra a mensagem e
      **não** mostra `R$ 0,00`
    - `AC-056` — com despesa, sem pagamento e sem venda: mostra **`R$ 0,00` com
      rótulo** e **não** mostra a mensagem
    - `AC-057` — com venda de estoque, sem pagamento e sem despesa: mostra
      **`R$ 0,00` com rótulo**, mostra **CMV maior que zero** e **não** mostra a
      mensagem
    Precisam ser asserções separadas. Um teste que só verificasse a ausência da
    mensagem no caso `AC-056` passaria mesmo com a mensagem também aparecendo. E
    `AC-057` precisa da asserção de **CMV apurado junto do Faturamento zero**:
    sem ela a prova não mostra que os dois estados coexistem corretamente, que é
    exatamente o que a decisão de produto mandou evitar.
  - `…-preservado.spec.tsx` → `AC-054` e `AC-055` (alerta de estoque e
    demonstração de e-mail continuam renderizando)
  - `AC-048` a `AC-051`, `AC-056` e `AC-057` recebem tag **também** aqui, além da
    prova de valor em T-029. Uma prova o número, a outra prova a exibição. Um AC
    pode ser carregado por dois arquivos; basta um `pass` e nenhum `fail`.
- Critério objetivo de conclusão: os três arquivos rodam verdes sob
  `npx vitest run`; as tags estão nos títulos; e
  `.spec/verification/dashboard-gerencial.json` mostra `pass` nos **onze** ACs
  com `testsParsed > 0`.

---

## Ordem recomendada e o que é decisão do dono

A ordem abaixo **não** é preferência operacional. As ondas vêm da análise de
conflito de artefato, contrato e resultado.

| Onda | Tasks em paralelo | Condição |
|---|---|---|
| **A** | T-028 ∥ T-030 | **Condicional ao contrato congelado.** Artefatos disjuntos (`0014.sql` vs `types.ts`), e T-030 depende do contrato descrito na spec, não do resultado de T-028 |
| **B** | T-029 ∥ T-031 | **Incondicional.** Artefatos disjuntos (`015_…sql` vs `api/dashboard.ts`); cada uma depende de uma task da Onda A diferente, e nenhuma das duas depende da outra |
| **C** | T-032 | Sozinha. Depende de T-031 |
| **D** | T-033 | Sozinha. Depende do componente que T-032 produz |

**Se você não aceitar a condição da Onda A**, o caminho é T-028 → T-030 → Onda B
(T-029 ∥ T-031) → T-032 → T-033: cinco ondas em vez de quatro, e T-030 deixa de
depender de um contrato escrito.

**Sequenciais obrigatórias, por qualquer arranjo:** T-032 antes de T-033
(T-033 testa o componente que T-032 produz) e T-028 antes de T-029 (o teste não
tem o que exercitar sem a função).
