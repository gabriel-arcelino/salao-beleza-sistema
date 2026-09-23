# Spec: Fundação UI

> feature: fundacao-ui
> status: em-implementacao

## Contexto

A Fase 5 inicia a consolidação da UI/UX sem reescrever o frontend existente.

A aplicação atual utiliza React 18.3 + Vite + TypeScript, sem Tailwind, sem biblioteca externa de componentes, sem Recharts e sem Lucide. As páginas utilizam predominantemente estilos inline e não existe uma fundação visual compartilhada.

Esta feature tem como objetivo estabelecer uma fundação mínima, reutilizável e verificável para a interface, sem transformar o frontend em um design system completo.

A primeira implementação utilizará o Dashboard como página representativa para validar a fundação. A migração das demais páginas ocorrerá em features posteriores.

As regras de negócio existentes, contratos das APIs, RLS, RPCs e estrutura de dados devem permanecer inalterados.

## Histórias

### US-004 — Fundação visual reutilizável

Como usuário do sistema, quero que os elementos visuais utilizados pela aplicação sigam padrões consistentes, para que a interface seja previsível e fácil de compreender.

#### AC-012 — Tokens visuais básicos disponíveis

* **Dado** que a fundação visual está implementada
* **Quando** um componente da interface precisar utilizar cor, tipografia ou espaçamento da fundação
* **Então** esses valores devem estar disponíveis por meio de módulos centrais de tokens (`colors.ts`, `typography.ts`, `spacing.ts`), com constantes de nomes explícitos e valores literais verificáveis para pelo menos uma cor primária, uma unidade de espaçamento e uma definição tipográfica.

Cada constante deve ser reutilizável por componentes da UI. Os valores devem refletir os padrões visuais observados na aplicação atual (ex: `crimson`, `#e0e0e0`, `fontFamily: "sans-serif"`, `gap: 16`, `padding: 16`). A verificação será feita por importação dinâmica e inspeção dos valores exportados, não apenas pela existência dos arquivos.

**Convenção de nomenclatura mínima (para eliminar ambiguidade):**
- `colors.ts`: exportar `COLOR_PRIMARY` com valor `"crimson"` ou `"#e0e0e0"` (refletindo o padrão observado no projeto).
- `spacing.ts`: exportar `SPACING_MD` com valor `16` ou `"16px"` (refletindo `gap: 16`, `padding: 16`).
- `typography.ts`: exportar `FONT_BODY` com valor `"sans-serif"` (refletindo `fontFamily: "sans-serif"`).

#### AC-013 — Página representativa utiliza a fundação visual

* **Dado** que o Dashboard é a página escolhida para validar a fundação
* **Quando** o Dashboard for renderizado
* **Então** seus elementos visuais principais devem utilizar pelo menos um componente reutilizável da fundação visual (`Card`, `Loading`, `EmptyState` ou `ErrorMessage`) para estruturar conteúdo, e esse componente deve consumir os tokens centrais de cores, tipografia ou espaçamento. A evidência deve ser observável no DOM (presença do componente e de seus padrões visuais) e no arquivo fonte (`DashboardPage.tsx` deve importar o componente e pelo menos um módulo de tokens para configuração ou estilização). O comportamento e conteúdo atuais do Dashboard devem ser preservados, incluindo a utilização de `getProdutosEstoqueNegativo()` e `calcularCMV()`.

A convenção de observação adotada é a Opção C: combinação de componente reutilizável no DOM + consumo de tokens no arquivo fonte. Não é necessário que `DashboardPage` aplique todos os tokens diretamente no JSX, mas o componente utilizado (`Card`, `Loading`, etc.) deve ser configurado ou estilizado com base nos módulos centrais.

### US-005 — Estados de interface reutilizáveis

Como usuário do sistema, quero receber feedback visual consistente durante carregamentos, ausência de dados e erros, para compreender o estado atual da aplicação.

#### AC-014 — Estado de loading reutilizável

* **Dado** que uma operação da interface está em andamento
* **Quando** a aplicação precisar informar que está aguardando dados
* **Então** deve existir um componente de loading reutilizável que permita configurar pelo menos sua mensagem exibida.

#### AC-015 — Estado vazio reutilizável

* **Dado** que uma consulta não possui registros para exibir
* **Quando** a interface precisar representar essa situação
* **Então** deve existir um componente de estado vazio reutilizável que permita configurar sua mensagem.

#### AC-016 — Estado de erro reutilizável

* **Dado** que uma operação da interface falhou
* **Quando** a aplicação precisar informar o problema ao usuário
* **Então** deve existir um componente de erro reutilizável que permita configurar a mensagem apresentada.

#### AC-017 — Card reutilizável

