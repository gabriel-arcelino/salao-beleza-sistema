# Spec: Fundacao ui

> feature: fundacao-ui
> status: rascunho

## Contexto

A Fase 5 inicia a consolidação da UI/UX sem reescrever o frontend existente. A aplicação atual usa React 18.3 + Vite + TypeScript, sem Tailwind, sem bibliotecas externas de componentes, sem Recharts, sem Lucide. A navegação é por abas em App.tsx; as páginas são componentes funcionais simples com estilos inline. O objetivo desta feature é criar uma fundação mínima e verificável: tokens visuais básicos, poucos componentes reutilizáveis apenas quando justificados, estados de loading/vazio/erro, acessibilidade básica de formulários, e migração de apenas uma página representativa (Dashboard). As regras de negócio existentes (fechamento transacional, RLS, comissão, estoque) são preservadas integralmente.

## Histórias

### US-004 — Como usuário, quero uma fundação visual consistente no Dashboard

Como usuário do sistema, quero que o Dashboard apresente uma aparência consistente (paleta, tipografia, espaçamento, estados de interface) para que a navegação e a leitura dos indicadores sejam confiáveis e previsíveis, sem alterar as regras financeiras ou a estrutura de dados existentes.

#### AC-012 — Dashboard exibe tokens visuais aplicados

- **Dado** a aplicação está carregada e autenticada
- **Quando** o usuário acessa a aba Dashboard
- **Então** a página utiliza cores, tipografia e espaçamento definidos nos tokens visuais básicos, observáveis no elemento raiz do Dashboard

#### AC-013 — Dashboard apresenta estado de loading observável

- **Dado** o usuário está na aba Dashboard e os dados ainda estão sendo carregados
- **Quando** a requisição às APIs de estoque e CMV está em andamento
- **Então** a interface exibe um indicador de carregamento (texto ou elemento visual) antes de mostrar os resultados

#### AC-014 — Dashboard apresenta mensagem de vazio quando não há dados

- **Dado** não existem produtos com estoque negativo
- **Quando** o usuário acessa a aba Dashboard
- **Então** a seção de alerta de estoque exibe uma mensagem informativa de que não há produtos com estoque negativo, em vez de uma lista vazia ou um erro

#### AC-015 — Dashboard apresenta erro de forma observável

- **Dado** ocorre uma falha na consulta ao banco (ex: erro de rede ou RPC)
- **Quando** o usuário está na aba Dashboard
- **Então** a interface exibe uma mensagem de erro visível (ex: p com texto descritivo) sem quebrar o layout

#### AC-016 — Formulários no Dashboard possuem rótulos e atributos de acessibilidade básicos

- **Dado** há campos de entrada no Dashboard (ex: filtros futuros ou configurações simples)
- **Quando** o usuário interage com esses campos
- **Então** cada campo possui um label associado (htmlFor) ou aria-label, e o estado de foco é perceptível visualmente

### US-005 — Como usuário, quero componentes reutilizáveis mínimos para estados de interface

Como usuário e desenvolvedor, quero que os estados de interface (loading, vazio, erro, card básico) sejam representados por componentes simples e reutilizáveis, para evitar duplicação e manter consistência, sem introduzir bibliotecas externas.

#### AC-017 — Componentes de estado são reutilizáveis e observáveis

- **Dado** existe pelo menos um componente para cada estado: Loading, EmptyState, ErrorMessage, Card
- **Quando** esses componentes são utilizados no Dashboard
- **Então** a renderização é observável (elemento DOM presente) e o componente aceita propriedades de texto configuráveis

### US-006 — Como gerente, quero que a migração do Dashboard preserve os contratos existentes

Como gerente, quero que a página do Dashboard continue consumindo as mesmas APIs e apresentando os mesmos indicadores (estoque negativo, CMV), para que as regras financeiras e a auditoria não sejam afetadas pela mudança visual.

#### AC-018 — Dashboard preserva contratos de dados existentes

- **Dado** o Dashboard é carregado após as alterações visuais
- **Quando** o usuário visualiza os indicadores
- **Então** os valores de estoque negativo e CMV correspondem aos mesmos contratos (getProdutosEstoqueNegativo, calcularCMV) e não há alteração nas respostas das APIs

## Fora de escopo

- Tailwind CSS ou qualquer framework CSS externo.
- Recharts ou bibliotecas de gráficos.
- Lucide React ou bibliotecas de ícones.
- Biblioteca externa de componentes.
- Refatoração global das páginas.
- Criação de novas camadas domain/, repositories/, services/ sem necessidade real.
- Alteração em supabase/migrations/, RLS, RPCs ou contratos de banco.
- Novas funcionalidades de negócio (ex: DRE, notificações, agenda, CRM).
- Testes de banco (pgTAP) para esta feature; apenas testes de interface são adicionados.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| ASM-005 | Os tokens visuais básicos não precisam ser definidos como design system completo, apenas como constantes reutilizáveis no escopo inicial. | confirmada | — |
| ASM-006 | A migração de apenas uma página (Dashboard) é suficiente para validar a fundação sem impactar o restante do sistema. | confirmada | — |
| ASM-007 | Os componentes reutilizáveis só serão criados se houver uso real em pelo menos uma página (Dashboard) nesta fase. | confirmada | — |
| ASM-008 | A acessibilidade básica atende ao requisito da Fase 5 sem exigir auditoria de conformidade completa (WCAG 2.1 AA) neste momento. | aberta | — |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| Q-005 | A paleta de cores deve ser definida como variáveis CSS globais, constantes TypeScript ou ambos? | aberta | Ambos: constantes TypeScript para uso programático; variáveis CSS para estilos inline quando necessário. |
| Q-006 | Quais componentes reutilizáveis são estritamente necessários na primeira fatia? | respondida | Card, Button, Loading, Empty, Error e FormField — todos com uso real no Dashboard. |
