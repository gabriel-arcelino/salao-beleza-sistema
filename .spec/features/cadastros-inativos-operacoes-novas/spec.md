# Spec: Cadastros inativos não são oferecidos em operações novas

> feature: cadastros-inativos-operacoes-novas
> status: implementada

## Contexto

As cinco entidades de cadastro têm `ativo`, e quatro têm desativação implementada e
usada na interface. **Nenhuma das listagens filtra inativos**, e nenhuma das telas que
montam um `<select>` para uma operação nova os exclui. Medido nesta rodada:

| Tela | Uso da lista | Deve excluir inativos? |
|---|---|---|
| `ClientesPage`, `ProdutosPage`, `ProfissionaisPage`, `ServicosPage` | **gerir** o cadastro | **Não** — o inativo precisa continuar visível, com o marcador "(inativo)", ou o usuário nunca vê o que desativou |
| `ComandasPage` | escolher serviço, produto e profissional de um **item novo** | **Sim** |
| `ConfigComissoesPage` | escolher profissional e serviço de uma **config nova** | **Sim** |
| `RelatorioComissaoPage` | escolher profissional para **reportar** | **Não** — é preciso apurar comissão de quem já saiu |

**O defeito:** com um serviço desativado, ele continua selecionável numa comanda nova e
o item é gravado com o preço e o nome dele. O mesmo vale para produto e profissional. É
vender algo que o responsável acabou de desativar.

**O que o filtro NÃO mexe.** Medido contra o banco: uma comanta aberta cujo item usa um
serviço e um profissional **ambos desativados fecha normalmente** —
`{"total": 50.00, "status": "FINALIZADA"}`. O item já registrado exibe por
`descricao_snapshot` e o fechamento lê `preco_unitario` e o percentual do profissional,
nunca o `ativo`. Portanto esta mudança é **inteiramente de interface**: não altera
gravação, não altera cálculo e não toca histórico.

## Decisões desta feature

- **D-1 — o filtro é na interface, não na API.** Filtrar em `list*` tiraria os inativos
  também das telas de gestão, onde eles precisam aparecer. Como as duas telas que montam
  operação nova também usam a lista completa para **exibir** (não só para escolher), o
  filtro é aplicado no ponto de uso, sobre a lista já carregada.
- **D-2 — `ConfigComissoesPage` passa a manter as duas listas.** O `<select>` de
  profissional e de serviço usa a lista filtrada; o `find()` das linhas
  `ConfigComissoesPage:214-215`, que resolve o nome a exibir na listagem de configs,
  continua usando a **lista completa**. Sem isso, a config de um profissional
  desativado passaria a exibir o UUID no lugar do nome.
- **D-3 — nenhuma alteração na API, no schema ou em RPC.** `list*` continua
  devolvendo tudo; nenhuma coluna muda; nenhuma policy muda.
- **D-4 — desativar permanece irreversível.** Confirmado que **não existe operação de
  reativar** em nenhuma das quatro entidades: a única escrita em `ativo` é
  `desativar*`, e a interface só tem o botão "Desativar". Esta feature **não** cria
  reativação — é decisão de produto, e está em "Perguntas em aberto". O que a mudança
  faz é não agravar: um inativo deixa de poder ser escolhido, mas continua legível e
  identificável.

## Histórias

### US-029 - O responsável não vende nem aponta serviço desativado

Como responsável pelo salão, quero que um serviço que desativei deixe de aparecer entre as
opções de item de comanda, para não vender algo que saiu de linha.

#### AC-080 - Item novo de comanda não oferece serviço inativo

- **Dado** um serviço cadastrado e ativo, e um serviço cadastrado que foi desativado
- **Quando** o responsável abre a tela de comandas e olha a lista de serviços do item
  novo
- **Então** o serviço ativo está na lista e o serviço inativo não está

#### AC-081 - Item já registrado de serviço desativado continua visível e fecha

- **Dado** uma comanda **aberta** cujo item já registra um serviço que foi desativado
  **Depois** que o item foi adicionado
- **Quando** o responsável abre a comanda
- **Então** o item continua exibindo a descrição e o preço com que foi gravado, e a
  comanda pode ser fechada normalmente

Este critério existe para provar que a mudança **não** mexe em histórico: sem ele, uma
implementação que filrasse a lista inteira esconderia o item já registrado e quebraria o
fechamento.

### US-030 - O responsável não aponta produto nem profissional inativos

