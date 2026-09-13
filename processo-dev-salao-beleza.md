# Processo de Desenvolvimento — Sistema de Gestão para Salão de Beleza

**Base:** `plano-arquitetura-salao-beleza-v2_4.md`
**Continuação de:** `processo-dev-saas-gratis-com-ia.md`

Este documento substitui o processo genérico para este projeto específico. Motivo: o sistema tem lógica financeira transacional (comissão, CMV, fechamento de competência), multi-tenancy via RLS e RPCs em PL/pgSQL — isso muda o nível de rigor exigido em relação a um CRUD comum. Tratar comissão de profissional com o mesmo processo de "gerar, olhar por cima, seguir" é o jeito mais rápido de o sistema calcular errado em produção sem ninguém perceber por semanas.

---

## 0. Gate da Fase 2 — resolvido

A Seção 40 (agora v2.3) tinha 8 pendências. **7 estão fechadas** e incorporadas no schema/regras do documento — 2 delas nem precisaram de tabela nova, já estavam previstas desde a v2. A única que resta (**regime de contratação**, Seção 39) é decisão de contador/proprietário fora do software, e **não bloqueia código** — só bloqueia subir dado real de profissional em produção.

**Na prática: o bloqueio original deste documento não existe mais.** Fase 2 pode começar assim que a Fase 1 estiver de pé (precisa de `profissionais`, `servicos`, `produtos`, `config_comissoes`, `motivos_desconto` cadastrados para a RPC ter o que ler).

---

## 1. Stack e ambiente (ajustado ao seu doc, não ao processo genérico)

| Camada | Ferramenta | Nota |
|---|---|---|
| Frontend | React + Vite + TS, build estático | Deploy no **Cloudflare Pages (free)** como site estático — Vercel Hobby foi descartado: seus termos proíbem uso comercial explicitamente (qualquer app que gere receita para quem construiu já viola), e este projeto é pra cliente real. Cloudflare Pages free permite uso comercial e cobre bem o caso porque não há serverless — toda lógica sensível mora no Postgres |
| Backend | **Não existe camada própria** — lógica crítica vive em RPCs PL/pgSQL no Supabase | Isso é uma decisão arquitetural do seu doc (Decisão 8/9), não uma opção |
| Banco | Supabase — **1 projeto free de produção + 1 projeto free de dev/staging** | Conta Supabase free permite múltiplos projetos; nunca desenvolva RPC nova direto contra o banco que tem dado real de comissão |
| Ambiente local | **Supabase CLI + Docker** | Roda Postgres local para testar migration e RPC antes de subir — grátis, evita gastar cota do projeto cloud com iteração |
| Migrations | Versionadas em `/supabase/migrations`, geradas via `supabase migration new` | Já é a Decisão 10 do seu doc — o processo de IA só precisa respeitar isso |

---

## 2. O loop de desenvolvimento passa a ter **dois protocolos diferentes**, dependendo da fase

### Protocolo A — Risco baixo (Fase 1: cadastros, CRUD, telas)
Segue o loop padrão do processo genérico: Copilot Free/Cursor Free geram, você revisa, testa manualmente, commit pequeno. IA pode ter bastante autonomia aqui — errar um campo de cadastro de cliente é barato de corrigir.

### Protocolo B — Risco alto (Fase 2 em diante: qualquer coisa que toca em `comissoes`, `fechamentos_comissao`, `estoque`/CMV, `ajustes_comissao`, RLS)
Use este protocolo sempre que a tarefa envolver dinheiro, estoque ou isolamento entre salões:

1. **Prompt = citação da seção do doc, não descrição livre.** Cole a seção exata (ex: 11.3 + 11.3.1 para rateio de desconto) no Claude.ai web e peça a RPC. Não deixe a IA "lembrar" a regra de memória — ela tem que ler a regra que está na tela.
2. **Peça explicitamente os casos de borda do doc como teste**, não como comentário. Ex: "gere também o teste pgTAP para o caso de adiantamento maior que a comissão do mês (seção 11.7.1)". Isso força a IA a validar a própria lógica contra a regra, não só descrevê-la.
3. **Rode local primeiro** (Supabase CLI + Docker) — nunca a primeira execução de uma RPC financeira nova é contra o projeto cloud.
4. **Teste os pontos de borda documentados na Seção 40 congelada** manualmente, um por um, antes de considerar a RPC pronta — a lista cresceu com as decisões da v2.3, não são mais só 4:
   - saldo de adiantamento > comissão do mês → rola para o mês seguinte, nunca fica negativo
   - competência fechada não é reaberta por cancelamento → gera `ajustes_comissao`
   - arredondamento de rateio pelo método do maior resto
   - idempotência de `fn_fechar_comanda` com UUID repetido
   - **[v2.3]** forma de pagamento sem entrada em `rateio_taxa_por_forma_pagamento` → fechamento deve **falhar explicitamente**, nunca aplicar um default silencioso
   - **[v2.3]** `produtos.percentual_comissao` preenchido deve sobrescrever o percentual de serviço; `NULL` deve cair no default de `config_comissoes`
   - **[v2.4 — substitui o item anterior de bypass]** venda com estoque insuficiente **fecha normalmente** (não bloqueia); a movimentação de saída fica com saldo negativo, e o produto aparece no relatório "saldo negativo — pendente de correção"
   - **[v2.4]** entrada de estoque (`ENTRADA`) quando `estoque_atual < 0` deve usar o `custo_entrada` como novo custo médio (reset), **não** a média ponderada padrão — teste isso especificamente, é o bug mais fácil de deixar passar aqui, porque a fórmula "normal" roda sem erro, só devolve número errado
