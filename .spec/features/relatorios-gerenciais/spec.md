# Spec: Relatórios gerenciais

> feature: relatorios-gerenciais
> status: rascunho

<!--
  Como ler este arquivo (o formato é verificado por `onp-spec audit`):
  - US-xxx = história de usuário · AC-xxx = critério de aceite
    ASM-xxx = suposição · Q-xxx = pergunta em aberto
    São códigos de rastreio: ligam a especificação às tarefas e aos testes.
  - Toda história de usuário precisa de pelo menos um critério de aceite.
  - Todo critério de aceite precisa de Dado/Quando/Então completos.
  - Os códigos são únicos no projeto inteiro (nunca reutilize um número).
  - Suposições e Perguntas em aberto são OBRIGATÓRIAS: se não houver nenhuma,
    escreva "Nenhuma." — mas desconfie: quase toda feature esconde uma.
-->

## Contexto

### Fatos usados como base

- O plano da Fase 4 prevê dois relatórios: fechamento de caixa e comissão por profissional.
- O relatório de caixa deve aceitar um intervalo de datas; o relatório de comissão deve aceitar competência e profissional.
- O plano prevê funções SQL, API em `src/lib/api/relatorios.ts`, páginas próprias e integração das páginas ao `App.tsx`.
- Para o caixa, o plano indica `paid_at` nos pagamentos e `data_pagamento` nas despesas como momentos financeiros; o plano também menciona `closed_at` nos fechamentos de comissão.
- A prática atual do projeto é retornar os registros disponíveis, sem paginação própria nas APIs.

### Inferência de implementação

- Os totais e detalhamentos serão calculados no banco e consumidos pela API, mantendo a mesma convenção de segurança das funções SQL existentes.
- As páginas reutilizarão os padrões atuais de formulário, tabela/card e tratamento visual de resultado.

### Decisões ainda abertas

- A regra exata de saldo inicial/final do caixa e a forma de tratar estornos precisam ser confirmadas antes da implementação.
- A inclusão de ajustes e adiantamentos no relatório de comissão precisa ser definida.
- A política de acesso por perfil e o limite de competência por fuso horário precisam ser confirmados.

## Histórias

### US-001 — Gerente consulta o fechamento de caixa por intervalo

Como gerente, quero consultar o fechamento de caixa em um intervalo de datas, para acompanhar as entradas, saídas e o saldo do salão.

#### AC-001 — O relatório apresenta o total de vendas do intervalo

- **Dado** pagamentos com `paid_at` dentro do intervalo selecionado
- **Quando** o gerente solicita o relatório de caixa
- **Então** o relatório apresenta `total_vendas` igual à soma de `valor_bruto` desses pagamentos

#### AC-002 — O relatório apresenta o total de entradas do intervalo

- **Dado** pagamentos com `paid_at` dentro do intervalo selecionado
- **Quando** o gerente solicita o relatório de caixa
- **Então** o relatório apresenta `total_entradas` igual à soma de `valor_liquido` desses pagamentos

#### AC-003 — O relatório apresenta o total de saídas do intervalo

- **Dado** despesas com `data_pagamento` e fechamentos de comissão com `closed_at` dentro do intervalo selecionado
- **Quando** o gerente solicita o relatório de caixa
- **Então** o relatório apresenta `total_saidas` igual à soma de `valor` das despesas mais a soma de `total_pago` dos fechamentos de comissão

#### AC-004 — O relatório apresenta o saldo inicial

- **Dado** o intervalo selecionado com data de início e data de fim
- **Quando** o gerente solicita o relatório de caixa
- **Então** o relatório apresenta `saldo_inicial` igual ao total de entradas menos o total de saídas até o dia antes do início do intervalo, onde entradas são a soma de `valor_liquido` dos pagamentos com `paid_at` < início e saídas são a soma de `valor` das despesas com `data_pagamento` < início mais a soma de `total_pago` dos fechamentos de comissão com `closed_at` < início. Se não houver registros, o valor é `0`.

#### AC-005 — O relatório apresenta o saldo final

- **Dado** o `saldo_inicial`, `total_entradas` e `total_saidas` do intervalo selecionado
- **Quando** o gerente solicita o relatório de caixa
- **Então** o relatório apresenta `saldo_final` igual a `saldo_inicial + total_entradas - total_saidas`

### US-002 — Gerente consulta a comissão por profissional e competência

Como gerente, quero consultar as comissões de um profissional em uma competência, para conferir o detalhamento e os totais antes do fechamento.

#### AC-006 — O relatório apresenta o detalhamento das comissões

- **Dado** comandas finalizadas do profissional com itens de comissão na competência selecionada
- **Quando** o gerente solicita o relatório de comissão
- **Então** o relatório apresenta uma linha por item com `comanda_id`, número, nome do cliente, tipo do item, descrição, quantidade, preço unitário, total, percentual de comissão e valor de comissão

#### AC-007 — O relatório apresenta o total bruto da competência

