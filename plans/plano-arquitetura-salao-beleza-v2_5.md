# Documento de Arquitetura e Especificação (v2.5)

**Sistema de Gestão para Salão de Beleza**

- **Versão:** 2.5
- **Status:** Arquitetura atual (documento vigente a partir de 17/09/2026)
- **Referência histórica:** `plano-arquitetura-salao-beleza-v2_4.md` preservado como histórico; esta versão o substitui conceitualmente.
- **Data de referência:** 17/09/2026
- **Plataformas:** Web responsiva / Computador / Celular (protótipo funcional)
- **Nota de diferenciação:** Este documento separa explicitamente:
  - **Implementado:** código, migrations, testes, RPCs, APIs, páginas existentes.
  - **Planejado:** próximo ciclo de evolução (Fase 5 — UI/UX; Fase 6 — Produção e governança).
  - **Futuro:** funcionalidades ainda sem migração, código ou testes (ex.: agenda robusta, CRM, integração fiscal, WhatsApp automático, e-mail automático via Resend).

---

## 1. Visão Geral

O sistema é uma aplicação web de gestão operacional e financeira para salões de beleza e clínicas de estética de pequeno e médio porte.

Integra, como implementado hoje:
- cadastro de profissionais, clientes, serviços, produtos;
- registro de comandas com itens de serviço/produto;
- múltiplas formas de pagamento, cálculo de taxas e comissões configuráveis por salão;
- controle de estoque de produtos para revenda com CMV por Custo Médio Ponderado Móvel;
- registro de despesas, ajustes de comissão e adiantamentos;
- fechamento transacional de comanda (`fn_fechar_comanda`);
- cancelamento com restrições (`fn_cancelar_comanda`);
- estorno de pagamento (`fn_estornar_pagamento`);
- fechamento mensal de competência de comissão (`fn_fechar_competencia_comissao`);
- relatório de caixa (`fn_relatorio_caixa`) e relatório de comissão (`fn_relatorio_comissao`);
- dashboard com card de alerta visual para estoque negativo (sem bloqueio de venda);
- autenticação via Supabase Auth com multi-tenancy por `salon_id`.

A prioridade arquitetural mantém-se: **consistência, segurança, simplicidade operacional** e não escalabilidade distribuída excessiva.

---

## 2. Contexto do Negócio (preservado da v2.4)

| Característica                       | Estado atual |
| ------------------------------------ | ------------ |
| Profissionais                        | Configurável por salão |
| Atendimentos/dia                     | ~8 (referência) |
| Dispositivos                         | Celular / Computador |
| Forma de operação                    | Digital (protótipo funcional) |
| Comissão                             | Individual por profissional, configurável (`config_comissoes`) |
| Repasse                              | Mensal (`fechamentos_comissao`) |
| Venda de produtos                    | Sim (`ProdutosPage`, estoque) |
| Controle de estoque                  | Sim (`fn_calcular_cmv`, estoque atual, estoque mínimo) |
| Controle de insumos                  | Não (fora do escopo inicial) |
| Despesas                             | Sim (`despesas`, `ajustes_comissao`) |
| DRE gerencial                        | Planejado para Fase 5/6; não implementado ainda |
| Relatórios gerenciais                | **Implementado:** caixa (`fn_relatorio_caixa`) e comissão (`fn_relatorio_comissao`) |

---

## 3. Objetivos do Sistema (atualizados)

### 3.1 Objetivo principal
Permitir que o estabelecimento registre e acompanhe a operação financeira decorrente dos atendimentos realizados, com isolamento por salão e auditoria.

### 3.2 Objetivos específicos implementados
1. Cadastro rápido (profissionais, clientes, serviços, produtos, comissões).
2. Comandas com fluxo de fechamento idempotente (`fn_fechar_comanda`).
3. Cálculo automático de taxas, comissões configuráveis e baixa de estoque sem bloqueio.
4. Registro de despesas, ajustes e adiantamentos.
5. Fechamento mensal de comissão com trava de competência (`fn_fechar_competencia_comissao`).
6. CMV (`fn_calcular_cmv`).
7. Relatório de caixa (`fn_relatorio_caixa`).
8. Relatório de comissão por profissional (`fn_relatorio_comissao`).
9. Alerta visual de estoque negativo (Dashboard, RelatorioEstoquePage).
10. Autenticação multi-tenant com RLS (`auth_helpers.current_salon_id()`).

