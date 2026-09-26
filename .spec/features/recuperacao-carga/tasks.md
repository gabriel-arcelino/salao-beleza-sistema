# Tasks: Recuperacao de carga

> feature: recuperacao-carga

<!--
  Como ler este arquivo (o formato é verificado por `onp-spec audit`):
  - T-xxx = tarefa (código de rastreio, único no projeto inteiro).
  - Toda tarefa referencia em `Refs:` pelo menos uma história de usuário
    (US-xxx) ou critério de aceite (AC-xxx).
  - Toda tarefa lista os arquivos que cria/altera em `Arquivos:` — é o que
    decide o paralelismo por arquivos disjuntos.
  - Status: pendente | em-andamento | concluida
    (atalho: `onp-spec tarefa <feature> <T-xxx> <status>`)
-->

## T-025 — Dar ao componente de erro uma ação de tentar novamente [concluida]
- Refs: US-019, AC-042, AC-043, AC-045
- Arquivos: src/ui/components/ErrorMessage.tsx, src/pages/DashboardPage.tsx, tests/ui/recuperacao-carga.spec.tsx
- Notas: adicionar a prop **opcional** `onRetry?: () => void` em `ErrorMessage`. Sem a prop, o componente renderiza exatamente como hoje — `role="alert"`, `aria-live="assertive"` e a mensagem no DOM — para não regredir `AC-040`/`AC-018`. Com a prop, renderiza também um controle "Tentar novamente" que chama `onRetry`; o texto literal "Tentar novamente" é exigido por AC-042. Reaproveitar `Button` em vez de `<button>` cru, para não introduzir um terceiro estilo de botão. Migrar o Dashboard, que é a página onde a falha foi observada, de forma a passar a carga como `onRetry`. Não alterar `Loading` nem `EmptyState`. Sem estado novo de "carregando" na nova tentativa: a carga original já expõe seu próprio estado.

## T-026 — Oferecer a recuperação em todas as páginas que carregam dados [concluida]
- Refs: US-019, AC-044
- Arquivos: src/pages/ClientesPage.tsx, src/pages/ProfissionaisPage.tsx, src/pages/ServicosPage.tsx, src/pages/ProdutosPage.tsx, src/pages/ConfigComissoesPage.tsx, src/pages/ComandasPage.tsx, src/pages/RelatorioEstoquePage.tsx, src/pages/RelatorioCaixaPage.tsx, src/pages/RelatorioComissaoPage.tsx, tests/ui/recuperacao-carga.spec.tsx
- Notas: as dez páginas restantes renderizam hoje o erro como `<p style={{ color: "crimson" }}>` e não têm recuperação. Substituir por `ErrorMessage` com `onRetry` passando a função de carga da própria página. Usar `ErrorMessage` em vez de um botão duplicado em cada arquivo é decisão de projeto: um mecanismo só, sem duplicação, e semântica uniforme já validada por `AC-040`. Não alterar assinaturas de `src/lib/api/`, estado interno das páginas além do necessário, nem a quantidade de chamadas da carga inicial — a nova chamada só pode ocorrer por ação do usuário. Não tocar em regras de negócio, RPCs, RLS, banco ou autenticação.
