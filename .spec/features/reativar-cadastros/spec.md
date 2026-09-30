# Spec: Reativar um cadastro desativado

> feature: reativar-cadastros
> status: implementada

## Contexto

Medido nesta rodada: **desativar é irreversível pela aplicação.** As quatro entidades de
cadastro têm `desativar*`, a interface tem o botão, e **não existe nenhuma operação de
reativar** — nenhuma escrita em `ativo = true` em todo o código. Um cadastro desativado
permanece listado, marcado "(inativo)", e aceita edição, mas nunca mais volta ao uso.

A feature anterior (`cadastros-inativos-operacoes-novas`) tornou isso mais visível: o
inativo deixou de ser oferecido nas operações novas, então a desativação agora tem
consequência real e sem volta.

O banco não impede a volta. Medido:

| Verificação | Resultado |
|---|---|
| Policy de UPDATE nas 4 tabelas | só checa `salon_id` e perfil — **não olha `ativo`** |
| Triggers nas 4 tabelas | **zero** |
| Check constraints nas 4 tabelas | **zero** |
| Ciclo `ativo=false` → `ativo=true` como ADMIN autenticado | `UPDATE 1` → registro volta a `ativo = t` |

## O segundo defeito: a falha de escrita é silenciosa

Ao medir o par, achei um problema que não estava no escopo pedido e que o dono
aprovou corrigir junto.

`desativar*` faz `update({ ativo: false }).eq("id", id)` — **sem `.select()` e sem
`.single()`**. E a medição de fronteira de 2026-09-29 registra o motivo pelo qual isso
importa:

> **não existe 42501.** O RLS negado não levanta erro: o UPDATE devolve zero linhas em
> silêncio, e o erro nasce do próprio `.single()` do cliente.

Ou seja, `update*` **detecta** a recusa porque pede `.select().single()` e traduz o
`PGRST116`. `desativar*` **não pede**, então não há erro para traduzir. Medido agora,
como RECEPCAO:

```
UPDATE 0
nome     | ativo
Cliente Alvo | t
```

A policy `clientes_write` só admite ADMIN e GERENTE, então alguém com o perfil
`RECEPCAO` clica em
"Desativar", a escrita afeta 0 linhas, **nenhum erro é levantado**, a tela recarrega e o
registro continua ativo. A pessoa não recebe nenhum sinal. Um botão novo de "Reativar"
nasceria com o mesmo defeito.

## Decisões desta feature

- **D-1 — `ativar*` é função própria na API, não campo do formulário.** As quatro
  `update*` aceitam `Partial<Pick<T, ...>>` com allowlist explícita de colunas, e
  **`ativo` não está em nenhuma delas**. Ou seja, a edição não *pode* reativar: é o tipo
  que impede, não disciplina. Reativar é uma escrita própria, simétrica a `desativar*`.
- **D-2 — `desativar*` e `ativar*` passam a usar `.select().single()`, igual a
  `update*`.** É a correção mínima que faz o par coerente, e não exige mecanismo novo:
  o `PGRST116` nasce do `.single()` e a tradução **já existe** no arquivo, com o mesmo
  texto por entidade. Sem o `.select()`, a falha continua invisível.
- **D-3 — a mensagem não diz se o registro existe.** Mesma doutrina de D-6 da feature
  `edicao-clientes-produtos`: "sem permissão" e "registro inexistente" são
  indistinguíveis na fronteira, e separá-las seria oráculo de existência para quem não
  pode ver a linha. A mensagem fala só que a gravação falhou.
- **D-4 — "Reativar" não pede confirmação.** Desativar pede porque retira o registro do
  uso; reativar é o inverso e é trivialmente reversível. Um `confirm()` em ação
  inofensiva treina o descarte do diálogo, e aí a confirmação que importa perde força.
- **D-5 — o botão usa `variant="primary"`, e não `destructive`.** `destructive` é o
  rótulo da ação que tira; `primary` é a afirmativa. E em `ProfissionaisPage` a linha
  fica com **um botão só**, porque `updateProfissional` é órfã (medido) e a tela não tem
  edição — o botão de reativar é a única ação naquela linha.
- **D-6 — a falha reusa o estado `erro` da página.** As quatro telas já têm `erro`,
  `setErro` e `<ErrorMessage onRetry={carregar} />` (medido). Reutilizar é o padrão da
  casa e não custa estado novo. **Contrapartida aceita:** o padrão substitui a lista
  inteira pela mensagem, então uma recusa de permissão some com a lista até o usuário
  clicar em tentar de novo. Um slot separado só para erro de ação seria melhor UX, mas
  é refatoração das quatro telas e não cabe aqui.
- **D-7 — sem gate de perfil nesta feature.** Medido: a palavra `perfil` aparece **zero
  vezes** em `src/`, e `salon.ts` só chama `supabase.auth.getSession()`. O cliente não
  sabe o perfil de quem está logado, então esconder a ação exigiria um mecanismo que
  não existe. Construí-lo é feature própria (Q-033).

## Histórias

### US-033 - O responsável reativa o que desativou por engano

