# Refinamento dos contratos — feature `fundacao-ui`

Base: auditoria `auditoria-fundacao-ui.md`. Nenhum arquivo alterado. Nenhuma convenção inventada como existente.

---

## AC-012 — Tokens visuais básicos disponíveis

### 1. O que o AC atual exige
Módulos centrais (`colors`, `typography`, `spacing`) com exports reutilizáveis para componentes da UI.

### 2. Por que a evidência atual é insuficiente
O teste (`fundacao-ui.spec.tsx:15-32`) apenas confirma que os módulos existem e possuem pelo menos uma chave. Isso aceita tokens vazios, sem nomes, sem valores semânticos e sem relação com o design existente do projeto.

### 3. Versão proposta (mais objetiva e verificável)
> **AC-012 refinado**: Os módulos `src/ui/tokens/colors.ts`, `src/ui/tokens/typography.ts` e `src/ui/tokens/spacing.ts` devem exportar constantes com nomes e valores verificáveis. Cada módulo deve exportar pelo menos uma constante com valor literal verificável. `colors` deve incluir pelo menos uma cor primária usada no Dashboard atual (ex: equivalente ao `crimson` ou `#e0e0e0` observado no inventário). `spacing` deve incluir pelo menos uma unidade de espaçamento usada no Dashboard (ex: `gap: 16` ou `padding: 16`). `typography` deve incluir pelo menos uma definição de fonte ou tamanho.

### 4. Evidência/teste mínimo
Verificar por importação dinâmica e inspeção de valores:
- `expect(colors.PRIMARY).toBeDefined()` (ou nome equivalente) com valor literal verificável (`toBe("#e0e0e0")` ou similar).
- Verificar que `spacing` contém uma constante com valor numérico (`toBe(16)` ou `toBe("1rem")`).
- Verificar que `typography` contém uma constante com valor verificável.
- Opcional: verificar que `DashboardPage.tsx` importa pelo menos um token desses módulos (evidência de uso real).

### 5. Decisão de arquitetura necessária antes
Definir a convenção de nomeação dos tokens (ex: `COLOR_PRIMARY`, `COLOR_ERROR`, `SPACING_MD`, `FONT_BODY`). Definir se os tokens serão usados como constantes TypeScript, variáveis CSS ou ambos. Confirmar que os valores refletem os padrões existentes no projeto (inventário documenta `crimson`, `#e0e0e0`, `fontFamily: "sans-serif"`, `gap: 16`, `padding: 16`, etc.).

---

## AC-013 — Página representativa utiliza a fundação visual

### 1. O que o AC atual exige
Quando o Dashboard for renderizado, seus elementos visuais principais devem utilizar os padrões definidos pela fundação, preservando comportamento e conteúdo atuais.

### 2. Por que a evidência atual é insuficiente
O teste (`fundacao-ui.spec.tsx:34-52`) apenas renderiza o Dashboard e confirma que contém `/dashboard/i`. O próprio código do teste admite (`linhas 36-38`) que "a fundação ainda não oferece uma convenção observável definida pela especificação". Isso torna impossível diferenciar uma página que usa a fundação de uma que apenas renderiza o texto original.

### 3. Versão proposta (mais objetiva e verificável)
O AC precisa de uma convenção observável. Abaixo estão **opções concretas**, sem afirmar que qualquer uma já existe:

**Opção A — Uso de componentes reutilizáveis no Dashboard (observável no DOM)**
> **AC-013-A**: O `DashboardPage` deve utilizar pelo menos um componente reutilizável da fundação (`Card`, `Loading`, `EmptyState` ou `ErrorMessage`) para exibir conteúdo visual. A verificação será feita por presença dos elementos semânticos desses componentes no DOM renderizado (ex: elemento com `role="status"` ou `role="alert"`, ou estrutura definida pelo componente `Card`).