### 3.3 Objetivos planejados (Fase 5 e 6)
- Design system mínimo, responsividade, estados de interface (loading, erro, sucesso).
- Componentes reutilizáveis e navegação padronizada.
- Acessibilidade, padronização de formulários e tabelas.
- Revisão das páginas existentes sob a nova UI/UX.
- DRE gerencial, observabilidade, backup/recuperação, endurecimento de segurança.
- LGPD operacional e preparação para go-live.

---

## 4. Escopo

### 4.1 Dentro do escopo (implementado)
- Operação: profissionais, clientes, serviços, produtos, comandas, pagamentos.
- Financeiro: taxas, comissões configuráveis, despesas, ajustes, adiantamentos, fechamento mensal de comissão, relatório de caixa, relatório de comissão.
- Estoque: produtos para revenda, entradas, vendas, ajustes, perdas, inventário, estoque mínimo, CMV.
- Autenticação e multi-tenancy via Supabase Auth + `auth_helpers.current_salon_id()`.

### 4.2 Planejado (Fase 5 — UI/UX e consolidação)
- Design system mínimo, responsividade, estados de interface, acessibilidade.
- Navegação e componentes reutilizáveis.
- Padronização de formulários e tabelas.
- Revisão das páginas existentes (`App.tsx` é funcional, não final).

### 4.3 Depois (Fase 6 — Produção e governança)
- Observabilidade, backup/recuperação, endurecimento de segurança.
- LGPD operacional, definição contratual, preparação para go-live.

### 4.4 Fora do escopo inicial (futuro, não implementado)
- Controle de estoque de insumos consumidos em procedimentos.
- Controle de lote/validade.
- Ficha técnica de serviços; composição de produtos.
- Compras automatizadas; integração contábil/fiscal.
- Emissão fiscal; folha de pagamento trabalhista.
- Agenda robusta; CRM; integrações externas.
- Envio automático de e-mails (Resend) ou mensagens automáticas (WhatsApp).

---

## 5. Arquitetura Atual (estado real, não idealizada)

### 5.1 Visão física atual
O sistema não possui camadas físicas como `domain/`, `repositories/`, `services/` ou `hooks/`. A arquitetura real é:

- **Frontend:** React + TypeScript + Vite (`src/App.tsx`, `src/pages/`, `src/lib/`).
- **API/Client:** `src/lib/supabaseClient.ts` + `src/lib/api/*.ts` (clientes, comandas, estoque, profissionais, produtos, relatórios, servicos, config_comissoes).
- **Banco/PostgreSQL:** Supabase local (`supabase/migrations/`) com schema, RLS, RPCs (`fn_*`).
- **Autenticação:** Supabase Auth (`auth.uid()`, `auth.jwt()`) + `auth_helpers.current_salon_id()`.
- **RLS:** Políticas por `salon_id` (`0002_rls_policies.sql`).
- **Testes:** pgTAP (`supabase/tests/`), Vitest + Testing Library (`tests/`), adapter combinado (`scripts/onp-combined-verify.cjs`).
- **Configuração de verificação:** `onpspec.config.json`.

### 5.2 Arquitetura futura de evolução (registrada como planejada)
Quando a base de código crescer, pode ser útil introduzir camadas de domínio ou repositórios, mas **não deve ser introduzida apenas para satisfazer uma arquitetura idealizada**. A evolução deve ser incremental por feature.

### 5.3 Componentes principais (factual)
- `App.tsx`: aplicação raiz com abas (`ABAS`) integrando `DashboardPage`, `ProfissionaisPage`, `ClientesPage`, `ServicosPage`, `ProdutosPage`, `ConfigComissoesPage`, `ComandasPage`, `RelatorioEstoquePage`, `RelatorioCaixaPage`, `RelatorioComissaoPage`.
- `src/lib/supabaseClient.ts`: cliente Supabase compartilhado.
- `src/lib/salon.ts`: utilitário de contexto de salão (leitura de `app_metadata`).
- `src/lib/api/*.ts`: APIs específicas por domínio (clientes, comandas, estoque, profissionais, produtos, relatórios, servicos, config_comissoes).
- `src/pages/*.tsx`: páginas por aba, ainda funcionais/prototípicas.
- `src/types.ts`: contratos TypeScript alinhados ao banco (inclui `RelatorioCaixa`, `RelatorioComissao`, `RelatorioComissaoItem`, `ComandaComItens`).

