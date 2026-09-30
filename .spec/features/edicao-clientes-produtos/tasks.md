# Tasks: Edição de clientes e produtos

> feature: edicao-clientes-produtos
> spec: `.spec/features/edicao-clientes-produtos/spec.md`

Dez tasks, quatro etapas de trabalho. A investigação de fronteira já está concluída e
registrada na spec; ela não aparece como task. Cada task traz a verificação embutida.

**Todas as dez tasks executadas e verificadas.** As mutações exigidas por 1.2 e 4.1 foram
executadas: remover a tradução de erro faz as 6 asserções de tradução de API falharem, e
substituir a leitura ao vivo do percentual por congelamento em `fn_fechar_comanda` faz o
AC-010 reprovar. Os controles de cada mutação permanecem verdes, o que prova que a edição
ocorreu.

## 1. API: tradução de erro nas duas funções

- [x] 1.1 Traduzir a falha em `updateCliente` (`src/lib/api/clientes.ts:27-34`) e em
  `updateProduto` (`src/lib/api/produtos.ts:30-44`), usando os `code` medidos
  (`PGRST116` e `23502`) e sem inventar `42501`, que a medição provou não ocorrer.
  Assinaturas intactas, e a exclusão de `preco_custo`/`estoque_atual` do tipo de
  `updateProduto` preservada. **Verificar** por diff que as assinaturas e o corpo da
  query não mudaram, e por `npx tsc -b` que o projeto compila.
- [x] 1.2 Criar `tests/api/cadastros.spec.ts` provando, por **igualdade** de mensagem e
  nunca por substring: que `PGRST116` e `23502` produzem traduções distintas entre si,
  que nenhuma delas é igual à mensagem técnica medida, que nenhuma contém `PGRST116`,
  `23502`, `not-null`, nome de constraint ou nome de tabela, que erro de código
  desconhecido segue repassado sem tradução, e que a chamada de produto **não envia**
  `preco_custo` nem `estoque_atual` (AC-004, AC-006, AC-012, AC-014). **Verificar**
  com `npx vitest run tests/api/cadastros.spec.ts` passando, e com uma mutação — remover
  a tradução tem de fazer as asserções de tradução falharem.

## 2. Tela de clientes

- [x] 2.1 Ligar o estado de edição em `src/pages/ClientesPage.tsx`: um único formulário
  alternando entre cadastro e edição, preenchido com `nome`, `telefone`, `email` e
  `observacoes` do cliente escolhido; ação de edição na linha da listagem; gravação por
  `updateCliente` e reconsulta da listagem depois. O campo de observações, que hoje
  existe na API mas **não** aparece no formulário de cadastro, entra também no de
  edição. **Verificar** por `npx tsc -b` e por `npx vitest run` nos cinco arquivos de
  teste que já exercitam esta tela, que devem seguir verdes.
- [x] 2.2 Validar no formulário: e-mail precisa ter formato de endereço quando
  preenchido, e `nome` é obrigatório (AC-005). A validação impede a submissão e mostra
  indicação no campo, sem mensagem de banco. **Verificar** pelo teste de interface da
  etapa 4, que exige ausência da chamada de gravação **e** presença da indicação.

## 3. Tela de produtos

- [x] 3.1 Ligar o estado de edição em `src/pages/ProdutosPage.tsx` pelo mesmo desenho
  da etapa 2, com `nome`, `categoria`, `preco_venda` e `percentual_comissao`. O
  formulário de edição **não** tem campo de preço de custo nem de estoque, e o patch
  enviado não os inclui (AC-008). O campo de preço de custo permanece no formulário de
  **cadastro** — ele é a entrada inicial do custo médio ponderável, e só o cadastro o
  define. Campo de percentual vazio vira `null` (herda o padrão), nunca `undefined`.
  **Verificar** por asserção sobre o patch efetivamente enviado na prova de API da etapa 1,
  e por `npx tsc -b`.
