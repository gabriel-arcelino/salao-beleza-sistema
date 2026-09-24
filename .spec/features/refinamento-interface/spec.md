# Spec: Refinamento de interface

> feature: refinamento-interface
> status: rascunho

<!--
  Como ler este arquivo (o formato é verificado por `onp-spec audit`):
  - US-xxx = história de usuário · AC-xxx = critério de aceite
    ASM-xxx = suposição · Q-xxx = pergunta em aberto
    São códigos de rastreio: ligam a especificação às tarefas e aos testes.
  - Toda história de usuário precisa de pelo menos um critério de aceite.
  - Todo critério de aceite precisa de Dado/Quando/Então completos.
  - Os códigos são únicos no projeto inteiro (nunca reutilize um número).
  - Suposições e Perguntas em aberto são OBRIGATÓRIAS: se não houver nenhuma,
    escreva "Nenhuma." — mas desconfie: quase toda feature esconde uma.
-->

## Contexto

A auditoria visual estabilizada (`docs/auditoria-visual-estabilizada.md`, 11 telas auditadas, 0 P0, 0 P1, 4 problemas P2 recorrentes, 4 problemas P3 recorrentes) confirmou que a aplicação funciona corretamente como sistema de gestão profissional, mas apresenta inconsistências visuais observáveis que prejudicam a legibilidade, a previsibilidade e a acessibilidade visual básica.

A fundação visual existente (`src/ui/`) já oferece:
- tokens: `colors.ts` (`COLOR_PRIMARY = crimson`, `COLOR_SECONDARY = #e0e0e0`), `typography.ts` (`FONT_BODY = sans-serif`, `FONT_SIZE_BODY = 1rem`), `spacing.ts` (`SPACING_SM = 8`, `SPACING_MD = 16`, `SPACING_LG = 24`);
- componentes reutilizáveis: `Card`, `Loading`, `EmptyState`, `ErrorMessage` (todos com semântica acessível: `role`, `aria-live`).

Esta feature trata exclusivamente a evolução da experiência de interface (hierarquia visual, formulários, estados vazios, ações, feedback visual, consistência de componentes, espaçamento, tipografia, navegação e acessibilidade visual confirmada pela auditoria). Não altera regras de negócio, modelo de dados, RPCs, RLS, autenticação, fluxo financeiro ou comportamento funcional existente.

## Histórias

### US-001 — Formulários com labels explícitos e separação visual

Como usuário do sistema, quero que os campos de formulário apresentem identificação explícita (label associado) e separação visual clara do conteúdo abaixo, para que a interface seja compreensível e previsível.

Evidência: auditoria visual confirmou que inputs de `Login`, `Profissionais`, `Clientes`, `Serviços`, `Produtos` e `Configurar Comissão` dependem apenas de `placeholder`, sem `label` associado (`P2` recorrente). Formulários e listas/conteúdo têm pouca separação visual (`P2`).

#### AC-001 — Todos os inputs de formulário de cadastro possuem label associado

- **Dado** que existem telas com formulário de cadastro (`LoginPage`, `ProfissionaisPage`, `ClientesPage`, `ServicosPage`, `ProdutosPage`, `ConfigComissoesPage`)
- **Quando** esses formulários forem renderizados
- **Então** cada `input` ou `select` utilizado no formulário de cadastro deve ter um elemento `label` associado, com `htmlFor` apontando para o `id` do campo (exceto quando o `label` envolve o campo diretamente com texto descritivo visível, conforme padrão observado em `ConfigComissoesPage`).
- **Evidência observável no DOM:** presença de `<label>` com `htmlFor` (ou `label` aninhado com texto) e `id` correspondente no `input`.
- **Nota complementar:** AC-011 fornece a prova técnica deste AC (`id` + `htmlFor`); AC-001 não se repete em AC-011 — são níveis diferentes (requisito vs. verificação técnica).
- **Verificação:** inspeção do DOM renderizado por página; não é necessário alterar comportamento funcional.

#### AC-002 — Separação visual entre formulário e conteúdo abaixo

