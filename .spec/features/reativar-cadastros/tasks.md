# Tasks: Reativar um cadastro desativado

> feature: reativar-cadastros
> spec: `.spec/features/reativar-cadastros/spec.md`

<!--
  Toda tarefa referencia em `Refs:` pelo menos uma história de usuário.
  Uma tarefa só pode virar [concluida] quando os critérios de aceite dela
  tiverem prova PASS registrada por `onp-spec verify`.
  Status: pendente | em-andamento | concluida
-->

A mudança toca duas coisas: um caminho de volta que não existia, e uma falha que já
existia e era silenciosa. Nenhuma altera schema, RLS, RPC ou tipo — o banco já
permite reativar, medido, e o tipo já impede reativar por edição, medido.

## T-067 - Criar ativar* e fazer desativar* detectar a escrita recusada [concluida]

- Refs: US-033, US-035, AC-094
- Arquivos: src/lib/api/clientes.ts, src/lib/api/produtos.ts,
  src/lib/api/profissionais.ts, src/lib/api/servicos.ts
- Descrição: em cada um dos quatro arquivos, criar `ativar*`, simétrico a `desativar*`:
  `update({ ativo: true }).eq("id", id).select().single()`. E alterar `desativar*` para
  usar a mesma cadeia, que hoje é `update(...).eq("id", id)` sem `.select()` — por isso
  a recusa de RLS não gera erro. Traduzir o `PGRST116` resultante com o texto da
  entidade, no mesmo padrão e com a mesma ressalva de D-3 que `update*` já usa: a
  mensagem não diz se o registro existe.
- Verificação: `npx tsc -b`, e teste de API que faça `ativar*` e `desativar*` devolverem
  erro de domínio quando a fronteira recusa, com mensagem que não contenha `PGRST`,
  nome de tabela, UUID nem a palavra do código.

## T-068 - Oferecer a ação de reativar na linha inativa, nas quatro telas [concluida]

- Refs: US-033, US-034, AC-089, AC-091, AC-092, AC-093
- Arquivos: src/pages/ClientesPage.tsx, src/pages/ProdutosPage.tsx,
  src/pages/ProfissionaisPage.tsx, src/pages/ServicosPage.tsx
- Descrição: onde a linha traz `{c.ativo && <Button variant="destructive">Desativar`,
  acrescentar o ramo inverso, `{!c.ativo && <Button variant="primary">Reativar}`, com
  o mesmo encadeamento de `await` e recarga. Em `ProfissionaisPage` a reativação entra
  pelo `handleDesativar` existente, que passa a ser `handleAlternarAtivo`, porque ali
  não há botão "Editar" — `updateProfissional` é órfã, medido — e a linha fica com um
  botão só. Envolver as duas ações em `try/catch` e levar a falha ao `erro` da página,
  que já existe nas quatro (medido) e já renderiza com `onRetry`. Sem `confirm()` no
  reativar, por D-4.
- Verificação: `npx tsc -b`, e teste de interface que, para cada uma das quatro telas,
  confirme que a linha inativa oferece "Reativar" e a ativa não, que reativar some com a
  marca de inativo e traz "Desativar" de volta, e que salvar a edição de um inativo o
  deixa inativo.

## T-069 - Provar que reativar devolve o cadastro ao uso [concluida]

- Refs: US-033, AC-089, AC-090, AC-091, AC-092
- Arquivos: tests/ui/reativar-cadastros.spec.tsx
- Descrição: a prova do efeito, não do mecanismo. Reativar um serviço e um profissional
  e confirmar que os dois **voltam a aparecer** nas seleções de operação nova da comanda
  e da tela de comissão. Sem este critério, uma implementação que só virasse `ativo` para
  `true` passaria mesmo com o filtro da feature anterior quebrado — o filtro é a
  integração que esta feature depende.
- Verificação: `npx vitest run tests/ui/reativar-cadastros.spec.tsx` passando, e com uma
  mutação — tirar o filtro de `ativo` dos serviços em `ComandasPage` tem de fazer
  AC-090 reprovar. **Medido:** reprovou só o primeiro caso dos três de AC-090, o que
  é o comportamento certo: os outros dois dependem do filtro em outra tela.

## T-070 - Provar que a falha de escrita aparece [concluida]

- Refs: US-035, AC-094
- Arquivos: tests/ui/reativar-cadastros.spec.tsx, tests/api/reativar-cadastros.spec.ts
- Descrição: duas metades. Na interface, uma escrita recusada tem de produzir mensagem
  visível, deixar o cadastro como estava na tela, e não derrubar a lista sem explicação.
  Na fronteira, a recusa tem de chegar como erro de domínio, sem detalhe técnico.
- **Verificação: a previsão que esta task fazia estava errada.** Ela dizia que voltar
  `desativar*` para a cadeia sem `.select()` faria o **teste de interface** reprovar.
  Medido: não. O teste de interface **não** detecta (exit 0), porque ele mocka a camada
  da API inteira e portanto nunca executa a cadeia real. Quem detecta é o **teste de
  fronteira**, que monta `update().eq().select().single()` de verdade — exit 1, com
  `TypeError: .single is not a function` em três grupos de casos.

  A lição vale para a próxima: um teste de interface não atesta a forma da consulta. A
  forma é coberta só por um teste que reproduz a cadeia. Por isso T-070 tem as duas
  metades, e por isso a de fronteira não é redundante.
- **Erro meu na execução, e ele quase invalidou a mutação.** A primeira tentativa de
  aplicar a mutação usou um padrão de texto com quebras de linha que não casou com o
  arquivo; a mutação não foi aplicada e os dois testes "passaram". Um verde que vem de
  uma mutação que não rodou não é verde, é ausência de teste. A mutação só valeu
  depois de aplicada por índice de linha e conferida no código mutado.

## T-071 - Regressão e fechamento dos gates [concluida]

- Refs: US-033, US-034, US-035
- Descrição: regressão na suíte de interface e API mais o runner pgTAP, e o fechamento
  dos gates da entrega.
- Verificação: `npx tsc -b` saída 0; suíte completa de vitest saída 0;
  `node scripts/onp-feature-verify.cjs reativar-cadastros` com os seis critérios PASS;
  `node .claude/skills/onp-spec-driven/scripts/onp-spec.mjs audit` sem erro; e
  `node scripts/onp-combined-verify.cjs` (G7) saída 0, com o pgTAP conferido à parte
  para não aceitar um verde silencioso.

## Fora de escopo registrado nas tasks

Nenhuma task cobre gate de perfil, erro de ação em slot dedicado, edição de
`profissionais` ou `config_comissoes`, exclusão física, `config_comissoes` ganhou
`ativo`, `updated_at`, nem filtro em `list*`. A spec lista o mesmo em "Fora de escopo",
com a razão de cada exclusão.
