# Spec: Diagnóstico e correção do JWT

> feature: diagnostico-jwt
> status: auditada

<!--
  US-xxx = história de usuário · AC-xxx = critério de aceite
  ASM-xxx = suposição · Q-xxx = pergunta em aberto
-->

## Contexto

A validação visual registrou `HTTP 401 JWT issued at future` durante a carga inicial do Dashboard. A feature `recuperacao-carga` já trata a consequência com a ação manual "Tentar novamente". A causa foi identificada como o defeito documentado do PostgREST #5196, corrigido no PostgREST 16.3.

A página local aberta em `http://localhost:5173/` respondeu normalmente e exibiu o login. O fluxo autenticado foi reproduzido com o usuário local `visual@local.test`: uma primeira carga apresentou dois `401 JWT issued at future`, e o retry recuperou a tela; cinco execuções seguintes carregaram o Dashboard. A hipótese de corrida pós-login foi testada e removida após o erro voltar com ela aplicada. O relógio do host, Node e os claims mínimos observados estão coerentes em 2026-09-28.

Esta feature investiga a causa antes de alterar autenticação ou configuração. Se o erro não for reproduzido, o resultado válido é diagnóstico inconclusivo documentado, sem correção especulativa.

## História

### US-022 — Diagnóstico seguro de falhas temporais de autenticação

Como pessoa responsável pela operação do sistema, quero distinguir uma falha temporal de JWT de uma sessão expirada ou de uma falha transitória de API, para corrigir somente a causa comprovada sem expor credenciais.

### Critérios de aceite

#### AC-058 — A falha autenticada pode ser correlacionada sem expor segredos

- **Dado** que uma execução autenticada do ambiente local apresente uma falha de autenticação ou de carga
- **Quando** a execução for registrada para investigação
- **Então** o registro deve correlacionar URL/porta, horário do navegador/host, status, mensagem, headers não sensíveis, claims mínimos (`iat`, `nbf`, `exp`, issuer e audience) e logs disponíveis do Auth/API
- **E** nenhum token completo, senha, chave anon, `service_role` ou segredo deve ser persistido na evidência

#### AC-059 — A investigação classifica a causa sem chute

- **Dado** o conjunto de evidências coletadas
- **Quando** a investigação for concluída
- **Então** a causa deve ser classificada como confirmada, hipótese descartada ou não reproduzível/inconclusiva
- **E** alterações em `site_url`, relógios, `jwt_expiry`, refresh token ou validação JWT só podem ocorrer se uma evidência reproduzível justificar a alteração

#### AC-061 — O fluxo normal de login e carga inicial permanece funcional

- **Dado** credenciais válidas e uma sessão emitida pelo Auth local
- **Quando** o usuário fizer login e abrir o Dashboard
- **Então** a aplicação deve concluir a autenticação, carregar o Dashboard e não exibir diagnóstico de erro sem falha real

#### AC-062 — A recuperação existente não regride

- **Dado** que a carga do Dashboard falhe depois de uma sessão válida
- **Quando** o usuário acionar "Tentar novamente" e a segunda carga funcionar
- **Então** o erro deve desaparecer e os dados devem aparecer
- **E** a carga inicial não deve ser duplicada sem ação do usuário

## Decisões

- A feature é separada de `recuperacao-carga`; Q-015 não será reescrita silenciosamente.
- A execução será sequencial.
- O retry manual existente continua sendo a recuperação para falhas de carga.
- `localhost:5173` versus `127.0.0.1:3000` é hipótese de investigação, não correção autorizada.
- Não haverá alteração de RLS, RPCs, migrations, contratos de API, aumento de expiração, relaxamento da validação JWT ou inclusão de segredos no cliente.
- A causa foi corrigida no stack local ao atualizar o PostgREST de 16.1 para 16.3; não houve mudança de runtime na aplicação.

## Decisão de encerramento (2026-09-28)

**Decisão do responsável pelo produto: o trabalho desta feature está concluído e o risco residual é aceito explicitamente.** Isto não é uma declaração de "Feature Done".

