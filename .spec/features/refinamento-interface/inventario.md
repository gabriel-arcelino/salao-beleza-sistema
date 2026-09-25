# Inventario

> feature: refinamento-interface

---

## 1. Observado — componentes reutilizáveis existentes

- `src/ui/components/EmptyState.tsx`: aceita `message?: string`; renderiza `div` com `role="region"`, `aria-label={message}`, `fontFamily: FONT_BODY`, `fontSize: FONT_SIZE_BODY`, `padding: SPACING_MD`, `color: COLOR_PRIMARY`. Não é utilizado de forma padronizada em `ClientesPage`, `ComandasPage`, `ConfigComissoesPage`, `RelatorioEstoquePage`.
- `src/ui/components/Loading.tsx`: aceita `message?: string`; `role="status"`, `aria-live="polite"`.
- `src/ui/components/ErrorMessage.tsx`: aceita `message?: string`; `role="alert"`, `aria-live="assertive"`.
- `src/ui/components/Card.tsx`: aceita `children`; `border: 1px solid ${COLOR_SECONDARY}`, `borderRadius: 8`, `padding: SPACING_MD`. Usado apenas no `DashboardPage`.

## 2. Problema e decisões fechadas de componentes

- `EmptyState` existe, mas não é utilizado de forma padronizada nas listas e relatórios quando não há registros.
- `Card` não é utilizado para agrupar formulário e conteúdo posterior, resultando em pouca separação visual (`P2`/`P3` na auditoria).
- **Decisão fechada — `Button` reutilizável:** será criado `src/ui/components/Button.tsx` com as variantes `primary`, `neutral` e `destructive` para uso nas páginas (AC-035, AC-036).
- **Decisão fechada — `FormField`:** não será criado; labels e controles serão organizados diretamente nas páginas, preservando os contratos dos componentes existentes.
- A fundação atual não possui `Button`; até a implementação desta feature, as páginas usam elementos `button` com estilos próprios.

## 3. Decisões fechadas — uso padronizado

- Usar `EmptyState` com `message` configurada em todas as páginas cobertas por AC-033/AC-034.
- Usar um contêiner estrutural explícito para o conteúdo posterior e aplicar separação visual por `Card`, borda ou `marginTop >= SPACING_LG`; `marginBottom` apenas no formulário é insuficiente (AC-032).
- Usar o `Button` reutilizável com `variant="primary"` nas ações primárias e `variant="destructive"` nas destrutivas; `destructive` deve ser distinta de `neutral` e `primary`. Nenhuma propriedade CSS específica nem `style` inline é obrigatório.

---

## 4. Observado — tokens visuais

- `colors.ts`: `COLOR_PRIMARY = "crimson"`; `COLOR_SECONDARY = "#e0e0e0"`; `COLOR_TEXT = "#333333"`.
- `typography.ts`: `FONT_BODY = "sans-serif"`; `FONT_SIZE_BODY = "1rem"`; `FONT_HEADING = "sans-serif"`. `FONT_SIZE_HEADING` ainda não está definido.
- `spacing.ts`: `SPACING_SM = 8`; `SPACING_MD = 16`; `SPACING_LG = 24`.

## 5. Problema — tipografia e espaçamento

- `FONT_HEADING` não é utilizado em todos os títulos principais e não há token `FONT_SIZE_HEADING` no arquivo atual.
- `SPACING_LG` (`24`) é usado para `marginBottom` do formulário, mas esse `marginBottom` não pode ser a única separação visual entre formulário e conteúdo posterior (AC-032).
- O `gap` interno do formulário não pode ser a única separação visual entre grupos estruturais (AC-038).

## 6. Decisões fechadas — tipografia e espaçamento

- **Decisão fechada — `FONT_SIZE_HEADING`:** `src/ui/tokens/typography.ts` deve definir `FONT_SIZE_HEADING = "1.5rem"`; os títulos principais devem usar `FONT_HEADING` e `FONT_SIZE_HEADING` (AC-037). O valor `"1.5rem"` não pode ser usado diretamente sem referência ao token; não há exceção para integração direta.
- Estruturar os grupos explicitamente e separá-los visualmente por `Card`, borda ou `marginTop`/`marginBottom >= SPACING_MD` (AC-032, AC-038).

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
- `ComandasPage` tem `label` parcial (`Profissional`), mas `Qtd` e `Valor` não têm label associado.
- AC-032 não é satisfeito apenas pelo `marginBottom` existente (`SPACING_LG`) no elemento `form`: o conteúdo posterior precisa de contêiner estrutural explícito e separação visual entre os grupos.

## 9. Decisões fechadas — labels

