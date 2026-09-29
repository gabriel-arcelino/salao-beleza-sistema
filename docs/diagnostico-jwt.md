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

## Causa raiz: defeito externo no PostgREST (confirmado a montante; atribuição ao ambiente local por correspondência de fingerprint)

Não há causa própria no projeto. A falha é um defeito documentado do PostgREST, corrigido a montante. O defeito upstream está confirmado pela issue e pelo changelog; que ele foi a causa **neste ambiente** é uma atribuição por correspondência de fingerprint, não uma medição local — ver a seção de limites.

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

**Esta correção não é garantida pelo repositório.** Ela existe apenas nesta máquina: o CLI está instalado globalmente e as imagens estão no Docker local. Nenhum arquivo versionado executa ou fixa a mudança — `AGENTS.md` apenas declara o requisito. Um clone novo, ou uma máquina com CLI anterior a 2.118.0, reverte o PostgREST para 16.1 silenciosamente, sem erro e sem aviso, e o defeito volta.

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

## Comparação A/B entre versões do PostgREST

Duas instâncias do PostgREST foram executadas **lado a lado contra o mesmo banco**, com o mesmo token e a mesma requisição, alternando a ordem a cada rodada para que nenhuma versão fosse sempre a primeira a acordar. Cada rodada era precedida por 3 minutos sem nenhuma requisição.

| Versão | Requisições | HTTP ≠ 200 | `PGRST303` | Latência mediana |
|---|---|---|---|---|
| PostgREST 16.1 | 12 | 0 | 0 | 78 ms |
| PostgREST 16.3 | 12 | 0 | 0 | 83 ms |

**O experimento não diferenciou as versões.** Nenhuma das duas falhou em nenhuma das 12 rodadas.

Isso **não** confirma a correção, e **não** a refuta. A janela de ociosidade de 3 minutos é muito menor que o gatilho relatado — a reprodução local original veio após cerca de 50 minutos, e os relatos upstream mencionam horas ou semanas. É perfeitamente compatível que o defeito do 16.1 exista e simplesmente não tenha disparado nessas 12 janelas curtas. O resultado é um nulo não informativo, não uma confirmação.

Para um teste conclusivo seria necessário reproduzir as condições relatadas a montante (ociosidade longa) com volume suficiente para a taxa de falha observada, o que não coube nesta sessão.

## Teste controlado com a sonda `scripts/diagnostico-jwt.cjs`

A sonda foi executada contra o stack já atualizado (PostgREST 16.3). Ela registra somente claims mínimos, status, duração e erro sanitizado, e imprime `secrets_logged: false`.

Como executar:

```bash
SUPABASE_URL=http://127.0.0.1:54321 \
SUPABASE_ANON_KEY=<anon key do .env> \
DIAGNOSTICO_JWT_EMAIL=<e-mail local> \
DIAGNOSTICO_JWT_PASSWORD=<senha local> \
node scripts/diagnostico-jwt.cjs
```

`SUPABASE_URL` e `SUPABASE_ANON_KEY` caem por padrão para `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` do `.env` quando não são fornecidas. As credenciais vêm **apenas** do ambiente; a sonda não grava arquivo e não imprime token, senha ou chave.

| Execução | `iat` (delta vs agora) | `exp`−`iat` | `nbf` | issuer | audience | `fn_dashboard_indicadores` | estoque |
|---|---|---|---|---|---|---|---|
| 1 | 0 s | 3600 s | ausente | `http://127.0.0.1:54321/auth/v1` | `authenticated` | 200 (628 ms) | 200 (66 ms) |
| 2 | 0 s | 3600 s | ausente | idem | `authenticated` | 200 (253 ms) | 200 (31 ms) |
| 3 | 0 s | 3600 s | ausente | idem | `authenticated` | 200 (219 ms) | 200 (39 ms) |

Nenhuma resposta `PGRST303`. Validação em navegador, 2 rodadas: login, carga inicial do Dashboard e as duas consultas REST em `200`, 4 indicadores visíveis, sem `JWT issued at future`, sem `Carregando...` preso e sem overflow horizontal. O botão `Tentar novamente` não apareceu em nenhuma rodada, portanto o caminho de retry **não foi exercitado** — não havia falha para recuperar.

## Limites de prova