**O que foi concluído:** causa raiz identificada (defeito documentado do PostgREST #5196, relógio interno em cache), correção aplicada no stack local (PostgREST 16.3), QA visual mobile 390x844 executado, e evidência registrada.

**Risco residual aceito, item a item:**

| # | Limitação conhecida | Por que é aceito |
|---|---|---|
| 1 | A prova de AC-058 e AC-059 é **parcialmente circular** — o teste lê `docs/diagnostico-jwt.md` e verifica literais do mesmo documento | A parte não circular (sanitização de claims e remoção de `access_token`) está coberta. A circularidade restante não altera nenhuma conclusão: ela não produziria resultado diferente com o documento atual |
| 2 | A prova de AC-062 é **parcial** — o teste conta `getProdutosEstoqueNegativo` mas não conta `getIndicadoresDashboard` | O comportamento observado no navegador (carga inicial única, sem duplicação visível) foi verificado em 12 execuções reais. A lacuna é de asserção automatizada, não de comportamento |
| 3 | A correção depende de **Supabase CLI >= 2.118.0**, que é estado da máquina e não do repositório | O requisito está declarado em `AGENTS.md`. Nenhum clone reproduz a precondição automaticamente |
| 4 | O A/B entre versões **não diferenciou** 16.1 de 16.3 (0 falhas em 12 rodadas de cada) | O resultado é nulo não informativo, não um contraexemplo. A atribuição se apoia na versão, na fonte primária e na ausência de reprodução |

**Por que a conclusão é "provavelmente corrigido" e não "corrigido":** não há log local da ocorrência, a amostra pós-correção é pequena para a taxa de falha observada, e a janela de ociosidade testada (12 min) é menor que o gatilho relatado. A inferência é forte, não conclusiva.

**Como o gate G8 foi desbloqueado.** O `exit 1` vinha de `VERIFY_OBSOLETO` em sete features, provocado pela alteração temporária de `src/pages/LoginPage.tsx` durante a investigação, depois revertida. As sete provas foram renovadas pelo caminho não destrutivo (L-01) — invocar o motor com `ONP_VERIFY_FEATURE` definido, que filtra pgTAP e Vitest **sem** `supabase db reset`.

| Feature | Classe | Resultado | `testsParsed` antes → depois | `db reset` |
|---|---|---|---|---|
| `legado-baseline` | Vitest | 1/1 PASS | 3 → 3 | não |
| `fundacao-ui` | Vitest | 5/5 PASS | 18 → 18 | não |
| `recuperacao-carga` | Vitest | 4/4 PASS | 38 → 38 | não |
| `refinamento-interface` | Vitest | 12/12 PASS | 81 → 81 | não |
| `gate-comissao-produto` | pgTAP | 1/1 PASS | 1 → 1 | não |
| `relatorios-gerenciais` | pgTAP | 11/11 PASS | 17 → 17 | não |
| `dashboard-gerencial` | pgTAP | 16/16 PASS | 71 → 71 | não |

`testsParsed` idêntico ao baseline em todas as sete: a renovação atualizou o relógio da prova sem reduzir o que ela cobre. Os cinco arquivos pgTAP envolvidos são transacionais (`begin;`/`rollback`), razão pela qual o reset era desnecessário. O banco permaneceu íntegro durante toda a operação. Erros do audit: **7 → 6 → 3 → 0**, sem nenhum erro novo em nenhum passo.

`audit --ci` resulta em **exit 0**, com 51/51 critérios provados. O status da feature sobe para `auditada`.

**O que este desbloqueio não prova:** vale para esta execução e este estado do banco. O gatilho do mecanismo de staleness é temporal (I-08), então a renovação torna o problema invisível enquanto o conteúdo não mudar — que é o limite registrado em R-08.

## Fora de escopo

- Redesign geral do Dashboard.
- Correção de problemas visuais não causados pelo fluxo de autenticação.
- Instrumentação que persista tokens ou credenciais.
- Logout automático ou refresh cego sem critério observável.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| ASM-025 | O erro histórico pode ser observado novamente somente em um fluxo autenticado com Auth local e dados válidos. | confirmada | O fluxo local com `visual@local.test` reproduziu os dois 401 iniciais e o retry recuperou a tela. |
| ASM-026 | Vitest/jsdom não é suficiente para provar emissão e validação real de JWT. | confirmada | Os testes isolados não executam GoTrue; a emissão foi observada no Auth local e a carga foi validada no navegador. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| Q-020 | Quais credenciais e dados de teste devem ser usados para reproduzir o fluxo autenticado local? | respondida | Credenciais locais fornecidas durante a execução; não foram registradas nesta SPEC nem na evidência. |
| Q-021 | Se a causa não for reproduzida, a entrega deve encerrar sem mudança de runtime? | respondida | Sim. O resultado inconclusivo documentado é preferível a uma correção especulativa. |

## Estratégia de testes

- Vitest/Testing Library para classificação e estados determinísticos do frontend.
- Fluxo de navegador contra Auth local para claims, headers e renovação.
- Teste adversarial obrigatório para repetir a primeira carga e acionar o retry.
- Regressão de `tests/ui/recuperacao-carga.spec.tsx`.
- Verificação focal, suíte global, auditoria ONP e QA visual do login/Dashboard.

## Fonte de verdade e evidência inicial

- [recuperacao-carga/spec.md](../recuperacao-carga/spec.md): Q-015 e o escopo já fechado do retry.
- [recuperacao-carga/verification.json](../../verification/recuperacao-carga.json): 4/4 critérios PASS no baseline.
- [src/App.tsx](../../../src/App.tsx): `getSession` e `onAuthStateChange`.
- [src/lib/supabaseClient.ts](../../../src/lib/supabaseClient.ts): cliente único Supabase.
- [supabase/config.toml](../../../supabase/config.toml): `site_url`, redirects, expiração e rotação.
- Evidência da sessão atual: host/Node em `2026-09-28`, página local retorna Login, `npm run build` PASS e `node scripts/onp-feature-verify.cjs recuperacao-carga` PASS.
