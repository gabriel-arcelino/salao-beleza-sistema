# Spec: Recuperação de carga

> feature: recuperacao-carga
> status: implementada

<!--
  Como ler este arquivo (o formato é verificado por `onp-spec audit`):
  - US-xxx = história de usuário · AC-xxx = critério de aceite
    ASM-xxx = suposição · Q-xxx = pergunta em aberto
    São códigos de rastreio: ligam a especificação às tarefas e aos testes.
  - Toda história de usuário precisa de pelo menos um critério de aceite.
  - Todo critério precisa de Dado/Quando/Então completos.
  - Os códigos são únicos no projeto inteiro (nunca reutilize um número).
-->

## Contexto

A validação visual da feature `refinamento-interface` encontrou o Dashboard travado
depois de uma falha no carregamento: a tela mostrava a mensagem de erro e o indicador
"Carregando..." não voltava, e só se recuperava ao trocar de aba e voltar
(`docs/screenshots/validacao-visual/`, primeira captura da série).

A causa raiz está no código e é reproduzível: **cada página carrega os dados uma única
vez**, no `useEffect` de montagem, e não existe nenhuma forma de pedir uma nova tentativa.
Quando a requisição falha, o estado de erro é terminal — a página só volta a funcionar
por uma montagem nova. Uma falha passageira de rede (token expirado, requisição abortada,
resposta 5xx) transforma-se em tela morta.

**O que esta feature não é:** a causa do `401 JWT issued at future` observado naquela
captura **não foi estabelecida**. Medições posteriores deram 8 logins frios sem nenhuma
falha, token sempre presente na primeira requisição e relógios de host, Postgres e auth
concordando ao segundo. Nenhuma hipótese sobreviveu à verificação. Especificar uma
correção para uma causa não identificada seria chute, então o `401` fica registrado como
observação aberta (Q-015) e esta feature resolve o problema **com causa raiz
identificada**: a ausência de recuperação.

## Histórias

### US-019 — Recuperação após falha transitória de carga

Como usuário do sistema, quero pedir uma nova tentativa quando o carregamento de uma tela
falhar, para que uma falha passageira de rede não me deixe preso numa tela morta.

Evidência: a primeira captura da validação visual registrou `HTTP 401` nos dois
requisiçōes do Dashboard e a tela permaneceu em erro; navegar para outra aba e voltar
funcionou em 2 de 2 tentativas, o que indica falha transitória e não ausência de acesso.

#### AC-042 — A falha de carga oferece ação de tentar novamente

- **Dado** que uma página carregou dados e a requisição falhou
- **Quando** a página é renderizada nesse estado de erro
- **Então** a mensagem de erro deve vir acompanhada de um controle "Tentar novamente" que,
  ao ser acionado, executa novamente a mesma carga que tinha falhado
- **Evidência observável:** presença do controle na tela e aumento do número de chamadas à
  API de carga quando ele é acionado.

#### AC-043 — Uma nova tentativa bem-sucedida limpa o erro e apresenta os dados

- **Dado** que a página está exibindo uma falha de carga
- **Quando** o usuário aciona "Tentar novamente" e a carga agora é bem-sucedida
- **Então** a mensagem de erro deve desaparecer da tela e os dados carregados devem aparecer
- **Evidência observável:** ausência da mensagem de erro e presença do conteúdo devolvido
  pela segunda chamada.

#### AC-044 — Toda página que carrega dados oferece a recuperação

- **Dado** as páginas que carregam dados do Supabase e podem falhar na carga
- **Quando** a carga inicial de qualquer delas falha
- **Então** todas devem exibir a ação de tentar novamente, e não apenas uma amostra
- **Cobertura:** Dashboard, Clientes, Profissionais, Serviços, Produtos, Configuração de
  Comissão, Comandas, Relatório de Estoque, Fechamento de Caixa e Comissão por Profissional.

#### AC-045 — A adição da ação não regride a semântica do componente de erro

- **Dado** que `ErrorMessage` é usado com e sem a nova ação de recuperação
- **Quando** o componente é renderizado nas duas formas
- **Então** deve manter `role="alert"`, `aria-live="assertive"` e a mensagem original no DOM
- **Nota:** não regride `AC-040` e `AC-018` de `fundacao-ui` e `refinamento-interface`.

## Decisões desta feature

- **Mecanismo: botão manual "Tentar novamente".** O usuário vê o erro e decide. Não haverá
  refetch automático ao regainar foco nem retry com backoff (decisão do dono do produto).
- **`ErrorMessage` ganha uma prop opcional `onRetry`.** A assinatura existente é preservada:
  sem a prop, o componente renderiza exatamente como antes. A ação é opcional para não
  quebrar usos sem recuperação.
- **As páginas passam a renderizar o erro por `ErrorMessage`.** Hoje apenas o Dashboard usa
  o componente; as outras dez renderizam um `<p style={{ color: "crimson" }}>`. Um único
  componente dá um mecanismo de recuperação só, sem duplicar botão em onze arquivos, e
  uniformiza a semântica já validada por `AC-040`.

