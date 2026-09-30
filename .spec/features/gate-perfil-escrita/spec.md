# Spec: A interface esconde o que o perfil não pode gravar

> feature: gate-perfil-escrita
> status: implementada

## Contexto

Medido nesta rodada: **a palavra `perfil` não aparece nenhuma vez em `src/`**, e
`salon.ts` só chama `supabase.auth.getSession()`. A interface não sabe qual é o perfil
de quem está logado. As 10 abas aparecem para todos, e as **19 ações de escrita** das 6
telas de cadastro, comissão e comandas aparecem para todos.

A RLS, essa sim, sabe. Matriz extraída de `pg_policies` em 2026-09-30:

| Tabela | ADMIN | GERENTE | RECEPCAO | PROFISSIONAL |
|---|---|---|---|---|
| `clientes`, `produtos`, `profissionais`, `servicos` | ✓ | ✓ | — | — |
| `config_comissoes` | ✓ | ✓ | — | — |
| `ajustes_comissao`, `config_taxas`, `despesas`, `fechamentos_comissao`, `motivos_desconto` | ✓ | ✓ | — | — |
| `comandas`, `comanda_itens`, `pagamentos`, `movimentacoes_estoque` | ✓ | ✓ | **✓** | — |
| `usuarios` | ✓ | — | — | — |

Leitura é outra história: as policies de `SELECT` checam **só `salon_id`**. Todos do
salão leem tudo, exceto `usuarios`, que é ADMIN-tudo mais a própria linha. Portanto
**nenhuma tela precisa ser escondida** — o gate é inteiramente sobre ações de escrita.

O modelo é coerente: a recepção opera comandas (abrir, item, fechar, cancelar) e não
toca cadastro nem configuração. O que falta é a interface refletir isso.

## O segundo defeito, encontrado no caminho

A feature de reativar (`reativar-cadastros`) já corrigiu a falha **silenciosa** do
`UPDATE` recusado: sem `.select()`, a recusa devolvia zero linhas e nenhum erro. Ao
medir esta, achei a **assimetria correspondente no `INSERT`**, que continua quebrada:

```
insert into clientes ... ;
ERROR:  new row violates row-level security policy for table "clientes"
```

E `createCliente` faz `throw error` cru, e o `catch` da tela faz
`setErro((e as Error).message)`. Um `RECEPCAO` clicando em "Cadastrar cliente" vê, na
tela, o texto do Postgres **citando o nome da tabela**.

O gate esconde o botão, então na prática o `RECEPCAO` deixa de alcançar esse caminho —
mas não o fecha: a RLS continua sendo a autoridade, e o caso em que o perfil não pôde
ser carregado deixa a ação visível por decisão de projeto (D-3). Traduzir o `42501`
é fechar a regra que as duas features anteriores estabeleceram: nenhum erro cru do banco
chega à tela, por nenhum caminho.

## Decisões desta feature

- **D-1 — o gate é interface; a RLS continua sendo a autoridade.** A interface esconde
  o que o perfil não pode gravar. Ela não é o que impede: `RECEPCAO` poderia chamar
  `createCliente` pelo console e a RLS continuaria recusando. O gate existe para não
  oferecer um clique que vai falhar.
- **D-2 — a matriz é uma constante só, chaveada por nome de tabela.** Nome de tabela é
  o vocabulário da própria RLS: quem lê `clientes_write` no banco lê `clientes` no
  cliente. É essa correspondência que torna a divergência visível na revisão.
- **D-3 — três desfechos para o carregamento do perfil, e o do meio é o que importa.**
  Carregou com linha → o gate vale para aquele perfil. Carregou **sem linha** (órfão
  de cadastro) → **não mostra nenhuma escrita**, e isso não é escolha: medido, um
  autenticado sem linha em `usuarios` tem `current_perfil()` nulo, e toda policy de
  escrita compara com `ANY(...)`, então ele **não grava em nada**. Falha a consulta →
  **mostra as ações**. Falhar fechado aqui traria um modo de falha novo: uma falha de
  rede esconderia a "Abrir comanda" de quem pode abrir. E não é buraco de segurança,
  porque a autoridade continua sendo a RLS, e a recusa agora aparece como mensagem.
- **D-4 — a ação some, e a tela diz por quê.** Não desabilitada: botão desabilitado
  convida a tentativa e é affordance morta, que é o defeito que o gate veio corrigir. E
  sumir sem explicação é indistinguível de "isto não existe". Uma linha curta por tela,
  usando o mesmo componente nas seis.
- **D-5 — uma linha, com o nome do perfil.** "Seu perfil (RECEPCAO) não grava cadastros."
  Nomear o perfil evita a leitura "isto está quebrado", que é o que a ausência silenciosa
  provoca.
- **D-6 — `create*` traduz `42501`.** A recusa de escrita vira mensagem que não cita
  código, tabela nem constraint, pela mesma doutrina de D-3 da feature
  `edicao-clientes-produtos`. **Decisão de escopo minha**, tomada porque a medição
  mostrou o texto cru alcançável e a regra já existe há duas features; se o dono
  preferir adiar, é um commit à parte e reversível.
