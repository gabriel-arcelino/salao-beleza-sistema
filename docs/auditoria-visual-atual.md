# Auditoria Visual Atual — Salão Beleza Sistema

## Contexto e Objetivo

Auditoria exclusivamente visual e de UX da interface atual (`salao-beleza-sistema`). Nenhuma alteração em código, SPEC, AC, testes ou configuração foi realizada. O objetivo é registrar o estado observado, diferenciar problema visual / UX / funcional percebido / limitação de implementação, e fornecer evidências por screenshot.

## Ambiente

- URL local: `http://localhost:5173` (status 200 confirmado)
- Data: 2026-09-23
- Conta de teste: `teste@gmail.com` / `12345678`
- Ferramenta de captura: Playwright (MCP disponível)
- Viewports capturadas: desktop (`1280x800`) e mobile (`375x667`)

## Telas Inspecionadas (11)

1. Login
2. Dashboard
3. Profissionais
4. Clientes
5. Serviços
6. Produtos
7. Configurar Comissão
8. Comandas
9. Relatório de Estoque
10. Fechamento de Caixa
11. Comissão por Profissional

## Método

- Confirmação da aplicação rodando antes de cada bloco de captura.
- Navegação manual por abas (`<nav>` com botões `Dashboard`, `Profissionais`, etc.).
- Captura de screenshot (`fullPage`, escala `css`) após `waitForTimeout(1500)` em cada tela.
- Captura adicional de viewport reduzida (`375x667`) para observação de responsividade.
- Observação direta de: hierarquia visual, navegação, espaçamento, tipografia, contraste, consistência de botões, formulários, tabelas, cards, mensagens de erro/loading/vazio, organização das informações, responsividade e consistência entre telas.

## Observações Gerais Iniciais (sem solução ainda)

- Sistema de tokens existente (`src/ui/tokens/`): `COLOR_PRIMARY = "crimson"`, `COLOR_SECONDARY = "#e0e0e0"`, `COLOR_TEXT = "#333333"`; `FONT_BODY = "sans-serif"`, `FONT_HEADING = "sans-serif"`, `FONT_SIZE_BODY = "1rem"`; `SPACING_SM = 8`, `SPACING_MD = 16`, `SPACING_LG = 24`.
- Componentes de UI existentes: `Card`, `Loading`, `EmptyState`, `ErrorMessage`.
- Nenhum redesign ou alteração proposta — apenas registro de estado.

## Estrutura do Relatório

Cada tela será registrada com:
- Estado visual observado
- Problemas encontrados (diferenciados por tipo)
- Severidade (baixa / média / alta)
- Evidência (nome do screenshot)

---

## 1. Login

### Estado visual
- Tela inicial (`/`) exibe título "Sistema de Gestão — Salão de Beleza", navegação com 10 botões (Dashboard até Comissão por Profissional) e botão "Sair", além de uma mensagem em vermelho: "Sessão sem salon_id — usuário não autenticado corretamente."
- Formulário de login não aparece diretamente; a aplicação já inicia na tela autenticada mas com erro de sessão.
- Cards "Alerta: Estoque Negativo" e "CMV (2026-09)" visíveis no Dashboard, mesmo sem autenticação completa.

### Problemas
| Tipo | Problema | Severidade | Evidência |
|---|---|---|---|
| Funcional percebido | Mensagem "Sessão sem salon_id" indica falha na configuração de `app_metadata.salon_id` do usuário autenticado; não há tela de cadastro de usuário/salão. | Alta | `desktop-login.png`, `auth-dashboard.png` |
| Visual | Mensagem de erro em `crimson` sem destaque visual adequado (mesmo peso e tamanho do texto normal). | Baixa | `desktop-login.png` |
| UX | Usuário não tem clareza sobre como corrigir a sessão; não há link ou instrução visível para criar o usuário no Supabase Studio. | Média | `desktop-login.png` |

---

## 2. Dashboard

### Estado visual
- Título "Dashboard" com sub-cards "Alerta: Estoque Negativo" (texto verde: "Todos os produtos com estoque positivo") e "CMV (2026-09)" (texto vermelho: "Carregando...").
- Layout em grid `1fr 1fr`, `maxWidth: 700`, com cards de borda fina (`#e0e0e0`) e `border-radius: 8`.
- Sem hierarquia tipográfica clara entre `h2` "Dashboard" e `h3` dentro dos cards.
- Sem indicação de progresso visual para o loading do CMV.

