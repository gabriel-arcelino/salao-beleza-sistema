# Relatório de execução — sessão ONP de 2026-09-25/26

> Documento de handoff para avaliação independente.
> Branch: `experimento/onp-fase-4` · HEAD ao escrever: `562c806` · data: 2026-09-26
>
> **Este documento cobre DUAS features, apesar do nome do arquivo.**
> 1. `refinamento-interface` — T-022, T-023, T-024 (implementação e fechamento), mais a
>    regularização de status de T-019/T-020/T-021 e da suposição ASM-002.
> 2. `recuperacao-carga` — T-025, T-026, criada **depois** deste documento existir, a
>    partir do achado da validação visual. Ver §13.
>
> Se você só ler uma seção, não pare na §11: a feature de resiliência muda o status de um
> risco que ela descreve, e altera um componente que lá é declarado intocado.

---

## 1. Veredito da máquina

O gate é do projeto, não desta sessão. Para reproduzir, a partir da raiz:

```bash
node .claude/skills/onp-spec-driven/scripts/onp-spec.mjs audit --ci
```

Estado do projeto ao escrever:

```
resumo: 5 feature(s) · 14 história(s) de usuário · 35 critério(s) de aceite · 35/35 com teste · 35/35 provados
✔ auditoria limpa (0 aviso(s))
EXIT=0
```

| feature | status | ACs provados |
|---|---|---|
| `fundacao-ui` | implementada | 8/8 |
| `legado-baseline` | em-implementacao | 1/1 |
| `recuperacao-carga` | implementada | 4/4 |
| `refinamento-interface` | implementada | 11/11 |
| `relatorios-gerenciais` | rascunho | 11/11 |

Prova de `refinamento-interface` (`.spec/verification/refinamento-interface.json`):
`11/11 critérios PASS · 81 testes lidos · exitCode 0 · gitRev 1bfc9e1`.

| AC | Componente | Prova (arquivo de teste) |
|---|---|---|
| AC-031, AC-032, AC-041 | labels associados e separação formulário/conteúdo | `tests/ui/refinamento-interface-formularios.spec.tsx` |
| AC-033, AC-034 | `EmptyState` padronizado com `message` | `tests/ui/refinamento-interface-empty-state.spec.tsx` |
| AC-035, AC-036 | `Button` com variantes `primary`/`destructive` | `tests/ui/refinamento-interface-button.spec.tsx` |
| AC-037, AC-038 | hierarquia tipográfica e composição de grupos | `tests/ui/refinamento-interface-tipografia.spec.tsx` |
| AC-039 | indicador visual e semântico da aba ativa | `tests/ui/refinamento-interface-navegacao.spec.tsx` |
| AC-040 | semântica acessível preservada | `tests/ui/refinamento-interface-acessibilidade.spec.tsx` |

> **Ressalva honesta sobre o `gitRev`.** A prova registra `1bfc9e1` (T-023) porque o
> `verify` roda **antes** do commit, por desenho do fluxo. O código está em `e5c31fd`.
> Não é divergência: o `audit` compara *mtime* de `src/`+`tests/`, não `gitRev`.

---

## 2. O que foi implementado

### T-022 — Hierarquia tipográfica e composição (AC-037, AC-038)

- **Token novo** `FONT_SIZE_HEADING = "1.5rem"` em `src/ui/tokens/typography.ts`.
- **11 páginas** com o título principal usando `FONT_HEADING` + `FONT_SIZE_HEADING`:
  `Dashboard`, `Login`, `Profissionais`, `Clientes`, `Servicos`, `Produtos`,
  `ConfigComissoes`, `Comandas`, `RelatorioEstoque`, `RelatorioCaixa`, `RelatorioComissao`.
- **Grupos explícitos e separação** em todas as 11 páginas: `form[aria-label]`,
  `section[aria-label]` e `div[role="group"]`, com separação por `Card`, borda ou
  `marginTop`/`marginBottom >= SPACING_MD`. O `gap` interno de formulário **não** é aceito
  como separação — há teste-guarda que reprova grupo separado só por `gap`.
- Espaçamentos literais (`marginBottom: 24`, `marginTop: 24`) migrados para tokens
  `SPACING_LG` nos trechos tocados.