*Exige da arquitetura*: `DashboardPage` importa e renderiza `Card`, `Loading`, `EmptyState` ou `ErrorMessage`. Os componentes devem ser criados antes ou simultaneamente.

**Opção B — Importação e aplicação de tokens no arquivo do componente (verificável por inspeção de código)**
> **AC-013-B**: O arquivo `src/pages/DashboardPage.tsx` deve importar pelo menos um módulo de tokens (`colors`, `typography` ou `spacing`) e aplicar seus valores diretamente no componente (seja por constante TypeScript no JSX ou por classe/estilo derivado). A verificação será feita por inspeção de importações e referências aos tokens no código fonte do componente.

*Exige da arquitetura*: `DashboardPage` não pode ser apenas um componente estático; precisa consumir tokens. Os testes devem ler o arquivo fonte (não apenas renderizar) para confirmar importação e uso.

**Opção C — Combinação de tokens e componentes (mais robusta)**
> **AC-013-C**: O `DashboardPage` deve utilizar pelo menos um componente reutilizável da fundação para estruturar conteúdo (ex: `Card`) e deve importar pelo menos um módulo de tokens para estilização ou configuração. A evidência será dupla: presença do componente no DOM e importação de tokens no arquivo.

*Exige da arquitetura*: definição de quais componentes são obrigatórios no Dashboard (o inventário sugere `Card` como candidato justificado) e quais tokens são aplicados.

**Recomendação**: a Opção C é a mais alinhada com a intenção da feature (consolidar fundação visual + componentes reutilizáveis), mas exige que a spec decida explicitamente se `DashboardPage` deve ser migrado para usar `Card`, `Loading`, etc., ou apenas tokens. Se a intenção é apenas validar tokens, a Opção B é suficiente. Se a intenção é validar a fundação como um todo (visual + estados + semântica), a Opção C é a mais completa.

Nenhuma dessas convenções existe ainda no código (`DashboardPage.tsx` atual não importa `src/ui/components/` nem `src/ui/tokens/`). A proposta não assume que elas já existem.

### 4. Evidência/teste mínimo (para Opção C, mais completa)
- Verificar que `DashboardPage` importa `Card` (ou outro componente reutilizável) de `../ui/components/Card`.
- Verificar que `DashboardPage` importa pelo menos um token (`../ui/tokens/colors` etc.).
- Renderizar `DashboardPage` com mocks de `getProdutosEstoqueNegativo` e `calcularCMV`.
- Confirmar que o DOM contém a estrutura do componente `Card` (ex: `getByRole` ou `container.querySelector` com estrutura definida pelo componente).
- Confirmar que os valores retornados pelos contratos são exibidos (ex: texto do CMV ou lista de produtos com estoque negativo).

### 5. Decisão de arquitetura necessária antes
- Definir se o Dashboard será migrado para usar `Card` (o inventário justifica isso: dois cards lado a lado com `border`, `borderRadius`, `padding`).
- Definir se o Dashboard usará `Loading` ou `EmptyState` (atualmente o card de estoque negativo exibe uma mensagem positiva quando vazio, o que é um problema documentado no inventário; `EmptyState` seria uma solução).
- Confirmar a convenção de observação: será verificação por importação de código, por DOM, ou por ambos?

---

## AC-017 — Card reutilizável

### 1. O que o AC atual exige
Componente `Card` reutilizável que permita composição de conteúdo sem exigir repetição do mesmo conjunto de estilos estruturais.

### 2. Por que a evidência atual é insuficiente
O teste (`fundacao-ui.spec.tsx:79-91`) apenas confirma que `Card` aceita `children` (`<h4>` e `<p>`). Se `Card` for implementado como `<div>{children}</div>`, o teste passa, mas o AC não é atendido: não há estilos estruturais reutilizáveis, apenas um container genérico.