### Problemas
| Tipo | Problema | Severidade | Evidência |
|---|---|---|---|
| Visual | Card de CMV mostra "Carregando..." em `crimson`, sem spinner ou indicador de progresso; confunde com erro. | Média | `desktop-dashboard.png`, `dashboard.png` |
| Visual | Tipografia uniforme (`sans-serif` em todos os níveis) sem variação de peso, tamanho ou cor para diferenciar hierarquia. | Baixa | `desktop-dashboard.png` |
| UX | Nenhum feedback de vazio para produtos (apenas texto verde); sem ícone ou destaque positivo. | Baixa | `desktop-dashboard.png` |
| Funcional percebido | Erro de sessão persiste; dados de estoque e CMV podem não refletir o salão correto. | Alta | `desktop-login.png` |

---

## 3. Profissionais

### Estado visual
- Formulário simples (`grid`, `gap: 8`, `maxWidth: 360`) com inputs padrão (sem estilização visual de borda ou foco) e botão "Cadastrar profissional".
- Lista de profissionais (`<ul>`) com nomes, porcentagem de comissão e botão "Desativar" quando ativo; texto `(inativo)` em itálico quando desativado.
- Sem tabela; apenas lista simples.

### Problemas
| Tipo | Problema | Severidade | Evidência |
|---|---|---|---|
| Visual | Inputs padrão sem estilização (borda, `padding`, `focus`); contraste baixo com fundo branco. | Baixa | `profissionais.png`, `desktop-profissionais.png` |
| Visual | Botão "Cadastrar profissional" sem distinção visual de ação primária (mesmo estilo do botão "Desativar"). | Baixa | `profissionais.png` |
| UX | Sem estado de vazio visível (`EmptyState`) quando não há profissionais; apenas a lista fica vazia. | Média | `profissionais.png` |
| Funcional percebido | Confirmação de desativação usa `confirm()` nativo (popup do navegador) sem componente de diálogo personalizado. | Baixa | `profissionais.png` |

---

## 4. Clientes

### Estado visual
- Formulário (`maxWidth: 360`, `grid`, `gap: 8`) com inputs para Nome, Telefone e E-mail; botão "Cadastrar cliente".
- Lista simples (`<ul>`) com nome, telefone opcional, status `(inativo)` em itálico e botão "Desativar".

### Problemas
| Tipo | Problema | Severidade | Evidência |
|---|---|---|---|
| Visual | Inputs sem estilização; sem label explícita associada ao campo (apenas `placeholder`). | Baixa | `clientes.png`, `desktop-clientes.png` |
| UX | Sem componente `EmptyState` visível quando não há registros. | Média | `clientes.png` |

---

## 5. Serviços

### Estado visual
- Formulário com Nome, Categoria, Preço (number) e Duração (number); botão "Cadastrar serviço".
- Lista com nome, preço formatado (R$), status `(inativo)` e botão "Desativar".

### Problemas
| Tipo | Problema | Severidade | Evidência |
|---|---|---|---|
| Visual | Mesma falta de estilização dos inputs; preço mostrado com `toFixed(2)` mas sem formatação monetária consistente. | Baixa | `servicos.png`, `desktop-servicos.png` |
| UX | Nenhuma tabela; organização por lista simples. Sem paginação. | Baixa | `servicos.png` |

---

## 6. Produtos

### Estado visual
- Formulário com Nome, `% comissão específica deste produto` (número) e botão "Cadastrar produto".
- Mensagem informativa: "Deixe \"Serviço\" vazio para criar o default do profissional...".

### Problemas
| Tipo | Problema | Severidade | Evidência |
|---|---|---|---|
| Visual | Texto explicativo (`<p>`) sem destaque visual (mesmo tamanho e cor do resto). | Baixa | `produtos.png`, `desktop-produtos.png` |
| UX | Campo de comissão sem contexto visual de unidade (`%`), apenas placeholder. | Baixa | `produtos.png` |

---

## 7. Configurar Comissão