### T-023 — Navegação (AC-039)

- Aba ativa: `aria-current="page"`, `fontWeight: "bold"` preservado e
  `borderBottom: 2px solid ${COLOR_PRIMARY}` usando o **token** (nunca a cor literal).
- Abas inativas mantêm `borderBottom: 2px solid transparent`, para a barra **não mudar de
  altura** ao trocar de aba. Há teste garantindo espessura uniforme.
- Botão "Sair" nunca recebe `aria-current` (teste próprio para isso).
- Nenhuma alteração funcional de navegação.

### T-024 — AC-040 e verificação final

- `tests/ui/refinamento-interface-acessibilidade.spec.tsx` (novo) com 2 testes:
  1. semântica de `Loading` / `EmptyState` / `ErrorMessage` no componente isolado;
  2. **os três em produção, pela aplicação real** — Dashboard com CMV em carregamento e
     consulta de estoque falhando, e a aba Clientes com lista vazia. Este é o teste que
     sustenta o AC-040, cuja exigência é que *as mudanças visuais não removam a
     semântica* — algo só provável nas páginas reais, nunca no componente isolado.
- `EmptyState`, `Loading` e `ErrorMessage` **não foram alterados** por esta feature
  (restrição da T-024).
  > **Atualização posterior:** a feature `recuperacao-carga` (§13) alterou `ErrorMessage`
  > ao adicionar a prop opcional `onRetry`. `EmptyState` e `Loading` continuam intocados.
  > Avaliando `refinamento-interface` isoladamente, o cenário de então é o acima.
- Status da feature: `rascunho` → `implementada`.

> **Correção posterior à validação visual:** o `<h1>` do shell chegou a usar
> `FONT_HEADING`/`FONT_SIZE_HEADING` nesta tarefa. A validação visual mediu o resultado e
> mostrou que isso achatava a hierarquia (24px contra 24px). O título do shell voltou ao
> tamanho padrão do navegador (32px) e uma guarda em
> `tests/ui/refinamento-interface-tipografia.spec.tsx` impede a regressão. Ver §11.

### Regularizações fora do escopo de implementação

- **T-019, T-020, T-021** estavam implementadas e com prova PASS, porém marcadas
  `[pendente]`. Foram marcadas `[concluida]`.
- **ASM-002** (única suposição aberta do projeto, em `relatorios-gerenciais`) foi
  confirmada com resolução escrita no spec — ver §5.

---

## 3. Commits

| Hash | Conteúdo |
|---|---|
| `dc66add` | `test(ui)`: timeout padrão do vitest → 15 s (ajuste de infra, ver §6) |
| `3d2e96e` | T-022: token, 11 páginas, prova AC-037/AC-038, status de T-019/020/021 |
| `1b4d57f` | renovação da prova de `relatorios-gerenciais` sem `db reset` |
| `894d55e` | confirmação de ASM-002 + registro da lição L-001 |
| `1bfc9e1` | T-023: indicador da aba ativa + prova AC-039 |
| `e5c31fd` | T-024: AC-040, `<h1>` do shell, verificação final |
| `8d0ee34` | este relatório de handoff |
| `62fc9c4` | restauração da hierarquia de títulos (achado da validação visual, ver §11) |
| `3f32379` | T-025 `recuperacao-carga`: ação de tentar novamente no `ErrorMessage` |
| `562c806` | T-026 `recuperacao-carga`: a ação nas 10 páginas restantes |

---

## 4. Decisões do dono do produto (4 pontos, todos do usuário)

1. **`App.tsx` fora da T-022** — o `<h1>` do shell pertence à T-023, para não conflitar com
   a faixa paralela. Lateramente (item 4 abaixo) ele foi efetivamente tratado na T-024.
2. **LoginPage com 2 grupos** — `section[aria-label]` "Orientação de primeiro acesso" +
   `div[role="group"]` "Formulário de login", em vez de um único grupo.
3. **Marcar T-019/T-020/T-021 como concluídas** — já tinham prova PASS.
4. **`<h1>` do shell entra na T-024** — e não em tarefa genérica. A prova ficou na spec de
   tipografia, em teste próprio, porque o `App` **não pode** entrar na lista `PAGINAS`
   daquela spec: ele renderiza a página dentro de um `<div>` raiz, então os grupos da
   página não são filhos diretos dele e a contagem exigida por AC-038 zeraria.
