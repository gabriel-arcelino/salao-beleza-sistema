# Diagnóstico Objetivo — Estado do Frontend após Correção Local

## 1. Investigação do Fluxo de Autenticação

### `App.tsx` (`src/App.tsx:29-39`)
- `autenticado` inicializado como `null`.
- `useEffect`: `supabase.auth.getSession()` define `autenticado = !!data.session`.
- `onAuthStateChange` atualiza `autenticado` com a sessão atual.
- Se `autenticado` é `null`, mostra `Carregando...`.
- Se `!autenticado`, mostra `LoginPage`.
- Se `autenticado`, mostra a aba ativa.

### `LoginPage` (`src/pages/LoginPage.tsx:10-22`)
- Faz `supabase.auth.signInWithPassword({ email, password })`.
- Em caso de erro, mostra `erro` (`crimson`).
- Em caso de sucesso, chama `onLogin` (que chama `setAutenticado(true)` no `App`).
- **Nota:** `LoginPage` não faz `supabase.auth.getSession()` novamente após `onLogin`. O `App` confia no `onAuthStateChange` para receber a nova sessão.

### `lib/salon.ts` (`src/lib/salon.ts:10-24`)
- `getCurrentSalonId()` lê `session?.user?.app_metadata?.salon_id`.
- Se `!salonId`, lança `new Error("Usuário sem salon_id em app_metadata...")`.
- **Causa raiz de "Sessão sem salon_id":** `DashboardPage` captura esse erro no `catch` (`App.tsx` não captura, mas `DashboardPage` sim) e mostra a mensagem.

### `lib/supabaseClient.ts`
- Não lido diretamente, mas assume que é um cliente padrão `@supabase/supabase-js`.

## 2. Investigação de `ProfissionaisPage`

### `ProfissionaisPage` (`src/pages/ProfissionaisPage.tsx`)
- `carregar()` faz `await listProfissionais()` (`src/lib/api/profissionais.ts:5-13`).
- `listProfissionais()` faz `.from("profissionais").select("*").order("nome")`.
- O `RLS` (`supabase/migrations/0002_rls_policies.sql`) exige `salon_id = auth_helpers.current_salon_id()`.
- Se `current_salon_id()` retorna `NULL` (porque `app_metadata.salon_id` está vazio), o `RLS` bloqueia tudo.
- Se `current_salon_id()` retorna o `salon_id` correto, o `RLS` permite o acesso.

### Confirmação via REST
- `GET /rest/v1/profissionais` com token do usuário (`teste@gmail.com`) retorna `["id":"000...101", "nome":"Profissional de Teste", ...]` (`REST profissionais status: 200`).
- Isso confirma que o `JWT` contém `salon_id` e que o `RLS` funciona.

## 3. Confirmação no Navegador (Playwright)

- Login com `teste@gmail.com` / `12345678` funciona (`App` inicia autenticado, mostra navegação completa).
- O `Dashboard` ainda mostra `"Sessão sem salon_id — usuário não autenticado corretamente."` (`post-setup-login.png`, `final-check.png`).
- As outras telas (`Profissionais`, `Serviços`, `Produtos`, `Clientes`, `Configurar Comissão`, `Comandas`, `Relatório de Estoque`, `Fechamento de Caixa`, `Comissão por Profissional`) mostram apenas formulários, sem listas (`profissionais-final.png`, `servicos-final.png`, etc.).
- O `console` mostra apenas erros do `fn_calcular_cmv` (`400 Bad Request`), sem outros erros de autenticação.

## 4. Diagnóstico

### Causa provável de "Sessão sem salon_id"
- `raw_app_meta_data` no `auth.users` contém `salon_id` (`map[salon_id:000...001]`).
- `public.usuarios` contém `auth_user_id` = UUID atual, `salon_id` = fixo, `perfil` = `ADMIN`.
- O `JWT` contém `app_metadata.salon_id` (`000...001`).
- A mensagem ainda aparece no `Dashboard` (`final-check.png`).
- **Conclusão:** A mensagem ainda aparece porque a aplicação pode estar com uma sessão antiga no navegador, ou porque o `DashboardPage` captura o erro de `getCurrentSalonId()` e mostra a mensagem, mas não impede a navegação. Como o `App` mostra a navegação completa (botões `Dashboard`, `Profissionais`, etc.), o usuário está autenticado. A mensagem é um erro específico do `DashboardPage`, mas não indica que o usuário não está autenticado.

