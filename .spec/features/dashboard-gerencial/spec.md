# Spec: Dashboard gerencial

> feature: dashboard-gerencial
> status: rascunho

## Contexto

O plano `plano-arquitetura-salao-beleza-v2_5.md` §16 prevê que o dashboard
executivo evolua para apresentar **Faturamento, Receita líquida, Comissões, CMV,
Despesas, Resultado líquido e Margem**. Hoje `src/pages/DashboardPage.tsx` mostra
apenas **CMV** (competência corrente, fixa) e o **alerta de estoque negativo**,
mais uma seção de demonstração de e-mail.

Esta feature entrega **quatro** das sete métricas — Faturamento, Receita líquida,
CMV e Despesas — e as torna selecionáveis por competência. As três restantes
(Comissões, Resultado líquido, Margem) dependem de decisões de produto que **não
existem documentadas** e ficam para features posteriores.

## Decisões desta feature

Cada decisão abaixo foi tomada pelo dono do produto nesta rodada. Todas as
fórmulas citadas são **re-derivadas do código existente**, não inventadas.

- **D1 — A base temporal é a competência mensal (`YYYY-MM`), não intervalo de
  datas livre.** Motivo declarado: não introduzir dois significados diferentes
  para CMV dentro do sistema. O usuário seleciona uma competência e todos os
  indicadores refletem aquele mês.
- **B1 — O CMV reutiliza `fn_calcular_cmv(p_competencia)` como está.** Não será
  criada variante por intervalo de datas. Nenhuma segunda fórmula de CMV existirá.
- **B2 — Despesas não são filtradas por `status`.** A referência temporal é
  `data_pagamento`, a mesma semântica de `fn_relatorio_caixa`. O significado de
  `PAGO`/`PENDENTE` não é formalizado aqui; se vier a ser, será regra própria.
- **D3 — Despesas aparecem em indicador separado** de repasses de comissão.
  Hoje `fn_relatorio_caixa` funde `despesas.valor` e
  `fechamentos_comissao.total_pago` em `total_saidas`; separar exige função nova,
  sem alterar `0012`.
- **D6 — O alerta de estoque negativo e a seção de simulação de e-mail são
  preservados.** A simulação de e-mail foi investigada e **classificada como
  demonstração sem integração**: não há infra de e-mail em `src/` nem em
  `supabase/migrations/`; a seção renderiza a lista já carregada, com
  destinatários fixos em JSX. O plano confirma: `v2_5:1097` — *"E-mail via Resend
  | planejado; sem integração atual"*. Ela é mantida **e** documentada como
  demonstração, para que ninguém a leia como funcionalidade.

### Observação que sustenta D1

O dashboard **já é** baseado em competência: `DashboardPage.tsx:15` calcula
`new Date().toISOString().slice(0, 7)` e o passa a `calcularCMV`. O que não
existe é a **seletor**. D1 preserva a base temporal já em uso e entrega a
seleção. Não é mudança de regra; é remoção de um valor fixo.

## Fórmulas re-derivadas (nenhuma é nova)

| Métrica | Fórmula | Origem |
|---|---|---|
| **Faturamento** | Σ `pagamentos.valor_bruto` com `paid_at` dentro da competência, **excluindo** `estornado is not false` | `0012_relatorio_caixa.sql:83`, já coberto por `AC-001` de `relatorios-gerenciais` |
| **Receita líquida** | Σ `pagamentos.valor_liquido` com `paid_at` dentro da competência | `0012:84`, já coberto por `AC-002` |
| **CMV** | Σ `custo_unitario × abs(quantidade)` de `movimentacoes_estoque` com `tipo = 'VENDA'` e `to_char(created_at,'YYYY-MM') = competência` | `0011_fn_calcular_cmv.sql:38-43` — **função reutilizada sem alteração** |
| **Despesas** | Σ `despesas.valor` com `data_pagamento` dentro da competência, **sem filtro de `status`** | alinhar a `0012:85,89,93`, que soma `despesas.valor` por `data_pagamento` sem checar status |

O intervalo de datas da competência é derivado: primeiro dia = dia 1 do mês;
último dia = último dia do mês. Ao chamar `fn_relatorio_caixa`, o dashboard passa
esse intervalo. **A fórmula não muda** — muda apenas o intervalo derivado, que é
determinístico e não é regra de negócio.

## Histórias

### US-021 - Gerente avalia os indicadores financeiros da competência no dashboard