5. **T-024 executada nesta sessão**, sem executor headless nem sessão nova.

---

## 5. ASM-002 — como foi resolvida

A suposição dizia que "as APIs dos relatórios retornam todos os registros disponíveis,
sem paginação própria". A inspeção do código mostrou que **a premissa não se aplicava**:

| API | Retorna | Paginação |
|---|---|---|
| `fn_relatorio_caixa` (`migrations/0012`) | 1 linha agregada (totais do intervalo) | sem objeto — não é lista |
| `fn_relatorio_comissao` (`migrations/0013`) | 1 linha agregada (`items` em `jsonb`) | sem objeto — não é lista |
| `getProdutosEstoqueNegativo` | lista real, sem limite | aqui sim cresce |

A caixa sai de um único `select ... from agg`; a comissão, de um cruzamento de quatro CTEs
de uma linha cada. Nenhuma delas tem o que paginar. A única lista sem teto é a de estoque,
limitada pelo catálogo de produtos e fora do escopo daquela feature. A resolução está
escrita no spec com essa evidência.

---

## 6. Dois defeitos reais encontrados e corrigidos

**(a) Colisão de `aria-label`** — o `aria-label` "Filtros da comissão por profissional"
criado na T-022 colidiu com `screen.getByLabelText(/profissional/i)` de
`tests/relatorio-comissao.spec.tsx`, que passou a encontrar dois elementos. **Corrigido no
código de produção** (labels renomeadas para "Filtros do relatório de comissão" e
"Resultados do relatório de comissão"), **não** afrouxando o teste existente.

**(b) Fragilidade de timeout do vitest** — o primeiro teste de cada arquivo estourava o
padrão de 5 s sob carga paralela, **independentemente** desta feature (verificado removendo
o arquivo novo: a falha continuava). Alinhado `testTimeout: 15000` em `vitest.config.ts`,
mesmo teto que as specs de UI já usavam em `it(..., 15000)`. **Nenhuma asserção mudou.**

> **Nenhum dos dois virou lição.** O motor recusa lição sem sinal registrado
> (`LICAO_SEM_LASTRO`) e nenhum dos dois problemas gera sinal de audit. Eles estão
> registrados nos corpos dos commits, que é onde resolvem.

---

## 7. Qualidade das provas: teste por mutação

Nenhuma prova foi aceita só porque ficou verde. Cada uma foi verificada perturbando o
código e confirmando que o teste falha:

| Mutação | Resultado |
|---|---|
| Remover `marginTop` da seção do Relatório de Estoque | só aquele teste de AC-038 cai |
| Trocar `FONT_SIZE_HEADING` por `"1.5rem"` literal no Login | teste de AC-037 falha (`expected ... to contain 'fontSize: FONT_SIZE_HEADING'`) |
| Remover `aria-current` do App | 2 testes de AC-039 caem |
| Remover o `borderBottom` da aba ativa | 3 testes de AC-039 caem |
| Remover tokens do `<h1>` do shell | teste do shell falha |
| Trocar `ErrorMessage` por `<p>` no Dashboard | teste de AC-040 falha com `Unable to find role="alert"` |

O teste-guarda de AC-038 (sem tag `@spec:`) existe para impedir que o helper de separação
passe a aceitar `gap` no futuro sem que nada reclame.

---

## 8. O que **não** foi feito (e por quê)

- **Validação visual humana — EXECUTADA** (ver §11). Encontrou um defeito real, já
  corrigido. Duas observaçõesCosméticas e um bug pré-existente continuam abertos.
- **`npx supabase db reset` nunca foi executado nesta sessão.** As renovações de prova
  usaram `onp-spec verify` com `ONP_VERIFY_FEATURE`, sem o wrapper
  `onp-feature-verify.cjs` — logo sem reset. Os 14 arquivos pgTAP são `begin; ... rollback;`
  com fixtures idempotentes, então não dependem de banco resetado.
- **`relatorios-gerenciais` continua `rascunho`**, embora com 11/11 provados. Fechar ou não
  é decisão de produto; não estava no escopo.