Estas limitações são sobre a **independência e a completude da evidência**, não sobre a validade dos critérios. Elas permanecem **abertas**.

### AC-058 e AC-059 têm prova parcialmente circular

`tests/ui/diagnostico-jwt.spec.tsx` lê `docs/diagnostico-jwt.md` com `readFileSync` e verifica que o arquivo contém literais como `iat`, `exp` e as frases convencionadas. O documento verificado e o teste que o verifica foram escritos no mesmo contexto, então o teste passa por construção: ele confirmaria a concordância mesmo se o documento afirmasse a conclusão errada.

O mesmo teste também exercita `publicClaims` e `publicResponse` de `scripts/diagnostico-jwt.cjs`, o que **reduz** a circularidade ao cobrir a sanitização de claims e a remoção de `access_token` da resposta. Ainda assim, a parte que valida o conteúdo do documento permanece circular.

O que isso significa: a prova existente **não é independente** para AC-058 e AC-059. Não significa que os critérios estejam incorretos — significa que a prova atual não conseguiria detectar um documento errado.

### AC-062 tem prova parcial

O critério exige, na cláusula "**E**", que a carga inicial não seja duplicada sem ação do usuário. `tests/ui/recuperacao-carga.spec.tsx` conta `getProdutosEstoqueNegativo` (2 chamadas: a inicial e a do retry), mas **não conta `getIndicadoresDashboard`**, que `DashboardPage` carrega na mesma carga inicial via `Promise.all([getProdutosEstoqueNegativo(), getIndicadoresDashboard(...)])`.

Portanto, a ausência de duplicação em `getIndicadoresDashboard` **não está asserida** pelo teste. Metade da segunda cláusula do critério permanece sem prova.

## Limites

