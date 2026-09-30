# Spec: Edição de clientes e produtos

> feature: edicao-clientes-produtos
> status: implementada

## Contexto

O aplicativo cadastra, lista e desativa clientes e produtos, mas não os corrige. As
funções de atualização existem em `src/lib/api/clientes.ts:27-34` e
`src/lib/api/produtos.ts:30-44` e **nenhuma tela as importa**. Na prática, um telefone
errado ou um preço de venda desatualizado é permanente: o único caminho é desativar o
cadastro e criar outro, o que produz duas linhas e — no caso de produto — duplica o
SKU.

`servicos` recebeu edição no experimento OpenSpec, **na branch `experimento/openspec`**.
Esta feature não reimplementa aquela parte: apenas repete o mesmo desenho de interface
para as duas entidades restantes que não têm efeito colateral em cálculo financeiro.

**O que separa esta feature da frente de ciclo de vida inteira** é o efeito do dado
editado sobre o histórico. Medido, não presumido:

| Entidade | Dado editado | Efeito em comanda já fechada | Efeito em comanda aberta |
|---|---|---|---|
| `clientes` | `nome` | **altera** — `fn_relatorio_comissao` faz JOIN vivo | nenhum |
| `produtos` | `preco_venda` | nenhum — item guarda `preco_unitario` | nenhum |
| `produtos` | `percentual_comissao` | nenhum — `comissao_valor_snapshot` preservado | **altera o valor a ser cobrado** |

`profissionais` e `config_comissoes` ficam fora porque editam a origem do cálculo de
comissão e têm decisão de produto pendente (ver "Fora de escopo").

## Fatos medidos que a spec consagra

Medidos em 2026-09-29 pela fronteira real (Supabase local + PostgREST 16.3, usuários
descartáveis com `app_metadata.salon_id` e `usuarios.perfil`), reproduzindo a cadeia
exata que o código monta: `from(T).update(patch).eq("id", id).select().single()`.

**Controle, executado primeiro para validar a medição:** usuário ADMIN atualizando
linha existente gravou de fato, em ambas as entidades. Sem ele os resultados negativos
seriam desprovidos de valor.

### Códigos que a fronteira real entrega

| Situação | `code` | `message` |
|---|---|---|
| ADMIN atualiza linha existente | — | sem erro, devolve a linha |
| RECEPCAO atualiza linha existente | `PGRST116` | `Cannot coerce the result to a single JSON object` |
| PROFISSIONAL atualiza linha existente | `PGRST116` | idem |
| ADMIN atualiza `id` inexistente | `PGRST116` | idem |
| `nome` (cliente) ou `preco_venda` (produto) nulo | `23502` | `null value in column "…" of relation "…" violates not-null constraint` |

Três consequências que a spec precisa respeitar, e que **não** são as do caso de
`config_comissoes`:

1. **Não existe `23505` em nenhuma das duas tabelas.** Medido: cliente com SKU já
   usado é aceito, `produtos` não tem nenhuma constraint `UNIQUE` ou `CHECK`. A
   tradução de duplicata usada em `config_comissoes.ts` **não se aplica aqui** e não
   deve ser copiada.

2. **Não existe `42501`.** O RLS negado não levanta erro: devolve zero linhas em
   silêncio, e o erro nasce do `.single()` do cliente — um código do PostgREST. O
   mesmo `PGRST116` cobre tanto "sem permissão" quanto "registro inexistente", e as
   duas situações são indistinguíveis por desenho (distinguir seria um oráculo de
   existência para quem não tem permissão). A mensagem de domínio fala das duas.

3. **Não há validação de faixa no banco.** Medido: `preco_venda = -1`,
   `percentual_comissao = 150` e `= -5`, `estoque_minimo = -3`, e-mail `"nao-e-email"` e
   observação de 5000 caracteres são **todos aceitos**. A única defesa é o formulário.

### Semântica de `percentual_comissao` em comanda — medida, não deduzida

`fn_fechar_comanda` resolve a comissão de um item de produto lendo
`produtos.percentual_comissao` **ao vivo**, e só quando a configuração do profissional
tem `comissao_sobre_produto = true`.