Como gerente, quero selecionar uma competência e ver o faturamento, a receita
líquida, o CMV e as despesas daquele mês no dashboard, para avaliar o desempenho
do salão sem abrir cada relatório separadamente.

#### AC-047 - O usuário seleciona a competência

- **Dado** o dashboard aberto, com a competência corrente já aplicada
- **Quando** o usuário escolhe outra competência no seletor
- **Então** a competência selecionada passa a ser a exibida no rótulo de todos os indicadores

#### AC-048 - O dashboard apresenta o faturamento da competência

- **Dado** pagamentos com `paid_at` dentro da competência selecionada
- **Quando** o dashboard carrega os indicadores
- **Então** o indicador "Faturamento" mostra a soma de `valor_bruto` desses pagamentos, formatada em real

#### AC-049 - O dashboard apresenta a receita líquida da competência, distinta do faturamento

- **Dado** pagamentos com `paid_at` dentro da competência selecionada, incluindo ao menos um com taxa de maquininha
- **Quando** o dashboard carrega os indicadores
- **Então** o indicador "Receita líquida" mostra a soma de `valor_liquido` e é menor que o Faturamento, em indicador separado

#### AC-050 - O dashboard apresenta o CMV da competência

- **Dado** movimentações de estoque do tipo `VENDA` dentro da competência selecionada
- **Quando** o dashboard carrega os indicadores
- **Então** o indicador "CMV" mostra o custo médio ponderado dessas movimentações, no mesmo valor que `fn_calcular_cmv` retorna para a mesma competência

#### AC-051 - O dashboard apresenta as despesas da competência, separadas de repasses

- **Dado** despesas com `data_pagamento` dentro da competência selecionada e um fechamento de comissão no mesmo período
- **Quando** o dashboard carrega os indicadores
- **Então** o indicador "Despesas" mostra a soma das despesas e **não** inclui o `total_pago` de fechamentos de comissão

#### AC-052 - Os indicadores acompanham a competência selecionada

- **Dado** dados em duas competências distintas
- **Quando** o usuário alterna entre elas no seletor
- **Então** os valores dos indicadores mudam para os da competência escolhida

#### AC-053 - O dashboard informa quando a competência não tem movimento

- **Dado** uma competência sem pagamentos, sem vendas e sem despesas
- **Quando** o dashboard carrega os indicadores dessa competência
- **Então** cada indicador informa que não há movimento no período, em vez de exibir `R$ 0,00` como se fosse um valor apurado

#### AC-054 - O dashboard preserva o alerta de estoque negativo

- **Dado** produtos com `estoque_atual` negativo
- **Quando** o dashboard é carregado
- **Então** o alerta de estoque negativo continua sendo exibido, com a contagem de produtos

#### AC-055 - O dashboard preserva a demonstração de e-mail de saldo negativo

- **Dado** produtos com `estoque_atual` negativo
- **Quando** o dashboard é carregado
- **Então** a seção de simulação de e-mail continua sendo exibida com a lista de produtos em saldo negativo, identificada como demonstração

## Fora de escopo

Registrado explicitamente, conforme decisão do dono do produto.

### Adiado por falta de decisão de produto

- **Comissões.** **Não** criar agregação de comissões para o dashboard.
  `fn_relatorio_comissao` **não** será chamada. `fechamentos_comissao.total_pago`
  não entra em nenhum indicador desta feature. Feature posterior.
- **Resultado líquido.** Feature posterior. O plano nomeia a métrica mas não
  define a fórmula.
- **Margem.** Feature posterior. O plano **não tem fórmula** para margem — não
  é redigível como critério de aceite.

### Fora de escopo por instrução

- Desempenho por profissional.
- Qualquer visão de comissão por profissional.
- Fechamento de competência.
- Novas regras de negócio não documentadas.

### Não tocado

- **`0012_relatorio_caixa.sql` não é alterado.** Despesas isoladas viram função
  nova, em migration nova, conforme o princípio de extensibilidade aditiva do
  plano §5.7.
- **`fn_relatorio_comissao` (`0013`) não é alterada nem chamada.**
- `relatorios-gerenciais` não é alterada: suas 11 ACs e provas permanecem.
- Não se cria segunda fórmula de CMV.
- Não se formaliza o significado de `PAGO`/`PENDENTE` em despesas.
- Não se cria agregação de comissões.

## Impacto técnico

- **Migration nova** (aditiva, `0014_`): função que devolve os indicadores da
  competência — faturamento, receita líquida e **despesas isoladas** — além de
  reaproveitar `fn_calcular_cmv`, que já existe e não muda.
