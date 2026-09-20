# Auditoria de leitura — feature `fundacao-ui` (sem alterações)

Status da feature: `rascunho`. Nenhum arquivo em `src/` foi alterado. Nenhum componente, token ou módulo foi criado ainda. Os contratos existentes (`DashboardPage.tsx`, `src/lib/api/estoque.ts`) estão intactos.

---

## AC-012 — Tokens visuais básicos disponíveis

1. **Exigência do AC**: módulos centrais (`colors`, `typography`, `spacing`) com exports reutilizáveis para componentes da UI.
2. **Teste associado**: `tests/ui/fundacao-ui.spec.tsx` — bloco `@spec:AC-012` (linhas 15-32).
3. **O que o teste verifica**: importa dinamicamente os 3 módulos, confirma que são objetos (`typeof === "object"`) e que possuem pelo menos uma chave (`Object.keys > 0`).
4. **Poderia passar sem implementação real?** Sim. Arquivos vazios com uma exportação trivial (ex: `export const x = 1`) passariam. Não há verificação de conteúdo semântico (paleta de cores, escala tipográfica, unidades de espaçamento), nem de uso real por algum componente.
5. **Falso positivo / mock / comportamento trivial?** Sim — evidência mínima. Não verifica se os tokens são centralizados de forma útil, se possuem nomes consistentes ou se são importados por algum componente.
6. **Suficientemente objetivo?** Sim. O AC é claro: "disponíveis por meio de módulos centrais". A implementação é direta.
7. **Dependências / contratos existentes?** Nenhum contrato de negócio é afetado. A arquitetura atual não usa tokens; a criação de `src/ui/tokens/` é nova e isolada.

**Classificação: `REFINAR SPEC — requisito não suficientemente observável`**  
*(Nota: o AC é objetivo, mas o teste atual não comprova utilidade real. Se o objetivo é apenas ter arquivos com exports, o teste é suficiente. Se o objetivo é uma fundação visual verificável, o teste precisa ser reforçado.)*

---

## AC-013 — Página representativa utiliza a fundação visual

1. **Exigência do AC**: quando o Dashboard for renderizado, seus elementos visuais principais devem utilizar os padrões definidos pela fundação, preservando comportamento e conteúdo atuais.
2. **Teste associado**: `tests/ui/fundacao-ui.spec.tsx` — bloco `@spec:AC-013` (linhas 34-52).
3. **O que o teste verifica**: faz mock de `getProdutosEstoqueNegativo` e `calcularCMV`, importa `DashboardPage`, renderiza e apenas confirma `screen.getByText(/dashboard/i)`. Há um comentário explícito no código (linhas 36-38) admitindo que "a fundação ainda não oferece uma convenção observável definida pela especificação para comprovar diretamente o uso dos tokens no DOM".
4. **Poderia passar sem implementação real?** Sim. Qualquer `DashboardPage` que renderize um `<h2>Dashboard</h2>` passa, independentemente de usar tokens, componentes reutilizáveis ou estilos da fundação.
5. **Falso positivo / comportamento trivial?** Grave. O teste NÃO verifica: (a) uso de tokens (`colors`, `spacing`, `typography`) no DOM; (b) aplicação de componentes reutilizáveis (`Card`, `Loading`, `EmptyState`, `ErrorMessage`) no Dashboard; (c) semântica acessível nos elementos modificados; (d) preservação dos valores dos contratos (o mock retorna `[]` e `100`, mas o teste não verifica se esses valores aparecem na interface).
6. **Suficientemente objetivo?** O AC é observável — exige uso dos padrões da fundação no Dashboard. No entanto, a especificação não define uma convenção observável explícita (ex: classes CSS específicas, estilos derivados de tokens, ou presença de componentes). Isso torna o AC vulnerável a interpretações e testes vazios.
7. **Dependências / contratos existentes?** `DashboardPage.tsx` usa `getProdutosEstoqueNegativo()` e `calcularCMV()` (`src/lib/api/estoque.ts`). Esses contratos devem ser preservados. O inventário (`inventario.md`) confirma que esses contratos estão intactos.

**Classificação: `CORRIGIR TESTE — teste não comprova adequadamente o AC`**  
O comentário no próprio código (linhas 36-38) é uma confissão de evidência insuficiente. Para que AC-013 seja verificável, a spec precisa definir uma convenção observável (ex: tokens importados no arquivo, estilos derivados, ou uso de componentes reutilizáveis no Dashboard) e o teste deve verificar essa convenção no DOM ou no código fonte do componente, não apenas a presença do texto "dashboard".

---

## AC-014 — Estado de loading reutilizável

