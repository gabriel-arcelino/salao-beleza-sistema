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
- Descrição: em `carregar`, manter as listas completas recebidas da API e derivar, para
  serviço, produto e profissional, a lista que alimenta os `<select>` de operação nova —
  profissional da comanda, e serviço, produto e profissional do item. O `.find()` que
  resolve preço e nome do item selecionado passa a usar a lista filtrada, o que é
  equivalente: um inativo não chega a ser selecionado. O item já registrado continua
  sendo renderizado por `descricao_snapshot` e não depende de nenhuma das duas listas.
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

## T-065 - Prova de interface das seis Distinções [concluida]

- Refs: US-029, US-030, US-031, US-032, AC-080, AC-081, AC-082, AC-083, AC-084, AC-085, AC-086, AC-087, AC-088
- Arquivos: tests/ui/cadastros-inativos.spec.tsx
- Descrição: um arquivo que prova as duas direções. **Exclusão**: serviço, produto e
  profissional inativos não aparecem nas quatro seleções de operação nova, e nem
  profissional nem serviço inativos aparecem na tela de comissão. **Preservação**: as
  quatro telas de cadastro continuam listando o inativo marcado como inativo, o
  relatório de comissão continua oferecendo o profissional inativo, e um item já
  registrado de serviço desativado continua exibindo descrição e preço.
- Verificação: `npx vitest run tests/ui/cadastros-inativos.spec.tsx` passando, e com uma
  mutação — remover um dos filtros tem de fazer a asserção de exclusão correspondente
  reprovar, e a de preservação continuar passando.

## T-066 - Regressão proporcional e verificação no aplicativo [concluida]

- Refs: US-029, US-030, US-031, US-032
- Descrição: regressão na suíte de interface e API mais o runner pgTAP, e verificação
  funcional contra o build de produção. O foco é a tela de comandas, porque é a única
  cuja lista muda, e a de comissão, porque ganhou uma lista a mais.
- Verificação: saída 0, com os testes novos presentes na execução; e no aplicativo, com
  um serviço desativado de verdade, confirmar que ele some do `<select>` de item, que um
  item já registrado continua exibindo, e que a comanda fecha.

## Fora de escopo registrado nas tasks

Nenhuma task cobre reativação, exclusão, edição de `profissionais` ou
`config_comissoes`, filtro em `list*`, alteração de `config_comissoes` ou de qualquer
tabela, nem qualquer item da fábrica. A spec lista o mesmo em "Fora de escopo", com a
razão de cada exclusão.