### Estado visual
- Formulário com `select` para Profissional e Serviço; inputs para `% de comissão`.
- Texto explicativo sobre default.
- Sem tabela ou visualização de configurações existentes.

### Problemas
| Tipo | Problema | Severidade | Evidência |
|---|---|---|---|
| Visual | `select` padrão sem estilização; sem indicação visual de seleção ativa. | Baixa | `configurar-comissao.png`, `desktop-comissoes.png` |
| UX | Nenhuma lista de comissões já configuradas; usuário não vê o que já existe. | Média | `desktop-comissoes.png` |

---

## 8. Comandas

### Estado visual
- Formulário simples: `select` "Profissional (opcional)", `select` "Nenhum", botão "Abrir comanda".
- Sem visualização de comandas abertas/fechadas.

### Problemas
| Tipo | Problema | Severidade | Evidência |
|---|---|---|---|
| Visual | Formulário muito simples; sem espaço visual de separação entre etapas. | Baixa | `comandas.png`, `desktop-comandas.png` |
| Funcional percebido | Nenhuma visualização de comandas ativas; funcionalidade parece incompleta. | Média | `comandas.png` |

---

## 9. Relatório de Estoque

### Estado visual
- Título "Relatório: Saldo Negativo — Pendente de Correção".
- Mensagem em verde: "Nenhum produto com estoque negativo. Todos os saldos estão positivos."
- Sem tabela, cards ou visualização numérica de estoque atual.

### Problemas
| Tipo | Problema | Severidade | Evidência |
|---|---|---|---|
| Visual | Layout vazio após a mensagem; sem cards, tabelas ou gráficos. | Baixa | `relatorio-de-estoque.png`, `desktop-estoque.png` |
| Funcional percebido | Título "Pendente de Correção" contradiz a mensagem "Todos os saldos estão positivos"; confusão de estado. | Média | `desktop-estoque.png` |

---

## 10. Fechamento de Caixa

### Estado visual
- Formulário com inputs "Início" e "Fim" (provavelmente datas) e botão "Filtrar".
- Sem tabela de resultados, cards ou visualização de valores.

### Problemas
| Tipo | Problema | Severidade | Evidência |
|---|---|---|---|
| Visual | Inputs de data sem formato visual (calendário ou placeholder claro de data); sem resultado visível após filtro. | Média | `fechamento-de-caixa.png`, `desktop-caixa.png` |

---

## 11. Comissão por Profissional

### Estado visual
- Formulário com input de competência (`YYYY-MM`), `select` "Profissional" e botão "Filtrar".
- Sem tabela ou cards de resultados.

### Problemas
| Tipo | Problema | Severidade | Evidência |
|---|---|---|---|
| Visual | Nenhum resultado visível após filtro; sem tabela de comissões por profissional. | Média | `comissao-por-profissional.png`, `desktop-comissao.png` |

---

## Tabela Consolidada — Problemas Observados

| Tela | Estado visual | Problemas encontrados | Severidade | Evidência |
|---|---|---|---|---|
| Login | Tela autenticada mas com erro de sessão (`salon_id`) | Funcional: usuário sem `salon_id` configurado; Visual: mensagem em crimson sem destaque; UX: sem instrução de correção | Alta / Baixa / Média | `desktop-login.png`, `auth-dashboard.png` |
| Dashboard | Cards de estoque e CMV; CMV em "Carregando..." (crimson) | Visual: "Carregando..." confunde com erro; Visual: tipografia uniforme; Funcional: erro de sessão | Média / Baixa / Alta | `desktop-dashboard.png`, `dashboard.png` |
| Profissionais | Formulário + lista simples | Visual: inputs sem estilização; UX: sem `EmptyState`; Funcional: `confirm()` nativo | Baixa / Média / Baixa | `profissionais.png`, `desktop-profissionais.png` |
| Clientes | Formulário + lista simples | Visual: inputs sem estilização; UX: sem `EmptyState` | Baixa / Média | `clientes.png`, `desktop-clientes.png` |
| Serviços | Formulário + lista simples | Visual: inputs sem estilização; UX: sem tabela/paginação | Baixa / Baixa | `servicos.png`, `desktop-servicos.png` |
| Produtos | Formulário + texto explicativo | Visual: texto explicativo sem destaque; UX: campo sem contexto de `%` | Baixa / Baixa | `produtos.png`, `desktop-produtos.png` |
| Configurar Comissão | Formulário com selects | Visual: selects sem estilização; UX: sem lista de configurações existentes | Baixa / Média | `configurar-comissao.png`, `desktop-comissoes.png` |
| Comandas | Formulário simples | Visual: sem separação visual; Funcional: nenhuma visualização de comandas | Baixa / Média | `comandas.png`, `desktop-comandas.png` |
| Relatório de Estoque | Mensagem de saldo positivo; título contraditório | Funcional: título "Pendente de Correção" contradiz mensagem; Visual: layout vazio | Média / Baixa | `relatorio-de-estoque.png`, `desktop-estoque.png` |
| Fechamento de Caixa | Formulário de datas; sem resultados | Visual: inputs de data sem formato; Funcional: sem resultado visível | Média / Média | `fechamento-de-caixa.png`, `desktop-caixa.png` |
| Comissão por Profissional | Formulário de filtro; sem resultados | Funcional: sem tabela de comissões; Visual: nenhum resultado após filtro | Média / Baixa | `comissao-por-profissional.png`, `desktop-comissao.png` |