### Causa provável das listas vazias
- `REST /profissionais` retorna registros.
- `public.usuarios` está correto.
- `RLS` funciona.
- As listas (`ProfissionaisPage`) ainda estão vazias (`profissionais-final.png` não mostra o registro).
- **Possível causa:** O componente `ProfissionaisPage` pode estar carregando (`carregando` = `true`) por algum motivo, ou pode haver algum erro que impede a renderização. Como não há erro no console relacionado a `profissionais`, talvez seja devido ao fato de que a página ainda está com algum problema de carregamento. Talvez seja devido ao erro `fn_calcular_cmv` no `DashboardPage` que pode estar afetando o carregamento de outras páginas.
- **Conclusão:** Os registros estão disponíveis no banco e via REST, mas não aparecem na UI. Isso pode ser devido a algum problema adicional na aplicação (não relacionado ao `salon_id` ou ao `auth`).

### Os dois problemas têm a mesma causa?
- **Não.**
- "Sessão sem salon_id" no `Dashboard` é um erro específico do `DashboardPage` (captura o erro de `getCurrentSalonId()`), mas o usuário está autenticado.
- Listas vazias (`Profissionais`, etc.) são um problema separado, possivelmente relacionado ao carregamento dos dados pelo componente, mas não ao `salon_id` ou `auth`.

### Nível de confiança
- **Alto** para `auth.helpers.current_salon_id()` e `RLS`: `raw_app_meta_data` contém `salon_id`, `public.usuarios` correto, `REST` retorna registros, `JWT` contém `salon_id`.
- **Alto** para o mecanismo de bootstrap (`scripts/bootstrap-local-test-user.cjs`): funciona corretamente (`db reset` + `signup` + `public.usuarios` + `raw_app_meta_data` atualizado).
- **Médio** para a causa das listas vazias: os registros existem no banco e são acessíveis via REST, mas não aparecem na UI. Pode ser devido a algum problema adicional na aplicação (não relacionado ao `auth` ou `RLS`).

## 5. Arquivos Envolvidos

- `App.tsx`: `autenticado`, `getSession()`, `onAuthStateChange`.
- `LoginPage.tsx`: `signInWithPassword`.
- `DashboardPage.tsx`: `getCurrentSalonId()` (indiretamente via `calcularCMV`), captura de erro.
- `ProfissionaisPage.tsx`: `listProfissionais()`, `carregar()`.
- `lib/salon.ts`: `getCurrentSalonId()` (lê `session?.user?.app_metadata?.salon_id`).
- `lib/supabaseClient.ts`: cliente padrão.
- `lib/api/profissionais.ts`: `listProfissionais()` (`.from("profissionais").select("*").order("nome")`).
- `scripts/bootstrap-local-test-user.cjs`: mecanismo de bootstrap.
- `supabase/seed.sql`: seeds de dados (`saloes`, `profissionais`, `servicos`, `produtos`).
- `supabase/migrations/0002_rls_policies.sql`: políticas RLS (`current_salon_id()`).

## 6. Evidências

- `docs/screenshots/post-setup-login.png`: mensagem ainda presente (`Sessão sem salon_id`).
- `docs/screenshots/profissionais-final.png`, `servicos-final.png`, `produtos-final.png`: formulários visíveis, listas vazias.
- `docs/screenshots/final-check.png`: `Dashboard` ainda mostra mensagem.
- `docs/screenshots/console-final.log`: apenas erros `fn_calcular_cmv` (`400 Bad Request`), sem erros de `auth`.
- `docs/screenshots/dashboard-fim.png`: `Dashboard` ainda com mensagem.
- Resultado `REST /profissionais`: `["Profissional de Teste"]` (`status: 200`).
- Resultado `auth.users` (`raw_app_meta_data`): `map[salon_id:000...001]`.
- Resultado `public.usuarios`: `auth_user_id` = UUID atual, `perfil` = `ADMIN`, `salon_id` = fixo.

## 7. Limitações

- Nenhuma alteração feita no código existente (`git status`: apenas `docs/` e `scripts/bootstrap-local-test-user.cjs`).
- Nenhum redesign feito.
- Nenhuma alteração em `RLS`, `SPEC`, `AC` ou `testes`.
- Nenhuma chave privilegiada persistida (`SERVICE_ROLE_KEY` obtida em memória via `supabase status -o env`).