* **Dado** que diferentes partes da interface precisam apresentar conteúdo agrupado visualmente
* **Quando** um card for utilizado
* **Então** deve existir um componente `Card` que aceite composição de conteúdo via `children` sem exigir props obrigatórias além de `children`, e que aplique um conjunto mínimo de estilos estruturais reutilizáveis (incluindo `border`, `borderRadius` e `padding`). O componente não deve exigir que o usuário repita esses estilos no componente pai. A evidência deve demonstrar que `Card` é utilizado por pelo menos uma página representativa (Dashboard) e que os estilos estruturais estão presentes no DOM do componente.

### US-006 — Acessibilidade básica e preservação de contratos

Como usuário do sistema, quero que os elementos de interface modificados nesta feature mantenham semântica e acessibilidade básicas, sem alterar o funcionamento existente do sistema.

#### AC-018 — Componentes de interface possuem semântica acessível

* **Dado** que os componentes `Loading`, `EmptyState` e `ErrorMessage` são renderizados
* **Quando** forem utilizados para representar seus respectivos estados
* **Então** cada componente deve fornecer semântica acessível compatível com seu propósito:
  - `Loading`: `role="status"` e `aria-live="polite"`;
  - `ErrorMessage`: `role="alert"` e `aria-live="assertive"`;
  - `EmptyState`: `role="region"` e `aria-label` derivado do conteúdo ou da mensagem configurada (não apenas um elemento de texto sem marcação semântica).

A mensagem configurada deve ser preservada em todos os casos. A verificação deve confirmar a presença desses atributos no DOM de cada componente.

#### AC-019 — Dashboard preserva os contratos existentes

* **Dado** que a fundação visual foi aplicada ao Dashboard
* **Quando** os indicadores forem carregados
* **Então** o Dashboard deve continuar importando `getProdutosEstoqueNegativo()` e `calcularCMV()` de `src/lib/api/estoque` (sem introduzir novas camadas intermediárias como `domain/`, `repositories/` ou `services/`), e os valores retornados por esses contratos devem ser utilizados corretamente na interface. A evidência deve ser dupla: (a) a importação dos contratos está preservada no arquivo fonte do Dashboard; (b) os valores retornados aparecem no DOM renderizado (ex: lista de produtos com estoque negativo e valor numérico do CMV).

## Decisões desta feature

* A fundação inicial será pequena e incremental; não será criado um design system completo.
* Tokens serão centralizados e disponibilizados para uso programático e estilização da interface.
* Componentes reutilizáveis somente serão criados quando houver justificativa de uso real.
* Dashboard será a primeira página utilizada para validar a fundação.
* A implementação deve preservar a arquitetura atual e evitar novas camadas sem necessidade.
* A migração das demais páginas será tratada em features posteriores.

## Fora de escopo

* Tailwind CSS ou qualquer framework CSS externo.
* Recharts ou bibliotecas de gráficos.
* Lucide ou biblioteca externa de ícones.
* Biblioteca externa de componentes.
* Refatoração global das páginas existentes.
* Criação de novas camadas `domain/`, `repositories/` ou `services/` sem necessidade real.
* Alterações em `supabase/migrations/`, RLS, RPCs ou contratos de banco.
* Novas funcionalidades de negócio.
* Implementação completa de responsividade em todas as páginas.
* Auditoria completa de conformidade WCAG 2.1 AA.
* Criação de Button ou FormField como componente obrigatório desta primeira fatia.

## Suposições

| ID      | Suposição                                                                                         | Status     | Resolução                                                              |
| ------- | ------------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------- |
| ASM-005 | Os tokens visuais iniciais não precisam constituir um design system completo.                     | confirmada | A fundação será mínima e incremental.                                  |
| ASM-006 | Uma página representativa é suficiente para validar a primeira versão da fundação.                | confirmada | O Dashboard será utilizado como página representativa.                 |
| ASM-007 | Componentes reutilizáveis devem ter uso real antes de serem introduzidos.                         | confirmada | Card, Loading, EmptyState e ErrorMessage possuem justificativa de uso. |
| ASM-008 | A primeira fatia tratará acessibilidade básica, sem buscar conformidade completa com WCAG 2.1 AA. | confirmada | A conformidade ampla ficará para etapa posterior.                      |

## Perguntas em aberto

| ID    | Pergunta                                                             | Status     | Resposta                                                                                                                                      |
| ----- | -------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Q-007 | Como os tokens visuais serão disponibilizados para uso na interface? | respondida | Serão disponibilizados por constantes TypeScript e variáveis CSS quando necessário.                                                           |
| Q-008 | Quais componentes reutilizáveis fazem parte da primeira fatia?       | respondida | Card, Loading, EmptyState e ErrorMessage. Button e FormField ficam para etapas posteriores quando houver uso real que justifique sua criação. |