#### AC-082 - Item novo de comanda não oferece produto inativo

- **Dado** um produto ativo e um produto desativado
- **Quando** o responsável abre a seleção de produto do item novo
- **Então** o produto ativo está na lista e o desativado não está

#### AC-083 - Item novo de comanda não oferece profissional inativo

- **Dado** um profissional ativo e um profissional desativado
- **Quando** o responsável escolhe o profissional do item novo
- **Então** o profissional ativo está na lista e o desativado não está

#### AC-084 - A comanda não é atribuída a profissional inativo

- **Dado** um profissional ativo e um profissional desativado
- **Quando** o responsável abre a seleção de profissional da comanda
- **Então** o profissional ativo está na lista e o desativado não está

### US-031 - Não se cria configuração de comissão para quem está inativo

#### AC-085 - Config de comissão não oferece profissional nem serviço inativos

- **Dado** um profissional e um serviço ativos, e um profissional e um serviço desativados
- **Quando** o responsável abre a tela de configuração de comissão
- **Então** as duas seleções de operação nova oferecem apenas os ativos

#### AC-086 - Config existente de profissional inativo continua exibindo o nome

- **Dado** uma configuração de comissão já gravada para um profissional que foi
  desativado
- **Quando** o responsável abre a listagem de configurações
- **Então** a linha exibe o **nome** do profissional desativado, e não o seu identificador

Este critério é o que impede que D-2 seja esquecido: se o filtro alcançar a lista
completa, a linha passa a exibir o UUID e o critério reprova.

### US-032 - Gerenciar e reportar continuam vendo o inativo

#### AC-087 - As telas de cadastro continuam listando os inativos

- **Dado** um cliente, um produto, um profissional e um serviço, todos desativados
- **Quando** o responsável abre cada uma das quatro telas de cadastro
- **Então** o inativo continua listado, marcado como inativo, e nenhuma ação de
  desativar é oferecida a ele

#### AC-088 - O relatório de comissão continua oferecendo o profissional inativo

- **Dado** um profissional desativado que tem comissão apurada
- **Quando** o responsável abre a tela de comissão por profissional
- **Então** o profissional desativado continua selecionável para consulta

## Evidência e estratégia de testes

Nove critérios, uma direção cada. Nenhum toca API, schema ou RPC, então a prova toda é
de interface, em `tests/ui/cadastros-inativos.spec.tsx`.

A estratégia é probar **as duas direções**, porque o erro natural aqui é o filtro
vazar. Um filtro em `list*` resolveria os nove de exclusão e apagaria da tela de
cadastro justamente o registro que o responsável precisa ver. Por isso os critérios de
preservação (AC-081, AC-086, AC-087, AC-088) têm asserção própria, e não são
considerados cobertos por acaso.

| AC | O que prova | Direção |
|---|---|---|
| AC-080 | serviço inativo fora do item novo | exclusão |
| AC-081 | item já registrado continua exibindo e fecha | preservação |
| AC-082 | produto inativo fora do item novo | exclusão |
| AC-083 | profissional inativo fora do item novo | exclusão |
| AC-084 | profissional inativo fora da comanda | exclusão |
| AC-085 | inativos fora da config nova | exclusão |
| AC-086 | config de inativo exibe o nome, não o UUID | preservação |
| AC-087 | tela de cadastro continua listando o inativo | preservação |
| AC-088 | relatório continua oferecendo o inativo | preservação |

**Duas mutações foram executadas**, uma por direção de D-2, e cada uma matou
exatamente um critério:

| Mutação | Critério que reprovou | Os outros 8 |
|---|---|---|
| remover o filtro de produto em `ComandasPage` | AC-082 | passaram |
| o `find()` de exibição passa a usar a lista filtrada | AC-086 | passaram |

A segunda é a que importa: ela é o erro inverso de D-2, e sem AC-086 ela passaria
invisível, exibindo o UUID no lugar do nome.

## Impacto técnico

- `src/pages/ComandasPage.tsx` — uma lista filtrada por entidade, usada nos quatro
  `<select>` de operação nova. O `.find()` que resolve preço e nome do item
  selecionado passa a usar a lista filtrada, o que é equivalente: um inativo não chega
  a ser selecionado.
- `src/pages/ConfigComissoesPage.tsx` — **duas** listas por entidade: a filtrada nos
  `<select>` e a completa nos `find()` de exibição (D-2).