- **D-7 — a matriz é fixada no banco por teste pgTAP.** `supabase/tests/019` lê
  `pg_policies` e compara com a matriz que esta spec registra. O banco é a autoridade,
  e o teste é o que **trava** essa autoridade contra a cópia do cliente. Sem ele, a
  matriz do cliente pode divergir em silêncio, que é o modo de falha clássico de gate
  de permissão.

## Histórias

### US-036 - Quem não pode gravar não vê o botão de gravar

Como recepção do salão, quero que as telas mostrem só o que eu de fato posso usar, para
não descobrir que não posso, clicando.

#### AC-095 - RECEPÇÃO não vê nenhuma ação de escrita de cadastro

- **Dado** um usuário com perfil `RECEPCAO`
- **Quando** ele abre as telas de clientes, produtos, profissionais e serviços
- **Então** nenhuma delas oferece formulário de cadastro, botão de editar, de desativar
  ou de reativar

#### AC-096 - RECEPÇÃO não vê a configuração de comissão

- **Dado** um usuário com perfil `RECEPCAO`
- **Quando** ele abre a tela de configuração de comissão
- **Então** ele continua **lendo** as configurações existentes, mas o formulário de criar
  uma nova não é oferecido

#### AC-097 - RECEPÇÃO continua operando comandas

- **Dado** um usuário com perfil `RECEPCAO`
- **Quando** ele abre a tela de comandas
- **Então** ele continua podendo abrir comanda, adicionar item, fechar e cancelar

Este critério é a trava contra o gate excessivo. `comandas`, `comanda_itens` e
`pagamentos` admitem `RECEPCAO`, e fechar uma comanda **é** o trabalho da recepção. Um
gate que a impedisse de fechar a comanda seria pior que o defeito.

#### AC-098 - PROFISSIONAL, que não grava nada, não vê nenhuma escrita

- **Dado** um usuário com perfil `PROFISSIONAL`
- **Quando** ele percorre as seis telas de escrita
- **Então** nenhuma oferece ação de gravar

#### AC-099 - ADMIN e GERENTE não perdem nenhuma ação

- **Dado** um usuário com perfil `ADMIN` e outro com `GERENTE`
- **Quando** eles percorrem as seis telas
- **Então** todas as 19 ações de escrita continuam disponíveis

### US-037 - A pessoa sabe por que a ação não está lá

#### AC-100 - A tela diz que o perfil não grava

- **Dado** um usuário cujo perfil não pode gravar naquela tela
- **Quando** ele a abre
- **Então** a tela exibe uma mensagem dizendo que o perfil não grava, **nomeando o
  perfil**, e a mensagem não contém código, nome de tabela nem a palavra "RLS"

### US-038 - A RLS continua decidindo, e a recusa é comunicada

#### AC-101 - Uma escrita recusada pelo banco chega como mensagem de domínio

- **Dado** um usuário que consegue ver a ação, mas cuja escrita é recusada pelo banco
- **Quando** ele tenta gravar
- **Então** a tela exibe mensagem de domínio, e a recusa **não** é convertida em
  sucesso silencioso nem em erro cru

#### AC-102 - Uma inserção recusada pelo RLS não vaza detalhe técnico

- **Dado** uma inserção recusada pela policy, que chega como `42501`
- **Quando** a aplicação a traduz
- **Então** a mensagem não contém `42501`, `PostgREST`, `row-level security`, nem nome
  de tabela

### US-039 - O gate não diverge do banco

#### AC-103 - A matriz da interface confere com as policies do banco

- **Dado** as policies de escrita vigentes no banco
- **Quando** um teste compara a matriz que esta spec registra com o que o banco
  realmente permite
- **Então** a comparação passa, e uma alteração em `pg_policies` faz o teste reprovar

## Evidência G4 e G5 - verificação no aplicativo

**G4 (QA funcional): N/A, e a justificativa é mais forte que nas features anteriores.**
Toda a decisão desta feature veio de **medição na fronteira real**, não de leitura de
código, e a medição é o que a implementação espelha:

| Afirmação | Como foi medida | Onde a medição mora |
|---|---|---|
| a matriz de escrita | extração de `pg_policies` | `supabase/tests/019`, que a **re-deriva a cada execução** |
| RECEPCAO opera comanda | `comandas_write` admite `RECEPCAO` | idem |
| PROFISSIONAL não grava nada | não aparece em nenhuma das 15 policies | idem |
| órfão não grava nada | `achou_a_si=0` + `INSERT` levanta `row-level security` | teste de API, cabeçalho |
| `INSERT` recusa ≠ `UPDATE` recusa | `ERROR` vs `UPDATE 0` | idem |

A matriz do cliente é conferida contra o banco por teste, com mutação no banco: afrouxar
`clientes_write` para incluir `RECEPCAO` fez **dois** testes reprovarem (a comparação da
matriz e o "RECEPCAO não grava cadastro"). A policy foi restaurada e a suíte voltou ao
verde. Ou seja: o comportamento que o gate promete **está sendo observado no banco**, não
representado por um mock.

