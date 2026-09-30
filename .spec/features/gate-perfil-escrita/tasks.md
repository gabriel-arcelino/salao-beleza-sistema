# Tasks: A interface esconde o que o perfil não pode gravar

> feature: gate-perfil-escrita
> spec: `.spec/features/gate-perfil-escrita/spec.md`

<!--
  Toda tarefa referencia em `Refs:` pelo menos uma história de usuário.
  Uma tarefa só pode virar [concluida] quando os critérios de aceite dela
  tiverem prova PASS registrada por `onp-spec verify`.
  Status: pendente | em-andamento | concluida
-->

Duas partes: esconder o que o perfil não pode gravar, e fechar o caminho do erro cru
que essa investigação encontrou. A ordem importa — o gate é o que faz sentido para
quem usa, e a tradução é o que garante a regra depois dele.

## T-072 - Criar a matriz, a leitura do perfil e o hook [concluida]

- Refs: US-036, US-037, AC-095, AC-096, AC-097, AC-098, AC-099, AC-100
- Arquivos: src/types.ts, src/lib/api/usuarios.ts, src/lib/perfil.ts
- Descrição: `PerfilUsuario` nos tipos; `getMeuPerfil()` em `api/usuarios.ts`, seguindo
  o padrão dos outros módulos da API; e em `lib/perfil.ts` a matriz de escrita chaveada
  por **nome de tabela** (D-2), o contexto e o hook `usePerfil()`, que expõe
  `perfil`, `carregando` e `pode(tabela)`. A matriz registra na origem os nomes das
  policies que espelha, para que a revisão veja a correspondência. **Os três desfechos de
  D-3 são o núcleo desta task:** com linha → vale o perfil; sem linha → nenhuma escrita
  (medido: `current_perfil()` é nulo e ele não grava em nada); **falha da consulta →
  mostra as ações**, porque falhar fechado traria um modo de falha novo e a autoridade
  continua sendo a RLS.
- Verificação: `npx tsc -b`, e teste que exija os três desfechos — inclusive que uma
  **falha** da consulta de perfil devolve `pode(...) === true`, que é o contra-intuitivo.

## T-073 - Carregar o perfil uma vez, em quem já é dono da sessão [concluida]

- Refs: US-036, AC-095, AC-097, AC-098, AC-099
- Arquivos: src/App.tsx
- Descrição: `App.tsx` já guarda `autenticado` e escuta `onAuthStateChange`; é ele que
  passa a buscar o perfil e a envolver as abas no provedor. Sem context, as 19 ações
  exigiriam prop drilling por 10 abas, 6 delas sem uso.
- Verificação: `npx tsc -b`, e teste de interface que monte as telas dentro do provedor
  com cada um dos quatro perfis e confirme que a superfície muda.

## T-074 - Gate das quatro telas de cadastro, com a linha que diz por quê [concluida]

- Refs: US-036, US-037, AC-095, AC-098, AC-099, AC-100
- Arquivos: src/pages/ClientesPage.tsx, src/pages/ProdutosPage.tsx, src/pages/ProfissionaisPage.tsx, src/pages/ServicosPage.tsx, src/ui/components/AvisoPerfilSemEscrita.tsx
- Descrição: as quatro telas escondem formulário de cadastro, "Editar", "Desativar" e
  "Reativar", e exibem o componente novo com o nome do perfil (D-4, D-5). Componente
  único nas quatro, não quatro frases — a mensagem é a mesma, e divergir entre telas é
  como a inconsistência começa. **A lista continua renderizando inteira:** esconder a
  escrita não pode custar a leitura, que é aberta a todos do salão (medido, ASM-058).
- Verificação: `npx tsc -b`, e teste para cada uma das quatro telas com `RECEPCAO`,
  `PROFISSIONAL`, `ADMIN` e `GERENTE`.

## T-075 - Gate da comissão e das comandas, preservando o trabalho da recepção [concluida]

