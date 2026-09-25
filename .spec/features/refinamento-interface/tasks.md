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

## T-001 — Padronizar labels e separação estrutural nos formulários [pendente]
- Refs: US-001, AC-001, AC-002
- Arquivos: src/pages/LoginPage.tsx, src/pages/ProfissionaisPage.tsx, src/pages/ClientesPage.tsx, src/pages/ServicosPage.tsx, src/pages/ProdutosPage.tsx, src/pages/ConfigComissoesPage.tsx, src/pages/ComandasPage.tsx
- Notas: cobrir AC-001 em Login, Profissionais, Clientes, Serviços, Produtos e Configuração de Comissão, garantindo label associado por `htmlFor` + `id` ou aninhamento válido. Em Profissionais, Clientes, Serviços, Produtos e Comandas, criar contêiner estrutural explícito para o conteúdo posterior e aplicar separação visual por `Card`, borda ou `marginTop >= SPACING_LG`; `marginBottom` apenas no `<form>` é insuficiente. A prova mecânica e a validação visual humana permanecem distintas. `FormField` não será criado.

## T-002 — Padronizar estados vazios com componente `EmptyState` [pendente]
- Refs: US-002, AC-003, AC-004
- Arquivos: src/pages/ProfissionaisPage.tsx, src/pages/ClientesPage.tsx, src/pages/ServicosPage.tsx, src/pages/ProdutosPage.tsx, src/pages/ConfigComissoesPage.tsx, src/pages/ComandasPage.tsx, src/pages/RelatorioEstoquePage.tsx, src/pages/RelatorioCaixaPage.tsx, src/pages/RelatorioComissaoPage.tsx
- Notas: usar `EmptyState` com `message` configurada em Profissionais, Clientes, Serviços, Produtos, Configuração de Comissão, Comandas, Relatório de Estoque, Fechamento de Caixa e Comissão por Profissional. A cobertura deve incluir a substituição de listas vazias e mensagens simples pelo componente padronizado, sem alterar seu contrato.

## T-003 — Criar `Button` reutilizável e aplicar variantes de ação [pendente]
- Refs: US-003, AC-005, AC-006
- Arquivos: src/ui/components/Button.tsx, src/pages/LoginPage.tsx, src/pages/ProfissionaisPage.tsx, src/pages/ClientesPage.tsx, src/pages/ServicosPage.tsx, src/pages/ProdutosPage.tsx, src/pages/ConfigComissoesPage.tsx, src/pages/ComandasPage.tsx, src/pages/RelatorioCaixaPage.tsx, src/pages/RelatorioComissaoPage.tsx
- Notas: criar `src/ui/components/Button.tsx` como componente reutilizável com as variantes `primary`, `neutral` e `destructive`. Aplicar `variant="primary"` às ações primárias (AC-005) e `variant="destructive"` às ações destrutivas (AC-006), mantendo `destructive` distinta de `neutral` e `primary`. Nenhuma propriedade CSS específica nem `style` inline é obrigatório.

## T-004 — Melhorar hierarquia tipográfica e composição [pendente]
- Refs: US-004, AC-007, AC-008
- Arquivos: src/ui/tokens/typography.ts, src/pages/DashboardPage.tsx, src/App.tsx, src/pages/*.tsx
- Notas: definir `FONT_SIZE_HEADING = "1.5rem"` em `src/ui/tokens/typography.ts` e usar `FONT_HEADING` e `FONT_SIZE_HEADING` em todos os títulos principais; o valor `"1.5rem"` não pode ser usado diretamente sem o token. Estruturar os grupos explicitamente e aplicar separação visual entre eles por `Card`, borda ou `marginTop`/`marginBottom >= SPACING_MD`; o `gap` interno do formulário não satisfaz AC-008 isoladamente.

## T-005 — Melhorar navegação com indicador visual e semântico [pendente]
- Refs: US-005, AC-009
- Arquivos: src/App.tsx
- Notas: aplicar `aria-current="page"` à aba ativa, preservando `fontWeight: "bold"`, e usar `borderBottom` com `COLOR_PRIMARY` como indicador visual. Nenhuma alteração funcional de navegação.

## T-006 — Preservar semântica de acessibilidade e labels [pendente]
- Refs: US-006, AC-010, AC-011
- Arquivos: src/ui/components/EmptyState.tsx, src/ui/components/Loading.tsx, src/ui/components/ErrorMessage.tsx, src/pages/LoginPage.tsx, src/pages/ProfissionaisPage.tsx, src/pages/ClientesPage.tsx, src/pages/ServicosPage.tsx, src/pages/ProdutosPage.tsx, src/pages/ConfigComissoesPage.tsx, src/pages/ComandasPage.tsx
- Notas: preservar, sem alterar os contratos dos componentes existentes, `role` e `aria-live` de `EmptyState`, `Loading` e `ErrorMessage` (AC-010). Garantir `id` único em cada controle associado; quando `htmlFor` for usado, ele deve apontar para o `id` correspondente, mantendo label aninhado como estratégia válida (AC-011). Nenhuma alteração funcional.

## T-007 — Verificação final de todos os critérios de aceite [pendente]
- Refs: AC-001, AC-002, AC-003, AC-004, AC-005, AC-006, AC-007, AC-008, AC-009, AC-010, AC-011
- Arquivos: .spec/features/refinamento-interface/spec.md, .spec/verification/refinamento-interface.json (gerado automaticamente pelo `onp-spec verify`)
- Notas: executar a verificação final de AC-001 a AC-011 com os comandos e testes existentes, registrar as provas e executar `onp-spec audit --ci`. Não marcar tarefas como concluídas sem prova PASS; manter a validação visual humana distinta da prova mecânica e não criar testes apenas para satisfazer o gate.