---

## 6. Stack

### 6.1 Adotada (confirmada em `package.json`)
- **Frontend:** React 18.3.0, React DOM 18.3.0
- **Build:** Vite 5.4.0 (`vite.config.ts`), TypeScript 5.6.0 (`tsconfig.json`)
- **Client/DB:** `@supabase/supabase-js` 2.45.0
- **Testes:** Vitest 3.2.0, `@testing-library/react` 16.3.3, `@testing-library/dom` 10.4.2, `@testing-library/jest-dom` 7.0.1, `jsdom` 29.1.1
- **Lint:** ESLint 9.9.0, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`
- **Banco:** PostgreSQL (via Supabase local)

### 6.2 Não adotadas (não presentes em `package.json` ou código)
- **Tailwind CSS:** não instalado; não utilizado.
- **Recharts:** não instalado; não utilizado.
- **Lucide:** não instalado; não utilizado.

Nota: A UI atual é funcional/prototípica (`App.tsx` usa estilos inline simples). A próxima frente relevante é **UI/UX e consolidação (Fase 5)**, incluindo design system mínimo, responsividade, componentes reutilizáveis, estados de interface (loading/erro/sucesso), navegação, acessibilidade e padronização visual.

---

## 7. RLS / Multi-tenancy

### 7.1 Função de resolução de tenant
A função documentada e implementada é:

```
auth_helpers.current_salon_id()
```

Não existe `auth.current_salon_id()` no banco. A função `auth_helpers.current_salon_id()` lê `request.jwt.claims` (para testes) com fallback para `auth.jwt()`.

### 7.2 Distinção de responsabilidades
- **RLS:** isolamento/autorização por linha (`salon_id` em todas as tabelas operacionais; políticas `0002_rls_policies.sql`).
- **RPC/domínio:** regras financeiras e validações de negócio (`fn_fechar_comanda`, `fn_fechar_competencia_comissao`, `fn_cancelar_comanda`, etc.). As RPCs utilizam `security definer` e `search_path = ''` para evitar injeção de caminho, mas as regras de negócio (ex.: não vender com estoque negativo — que não bloqueia, apenas alerta) são implementadas no PL/pgSQL.

### 7.3 Perfil e acesso
- `auth_helpers.current_perfil()` retorna o perfil (`ADMIN`, `GERENTE`, `PROFISSIONAL`).
- A matriz de acesso da v2.4 é preservada: ADMIN e GERENTE têm acesso amplo; PROFISSIONAL vê apenas seus próprios dados (ex.: comissão), e não acessa relatório de caixa.

---

## 8. Frontend

### 8.1 Estrutura atual (factual)
```
src/
  App.tsx            # Raiz com abas (ABAS) e navegação simples
  types.ts           # Contratos TypeScript
  lib/
    supabaseClient.ts
    salon.ts
    api/
      clientes.ts, comandas.ts, estoque.ts, profissionais.ts,
      produtos.ts, relatorios.ts, servicos.ts, config_comissoes.ts
  pages/
    ClientesPage.tsx, ComandasPage.tsx, ConfigComissoesPage.tsx,
    DashboardPage.tsx, LoginPage.tsx, ProdutosPage.tsx,
    ProfissionaisPage.tsx, RelatorioCaixaPage.tsx,
    RelatorioComissaoPage.tsx, RelatorioEstoquePage.tsx,
    ServicosPage.tsx
  vite-env.d.ts