**Cenário A — editar antes de fechar.** Produto com `percentual_comissao = 10`,
comanda aberta com o produto, configuração do profissional em 0% com
`comissao_sobre_produto = true`. O percentual foi alterado para `25` **antes** do
fechamento.

> Resultado: `comissao_percentual_snapshot = 25.00`, `comissao_valor_snapshot = 25.00`.

Ou seja: **editar antes de fechar muda o valor cobrado.** A leitura é ao vivo.

**Cenário B — editar depois de fechar.** Mesma montagem, percentual `10`, fechamento
real, e só então o percentual foi alterado para `40`.

> Antes da edição: `comissao_percentual_snapshot = 10.00`, `comissao_valor_snapshot = 10.00`.
> Depois da edição: `comissao_percentual_snapshot = 10.00`, `comissao_valor_snapshot = 10.00`.

Ou seja: **comanda fechada preserva o valor já apurado.** O snapshot gravado no
fechamento é a fonte da verdade depois dele.

O contraste entre A e B é a regra que a spec consagra: o percentual do produto vale
**para o que ainda não foi cobrado** e é **congelado para o que já foi**.

### Consequência combinada, e como a interface deve tratá-la

`percentual_comissao` **é editável nesta feature** — decisão de produto registrada. A
semântica de A e B é preservada integralmente, e por isso a edição tem um efeito que
nenhum outro campo das duas entidades tem:

- **Comanda ainda aberta** que contenha o produto: o fechamento vai usar o percentual
  **novo**. A comissão a ser cobrada muda.
- **Comanda já fechada**: `comissao_percentual_snapshot` e `comissao_valor_snapshot`
  permanecem os mesmos. Nada do que já foi apurado é reescrito.

Como o responsável não tem como saber, pela tela, quais comandas estão abertas usando
aquele produto, a interface **deve comunicar a consequência** no próprio formulário de
edição. A comunicação é um texto curto e permanente junto ao campo: o responsável lê uma
vez, enquanto edita, e a informação não reaparece como confirmação a cada gravação.

## Impacto da edição de `clientes.nome` — medido

`clientes.nome` é lido ao vivo em exatamente um lugar do sistema:

- `fn_relatorio_comissao` faz `join public.clientes cl on cl.id = c.cliente_id` e
  projeta `cl.nome as cliente_nome`. Nenhuma outra função e nenhuma view referencia
  `clientes` (medido: 1 função, 0 views).
- `comandas` guarda apenas `cliente_id` e `uuid_cliente`; **não há coluna de nome**.
- `comanda_itens.descricao_snapshot` guarda o nome do **produto ou serviço**, nunca do
  cliente (medido: 0 itens com nome de cliente no snapshot).
- A tela `RelatorioComissaoPage` lê do banco a cada consulta, sem cópia em estado.

**Consequência:** editar o nome de um cliente reescreve o nome exibido em relatórios de
comissão **já emitidos**, porque não há snapshot. Isso é comportamento correto para um
cadastro — o nome atual do cliente é o que um relatório deve mostrar — e **não** é
histórico financeiro: os **valores** (`comissao_valor_snapshot`, `total`, `subtotal`)
vivem no item e não mudam. Registrado como limitação conhecida, não como defeito, e sem
correção nesta feature: snapshot de nome de cliente exigiria migration e decisão de
modelagem.

## Decisões desta feature

- **D-1 — a edição reusa a função `update*` existente, sem criar API nova.** As duas
  funções têm a assinatura correta e a cadeia de query idêntica. Reescrevê-las seria
  duplicar o que já existe e abrir caminho para a assinatura divergir da que os testes
  de outras telas usam.
- **D-2 — `preco_custo` e `estoque_atual` continuam fora do formulário de edição.** A
  restrição já está documentada em `produtos.ts:36-40`: `preco_custo` é recalculado
  pela RPC de movimentação de estoque (custo médio ponderável) e `estoque_atual` é
  movimentado por ela. Editá-los pela tela quebraria a auditoria de custo.
  Medido, como agravante: `fn_fechar_comanda` lê `produtos.preco_custo` **ao vivo** no
  fechamento, para gravar `custo_unitario` na movimentação de estoque — um preço de
  custo editado mudaria retroativamente o custo registrado.