Como responsável pelo salão, quero reativar um cadastro que desativei sem querer, para
não ter que recadastrar o cliente, o serviço ou o profissional.

#### AC-089 - A linha de um cadastro inativo oferece a ação de reativar

- **Dado** um cliente, um produto, um profissional e um serviço, todos desativados
- **Quando** o responsável abre cada uma das quatro telas de cadastro
- **Então** a linha do inativo oferece a ação de reativar

#### AC-090 - O cadastro reativado volta a ser oferecido nas operações novas

- **Dado** um serviço e um profissional desativados
- **Quando** o responsável os reativa e abre a tela de comandas e a de comissão
- **Então** os dois voltam a aparecer entre as opções de operação nova

Este critério é o que prova que a feature entrega o **efeito**, e não só o mecanismo.
Uma prova que só verificasse `ativo` virando `true` passaria mesmo se o filtro da
feature anterior tivesse deixado de existir.

#### AC-091 - O cadastro reativado deixa de parecer inativo

- **Dado** um cadastro marcado como inativo
- **Quando** o responsável o reativa
- **Então** a linha deixa de exibir a marca de inativo e passa a oferecer a ação de
  desativar

#### AC-092 - Um cadastro ativo não oferece a ação de reativar

- **Dado** um cadastro ativo
- **Quando** o responsável olha a linha
- **Então** a ação de reativar não é oferecida, e a de desativar é

### US-034 - Reativar não é um atalho para editar

#### AC-093 - Salvar a edição de um cadastro inativo não o reativa

- **Dado** um cadastro desativado
- **Quando** o responsável o edita e salva
- **Então** ele continua desativado

O critério existe porque as duas ações escrevem na mesma linha e a mesma coluna. Sem
ele, uma implementação que colocasse `ativo` no payload da edição reativaria o
cadastro como efeito colateral de salvar um nome.

### US-035 - A falha de escrita é visível

#### AC-094 - Uma escrita que não acontece vira mensagem, não silêncio

- **Dado** um cadastro que o responsável não consegue desativar nem reativar
- **Quando** a ação não puder ser gravada
- **Então** a tela exibe uma mensagem explicando que a gravação não foi feita, o
  cadastro **continua como estava na tela**, e a mensagem não contém código, nome de
  tabela nem identificador do registro

## Evidência e estratégia de testes

Seis critérios, e a divisão não é por entidade: é por **tipo de prova**.

| AC | O que prova | Onde |
|---|---|---|
| AC-089 | a linha inativa oferece a volta, nas quatro telas | interface |
| AC-090 | o reativado **volta a ser oferecido** na operação nova | interface, com loja mutável |
| AC-091 | a linha troca de marca e de botão ao alternar | interface |
| AC-092 | a linha ativa não oferece a volta | interface |
| AC-093 | salvar a edição de um inativo não o reativa | interface, asserção sobre o patch |
| AC-094 | escrita recusada vira mensagem, e o registro não muda | interface + fronteira |

**A loja do teste de interface é mutável de propósito.** Se `ativar*` não alterasse
nada, o registro voltaria a aparecer na operação nova por acidente do mock e AC-090
passaria sem que a feature fizesse nada. As telas recarregam depois da ação, então o
efeito aparece como na aplicação.

**AC-093 prova o tipo, não o efeito.** A proteção real é que `ativo` não está na
allowlist de `update*`; a asserção é sobre o patch efetivamente enviado. Um teste que
só conferisse o resultado passaria se a reativação viesse por outro caminho.

**Duas mutações foram executadas**, e elas caem em camadas diferentes — o que é
justamente o ponto:

| Mutação | Quem detectou | Quem NÃO detectou |
|---|---|---|
| tirar o filtro de `ativo` dos serviços em `ComandasPage` | AC-090, 1 dos 3 casos | os outros 8 |
| quebrar a cadeia de `desativar*` (sem `.select()`) | teste de fronteira, 3 grupos | **teste de interface: exit 0** |

A segunda linha da tabela é o achado mais útil desta feature. A task previa que o
teste de interface pegasse a quebra da cadeia; **medido, ele não pega**, porque mocka a
camada da API e nunca executa a consulta. Um teste de interface não atesta a forma da
consulta. Isso é a justificativa de AC-094 ter metade na fronteira.

## Evidência G4 e G5 - verificação no aplicativo

**G4 (QA funcional): N/A.** As duas metades do comportamento estão cobertas por
automação, e a lacuna que a automação deixa — a fronteira real — está fechada por
**composição de duas medições**, não por suposição:

| Perna | Onde foi medida | O que estabelece |
|---|---|---|
| A recusa do RLS devolve 0 linhas e não levanta erro | `tests/api/reativar-cadastros.spec.ts`, cabeçalho, medido em 2026-09-30 como `RECEPCAO` | que `UPDATE 0` é o resultado, e que não há 42501 |
| `update().eq().select().single()` devolve `PGRST116` para `RECEPCAO` | `tests/api/cadastros.spec.ts`, medido em 2026-09-29 pela fronteira real | que o `.single()` transforma 0 linhas em erro |
| a cadeia nova de `desativar*`/`ativar*` é **idêntica** à de `update*` | código, verificado por leitura | que as duas pernas acima se aplicam |
| o ciclo `ativo=false` → `ativo=true` grava | 2026-09-30, `UPDATE 1` como ADMIN | que reativar funciona no banco |