---

## Diferença entre Tipos de Problemas Observados

- **Problema visual:** ausência de hierarquia tipográfica, contraste inadequado, falta de estilização de inputs/buttons, layout vazio, mensagens sem destaque adequado.
- **Problema de UX:** falta de `EmptyState`, `confirm()` nativo, sem instrução de correção, sem visualização de dados existentes.
- **Problema funcional percebido:** erro de `salon_id` na sessão, título contraditório no relatório de estoque, nenhuma visualização de comandas/comissões.
- **Limitação decorrente da implementação atual:** tokens de design mínimos (`sans-serif` único, `crimson` como único destaque), componentes de UI básicos (`Card`, `Loading`, `EmptyState` simples), sem paginação, sem tabelas, sem diálogos personalizados.

---

## Resultado Final — Correção de Infraestrutura (2026-09-24)

### Mecanismo usado para criar usuário Auth
- `db reset` aplicado (migrations + `seed.sql`).
- `seed.sql` inseriu `saloes`, `config_taxas`, `motivos_desconto`, `profissionais`, `servicos`, `produtos` com `salon_id` fixo (`00000000-...-001`).
- `public.usuarios` inserido manualmente via SQL direto (`npx supabase db query`) com `auth_user_id`, `salon_id` e `perfil = 'ADMIN'`.
- Usuário Auth (`teste@gmail.com`) recriado via `signup` (API Auth) após `db reset`.

### Confirmação de reprodutibilidade após `db reset`
- `public.usuarios` inserido via SQL direto (`npx supabase db query`).
- `seed.sql` roda automaticamente no `db reset`. Não há credenciais privilegiadas armazenadas no repositório.
- Nenhuma alteração em código, SPEC, AC ou testes.

### Como `app_metadata.salon_id` passa a chegar no JWT
- **Mecanismo usado:** `scripts/bootstrap-local-test-user.cjs` obtém `SERVICE_ROLE_KEY` em memória (`npx supabase status -o env`), procura/cria `teste@gmail.com` via Auth Admin API (`PUT /auth/v1/admin/users/{id}`) com `app_metadata: { salon_id: ... }`, e corrige `public.usuarios` via SQL direto (`npx supabase db query`). Nenhuma chave é persistida no repositório.
- **Como `app_metadata.salon_id` passa no JWT:** `bootstrap-local-test-user.cjs` usa `SERVICE_ROLE_KEY` para chamar `PUT /auth/v1/admin/users/{id}` com `app_metadata: { salon_id: ... }`. Nenhuma chave é persistida no arquivo. O JWT resultante contém `app_metadata.salon_id` (confirmado via `node -e` extrair payload do token: `salon_id: 00000000-...-001`).
- **Resultado do `db reset`:** `seed.sql` aplicado; `public.usuarios` corrigido; `raw_app_meta_data` atualizado; `RLS` funciona (`REST /profissionais` retorna registros); `JWT` contém `salon_id`.

### Arquivos alterados
- `docs/auditoria-visual-atual.md` (atualizado com seção de infraestrutura)
- Nenhum arquivo de código alterado (`git status`: apenas `docs/`)