- **Dado** que uma página possui formulário e conteúdo/lista abaixo (`ProfissionaisPage`, `ClientesPage`, `ServicosPage`, `ProdutosPage`, `ComandasPage`)
- **Quando** a página for renderizada
- **Então** o formulário deve ser visualmente separado do conteúdo abaixo por pelo menos uma das seguintes propriedades verificáveis no DOM: `marginBottom` igual ou maior que `SPACING_LG` (24), `borderBottom`, `border` com `borderRadius`, ou uso de `Card` para agrupar o conteúdo. A separação não pode depender apenas de `gap` interno do `grid` do formulário.
- **Evidência:** auditoria visual (`P2` recorrente) confirmou ausência de separação clara.
- **Nota:** o AC-002 não pode ser satisfeito apenas pelo `marginBottom` já existente no formulário (`marginBottom: SPACING_LG` aplicado ao elemento `form`). A separação visual deve ser verificável entre o grupo do formulário e o conteúdo abaixo, por exemplo por `borderBottom` no formulário, `Card` envolvendo o conteúdo, ou `marginTop` explícito no conteúdo abaixo.
- **Nota:** não é necessário criar um componente `FormField` nesta feature, mas se for criado, deve respeitar este AC.

### US-002 — Padronização de estados vazios e uso do componente `EmptyState`

Como usuário do sistema, quero receber uma mensagem explícita e consistente quando uma lista ou relatório não possui registros, para compreender que o estado é de ausência de dados e não de erro.

Evidência: auditoria visual (`P2`) confirmou que `ClientesPage`, `ComandasPage` e `ConfigComissoesPage` não possuem mensagem de vazio explícita; `RelatorioEstoquePage` tem mensagem (`Nenhum produto com estoque negativo`), mas sem destaque visual (`P2`). O componente `EmptyState` existe (`src/ui/components/EmptyState.tsx`) mas não é utilizado de forma padronizada.

#### AC-003 — Componentes `EmptyState` utilizados em listas vazias

- **Dado** que uma página possui uma lista de registros que pode estar vazia (`ClientesPage`, `ComandasPage`, `ConfigComissoesPage`, `ProfissionaisPage`, `ServicosPage`, `ProdutosPage`)
- **Quando** a lista estiver vazia (`clientes.length === 0`, `configs.length === 0`, etc.)
- **Então** a interface deve renderizar o componente `EmptyState` (importado de `src/ui/components/EmptyState.tsx`) com uma mensagem configurada, em vez de uma `ul` vazia ou texto simples sem componente.
- **Evidência observável no DOM:** presença do componente com `role="region"` e `aria-label` derivado da mensagem configurada.
- **Nota:** `RelatorioEstoquePage` já exibe mensagem de vazio; deve ser convertida para `EmptyState` com mensagem configurada.

#### AC-004 — Mensagem de vazio configurável no componente

- **Dado** que `EmptyState` é utilizado
- **Quando** a página renderiza o componente
- **Então** a mensagem deve ser configurada via prop `message` (ex: `"Nenhum cliente cadastrado."`, `"Nenhum registro de estoque negativo."`) e deve ser visível no conteúdo do componente no DOM.

### US-003 — Destaque visual consistente para ações principais e destrutivas

Como usuário do sistema, quero distinguir visualmente ações principais (`Cadastrar`, `Salvar`, `Filtrar`) de ações neutras/destrutivas (`Desativar`, `Cancelar`, `Zerar`), para evitar erros operacionais e melhorar a eficiência.

Evidência: auditoria visual (`P3` recorrente) confirmou que botões de ação principal (`Cadastrar`, `Salvar`, `Filtrar`) não possuem destaque visual consistente (mesmo estilo de todos os botões). Botões destrutivos (`Desativar`, `Cancelar`) usam o mesmo tratamento visual de ações neutras (`P2`).

#### AC-005 — Botões de ação primária possuem variante visual definida

- **Dado** que existe um botão de ação primária (`Cadastrar cliente`, `Cadastrar produto`, `Cadastrar serviço`, `Salvar configuração`, `Filtrar` nos relatórios, `Abrir comanda`, `Fechar comanda`)
- **Quando** o botão for renderizado
- **Então** o botão deve possuir uma variante visual distinta do botão neutro, verificável no DOM, utilizando pelo menos uma das propriedades: `backgroundColor: COLOR_PRIMARY` (`crimson`), `fontWeight: "bold"` com `backgroundColor` distinta, ou `border` com `COLOR_PRIMARY`. A variante não pode ser apenas `fontWeight: "bold"` (que já é usada para aba ativa na navegação).
- **Evidência observável:** variante visual distinta verificável no DOM (por componente reutilizável `Button` com prop `variant`, ou por estilo aplicado ao elemento), sem exigir `style` inline obrigatório.

