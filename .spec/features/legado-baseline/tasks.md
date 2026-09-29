# Tasks: Baseline do código legado

> feature: legado-baseline

## T-012 — Registrar código pré-ONP como baseline [concluida]
- Refs: US-007, AC-020
- Arquivos: src/main.tsx, src/vite-env.d.ts, src/lib/salon.ts, src/lib/supabaseClient.ts, src/lib/api/clientes.ts, src/lib/api/comandas.ts, src/lib/api/config_comissoes.ts, src/lib/api/estoque.ts, src/lib/api/produtos.ts, src/lib/api/profissionais.ts, src/lib/api/servicos.ts, src/pages/ClientesPage.tsx, src/pages/ComandasPage.tsx, src/pages/ConfigComissoesPage.tsx, src/pages/LoginPage.tsx, src/pages/ProdutosPage.tsx, src/pages/ProfissionaisPage.tsx, src/pages/RelatorioEstoquePage.tsx, src/pages/ServicosPage.tsx, src/App.tsx, src/pages/DashboardPage.tsx, src/types.ts
- Notas: estes arquivos existiam antes da adoção do processo ONP. O registro não cria novos requisitos de produto nem autoriza alterações no código legado.
- **Completude verificada por medição (2026-09-29).** O primeiro commit do repositório (`aefaebc`, ponto de adoção) continha **22** arquivos `.ts/.tsx` em `src/`; esta lista registra **22**, sem excedente. Antes desta correção faltavam `src/App.tsx`, `src/pages/DashboardPage.tsx` e `src/types.ts` — 3 de 22. O AC-020 exige que *todo* arquivo pré-adoção esteja registrado, e a lista estava incompleta.
- **Fraqueza do teste, registrada.** `tests/processo/legado-baseline.spec.ts` verificava apenas uma direção — que os arquivos listados existem. Com a lista completa, a asserção passa a proteger indiretamente a completude: qualquer arquivo pré-adoção removido da lista faria o arquivo constar como ausente apenas se deixasse de existir, mas **a completude não é asserida diretamente por nenhum teste**. Teste dedicado seria trabalho futuro.