1. **Exigência do AC**: componente `Loading` reutilizável, configurável pelo menos por mensagem.
2. **Teste associado**: `tests/ui/fundacao-ui.spec.tsx` — bloco `@spec:AC-014` (linhas 54-60).
3. **O que o teste verifica**: importa `Loading`, renderiza com `message="Carregando dados..."` e confirma que o texto está no documento.
4. **Poderia passar sem implementação real?** Sim. Um componente que apenas retorna `<p>{message}</p>` passa. Não verifica se é realmente reutilizável em múltiplos contextos, se aceita outras props, ou se tem estrutura visual consistente.
5. **Falso positivo / mock?** Comportamento trivial. O teste atende ao mínimo do AC, mas não comprova reutilização além da prop `message`. No entanto, o AC não exige mais do que isso.
6. **Suficientemente objetivo?** Sim. "Permitir configurar pelo menos sua mensagem" é claro e testável.
7. **Dependências / contratos?** Nenhum contrato de negócio. É um componente novo.

**Classificação: `OK — pronto para implementação`**  
*(Nota: o teste é mínimo, mas atende exatamente ao que o AC exige. Se a intenção for uma fundação mais robusta, a spec deveria exigir props adicionais ou estilos mínimos.)*

---

## AC-015 — Estado vazio reutilizável

1. **Exigência do AC**: componente `EmptyState` reutilizável, configurável por mensagem.
2. **Teste associado**: `tests/ui/fundacao-ui.spec.tsx` — bloco `@spec:AC-015` (linhas 62-68).
3. **O que o teste verifica**: importa `EmptyState`, renderiza com `message` e confirma texto no documento.
4. **Poderia passar sem implementação real?** Sim. Mesma análise de AC-014: componente trivial passa.
5. **Falso positivo?** Mínimo, mas suficiente para o AC como formulado.
6. **Suficientemente objetivo?** Sim.
7. **Dependências / contratos?** Nenhum.

**Classificação: `OK — pronto para implementação`**

---

## AC-016 — Estado de erro reutilizável

1. **Exigência do AC**: componente `ErrorMessage` reutilizável, configurável por mensagem.
2. **Teste associado**: `tests/ui/fundacao-ui.spec.tsx` — bloco `@spec:AC-016` (linhas 70-77).
3. **O que o teste verifica**: importa `ErrorMessage`, renderiza com `message`, confirma texto e verifica `getByRole("alert")`.
4. **Poderia passar sem implementação real?** Não facilmente — o componente precisa fornecer `role="alert"` para passar. Isso é uma evidência mínima mas real.
5. **Falso positivo?** Não há falso positivo significativo. A verificação de `role="alert"` já comprova parte da semântica, embora o AC-016 não exija isso explicitamente (é exigência de AC-018).
6. **Suficientemente objetivo?** Sim.
7. **Dependências / contratos?** Nenhum.

**Classificação: `OK — pronto para implementação`**

---

## AC-017 — Card reutilizável

1. **Exigência do AC**: componente `Card` reutilizável que permita composição de conteúdo sem repetir estilos estruturais.
2. **Teste associado**: `tests/ui/fundacao-ui.spec.tsx` — bloco `@spec:AC-017` (linhas 79-91).
3. **O que o teste verifica**: importa `Card`, renderiza com `<h4>` e `<p>` como children e confirma que os textos aparecem.
4. **Poderia passar sem implementação real?** Sim. Se `Card` for apenas um `<div>` sem estilos, o teste passa. Não há verificação de estilos estruturais (border, borderRadius, padding, sombra, etc.), que são o ponto central do AC ("sem exigir repetição do mesmo conjunto de estilos estruturais").
5. **Falso positivo / comportamento trivial?** Grave. O teste comprova apenas que aceita `children`, mas não comprova que é um componente visual reutilizável. Se implementado como `<div>{children}</div>`, o AC não é atendido, mas o teste passa.
6. **Suficientemente objetivo?** O AC menciona "estilos estruturais", mas não define quais são esses estilos. Isso deixa espaço para interpretações, mas é observável se a spec definir um conjunto mínimo (ex: border, borderRadius, padding, box-shadow opcional). O inventário (`inventario.md`) documenta esses estilos no Dashboard atual.
7. **Dependências / contratos?** Nenhum contrato de negócio. É um componente visual.

**Classificação: `CORRIGIR TESTE — teste não comprova adequadamente o AC`**  
O teste precisa verificar que o componente aplica estilos consistentes (ex: `expect(container.firstChild).toHaveStyle(...)` ou verificação de classes) e que aceita composição sem repetir estilos inline no componente pai.

---

## AC-018 — Componentes de interface possuem semântica acessível