#### AC-006 — Botões de ação destrutiva possuem variante visual distinta

- **Dado** que existe um botão destrutivo (`Desativar`, `Cancelar` em `ClientesPage` e `ComandasPage`, ou qualquer ação de exclusão/desativação)
- **Quando** o botão for renderizado
- **Então** o botão deve possuir variante visual distinta do neutro e distinta da primária, verificável no DOM, utilizando pelo menos uma das propriedades: `backgroundColor: "crimson"` (se primário for outra cor), `border: "1px solid crimson"` com `color: "crimson"`, ou `color: "crimson"` com `fontWeight: "bold"`. A variante não pode ser idêntica à neutra.
- **Nota:** variante visual distinta do neutro e da primária, verificável no DOM (por componente `Button` com `variant="destructive"`, ou por propriedades aplicadas), sem exigir `style` inline obrigatório. Se o componente `Button` for criado, deve respeitar este AC.

### US-004 — Hierarquia tipográfica e composição visual

Como usuário do sistema, quero que títulos de página e seções sejam distinguíveis por tamanho e composição, para que a estrutura da interface seja imediatamente compreensível.

Evidência: auditoria visual (`P3` recorrente) confirmou que a tipografia usa `sans-serif` para tudo e `1rem` para corpo, sem variação de tamanho entre título de página (`h1`/`h2`) e títulos de cards (`P2`). A composição tem pouca diferenciação (`P3`).

#### AC-007 — Título principal da página utiliza tamanho e família tipográfica definidos

- **Dado** que existe uma página com título principal (`h1` ou `h2` no topo da seção, como `DashboardPage`, `ClientesPage`, etc.)
- **Quando** a página é renderizada
- **Então** o título principal deve utilizar explicitamente `FONT_HEADING` (família tipográfica de título) e `FONT_SIZE_HEADING` (`"1.5rem"`), verificável no DOM ou no código fonte. Não deve depender apenas do CSS padrão do navegador (`fontSize` padrão do `h1`/`h2`). A constante `FONT_SIZE_HEADING` deve ser definida em `src/ui/tokens/typography.ts` e utilizada no componente.
- **Evidência observável:** presença de `fontFamily: FONT_HEADING` e `fontSize: FONT_SIZE_HEADING` (ou equivalente direto `"1.5rem"` se a constante ainda não estiver integrada) no título renderizado.

#### AC-008 — Seções/formulário e conteúdo possuem separação visual verificável

- **Dado** que uma página contém múltiplas seções (formulário, lista, resultados)
- **Quando** a página é renderizada
- **Então** cada seção deve ser estruturada explicitamente (por exemplo, agrupada em `div` com `role="group"` ou `section` com `aria-label`), e separada visualmente por pelo menos uma das propriedades verificáveis no DOM: `marginTop` ou `marginBottom` igual ou maior que `SPACING_MD` (16), uso de `Card` (`border`, `borderRadius`, `padding`), ou `borderBottom`. A separação não pode ser apenas `gap` interno de um `grid` de formulário.
- **Nota:** a estrutura explícita de grupos (`group` ou `section`) é obrigatória para identificação por tecnologias assistivas (AC-018).
- **Evidência:** auditoria confirmou pouca diferenciação (`P3`).

### US-005 — Consistência de navegação e indicadores de aba ativa

Como usuário do sistema, quero que a navegação indique claramente qual aba está ativa, para que eu saiba em qual contexto estou operando.

Evidência: auditoria (`P3`) confirmou que a aba ativa é indicada apenas por `fontWeight: bold`, sem indicador visual adicional nem semântica `aria-current`.

#### AC-009 — Aba ativa possui indicador visual e semântico verificável

- **Dado** que existe a navegação com abas (`App.tsx`)
- **Quando** uma aba está ativa
- **Então** o botão da aba ativa deve possuir no DOM: `fontWeight: "bold"` (preservado), `aria-current="page"` (ou `aria-selected="true"` se aplicável), e pelo menos um indicador visual adicional verificável: `borderBottom` com `COLOR_PRIMARY`, `backgroundColor` distinta de `#e0e0e0`, ou `paddingBottom` com `borderBottom`. A semântica `aria-current` é obrigatória.
- **Nota:** esta mudança é visual e de acessibilidade, não altera o comportamento funcional de navegação.

### US-006 — Acessibilidade visual e consistência dos componentes de estado