### 3. Versão proposta (mais objetiva e verificável)
> **AC-017 refinado**: `Card` deve ser um componente que aceita `children` e aplica um conjunto mínimo de estilos estruturais definidos pela fundação. Os estilos mínimos devem incluir: `border`, `borderRadius`, `padding` e uma estrutura semântica básica (ex: `section` ou `div` com `role="region"` opcional). O componente não deve exigir que o usuário repita esses estilos no componente pai.

A versão refinada estabelece o contrato do componente, não apenas sua capacidade de aceitar filhos.

### 4. Evidência/teste mínimo
- Renderizar `<Card><h4>Título</h4><p>Conteúdo</p></Card>`.
- Confirmar que o elemento raiz de `Card` possui `border`, `borderRadius` e `padding` (verificável por `toHaveStyle` ou por inspeção de classes/estilos aplicados).
- Confirmar que o componente pai (`DashboardPage`) não precisa repetir `border`, `borderRadius`, `padding` para os cards (evidência indireta: o componente pai usa `<Card>` e não aplica esses estilos manualmente no elemento pai).
- Confirmar que `Card` aceita `children` sem exigir props obrigatórias além de `children`.

### 5. Decisão de arquitetura necessária antes
Definir o conjunto mínimo de estilos estruturais do `Card`. O inventário (`inventario.md`) documenta no Dashboard atual: `border: "1px solid #e0e0e0"`, `borderRadius: 8`, `padding: 16`, `box-shadow` ausente mas replicável. A spec precisa confirmar se esses são os estilos mínimos obrigatórios ou se há uma convenção diferente. Confirmar também se `Card` aceita props adicionais (`title`, `header`, etc.) ou apenas `children`.

---

## AC-018 — Componentes de interface possuem semântica acessível

### 1. O que o AC atual exige
`Loading`: `role="status"`. `ErrorMessage`: `role="alert"`. `EmptyState`: semântica acessível adequada, sem fixar `role` específico.

### 2. Por que a evidência atual é insuficiente
O teste (`fundacao-ui.spec.tsx:93-108`) verifica `Loading` e `ErrorMessage` corretamente, mas para `EmptyState` apenas confirma que o texto aparece (`getByText`). Isso aceita qualquer componente que renderize uma mensagem, sem nenhuma semântica acessível, violando o requisito do AC.

### 3. Versão proposta (mais objetiva e verificável)
> **AC-018 refinado**:
> - **`Loading`**: deve renderizar um elemento raiz com `role="status"` e `aria-live="polite"` (ou `assertive`, conforme convenção). A mensagem deve ser configurável.
> - **`ErrorMessage`**: deve renderizar um elemento raiz com `role="alert"` e `aria-live="assertive"`. A mensagem deve ser configurável.
> - **`EmptyState`**: deve renderizar uma estrutura semântica adequada ao conteúdo de estado vazio. A convenção mínima é um elemento com `role="region"` e `aria-label` que descreva o propósito (ex: `aria-label="Estado vazio"` ou `aria-label="Nenhum registro encontrado"`). Não deve ser apenas um `<p>` sem marcação semântica. A mensagem deve ser configurável.

Esta versão elimina a ambiguidade: define exatamente o que significa "semântica acessível adequada" para cada componente, sem deixar a interpretação para o implementador.

### 4. Evidência/teste mínimo
- `Loading`: `expect(container.querySelector('[role="status"]')).not.toBeNull()` + verificar `aria-live`.
- `ErrorMessage`: `expect(container.querySelector('[role="alert"]')).not.toBeNull()` + verificar `aria-live="assertive"`.
- `EmptyState`: `expect(container.querySelector('[role="region"]')).not.toBeNull()` (ou outra convenção definida) + `expect(container.querySelector('[aria-label]')).not.toBeNull()` (ou `aria-labelledby` associado ao texto da mensagem).

