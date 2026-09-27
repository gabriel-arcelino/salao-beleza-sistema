# Relatório de handoff — consolidação do processo ONP Factory

> **Para:** próximo agente que vai continuar o trabalho.
> **Data:** 2026-09-27 · **Escopo desta sessão:** da consolidação das decisões
> de processo até agora.
> **Nada foi commitado.** Os dois repositórios têm alterações pendentes.
> Precedente deste formato: `docs/relatorio-execucao-sessao-onp.md`.

## 1. O que esta sessão tentou fazer

Consolidar um **processo universal de desenvolvimento com IA**, a partir da
evidência real do projeto `salao-beleza-sistema`, e operacionalizá-lo pelo
`onp-factory-kit`. Princípio central: *"a IA não deve ser o processo; deve
operar dentro do processo"*.

A sessão combinou quatro entregas, nesta ordem:

1. Análise do experimento e proposta de processo
2. Revisão crítica independente das decisões
3. Congelamento da norma de Done e Gates no kit
4. Aplicação da norma no projeto de referência, que revelou um defeito real

## 2. Estado dos dois repositórios

| | `onp-factory-kit` | `salao-beleza-sistema` |
|---|---|---|
| Branch | `main` | `experimento/onp-fase-4` |
| HEAD | `c734a53 feat: criar ONP Factory Kit v0.1` | `55277ff docs: renomear o relatorio de handoff…` |
| Suíte | `npm test` → **6/6** | — |

### Pendentes no kit (9 itens, todos desta sessão)

```text
 M _kit/README.md
 M _kit/adapters/node-vitest-supabase/pgtap-verify.cjs
 M _kit/docs/adoption.md
 M _kit/docs/design.md
 M _kit/templates/AGENTS.addendum.md
?? _kit/docs/done-e-gates.md
?? _kit/docs/processo-proposta.md
?? _kit/docs/revisao-decisoes-processo.md
?? _kit/test/pgtap-verify.test.cjs
```

**Atenção:** o repositório do kit tem **17 arquivos deletados sem commit**
(`_kit/onp-factory-kit-v0.1-final/*` e `onp-factory-kit-v0.1-ready.zip`) que
**não são desta sessão** — já estavam na working tree antes. Não tocar neles sem
instrução do dono.

### Pendentes no salão (5 itens, todos desta sessão)

```text
 M .spec/verification/recuperacao-carga.json   (regenerado pelo Feature Verify)
 M .spec/verification/refinamento-interface.json (regenerado pelo Feature Verify)
 M AGENTS.md                                    (nova seção ## Gates)
 M scripts/onp-pgtap-verify.cjs                 (correção do TAP)
?? .spec/releases/                              (r-2026-09-26.md, 304 linhas)
```

**Nenhum arquivo de código de aplicação, `spec.md`, `tasks.md` ou status de task
foi alterado.**

## 3. Os documentos e o que cada um é

| Arquivo | Papel | Status |
|---|---|---|
| `onp-factory-kit/_kit/docs/done-e-gates.md` | **FONTE NORMATIVA.** Done (3 níveis), gates G0–G8, estados PASS/FAIL/BLOCKED/N/A, ordem, staleness, refs cruzadas, convenção de release, tabela de enforcement | novo, não commitado |
| `…/_kit/docs/processo-proposta.md` | Análise do experimento, com `[FATO]`/`[INFERÊNCIA]`/`[PROPOSTA]`, 1.732 linhas. **Banner de não-normatividade** no topo | não commitado |
| `…/_kit/docs/revisao-decisoes-processo.md` | Revisão crítica independente. 4 CRÍTICOS/IMPORTANTES, tabela de classificação. **Banner de não-normatividade** | não commitado |
| `salao-beleza-sistema/.spec/releases/r-2026-09-26.md` | Artefato de release, 304 linhas: escopo, estado dos 9 gates, veredito, correções, decisões em aberto | novo, não commitado |

Os dois documentos de análise **têm banner dizendo que não são normativos**, e o
de proposta avisa que sua numeração de gates (G1–G9) diverge da vigente (G0–G8).
Não usar os rótulos dele.

### Documentos do kit que foram redirecionados

- `docs/adoption.md` §8 "Fechamento": a lista de 6 itens que era a **segunda
  definição de Done** foi removida e virou ponteiro. §5, §6 e §7 ganharam rótulos
  de gate (G1/G2, G3, G7).
- `README.md` e `docs/design.md`: 4 linhas cada, apontando para a fonte normativa.
- `docs/roadmap.md`: **não alterado** — nenhuma decisão aprovada cria item de V0.2.

## 4. Definição de Done (congelada)

Em `done-e-gates.md` §4. Resumo:

- **Task Done** — `status = [concluida]`; arquivos declarados existem; ACs em
  `Refs:` com prova PASS na feature dona, não obsoleta; sem `Refs:` é legítimo
  para inventário/documentação; nenhuma condição FAIL ou BLOCKED.
  **Não** exige commit. **Não** exige escopo de diff.
- **Feature Done** — todas as tasks Done; todos os ACs PASS; Feature Verify
  executado com `exitCode = 0` **e `testsParsed > 0`**; `audit --ci = 0`; G4 e G5
  quando aplicáveis; achados de QA com desfecho; status coerente; dependências
  externas satisfeitas; nenhum gate obrigatório FAIL ou BLOCKED.
- **Project Gate** — é o estado de **uma ENTREGA**, não do repositório inteiro.
  Exige artefato `.spec/releases/<id>.md`. Features **incluídas** precisam estar
  Done; as não incluídas, não.

**Regra fundamental:** gate obrigatório não executado é **BLOCKED**, nunca PASS.
Não reproduzir a lógica de ASM/Q do audit — apontar para ele.

## 5. Gates G0–G8

| Gate | Pergunta |
|---|---|
| G0 Escopo da Entrega | O que exatamente estamos tentando fechar? |
| G1 SPEC Review | A SPEC está correta e testável para implementar? |
| G2 Test/Evidence Design | Sabemos como cada AC será provado? |
| G3 Feature Verify | A implementação satisfaz mecanicamente os ACs? |
| G4 QA Funcional | Funciona em cenário real quando a automação não basta? |
| G5 QA Visual | A mudança perceptível produz o resultado esperado? |
| G6 Diff/Scope Review | O que foi alterado corresponde ao escopo? |
| G7 Global Regression | Continua compatível com o resto do projeto? |
| G8 Audit | O estado estrutural e de evidência está coerente? |

Estados: **PASS** · **FAIL** · **BLOCKED** (obrigatório, não executado) · **N/A**
(condicional, com justificativa). `SKIPPED` **não** é estado de gate.

**Mutation Check** é experimental, não gate obrigatório.
**G6** é de feature **e** de entrega, nunca condição de task.

### Enforcement real × apenas normativa

**Têm enforcement:** AC sem prova, `skip` não prova, task concluída sem prova,
arquivo declarado inexistente, prova obsoleta, IDs únicos, G3, G7, G8.

**São só norma (nenhuma ferramenta verifica):** `testsParsed > 0`; G0 e o
artefato de release; G2 além de `AC_SEM_TESTE`; G4, G5, G6; coerência de status;
N/A com justificativa; staleness no Project Gate; BLOCKED como estado.

Detalhe em `done-e-gates.md` §8, com âncoras no código.

## 6. O achado mais importante: exit 0 não é veredito

Ao rodar os gates com Docker no ar, G7 devolveu **`exit 0` com um teste pgTAP
reprovado**.

**Causa:** `onp-pgtap-verify.cjs` só verificava `proc.status !== 0`. Uma
asserção pgTAP reprovada **não é erro SQL** — o `psql` termina com 0.

**Consequência:** o defeito estava invisível desde o primeiro commit do
repositório (`aefaebc`). Depois de corrigido o adapter, a reprovação ficou
visível — e a investigation mostrou que a causa era **resíduo local**, não
defeito de regra (ver §7). **O buraco de schema é real e continua aberto.**

**Correção aplicada:** ambos os adapters agora leem o TAP, contam `not ok` e
reportam em stderr.

```text
onp-pgtap-verify: 1 teste(s) pgTAP reprovado(s) em 005_fn_fechar_comanda_produto_estoque.sql:
  not ok 1 - Percentual próprio do produto (15%) prevalece sobre o default do profissional (40%)
```

**Verificação:** G7 passou a devolver `exit 1`; `npm test` do kit = 6/6; G3 e G8
inalterados.

**O que a correção NÃO faz:** não conserta a causa do `005`, que é resíduo local.
E **não** fecha a lacuna BLOCKED × FAIL: o código de saída é o mesmo para
"não pude executar" e "executou e reprovou". Só a leitura da saída separa, e o
Project Gate exige que se leia a saída.

Novo teste: `_kit/test/pgtap-verify.test.cjs`, 3 casos, exercita o script real
contra container e **skipa** se não houver Docker.

## 7. Diagnóstico final do `005`

**Plano, código e teste concordam.** O que diverge é
`processo-dev-salao-beleza.md:47`, que resume as duas condições de comissão em
uma e omite o gate.

Regra no plano — o gate primeiro, o override dentro dele:

- `plano-arquitetura-salao-beleza-v2_4.md:952` — *"Produtos **só** geram comissão
  se `config_comissoes.comissao_sobre_produto = true`… **Quando geram**…"*