```

### 8.2 Estado da UI
A UI atual é **funcional/prototípica**, não final. Não há design system, componentes reutilizáveis padronizados, estados de interface completos ou acessibilidade implementada.

### 8.3 Evolução planejada (Fase 5)
- Design system mínimo (paleta, tipografia, espaçamento).
- Responsividade real (`flexWrap: wrap` existe, mas não é suficiente).
- Componentes reutilizáveis (botões, tabelas, cards, formulários).
- Estados de interface: loading, erro, sucesso, vazio (mensagens informativas já existem nos relatórios — `RelatorioCaixaPage`, `RelatorioComissaoPage` — mas precisam ser padronizados).
- Padronização de formulários e tabelas.
- Acessibilidade (aria-labels, contraste, navegação por teclado).
- Revisão das páginas existentes sob a nova base.

---

## 9. Relatórios (atualizados para o estado real)

### 9.1 Implementados
Os dois relatórios previstos estão implementados e testados:

- **Relatório de caixa:** `fn_relatorio_caixa(p_data_inicio, p_data_fim)` (migration `0012_relatorio_caixa.sql`); página `RelatorioCaixaPage.tsx`; tipo `RelatorioCaixa`; testes `tests/relatorio-caixa.spec.tsx` (AC-009, AC-011).
- **Relatório de comissão:** `fn_relatorio_comissao(p_competencia, p_profissional_id)` (migration `0013_relatorio_comissao.sql`); página `RelatorioComissaoPage.tsx`; tipo `RelatorioComissao`, `RelatorioComissaoItem`; testes `tests/relatorio-comissao.spec.tsx`.

Contratos reais das RPCs (confirmados nas migrations):
```
fn_relatorio_caixa(data_inicio, data_fim)
fn_relatorio_comissao(competencia, profissional_id)
```

API (`src/lib/api/relatorios.ts`): `getRelatorioCaixa` e `getRelatorioComissao` com parâmetros correspondentes.

### 9.2 Planejados / Futuros
- Exportação CSV/PDF dos relatórios.
- DRE gerencial completa (não implementada ainda; os relatórios existentes são de caixa e comissão, não um DRE consolidado).
- Paginação própria nas APIs (prática atual: retorna todos os registros disponíveis, sem paginação).

---

## 10. Migrations (atualizadas para o estado real)

A lista atual termina em `0013_relatorio_comissao.sql`. Não há migration `0014` ou além no projeto.

Lista factual (confirmada em `supabase/migrations/`):

- `0001_initial_schema.sql`
- `0002_rls_policies.sql`
- `0003_fechamento_comanda_schema_fix.sql`
- `0004_fn_fechar_comanda.sql`
- `0005_cancelamento_schema_fix.sql`
- `0006_fn_cancelar_comanda.sql`
- `0007_security_definer_search_path.sql`
- `0008_pagamento_estornos.sql`
- `0009_fn_estornar_pagamento.sql`
- `0010_fn_fechar_competencia_comissao.sql`
- `0011_fn_calcular_cmv.sql`
- `0012_relatorio_caixa.sql`
- `0013_relatorio_comissao.sql`

Nota: A função `auth_helpers.current_salon_id()` está em `0002_rls_policies.sql`. Não existe `auth.current_salon_id()` no banco.

---

## 11. Testes

### 11.1 Estratégia real
- **Banco (pgTAP):** `supabase/tests/*.sql` (13 arquivos, incluindo `001_rls_isolamento_salao.sql` até `013_relatorio_comissao.sql`). Validação via `scripts/onp-pgtap-verify.cjs` (container `supabase_db_salao-beleza-sistema`, porta 54322, `ON_ERROR_STOP=1`).
- **Frontend (Vitest + Testing Library):** `tests/*.spec.tsx` (`relatorio-caixa.spec.tsx`, `relatorio-comissao.spec.tsx`). Configurado em `vitest.config.ts` (`jsdom`, reporter `tap`).
- **Adapter combinado:** `scripts/onp-combined-verify.cjs` (pgTAP + Vitest TAP) e `onp-combined-verify.cjs`. O adapter preserva stdout TAP e exit code, conforme verificado.
- **Configuração ONP:** `onpspec.config.json` define `testCommand`, `testGlobs`, `srcGlobs`, `ignoreGlobs`.

### 11.2 Evidência histórica — Fase 4 (não permanente)
A validação da Fase 4 (relatórios gerenciais avançados) registrou:
- 66 testes pgTAP passando (`supabase/tests/` com `ON_ERROR_STOP=1`).
- 8 testes Vitest passando (`tests/`).
- 74 testes no total.
- AC-001 até AC-011 aprovados.
- Exit code 0 (sem erros bloqueadores).
- Auditoria (`auditoria-v2_4.md`) com 0 erros bloqueadores.

**Importante:** Esses números são evidência da Fase 4, não uma contagem permanente do projeto. Novos testes podem ser adicionados/removidos conforme evolução.

---

## 12. Estado de Implementação e Fonte da Verdade

### 12.1 Fontes de verdade (prioridade para sincronização)
1. **Código atual:** `src/App.tsx`, `src/pages/`, `src/lib/`, `src/types.ts`.
2. **Migrations:** `supabase/migrations/*.sql` (evolução real do banco).
3. **Testes:** `supabase/tests/*.sql` (comportamento verificável do banco); `tests/*.spec.tsx` (comportamento verificável do frontend).
4. **Especificação:** `.spec/features/relatorios-gerenciais/spec.md`, `.spec/features/relatorios-gerenciais/tasks.md`.
5. **Estado do projeto:** `PROGRESS.md` (atualizado até 17/09/2026, com status das Fases 1-4 e descrição dos bugs corrigidos, incluindo `fn_fechar_competencia_comissao` — FOUND clobbered).
6. **Documentação arquitetural:** `plano-arquitetura-salao-beleza-v2_5.md` (este documento) substitui `v2_4.md` como vigente; `v2_4.md` permanece como histórico.
7. **Configuração de verificação:** `onpspec.config.json`, `scripts/onp-combined-verify.cjs`, `scripts/onp-pgtap-verify.cjs`.

### 12.2 Regra para evitar defasagem
- Não marcar como implementado algo que esteja apenas no roadmap.
- Qualquer mudança arquitetural relevante deve atualizar este documento.
- Qualquer mudança de banco deve atualizar migrations e testes (`supabase/migrations/` + `supabase/tests/`).
- Features relevantes devem possuir `.spec/features/` com `spec.md`, `tasks.md`, critérios de aceite (`AC-xxx`), evidência (`tests/` ou `.spec/verification/`).
- Não introduzir novas camadas (`domain/`, `repositories/`, etc.) ou bibliotecas apenas para satisfazer arquitetura idealizada.
- Preferir evolução incremental por feature.

---

## 13. Roadmap (substituído para o estado atual)

### 13.1 Concluídas
- **Fase 1** — Núcleo Operacional: cadastros básicos (profissionais, clientes, serviços, produtos) + configuração de comissão.
- **Fase 2** — Financeiro (Backend): `fn_fechar_comanda`, `fn_cancelar_comanda`, `fn_estornar_pagamento`, `fn_fechar_competencia_comissao`, ajustes e adiantamentos.
- **Fase 3** — Estoque/CMV + Alertas: `fn_calcular_cmv`, card de estoque negativo, relatório de estoque (`RelatorioEstoquePage`).
- **Fase 4** — Relatórios Gerenciais: `fn_relatorio_caixa`, `fn_relatorio_comissao`, páginas correspondentes, testes pgTAP (66) + Vitest (8), AC-001..011, exit code 0.

### 13.2 Próxima frente
- **Fase 5 — UI/UX e consolidação:** design system mínimo, responsividade, componentes reutilizáveis, estados de interface, navegação, acessibilidade, padronização de formulários/tabelas, revisão das páginas existentes.

### 13.3 Depois
- **Fase 6 — Produção e governança:** backup/recuperação, observabilidade, endurecimento de segurança, LGPD operacional, definição contratual, preparação para go-live.

### 13.4 Futuro (sem migração, código ou testes)
- Agenda robusta; CRM; integração fiscal; WhatsApp automático; envio automático de alertas (Resend); offline robusto; integrações externas.

---

## 14. RPCs (corrigido para estado implementado)

Todas as funções principais estão implementadas nas migrations confirmadas:

- `fn_fechar_comanda` (`0004`)
- `fn_cancelar_comanda` (`0006`)
- `fn_estornar_pagamento` (`0009`)
- `fn_fechar_competencia_comissao` (`0010`) — corrigido o bug crítico de `FOUND` clobbered (variável dedicada `v_fechamento_existente`).
- `fn_calcular_cmv` (`0011`)
- `fn_relatorio_caixa` (`0012`)
- `fn_relatorio_comissao` (`0013`)

Não existem RPCs principais ainda "a implementar" no banco. Funcionalidades futuras (ex.: integração Resend, agenda, CRM) não têm RPC definida ainda.

---

## 15. Alertas de Estoque (diferenciado)

- **Decisão de produto (implementada):** estoque negativo não bloqueia a venda. A baixa de estoque ocorre no fechamento (`fn_fechar_comanda`) sem bloqueio.
- **Visualização/alerta in-app (implementado):** card no `DashboardPage` (`RelatorioEstoquePage`); não é uma notificação externa.
- **E-mail via Resend (planejado):** mencionado como próximo passo em `PROGRESS.md`, mas não existe código de integração (`src/lib/` não contém módulo de e-mail; `package.json` não contém `resend` ou similar).
- **WhatsApp automático (fora do escopo atual):** não implementado; não referenciado em código, migrations ou testes.

---

## 16. Decisões Financeiras Preservadas (v2.4 → v2.5)

As decisões congeladas na v2.2/v2.4 permanecem válidas:
- Saldo de adiantamento excedente: transportado para competência seguinte (`ajustes_comissao`).
- Competência financeira: determinada exclusivamente por `comandas.closed_at`.
- Cancelamento após competência fechada: nunca reabre o fechamento; gera registro auditável em `ajustes_comissao`.
- CMV: Custo Médio Ponderado Móvel (`fn_calcular_cmv`).
- Idempotência de criação: UUID gerado no cliente (`App.tsx` não impõe UUID, mas o fluxo de `ComandasPage` segue o padrão da migration `0001`).

---

## 17. Regras de Manutenção da Arquitetura

Para evitar nova defasagem documental:

1. Não marcar como implementado algo que esteja apenas no roadmap.
2. Qualquer mudança arquitetural relevante atualiza este documento.
3. Qualquer mudança de banco atualiza migrations e testes (`supabase/migrations/` + `supabase/tests/`).
4. Features relevantes possuem `.spec/features/<nome>/spec.md` e `tasks.md`, critérios de aceite (`AC-xxx`), evidência (`tests/` ou `.spec/verification/`).
5. Não introduzir novas camadas (`domain/`, `repositories/`, etc.) ou bibliotecas apenas para satisfazer arquitetura idealizada.
6. Preferir evolução incremental por feature.

---

## Notas de Revisão (v2.4 → v2.5)

- Corrigido título, versão (`2.5`), status (`Arquitetura atual`), data (`17/09/2026`).
- Diferenciado claramente implementado / planejado / futuro.
- Corrigida arquitetura para refletir `App.tsx`, `pages/`, `lib/api/`, `supabaseClient`, Supabase Auth, RLS (`auth_helpers.current_salon_id()`), RPCs reais, PostgreSQL.
- Corrigido stack: removidas referências a Tailwind, Recharts, Lucide (não presentes); adicionadas confirmações de React, Vite, TypeScript, Supabase, PostgreSQL, Vitest, Testing Library, jsdom.
- Corrigida seção RLS: `auth_helpers.current_salon_id()` documentada como função atual; distinção RLS vs RPC/domínio preservada.
- Corrigida seção Frontend: estrutura factual (`pages/`, `App.tsx`); UI registrada como funcional/prototípica; evolução (Fase 5) claramente como planejada.
- Corrigida seção Relatórios: `fn_relatorio_caixa` e `fn_relatorio_comissao` documentadas como implementadas; contratos reais registrados; arquivos (`relatorios.ts`, páginas, testes) confirmados.
- Atualizada lista de migrations até `0013_relatorio_comissao.sql`.
- Atualizada estrutura do projeto incluindo `.spec/`, `.claude/`, `.kilo/`, `scripts/`, `tests/`, `supabase/`, `AGENTS.md`, `PROGRESS.md`, `onpspec.config.json`, `vitest.config.ts`.
- Atualizada estratégia de testes: pgTAP (`supabase/tests/`), Vitest (`tests/`), adapter (`scripts/onp-combined-verify.cjs`), `onpspec.config.json`. Evidência Fase 4 registrada (66 pgTAP + 8 Vitest = 74, AC-001..011, exit code 0) com aviso de que é histórico, não permanente.
- Roadmap substituído: Fase 1-4 concluídas; Fase 5 (UI/UX) próxima; Fase 6 (Produção) depois; futuro (agenda, CRM, fiscal, WhatsApp) claramente marcado como fora do escopo atual.
- Alertas de estoque: diferenciado estoque negativo não bloqueia; visual in-app implementado; Resend planejado (sem código); WhatsApp automático fora do escopo.
- RPCs documentadas como implementadas (todas confirmadas nas migrations).
- Adicionada seção de Estado de Implementação e Fonte da Verdade (`PROGRESS.md`, `.spec/`, migrations, testes, código).
- Adicionadas regras de manutenção da arquitetura.
- `plano-arquitetura-salao-beleza-v2_4.md` preservado intacto.
- Nenhum código, migration ou teste alterado.

---

*Documento finalizado em 17/09/2026. Estado sincronizado com código, migrations, testes e especificação existentes no branch atual.*