### 5. Decisão de arquitetura necessária antes
Confirmar a convenção de `aria-live` para `Loading` (`polite` ou `assertive`?). Confirmar se `EmptyState` usará `role="region"` com `aria-label` fixo ou se o `aria-label` será configurável pela prop `message` (o que exigiria que o componente derive `aria-label` da mensagem). Confirmar se `ErrorMessage` precisa de `aria-live="assertive"` explícito ou se `role="alert"` já é suficiente (em muitos casos, `role="alert"` implica `aria-live="assertive"`, mas a convenção explícita é mais verificável).

---

## AC-019 — Dashboard preserva os contratos existentes

### 1. O que o AC atual exige
Dashboard continua utilizando `getProdutosEstoqueNegativo()` e `calcularCMV()`; valores e comportamentos preservados.

### 2. Por que a evidência atual é insuficiente
O teste (`fundacao-ui.spec.tsx:110-132`) faz mock das funções e confirma que foram chamadas (`toHaveBeenCalled()`). Isso comprova que o componente importa e invoca os contratos, mas não comprova que os valores retornados são utilizados pela interface. Se o componente ignorar os resultados (ex: não atualizar `useState`, não renderizar o valor do CMV), o teste ainda passa.

### 3. Versão proposta (mais objetiva e verificável)
> **AC-019 refinado**: O `DashboardPage` deve continuar importando `getProdutosEstoqueNegativo` e `calcularCMV` de `src/lib/api/estoque` (preservação do contrato de importação). Além disso, os valores retornados por esses contratos devem ser utilizados corretamente na interface: `getProdutosEstoqueNegativo()` deve fornecer os dados para exibir a lista de produtos com estoque negativo (se aplicável), e `calcularCMV()` deve fornecer o valor numérico exibido no card de CMV. A evidência será dupla: (a) importação preservada; (b) valores dos contratos presentes no DOM renderizado.

### 4. Evidência/teste mínimo
- Verificar que `DashboardPage` importa de `../lib/api/estoque` (inspeção de código ou verificação de que o componente não importa de outro módulo).
- Renderizar `DashboardPage` com mocks que retornam valores conhecidos: `getProdutosEstoqueNegativo` retorna array com pelo menos um item (`{ id: "p-1", nome: "Produto Teste" }`); `calcularCMV` retorna `1234.56`.
- Confirmar que o DOM contém o texto do produto retornado (`"Produto Teste"`) ou o valor do CMV (`"R$ 1234.56"`), comprovando que os dados não são apenas recebidos, mas utilizados na interface.
- Confirmar que o componente não introduz novas camadas (`domain/`, `repositories/` ou `services/`) para esses contratos (preservação arquitetural).

### 5. Decisão de arquitetura necessária antes
Confirmar que `DashboardPage` continuará consumindo os contratos diretamente (`src/lib/api/estoque`) e não será refatorado para usar uma nova camada intermediária. Confirmar que os valores retornados (`Produto[]` e `number`) continuam sendo compatíveis com o tipo esperado pelo componente (o inventário confirma que `DashboardPage` usa `useState<Produto[]>` e `useState<number | null>`). Confirmar se o teste deve verificar a preservação dos tipos (ex: `expect(typeof cmv).toBe("number")` após renderização) ou apenas a presença dos valores no DOM.

---

## Resumo das decisões pendentes para implementação segura

| AC | Decisão pendente | Impacto se não decidida |
|---|---|---|
| AC-012 | Convenção de nomeação e valores mínimos dos tokens | Tokens podem ser vazios ou sem relação com o projeto |
| AC-013 | Qual opção de convenção observável (A, B ou C) | Não há como verificar se o Dashboard usa a fundação |
| AC-017 | Conjunto mínimo de estilos do `Card` | `Card` pode ser apenas um `<div>` vazio |
| AC-018 | Convenção de semântica para `EmptyState` (`region` + `aria-label`?) | `EmptyState` pode não ter semântica adequada |
| AC-019 | Evidência de preservação dos valores no DOM | Contratos podem ser chamados mas ignorados |

Nenhum arquivo alterado. Nenhuma convenção inventada como existente. Nenhum código implementado.