Cada perna já foi medida; esta feature só usa a cadeia que já foi medida. Nada rests
em "deve funcionar".

**O que NÃO foi verificado, e fica como resíduo honesto:** ninguém olhou a linha
renderizada. A única coisa que a leitura de tela acrescentaria é perceptual — se
"Reativar", preenchido em `primary`, lê bem ao lado de "Editar" em `neutral` na mesma
linha. Os botões usam variantes já existentes do design system e nenhum CSS novo foi
escrito, então a herança visual está garantida por construção; o julgamento aesthetic
não está.

**G5 (QA visual): N/A**, pelo mesmo motivo — não há cor, tipografia, espaçamento,
largura ou estado novo. Os dois estados perceptíveis que a feature produz (a linha
inativa ganha um botão; a falha substitui a lista pela mensagem) já são afirmados no
DOM pelos testes de AC-089 e AC-094, incluindo a asserção de que a recarga **não**
acontece quando a escrita falha.

## Impacto técnico

- `src/lib/api/{clientes,produtos,profissionais,servicos}.ts` — nova função `ativar*` por
  arquivo, e `desativar*` passa a `.select().single()` com tradução de `PGRST116`.
  Quatro arquivos, mesma forma.
- `src/pages/{ClientesPage,ProdutosPage,ProfissionaisPage,ServicosPage}.tsx` — o botão
  de reativar na linha inativa, e `try/catch` nas duas ações para que a falha chegue ao
  `erro` da página.
- `tests/ui/` e `tests/api/` — provas de interface e de tradução de erro.
- `supabase/`, migrations, RLS, RPCs, tipos: **sem alteração**.

## Fora de escopo

- **Gate de perfil na interface.** Medido como mecanismo inexistente; decisão do dono em
  Q-033, feature própria.
- **Erro de ação em slot dedicado**, separado do `erro` de carregamento (D-6).
- **Edição de `profissionais` e `config_comissoes`**: `updateProfissional` e
  `updateConfigComissao` seguem órfãs (medido). Esta feature não as adotta.
- **Exclusão física**, desativação em cascata, `config_comissao` ganhou `ativo`.
- **Comissão e preço "de volta ao valor antigo"**: reativar não desfaz nada. Preço e
  comissão são estado vivo e independente; se mudaram enquanto o cadastro estava
  inativo, o valor atual é o que vale (Q-034).
- **`updated_at`**, que existe nas quatro tabelas e não é atualizado em escrita.
  Restrição permanente em pé, não tocada aqui.
- Filtro de inativos em `list*`, a feature anterior, e os 9 `VERIFY_OBSOLETO`.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| ASM-051 | Reativar é tão permitido pelo banco quanto desativar. | confirmada | As 4 policies de UPDATE checam só `salon_id` e perfil, nunca `ativo`. Zero triggers e zero check constraints nas 4 tabelas. Ciclo medido como ADMIN autenticado: `UPDATE 1`, registro volta a `ativo = t`. |
| ASM-052 | A recusa de RLS não levanta erro; ela devolve zero linhas. | confirmada | Medido como RECEPCAO: `UPDATE 0`, registro segue `ativo = t`. Coerente com a medição de 2026-09-29, que registra o `PGRST116` nascendo do `.single()` do cliente, não de um código de erro do Postgres. |
| ASM-053 | A edição não consegue reativar, porque o tipo não permite. | confirmada | As 4 `update*` aceitam `Partial<Pick<T, ...>>` e `ativo` não consta em nenhuma das allowlists. |
| ASM-054 | As quatro telas têm onde exibir a falha. | confirmada | As quatro declaram `erro`, importam `setErro` e renderizam `<ErrorMessage message={erro} onRetry={carregar} />`. |
| ASM-055 | O cliente não sabe o perfil de quem está logado. | confirmada | `git grep perfil -- src` retorna zero ocorrências. `salon.ts` chama apenas `supabase.auth.getSession()`, que devolve a sessão, não o perfil. |

## Perguntas em aberto

Nenhuma bloqueia a execução: as duas decisões de produto que a feature toca já foram
respondidas nesta rodada.

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| Q-032 | Reativar deve pedir confirmação, como desativar? | respondida | **Não.** Decisão D-4. A confirmação que importa é a da ação destrutiva; colocá-la também na inversa treina o descarte. |
| Q-033 | O gate de perfil deveria entrar nesta feature? | respondida | **Não, feature própria.** Decisão do dono, com a medição de que o mecanismo não existe. Registrado em "Fora de escopo" e D-7. |
| Q-034 | Reativar deve restaurar comissão e preço anteriores? | respondida | **Não, e não faria sentido.** Reativar não é desfazer: o cadastro é um registro vivo, e preço e configuração de comissão são estado independente e atual. Se o preço mudou enquanto o serviço estava inativo, o preço atual é o correto ao voltar. |
