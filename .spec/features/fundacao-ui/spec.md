# Spec: Fundação UI

> feature: fundacao-ui
> status: rascunho

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
* **Quando** uma página ou componente precisar utilizar valores de cor, tipografia ou espaçamento definidos pela fundação
* **Então** esses valores devem estar disponíveis de forma centralizada e reutilizável, sem exigir a repetição dos mesmos valores literais em cada componente.

#### AC-013 — Página representativa utiliza a fundação visual

* **Dado** que o Dashboard é a página escolhida para validar a fundação
* **Quando** o Dashboard for renderizado
* **Então** seus elementos visuais principais devem utilizar os padrões definidos pela fundação, preservando seu comportamento e conteúdo atuais.

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
* **Então** deve existir um componente reutilizável que permita composição de conteúdo sem exigir repetição do mesmo conjunto de estilos estruturais.

### US-006 — Acessibilidade básica e preservação de contratos

Como usuário do sistema, quero que os elementos de interface modificados nesta feature mantenham semântica e acessibilidade básicas, sem alterar o funcionamento existente do sistema.

#### AC-018 — Componentes de interface possuem semântica acessível

* **Dado** que os componentes de interface da fundação são renderizados
* **Quando** forem utilizados para representar estados de loading, vazio ou erro
* **Então** devem fornecer semântica apropriada para que seu estado possa ser identificado por tecnologias assistivas.

#### AC-019 — Dashboard preserva os contratos existentes

* **Dado** que a fundação visual foi aplicada ao Dashboard
* **Quando** os indicadores forem carregados
* **Então** o Dashboard deve continuar utilizando `getProdutosEstoqueNegativo()` e `calcularCMV()` e preservar os valores e comportamentos fornecidos por esses contratos.

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
