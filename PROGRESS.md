# Progresso do Sistema de Gestão para Salão de Beleza

## Decisões Técnicas Fora do Plano Original

Durante o setup e testes, foram identificadas e aplicadas as seguintes resoluções que não estavam explícitas no plano inicial:

### 1. Ajuste na Função RLS (`supabase/migrations/0002_rls_policies.sql`)
- A função `auth_helpers.current_salon_id()` foi ajustada para ler primeiro o GUC de teste (`request.jwt.claims`) com fallback para `auth.jwt()`.
- Garantido que existe **apenas uma** definição dessa função no arquivo (sem duplicação).

### 2. Troca de Role nos Testes pgTAP (`supabase/tests/001_rls_isolamento_salao.sql`)
- Adicionada a instrução `set local role authenticated;` **após** os `INSERT`s de setup e **antes** dos `asserts` de leitura.
- *Motivo:* Sem isso, os testes rodavam como superusuário/postgres e ignoravam as políticas de RLS, gerando falsos positivos.

### 3. Tipagem no Frontend (`src/vite-env.d.ts`)
- Criado o arquivo `src/vite-env.d.ts` com `/// <reference types="vite/client" />` para corrigir a falha no `npm run build` ao acessar `import.meta.env`.

### 4. Ajustes na Infraestrutura Local (`supabase/config.toml`)
- `[api] enabled = true`: Habilitada a API REST/Auth local (`http://127.0.0.1:54321`), que estava desativada na config.
- `[analytics] enabled = false`: Desativado para evitar travamento de health-check no Docker em ambiente Windows.

### 5. Configuração de Ambiente (`.env`)
- Gerado a partir do `.env.example` apontando para `VITE_SUPABASE_URL=http://127.0.0.1:54321` e a anon key local.

## Status Atual (2026-09-13)
- ✅ **Testes RLS (pgTAP):** Passing (4/4 testes com sucesso executando sob `role authenticated`)
- ✅ **Testes RPCs Financeiras:** Passing (57 testes em 12 arquivos — 38 originais + 14 fn_fechar_competencia_comissao + 5 fn_calcular_cmv)
- ✅ **Build Frontend:** Success (`npm run build` concluído sem erros)
- ✅ **Supabase Local:** Funcionando com API e Auth ativos

## Progresso de Implementação

### Fase 1 — Núcleo Operacional (Protocolo A)
- [x] Cadastrais de profissionais (`src/pages/ProfissionaisPage.tsx`)
- [x] Cadastrais de clientes (`src/pages/ClientePage.tsx`)
- [x] Cadastrais de serviços (`src/pages/ServicosPage.tsx`)
- [x] Cadastrais de produtos (`src/pages/ProdutosPage.tsx`)
- [x] Configuração de comissões (`src/pages/ConfigComissoesPage.tsx`)

### Fase 2 — Financeiro (Protocolo B) — Backend
- [x] `fn_fechar_comanda` implementada e testada (migration 0004)
- [x] `fn_cancelar_comanda` implementada e testada (migration 0006)
- [x] `fn_estornar_pagamento` implementada e testada (migration 0009)
- [x] `fn_fechar_competencia_comissao` implementada e validada (migration 0010 + test 011) — 14 testes passando
- [x] Corrigido bug crítico de `FOUND` clobbered em `fn_fechar_competencia_comissao` (migration 0010)

### Fase 2 — Financeiro (Protocolo B) — Frontend
- [x] Tipos TypeScript para comandas, itens e pagamentos (`src/types.ts`)
- [x] API de comandas (`src/lib/api/comandas.ts`)
- [x] Página de comandas com fluxo de fechamento (`src/pages/ComandasPage.tsx`)
- [x] Aba "Comandas" integrada no `App.tsx`

### Fase 3 — Estoque/CMV
- [x] `fn_calcular_cmv` implementada (migration 0011)
- [x] Teste pgTAP CMV com 3 cenários de preço de custo diferente (test 012) — 5 testes passando
- [x] Card de alerta de estoque negativo no Dashboard (`src/pages/DashboardPage.tsx`)
- [x] Relatório "Saldo negativo — pendente de correção" (`src/pages/RelatorioEstoquePage.tsx`)
- [x] Simulação de e-mail diário de saldo negativo (Protocolo A — leitura/exibição)
- [x] API de estoque (`src/lib/api/estoque.ts`)
- [x] Tipo `estoque_atual` adicionado a `Produto` em `src/types.ts`

- [x] `fn_relatorio_comissao` implementada e testada (migration 0013 + test 013) — 5 testes passando (AC-006, AC-007, AC-008 verificados)

## Próximos Passos
1. Executar `npm run dev` e validar manualmente o Dashboard + fluxo de comanda
2. Fase 4: Relatórios gerenciais avançados (fechamento de caixa, comissão por profissional)

## Bugs Críticos Encontrados e Corrigidos

### fn_fechar_competencia_comissao — FOUND clobbered (migration 0010)
- **Sintoma:** A função retornava `id: null` e não inseria registro em `fechamentos_comissao`.
- **Causa:** A variável PL/pgSQL `FOUND` (boolean global) era sobrescrita pelos `SELECT INTO` intermediários que calculam `total_bruto_calculado`, `total_adiantamentos_abatidos` e `total_ajustes`. No ponto de decisão `if found then` (UPDATE vs INSERT), `FOUND` já era `true` (do último SELECT INTO), fazendo a função tomar o caminho de UPDATE em vez de INSERT. O UPDATE usava `WHERE id = v_fechamento.id` (que era NULL), afetando 0 linhas.
- **Fix:** Variável dedicada `v_fechamento_existente boolean` captura o valor de `found` imediatamente após o SELECT INTO inicial (antes de qualquer SELECT intermediário).