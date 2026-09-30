# Tasks: Edição de clientes e produtos

> feature: edicao-clientes-produtos
> spec: `.spec/features/edicao-clientes-produtos/spec.md`

Dez tasks, quatro etapas. A investigação de fronteira já está concluída e registrada
na spec; ela não aparece como task. Cada task traz a verificação embutida.

**Todas as dez executadas e verificadas.** As mutações exigidas por T-053 e T-058 foram
executadas: remover a tradução de erro faz 6 asserções de tradução de API falharem, e
substituir a leitura ao vivo do percentual por congelamento em `fn_fechar_comanda` faz o
AC-075 reprovar. Os controles de cada mutação permanecem verdes, o que prova que a edição
ocorreu de fato.

<!--
  Toda tarefa referencia em `Refs:` pelo menos uma história de usuário.
  Uma tarefa só pode virar [concluida] quando os critérios de aceite dela
  tiverem prova PASS registrada por `onp-spec verify`.
  Status: pendente | em-andamento | concluida
-->

## 1. API: tradução de erro nas duas funções

## T-052 - Traduzir a falha de gravação em updateCliente e updateProduto [concluida]

- Refs: US-027, US-028
- Arquivos: src/lib/api/clientes.ts, src/lib/api/produtos.ts
- Descrição: usar os `code` medidos (`PGRST116` e `23502`) e sem inventar `42501`, que a
  medição provou não ocorrer. Assinaturas intactas, e a exclusão de
  `preco_custo`/`estoque_atual` do tipo de `updateProduto` preservada.
- Verificação: por diff, as assinaturas e o corpo da query não mudaram; por `npx tsc -b`,
  o projeto compila.

## T-053 - Prova de API da tradução e da restrição de campos [concluida]

- Refs: US-027, US-028, AC-069, AC-071, AC-073, AC-077, AC-079
- Arquivos: tests/api/cadastros.spec.ts
- Descrição: provar por **igualdade** de mensagem e nunca por substring que `PGRST116` e
  `23502` produzem traduções distintas entre si, que nenhuma é igual à mensagem técnica
  medida, que nenhuma contém `PGRST116`, `23502`, `not-null`, nome de constraint ou nome
  de tabela, que erro de código desconhecido segue repassado sem tradução, e que a
  chamada de produto **não envia** `preco_custo` nem `estoque_atual`.
- Verificação: `npx vitest run tests/api/cadastros.spec.ts` passando, e uma mutação —
  remover a tradução tem de fazer as 6 asserções de tradução falharem, deixando passar as
  4 que não dependem dela.

## 2. Tela de clientes

## T-054 - Estado de edição em ClientesPage [concluida]

- Refs: US-027, AC-066, AC-067, AC-068
- Arquivos: src/pages/ClientesPage.tsx
- Descrição: um único formulário alternando entre cadastro e edição, preenchido com
  `nome`, `telefone`, `email` e `observacoes` do cliente escolhido; ação de edição na
  linha da listagem; gravação por `updateCliente` e reconsulta da listagem depois. O campo
  de observações, que existia na API mas não aparecia em nenhum formulário, entra nos
  dois modos.
- Verificação: `npx tsc -b` e os cinco arquivos de teste que já exercitavam esta tela
  (`refinamento-interface-formularios`, `-button`, `-empty-state`, `-tipografia` e
  `recuperacao-carga`), que seguem verdes.

## T-055 - Validação de e-mail no formulário de cliente [concluida]

- Refs: US-027, AC-070
- Arquivos: src/pages/ClientesPage.tsx
- Descrição: e-mail precisa ter formato de endereço quando preenchido. A validação impede
  a submissão e mostra indicação no campo, sem mensagem de banco. Fica em JS, e não em
  `type="email"` do input — ver T-062.
- Verificação: pelo teste de interface de T-059, que exige ausência da chamada de gravação
  **e** presença da indicação.

## 3. Tela de produtos

## T-056 - Estado de edição em ProdutosPage [concluida]

- Refs: US-028, AC-072, AC-073, AC-074
- Arquivos: src/pages/ProdutosPage.tsx
- Descrição: pelo mesmo desenho de T-054, com `nome`, `categoria`, `preco_venda` e
  `percentual_comissao`. O formulário de edição **não** tem campo de preço de custo nem
  de estoque, e o patch enviado não os inclui. O campo de preço de custo permanece no
  formulário de **cadastro** — é a entrada inicial do custo médio ponderável, e só o
  cadastro o define. Percentual vazio vira `null` (herda o padrão), nunca `undefined`.
- Verificação: por asserção sobre o patch efetivamente enviado na prova de API de T-053,
  e por `npx tsc -b`.

## T-057 - Comunicação do efeito do percentual sobre comandas abertas [concluida]

- Refs: US-028, AC-079
- Arquivos: src/pages/ProdutosPage.tsx
- Descrição: no formulário de edição, junto ao campo de percentual, dizer que alterá-lo
  afeta comandas ainda abertas que usem o produto e que comandas já fechadas mantêm a
  comissão apurada. Texto curto e permanente, sem diálogo de confirmação, e sem alterar o
  formulário de criação.
- Verificação: por asserção sobre o texto exibido no teste de interface de T-059.