Como usuário do sistema, incluindo usuários que utilizam tecnologias assistivas, quero que os componentes de interface mantenham semântica acessível e que as melhorias visuais não removam esses atributos.

Evidência: auditoria (`P2`/`P3`) confirmou que `Loading` (`role="status"`, `aria-live="polite"`), `ErrorMessage` (`role="alert"`, `aria-live="assertive"`) e `EmptyState` (`role="region"`, `aria-label`) possuem semântica correta (`AC-018` atendido). No entanto, a aplicação não utiliza `EmptyState` de forma padronizada. A navegação não possui `aria-current`.

#### AC-010 — Componentes de interface mantêm semântica acessível

- **Dado** que `Loading`, `EmptyState` e `ErrorMessage` são utilizados
- **Quando** são renderizados
- **Então** cada componente deve manter no DOM: `Loading`: `role="status"` e `aria-live="polite"`; `EmptyState`: `role="region"` e `aria-label` derivado da mensagem; `ErrorMessage`: `role="alert"` e `aria-live="assertive"`. Nenhum desses atributos pode ser removido pelas mudanças visuais desta feature.
- **Evidência:** `docs/auditoria-visual-estabilizada.md` confirma presença desses atributos; `src/ui/components/*.tsx` confirma a implementação.

#### AC-011 — Inputs com label associado possuem `id` e `htmlFor` correspondentes

- **Dado** que um input possui `label` associado
- **Quando** renderizado
- **Então** o `input` deve ter um `id` único e o `label` deve ter `htmlFor` apontando para esse `id`. Se o `label` envolve o `input`, o texto descritivo deve ser visível no DOM.
- **Nota:** AC-001 e AC-011 são complementares: AC-001 exige que o `label` esteja associado; AC-011 exige a prova técnica (`id` + `htmlFor` ou aninhamento visível). Não há redundância entre eles: AC-001 é o requisito funcional; AC-011 é a verificação de implementação.
- **Nota:** não é necessário alterar `supabase/migrations/`, `RLS`, `RPCs`, autenticação ou contratos de banco.

## Decisões desta feature

- A evolução é incremental; não será criado um design system completo. A fundação existente (`src/ui/`) será aproveitada.
- Nenhum componente obrigatório (`Button`, `FormField`) será criado a menos que justificado pelo uso real em pelo menos uma página. Os AC são verificáveis por inspeção do DOM e do código fonte, sem exigir componente específico.
- Os tokens existentes (`COLOR_PRIMARY`, `COLOR_SECONDARY`, `FONT_BODY`, `FONT_SIZE_BODY`, `SPACING_SM`, `SPACING_MD`, `SPACING_LG`) são suficientes para os AC desta feature; novos tokens só devem ser adicionados quando justificados por requisitos específicos desta feature, mas a SPEC não exige criação de novos tokens a menos que seja estritamente necessário para a verificação dos AC.
- Nenhuma alteração em regras de negócio, APIs, RLS ou autenticação.
- Nenhum redesign puramente estético (preferências de cor ou forma não sustentadas pela auditoria não são requisitos).

## Fora de escopo

- Redesign estético não sustentado pela auditoria (preferências de cor, fontes, sombras, animações, ilustrações).
- Criação de um design system completo (tokens adicionais só se necessários para AC; sem biblioteca externa).
- Alteração de comportamento funcional existente (apenas apresentação visual).
- Alteração de contratos de dados, RPCs, migrações, RLS ou autenticação.
- Implementação completa de responsividade (não há evidência de problema na auditoria).
- Auditoria completa de conformidade WCAG 2.1 AA (apenas acessibilidade visual confirmada pela auditoria).
- Criação de novos componentes (`Button`, `FormField`) sem justificativa de uso real em pelo menos uma página e sem referência direta aos AC.
- Alteração de `src/ui/components/EmptyState.tsx`, `Loading.tsx`, `ErrorMessage.tsx` ou `Card.tsx` (apenas uso padronizado).
- Criação de testes de implementação (esta feature é exclusivamente de especificação; testes serão definidos em etapa posterior).

## Evidência/origem de cada requisito