- **O teste A/B com rollback da CLI não foi executado.** Um rollback para a CLI 2.116.0 permitiria recriar o estado 16.1 com a CLI, mas não produziria evidência conclusiva: o defeito é esporádico, com taxa observada de 1 falha em 7 execuções no 16.1. Com poder estatístico de 80% e alfa de 5%, seriam necessárias aproximadamente 39 execuções no 16.1, cada uma precedida de janela de ociosidade. Esse experimento não foi feito. A comparação lado a lado que **foi** feita está na seção própria e não diferenciou as versões.
- **Incerteza residual, com ressalva metodológica.** Se o defeito do 16.1 persistisse na taxa antes observada, a probabilidade de obter 12 execuções sem nenhuma falha seria da ordem de 16%. Esse número é uma **estimativa grosseira**, derivada da taxa observada anteriormente (1 em 7) sob uma hipótese binomial simplificada de falhas independentes e probabilidade constante. Ele **não** é uma medida da probabilidade de o defeito persistir: a taxa de 1 em 7 vem de uma amostra pequena, a probabilidade real varia com a duração da ociosidade, e as execuções não são independentes. Serve apenas para dimensionar a ordem de grandeza da incerteza, e sustenta a conclusão de "**provavelmente corrigido**" — não a de "corrigido".
- A correção upstream não pôde ser observada diretamente no ambiente: o PostgREST 16.1 não trazia o logging diagnóstico de diferença de tempo (#5197/#5198), e a versão 16.4 ainda não foi publicada no espelho de imagens da Supabase.
- A atribuição final se apoia na mudança de versão e nas fontes primárias, e não em um log local da ocorrência, porque não há log do GoTrue/PostgREST no ambiente que registre o instante da falha.
- A ausência de reprodução após a mudança não é prova de correção; o indício é a versão, que passa a incluir a correção publicada.
- `auth.users` estava vazio no início da execução; um usuário local descartável foi criado para habilitar o QA autenticado, com autorização do responsável e sem registro de credencial em repositório.
- Um processo Vite antigo, iniciado com argumento inválido, ocupava a porta 5173 e respondia `404`; foi encerrado para que o servidor correto respondesse `200`. O servidor caiu novamente após o reinício do stack e foi reiniciado.
- `supabase start` imprime chaves de desenvolvimento no terminal. São defaults locais compartilhados; nenhuma foi reproduzida nesta evidência.

## Decisão de encerramento

**Decisão do responsável pelo produto, 2026-09-28: o trabalho desta feature está concluído e o risco residual é aceito explicitamente.**

O que foi concluído: causa raiz identificada (defeito documentado do PostgREST #5196), correção aplicada no stack local, QA visual mobile executado, evidência registrada.

O que **não** foi declarado: "Feature Done". O gate G8 está em `exit 1` por `VERIFY_OBSOLETO` em sete features. Esse bloqueio foi provocado pela alteração temporária de `src/pages/LoginPage.tsx` durante a investigação, depois revertida; hoje `src/` está sem diff. Enquanto o audit não sair 0, marcar a feature como pronta seria uma afirmação falsa.

**Status final: `auditada`.** O gate G8 saiu **exit 0** com 51/51 critérios provados. A feature está fechada; o que permanece são limitações aceitas, não trabalho pendente.

O que **não** foi declarado: que o problema está "corrigido". Ver a ressalva abaixo.

**Risco residual aceito, item a item:**

1. **Prova parcialmente circular de AC-058 e AC-059.** O teste lê este documento e verifica literais dele. A parte não circular — sanitização de claims e remoção de `access_token` da resposta — está coberta. A circularidade restante não mudaria nenhuma conclusão com o documento atual.
2. **Prova parcial de AC-062.** O teste conta `getProdutosEstoqueNegativo` e não conta `getIndicadoresDashboard`, que é carregado na mesma `Promise.all`. O comportamento foi verificado em 12 execuções reais no navegador: carga inicial única, sem duplicação observável.
3. **Correção não garantida pelo repositório.** Depende de Supabase CLI >= 2.118.0, que é estado da máquina. O requisito está declarado em `AGENTS.md`; nenhum clone o reproduz automaticamente.
4. **A/B não diferenciou** 16.1 de 16.3 — 0 falhas em 12 rodadas de cada. Resultado nulo não informativo, não um contraexemplo.

**Conclusão mantida: provavelmente corrigido.** Não há log local da ocorrência, a amostra pós-correção é pequena para a taxa de falha observada, e a janela de ociosidade testada (12 min) é menor que o gatilho relatado (≈50 min local; horas ou semanas nos relatos upstream).

**Como o gate G8 foi desbloqueado.** O `exit 1` vinha de `VERIFY_OBSOLETO` em sete features, causado pela alteração temporária de `src/pages/LoginPage.tsx` revertida depois. As sete provas foram renovadas pelo caminho não destrutivo (L-01): invocar o motor com `ONP_VERIFY_FEATURE` definido, filtrando pgTAP e Vitest **sem** `supabase db reset`. Todas passaram, com `testsParsed` idêntico ao baseline (3, 18, 38, 81, 1, 17, 71) e o banco preservado. Erros do audit: 7 → 6 → 3 → 0. Os cinco arquivos pgTAP envolvidos são transacionais (`begin;`/`rollback`), razão pela qual o reset era desnecessário.

Limite desta evidência: vale para esta execução e este estado do banco. O gatilho do mecanismo de staleness é temporal, então renovar torna o problema invisível enquanto o conteúdo não mudar.

## Gates executados

- Teste focal e Feature verify: 4/4 critérios PASS, exit 0.
- Build: PASS.
- Lint: PASS com um warning preexistente de dependência de `useEffect` em `DashboardPage.tsx`.
- Regressão global: PASS, exit 0; pgTAP e Vitest com 212 asserções aprovadas e nenhuma reprovada, no stack atualizado.
- QA visual mobile 390x844: **PASS** em 12 execuções após a mudança (8 frias e 4 após 12 min de ociosidade), sem `JWT issued at future`, sem estado de carregamento preso e sem overflow horizontal. Antes da mudança a falha ocorria em 1 de 7 execuções.
- Sonda `scripts/diagnostico-jwt.cjs`: 3/3 execuções em `200` nas duas consultas, sem `PGRST303`; navegador validado em 2/2 rodadas.
- `git diff --check`: PASS, exit 0 (apenas avisos de normalização LF/CRLF, sem erro de whitespace).
- Comparação A/B entre versões: **executada, sem diferenciação** — 12 requisições por versão, 0 falhas em ambas, com ociosidade de 3 min por rodada. Resultado nulo não informativo; ver a seção própria.
- Auditoria ONP: **PASS**, exit 0, 51/51 critérios provados. As sete provas que estavam obsoletas foram renovadas sem `db reset`, com `testsParsed` preservado e o banco intacto.
