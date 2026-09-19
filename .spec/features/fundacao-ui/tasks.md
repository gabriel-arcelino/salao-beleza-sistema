# Tasks: Fundacao ui

> feature: fundacao-ui

## T-006 — Inventariar padrões visuais e de acesso atuais [concluída]
- Arquivos: .spec/features/fundacao-ui/inventario.md
- Notas: atividade de inventário já realizada; resultado documentado em inventario.md. Nenhum arquivo em src/ modificado. Não criar tarefas artificiais para código legado não alterado.

## T-007 — Fundação de tokens visuais [pendente]
- Refs: US-004, AC-012
- Arquivos: src/ui/tokens/colors.ts, src/ui/tokens/typography.ts, src/ui/tokens/spacing.ts
- Notas: definir constantes TypeScript para cores, tipografia e espaçamento; preservar arquitetura atual sem bibliotecas externas.

## T-008 — Componentes reutilizáveis de estado [pendente]
- Refs: US-005, AC-014, AC-015, AC-016, AC-017
- Arquivos: src/ui/components/Loading.tsx, src/ui/components/EmptyState.tsx, src/ui/components/ErrorMessage.tsx, src/ui/components/Card.tsx
- Notas: componentes simples, com propriedades configuráveis; sem dependências externas. Button e FormField não fazem parte desta task.

## T-009 — Integração no Dashboard [pendente]
- Refs: US-004, AC-013, US-005, AC-014, AC-015, US-006, AC-018, AC-019
- Arquivos: src/pages/DashboardPage.tsx
- Notas: aplicar tokens e componentes reutilizáveis no Dashboard; preservar contratos `getProdutosEstoqueNegativo()` e `calcularCMV()`; adicionar identificação e foco em elementos interativos.

## T-010 — Testes automatizados [pendente]
- Refs: AC-012, AC-013, AC-014, AC-015, AC-016, AC-017, AC-018, AC-019
- Arquivos: tests/ui/DashboardStates.test.tsx
- Notas: Vitest + Testing Library + jsdom; validar tokens, componentes de estado, card e acessibilidade básica no Dashboard; não alterar testes pgTAP existentes.

## T-011 — Verificação e auditoria final [pendente]
- Refs: AC-012, AC-013, AC-014, AC-015, AC-016, AC-017, AC-018, AC-019
- Notas: rodar `npm run build`, `npm run lint` e testes de interface; registrar evidência; `.spec/verification/fundacao-ui.json` é gerado automaticamente pelo `onp-spec verify` (não é arquivo de implementação); não marcar nenhuma task como concluída sem prova PASS; não alterar `spec.md`, `inventario.md`, código legado, testes, `package.json` ou outros arquivos não relacionados.