5. **Só depois** disso a RPC vai para PR → CI → merge → deploy no projeto de staging → só então produção.

A diferença entre Protocolo A e B não é burocracia — é que erro em RPC financeira é silencioso (o sistema não trava, ele só calcula errado) e caro de descobrir tarde.

---

## 3. Testes (operacionalizando a Seção 33 do seu doc, de graça)

| Tipo (já definido no seu doc) | Ferramenta gratuita | Quando roda |
|---|---|---|
| Unitário (cálculo de taxa, comissão, CMV, DRE) | **pgTAP** (extensão Postgres, grátis, roda no Supabase local) | A cada commit em RPC, local |
| Integração (fechamento de comanda, idempotência, fechamento mensal) | pgTAP contra Supabase CLI local com dados seed | Antes de todo PR |
| Segurança (isolamento por `salon_id`, matriz de acesso PROFISSIONAL) | **Testes com 2+ usuários simulados de salões diferentes** — script que tenta ler/escrever dado do outro salão e espera falha | Antes de todo PR que toque RLS |
| CI | **GitHub Actions** (free) rodando `supabase db reset` + pgTAP em cada PR | Automático |

**Por que pgTAP e não só Vitest:** sua lógica crítica está no Postgres (RPC), não no frontend. Testar só do lado do JS deixa a regra de negócio real sem cobertura — pgTAP testa a função PL/pgSQL diretamente, no mesmo lugar onde o dinheiro é calculado.

---

## 4. Mapeamento do seu Roadmap (Seção 35) para o processo de IA

| Fase do seu doc | Protocolo | Gate de saída (Definition of Done) |
|---|---|---|
| **Fase 1 — Núcleo operacional** | A | Critérios de aceitação da Seção 34 até "Adicionar serviço/produto" rodando ponta a ponta |
| **Fase 2 — Financeiro** | B (obrigatório) | ~~Pendências da Seção 40 resolvidas~~ **Resolvido.** Todos os pontos de borda da lista da Seção 2.4 acima testados individualmente |
| **Fase 3 — Estoque/CMV** | B | Teste unitário de CMV com pelo menos 3 cenários de entrada de preço diferente. **Inclui [v2.4]:** card de alerta no dashboard + e-mail diário de saldo negativo — essa parte específica roda em **Protocolo A** (é leitura/exibição, sem cálculo financeiro), não precisa do rigor do resto da fase |
| **Fase 4 — Segurança/RLS** | B (obrigatório) | Teste de dois salões simulados tentando acessar dado um do outro — deve falhar 100% das vezes, sem exceção; **incluir também** o teste do PROFISSIONAL tentando acessar DRE (deve falhar sem exceção, v2.3) |
| **Fase 5 — Evolução** | A/B conforme o item | Fora do escopo atual — não gaste ciclo de IA planejando isso agora |

---

## 5. Ordem concreta de execução dentro da Fase 2

A Fase 2 não é uma RPC só — são 4, com dependência entre elas. Construa nesta ordem, cada uma com Protocolo B completo antes de passar para a próxima:

1. **`fn_fechar_comanda`** — a mais complexa, e todo o resto depende dela existir e estar correta primeiro (idempotência, rateio de desconto, rateio de taxa, cálculo de comissão, baixa de estoque). Cite as seções 6.4, 6.8, 10.9.1, 10.9.2, 10.5, 10.10, 11.1–11.4 no prompt.
2. **`fn_cancelar_comanda`** — depende de `fn_fechar_comanda` já existir (ela desfaz o que a primeira fez). Cite 11.5.
3. **`fn_estornar_pagamento`** — cenário mais específico que o cancelamento total; construa depois de ter o cancelamento funcionando, para reaproveitar o mesmo padrão de `ajustes_comissao`. Cite 10.8, 11.5.
4. **`fn_fechar_competencia_comissao`** — só faz sentido depois de ter comandas fechadas de verdade (via #1) para consolidar. Cite 10.12, 11.6, 11.7, 11.7.1.

**Por que essa ordem e não outra:** construir o fechamento mensal (#4) antes da comanda (#1) te obriga a mockar dado de teste artificial em vez de usar dado real gerado pela própria RPC anterior — isso esconde bug de integração até tarde. Seguindo a ordem de dependência, cada RPC nova já testa contra dado real da anterior.

---

## 6. Próximo passo prático
A Fase 1 (protocolo A) pode começar imediatamente — cadastro de profissional, cliente, serviço, produto, `config_comissoes` e `motivos_desconto` não dependem de mais nenhuma pendência. Assim que isso estiver de pé, começa `fn_fechar_comanda` seguindo a ordem da Seção 5 acima.

Quer que eu monte o setup inicial (estrutura de pastas, `supabase/migrations` inicial com o schema das entidades da Seção 10, e o primeiro workflow de GitHub Actions com pgTAP)?
