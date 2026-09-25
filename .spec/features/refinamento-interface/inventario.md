# Inventario

> feature: refinamento-interface

---

## 1. Observado — componentes reutilizáveis existentes

- `src/ui/components/EmptyState.tsx`: aceita `message?: string`; renderiza `div` com `role="region"`, `aria-label={message}`, `fontFamily: FONT_BODY`, `fontSize: FONT_SIZE_BODY`, `padding: SPACING_MD`, `color: COLOR_PRIMARY`. Não é utilizado de forma padronizada em `ClientesPage`, `ComandasPage`, `ConfigComissoesPage`, `RelatorioEstoquePage`.
- `src/ui/components/Loading.tsx`: aceita `message?: string`; `role="status"`, `aria-live="polite"`.
- `src/ui/components/ErrorMessage.tsx`: aceita `message?: string`; `role="alert"`, `aria-live="assertive"`.
- `src/ui/components/Card.tsx`: aceita `children`; `border: 1px solid ${COLOR_SECONDARY}`, `borderRadius: 8`, `padding: SPACING_MD`. Usado apenas no `DashboardPage`.

## 2. Problema — uso não padronizado

- `EmptyState` não é utilizado nas telas de cadastro (`ClientesPage`, `ComandasPage`, `ConfigComissoesPage`) quando a lista está vazia.
- `Card` não é utilizado para agrupar formulário e conteúdo abaixo, resultando em pouca separação visual (`P2`/`P3` na auditoria).
- Decisão: componente `Button` será criado (`src/ui/components/Button.tsx`) com variantes `primary` / `destructive` / `neutral`, justificado pelo uso real em pelo menos uma página (AC-005, AC-006).
- Nenhum componente `FormField` será criado nesta feature (decisão confirmada); separação entre `label` e `input` feita diretamente nas páginas (AC-001, AC-002, AC-011). `Button` (`primary`/`destructive`/`neutral`) é decisão confirmada (AC-005, AC-006). Nenhum componente de botão (`Button`) ou campo de formulário (`FormField`) existe na fundação atual; cada página define estilos inline, exceto quando `Button` for implementado.

## 3. Hipotese / recomendacao — uso padronizado

- Utilizar `EmptyState` com `message` configurada para todas as listas vazias (AC-003, AC-004).
- Utilizar `Card` (ou estilos equivalentes) para agrupar seções quando necessário para separação visual (AC-002, AC-008).
- Se `Button` reutilizável for criado (decisão confirmada: variantes `primary`/`destructive`/`neutral`, obrigatório para AC-005/AC-006; arquivo `src/ui/components/Button.tsx`), deve aceitar `variant` e ser usado em pelo menos uma página. `FormField` não será criado.

---

## 4. Observado — tokens visuais

- `colors.ts`: `COLOR_PRIMARY = "crimson"`; `COLOR_SECONDARY = "#e0e0e0"`; `COLOR_TEXT = "#333333"`.
- `typography.ts`: `FONT_BODY = "sans-serif"`; `FONT_SIZE_BODY = "1rem"`; `FONT_HEADING = "sans-serif"` (não utilizado em todos os títulos); `FONT_SIZE_HEADING = "1.5rem"` (novo token, definido para AC-007).
- `spacing.ts`: `SPACING_SM = 8`; `SPACING_MD = 16`; `SPACING_LG = 24`.

## 5. Problema — tipografia e espaçamento

- `FONT_HEADING` e `FONT_SIZE_HEADING` (`"1.5rem"`) devem ser utilizados explicitamente nos títulos principais (`h1`/`h2`) (AC-007), sem depender do CSS padrão do navegador.
- `SPACING_LG` (`24`) é usado para `marginBottom` do formulário, mas não pode ser a única separação visual entre formulário e conteúdo (AC-002); separação entre seções (`AC-008`) exige `Card` ou `marginTop`/`marginBottom` explícito.

## 6. Hipotese / recomendacao — tipografia e espaçamento

- Títulos principais (`h1`/`h2`) devem utilizar `fontFamily: FONT_HEADING` e `fontSize: FONT_SIZE_HEADING` (token obrigatório `"1.5rem"`, definido em `typography.ts`) (AC-007), sem aceitar `font-size: "1.5rem"` direto sem referência ao token.
- Seções devem ser separadas por `SPACING_MD` (`16`) ou `SPACING_LG` (`24`), ou por `Card`, para criar diferenciação visual (AC-002, AC-008).

---

## 7. Observado — formulários

- `LoginPage.tsx`: `input` com `placeholder` (`E-mail`, `Senha`), sem `label`. `form` com `display: grid`, `gap: 8`.
- `ProfissionaisPage.tsx`: `input` com `placeholder` (`Nome`, `Telefone`, `Comissão padrão`), sem `label`.
- `ClientesPage.tsx`: `input` com `placeholder` (`Nome`, `Telefone`, `E-mail`), sem `label`.
- `ServicosPage.tsx`: `input` com `placeholder` (`Nome`, `Preço`, `Duração`), sem `label`.
- `ProdutosPage.tsx`: `input` com `placeholder` (`Nome`, `Preço de venda`, `Estoque inicial`), sem `label`.
- `ConfigComissoesPage.tsx`: `label` aninhado com texto visível (ex: `Profissional`, `Serviço`, `% de comissão`), `input` e `select` dentro do `label`. `form` com `display: grid`, `gap: 8`, `maxWidth: 420`.
- `ComandasPage.tsx`: `label` presente para `Profissional (opcional)`; outros campos (`Qtd`, `Valor`) com `placeholder` sem `label` associado.