- **`legado-baseline` continua `em-implementacao`**, com 1/1 provado. Idem.
- **`marginBottom: 24` literal no `<nav>` de `App.tsx`** mantido: nenhum AC pede, e a
  T-023 é escopo de indicador de aba.
- O `<nav>` não recebeu `aria-label` (observado no inventário, mas nenhum AC exige).

---

## 9. Lição registrada (L-001, confirmada)

> Alterar `src/` ou `tests/` desatualiza a prova de **todas** as features que esses
> arquivos abrangem, não apenas da tarefa em curso: renove com
> `onp-spec verify <feature>` para cada uma.

Nasceu na T-022, recorreu na T-023 e foi promovida pelo motor. O ciclo se fechou: no gate
final, `audit --ci` bloqueou com 3 erros `VERIFY_OBSOLETO` (que em modo CI escalam de aviso
para erro) — exatamente o que a lição descrevia. Aplicada, o `EXIT=0` veio em seguida.

---

## 10. Como re-verificar do zero

```bash
# 1. tipos
npx tsc -b

# 2. suíte completa (11 arquivos)
npx vitest run --config=vitest.config.ts

# 3. prova das features desta sessão
node scripts/onp-feature-verify.cjs refinamento-interface
node scripts/onp-feature-verify.cjs recuperacao-carga

# 4. veredito — deve sair 0
node .claude/skills/onp-spec-driven/scripts/onp-spec.mjs audit --ci
```

> Se você alterar `src/` ou `tests/` no passo 2, o passo 4 vai acusar `VERIFY_OBSOLETO`
> nas outras features. É a L-001 funcionando, não defeito: renove com
> `$env:ONP_VERIFY_FEATURE="<feature>"; node .claude/skills/onp-spec-driven/scripts/onp-spec.mjs verify <feature>`.

### Checklist da validação visual humana (executada — ver §11)

Para subir o sistema localmente:

- Stack Supabase local em `http://127.0.0.1:54321` (`.env` já aponta para lá).
- Usuário: `teste@gmail.com` / `12345678` (perfil ADMIN, salão `...0001`).
  Se faltar, `node scripts/bootstrap-local-test-user.cjs`.
- `npm run dev` → http://localhost:5173
  (não use `npm run dev -- --port 5173`: o npm consome as flags e o vite interpreta
  `5173` como **diretório raiz**, servindo 404 em tudo).

O que olhar, com base no que a spec pediu:

1. **Aba ativa** — borda crimson embaixo + negrito; a barra não deve mudar de altura ao
   trocar de aba.
2. **Títulos** — `1.5rem` via token nas páginas; `<h1>` do shell **maior** que o `<h2>`
   (32px contra 24px).
3. **Formulário vs. lista** — a lista dentro de `Card` com borda (antes só havia
   `marginBottom`).
4. **Botões** — primário vermelho sólido, destrutivo em contorno vermelho, neutro branco.
5. **Estados vazios** — região de estado vazio em vez de lista morta.
6. **Navegação por teclado / leitor de tela** — `aria-current` anunciado na aba ativa.

Baseline comparativo: as 11 telas da auditoria anterior estão em
`docs/screenshots/visual-audit/`. As telas capturadas nesta feature estão em
`docs/screenshots/validacao-visual/`.

> O banco pode estar sem dados de desenvolvimento (houve `db reset` em momento anterior do
> histórico). Tela vazia é o `EmptyState` novo funcionando — nesse caso, criar dados de
> exemplo para ver a tela cheia.

---

## 11. Validação visual humana — executada

**Como.** Playwright dirigindo a app local em Chromium headless (1440×960), login com o
usuário de teste, captura das 11 telas e medição dos estilos computados. Imagens em
`docs/screenshots/validacao-visual/`.

> O caminho inicial não era esse: as ferramentas de navegador do harness só funcionam com o
> app desktop conectado (`[browser.disconnected]`). O Playwright já estava no projeto
> (`node_modules/playwright`, sem entrada em `package.json`) com Chromium em cache. A
> versão instalada pede `chromium-1243` e o cache tem `chromium-1217` — o `executablePath`
> foi apontado para o binário existente, evitando download.

### Confirmado na tela, com valores medidos