- `v2_4:2060` — *"on/off por profissional via `comissao_sobre_produto`; percentual
  específico por produto via `produtos.percentual_comissao` (override **opcional**)"*
- `v2_5:789,793` — mesma regra

`fn_fechar_comanda` (`0004:221-231`) implementa exatamente isso. O teste `005`
também está correto: insere `comissao_sobre_produto = true` (linhas 15-19) e
espera 7.50.

**Falha = resíduo local.** O banco tinha 2 linhas de nível profissional para o
mesmo profissional; o `LEFT JOIN` de `0004:213-219` duplicou e o
`select … into` de `0004:207-211` escolheu arbitrariamente. A linha commitada é
**resíduo de sessão ad-hoc**: nenhuma migration insere, `seed.sql` não insere, os
6 testes que inserem terminam em `rollback`, e `created_at = updated_at`.
Timestamp `2026-09-26 01:54:31+00` = 25/09 22:54 local, **dentro da janela de
validação visual** — quando o agente dirigia o app pelo navegador. O inventário
de 23/09 registra a tabela vazia, então foi **um** salvamento em tabela vazia.

### O buraco de schema (independente do resíduo)

`config_comissoes_salon_id_profissional_id_servico_id_key` é UNIQUE em
`(salon_id, profissional_id, servico_id)`, mas `servico_id` é **nullable** e
NULLs são distintos em índice único. Logo a unicidade **não protege o nível
profissional** (`servico_id IS NULL`). **Reproduzido**: uma segunda inserção foi
aceita (`n_agora = 2`, `sobre_produto = {f,t}`).

Agravantes no código:

- `src/lib/api/config_comissoes.ts:35-39` — `createConfigComissao` faz
  **`.insert()` puro**, sem `upsert` nem `onConflict`
- `src/pages/ConfigComissoesPage.tsx:111` — `<option value="">Qualquer serviço
  (default)</option>`, e `:57` faz `servico_id: servicoId || null`
- **não há `delete`** em código nem na interface

Consequência: **dois salvamentos criam duplicata**, e uma duplicata existente é
irremediável pelo aplicativo. Essa afirmação é inferência de **código**, não
demonstração empírica — o buraco em si **está** demonstrado.

### Ambiente verificado

| tabela | linhas |
|---|---|
| `saloes` | 1 |
| `profissionais` | 1 |
| `config_comissoes` | 1 |
| `comandas` / `comanda_itens` / `pagamentos` / `fechamentos_comissao` | **0** |

Q1 (duplicatas) e Q2 (comandas afetadas): **vazias**. **O projeto nunca rodou em
produção.** Não há valor pago errado e não há conversa com cliente a fazer.

Duas correções de schema que valem para consultas futuras: a coluna é
**`closed_at`** (`0001_initial_schema.sql:173`), não `finalizada_em`; e o
profissional financeiro é **`comanda_itens.profissional_id`**, nunca
`comandas.profissional_id` (esse é "principal" para exibição; o cálculo usa o
primeiro, em `0004:214-218` e `0004:171-175`).

## 8. Estado dos gates da release `r-2026-09-26`

Escopo: `refinamento-interface` + `recuperacao-carga` incluídas;
`relatorios-gerenciais` (11/11, `rascunho`) e `legado-baseline` (1/1,
`em-implementacao`) **não incluídas**, por decisão de produto.

| Gate | Estado | Evidência |
|---|---|---|
| G0 | PASS | o artefato |
| G1 | PASS | `audit --ci` exit 0 |
| G2 | PASS | `35/35 com teste` |
| G3 `refinamento-interface` | PASS | `11/11 · 81 testes · exit 0` |
| G3 `recuperacao-carga` | PASS | `4/4 · 38 testes · exit 0` |
| G4 | PASS (sessão de origem) | testes que exercitam páginas reais sem mock |
| G5 | PASS (sessão de origem) | 14 capturas em `docs/screenshots/validacao-visual/` |
| G6 | **NÃO EXECUTADO** | sem artefato de revisão |
| G7 | **PASS** | `exit 0`, `174 ok · 0 not ok` — **após** a limpeza do resíduo local |
| G8 | PASS | `audit --ci` exit 0, `0 aviso(s)` |

**Project Gate: NÃO SATISFEITO** — por **G6 não executado**, única pendência
que bloqueia. O G7 foi FAIL durante a análise por resíduo local; limpo o
resíduo, passou.

## 9. Decisões em aberto — bloqueiam o próximo passo

1. ~~Limpeza do banco local.~~ **RESOLVIDO.** Resíduo removido com delete
   dirigido por `id` + guardas; G7 medido em `exit 0`, `174 ok · 0 not ok`.
   Sem tocar em `saloes`, `profissionais`, `usuarios`, `servicos`, `produtos`.
