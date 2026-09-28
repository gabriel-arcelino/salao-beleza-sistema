# Salão Beleza — Sistema

## Contexto do projeto

- Preserve a arquitetura e os padrões existentes.
- Consulte a documentação do projeto antes de alterar decisões arquiteturais importantes.
- Não altere contratos ou estruturas de dados existentes sem necessidade.

## Ferramentas

- Use as ferramentas nativas do Kilo quando forem suficientes.
- Use `code-index` quando ele oferecer vantagem relevante para localizar símbolos, referências ou compreender a estrutura do projeto.
- Use `context7` para verificar documentação e APIs de bibliotecas quando necessário.
- Não use MCPs apenas porque estão disponíveis.

## Stack local (Supabase)

O stack local exige **Supabase CLI >= 2.118.0**, que fornece **PostgREST >= 16.3**.

- Motivo: o PostgREST 16.1 tem um defeito documentado — [#5196](https://github.com/PostgREST/postgrest/issues/5196),
  corrigido em 16.3 — em que o relógio interno em cache faz um `iat` correto ser
  julgado como futuro, retornando `401 PGRST303 "JWT issued at future"` na primeira
  requisição após um período longo sem tráfego. Ver `docs/diagnostico-jwt.md`.
- A versão da imagem fica **hardcoded no binário da CLI**, não em
  `supabase/config.toml`. Não existe flag para pinar a tag.
- Portanto: rodar `npx supabase start` com uma CLI mais antiga **reverte o
  PostgREST para 16.1 silenciosamente**, sem erro e sem aviso, e o bug volta.
  Verifique a versão **antes** de qualquer `supabase start` ou `supabase stop`:

  ```bash
  npx supabase --version
  docker exec supabase_rest_salao-beleza-sistema postgrest --version
  ```

- Nunca use `supabase stop --no-backup`: apaga os volumes de dados.
- `npx supabase start` imprime chaves de desenvolvimento no terminal. São defaults
  locais compartilhados; não as reproduza em logs, commits ou documentação.

## Escopo

- Não altere arquivos não relacionados.
- Não faça refatorações oportunistas.
- Revise o diff antes de concluir.

## Gates

Norma completa (Task Done, Feature Done, Project Gate, estados PASS / FAIL /
BLOCKED / N/A) no ONP Factory Kit: `docs/done-e-gates.md`. Resumo operacional:

| Gate | Pergunta | Aplicação |
|---|---|---|
| **G0** Escopo da Entrega | O que exatamente estamos tentando fechar? | por entrega |
| **G1** SPEC Review | A SPEC está correta e testável para implementar? | por feature, **antes do código** |
| **G2** Test/Evidence Design | Sabemos como cada AC será provado? | por feature, antes do código |
| **G3** Feature Verify | A implementação satisfaz mecanicamente os ACs? | por feature |
| **G4** QA Funcional | Funciona em cenário real quando a automação não basta? | condicional |
| **G5** QA Visual | A mudança perceptível produz o resultado esperado? | condicional |
| **G6** Diff/Scope Review | O que foi alterado corresponde ao escopo? | feature e entrega |
| **G7** Global Regression | Continua compatível com o resto do projeto? | por entrega |
| **G8** Audit | O estado estrutural e de evidência está coerente? | por feature e entrega |

Regras que evitam os atalhos mais comuns:

- **Gate obrigatório não executado é BLOCKED, nunca PASS.** "Não consegui rodar o
  audit" não é pronto. Desligar Docker/Supabase não converte gate em PASS.
- **PASS não é Done.** PASS é estado da prova; Done é estado do trabalho.
- **Escopo de entrega é explícito.** Toda entrega tem um artefato
  `.spec/releases/<id>.md` listando features incluídas e não incluídas.
- **`Refs:` entre features é dependência de evidência, não de status.** Se uma
  task de A referencia AC de B, A exige prova PASS válida daquele AC — não
  exige que B esteja Done.
- **Ordem:** G0 → G1 → G2 → Tasks → Implementação → G3 → G4 → G5 → G6 → G8 →
  Feature Done. Para entrega: features Done → G7 → G6 → G8 → Project Gate.

## Feature Verify vs Regressão Global

Para verificar uma feature ONP neste projeto, use:

```bash
node scripts/onp-feature-verify.cjs <feature>
```

Não use diretamente:

```bash
node .claude/skills/onp-spec-driven/scripts/onp-spec.mjs verify <feature>
```

como gate final de uma feature, porque o testCommand do projeto é global.

Para regressão completa use:

```bash
node scripts/onp-combined-verify.cjs
```

Distinção: Feature Verify ≠ Global Regression

Nota operacional sobre `db reset`: `scripts/onp-feature-verify.cjs` detecta se a feature possui testes pgTAP (`supabase/tests/0*.sql` com tags `@spec:AC-xxx`) e, quando detecta, executa `npx supabase db reset` antes do verify. O banco local usado nesse fluxo é descartável; não há preservação de dados manuais de desenvolvimento nesse processo. Se precisar manter dados locais, faça backup antes de rodar o verify.

## Workflow Especializado

Para workflows avançados de engenharia, debugging, análise de causa raiz, pesquisa, alterações cirúrgicas e verificação, use a skill:

```
/retro-karpathy
```

A skill é carregada sob demanda: no Kilo pelo comando acima, e em agentes compatíveis
(OpenCode) automaticamente pela descrição, sem precisar digitar nada. No OpenCode o
comando também existe em `.opencode/commands/retro-karpathy.md`, para execução explícita.

Arquivos que sustentam as skills deste projeto:

- `.claude/skills/retro-karpathy/SKILL.md` — fonte da skill (cópia espelhada de `.kilo/skills/`)
- `.claude/skills/onp-spec-driven/SKILL.md` — motor spec-anchored e seus scripts

Ao editar qualquer `SKILL.md`, o frontmatter precisa ter `name` e `description`, o `name`
deve ser igual ao nome da pasta, e a `description` é limitado a 1024 caracteres. Evite
`: ` (dois-pontos + espaço) dentro do valor da `description`, porque isso quebra o parse
YAML e a skill é descartada silenciosamente.