- [x] 3.2 Comunicar no formulário de edição, junto ao campo de percentual, que alterá-lo
  afeta comandas ainda abertas que usem o produto, e que comandas já fechadas mantêm o
  valor apurado (AC-014). Texto curto e permanente, sem diálogo de confirmação. **Verificar**
  por asserção sobre o texto exibido no teste de interface da etapa 4.
- [x] 3.3 Validar no formulário: `preco_venda >= 0`, `percentual_comissao` entre 0 e 100
  quando preenchido (AC-013). **Verificar** pelo teste de interface da etapa 4, com o
  mesmo par de asserções da etapa 2.2.

## 4. Prova e regressão

- [x] 4.1 Criar `supabase/tests/018_edicao_produto_preserva_comanda.sql` (pgTAP)
  provando as duas faces da semântica de comissão: alterar o percentual **antes** de
  fechar uma comanda aberta faz o fechamento usar o percentual novo (AC-010), e alterar
  percentual ou `preco_venda` **depois** de fechada não altera
  `comissao_percentual_snapshot`, `comissao_valor_snapshot`, `preco_unitario` nem
  `total` (AC-011). Com asserções de controle que provem que a edição de fato ocorreu —
  sem elas o arquivo passa a sério com o UPDATE sem efeito. **Verificar** com o runner
  pgTAP do projeto, o arquivo passando junto com os demais, e com uma mutação que faça a
  semântica de leitura ao vivo ser substituída por congelamento: AC-010 tem de reprovar.
- [x] 4.2 Criar `tests/ui/edicao-cadastros.spec.tsx` cobrindo o comportamento de
  interface das duas telas: edição salva e refletida na listagem (AC-001, AC-007),
  abertura preenchida com os valores atuais (AC-002), cancelamento sem alteração
  (AC-003), validação de e-mail (AC-005), ausência dos campos de custo e estoque
  (AC-008), gravação e limpeza do percentual (AC-009), validação de faixa (AC-013), e o
  texto que comunica o efeito sobre comandas abertas (AC-014). Os fluxos de **cadastro**
  de cliente e produto também são exercitados, para confirmar que seguem funcionando.
  **Verificar** com `npx vitest run tests/ui/edicao-cadastros.spec.tsx` passando, e
  confirmando que cada AC listado tem ao menos uma asserção que o discrimina.
- [x] 4.3 Regressão proporcional: `npx vitest run` na suíte completa de interface e API
  mais o runner pgTAP. O foco justificado é criação de comanda, fechamento e cálculo de
  comissão, porque a feature altera o campo que o fechamento lê. **Verificar** saída 0, e
  que os testes novos aparecem na execução — não basta a suíte passar, é preciso que ela
  os tenha lido.

## Resultado da execução

Vitest: 18 arquivos, 0 falhas, com `cadastros.spec.ts` e `edicao-cadastros.spec.tsx`
presentes na execução. pgTAP: 89 asserções, 0 falhas, com o `018` junto dos demais.
`npx tsc -b` e `npm run build` limpos.

**Dois desvios registrados, ambos criados durante a execução e ambos resolvidos:**

1. `type="email"` no campo de e-mail anulava a validação do próprio aplicativo: o
   navegador bloqueia a submissão antes do `onSubmit` rodar, e a mensagem jamais
   aparecia. O teste de AC-005 reprovou, com razão. Atributo removido e a validação
   mantida em JS, com `aria-invalid` no campo — coerente com a validação de preço e
   percentual, que também é em JS.
2. Na execução da mutação de 4.1, a restauração de `fn_fechar_comanda` passou pelo
   pipe do PowerShell, que relê UTF-8 como Windows-1252, e gravou `Sess??o` no banco,
   quebrando `004_fn_fechar_comanda_pagamento_divergente.sql`. Detectado por
   comparação de bytes (`536573733f3f` em vez de `53657373c3a36f`) e restaurado por
   redirecionamento byte-exato a partir de `0004_fn_fechar_comanda.sql`, a migration
   que define a função. Suíte pgTAP volta a zero falhas.