| Item | Medido no navegador |
|---|---|
| Aba ativa | `border-bottom: 2px solid rgb(220,20,60)` + `font-weight: 700` |
| Aba inativa | `2px solid transparent`, `font-weight: 400` → **mesma espessura, sem pulo de layout** |
| Botão primário | fundo `rgb(220,20,60)`, texto branco, negrito |
| Card da lista | `1px solid rgb(224,224,224)` |
| Grupo do formulário | `margin-bottom: 24px` |
| Estado vazio | texto `rgb(220,20,60)` dentro do card |
| Título do sistema | `32px` |
| Título da página | `24px` (token) |

### Defeito encontrado e corrigido

**Título do sistema e título da página ficaram do mesmo tamanho.** Causa: o `<h1>` do
shell recebeu `FONT_SIZE_HEADING` na T-024. Medido: `24px` contra `24px`, mesmo peso — a
hierarquia pedida pela US-016 estava perdida e **nenhum AC acusou**: o AC-037 foi
satisfeito literal (o título referencia os tokens), o audit saiu 0 e a tela ficou pior.
Este é o argumento definitivo de por que a prova mecânica e a validação visual são gates
distintos.

Decisão do dono do produto: **reverter o `<h1>` para o padrão do navegador** (32px),
mantendo o token nos títulos das 11 páginas. Medido após a correção: `32px` contra `24px`.

O achado virou **guarda permanente** em
`tests/ui/refinamento-interface-tipografia.spec.tsx` (sem tag `@spec:`, por não ser escopo
de nenhum AC): o shell não pode fixar tamanho inline e a página usa o token. Verificado por
mutação — com o `<h1>` tokenizado de novo, o guarda falha com `expected '1.5rem' to be ''`.

> Limite conhecido: o jsdom não resolve o tamanho default do `h1` (2em), então o guarda
> verifica o contrato ("shell sem tamanho inline forçado"), não a comparação em pixels. A
> comparação em pixels foi medida no navegador e está na tabela acima.

### Achados abertos (nenhum bloqueia a feature)

1. **Falha de carga que deixava a tela morta — impacto RESOLVIDO pela feature
   `recuperacao-carga`.** A primeira busca após o login às vezes falhava com
   `HTTP 401 :: JWT issued at future`, e o Dashboard ficava com erro e "Carregando..."
   travado até navegar para outra aba e voltar. **Intermitente:** ocorreu em 2 das execuções
   de captura e não reproduziu em 11 execuções de controle.
   - **Causa do `401`: NÃO determinada.** Refutado por medição: token ausente na primeira
     requisição (sempre presente) e desvio de relógio host/Postgres/auth (0 s). Registrado
     como Q-015, com o que falta para fechá-la.
   - **Impacto resolvido.** A feature `recuperacao-carga` deu a ação "Tentar novamente" a
     todas as páginas que carregam dados. Na validação visual dessa feature o `401`
     ocorreu de novo — e a recuperação funcionou de imediato. Evidência:
     `docs/screenshots/validacao-visual/13-carga-com-erro.png` e
     `14-carga-recuperada.png`. A causa segue desconhecida, mas deixou de ser terminal.
2. **Abas da navegação não usam o componente `Button`.** Medido: `font-family: Arial`,
   `13.33px`, contra `sans-serif` 16px no resto da app. São `<button>` nativos e destoam.
   AC-035/AC-036 listam outras ações, não as abas.
3. **Label aninhada colada no select** em Comandas ("Profissional (opcional)Nenhum"), sem
   espaço entre texto e controle.
4. **Região de resultados vazia** em Caixa e Comissão: `section[aria-label="Resultados…"]`
   existe antes da primeira consulta, sendo um landmark vazio. Correto para AC-038 e
   invisível para o usuário.

---

## 12. Riscos conhecidos para o avaliador

1. **A prova mecânica não cobre percepção visual — e já provou isso.** A validação visual
   (§11) encontrou um defeito em que o audit estava limpo e todos os testes passavam. A
   spec separa os dois gates por um motivo concreto, não teórico. Ainda assim, "harmonia
   entre variantes" e "separação perceptível" são julgadas por olho humano e continuam
   sendo o judge's final.
