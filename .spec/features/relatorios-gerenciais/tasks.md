# Tasks: Relatorios gerenciais

> feature: relatorios-gerenciais

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

## T-001 — Implementar função SQL do relatório de caixa [concluida]
- Refs: US-001, AC-001, AC-002, AC-003, AC-004, AC-005
- Arquivos: supabase/migrations/0012_relatorio_caixa.sql, supabase/tests/012_relatorio_caixa.sql
- Notas: manter decisões de saldo, estornos e fusos horários alinhadas às respostas de Q-001, Q-003 e Q-004.

## T-002 — Implementar função SQL do relatório de comissão [concluida]

- Refs: US-002, AC-006, AC-007, AC-008
- Arquivos: supabase/migrations/0013_relatorio_comissao.sql, supabase/tests/013_relatorio_comissao.sql
- Notas: manter inclusão de ajustes, adiantamentos e estado de processamento alinhada às respostas de Q-002 e Q-006.

## T-003 — Expor endpoints e tipos dos relatórios [pendente]

- Refs: US-001, US-002, AC-001, AC-002, AC-003, AC-004, AC-005, AC-006, AC-007, AC-008
- Arquivos: src/lib/api/relatorios.ts, src/types.ts
- Notas: preservar as convenções existentes de cliente Supabase, segurança e tipagem.

## T-004 — Criar páginas de filtragem e visualização dos relatórios [pendente]

- Refs: US-003, AC-009, AC-010, AC-011
- Arquivos: src/pages/RelatorioCaixaPage.tsx, src/pages/RelatorioComissaoPage.tsx
- Notas: reutilizar os padrões atuais de formulário, tabela/card e mensagem de ausência de dados.

## T-005 — Integrar os relatórios à navegação [pendente]

- Refs: US-003, AC-009, AC-010
- Arquivos: src/App.tsx
- Notas: manter a estrutura atual de abas individuais e adicionar as entradas de relatório previstas no plano.
