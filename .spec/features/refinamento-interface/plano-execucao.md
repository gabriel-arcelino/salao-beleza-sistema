# Plano de execução — refinamento-interface

> gerado por `onp-spec plano` em 2026-09-25 03:22 — NÃO edite à mão;
> mudou tasks.md ou a config? Regenere: `onp-spec plano refinamento-interface`

## Resumo — o que vai acontecer

- **6 tarefa(s) pendente(s)**: 5 em 2 faixa(s) paralela(s) + 1 sequencial(is)
- **1 faixa = 1 worktree + 1 branch + 1 janela de contexto limpa** — faixas não compartilham nenhum arquivo entre si
- prefere outra seleção ou uma após a outra? Regenere com `onp-spec plano refinamento-interface --paralelizar T-xxx,T-yyy` ou `--sequencial`
- tudo acontece na branch de trabalho `spec/refinamento-interface`; levar para a main é decisão sua

### Avisos

- ⚠ T-024 não lista Arquivos: — pegada desconhecida, vai rodar sozinha ao final (sem paralelismo)

## Faixas e ondas

### Onda 1 — faixa-1 ∥ faixa-2

#### faixa-1 — branch `spec/refinamento-interface-faixa-1` — worktree `../onp-worktrees/salao-beleza-sistema-refinamento-interface-faixa-1`

| tarefa | título | modelo | esforço | arquivos |
|---|---|---|---|---|
| T-019 | Implementar labels e separação estrutural nos formulários | `claude-sonnet-5` | medium | `src/pages/LoginPage.tsx`, `src/pages/ProfissionaisPage.tsx`, `src/pages/ClientesPage.tsx`, `src/pages/ServicosPage.tsx`, `src/pages/ProdutosPage.tsx`, `src/pages/ConfigComissoesPage.tsx`, `src/pages/ComandasPage.tsx` |
| T-020 | Padronizar estados vazios com componente `EmptyState` | `claude-sonnet-5` | medium | `src/pages/ProfissionaisPage.tsx`, `src/pages/ClientesPage.tsx`, `src/pages/ServicosPage.tsx`, `src/pages/ProdutosPage.tsx`, `src/pages/ConfigComissoesPage.tsx`, `src/pages/ComandasPage.tsx`, `src/pages/RelatorioEstoquePage.tsx`, `src/pages/RelatorioCaixaPage.tsx`, `src/pages/RelatorioComissaoPage.tsx` |
| T-021 | Criar `Button` reutilizável e aplicar variantes de ação | `claude-sonnet-5` | medium | `src/ui/components/Button.tsx`, `src/pages/LoginPage.tsx`, `src/pages/ProfissionaisPage.tsx`, `src/pages/ClientesPage.tsx`, `src/pages/ServicosPage.tsx`, `src/pages/ProdutosPage.tsx`, `src/pages/ConfigComissoesPage.tsx`, `src/pages/ComandasPage.tsx`, `src/pages/RelatorioCaixaPage.tsx`, `src/pages/RelatorioComissaoPage.tsx` |
| T-022 | Melhorar hierarquia tipográfica e composição | `claude-sonnet-5` | medium | `src/ui/tokens/typography.ts`, `src/pages/DashboardPage.tsx`, `src/pages/LoginPage.tsx`, `src/pages/ProfissionaisPage.tsx`, `src/pages/ClientesPage.tsx`, `src/pages/ServicosPage.tsx`, `src/pages/ProdutosPage.tsx`, `src/pages/ConfigComissoesPage.tsx`, `src/pages/ComandasPage.tsx`, `src/pages/RelatorioEstoquePage.tsx`, `src/pages/RelatorioCaixaPage.tsx`, `src/pages/RelatorioComissaoPage.tsx` |

#### faixa-2 — branch `spec/refinamento-interface-faixa-2` — worktree `../onp-worktrees/salao-beleza-sistema-refinamento-interface-faixa-2`

| tarefa | título | modelo | esforço | arquivos |
|---|---|---|---|---|
| T-023 | Melhorar navegação com indicador visual e semântico | `claude-sonnet-5` | medium | `src/App.tsx` |

## Tarefas sequenciais (após as ondas, na árvore principal)

| tarefa | título | modelo | esforço | por que sequencial |
|---|---|---|---|---|
| T-024 | Verificar AC-040 e executar a verificação final de todos os critérios de aceite | `claude-sonnet-5` | medium | sem `Arquivos:` — pegada desconhecida |

## Gestão de branches e commits

1. branch de trabalho `spec/refinamento-interface` criada do ponto atual (se ainda não existir)
2. cada faixa nasce dela como branch própria e roda no seu worktree — **1 tarefa = 1 commit** (`T-xxx feature: título`)
3. terminou a onda → merge `--no-ff` de cada faixa de volta, na ordem; conflito interrompe a faixa e pede resolução humana
4. faixa mesclada → worktree removido, branch apagada, tarefa marcada `[concluida]` no tasks.md
5. gate final na branch de trabalho: `onp-spec verify refinamento-interface` + `onp-spec audit --ci` — **exit 0 ou não está pronto**

## Como executar

### ▶ Execução — Claude Code headless

```bash
bash .spec/features/refinamento-interface/executar-tarefas.sh
```

Cada faixa roda `claude -p` com **janela de contexto limpa**, no seu worktree, com
`--model` e `--effort` já definidos por tarefa e permissões `acceptEdits`. Os prompts exatos estão
embutidos no script — quer rodar uma faixa na mão, é só copiá-los de lá.
Logs: `../onp-worktrees/salao-beleza-sistema-refinamento-interface-logs/`.

### 📣 Acompanhamento — tabela + resumo no chat (a cada 1 min)

O script roda em **background**: o agente AVISA o usuário antes de iniciar e,
enquanto roda, posta no chat a cada ~1 minuto a **tabela de andamento** (qual
tarefa está rodando, qual não está, o que concluiu/falhou) junto com o
**resumo geral de andamento** (escrito por IA; sem IA, o motor resume). Ao
final, o usuário recebe o resumo completo da execução. A qualquer momento:

```bash
onp-spec resumo refinamento-interface --tabela   # a tabela de andamento
onp-spec resumo refinamento-interface            # o resumo em texto
```