## T-058 - Prova pgTAP da semântica de comissão [concluida]

- Refs: US-028, AC-075, AC-076
- Arquivos: supabase/tests/018_edicao_produto_preserva_comanda.sql
- Descrição: provar as duas faces da semântica: alterar o percentual **antes** de fechar
  uma comanda aberta faz o fechamento usar o percentual novo (AC-075), e alterar
  percentual ou `preco_venda` **depois** de fechada não altera
  `comissao_percentual_snapshot`, `comissao_valor_snapshot`, `preco_unitario` nem
  `total` (AC-076). Com asserções de controle que provem que a edição de fato ocorreu —
  sem elas o arquivo passa a sério com o UPDATE sem efeito.
- Verificação: o runner pgTAP do projeto, o arquivo passando junto com os demais, e uma
  mutação que substitua a leitura ao vivo por congelamento: AC-075 tem de reprovar.

## 4. Prova e regressão

## T-059 - Prova de interface das duas telas [concluida]

- Refs: US-027, US-028, AC-066, AC-067, AC-068, AC-070, AC-072, AC-073, AC-074, AC-077, AC-078, AC-079
- Arquivos: tests/ui/edicao-cadastros.spec.tsx
- Descrição: edição salva e refletida na listagem (AC-066, AC-072), abertura preenchida
  (AC-067), cancelamento sem alteração (AC-068), validação de e-mail (AC-070), ausência
  dos campos de custo e estoque (AC-073), gravação e limpeza do percentual (AC-074),
  validação de faixa (AC-078), mensagem de domínio sem detalhe do banco (AC-077), e o
  texto que comunica o efeito sobre comandas abertas (AC-079). Os fluxos de **cadastro**
  de cliente e produto também são exercitados, para provar que não regrediram.
- Verificação: `npx vitest run tests/ui/edicao-cadastros.spec.tsx` passando, e cada AC
  listado com ao menos uma asserção que o discrimina.

## T-060 - Validação de faixa no formulário de produto [concluida]

- Refs: US-028, AC-078
- Arquivos: src/pages/ProdutosPage.tsx
- Descrição: `preco_venda >= 0` e `percentual_comissao` entre 0 e 100 quando preenchido.
  O banco não valida faixa — medido, `preco_venda = -1`, `percentual_comissao = 150` e
  `= -5` foram aceitos pela fronteira real.
- Verificação: pelo teste de interface de T-059, com o mesmo par de asserções de T-055.

## T-061 - Regressão proporcional [concluida]

- Refs: US-027, US-028
- Descrição: `npx vitest run` na suíte completa de interface e API mais o runner pgTAP. O
  foco justificado é criação de comanda, fechamento e cálculo de comissão, porque a
  feature altera o campo que o fechamento lê.
- Verificação: saída 0, e os testes novos **presentes na execução** — não basta a suíte
  passar, é preciso que ela os tenha lido.
- Resultado: Vitest 18 arquivos 0 falhas; pgTAP 89 asserções 0 falhas; `npx tsc -b` e
  `npm run build` limpos.

## T-062 - Corrigir a duplicação de IDs de rastreio [concluida]

- Refs: US-027, US-028
- Arquivos: .spec/features/edicao-clientes-produtos/spec.md, .spec/features/edicao-clientes-produtos/tasks.md
- Descrição: a spec foi escrita com `AC-001` a `AC-014`, `US-001` a `US-002` e
  `ASM-001` a `ASM-007`, e o motor trata esses identificadores como **globais**. O
  resultado foram 50 erros de `ID_DUPLICADO` e provas atribuídas à feature errada. O que
  foi corrigido: ACs para `AC-066` a `AC-079` (o maior em uso era 065), USs para
  `US-027` e `US-028` (o maior era 026), ASMs para `ASM-040` a `ASM-046` (o maior era
  039), e as tasks receberam `Refs:` sob identificadores `T-052` a `T-062`, que é o
  formato que o motor reconhece. Nenhum outro arquivo foi tocado.
- Verificação: `onp-spec audit` sem nenhum `ERRO` e com 68/68 critérios provados.

## Desvios registrados

Dois desvios criados durante a execução, ambos resolvidos e ambos de origem minha:

1. **`type="email"` anulava a validação do próprio aplicativo** (T-055). O navegador
   bloqueia a submissão antes do `onSubmit` rodar, e a mensagem do aplicativo jamais
   aparecia. O teste de AC-070 reprovou, com razão. Atributo removido e validação mantida
   em JS, com `aria-invalid` no campo — coerente com a validação de preço e percentual,
   que também é em JS.
2. **A restauração de `fn_fechar_comanda` corrompeu acentos** (T-058). O pipe do
   PowerShell relê UTF-8 como Windows-1252, e o `Sessão` do `raise exception` gravou
   como `Sess??o` no banco, quebrando
   `004_fn_fechar_comanda_pagamento_divergente.sql`. Detectado por comparação de bytes
   (`536573733f3f` em vez de `53657373c3a36f`) e restaurado por redirecionamento
   byte-exato a partir de `0004_fn_fechar_comanda.sql`, a migration que define a função.
   Suíte pgTAP volta a zero falhas.