| Requisito | Evidência na auditoria | Fonte no código atual |
|---|---|---|
| AC-001 (`label` associado) | `P2` recorrente: inputs sem `label` (`Login`, `Profissionais`, `Clientes`, `Serviços`, `Produtos`) | `LoginPage.tsx` (placeholder sem label); `ClientesPage.tsx` (placeholder sem label) |
| AC-002 (separação visual) | `P2` recorrente: falta separação entre formulário e conteúdo | `ProfissionaisPage.tsx`, `ClientesPage.tsx` (formulário e lista com `marginBottom: 24` apenas no formulário) |
| AC-003 (`EmptyState`) | `P2`: `EmptyState` subutilizado; listas vazias sem mensagem (`ClientesPage`, `ComandasPage`, `ConfigComissoesPage`) | `EmptyState.tsx` existe; `ClientesPage.tsx` usa `ul` vazio sem `EmptyState` |
| AC-004 (mensagem configurável) | `P2`: `RelatorioEstoquePage` tem mensagem mas sem destaque; `EmptyState` aceita `message` prop | `EmptyState.tsx` (`message?: string`) |
| AC-005 (ação primária) | `P3`: botões `Cadastrar` sem destaque visual consistente; todos com mesmo estilo neutro | `ClientesPage.tsx` (`<button type="submit">Cadastrar cliente</button>` sem variante) |
| AC-006 (ação destrutiva) | `P2`: `Desativar`/`Cancelar` com mesmo estilo neutro | `ClientesPage.tsx` (`<button>Desativar</button>`); `ComandasPage.tsx` (`<button>Cancelar</button>`) |
| AC-007 (tipografia) | `P3`: sem variação entre título de página e corpo; `P2`: títulos de cards menores que necessário | `App.tsx` (`fontSize` não diferenciado); `DashboardPage.tsx` (`h2` sem `fontSize` maior) |
| AC-008 (separação de seções) | `P3`: pouca diferenciação entre seções; `P2`: cards subutilizados | `DashboardPage.tsx` (cards utilizados, mas outras páginas sem `Card`) |
| AC-009 (navegação) | `P3`: aba ativa apenas por `fontWeight: bold`; sem `aria-current` | `App.tsx` (`style={{ fontWeight: abaAtiva === a.id ? "bold" : "normal" }}` sem `aria-current`) |
| AC-010 (semântica) | `P2`/`P3`: `Loading`, `ErrorMessage`, `EmptyState` possuem semântica (`AC-018` atendido) | `Loading.tsx`, `ErrorMessage.tsx`, `EmptyState.tsx` |
| AC-011 (`id` e `htmlFor`) | `P2`: `label` ausente ou sem `htmlFor` explícito nos formulários | `LoginPage.tsx` (sem `label`), `ConfigComissoesPage.tsx` (label com `htmlFor` implícito via aninhamento) |

## Impacto técnico

- Nenhuma alteração em contratos de API, RPCs, RLS ou banco de dados.
- Nenhuma alteração em `supabase/migrations/`.
- Nenhuma alteração em `src/lib/api/`.
- Nenhuma alteração no comportamento funcional das páginas (apenas estilos e estrutura de apresentação).
- Se novos tokens forem necessários para diferenciar variantes de botão ou títulos, eles devem ser adicionados em `src/ui/tokens/` (ex: `FONT_SIZE_HEADING`), mas a SPEC não exige criação de novos tokens a menos que estritamente necessários para a verificação dos AC.
- Os componentes existentes (`Card`, `EmptyState`, `Loading`, `ErrorMessage`) são reutilizados; se novos componentes forem criados (`Button`, `FormField`), devem ser justificados pelo uso real em pelo menos uma página e referenciados nos AC correspondentes.

## Critérios de acessibilidade

- `AC-001`: `label` associado (`htmlFor` ou aninhamento visível) é requisito básico de acessibilidade para inputs.
- `AC-009`: `aria-current="page"` é requisito básico para navegação.
- `AC-010`: semântica (`role`, `aria-live`) dos componentes de estado deve ser preservada, conforme `AC-018` da feature `fundacao-ui`.
- `AC-011`: correspondência `id`/`htmlFor` é requisito básico para leitores de tela.
- Esta feature não busca conformidade completa com WCAG 2.1 AA, apenas corrige os pontos confirmados pela auditoria visual.

## Estratégia de testes

