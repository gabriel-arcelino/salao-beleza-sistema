# Tasks: Refinamento de interface

> feature: refinamento-interface

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

## T-001 — Padronizar labels e separação visual nos formulários das páginas de cadastro [pendente]
- Refs: US-001, AC-001, AC-002
- Arquivos: src/pages/LoginPage.tsx, src/pages/ProfissionaisPage.tsx, src/pages/ClientesPage.tsx, src/pages/ServicosPage.tsx, src/pages/ProdutosPage.tsx, src/pages/ConfigComissoesPage.tsx
- Notas: garantir `label` associado (`htmlFor` ou aninhado) em todos os inputs de cadastro; adicionar separação visual verificável (`marginBottom`, `borderBottom` ou `Card`) entre formulário e conteúdo abaixo. Nenhum componente obrigatório; se `FormField` for criado, deve respeitar AC-001 e AC-002.

## T-002 — Padronizar estados vazios com componente `EmptyState` [pendente]
- Refs: US-002, AC-003, AC-004
- Arquivos: src/pages/ClientesPage.tsx, src/pages/ComandasPage.tsx, src/pages/ConfigComissoesPage.tsx, src/pages/RelatorioEstoquePage.tsx, src/pages/RelatorioCaixaPage.tsx, src/pages/RelatorioComissaoPage.tsx
- Notas: utilizar `EmptyState` com `message` configurada quando a lista/resultado estiver vazio; não remover `EmptyState` de `RelatorioEstoquePage` se já existir, apenas garantir que use o componente.

## T-003 — Definir destaque visual para ações primárias e destrutivas [pendente]
- Refs: US-003, AC-005, AC-006
- Arquivos: src/pages/LoginPage.tsx, src/pages/ProfissionaisPage.tsx, src/pages/ClientesPage.tsx, src/pages/ServicosPage.tsx, src/pages/ProdutosPage.tsx, src/pages/ConfigComissoesPage.tsx, src/pages/ComandasPage.tsx, src/pages/RelatorioCaixaPage.tsx, src/pages/RelatorioComissaoPage.tsx
- Notas: aplicar variante visual distinta para botões primários (`Cadastrar`, `Salvar`, `Filtrar`, `Abrir comanda`, `Fechar comanda`) e destrutivos (`Desativar`, `Cancelar`, `Zerar`). Se `Button` reutilizável for criado, deve respeitar AC-005 e AC-006.

## T-004 — Melhorar hierarquia tipográfica e composição [pendente]
- Refs: US-004, AC-007, AC-008
- Arquivos: src/pages/DashboardPage.tsx, src/App.tsx, src/pages/*.tsx (todas as páginas com título `h1`/`h2`)
- Notas: garantir que títulos principais (`h1`/`h2`) utilizem `fontSize` maior que `FONT_SIZE_BODY`; garantir separação visual entre seções (formulário, conteúdo) por `marginTop`/`marginBottom`, `Card` ou `borderBottom`.

## T-005 — Melhorar navegação com indicador visual e semântico [pendente]
- Refs: US-005, AC-009
- Arquivos: src/App.tsx
- Notas: adicionar `aria-current="page"` à aba ativa e pelo menos um indicador visual adicional (`borderBottom`, `backgroundColor` distinta, etc.). Nenhuma alteração funcional de navegação.

## T-006 — Preservar semântica de acessibilidade e labels [pendente]
- Refs: US-006, AC-010, AC-011
- Arquivos: src/ui/components/EmptyState.tsx, src/ui/components/Loading.tsx, src/ui/components/ErrorMessage.tsx, todas as páginas com inputs
- Notas: garantir que `EmptyState`, `Loading` e `ErrorMessage` mantenham `role` e `aria-live`; garantir `id`/`htmlFor` em todos os labels associados. Nenhuma alteração funcional.

## T-007 — Verificação e auditoria final [pendente]
- Refs: AC-001, AC-002, AC-003, AC-004, AC-005, AC-006, AC-007, AC-008, AC-009, AC-010, AC-011
- Arquivos: .spec/features/refinamento-interface/spec.md, .spec/verification/refinamento-interface.json (gerado automaticamente pelo `onp-spec verify`)
- Notas: rodar `npm run build`, `npm run lint` e testes de interface; registrar evidência; não marcar nenhuma tarefa como concluída sem prova PASS; não alterar `spec.md`, `inventario.md`, código legado, testes, `package.json` ou outros arquivos não relacionados.