2. **G6 retroativo — agora é a única pendência que bloqueia a release.**
   Executar a revisão de diff/escopo agora, ou declarar N/A por as features
   terem sido fechadas antes de o gate existir.
3. **Emenda "falha conhecida".** Se escolher N/A, aplico em `done-e-gates.md`:
   defeito **pré-existente** não bloqueia desde que registrado com causa, dono e
   data; falha **introduzida** bloqueia sempre.
4. **Três decisões de produto da feature de integridade** (ver §10): upsert ou
   erro no segundo salvamento; criar `delete` ou não; ordem entre índice e upsert
   — recomendo **upsert primeiro**, senão o segundo salvamento vira erro sem
   caminho para o usuário resolver.

## 10. Feature de integridade — especificação já redigida

Escopo em `r-2026-09-26.md`, seção "Enquadramento do item 3".

**As duas causas do G7 são diferentes e não devem ser confundidas:** o resíduo
local se resolve limpando dado; o buraco de schema exige migração; a falta de
teste exige prova. Só as duas últimas justificam feature própria — e por
**prevenção**, não por incidente.

| Etapa | Conteúdo |
|---|---|
| G0 | `config_comissoes` (unicidade e API) e a prova do gate. **Sem** taxa, CMV, fechamento de competência |
| G1 | SPEC citando `v2_4:673,952,2060` e `v2_5:789,793`; corrigir `processo-dev-salao-beleza.md:47` no mesmo passo |
| G2 | ACs: (a) 2ª config de nível profissional rejeitada; (b) 2ª de nível serviço continua rejeitada; (c) **gate desligado + percentual preenchido → comissão 0**; (d) gate ligado + override → aplica; (e) precedência serviço > profissional > padrão |
| Tasks | migração (**só o índice parcial**), `createConfigComissao` → upsert, delete, novo teste do gate, fixture do `005` isolado |
| G3/G7/G8 | pgTAP completo, regressão, audit |

Pendências de prova que a justificam: o gate
`comissao_sobre_produto = false` com `percentual_comissao` preenchido **não tem
teste**, e `percentual_comissao` aparece em **um único** teste do projeto.

A bifurcação que existia — "há duplicatas em produção?" — **caiu**: não há, e a
migração não toca em dado.

## 11. Como verificar tudo

```bash
# Kit
cd onp-factory-kit/_kit && npm test          # esperado: 6/6

# Salão
cd salao-beleza-sistema
node scripts/onp-feature-verify.cjs refinamento-interface   # 11/11, exit 0
node scripts/onp-feature-verify.cjs recuperacao-carga       # 4/4, exit 0
node scripts/onp-combined-verify.cjs                        # exit 0, 174 ok
node .claude/skills/onp-spec-driven/scripts/onp-spec.mjs audit --ci   # exit 0
```

Requer Docker + Supabase local para o G7. O container é
`supabase_db_salao-beleza-sistema`; o `project_id` vem de `supabase/config.toml`.

## 12. Armadilhas conhecidas

- **`processo-dev-salao-beleza.md` não é normativa.** É um resumo do plano
  `v2_4` e omite condições. Quando houver conflito entre ele e o plano, o plano
  vence. Foi esse resumo que levou a um diagnóstico errado nesta sessão.
- **`onp-factory.config.json` tem 12 chaves; só 4 são lidas**
  (`onp.enginePathCandidates`, `database.resetCommand`, `database.projectId`,
  `database.container`). O bloco `policy` e o bloco `commands` são decorativos.
  Do profile, só `name` e `adapter`.
- **`allowProductionReset: false` não é lido por nada.** A única regra de
  segurança do kit é documentação, e `resetCommand` é executado verbatim.
- **12 dos 14 arquivos pgTAP não têm tag `@spec:`**, incluindo os 57 testes das
  RPCs financeiras. `audit --ci` pode sair 0 com defeito no banco.
- **`testsParsed` é escrito e nunca lido** (`verify.js:202`).
- **`onp-factory doctor` verifica 2 dos 3** scripts do adapter; `pgtap-verify.cjs`
  não é checado.
- **O `AGENTS.addendum.md` do kit foi corrigido nesta sessão** e agora nomeia os
  9 gates. O fluxo passou de **dois `Audit` sem rótulo** para **um, rotulado G8**.

## 13. Limite de competência, deliberado

Isto **não** é uma regra do processo e está aqui só para não ser confundido
com uma.

A decisão de produto sobre fechar `relatorios-gerenciais` (11/11 PASS,
`rascunho`) e `legado-baseline` (1/1 PASS, `em-implementacao`) pertence ao dono
do produto. Nenhum agente deve inferi-la, e nenhum gate a exige: o Project Gate
olha apenas as features **incluídas** na entrega.