- Nenhum teste de implementação é criado nesta etapa (especificação apenas).
- Os AC são projetados para verificação automática quando implementados:
  - **Testes de componente (Vitest + Testing Library):** `AC-001` (label associado), `AC-003` (EmptyState renderizado), `AC-004` (prop `message`), `AC-005` (estilo de botão primário no DOM), `AC-006` (estilo de botão destrutivo), `AC-009` (`aria-current` no DOM), `AC-010` (`role` e `aria-live`).
  - **Testes visuais/DOM (Playwright/inspeção):** `AC-002` (separação visual — `marginBottom` ou `borderBottom`), `AC-007` (`fontSize` do título), `AC-008` (separação de seções — `marginTop` ou `Card`), `AC-011` (`id` + `htmlFor`).
- A verificação final (`onp-spec verify`) deve confirmar que cada AC tem evidência observável no código ou no DOM, sem alterar testes pgTAP existentes.

- **Separação entre prova mecânica e validação visual humana:**
  - **Prova mecânica (automática):** verificação por `onp-spec audit`, inspeção do DOM (presença/ausência de `label`, `aria-current`, `role`, `borderBottom`, `fontFamily`, `fontSize`), testes de componente (Vitest) e verificação estrutural (`Button.tsx`, `typography.ts`).
  - **Validação visual humana:** avaliação subjetiva de consistência visual (harmonia entre variantes de botão, legibilidade de títulos, separação entre seções), realizada por inspeção visual manual (Playwright screenshots ou revisão humana). A SPEC não exige que a validação visual humana esteja automatizada; ela complementa a prova mecânica.

## Dependências da `fundacao-ui`

- `src/ui/tokens/colors.ts`: `COLOR_PRIMARY`, `COLOR_SECONDARY`.
- `src/ui/tokens/typography.ts`: `FONT_BODY`, `FONT_SIZE_BODY`.
- `src/ui/tokens/spacing.ts`: `SPACING_SM`, `SPACING_MD`, `SPACING_LG`.
- `src/ui/components/EmptyState.tsx`: componente reutilizável para estados vazios.
- `src/ui/components/Card.tsx`: componente reutilizável para agrupamento visual.
- `src/ui/components/Loading.tsx`: componente reutilizável para loading.
- `src/ui/components/ErrorMessage.tsx`: componente reutilizável para erro.
- Esta feature depende diretamente da fundação visual estabelecida (`fundacao-ui`) e não pode ser implementada sem que esses módulos estejam disponíveis e preservados.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| ASM-001 | A evolução visual é incremental e não exige redesign completo. | confirmada | Os AC são verificáveis por propriedades observáveis no DOM e no código. |
| ASM-002 | Os tokens existentes são suficientes para os AC desta feature. | confirmada | Não há AC que exija tokens além de `COLOR_PRIMARY`, `COLOR_SECONDARY`, `FONT_BODY`, `FONT_SIZE_BODY`, `SPACING_SM`, `SPACING_MD`, `SPACING_LG`. Se necessário, tokens adicionais podem ser introduzidos, mas não são obrigatórios. |

## Perguntas em aberto

Nenhuma pergunta permanece aberta. Todas as perguntas (Q-001, Q-002, Q-003) foram resolvidas conforme a revisão conceitual.

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| Q-001 | A variante visual de botão primário deve ser implementada por componente reutilizável (`Button`) ou por estilos inline nas páginas? | respondida | Decisão: componente reutilizável `Button` (`primary`/`destructive`/`neutral`). Justificativa em pelo menos uma página. |
| Q-002 | A navegação deve receber indicador visual adicional além de `fontWeight: bold` e `aria-current`? Se sim, qual? | respondida | Decisão: `borderBottom` com `COLOR_PRIMARY` (`crimson`) + `aria-current="page"`. |
| Q-003 | A tipografia de título (`h2`) deve ser definida por constante (`FONT_SIZE_HEADING`) ou pode ser definida diretamente no estilo inline? | respondida | Decisão: criar constante `FONT_SIZE_HEADING = "1.5rem"` em `src/ui/tokens/typography.ts`. |

## Resumo executivo (para auditoria)

- Feature: `refinamento-interface`.
- Escopo: evolução visual/UX baseada exclusivamente nos achados confirmados pela auditoria visual estabilizada (`docs/auditoria-visual-estabilizada.md`).
- Nenhuma alteração funcional, arquitetural ou de dados.
- Requisitos: 6 histórias de usuário (`US-001` a `US-006`), 11 AC (`AC-001` a `AC-011`).
- Nenhum componente obrigatório criado (apenas uso padronizado dos existentes); se `Button` ou `FormField` forem criados, devem ser justificados.
- Nenhum arquivo alterado nesta etapa (especificação exclusiva).
