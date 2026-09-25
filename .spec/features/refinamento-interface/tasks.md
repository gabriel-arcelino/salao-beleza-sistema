# Tasks: Refinamento de interface

> feature: refinamento-interface

<!--
  Como ler este arquivo (o formato é verificado por `onp-spec audit`):
  - T-xxx = tarefa (código de rastreio, único no projeto inteiro).
  - Toda tarefa referencia em `Refs:` pelo menos uma história de usuário
    (US-xxx) ou critério de aceite (AC-xxx).
  - Toda tarefa de implementação lista os arquivos que cria/altera em
    `Arquivos:` — é o que decide o paralelismo por arquivos disjuntos.
  - Tarefas somente de verificação podem omitir `Arquivos:` para que o motor
    as execute sequencialmente após as ondas de implementação.
  - Campos opcionais por tarefa, usados pelo plano de execução:
    `- Modelo: claude-sonnet-5` e `- Esforço: alto` (baixo|medio|alto|xalto|max).
  - Uma tarefa só pode virar [concluida] quando os critérios de aceite dela
    tiverem prova PASS registrada por `onp-spec verify`.
  Status: pendente | em-andamento | concluida
    (atalho: `onp-spec tarefa <feature> <T-xxx> <status>`)
-->

## T-019 — Implementar labels e separação estrutural nos formulários [concluida]
- Refs: US-013, AC-031, AC-032, AC-041
- Arquivos: src/pages/LoginPage.tsx, src/pages/ProfissionaisPage.tsx, src/pages/ClientesPage.tsx, src/pages/ServicosPage.tsx, src/pages/ProdutosPage.tsx, src/pages/ConfigComissoesPage.tsx, src/pages/ComandasPage.tsx, tests/ui/refinamento-interface-formularios.spec.tsx
- Notas: implementar AC-031 e AC-041 em Login, Profissionais, Clientes, Serviços, Produtos, Configuração de Comissão e Comandas: cada controle associado deve ter `id` único; usar `htmlFor` quando essa estratégia for escolhida e manter label aninhado com texto visível como alternativa válida. Em Profissionais, Clientes, Serviços, Produtos e Comandas, criar contêiner estrutural explícito para o conteúdo posterior e aplicar uma diferenciação visual persistente por `Card` ou borda explícita; `marginTop >= SPACING_LG` pode complementar, mas não pode ser o único mecanismo visual. `marginBottom` apenas no `<form>` é insuficiente. A prova mecânica e a validação visual humana permanecem distintas. `FormField` não será criado.

## T-020 — Padronizar estados vazios com componente `EmptyState` [concluida]
- Refs: US-014, AC-033, AC-034
- Arquivos: src/pages/ProfissionaisPage.tsx, src/pages/ClientesPage.tsx, src/pages/ServicosPage.tsx, src/pages/ProdutosPage.tsx, src/pages/ConfigComissoesPage.tsx, src/pages/ComandasPage.tsx, src/pages/RelatorioEstoquePage.tsx, src/pages/RelatorioCaixaPage.tsx, src/pages/RelatorioComissaoPage.tsx, tests/ui/refinamento-interface-empty-state.spec.tsx
- Notas: usar `EmptyState` com `message` configurada em Profissionais, Clientes, Serviços, Produtos, Configuração de Comissão, Comandas, Relatório de Estoque, Fechamento de Caixa e Comissão por Profissional. A cobertura deve incluir a substituição de listas vazias e mensagens simples pelo componente padronizado, sem alterar seu contrato.

## T-021 — Criar `Button` reutilizável e aplicar variantes de ação [concluida]
- Refs: US-015, AC-035, AC-036
- Arquivos: src/ui/components/Button.tsx, src/pages/LoginPage.tsx, src/pages/ProfissionaisPage.tsx, src/pages/ClientesPage.tsx, src/pages/ServicosPage.tsx, src/pages/ProdutosPage.tsx, src/pages/ConfigComissoesPage.tsx, src/pages/ComandasPage.tsx, src/pages/RelatorioEstoquePage.tsx, src/pages/RelatorioCaixaPage.tsx, src/pages/RelatorioComissaoPage.tsx, tests/ui/refinamento-interface-button.spec.tsx
- Notas: criar `src/ui/components/Button.tsx` como componente reutilizável com as variantes `primary`, `neutral` e `destructive`. Aplicar `variant="primary"` às ações primárias (AC-035) e `variant="destructive"` às ações destrutivas (AC-036), mantendo `destructive` distinta de `neutral` e `primary`. Nenhuma propriedade CSS específica nem `style` inline é obrigatório.

## T-022 — Melhorar hierarquia tipográfica e composição [concluida]
- Refs: US-016, AC-037, AC-038
- Arquivos: src/ui/tokens/typography.ts, src/pages/DashboardPage.tsx, src/pages/LoginPage.tsx, src/pages/ProfissionaisPage.tsx, src/pages/ClientesPage.tsx, src/pages/ServicosPage.tsx, src/pages/ProdutosPage.tsx, src/pages/ConfigComissoesPage.tsx, src/pages/ComandasPage.tsx, src/pages/RelatorioEstoquePage.tsx, src/pages/RelatorioCaixaPage.tsx, src/pages/RelatorioComissaoPage.tsx, tests/ui/refinamento-interface-tipografia.spec.tsx
- Notas: definir `FONT_SIZE_HEADING = "1.5rem"` em `src/ui/tokens/typography.ts` e usar `FONT_HEADING` e `FONT_SIZE_HEADING` nos títulos principais dos arquivos listados; o valor `"1.5rem"` não pode ser usado diretamente sem o token. Estruturar os grupos explicitamente e aplicar separação visual entre eles por `Card`, borda ou `marginTop`/`marginBottom >= SPACING_MD`; o `gap` interno do formulário não satisfaz AC-038 isoladamente.

## T-023 — Melhorar navegação com indicador visual e semântico [pendente]
- Refs: US-017, AC-039
- Arquivos: src/App.tsx, tests/ui/refinamento-interface-navegacao.spec.tsx
- Notas: aplicar `aria-current="page"` à aba ativa, preservando `fontWeight: "bold"`, e usar `borderBottom` com `COLOR_PRIMARY` como indicador visual. Nenhuma alteração funcional de navegação.

## T-024 — Verificar AC-040 e executar a verificação final de todos os critérios de aceite [pendente]
- Refs: US-018, AC-031, AC-032, AC-033, AC-034, AC-035, AC-036, AC-037, AC-038, AC-039, AC-040, AC-041
- Evidência gerada: .spec/verification/refinamento-interface.json
- Testes: tests/ui/refinamento-interface-acessibilidade.spec.tsx
- Notas: executar somente após T-019, T-020, T-021, T-022 e T-023. Criar o teste de acessibilidade somente após as tarefas de implementação e antes da verificação final. Esse teste deve comprovar AC-040 com a tag `@spec:AC-040` e verificar: Loading com `role="status"` e `aria-live="polite"`; EmptyState com `role="region"` e `aria-label`; ErrorMessage com `role="alert"` e `aria-live="assertive"`. Não alterar `EmptyState`, `Loading` ou `ErrorMessage`. Consolidar a evidência de AC-031 a AC-041 no arquivo indicado. Um teste pode comprovar vários AC quando seu título contiver todas as tags `@spec:AC-xxx` correspondentes e evidenciar cada requisito; não criar testes artificiais apenas para rastreabilidade. Não alterar regras de negócio, banco, RPCs, RLS ou autenticação.