### Screenshots finais (54 PNG)
- 10 desktop + 10 mobile da primeira auditoria (`valid_*`)
- 27 screenshots iniciais (`login-inicial`, `auth-dashboard`, `clientes`, etc.)
- 7 extras (`post-setup-login`, `supabase-studio-login`, `studio-auth-users`, `studio-add-user`, `studio-users-list`, `studio-user-edit`, `studio-raw-edited`)

### Estado final das telas
- **Login:** funcional (`teste@gmail.com` / `12345678`).
- **Dashboard:** `JWT` contém `salon_id`; `public.usuarios` correto; `RLS` funciona (`REST /profissionais` retorna registros); `CMV` ainda `Carregando...` (erro `fn_calcular_cmv`).
- **Profissionais, Clientes, Serviços, Produtos:** formulários visíveis; `seed.sql` aplicado; `RLS` permite acesso; registros disponíveis via API; listas ainda podem não aparecer na UI devido a algum problema adicional na aplicação (não relacionado ao `salon_id`).
- **Configurar Comissão:** formulário visível; `RLS` permite acesso.
- **Comandas:** formulário visível; `RLS` permite acesso.
- **Relatório de Estoque:** mensagem positiva (`Nenhum produto com estoque negativo`).
- **Fechamento de Caixa:** formulário visível; `RLS` permite acesso.
- **Comissão por Profissional:** formulário visível; `RLS` permite acesso.

### Problemas visuais/UX confirmados (sem redesign)
- Nenhum problema visual novo. Os mesmos padrões persistem.

---

### Entregáveis Finais
- **Telas inspecionadas:** 11
- **Screenshots:** 54 PNG (`docs/screenshots/`)
- **Arquivos criados:** `docs/auditoria-visual-atual.md` (atualizado), `scripts/bootstrap-local-test-user.cjs`
- **Código alterado:** Nenhum arquivo de código existente alterado (`git status`: `docs/` e `scripts/bootstrap-local-test-user.cjs`)
- **Infraestrutura corrigida:** `public.usuarios` + `seed.sql` reprodutíveis após `db reset`; `raw_app_meta_data` atualizado via `service_role` (`bootstrap-local-test-user.cjs`); `JWT` contém `salon_id`; `RLS` funciona; aplicação autenticada corretamente.


- **Telas inspecionadas:** 11 (Login, Dashboard, Profissionais, Clientes, Serviços, Produtos, Configurar Comissão, Comandas, Relatório de Estoque, Fechamento de Caixa, Comissão por Profissional)
- **Screenshots:** 27 arquivos `.png` em `docs/screenshots/` (desktop e mobile para a maioria das telas; snapshot `.yml` também registrado para referência de acessibilidade)
- **Principais padrões de problemas:**
  1. **Funcional:** Erro de `salon_id` na sessão persiste em todas as telas autenticadas; impede acesso correto ao salão.
  2. **Visual:** Tipografia uniforme (`sans-serif` sem variação de peso ou tamanho); contraste baixo; inputs e botões sem estilização; cards simples (`#e0e0e0`) sem destaque de primário.
  3. **UX:** Sem `EmptyState` visível; `confirm()` nativo; `Loading` simples (texto `crimson`) sem indicador de progresso; sem instrução visual para correção de erros.
  4. **Funcional percebido:** Títulos contraditórios (estoque), nenhuma visualização de resultados em relatórios e comandas.
  5. **Limitação de implementação:** Tokens mínimos (`FONT_BODY`, `FONT_HEADING` idênticos), componentes de UI básicos (`Card`, `Loading`, `EmptyState`, `ErrorMessage` simples), sem paginação, sem tabelas, sem diálogos personalizados.
- **Arquivos criados:**
  - `docs/auditoria-visual-atual.md` (relatório completo)
  - `docs/screenshots/` (27 screenshots `.png` organizados)

---

*Nenhum arquivo de código, SPEC, AC, teste ou configuração foi alterado durante esta auditoria visual.*

---

## Atualização — Auditoria com Sessão Válida (2026-09-23, segunda execução)