2. **Grupo de formulário = `form` nomeado.** Para não quebrar o teste de AC-032
   (`form.nextElementSibling` precisa continuar sendo a `SECTION` "Lista…"), o grupo do
   formulário é o próprio `<form>` com `aria-label` — landmark `form` nomeado — em vez de
   um `<div role="group">` wrapper. É estruturalmente equivalente para AC-038, mas é uma
   escolha que vale conferir contra o texto do critério.
3. **A borda transparente nas abas inativas** foi decisão de implementação minha, não da
   spec: preserva a altura da barra, e a medição confirma (2px em ativas e inativas). A
   alternativa, se preferir borda visível nas inativas, é `2px solid` na cor secundária.
4. **Taxonomia dos nomes de `aria-label` não é coberta por critério.** Ela foi escolhida para
   não colidir com queries por label existentes (ver §6a). Um `aria-label` futuro pode
   reintroduzir a colisão sem nenhum teste reclamar.
5. **`relatorios-gerenciais` tem 11/11 provados e status `rascunho`**, e
   `legado-baseline` tem 1/1 com status `em-implementacao`. Se a intenção for fechar tudo,
   falta decisão de produto, não trabalho de engenharia.
6. **A causa do `401` (§11.1) continua desconhecida.** O impacto foi resolvido pela feature
   `recuperacao-carga`, mas a origem do erro não foi estabelecida. Se reaparecer em uso
   real, o caminho é o log do GoTrue no instante da falha (Q-015).

---

## 13. Feature `recuperacao-carga` — T-025 e T-026

Criada depois da redação original deste relatório, a partir do achado 1 da §11. Leia esta
seção se você for avaliar o estado atual do repositório.

**Problema com causa raiz identificada.** Toda página carregava dados uma única vez, no
`useEffect` de montagem, sem nenhuma forma de pedir nova tentativa. O estado de erro era
terminal: a tela só voltava a funcionar por uma montagem nova, ou seja, trocando de aba.

**O que foi feito.** `ErrorMessage` ganhou a prop **opcional** `onRetry`; sem ela, o
componente renderiza exatamente como antes (`role="alert"` e `aria-live="assertive"`
preservados — `AC-045`). As 10 páginas restantes trocaram o `<p style={{color: "crimson"}}>`
por `ErrorMessage` com `onRetry` passando a própria função de carga. Caso especial: nos
relatórios de Caixa e Comissão a carga vem do submit do formulário, não da montagem, então
`buscar()` foi separado de `handleFiltrar`. `LoginPage` ficou de fora: o erro dela é de
autenticação, não de carga.

**Defeito encontrado pela própria prova.** A primeira versão esquecia de limpar o erro no
início da carga. O `AC-043` reprovou: sem `setErro(null)`, o alerta persistiria mesmo após
uma nova tentativa bem-sucedida, tornando a ação inútil. Corrigido nas 11 páginas. É o mesmo
padrão do `<h1>` achatado (§11): a letra do critério passa, o comportamento falha.

**Prova.** `tests/ui/recuperacao-carga.spec.tsx`, 13 testes: 3 do mecanismo (incluindo a
semântica com e sem `onRetry`) e 10 de cobertura — 8 com falha na carga de montagem, 2 com
falha por submit. Mutação verificada: remover o `onRetry` de uma página derruba exatamente
o teste dela e mantém as outras 9 verdes. Zero regressão nas 11 suítes.

**Validação visual.** `docs/screenshots/validacao-visual/13-carga-com-erro.png` mostra o
erro com a ação disponível; `14-carga-recuperada.png` mostra os dados após um clique. Na
mesma execução o `401 JWT issued at future` ocorreu de novo — **a recuperação funcionou de
imediato**. Terceira observação do erro: a causa segue desconhecida, mas deixou de ser
terminal.

**Uma nota sobre Q-015.** A pergunta foi marcada `respondida`, e o texto é explícito: *"A
causa NÃO foi determinada"*. `respondida` ali significa que a investigação terminou com
"evidência insuficiente", não que o erro foi resolvido. Quem ler o spec e encontrar
`respondida` deve ler a resposta inteira antes de concluir que houve diagnóstico.

**Escopo deliberadamente não incluído:** refetch automático ao recuperar o foco da aba,
retry com backoff e a correção do `401` em si. As três foram decididas fora, e a última por
não ser reproduzível.