1. **Exigência do AC**:
   - `Loading`: `role="status"`
   - `EmptyState`: semântica acessível adequada (sem fixar `role` específico)
   - `ErrorMessage`: `role="alert"`
2. **Teste associado**: `tests/ui/fundacao-ui.spec.tsx` — bloco `@spec:AC-018` (linhas 93-108).
3. **O que o teste verifica**:
   - `Loading`: `querySelector('[role="status"]')` não nulo.
   - `ErrorMessage`: `querySelector('[role="alert"]')` não nulo.
   - `EmptyState`: apenas confirma que o texto `"Vazio."` está no documento (`getByText`).
4. **Poderia passar sem implementação real?** Para `EmptyState`, sim — qualquer componente que renderize `<p>Vazio.</p>` passa, sem nenhuma semântica acessível.
5. **Falso positivo / evidência insuficiente?** Grave apenas para `EmptyState`. O AC diz explicitamente: "Para `EmptyState`, não fixe neste AC um role específico. A verificação deverá considerar a semântica acessível adequada ao conteúdo e à estrutura apresentada." O teste atual NÃO verifica nenhuma semântica para `EmptyState`. Isso é uma falha direta de evidência contra o requisito.
6. **Suficientemente objetivo?** Sim, para `Loading` e `ErrorMessage` (roles definidos). Para `EmptyState`, é intencionalmente aberto (sem `role` fixo), mas exige que a verificação considere a semântica adequada. O teste atual ignora isso.
7. **Dependências / contratos?** Nenhum contrato de negócio.

**Classificação: `CORRIGIR TESTE — teste não comprova adequadamente o AC`**  
O teste precisa ser corrigido para verificar a semântica de `EmptyState` (ex: `aria-live` adequado, `role` apropriado ao conteúdo, ou pelo menos uma estrutura semântica como `<section aria-label>`). Sem isso, o AC-018 é apenas parcialmente testado.

---

## AC-019 — Dashboard preserva os contratos existentes

1. **Exigência do AC**: Dashboard continua utilizando `getProdutosEstoqueNegativo()` e `calcularCMV()`; valores e comportamentos preservados.
2. **Teste associado**: `tests/ui/fundacao-ui.spec.tsx` — bloco `@spec:AC-019` (linhas 110-132).
3. **O que o teste verifica**: faz mock das duas funções (`vi.mock`), importa `DashboardPage`, renderiza e confirma que ambas foram chamadas (`toHaveBeenCalled()`). Não verifica se os valores retornados são usados no DOM.
4. **Poderia passar sem implementação real?** Se o componente importar mas ignorar os resultados (ex: não atualizar estado, não renderizar os valores), o teste ainda passa, pois apenas verifica que as funções foram chamadas. No entanto, no código atual (`DashboardPage.tsx`), as funções são chamadas dentro de `useEffect` e seus resultados são usados para atualizar o estado. Se o componente não chamasse `carregar()` ou não usasse os resultados, o comportamento seria alterado — mas o teste não capturaria isso diretamente.
5. **Falso positivo?** Risco moderado. O mock retorna valores artificiais (`[]` e `1234.56`), mas o teste não confirma que esses valores aparecem no DOM. Se a implementação quebrar o uso dos resultados (ex: não exibir o valor de CMV), o teste de AC-019 ainda passa.
6. **Suficientemente objetivo?** Sim, mas a evidência é fraca. O AC exige preservação de comportamento; o teste apenas confirma que as funções são invocadas, não que seus resultados são preservados.
7. **Dependências / contratos existentes?** **Crítico**. `getProdutosEstoqueNegativo()` e `calcularCMV()` (`src/lib/api/estoque.ts`) são contratos existentes. O inventário confirma que não há alteração nesses arquivos. A feature deve garantir que esses contratos permaneçam intactos.

**Classificação: `DEPENDÊNCIA — precisa considerar contrato existente`**  
O AC está correto, mas o teste precisa ser reforçado para comprovar preservação real (ex: verificar que o DOM contém o valor retornado pelo mock, ou que o componente ainda importa de `../lib/api/estoque`). Os contratos existentes não devem ser alterados.

---

## Resumo dos problemas que impedem a implementação

Nenhum arquivo de implementação (`src/ui/`) existe ainda, mas isso é esperado para uma feature em `rascunho`. Os problemas que realmente impedem uma implementação segura são:

1. **AC-013 (teste vazio)**: o teste admite explicitamente que não há convenção observável. Se a implementação começar sem corrigir isso, não haverá como verificar se o Dashboard realmente usa a fundação.
2. **AC-017 (teste vazio)**: o teste de Card não comprova estilos estruturais. Se implementado apenas como `<div>`, a feature não cumpre o objetivo de reduzir repetição de estilos.
3. **AC-018 (teste incompleto)**: `EmptyState` não tem verificação de semântica. Se implementado sem semântica adequada, o AC não é atendido, mas o teste passa.
4. **AC-019 (evidência fraca)**: embora os contratos existam e estejam intactos (`src/lib/api/estoque.ts`), o teste não comprova que os valores são preservados no Dashboard. Se a migração do Dashboard alterar o uso desses contratos (ex: ignorar retorno, alterar tipo de dado), o teste não detecta.

Se a implementação prosseguir sem corrigir esses testes, há risco de **falso positivo generalizado**: a feature pode ser marcada como concluída (`PASS`) sem atender aos ACs reais.

---

## Problemas que podem ser tratados durante a implementação

1. **AC-012**: reforçar o teste para verificar conteúdo semântico dos tokens (nomes, valores significativos) ou uso real por algum componente.
2. **AC-013**: definir uma convenção observável na spec (ex: tokens importados diretamente no arquivo do componente, ou estilos derivados de constantes, ou uso de componentes reutilizáveis no Dashboard) e atualizar o teste para verificar essa convenção no DOM ou no código.
3. **AC-017**: adicionar verificação de estilos estruturais no teste (`expect(container.firstChild).toHaveStyle(...)` ou verificação de classes) para comprovar que `Card` não é apenas um div vazio.
4. **AC-018**: corrigir o teste de `EmptyState` para verificar semântica adequada (ex: `aria-live`, `role="region"` ou outra convenção definida na spec).
5. **AC-019**: reforçar o teste para verificar que os valores retornados pelos mocks aparecem no DOM (ex: verificar que o número do CMV é renderizado).
6. **Contratos existentes**: durante a implementação, preservar `src/lib/api/estoque.ts` sem alterações e manter a importação em `DashboardPage.tsx` intacta.

---

## Pontos que estão corretos e NÃO devem ser alterados

1. **Estrutura da feature**: `spec.md`, `tasks.md` e `inventario.md` estão organizados, completos e coerentes com o escopo definido (`rascunho`, sem alterações globais).
2. **Inventário (`inventario.md`)**: documenta corretamente os problemas existentes (estilos repetidos, falta de tokens, falta de semântica em App.tsx, estados parciais no Dashboard). Nenhum arquivo `src/` foi alterado, como exigido.
3. **Contratos de dados (`src/lib/api/estoque.ts`)**: `getProdutosEstoqueNegativo()` e `calcularCMV()` estão intactos e são referenciados corretamente pela feature.
4. **DashboardPage existente (`src/pages/DashboardPage.tsx`)**: preserva o comportamento atual (grid de 2 colunas, cards com borda, uso de `getProdutosEstoqueNegativo` e `calcularCMV`, mensagens de erro em `crimson`). Nenhuma alteração foi feita.
5. **Restrição de escopo**: fora de escopo estão claramente definidos (Tailwind, Recharts, Lucide, refatoração global, novas camadas `domain/`, alterações em `supabase/migrations/`).
6. **Testes AC-014, AC-015, AC-016**: embora mínimos, atendem ao mínimo exigido pelos ACs como formulados. Não precisam ser alterados, a menos que a spec seja refinada para exigir mais.
7. **Configuração do projeto (`vitest.config.ts`, `package.json`, `AGENTS.md`)**: não há alterações indevidas.
8. **Script de verificação (`scripts/onp-combined-verify.cjs`)**: funciona corretamente, combinando `pgTAP` e `vitest`. Não precisa de alteração para esta auditoria.

---

## Recomendação final

A feature `fundacao-ui` **não está pronta para entrar na implementação segura** sem ajustes nos testes e, principalmente, em `AC-013`. A razão principal é que o teste atual contém uma confissão explícita de insuficiência para `AC-013`, e os testes de `AC-017` e `AC-018` contêm lacunas que permitiriam falsos positivos.

Se a implementação prosseguir com os testes atuais, a evidência de `PASS` não seria confiável para os ACs mencionados.

**Próximos passos sugeridos (sem alterar arquivos):**
- Confirmar se a convenção observável para `AC-013` deve ser definida (ex: estilos derivados de tokens, componentes específicos aplicados) ou se a verificação será feita por inspeção de código fonte.
- Confirmar se `EmptyState` deve ter uma convenção semântica definida (ex: `aria-live="polite"`, `role="status"` ou outra) para corrigir `AC-018`.
- Confirmar se `Card` deve ter estilos mínimos definidos no inventário ou na spec para corrigir `AC-017`.

Nenhum arquivo foi modificado durante esta auditoria.
