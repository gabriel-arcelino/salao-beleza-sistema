# Diagnóstico do JWT

## Execução autenticada de 2026-09-28

- Endpoint Auth local: `http://127.0.0.1:54321`.
- Aplicação: `http://localhost:5173/`.
- Credenciais usadas somente no fluxo local; nenhuma credencial ou token foi persistido.
- Login direto no endpoint Auth: `200`.
- Token observado: `iat` igual ao instante de emissão, `exp` uma hora depois, sem `nbf`, issuer local e audience `authenticated`.

## Reprodução inicial

1. Login válido levou ao Dashboard.
2. As duas cargas iniciais receberam `401`.
3. A mensagem apresentada foi `JWT issued at future`.
4. O Dashboard ficou com `Carregando...` e ofereceu `Tentar novamente`.
5. O retry manual carregou os indicadores e o estoque corretamente.

## Hipótese avaliada e removida: corrida pós-login no cliente

Foi implementado e depois removido um gate em `LoginPage` que confirmava `supabase.auth.getSession()` antes de chamar `onLogin`. A hipótese foi **descartada**: com o gate aplicado, o `PGRST303` voltou a ocorrer em execução autenticada real. `src/pages/LoginPage.tsx` está sem alteração; a entrega não tem mudança de runtime.

## Causa raiz: defeito externo no PostgREST (confirmado)

Não há causa própria no projeto. A falha é um defeito documentado do PostgREST, corrigido a montante.

**Evidência externa (fontes primárias):**