- `tests/ui/` — um arquivo de teste de interface.
- `supabase/`, `src/lib/`, migrations, RLS, RPCs: **sem alteração**.

## Evidência G4 e G5 - verificação no aplicativo

**G4 (QA funcional): N/A.** O comportamento exigido é o conteúdo de um `<select>`, e
os nove critérios são provados no DOM pelos testes de interface, sobre os componentes
reais. Não há gravação, cálculo, RPC ou schema envolvido — a mudança são três linhas
de filtro.

A única coisa que os testes *não* cobririam é se a API devolve o campo que o filtro
lê. Isso foi medido no limite, e não assumido:

- `listClientes`, `listProdutos`, `listProfissionais` e `listServicos` usam
  `select("*")`, então `ativo` vem da linha, não de um tipo declarado.
- As quatro colunas são `NOT NULL DEFAULT true` em `information_schema.columns`. Logo
  o caso "ativo nulo, Some da lista" é **impossível por schema**, e não só improvável.
- Nenhuma linha das quatro tabelas tem `ativo` nulo hoje (medido: 0 nulos, 1 ativo em
  cada).

**G5 (QA visual): N/A.** A mudança remove `<option>` de um `<select>`. Não há cor,
espaçamento, tipografia, largura ou estado novo. Não há o que comparar visualmente
além do que o DOM já afirma.

## Fora de escopo

- **Reativar um cadastro.** Confirmado que a operação não existe, e é decisão de
  produto. Esta mudança não a cria nem a antecipa.
- **Telas de cadastro** (`ClientesPage`, `ProdutosPage`, `ProfissionaisPage`,
  `ServicosPage`): continuam mostrando inativos, por AC-087.
- **`RelatorioComissaoPage`**: continua oferecendo profissionais inativos, por AC-088.
- **Filtrar em `list*` na API**: excluido por D-1, porque quebraria as telas de gestão.
- **Filtro no banco, por policy ou por view**: não há necessidade. O dado já está em
  `ativo`, e a RLS é de salão e perfil, não de estado.
- **`config_comissoes`**: não tem coluna `ativo` (medido). Não se aplica.
- **Edição de `profissionais` e `config_comissoes`**, exclusão, desativação nova,
  `updated_at`, snapshot de cliente.
- Os 9 `VERIFY_OBSOLETO`, o `sinais.json`, o ONP, o Factory Kit.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| ASM-047 | Desativar não impede o fechamento de comanda já aberta. | confirmada | Medido em 2026-09-30: com serviço e profissional desativados, `fn_fechar_comanda` retornou `{"total": 50.00, "status": "FINALIZADA"}`. O item exibe por `descricao_snapshot`. |
| ASM-048 | O item já registrado não depende de o cadastro estar ativo. | confirmada | `ComandasPage:235` renderiza `item.descricao_snapshot` e `item.preco_unitario`, ambos gravados no momento da inclusão. |
| ASM-049 | Filtrar em `list*` quebraria as telas de gestão. | confirmada | As quatro telas de gestão renderizam a lista recebida e oferecem a ação de desativar apenas quando `s.ativo`. Sem o inativo na lista, ele sumiria da tela. |
| ASM-050 | Não existe operação de reativar. | confirmada | `grep` por `ativar` em `src/lib/api` e `src/pages` retorna apenas as funções `desativar*` e o botão que as chama. Nenhuma escrita em `ativo = true`. |

## Perguntas em aberto

Nenhuma bloqueia a execução. Nenhuma decisão de produto é necessária para esta feature.

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| Q-029 | Como reativar um cadastro desativado? | respondida | **Fora de escopo por decisão.** A operação não existe e criá-la é decisão de produto, não consequência desta feature. Registrado em "Fora de escopo" e em D-4. |
| Q-030 | Um serviço desativado deve poder ser re-selecionado se for o único da categoria? | respondida | Não. A lista de operação nova oferece só ativos. Se o responsável precisar de um serviço desativado em uma comanda nova, a solução é reativá-lo — que hoje não existe, e é Q-029. Não se cria um caminho alternativo dentro desta feature. |
| Q-031 | `config_comissoes` deveria passar a filtrar por `ativo`? | respondida | Não se aplica: a tabela **não tem** coluna `ativo` (medido). E suas policies não checam estado. Deixar a entity inteira é mais seguro do que simular um estado que não existe. |