- Refs: US-036, AC-098, AC-099, AC-100
- Arquivos: src/pages/ConfigComissoesPage.tsx, src/pages/ComandasPage.tsx
- Descrição: `ConfigComissoesPage` esconde o formulário de criar configuração, mas a
  listagem continua — `RECEPCAO` **lê** comissão e não a escreve. `ComandasPage` esconde
  abrir/item/fechar/cancelar **apenas** para quem não pode, e `RECEPCAO` não perde nada,
  porque `comandas`, `comanda_itens` e `pagamentos` a admitem (medido, ASM-059) e fechar
  comanda é o trabalho dela. **É o critério mais fácil de errar em excesso:** um gate que
  tirasse a recepção da comanda seria pior que o defeito que veio corrigir.
- Verificação: teste que confirma `RECEPCAO` com as quatro ações de comanda disponíveis,
  e que `PROFISSIONAL` não tem nenhuma.

## T-076 - Traduzir a recusa de escrita no create* [concluida]

- Refs: US-038, AC-101, AC-102
- Arquivos: src/lib/api/clientes.ts, src/lib/api/produtos.ts, src/lib/api/profissionais.ts, src/lib/api/servicos.ts, src/lib/api/comandas.ts, src/lib/api/config_comissoes.ts
- Descrição: os seis `create*` que a interface usa recebem tradução de `42501` — que,
  medido, **é o que o `INSERT` recusado levanta**, ao contrário do `UPDATE`, que é
  silencioso. A mensagem não cita código, tabela, `row-level security` nem `PostgREST`.
  Reusa a doutrina de D-3 de `edicao-clientes-produtos`; a diferença aqui é que a recusa
  **é** de permissão, então a mensagem pode dizer que o perfil não grava.
- Verificação: teste de API que faça o `create*` devolver `42501` e confira a mensagem,
  e uma mutação que reintroduza o `throw error` cru tem de fazer o teste reprovar.

## T-077 - Travar a matriz contra o banco [concluida]

- Refs: US-039, AC-103
- Arquivos: supabase/tests/019_gate_perfil_compate_com_rls.sql
- Descrição: pgTAP que lê `pg_policies` e compara a matriz de escrita vigente com a que
  esta spec registra. É a única defesa real contra divergência: sem ela, a cópia do
  cliente pode ficar desatualizada em silêncio, que é o modo de falha clássico de gate
  de permissão — e silencioso, que é o pior tipo.
- Verificação: `npx supabase test db supabase/tests/019_gate_perfil_compate_com_rls.sql`
  passando, e com uma **mutação no banco**: afrouxar uma policy para incluir `RECEPCAO`
  tem de fazer o teste reprovar, provando que ele observa o banco e não uma cópia.

## T-078 - Provar as duas direções do gate [concluida]

- Refs: US-036, US-037, US-038, AC-095, AC-096, AC-097, AC-098, AC-099, AC-100, AC-101, AC-102
- Arquivos: tests/ui/gate-perfil.spec.tsx, tests/api/gate-perfil.spec.ts
- Descrição: **exclusão** — o que o perfil não pode não aparece; **preservação** — o que
  pode continua aparecendo. As duas direções são o ponto: um gate que esconde demais
  também é defeito, e é o erro fácil de cometer aqui. A prova de `RECEPCAO` na comanda é
  a que mais pesa, e a de `ADMIN`/`GERENTE` é a que impede o gate de custar trabalho a
  quem pode.
- Verificação: os dois arquivos passando, e com duas mutações — esconder a ação de
  `GERENTE` tem de reprovar AC-099, e esconder a de comanda da `RECEPCAO` tem de reprovar
  AC-097.

## T-079 - Regressão e fechamento dos gates [concluida]

- Refs: US-036, US-037, US-038, US-039
- Descrição: regressão na suíte de interface e API mais o runner pgTAP, e o fechamento
  dos gates da entrega.
- Verificação: `npx tsc -b` saída 0; suíte completa de vitest saída 0; `onp-feature-verify`
  com os nove critérios PASS; `audit` sem erro; e `onp-combined-verify` (G7) saída 0, com
  o pgTAP conferido à parte — desta vez ele **tem** teste novo, então a conferência não é
  opcional.

## Fora de escopo registrado nas tasks

Nenhuma task cobre tela de usuários, esconder abas ou telas, edição de `profissionais` ou
`config_comissoes`, exclusão física, `updated_at`, `config_comissoes` ganhou `ativo`, nem
filtro em `list*`. A spec lista o mesmo em "Fora de escopo", com a razão de cada exclusão.
