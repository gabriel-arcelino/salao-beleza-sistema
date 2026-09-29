# Spec: Baseline do código legado

> feature: legado-baseline
> status: auditada

## Contexto

Este projeto foi iniciado antes da adoção do processo onp-spec-driven.

As Fases 1–4 foram implementadas sem a rastreabilidade formal de SPEC → AC → TASK → teste do ONP. Esses arquivos continuam sendo código válido do sistema e não serão reescritos apenas para reconstruir um histórico que não existiu.

Esta feature registra o ponto de adoção do processo e estabelece o conjunto de arquivos de código pré-ONP que será tratado como baseline.

O baseline não representa uma nova funcionalidade de negócio e não redefine o comportamento desses arquivos. Seu objetivo é preservar a rastreabilidade mínima necessária para que o audit do ONP possa distinguir código legado de código criado sob o processo.

## Histórias

### US-007 — Adotar o código existente ao processo ONP

Como responsável pelo desenvolvimento do sistema, quero registrar explicitamente o código existente antes da adoção do ONP, para que a introdução do processo não exija reconstruir artificialmente o histórico das Fases 1–4.

#### AC-020 — Código pré-ONP registrado como baseline

* **Dado** que o sistema possuía código-fonte antes da adoção do processo ONP
* **Quando** o projeto for auditado pelo ONP
* **Então** cada arquivo de implementação existente antes do ponto de adoção deve estar explicitamente registrado na task de baseline, enquanto novos arquivos criados após a adoção continuam sujeitos ao fluxo normal SPEC → AC → TASK → teste.

A task de baseline registra somente rastreabilidade de arquivos pré-existentes; ela não declara novos requisitos de produto nem altera regras de negócio.

## Decisão de encerramento (2026-09-29)

**Decisão do responsável pelo produto: o baseline está completo ecumpre a função de rastreabilidade; a feature é encerrada.**

`T-012` foi executada: a lista de arquivos pré-adoção passou de 19 para **22**, cobrindo exatamente os 22 arquivos `.ts/.tsx` do primeiro commit do repositório (`aefaebc`, ponto de adoção). Antes da correção faltavam `src/App.tsx`, `src/pages/DashboardPage.tsx` e `src/types.ts` — o AC-020 exige completude, e a lista estava incompleta apesar de o teste passar.

**O status sobe para `auditada`.** ASM-009 e ASM-010 estão `confirmada` e Q-009 `respondida`, então a promoção não introduz `ASM_ABERTA` nem `Q_ABERTA`.

**Limitação que permanece, registrada:** `tests/processo/legado-baseline.spec.ts` assere **uma direção apenas** — que os arquivos listados existam. A completude (todo pré-ONP listado) é garantida pela lista e verificada por medição nesta data, **não por asserção de teste**. Um teste dedicado seria trabalho futuro.

## Fora de escopo

* Reconstrução das especificações históricas das Fases 1–4.
* Alteração do comportamento do código legado.
* Refatoração de arquivos apenas para satisfazer o ONP.
* Criação de novos requisitos de negócio para justificar arquivos existentes.
* Mudança nas APIs, RLS, RPCs, migrations ou contratos existentes.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| ASM-009 | As Fases 1–4 representam código pré-ONP válido que deve ser preservado. | confirmada | O sistema e seus testes existentes foram mantidos como baseline. |
| ASM-010 | O ponto de adoção começa com a Fase 5. | confirmada | A Fase 5 (fundacao-ui) é a primeira feature planejada sob o fluxo ONP. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| Q-009 | O código pré-ONP precisa ser reespecificado antes de novas features? | respondida | Não. O baseline registra a proveniência e a rastreabilidade mínima; novas mudanças seguem o fluxo ONP. |
