# Tasks: Diagnóstico e correção do JWT

> feature: diagnostico-jwt

## T-034 — Preparar evidência segura e reprodução autenticada [concluida]
- Refs: US-022, AC-058, AC-059
- Arquivos: .spec/features/diagnostico-jwt/spec.md, docs/diagnostico-jwt.md
- Notas: documentado em `docs/diagnostico-jwt.md`; o login retornou 200, a primeira carga reproduziu dois 401 e o retry recuperou a tela. Nenhum token, senha ou chave foi persistido.

## T-035 — Comparar relógios e configuração do ambiente [concluida]
- Refs: US-022, AC-059
- Arquivos: supabase/config.toml, docs/diagnostico-jwt.md
- Notas: host/Node e claims `iat`/`exp` foram comparados; a sessão persistida após login possui claims coerentes. A causa foi identificada como o defeito do PostgREST #5196 e corrigida ao atualizar o stack local para PostgREST 16.3.

## T-036 — Avaliar hipótese de corrida pós-login [concluida]
- Refs: US-022, AC-059
- Arquivos: src/pages/LoginPage.tsx, tests/ui/diagnostico-jwt.spec.tsx, docs/diagnostico-jwt.md
- Notas: hipótese testada e descartada; `getSession()` não eliminou o `PGRST303` na QA mobile. A alteração de runtime foi removida.

## T-037 — Provar o fluxo autenticado e as fronteiras adversariais [em-andamento]
- Refs: AC-061, AC-062
- Arquivos: tests/ui/diagnostico-jwt.spec.tsx, tests/ui/recuperacao-carga.spec.tsx
- Notas: Vitest prova login, montagem do shell e carga dos indicadores com APIs determinísticas mockadas; o navegador local prova o comportamento real. A falha intermitente está registrada na evidência; após a atualização do stack o navegador não a reproduziu em 12 execuções. A regressão explícita do retry existente permanece coberta.

## T-038 — Implementar somente a correção comprovada [em-andamento]
- Refs: AC-061, AC-062
- Arquivos: docs/diagnostico-jwt.md
- Notas: nenhuma causa **própria ao projeto** foi comprovada; não há correção de runtime autorizada. A causa é externa (defeito do PostgREST #5196) e está registrada na T-043, onde a correção ocorreu no stack local. O retry existente permanece a mitigação observada.

## T-039 — Executar verificação focal e registrar prova [concluida]
- Refs: AC-058, AC-059, AC-061, AC-062
- Arquivos: .spec/verification/diagnostico-jwt.json
- Notas: `node scripts/onp-feature-verify.cjs diagnostico-jwt` passou 4/4 critérios, 20 testes lidos, exit 0. **Ressalva de independência da prova:** a prova de AC-058 e AC-059 é parcialmente circular, porque o teste lê `docs/diagnostico-jwt.md` e verifica literais do mesmo documento; e a prova de AC-062 é parcial, porque o teste conta `getProdutosEstoqueNegativo` mas não conta `getIndicadoresDashboard`, embora a carga inicial carregue os dois. Detalhamento em `docs/diagnostico-jwt.md`, seção "Limites de prova". Nenhuma dessas limitações foi marcada como resolvida.

## T-040 — Regressão global, QA visual e auditoria [em-andamento]
- Refs: AC-061, AC-062
- Arquivos: docs/diagnostico-jwt.md
- Notas: antes da mudança de infraestrutura, o QA visual mobile 390x844 reproduziu `JWT issued at future` (2 respostas `401 PGRST303`) na primeira execução autenticada mesmo com a correção de `LoginPage` aplicada; 5 execuções seguintes passaram. Depois da mudança para PostgREST 16.3, 12 execuções mobile passaram sem `JWT issued at future`, sem `Carregando...` preso e sem overflow horizontal — 8 com o PostgREST aquecido e 4 após 12 min sem nenhuma requisição autenticada, contra 1 falha em 7 execuções antes da mudança. Regressão global passou com exit 0 no stack atualizado (pgTAP e Vitest, 212 asserções, nenhuma reprovada). Build e lint passaram, o lint com o warning preexistente de `useEffect` em `DashboardPage.tsx`. A auditoria segue exit 1 por `VERIFY_OBSOLETO` em sete features, provocadas pela alteração temporária de `src/pages/LoginPage.tsx` durante a investigação e revertida depois; hoje `src/` está sem diff. `docs/diagnostico-jwt.md` registra o mesmo. A tarefa permanece aberta pela auditoria.

## T-041 — Descartar causas sem evidência [concluida]
- Refs: AC-059
- Arquivos: docs/diagnostico-jwt.md
- Notas: por medição, foram descartadas defasagem de relógio (Postgres, Kong/PostgREST, Auth e host coincidem em 6 rodadas), transação longa no Postgres (nenhuma aberta acima de 5s) e emissão com `iat` adiantado (delta 0 ou -1 em 6 emissões, `exp` sempre +3600s, `nbf` ausente, `aud` `authenticated`).

## T-043 — Corrigir a causa externa no stack local [concluida]
- Refs: AC-059, AC-061
- Arquivos: docs/diagnostico-jwt.md
- Notas: causa identificada como defeito documentado do PostgREST (#5196), cujo relógio interno em cache via `auto-update` pode ficar atrasado e fazer o `iat` correto parecer futuro; a tolerância de skew de 30s explica a sporadicidade. Correção publicada em PostgREST 16.3. Stack local atualizado de Supabase CLI 2.116.0 para 2.118.0, levando o PostgREST de 16.1 para 16.3 (e Postgres 17.6.1.165 para .171, GoTrue 2.196.0 para 2.197.0, Realtime 2.135.3, Storage 1.77.0). Nenhum arquivo de runtime, migration, RPC ou contrato alterado; `.env` preservado.

## T-042 — Instrumentar a fronteira Auth → PostgREST [em-andamento]
- Refs: US-022, AC-058, AC-059
- Arquivos: scripts/diagnostico-jwt.cjs, tests/ui/diagnostico-jwt.spec.tsx, docs/diagnostico-jwt.md
- Notas: a sonda lê `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `DIAGNOSTICO_JWT_EMAIL` e `DIAGNOSTICO_JWT_PASSWORD` somente do ambiente; imprime apenas claims mínimos, status, duração e erro sanitizado. Não grava arquivos nem tokens. As rodadas após a atualização para PostgREST 16.3 passaram com Auth, Dashboard e estoque em `200`, inclusive após inatividade; T-043 registra a causa e a correção externa.