- **D-3 — a interface segue o mesmo desenho validado em `servicos`.** Formulário único
  alternando entre criação e edição, preenchido com os valores atuais ao abrir a
  edição, e reconsulta da listagem após gravar. Nenhum componente novo, nenhum padrão
  visual novo.
- **D-4 — a tradução de erro fica na camada de API, não na tela.** O requisito "a
  interface não mostra erro técnico do banco" é um contrato do módulo, não da
  apresentação. Traduzir na tela deixaria o erro cru alcançável por qualquer
  chamador futuro.
- **D-5 — validação de faixa e de formato vive no formulário.** O banco não valida
  (medido acima), e criar `CHECK` em banco seria migration sem necessidade demonstrada
  por esta feature. A validação de cliente é a camada que existe. Os limites são:
  `preco_venda >= 0`, `percentual_comissao` em `[0, 100]`, `estoque_minimo >= 0`, e
  e-mail em formato de endereço quando preenchido.
- **D-6 — `PGRST116` é tratado como um erro só, sem simular uma distinção que a
  fronteira não faz.** A medição provou que "sem permissão" e "registro inexistente"
  chegam à aplicação como o **mesmo** erro, com o mesmo `code` e o mesmo `message`. A
  interface não os apresenta como duas situações diferentes, e não se promete ao usuário
  saber qual delas ocorreu. A mensagem de domínio declara o que é verdade: a gravação não
  ocorreu. Não há tradução de `42501` para estes casos, porque a medição provou que esse
  código não ocorre nesta fronteira.

## Histórias

### US-001 - O responsável corrige os dados de um cliente já cadastrado

Como responsável pelo salão, quero corrigir o telefone, o e-mail ou as observações de um
cliente que já cadastrei, para não precisar desativá-lo e criar outro cadastro igual.

#### AC-001 - A edição de cliente salva e aparece na listagem

- **Dado** um cliente cadastrado e visível na listagem
- **Quando** o responsável abre a edição, altera os dados, e confirma a gravação sem erro
- **Então** a listagem passa a exibir os dados novos para aquele cliente

#### AC-002 - A edição abre preenchida com os valores atuais e permite alterá-los

- **Dado** um cliente com nome, telefone, e-mail e observações gravados
- **Quando** o responsável inicia a edição desse cliente
- **Então** os quatro campos aparecem preenchidos com os valores atuais e podem ser
  alterados

#### AC-003 - Cancelar a edição não altera o cadastro

- **Dado** um cliente em edição, com alterações ainda não salvas
- **Quando** o responsável cancela a edição
- **Então** o formulário volta ao modo de cadastro e o cadastro do cliente permanece
  como estava

#### AC-004 - Falha ao salvar apresenta mensagem compreensível, sem detalhe técnico

- **Dado** um cliente em edição
- **Quando** a gravação falha
- **Então** a interface apresenta uma mensagem de domínio, compreensível para o
  responsável, que declara que a alteração não foi salva, e essa mensagem não contém o
  nome de nenhuma constraint de banco, nem o código do erro, nem o texto técnico
  devolvido pelo banco

O critério exige que a falha seja **mensagem de erro e não ausência de atualização**: um
teste que verificasse apenas "algo mudou na tela" não distinguiria uma tradução ausente.

A falha de `23502` e a de `PGRST116` são exercitadas separadamente na prova, porque
produzem traduções que devem ser distintas entre si. E a mensagem de `PGRST116` **não
distingue** "sem permissão" de "registro inexistente": ver D-6.

#### AC-005 - O e-mail e o telefone são validados antes de salvar

- **Dado** um cliente em edição
- **Quando** o responsável informa um e-mail que não é um endereço válido
- **Então** a gravação não é submetida e o responsável vê a indicação do campo inválido,
  sem que a mensagem seja um erro técnico de banco

Este critério existe porque o banco **não** valida: medido, `"nao-e-email"` foi aceito
pela fronteira real.

#### AC-006 - Uma edição que não pode ser concluída não altera o cadastro

- **Dado** um cliente cadastrado, e uma tentativa de edição que a aplicação não consiga
  gravar — seja por falta de permissão de escrita, seja por o registro não existir, as
  duas indistinguíveis na fronteira (D-6)
