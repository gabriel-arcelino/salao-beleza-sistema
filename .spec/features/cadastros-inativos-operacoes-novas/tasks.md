# Tasks: Cadastros inativos não são oferecidos em operações novas

> feature: cadastros-inativos-operacoes-novas
> spec: `.spec/features/cadastros-inativos-operacoes-novas/spec.md`

<!--
  Toda tarefa referencia em `Refs:` pelo menos uma história de usuário.
  Uma tarefa só pode virar [concluida] quando os critérios de aceite dela
  tiverem prova PASS registrada por `onp-spec verify`.
  Status: pendente | em-andamento | concluida
-->

A mudança é inteiramente de interface: nenhuma API, nenhum schema, nenhuma RPC.
A SPEC mediu que a comanda já aberta com serviço desativado fecha normalmente, e que
o item registrado exibe por `descricao_snapshot` — o filtro não pode tocar nenhum dos
dois.

## T-063 - Excluir inativos das quatro seleções de operação nova da comanda [concluida]

- Refs: US-029, US-030, AC-080, AC-081, AC-082, AC-083, AC-084
- Arquivos: src/pages/ComandasPage.tsx
- Descrição: em `carregar`, filtrar as três listas na própria atribuição — serviço,
  produto e profissional. Elas alimentam os quatro `<select>` de operação nova
  (profissional da comanda; serviço, produto e profissional do item) e o `.find()` que
  resolve preço e nome do item selecionado, que passa a ser equivalente porque um
  inativo não chega a ser selecionado. O item já registrado continua sendo renderizado
  por `descricao_snapshot` e não depende de nenhuma destas listas.
- **Desvio registrado.** Esta task foi escrita antes da implementação, prevendo manter
  as listas completas e derivar as filtradas. Não foi assim: a primeira versão mantinha
  as duas, e `npx tsc -b` reprovou com `TS6133` nas três — a lista completa ficou sem
  uso nesta tela. O compilador estava certo, e a razão é a mesma de AC-081: esta tela
  só usava as listas para escolher, e o item registrado não depende delas. A solução
  ficou menor que a planejada, com três linhas em vez de seis. Em `ConfigComissoesPage`
  as duas listas são de fato necessárias, porque lá o `find()` de exibição usa a
  completa (T-064).
- Verificação: por `npx tsc -b`, e por teste de interface que exercite um serviço, um
  produto e um profissional **desativados** e confirme que nenhum aparece nas quatro
  seleções, enquanto os ativos aparecem.

## T-064 - Separar lista filtrada de lista completa na tela de comissão [concluida]

- Refs: US-031, AC-085, AC-086
- Arquivos: src/pages/ConfigComissoesPage.tsx
- Descrição: manter **duas** listas por entidade, conforme D-2. A filtrada alimenta os
  `<select>` de profissional e de serviço da configuração nova. A completa continua
  alimentando os `find()` das linhas `214-215`, que resolvem o nome exibido na listagem
  de configurações. Sem essa separação, a configuração de um profissional desativado
  passaria a exibir o identificador no lugar do nome.
- Verificação: por `npx tsc -b`, e por teste de interface que configure um profissional
  desativado, confirme que ele **não** aparece no `<select>` e que a linha da
  configuração **exibe o nome dele**, e não o UUID.

## T-065 - Prova de interface das duas direções do filtro [concluida]

- Refs: US-029, US-030, US-031, US-032, AC-080, AC-081, AC-082, AC-083, AC-084, AC-085, AC-086, AC-087, AC-088
- Arquivos: tests/ui/cadastros-inativos.spec.tsx
- Descrição: um arquivo que prova as duas direções. **Exclusão**: serviço, produto e
  profissional inativos não aparecem nas quatro seleções de operação nova, e nem
  profissional nem serviço inativos aparecem na tela de comissão. **Preservação**: as
  quatro telas de cadastro continuam listando o inativo marcado como inativo, o
  relatório de comissão continua oferecendo o profissional inativo, e um item já
  registrado de serviço desativado continua exibindo descrição e preço.
- Verificação: `npx vitest run tests/ui/cadastros-inativos.spec.tsx` — 9/9 PASS. Duas
  mutações foram executadas, não uma, porque D-2 tem duas direções opostas e cada uma
  precisava de prova: **(1)** remover o filtro de produto em `ComandasPage` matou
  AC-082 e só ele; **(2)** fazer o `find()` de exibição usar a lista filtrada matou
  AC-086 e só ele. A segunda é o erro inverso de D-2 e sem AC-086 passaria invisível,
  exibindo o UUID no lugar do nome.
- **Detalhe de escrita do teste.** A primeira versão do arquivo buscava os campos pelo
  texto do label e falhou em quatro dos nove testes, porque "Profissional (opcional)"
  aparece duas vezes na tela de comandas e o label do relatório também é
  "Profissional". Os `<select>` de operação nova têm `id` próprio, e a busca passou a
  ser por `id`, que é unívoco. Registrado porque é o tipo de erro que faz um teste
  parecer mais forte do que é: uma regex de label que não casa reprova por motivo
  errado.

## T-066 - Regressão proporcional e fechamento dos gates [concluida]

- Refs: US-029, US-030, US-031, US-032
- Descrição: regressão na suíte de interface e API mais o runner pgTAP, e o
  fechamento dos gates da entrega.
- Verificação: `npx tsc -b` saída 0; suíte completa de vitest saída 0;
  `node scripts/onp-combined-verify.cjs` (G7) saída 0. O runner pgTAP foi executado
  separadamente para confirmar que produziu asserções de verdade, e não uma saída 0
  vazia — 15.607 caracteres, com `ok` nos testes de Fechar comanda e em
  `018_edicao_produto_preserva_comanda`. O `combined-verify` só ecoa a saída do pgTAP
  quando ela falha, o que faz o verde dele parecer silencioso; sem essa checagem à
  parte, "G7 passou" seria afirmação sem prova.
- **G4 e G5 saíram N/A, e não executados.** Esta task foi escrita prevendo verificação
  funcional no build de produção. Ao medir o que a automação deixava de fora — a API
  devolver o campo que o filtro lê — a lacuna fechou por medição de schema (`list*` com
  curinga, quatro colunas `NOT NULL DEFAULT true`), e o comportamento restante é
  conteúdo de `<select>`, já provado no DOM. Ver a seção de evidência G4/G5 da spec. O
  que não há aqui é verificação em navegador, e ela é desnecessária: não há cor,
  tipografia, espaçamento ou estado novo para comparar.

## Fora de escopo registrado nas tasks

Nenhuma task cobre reativação, exclusão, edição de `profissionais` ou
`config_comissoes`, filtro em `list*`, alteração de `config_comissoes` ou de qualquer
tabela, nem qualquer item da fábrica. A spec lista o mesmo em "Fora de escopo", com a
razão de cada exclusão.