## 8. Problema — labels ausentes ou não associados

- `P2` recorrente: `LoginPage`, `ProfissionaisPage`, `ClientesPage`, `ServicosPage`, `ProdutosPage` dependem de `placeholder` sem `label` associado.
- `ComandasPage` tem `label` parcial (`Profissional`) mas `Qtd` e `Valor` sem `label` associado.
- Nenhum componente `FormField` será criado nesta etapa.
- AC-002 não é satisfeito apenas pelo `marginBottom` existente (`SPACING_LG`) no elemento `form`: a separação deve ser verificável entre o grupo do formulário e o conteúdo abaixo (ex: `borderBottom`, `Card`, ou `marginTop` no conteúdo).

## 9. Hipotese / recomendacao — labels

- Adicionar `label` associado (`htmlFor` + `id` ou `label` aninhado com texto visível) a todos os inputs de formulário de cadastro (AC-001, AC-011).
- Se `FormField` for criado, deve aceitar `label`, `required`, `pattern`, `children`, e ser usado em pelo menos uma página existente (AC-001).

---

## 10. Observado — navegação

- `App.tsx`: `nav` com `display: flex`, `gap: 8`, `flexWrap: "wrap"`. Botões com `fontWeight: abaAtiva === a.id ? "bold" : "normal"`. Sem `aria-current`. Sem `aria-label` na `nav`.

## 11. Problema — navegação

- `P3`: aba ativa indicada apenas por `fontWeight: bold`. Sem semântica (`aria-current`). Sem indicador visual adicional.

## 12. Hipotese / recomendacao — navegação

- Adicionar `aria-current="page"` ao botão da aba ativa (AC-009) e `borderBottom` com `COLOR_PRIMARY` como indicador visual adicional.
- Separação clara entre prova mecânica (`aria-current` presente no DOM) e validação visual humana (indicador visual adicional visível).

---

## 13. Observado — botões

- Todos os botões (`Cadastrar cliente`, `Cadastrar serviço`, `Cadastrar produto`, `Abrir comanda`, `Fechar comanda`, `Filtrar`, `Salvar configuração`, `Desativar`, `Cancelar`) usam o mesmo estilo neutro (`button` padrão do navegador, sem variante visual definida).

## 14. Problema — botões

- `P3`: botões primários sem destaque visual consistente.
- `P2`: botões destrutivos (`Desativar`, `Cancelar`) com mesmo estilo neutro, sem distinção.

## 15. Hipotese / recomendacao — botões

- Aplicar variante visual distinta para botões primários (`Button` com `variant="primary"`) e destrutivos (`Button` com `variant="destructive"`) (AC-005, AC-006), sem depender apenas de `fontWeight: bold`.
- Se `Button` reutilizável for criado (decisão confirmada), deve aceitar `variant` (`primary` | `destructive` | `neutral`) e ser usado em pelo menos uma página.

---

## 16. Observado — estados de interface

- `DashboardPage.tsx`: `Loading` usado para CMV; `EmptyState` usado para estoque negativo com mensagem positiva (`Todos os produtos com estoque positivo`) — não é um estado vazio, mas poderia ser convertido para `EmptyState` quando não há registros negativos.
- `RelatorioEstoquePage.tsx`: mensagem de vazio presente (`Nenhum produto com estoque negativo`), mas sem `EmptyState`.
- `RelatorioCaixaPage.tsx`: mensagem de vazio (`Nenhum registro encontrado para o intervalo informado`) sem `EmptyState`.
- `RelatorioComissaoPage.tsx`: sem mensagem de vazio explícita.
- `ComandasPage.tsx`: lista vazia (`ul` vazio) sem mensagem de vazio.

## 17. Problema — estados de interface

- `EmptyState` não utilizado de forma padronizada nas páginas de cadastro e relatório.
- `Loading` e `ErrorMessage` são usados corretamente, mas `EmptyState` é subutilizado.

## 18. Hipotese / recomendacao — estados

- Utilizar `EmptyState` para todas as telas do AC-003 (`ClientesPage`, `ComandasPage`, `ConfigComissoesPage`, `ProfissionaisPage`, `ServicosPage`, `ProdutosPage`, além dos relatórios), não apenas para as páginas de cadastro.
- Configurar `message` de acordo com o contexto (AC-004).
- Manter semântica acessível dos componentes existentes (AC-010) sem remover `role` e `aria-live`.

---

## 19. Resumo executivo (para auditoria)

- Inventario criado: `.spec/features/refinamento-interface/inventario.md`.
- Nenhum arquivo em `src/` alterado; componente `Button` e token `FONT_SIZE_HEADING` registrados como decisões; nenhum componente implementado; apenas documentação atualizada.
- Nenhum arquivo em `supabase/` alterado; `package.json` preservado.
- Os problemas recorrentes (`P2` e `P3`) confirmados na auditoria estão documentados e mapeados para AC verificáveis.
- Nenhuma alteração funcional; apenas evolução visual baseada em evidências.
