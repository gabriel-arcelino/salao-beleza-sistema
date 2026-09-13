# Sistema de Gestão — Salão de Beleza

Setup inicial gerado a partir de:
- `plano-arquitetura-salao-beleza-v2_4.md` (schema, regras de negócio)
- `processo-dev-salao-beleza.md` (processo de desenvolvimento com IA)

## 1. Setup local

```bash
npm install
cp .env.example .env   # preencha com as chaves do seu projeto Supabase
npm run dev
```

## 2. Ambiente Supabase (dev local, grátis, via Docker)

Requer [Docker](https://docs.docker.com/get-docker/) e a [Supabase CLI](https://supabase.com/docs/guides/cli).

```bash
npx supabase init        # se ainda não tiver rodado neste projeto
npx supabase start       # sobe Postgres local
npx supabase db reset    # aplica as migrations em supabase/migrations/
npx supabase test db     # roda os testes pgTAP em supabase/tests/
```

**Nunca teste uma RPC financeira nova direto contra o projeto cloud.** Rode local primeiro (Protocolo B do processo de dev) — é grátis e não arrisca dado real.

## 3. Estrutura

```text
/
├── src/                        # frontend React + Vite + TS
│   ├── lib/supabaseClient.ts   # client único, só anon key
│   ├── lib/api/                # funções de acesso ao Supabase (REST + RPC)
│   ├── lib/salon.ts            # getCurrentSalonId() helper
│   ├── pages/                  # telas (Protocolo A)
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx   # Fase 3 — cards de alerta + CMV
│   │   ├── ProfissionaisPage.tsx
│   │   ├── ClientesPage.tsx
│   │   ├── ServicosPage.tsx
│   │   ├── ProdutosPage.tsx
│   │   ├── ConfigComissoesPage.tsx
│   │   ├── ComandasPage.tsx    # Fase 2 — fluxo de fechamento
│   │   └── RelatorioEstoquePage.tsx  # Fase 3 — saldo negativo
│   ├── App.tsx
│   └── main.tsx
├── supabase/
│   ├── migrations/
│   │   ├── 0001_initial_schema.sql   # Seção 10 do plano
│   │   ├── 0002_rls_policies.sql     # Seção 19 do plano
│   │   ├── 0003_fechamento_comanda_schema_fix.sql
│   │   ├── 0004_fn_fechar_comanda.sql
│   │   ├── 0005_cancelamento_schema_fix.sql
│   │   ├── 0006_fn_cancelar_comanda.sql
│   │   ├── 0007_security_definer_search_path.sql
│   │   ├── 0008_pagamento_estornos.sql
│   │   ├── 0009_fn_estornar_pagamento.sql
│   │   ├── 0010_fn_fechar_competencia_comissao.sql
│   │   └── 0011_fn_calcular_cmv.sql  # Fase 3 — CMV
│   └── tests/
│       ├── 001_rls_isolamento_salao.sql
│       ├── 002-010 (RPCs Fase 2)
│       ├── 011_fn_fechar_competencia_comissao.sql
│       └── 012_fn_calcular_cmv.sql   # Fase 3 — CMV test
├── .github/workflows/ci.yml    # migrations + pgTAP em todo PR
├── .env.example
└── vite.config.ts
```

## 4. Fase 1 implementada — como testar ponta a ponta

As 5 telas da Fase 1 (Protocolo A) já estão em `src/pages/`, na ordem exata da Seção 34 do plano: Profissionais → Clientes → Serviços → Produtos → Configurar Comissão.

**Passo manual obrigatório antes do primeiro login** (não existe tela de cadastro de usuário/salão ainda — isso é Fase 5, fora de escopo agora):

1. Rode as migrations (`npx supabase db reset`) e, com o Supabase local ou o projeto cloud aberto, insira uma linha em `saloes` manualmente (Studio → Table Editor, ou `insert into saloes (nome) values ('Salão de Teste');`).
2. Vá em **Authentication → Users** no dashboard do Supabase e crie um usuário com e-mail/senha.
3. No mesmo usuário, edite `app_metadata` (não `user_metadata`) e adicione `{"salon_id": "<uuid da linha que você criou em saloes>"}`. Isso é o que a RLS e o `getCurrentSalonId()` do frontend leem (Seção 19).
4. Insira também uma linha em `usuarios` vinculando esse `auth_user_id` ao `salon_id`, com `perfil = 'ADMIN'` — sem isso, as políticas de RLS por perfil (Seção 17.2) bloqueiam toda escrita.
5. Rode `npm run dev`, faça login com esse usuário, e siga a ordem das abas — cada uma alimenta a seguinte (ex.: "Configurar Comissão" precisa de profissionais e serviços já cadastrados).

**Checklist de aceite da Fase 1** (Seção 34, até onde este setup cobre):
- [ ] Cadastrar profissional
- [ ] Cadastrar cliente
- [ ] Cadastrar serviço
- [ ] Cadastrar produto
- [ ] Configurar comissão (base, rateio de taxa)

## 5. Fases implementadas (Fase 2 + Fase 3)

### Fase 2 — Financeiro (Protocolo B)
Todas as RPCs estão implementadas e validadas com `npx supabase test db` (57 testes passando):

1. `fn_fechar_comanda` — migration 0004, fechamento de comanda com rateio de comissão, taxa e estoque
2. `fn_cancelar_comanda` — migration 0006, cancelamento com geração de ajustes de comissão retroativos
3. `fn_estornar_pagamento` — migration 0009, estorno parcial/múltiplo de pagamentos
4. `fn_fechar_competencia_comissao` — migration 0010, fechamento mensal de comissão com abatimento de adiantamentos e saldo devedor rolado

**Bug crítico corrigido na migration 0010**: a variável PL/pgSQL `FOUND` era sobrescrita pelos `SELECT INTO` intermediários, fazendo a função tomar o caminho de UPDATE em vez de INSERT. Corrigido com a variável dedicada `v_fechamento_existente boolean`.

### Fase 3 — Estoque/CMV
- `fn_calcular_cmv` — migration 0011, calcula o Custo do Mercadoria Vendida por competência
- Dashboard com cards de alerta (estoque negativo + CMV)
- Relatório "Saldo negativo — pendente de correção"
- Simulação de e-mail diário de saldo negativo (Protocolo A — leitura/exibição)

### Fase 4 — CI (migrações + testes)
Migrations e testes pgTAP são validados em todo PR via `.github/workflows/ci.yml`.

## 8. Pendências conhecidas (confira antes de ir pra produção)

- **`ajustes_comissao`**: o plano de arquitetura nunca especificou os campos dessa tabela explicitamente — os campos em `0001_initial_schema.sql` são uma inferência a partir do uso descrito nas Seções 11.5/11.7/40. Revise antes de tratar como definitivo.
- **`saloes`**: tabela de tenant não estava nomeada no plano original; criei com campos mínimos (`id`, `nome`, `ativo`) só para satisfazer as FKs de `salon_id`. Ajuste se o cadastro de salão precisar de mais campos (endereço, CNPJ, etc.).
- **E-mail diário de saldo negativo**: a simulação no Dashboard (Protocolo A — leitura/exibição) mostra o conteúdo que um job server-side enviaria. A implementação real do job (agendamento + envio SMTP) depende de uma função serverless ou Edge Function, fora do escopo atual.

## 7. Deploy — Cloudflare Pages (grátis, permite uso comercial)

1. Suba este repositório no GitHub.
2. No [dashboard da Cloudflare](https://dash.cloudflare.com/) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
3. Selecione o repositório. Configuração de build:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Em **Environment variables**, adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (mesmos valores do seu `.env`, mas do projeto Supabase de produção — nunca o de dev local).
5. Cada push na branch principal gera deploy automático; cada PR gera um preview URL próprio — use isso para testar antes de mergear, é o mesmo fluxo de preview que a Vercel ofereceria, só que sem a restrição de uso comercial.

Não é necessário nenhum step de deploy no GitHub Actions — a integração da Cloudflare com o Git já cuida disso. O workflow em `.github/workflows/ci.yml` serve só como gate de qualidade (migrations + testes) antes do merge.