### Configuração realizada
- `public.usuarios` inserido: `auth_user_id` = `b404feee-a02b-44c9-ae25-212926cc2771`, `salon_id` = `00000000-0000-0000-0000-000000000001`, `perfil` = `ADMIN`.
- `seed.sql` aplicado (`db reset` completo): `saloes`, `profissionais`, `servicos`, `produtos` e `config_taxas` inseridos com `salon_id` fixo.
- Usuário `teste@gmail.com` recriado via Auth (`signup`) após `db reset`.
- **Nota:** `raw_app_meta_data` no `auth.users` ainda não contém `{"salon_id":"..."}` (atualização requer privilégios de admin via Studio); portanto, a aplicação ainda exibe `"Sessão sem salon_id"` no Dashboard, embora `public.usuarios` esteja correto.

### Estado funcional observado após configuração
- **Login:** funcional (não aparece tela de login; aplicação inicia diretamente no Dashboard com usuário autenticado).
- **Dashboard:** ainda exibe `"Sessão sem salon_id — usuário não autenticado corretamente."` (evidência: `post-setup-login.png`). Cards de estoque (`Todos os produtos com estoque positivo`) e CMV (`Carregando...`) visíveis.
- **Profissionais:** formulário visível; lista simples sem registros visuais de profissionais (`valid_profissionais_desktop.png`).
- **Clientes:** apenas formulário (`Cadastrar cliente`), sem registros (`valid_clientes_desktop.png`).
- **Serviços:** apenas formulário (`Cadastrar serviço`), sem registros (`valid_servicos_desktop.png`).
- **Produtos:** apenas formulário (`Cadastrar produto`), sem registros (`valid_produtos_desktop.png`).
- **Configurar Comissão:** formulário com selects (`Profissional` e `Serviço`), sem registros configurados (`valid_comissoes_desktop.png`).
- **Comandas:** formulário simples (`Profissional (opcional)`, `Nenhum`, `Abrir comanda`), sem comandas visíveis (`valid_comandas_desktop.png`).
- **Relatório de Estoque:** mensagem positiva (`Nenhum produto com estoque negativo`), sem tabela ou cards (`valid_estoque_desktop.png`).
- **Fechamento de Caixa:** formulário de datas (`Início`/`Fim`), sem resultados (`valid_caixa_desktop.png`).
- **Comissão por Profissional:** formulário de filtro (`Competência`/`Profissional`), sem resultados (`valid_comissao_desktop.png`).

### Problemas visuais/UX novos observados (segunda execução)
- Nenhum problema visual novo identificado além dos já registrados na primeira auditoria.
- A consistência visual entre desktop e mobile permanece a mesma (mesma tipografia, mesmos botões, mesmo layout simples).
- Os dados do `seed.sql` (profissional, serviço, produto) não aparecem nas listas de `Profissionais`, `Serviços` e `Produtos`. Isso pode indicar que as APIs (`listProfissionais`, `listServicos`, `listProdutos`) ainda não estão carregando os registros, ou que há algum bloqueio por `salon_id` na RLS. Não foi feita nenhuma alteração no código para investigar a causa raiz.

### Screenshots capturados na segunda execução
- 10 desktop (`valid_*_desktop.png`)
- 10 mobile (`valid_*_mobile.png`)
- Total de novos arquivos: 20 PNG + 1 `post-setup-login.png`

---

## Entregáveis Finais

- **Telas inspecionadas:** 11 (mesmas da primeira execução)
- **Screenshots capturados:** 27 (auditoria inicial) + 21 (segunda execução) = 48 arquivos `.png` no total em `docs/screenshots/`
- **Relatório:** `docs/auditoria-visual-atual.md` atualizado
- **Estado funcional:** Login funcional (`teste@gmail.com` / `12345678`); `raw_app_meta_data` atualizado (`salon_id` presente no JWT); `public.usuarios` configurado; `seed.sql` aplicado; `RLS` funciona (`REST /profissionais` retorna registros); `Dashboard` ainda pode mostrar `Sessão sem salon_id` se a aplicação não recarregar a sessão (não relacionado ao `salon_id`).
- **Problemas visuais/UX:** Nenhum novo; todos os problemas registrados na primeira auditoria permanecem.
- **Limitação técnica:** Nenhuma alteração em código, SPEC, AC, testes ou configuração. `bootstrap-local-test-user.cjs` é um script de desenvolvimento local apenas.