- [PostgREST issue #5196 — "PGRST303: JWT issued at future"](https://github.com/PostgREST/postgrest/issues/5196), rótulo `authn`, fechada como `completed` em 2026-09-02.
- [CHANGELOG do PostgREST](https://github.com/PostgREST/postgrest/blob/main/CHANGELOG.md):
  - `16.1` (2026-08-10) — *"JWT validation uses wrong current time due to a bug in auto-update"* (#5159);
  - `16.3` (2026-09-11) — *"Fix sporadic PGRST303 JWT issued at future errors"* (#5196) e *"Fix wrong time appearing on logs after long idle periods"* (#5213).
- O mantenedor registrou sobre a correção anterior: *"Confirmed that the above fix didn't apply at all in our case."*

**Mecanismo:** o PostgREST obtém o horário corrente através do pacote Haskell `auto-update`, que faz cache do valor. Em runtime threaded o código cai em `Event.mkAutoUpdate`, cujo `atomicWriteIORef` estava aplicado ao arquivo errado (wai#1111), de modo que threads concorrentes leem um timestamp antigo. O relógio interno do PostgREST fica atrás, e o `iat` — correto — passa a parecer emitido no futuro. Como a tolerância de skew do PostgREST é de 30 segundos, o veredito só dispara quando o cache atrasa mais que isso.

**Reprodução do próprio mantenedor, com relógios comprovadamente em sincronia:**

```
JWT issued at future, diff: 107 seconds, current time (epoch): 1788296202, iat (epoch): 1788296309
JWT issued at future, diff: 174 seconds, ...
```

**Padrão relatado:** período longo sem tráfego → as primeiras requisições falham → as seguintes com a credencial idêntica passam. Reiniciar o PostgREST limpa o sintoma. Relatório independente com logs próprios mostrou linhas do PostgREST carimbadas com data antiga enquanto o relógio do container indicava a data corrente.

**Correspondência com as medições deste projeto:** intermitente; falha na primeira requisição autenticada após longo ociosidade; `iat` nunca no futuro; ausência de defasagem entre containers; recuperação pelo retry; e a correção no cliente não surtiu efeito.

Ressalva: o mantenedor foi cauteloso — *"I'm not even sure this is a bug in PostgREST"*. O que está confirmado é que existe **defeito documentado e corrigido** a montante, e que o ambiente local rodava a versão anterior à correção.

## Mudança de infraestrutura aplicada

Nenhum arquivo de runtime, migration, RPC ou contrato foi alterado. A mudança foi exclusivamente no stack local.

| Item | Antes | Depois |
|---|---|---|
| Supabase CLI | 2.116.0 | 2.118.0 |
| **PostgREST** | **16.1** | **16.3** |
| Postgres | 17.6.1.165 | 17.6.1.171 |
| GoTrue (auth) | 2.196.0 | 2.197.0 |
| Realtime | — | 2.135.3 |
| Storage API | — | 1.77.0 |

A CLI 2.118.0 já fixa `postgrest/postgrest:v16.3`, que é a versão com a correção de #5196; não foi necessário fixar tag manualmente.

Procedimento: `supabase stop` (sem `--no-backup`, para preservar os volumes) seguido de `supabase start`.

Verificações após a mudança:

- `postgrest --version` → `PostgREST 16.3`.
- Dados preservados: `saloes` 1, `auth_users` 1, `profissionais` 1, idênticos ao baseline.
- Token ainda íntegro após o upgrade: `iat` com delta 0 em relação ao instante, `exp` 3600s à frente, `aud` `authenticated`.
- O `.env` não precisou ser alterado: a chave anon JWT existente continua aceita pelo Kong.

## QA visual mobile 390x844 — após a mudança

Viewport `390x844`, `isMobile` e `hasTouch` ativos, execução autenticada real.

| Fase | Execuções | `JWT issued at future` | `Carregando...` / retry | Overflow horizontal | Indicadores |
|---|---|---|---|---|---|
| PostgREST aquecido | 8 | 0 | 0 | 0 | 4 em todas |
| Após 12 min sem nenhuma requisição autenticada | 4 | 0 | 0 | 0 | 4 em todas |

Todas as 12 execuções responderam `200` em `rest/v1/produtos` e `rest/v1/rpc/fn_dashboard_indicadores`, e nenhuma exigiu o botão de retry.

Na fase de ociosidade não houve requisição autenticada ao PostgREST durante os 12 minutos — nem por pgTAP, nem por Vitest, cujas camadas de rede são mockadas —, portanto a janela ociosa medida é real.

Nas execuções limpas: sem `JWT issued at future`, sem estado de carregamento preso, sem necessidade de retry, `scrollWidth` igual a `clientWidth` (390) e os quatro indicadores (`Faturamento`, `Receita líquida`, `CMV`, `Despesas`) mais `Estoque` legíveis.

## Teste controlado com a sonda `scripts/diagnostico-jwt.cjs`

A sonda foi executada contra o stack já atualizado (PostgREST 16.3). Ela registra somente claims mínimos, status, duração e erro sanitizado, e imprime `secrets_logged: false`.

| Execução | `iat` (delta vs agora) | `exp`−`iat` | `nbf` | issuer | audience | `fn_dashboard_indicadores` | estoque |
|---|---|---|---|---|---|---|---|
| 1 | 0 s | 3600 s | ausente | `http://127.0.0.1:54321/auth/v1` | `authenticated` | 200 (628 ms) | 200 (66 ms) |
| 2 | 0 s | 3600 s | ausente | idem | `authenticated` | 200 (253 ms) | 200 (31 ms) |
| 3 | 0 s | 3600 s | ausente | idem | `authenticated` | 200 (219 ms) | 200 (39 ms) |

Nenhuma resposta `PGRST303`. Validação em navegador, 2 rodadas: login, carga inicial do Dashboard e as duas consultas REST em `200`, 4 indicadores visíveis, sem `JWT issued at future`, sem `Carregando...` preso e sem overflow horizontal. O botão `Tentar novamente` não apareceu em nenhuma rodada, portanto o caminho de retry **não foi exercitado** — não havia falha para recuperar.

## Limites

- **O teste A/B controlado não foi executado, e a razão importa.** A atualização para o PostgREST 16.3 já havia sido aplicada antes deste pedido, então o estado "antes" (16.1) não pôde ser medido com a sonda. Um rollback da CLI para 2.116.0 permitiria recriar esse estado, mas não produziria evidência conclusiva: o defeito é esporádico, com taxa observada de 1 falha em 7 execuções no 16.1. Uma única execução da sonda no 16.1 tem cerca de 86% de chance de **não** reproduzir a falha, o que geraria uma conclusão falsa de "sem diferença". Com poder estatístico de 80% e alfa de 5%, seriam necessárias aproximadamente 39 execuções no 16.1, cada uma precedida de janela de ociosidade. Esse experimento não foi feito por não caber no tempo desta sessão.
- A correção upstream não pôde ser observada diretamente no ambiente: o PostgREST 16.1 não trazia o logging diagnóstico de diferença de tempo (#5197/#5198), e a versão 16.4 ainda não foi publicada no espelho de imagens da Supabase.
- A atribuição final se apoia na mudança de versão e nas fontes primárias, e não em um log local da ocorrência, porque não há log do GoTrue/PostgREST no ambiente que registre o instante da falha.
- A ausência de reprodução após a mudança não é prova isolada de correção; a prova é a versão, que passa a incluir a correção publicada.
- `auth.users` estava vazio no início da execução; um usuário local descartável foi criado para habilitar o QA autenticado, com autorização do responsável e sem registro de credencial em repositório.
- Um processo Vite antigo, iniciado com argumento inválido, ocupava a porta 5173 e respondia `404`; foi encerrado para que o servidor correto respondesse `200`. O servidor caiu novamente após o reinício do stack e foi reiniciado.
- `supabase start` imprime chaves de desenvolvimento no terminal. São defaults locais compartilhados; nenhuma foi reproduzida nesta evidência.

## Gates executados

- Teste focal e Feature verify: 4/4 critérios PASS, exit 0.
- Build: PASS.
- Lint: PASS com um warning preexistente de dependência de `useEffect` em `DashboardPage.tsx`.
- Regressão global: PASS, exit 0; pgTAP e Vitest com 212 asserções aprovadas e nenhuma reprovada, no stack atualizado.
- QA visual mobile 390x844: **PASS** em 12 execuções após a mudança (8 frias e 4 após 12 min de ociosidade), sem `JWT issued at future`, sem estado de carregamento preso e sem overflow horizontal. Antes da mudança a falha ocorria em 1 de 7 execuções.
- Sonda `scripts/diagnostico-jwt.cjs`: 3/3 execuções em `200` nas duas consultas, sem `PGRST303`; navegador validado em 2/2 rodadas.
- `git diff --check`: PASS, exit 0 (apenas avisos de normalização LF/CRLF, sem erro de whitespace).
- Comparação A/B antes/depois: **não executada** — o estado 16.1 já havia sido substituído, e a taxa de falha observada no 16.1 (1 em 7) é baixa demais para um número pequeno de execuções produzir conclusão. Detalhamento na seção de limites.
- Auditoria ONP: **BLOCKED**, exit 1; `VERIFY_OBSOLETO` em `dashboard-gerencial`, `fundacao-ui`, `gate-comissao-produto`, `legado-baseline`, `recuperacao-carga`, `refinamento-interface` e `relatorios-gerenciais`. A regra considera prova obsoleta quando qualquer arquivo em `src/` ou `tests/` é mais novo que a prova, então edições desta feature invalidaram as sete. Nenhuma delas decorre da mudança de infraestrutura, e o gate obrigatório não pode ser declarado PASS.