- **Dado** os itens de comissão elegíveis do profissional na competência selecionada
- **Quando** o gerente solicita o relatório de comissão
- **Então** o relatório apresenta `total_bruto` igual à soma dos totais desses itens

#### AC-008 — O relatório apresenta o total de comissão da competência

- **Dado** os itens de comissão elegíveis do profissional na competência selecionada
- **Quando** o gerente solicita o relatório de comissão
- **Então** o relatório apresenta `total_comissao` igual à soma dos `comissao_valor_snapshot` desses itens, sem incluir ajustes ou adiantamentos até que Q-002 seja respondida

### US-003 — Gerente filtra e visualiza os relatórios na interface

Como gerente, quero aplicar filtros e visualizar os resultados dos relatórios, para usar as informações sem consultar o banco diretamente.

#### AC-009 — A interface filtra o relatório de caixa

- **Dado** que o gerente está na página de fechamento de caixa
- **Quando** informa data inicial, data final e aciona o filtro
- **Então** a página exibe os resultados correspondentes ao intervalo informado

#### AC-010 — A interface filtra o relatório de comissão

- **Dado** que o gerente está na página de comissão por profissional
- **Quando** seleciona competência, seleciona um profissional e aciona o filtro
- **Então** a página exibe o detalhamento e os totais correspondentes à seleção

#### AC-011 — A interface informa quando não há dados

- **Dado** que não existe registro elegível para os filtros informados
- **Quando** o gerente solicita um relatório
- **Então** a página exibe uma mensagem informativa de ausência de dados e não apresenta totais como se houvesse resultado

## Fora de escopo

- Exportação dos relatórios em CSV ou PDF.
- Agendamento ou envio dos relatórios por e-mail.
- Alteração das regras de fechamento financeiro ou de comissão.
- Criação de paginação nova para as APIs nesta fase.
- Implementação de documentos fiscais ou retenções que não façam parte da comissão informada na fonte.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| ASM-001 | `saldo_inicial` é o total de entradas menos o total de saídas até o dia antes do início do intervalo (conforme resposta de Q-001). | confirmada | Q-001 |
| ASM-002 | Até decisão em contrário, as APIs dos relatórios mantêm a prática atual de retornar todos os registros disponíveis, sem paginação própria. | aberta | — |
| ASM-003 | total_comissao representa a soma dos valores de comissão dos itens, incluindo ajustes e adiantamentos (conforme resposta de Q-002). | confirmada | Q-002 |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| Q-001 | O relatório de caixa deve manter `saldo_inicial` e `saldo_final`? Em caso positivo, qual regra deve valer: fechamento anterior `FECHADO`, acumulado anterior ao intervalo ou outra regra? | respondida | Sim, o relatório de caixa deve manter saldo_inicial e saldo_final. Regra: saldo_inicial é o total de entradas menos o total de saídas até o dia antes do início do intervalo. saldo_final é o total de entradas menos o total de saídas até o fim do intervalo. Equivalentemente: saldo_inicial = (total de entradas até inicio-1) - (total de saídas até inicio-1); saldo_final = (total de entradas até fim) - (total de saídas até fim). |
| Q-002 | Ajustes e adiantamentos de comissão devem aparecer no relatório? Se sim, devem ser linhas detalhadas, compor apenas `total_comissao` ou ambos? | respondida | Ambos: devem aparecer como linhas detalhadas (quando existirem) e também compor o total_comissao (total_comissao = soma dos comissao_valor_snapshot - total de adiantamentos + total de ajustes, limitado a não negativo). |
| Q-003 | Estornos totais e parciais de pagamento devem excluir o pagamento, reduzir `valor_bruto`/`valor_liquido` ou aparecer em uma coluna separada? | respondida | Estornos totais excluem o pagamento (não são considerados). Estornos parciais são refletidos no valor_liquido (já descontado), portanto não aparecem em uma coluna separada. |
| Q-004 | Qual fuso horário e qual regra de início/fim definem a competência mensal e os intervalos financeiros? | respondida | Utilizamos o fuso horário do salão (America/Sao_Paulo). Para os intervalos, consideramos a data (sem hora) no fuso horário do salão. Para agrupamento por mês, usamos to_char(campo_data, 'YYYY-MM') e para filtros de intervalo usamos campo_data::date, ambos no fuso horário do salão. |
| Q-005 | Quais perfis podem acessar cada relatório e qual deve ser o comportamento de `PROFISSIONAL` no relatório de caixa? | respondida | Apenas os perfis ADMIN e GERENTE podem acessar o relatório de caixa. O perfil PROFISSIONAL não tem acesso a este relatório. |
| Q-006 | O relatório de comissão deve incluir apenas comissões já processadas, apenas não processadas ou ambos os estados? | respondida | Apenas comissões não processadas (comissao_processada = false), pois o relatório tem como objetivo conferir o detalhamento e os totais antes do fechamento (conforme US-002). |