- `fn_calcular_cmv` **não** é alterada.
- `src/lib/api/dashboard.ts` novo, ou ampliação de `src/lib/api/relatorios.ts`.
  Hoje `relatorios.ts` tem só `getRelatorioCaixa` e `getRelatorioComissao`.
- `src/types.ts`: contrato dos indicadores. Hoje não há tipo `Despesa` e não há
  API de despesas no frontend.
- `src/pages/DashboardPage.tsx`: seletor de competência no lugar da constante
  `new Date().toISOString().slice(0, 7)`, mais os indicadores novos. O alerta de
  estoque negativo e a demonstração de e-mail permanecem.

## Estratégia de testes

- **pgTAP** para as agregações: a lógica vive em função SQL e o padrão já está
  provado duas vezes (`012`, `013`). A prova de `AC-048` a `AC-051` e de `AC-053`
  é no banco.
- **Vitest** para a camada de apresentação: `AC-047`, `AC-052`, `AC-054` e
  `AC-055` tratam de seletor, troca de competência e seções preservadas, e
  seguem o padrão de `refinamento-interface` e `recuperacao-carga`.
- O `@spec:` vai no **título** do teste. Para pgTAP, o título é a descrição da
  asserção (`results_eq`, `is`, `ok`); é ela que o motor `onp-spec verify` lê.
  Tag em comentário não produz prova.
- O `AC-051` precisa de fixture com despesa **e** fechamento de comissão na mesma
  competência, para provar a separação. O padrão existe em `012`.

## Dependências

- `fn_relatorio_caixa` (`0012`) — reutilizada, com intervalo derivado da
  competência.
- `fn_calcular_cmv` (`0011`) — reutilizada sem alteração.
- Tabelas `pagamentos`, `despesas`, `fechamentos_comissao`, `movimentacoes_estoque`,
  `produtos` — todas existentes.
- `auth_helpers.current_salon_id()` — padrão de isolamento por salão já usado.
- **Sem** dependência de `fn_relatorio_comissao`, por decisão de escopo.

## Permissões

`fn_relatorio_caixa` e `fn_calcular_cmv` exigem sessão com `salon_id`; a segunda
não restringe perfil. `fn_relatorio_comissao` restringe a `ADMIN`/`GERENTE` e
**não será chamada** — portanto esta feature não introduz erro de permissão no
dashboard. Registrado porque a verificação é por leitura, não por execução.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| ASM-017 | O intervalo da competência é derivado de forma determinística: dia 1 até o último dia do mês selecionado. | confirmada | Não é suposição de negócio. `0012` já aceita qualquer intervalo; a derivação é aritmética de calendário. |
| ASM-018 | `fn_relatorio_caixa` pode ser reutilizada para obter faturamento e receita líquida da competência. | confirmada | A fórmula (`0012:83,84`) é a que o plano chama de faturamento e receita líquida, e já está provada por `AC-001`/`AC-002` de `relatorios-gerenciais`. |
| ASM-019 | A separação de despesas não exige alteração de `0012`. | confirmada | Extensibilidade aditiva, plano §5.7: nova função em migration nova, `0012` intacta. Decisão B2. |
| ASM-020 | A demonstração de e-mail deve permanecer visível. | confirmada | D6: investigada, é demonstração sem integração (`v2_5:1097`). **Mantida** por decisão do dono, não por ser funcionalidade. |

## Perguntas em aberto

Nenhuma pergunta bloqueia a execução.

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| Q-017 | "Sem movimento no período" (`AC-053`): o valor apurado e o aviso de período vazio são estados mutuamente exclusivos? | respondida | Decisão do dono nesta rodada: quando não há dado, o indicador **informa**; não exibe `R$ 0,00` como se fosse valor apurado. Os dois estados não coexistem. |
| Q-018 | A demonstração de e-mail deve ser removida agora que foi classificada? | respondida | **Não.** Mantida e documentada como demonstração. Remover é decisão de produto futura. |

## Resumo executivo (para auditoria)

Uma feature de produto, com escopo deliberadamente menor que o do plano. Entrega
quatro das sete métricas do §16 — Faturamento, Receita líquida, CMV, Despesas —
sobre **competência mensal selecionável**, preservando o alerta de estoque
negativo e a demonstração de e-mail. Não toca `0012`, `0013` nem
`relatorios-gerenciais`. Comissões, Resultado líquido e Margem ficam para
features posteriores, porque dependem de decisões de produto que não existem.
9 critérios de aceite, todos verificáveis: 4 por pgTAP, 4 por Vitest, 1 por
ambos.