## Fora de escopo

- **A causa do `401 JWT issued at future`.** Não reproduzida em 8 execuções; sem correção
  especulativa. Registrada em Q-015.
- **Refetch automático ao recuperar o foco da aba ou ao renovar o token** — decidedo fora
  desta feature por exigir sincronização de estado adicional.
- **Retry automático com backoff**, invisível ao usuário.
- Alterações em regras de negócio, modelo de dados, RPCs, RLS, migrações ou autenticação.
- Alterar `Loading` e `EmptyState`.
- Indicator de progresso na nova tentativa: a carga original já expõe estado de
  carregamento nas páginas que o possuem.

## Evidência/origem de cada requisito

| Requisito | Evidência | Situação atual no código |
|---|---|---|
| AC-042 | Captura da validação visual com o Dashboard travado | Nenhuma página tem ação de recuperação |
| AC-043 | Navegar para fora e voltar funcionou (2 de 2) | Estado de erro é terminal até remontar |
| AC-044 | Leitura das 11 páginas | Só o Dashboard usa `ErrorMessage`; as outras usam `<p>` cru |
| AC-045 | `AC-018`/`AC-040` já exigem `role="alert"` e `aria-live="assertive"` | Componente será estendido, não reescrito |

## Critérios de acessibilidade

- O controle de recuperação precisa ser alcançável por teclado e ter nome acessível
  ("Tentar novamente"), por ser a única forma de escapar do estado de erro.
- `ErrorMessage` mantém `role="alert"` e `aria-live="assertive"` — `AC-045`.

## Estratégia de testes

- **Testes de componente (Vitest + Testing Library):** `AC-042` (controle presente e
  reexecuta a carga), `AC-043` (erro some e dados aparecem), `AC-044` (cobertura das 11
  páginas), `AC-045` (semântica preservada com e sem `onRetry`).
- Um teste pode comprovar vários critérios quando o título trouxer todas as tags
  `@spec:AC-xxx` e evidenciar cada requisito.
- Nenhuma mudança nas páginas pode alterar a quantidade de chamadas de API além da
  esperada: o teste de `AC-042` conta as chamadas.

## Impacto técnico

- Nenhuma alteração em contratos de API, RPCs, RLS ou banco de dados.
- Nenhuma alteração em `supabase/migrations/`.
- Nenhuma alteração em `src/lib/api/` — as funções de carga mantêm assinatura e
  comportamento.
- `ErrorMessage` recebe uma prop **opcional**; o contrato existente permanece válido.

## Dependências

- `src/ui/components/ErrorMessage.tsx` (`role="alert"`, `aria-live="assertive"`).
- `src/ui/components/Button.tsx` — a ação de recuperação reaproveita o componente
  existente em vez de criar um `<button>` cru.
- `AC-040` e `AC-018`: a semântica do componente de erro não pode regredir.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| ASM-013 | A falha de carga observada é transitória: a página volta a funcionar quando a carga é refeita. | confirmada | Navegar para outra aba e voltar recuperou a tela em 2 de 2 tentativas, sem nenhuma alteração de código. |
| ASM-014 | Uma ação de recuperação manual é suficiente; não é preciso recovery automático para o usuário sair do estado de erro. | confirmada | Decisão do dono do produto: botão "Tentar novamente". Refetch automático e backoff ficam fora de escopo. |

## Perguntas em aberto

Nenhuma pergunta bloqueia a execução.

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| Q-015 | Qual é a causa do `401 JWT issued at future` observado na primeira captura da validação visual? | respondida | **A causa NÃO foi determinada.** A investigação foi feita e o resultado é "evidência insuficiente": o erro ocorreu uma única vez, na primeira carga da app em toda a série de capturas. Não reproduziu em 11 execuções posteriores (2 capturas completas, 8 logins frios em contexto novo, 1 medição de headers). O que foi refutado por medição: (a) token ausente na primeira requisição — está sempre presente; (b) desvio de relógio entre host, Postgres e auth — 0 s nos três. O que **não** puderam ser observados: os headers da requisição que falhou, porque o script daquela captura não os coletava. Para fechar a causa seria preciso log do GoTrue no instante da falha ou observação do usuário em uso real (navegador, horário, ação anterior). **A resposta aqui é "não sabe-se", não "resolvido":** o risco residual está registrado em `docs/relatorio-execucao-sessao-onp.md` §11.1 e §12.6, e nenhuma correção especulativa foi feita. O que esta feature resolve é a consequência — uma falha de carga, qualquer que seja a causa, deixa de ser terminal. |

## Resumo executivo (para auditoria)

- Feature: `recuperacao-carga`. Escopo: resiliência de carregamento após falha.
- 1 história (`US-019`), 4 critérios (`AC-042` a `AC-045`).
- Mecanismo: prop opcional `onRetry` em `ErrorMessage` + ação "Tentar novamente" nas 11
  páginas que carregam dados.
- Não altera regras de negócio, banco, RPCs, RLS ou autenticação.
- A causa do `401` permanece aberta (Q-015) e não é objeto de correção aqui.