O que um teste de interface não cobre, e que continua valendo de `reativar-cadastros`: a
forma da consulta. Aqui isso é irrelevante por construção — a feature não muda nenhuma
cadeia de consulta, só o que a interface renderiza.

**G5 (QA visual): N/A.** Não há cor, tipografia, espaçamento ou estado novo. A única
peça visual nova é o `AvisoPerfilSemEscrita`, que é um `<p role="status">` sem estilo
próprio. **Resíduo honesto:** ninguém viu a tela com o aviso. O risco aqui é de **tom** —
a frase nomeia o perfil e diz que a leitura continua, mas se lê mal para o usuário real é
julgamento de leitura, e ele exige olho humano.

## Impacto técnico

- `src/perfil/` — a matriz, o contexto e o hook `usePerfil()`. Arquivos novos.
- `src/App.tsx` — carrega o perfil junto com a sessão e envolve as abas no provedor. É
  quem já é dono do estado de autenticação.
- `src/lib/api/{clientes,produtos,profissionais,servicos,config_comissoes,comandas}.ts` —
  tradução de `42501` no `create*`.
- 6 telas — esconder a superfície de escrita e exibir a linha de perfil.
- `supabase/tests/019_gate_perfil_compate_com_rls.sql` — a trava anti-deriva.
- `src/types.ts` — o tipo de perfil, se ainda não existir.

## Fora de escopo

- **Gerenciar usuários.** `usuarios_write` é ADMIN-only e **não há tela** para isso.
  Esconder ações de uma tela que não existe não é gate, é nada.
- **Esconder telas ou abas.** A leitura é aberta a todos do salão (medido), então não
  há o que esconder.
- **Tabela de usuários na interface**, e o fato de `PROFISSIONAL` não ter nenhuma escrita:
  é consequência da matriz medida, não uma escolha. Registrado, não "resolvido".
- **Erro de ação em slot dedicado** separado do `erro` de carregamento (D-6 de
  `reativar-cadastros`).
- **`updated_at`**, `config_comissoes` ganhou `ativo`, edição de `profissionais` e
  `config_comissoes`, exclusão física, filtro em `list*`, e os `VERIFY_OBSOLETO`.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| ASM-056 | A interface não sabe o perfil de quem está logado. | confirmada | `git grep perfil -- src` retorna zero. `salon.ts` só chama `getSession()`. `App.tsx` guarda só `autenticado: boolean`. |
| ASM-057 | O cliente pode ler o próprio perfil. | confirmada | Existe `usuarios_select_own` (`auth_user_id = auth.uid()`). Medido como `RECEPCAO`: `linhas_visiveis=1`, `meu_perfil=RECEPCAO`, `viu_admin=0`. A consulta é escopada pela RLS a uma linha e não enumera usuários. |
| ASM-058 | Leitura é aberta a todos do salão. | confirmada | As policies de `SELECT` de `clientes`, `produtos`, `profissionais`, `servicos`, `comandas` e `config_comissoes` são apenas `salon_id = auth_helpers.current_salon_id()`. |
| ASM-059 | `RECEPCAO` pode operar comandas. | confirmada | `comandas_write`, `comanda_itens_write` e `pagamentos_write` admitem `ARRAY['ADMIN','GERENTE','RECEPCAO']`. |
| ASM-060 | `PROFISSIONAL` não grava em nada. | confirmada | Não aparece em nenhuma policy de escrita das 15 tabelas medidas. |
| ASM-061 | Um autenticado sem linha em `usuarios` não grava nada. | confirmada | Medido em 2026-09-30: `achou_a_si=0`, e o `INSERT` em `clientes` levanta `new row violates row-level security policy`. Toda policy de escrita compara `current_perfil()` com `ANY(...)`, e nulo não pertence a nenhuma lista. |
| ASM-062 | `INSERT` recusado levanta erro; `UPDATE` recusado é silencioso. | confirmada | Medido: `INSERT` dá `ERROR: new row violates row-level security policy`; `UPDATE` dá `UPDATE 0` sem erro. Por isso `reativar-cadastros` precisou de `.select()` e o `create*` precisa de tradução. |

## Perguntas em aberto

Nenhuma bloqueia a execução. A única decisão de escopo — incluir a tradução do `42501` —
foi tomada por mim e está registrada em D-6, para o dono vetar.

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| Q-035 | Traduzir o `42501` do `create*` nesta feature, ou deixar para depois? | respondida | **Incluir agora**, por mim. O gate esconde o botão mas não fecha o caminho: a RLS é a autoridade, e D-3 mantém as ações visíveis quando o perfil não carrega. A regra de "nenhum erro cru na tela" já vale há duas features e o texto cru foi medido alcançável. Reversível: é um commit isolado. |
| Q-036 | Esconder a ação ou desabilitá-la? | respondida | **Esconder**, e dizer por quê. Botão desabilitado é affordance morta, que é o defeito que o gate veio corrigir; e sumir sem frase explica nada. Ver D-4 e D-5. |
| Q-037 | PROFISSIONAL não tem nenhuma escrita. Isso é certo? | respondida | **Fica como está.** A matriz é medida, não escolhida, e corrigi-la é decisão de produto sobre o que um profissional faz no sistema. Registrado em "Fora de escopo". |