- **Quando** a tentativa é feita
- **Então** o cadastro do cliente **permanece com os valores anteriores** e a interface
  apresenta mensagem de domínio dizendo que a alteração não foi salva, sem indicar qual
  das duas causas ocorreu e sem detalhe técnico

Duas cláusulas carregam este critério. A de **integridade** ("permanece com os valores
anteriores") é a que discrimina: sem ela, uma implementação que falhasse em silêncio
depois de gravar passaria. A de **não-distinguir** é o que impede que a interface
prometa ao usuário uma informação que a fronteira não entrega.

### US-002 - O responsável corrige o preço e o percentual de um produto

Como responsável pelo salão, quero corrigir o preço de venda e o percentual de comissão
de um produto, para manter o cadastro coerente sem duplicar o SKU.

#### AC-007 - A edição de produto salva e aparece na listagem

- **Dado** um produto cadastrado e visível na listagem
- **Quando** o responsável abre a edição, altera os campos permitidos, e confirma a
  gravação sem erro
- **Então** a listagem passa a exibir o preço e o percentual novos

#### AC-008 - `preco_custo` e `estoque_atual` não são editáveis pela tela

- **Dado** um produto com preço de custo e estoque atual gravados
- **Quando** o responsável abre a edição desse produto
- **Então** o formulário **não** oferece campo para preço de custo nem para estoque
  atual, e a gravação da edição **não** altera nenhum dos dois

A segunda cláusula é a que carrega o critério. A ausência de campo na interface é
verificável por inspeção do formulário; a ausência de alteração no banco é o que
protege a auditoria de custo, já que `fn_fechar_comanda` lê `preco_custo` ao vivo.

#### AC-009 - `percentual_comissao` é editável, persiste, e vazio significa herdar o padrão

- **Dado** um produto com percentual de comissão próprio gravado
- **Quando** o responsável abre a edição e altera o percentual para outro valor
- **Então** a gravação é aceita e o percentual novo passa a valer para aquele produto

- **Dado** um produto com percentual de comissão próprio gravado
- **Quando** o responsável abre a edição e esvazia o campo de percentual
- **Então** a gravação é aceita e o produto passa a herdar o percentual padrão do
  profissional

Duas propriedades no mesmo critério porque são o mesmo campo. Campo vazio precisa virar
`null` (herda), e não `undefined` (que é descartado na serialização e deixaria o valor
antigo intacto) — mesma armadilha medida no experimento de `servicos`.

#### AC-010 - A edição de `percentual_comissao` vale para comandas ainda abertas

- **Dado** uma comanda **aberta** cujo item é do produto, e uma configuração do
  profissional com comissão sobre produto habilitada
- **Quando** o responsável altera o `percentual_comissao` do produto e a comanda é fechada
  **depois** dessa alteração
- **Então** a comissão apurada no fechamento usa o percentual **novo**

Este é o critério de **semântica de leitura ao vivo**, e é o que a medição do Cenário A
comprova (`10 → 25` antes de fechar rendeu `comissao_valor_snapshot = 25.00`). Sem ele,
a implementação poderia "resolver" o problema de duas maneiras incompatíveis — congelar o
percentual no momento em que o item é adicionado, ou ler ao vivo — e ambas as respostas
passariam num teste que só olhasse comanda fechada.

#### AC-011 - A edição de produto não altera comissão nem valor já apurados

- **Dado** uma comanda **já fechada** cujo item é do produto sendo editado, com o
  percentual e o valor de comissão apurados
- **Quando** o responsável altera o `percentual_comissao` do produto
- **Então** `comissao_percentual_snapshot` e `comissao_valor_snapshot` naquela comanda
  fechada permanecem os mesmos

- **Dado** uma comanda **aberta** cujo item do produto já tem preço unitário e total
  gravados
- **Quando** o responsável altera o `preco_venda` do produto
- **Então** o preço unitário e o total gravados naquele item permanecem os mesmos

Duas preservação de histórico no mesmo critério, e ambas discricinam. A primeira é o
contraponto direto do AC-010: os dois juntos são o que torna a semântica de A e B
verificável, porque um teste que só verificasse a comanda fechada passaria mesmo com a
leitura errada. A segunda é o mesmo mecanismo em `preco_unitario`, que é `NOT NULL` e é
escrito no momento em que o item é adicionado — medido, nenhuma função do banco lê
`produtos.preco_venda` no cálculo.

#### AC-012 - Falha ao salvar produto apresenta mensagem compreensível

- **Dado** um produto em edição
- **Quando** a gravação falha
- **Então** a interface apresenta mensagem de domínio, que declara que a alteração não
  foi salva, que não contém nome de constraint, nem código de erro, nem texto técnico do
  banco, e o produto permanece com os valores anteriores

A cláusula de integridade ("permanece com os valores anteriores") é exigível e
discrimina por si só: um teste que verificasse apenas a presença de um erro na tela
passaria com uma implementação que gravasse e depois falhasse ao exibir.

#### AC-013 - O preço de venda e o percentual são validados antes de salvar

- **Dado** um produto em edição
- **Quando** o responsável informa preço de venda ou percentual de comissão negativo, ou
  percentual acima de 100
- **Então** a gravação não é submetida e o responsável vê a indicação do campo inválido

Medido: o banco aceitou `preco_venda = -1`, `percentual_comissao = 150` e `= -5`.

#### AC-014 - Uma edição de produto que não pode ser concluída não altera o produto

- **Dado** um produto cadastrado, e uma tentativa de edição que a aplicação não consiga
  gravar — por falta de permissão de escrita ou por o registro não existir, as duas
  indistinguíveis na fronteira (D-6)
- **Quando** a tentativa é feita
- **Então** o produto **permanece com os valores anteriores** e a interface apresenta
  mensagem de domínio dizendo que a alteração não foi salva, sem indicar qual das duas
  causas ocorreu e sem detalhe técnico

- **Dado** um produto em edição
- **Quando** o responsável abre a tela, a interface comunica, junto ao campo de
  percentual de comissão, que alterá-lo afeta comandas ainda abertas que usem o produto

O segundo par de cláusulas é o que exige a comunicação: o critério é sobre **o que a
tela diz**, e é discriminado por asserção sobre o texto presente.

## Evidência e estratégia de testes

O comportamento editável é de interface; a semântica de comanda é de banco. A prova é
dividida conforme o risco, e **nem todo AC recebe teste próprio** — um AC pode ser
coberto por um mesmo teste que exercita o caminho, e a quantidade de testes não é
objetivo.

| Onde | ACs | O que a prova discrimina |
|---|---|---|
| pgTAP, novo arquivo | AC-010, AC-011 | a semântica completa de comissão: leitura ao vivo no fechamento de comanda aberta (AC-010) **e** congelamento depois do fechamento, para percentual e para preço (AC-011) — com asserções de controle que provam que a edição de fato ocorreu, e o par só tem valor junto |
| Vitest, API (cliente e produto) | AC-004, AC-006, AC-012, AC-014 | a tradução por igualdade de mensagem, ancorada nas mensagens técnicas medidas; que `23502` e `PGRST116` dão traduções distintas entre si; que código de erro desconhecido segue repassado sem tradução; e que a função de produto não alcança `preco_custo` nem `estoque_atual` |
| Vitest, interface | AC-001, AC-002, AC-003, AC-005, AC-007, AC-008, AC-009, AC-013, AC-014 | abertura preenchida, persistência, exclusão dos campos de custo e estoque, limpeza e gravação do percentual, validação, cancelamento, e o texto que comunica o efeito sobre comandas abertas |

Justificativa de não haver teste 1:1: AC-003, AC-005 e AC-013 são comportamentos de
formulário discriminados no mesmo teste de interação que comprova a abertura e a
gravação. AC-010 e AC-011 ficam no mesmo arquivo pgTAP porque são as duas faces da mesma
semântica — separá-los produziria um arquivo que passa com metade da regra implementada.
AC-014 tem a parte de integridade comprovada na API e a parte de comunicação
discriminada na interface, e as duas são verificadas, cada uma na camada onde a
afirmação é verificável.

**Sobre AC-006 e AC-014, que citam duas causas.** A prova exercita `PGRST116` pelo
caminho que o produz — permissão insuficiente e `id` inexistente — e verifica que
**ambos** deixam o cadastro íntegro e chegam ao chamador sob a **mesma** tradução. Isso é
o que confirma D-6 de forma discriminante: uma implementação que distinguisse as duas, ou
que inventasse um erro diferente para "sem permissão", falharia nesta prova. Nenhuma das
duas causas é invocada pelo nome na tradução, porque a fronteira não as separa.

**O AC-008 exige prova em duas camadas.** A ausência do campo é verificada na interface;
a ausência de alteração no banco é verificada na prova de API, com asserção sobre o
*patch efetivamente enviado* — o objeto que chega ao cliente Supabase não contém
`preco_custo` nem `estoque_atual`. Isso discrimina a proteção real, já que o banco aceita
esses campos (medido), e não apenas a ausência de campo na tela.

**Sobre as mensagens medidas.** As traduções para `PGRST116` e `23502` são ancoradas
nos textos medidos nesta data, e os testes comparam por **igualdade**, nunca por
substring. A razão é a mesma já registrada no experimento: a mensagem técnica de
`23502` contém o nome da coluna e o da tabela, e uma prova por "contém" passaria com a
tradução ausente.

**Sobre a validação de limites (D-5).** A prova da validação é de interface, com
asserção sobre o que aparece e sobre a ausência da chamada de gravação: um teste que
verificasse apenas "o valor não foi persistido" passaria com uma implementação que
simplesmente ignorasse o campo. Por isso a prova exige, além da ausência de chamada, a
presença da indicação de inválido.

## Impacto técnico

- `src/lib/api/clientes.ts` — `updateCliente` ganha tradução de erro. Assinatura
  intacta.
- `src/lib/api/produtos.ts` — `updateProduto` ganha tradução de erro. Assinatura
  intacta, e a exclusão de `preco_custo`/`estoque_atual` do tipo preservada.
- `src/pages/ClientesPage.tsx` — estado de edição, ação na listagem, reconsulta, campo
  de observações (que existia na API mas não no formulário) e validação de e-mail.
- `src/pages/ProdutosPage.tsx` — estado de edição, ação na listagem, reconsulta;
  formulário de edição sem os campos de custo e estoque, e com o texto que comunica o
  efeito do percentual sobre comandas ainda abertas (AC-014) sem alterar o formulário
  de criação; validação de faixa.
- `supabase/tests/` — um arquivo pgTAP novo para AC-010 e AC-011.
- `tests/` — arquivos Vitest de API e de interface.
- Sem migration. Sem alteração de RLS, de schema ou de seed.

## Fora de escopo

- Edição de `profissionais` e de `config_comissoes`: editam a origem do cálculo de
  comissão e têm decisão de produto pendente.
- `servicos`: edição já entregue na branch do experimento; esta feature não a toca.
- Exclusão e desativação, e o filtro de inativos nas listagens.
- Snapshot de nome de cliente. Registrado como limitação conhecida acima.
- `updated_at`: medido, **não** é mantido em UPDATE (a coluna tem `DEFAULT now()` e
  nenhuma função ou trigger a atualiza). Nenhuma tela exibe essa informação hoje, e
  torná-la confiável é feature própria.
- Migration de validação (`CHECK` de faixa ou de formato) no banco.
- Correção das traduções em `createCliente` / `createProduto`: os caminhos de criação
  mantêm o tratamento de erro que já têm, para que o escopo desta feature seja
  exclusivamente a edição.
- Os 9 `VERIFY_OBSOLETO`, o `sinais.json`, o ONP, o Factory Kit, `software-factory.md`.
- Migração para OpenSpec.

## Observações de processo (não confundir com produto)

Registradas sem ação, porque a fábrica está congelada nesta entrega:

- `updated_at` não é mantida em nenhuma das cinco tabelas de cadastro. É dívida
  técnica com impacto de produto futuro, não desta feature.
- As duas traduções de `PGRST116` que esta feature introduzem (cliente e produto) serão
  idênticas em texto. Divergir por entidade daria ao usuário uma informação falsa
  sobre qual cadastro falhou.
- O `sinais.json` desta execução foi reescrito pelo motor com separador corrompido
  (`::—::` virou `::??::` em 32 chaves). Não é alteração de produto.
