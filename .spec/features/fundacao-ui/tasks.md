# Tasks: Fundacao ui

> feature: fundacao-ui

## T-006 — Inventariar padrões visuais e de acesso atuais [em-andamento]
- Refs: US-004, AC-012, AC-013, AC-014, AC-015
- Arquivos: .spec/features/fundacao-ui/inventario.md (criado — evidência T-006); nenhum arquivo de código alterado
- Notas: registrar os estilos inline existentes em App.tsx, DashboardPage.tsx e main.tsx; documentar o que já existe (cores, fontes, espaçamento) para definir o que falta. Não criar tarefas artificiais para arquivos legados não modificados.

## T-007 — Criar tokens visuais mínimos [pendente]
- Refs: US-004, AC-012
- Arquivos: src/ui/tokens/colors.ts, src/ui/tokens/typography.ts, src/ui/tokens/spacing.ts (futuro — ainda não existe)
- Notas: definir constantes TypeScript para cores principais, tamanho de fonte base e unidades de espaçamento. Preservar a abordagem atual sem introduzir CSS-in-JS pesado ou bibliotecas externas.

## T-008 — Criar componentes reutilizáveis de estado [pendente]
- Refs: US-005, AC-017
- Arquivos: src/ui/components/Card.tsx, src/ui/components/Loading.tsx, src/ui/components/EmptyState.tsx, src/ui/components/ErrorMessage.tsx, src/ui/components/FormField.tsx (futuro — ainda não existe)
- Notas: cada componente aceita propriedades de texto configuráveis; sem dependências externas; usado real no Dashboard.

## T-009 — Integrar fundação no Dashboard [pendente]
- Refs: US-004, AC-012, AC-013, AC-014, AC-015, AC-016, US-006, AC-018
- Arquivos: src/pages/DashboardPage.tsx (futuro — ainda não alterado); src/App.tsx (não alterado — preservado)
- Notas: aplicar tokens, componentes de estado e acessibilidade básica no Dashboard; preservar contratos getProdutosEstoqueNegativo() e calcularCMV() sem alteração.

## T-010 — Adicionar testes de interface para estados do Dashboard [pendente]
- Refs: US-005, AC-017, US-004, AC-013, AC-014, AC-015
- Arquivos: tests/ui/DashboardStates.test.tsx (futuro — ainda não criado)
- Notas: usar Vitest + Testing Library + jsdom; verificar loading, vazio, erro e renderização dos tokens visuais; não alterar testes pgTAP existentes.

## T-011 — Executar verificação e audit da fundação [pendente]
- Refs: US-004, US-005, US-006, AC-012, AC-013, AC-014, AC-015, AC-016, AC-017, AC-018
- Arquivos: .spec/verification/fundacao-ui.json (futuro — ainda não criado); .spec/features/fundacao-ui/tasks.md (futuro — ainda não atualizado)
- Notas: rodar npm run build, npm run lint, testes de interface; registrar evidência; não marcar nenhuma tarefa como concluída sem prova PASS.