- Associar labels por `htmlFor` + `id` quando essa estratégia for usada, garantindo correspondência e `id` único; label aninhado com texto descritivo visível continua sendo uma estratégia válida (AC-031, AC-041).
- Nenhum componente `FormField` será criado; a organização será feita diretamente nas páginas, sem alterar os contratos dos componentes existentes.

---

## 10. Observado — navegação

- `App.tsx`: `nav` com `display: flex`, `gap: 8`, `flexWrap: "wrap"`. Botões com `fontWeight: abaAtiva === a.id ? "bold" : "normal"`. Sem `aria-current`. Sem `aria-label` na `nav`.

## 11. Problema — navegação

- `P3`: aba ativa indicada apenas por `fontWeight: bold`. Sem semântica (`aria-current`). Sem indicador visual adicional.

## 12. Decisão fechada — navegação

- A aba ativa deve usar `aria-current="page"` e `borderBottom` com `COLOR_PRIMARY`, preservando `fontWeight: "bold"` (AC-039).
- A prova mecânica confirma a presença de `aria-current` e das regras de estilo; a validação visual humana confirma que o indicador está visível. São verificações distintas e complementares.

---

## 13. Observado — botões

- Todos os botões (`Cadastrar cliente`, `Cadastrar serviço`, `Cadastrar produto`, `Abrir comanda`, `Fechar comanda`, `Filtrar`, `Salvar configuração`, `Desativar`, `Cancelar`) usam o mesmo estilo neutro (`button` padrão do navegador, sem variante visual definida).

## 14. Problema — botões

- `P3`: botões primários sem destaque visual consistente.
- `P2`: botões destrutivos (`Desativar`, `Cancelar`) com mesmo estilo neutro, sem distinção.

## 15. Decisões fechadas — botões

- Criar `src/ui/components/Button.tsx` como componente reutilizável que aceita `variant` (`primary` | `neutral` | `destructive`).
- Usar `variant="primary"` nas ações primárias e `variant="destructive"` nas destrutivas; a variante destrutiva deve ser distinta de `neutral` e `primary` (AC-035, AC-036).
- A implementação pode definir a aparência internamente por qualquer mecanismo; nenhuma propriedade CSS específica nem `style` inline é obrigatório.

---

## 16. Observado — estados de interface

- `DashboardPage.tsx`: `Loading` usado para CMV e `EmptyState` usado para estoque negativo com a mensagem positiva `Todos os produtos com estoque positivo`; essa página não integra a cobertura de AC-033.
- `RelatorioEstoquePage.tsx`: mensagem de vazio presente (`Nenhum produto com estoque negativo`), mas sem `EmptyState`.
- `RelatorioCaixaPage.tsx`: mensagem de vazio (`Nenhum registro encontrado para o intervalo informado`) sem `EmptyState`.
- `RelatorioComissaoPage.tsx`: sem mensagem de vazio explícita.
- `ComandasPage.tsx`: lista vazia (`ul` vazio) sem mensagem de vazio.

## 17. Problema — estados de interface

- `EmptyState` não utilizado de forma padronizada nas páginas de cadastro e relatório.
- `Loading` e `ErrorMessage` são usados corretamente, mas `EmptyState` é subutilizado.

## 18. Decisões fechadas — estados

- Usar `EmptyState` de forma padronizada em Profissionais, Clientes, Serviços, Produtos, Configuração de Comissão, Comandas, Relatório de Estoque, Fechamento de Caixa e Comissão por Profissional (AC-033).
- Configurar `message` de acordo com o contexto e manter a mensagem visível (AC-034).
- Preservar a semântica acessível de `EmptyState`, `Loading` e `ErrorMessage` sem alterar seus contratos ou remover `role` e `aria-live` (AC-040).

---

## 19. Resumo executivo (para auditoria)

- Inventario atualizado: `.spec/features/refinamento-interface/inventario.md`.
- Nenhum arquivo em `src/` ou `supabase/` foi alterado; nenhum componente ou teste foi criado nesta etapa.
- Decisões fechadas: `Button` reutilizável com variantes `primary`, `neutral` e `destructive`; `FONT_SIZE_HEADING = "1.5rem"`; nenhum `FormField`; uso padronizado de `EmptyState`; navegação com `aria-current="page"`, `borderBottom` e `COLOR_PRIMARY`.
- Os problemas recorrentes (`P2` e `P3`) confirmados na auditoria estão mapeados para os AC-031 a AC-041.
- A prova mecânica e a validação visual humana são gates distintos e complementares: a primeira confirma estrutura, atributos e tokens; a segunda confirma a separação e a qualidade visual percebidas.
