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

## Escopo

- Não altere arquivos não relacionados.
- Não faça refatorações oportunistas.
- Revise o diff antes de concluir.

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