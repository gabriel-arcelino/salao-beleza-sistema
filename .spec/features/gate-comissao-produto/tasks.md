# Tasks: Gate de comissão sobre produto

> feature: gate-comissao-produto

<!--
  Como ler este arquivo (o formato é verificado por `onp-spec audit`):
  - T-xxx = tarefa (código de rastreio, único no projeto inteiro).
  - Toda tarefa referencia em `Refs:` pelo menos uma história de usuário
    (US-xxx) ou critério de aceite (AC-xxx).
  - Toda tarefa lista os arquivos que cria/altera em `Arquivos:` — capriche:
    é o que decide o que `onp-spec plano` roda em PARALELO (arquivos
    disjuntos) e o que roda em sequência.
  - Campos opcionais por tarefa, usados pelo plano de execução:
    `- Modelo: claude-sonnet-5` e `- Esforço: alto` (baixo|medio|alto|xalto|max).
  - Uma tarefa só pode virar [concluida] quando os critérios de aceite dela
    tiverem prova PASS registrada por `onp-spec verify`.
  Status: pendente | em-andamento | concluida
    (atalho: `onp-spec tarefa <feature> <T-xxx> <status>`)
-->

## T-027 — Testar o ramo desligado do gate de comissão sobre produto [concluida]
- Refs: US-020, AC-046
- Arquivos: supabase/tests/014_fn_fechar_comanda_gate_comissao_produto.sql
- Esforço: baixo
- Notas: criar o arquivo pgTAP `014_fn_fechar_comanda_gate_comissao_produto.sql`,
  **espelhando** `supabase/tests/005_fn_fechar_comanda_produto_estoque.sql` e
  mudando apenas duas coisas: `comissao_sobre_produto` de `true` para `false` na
  inserção de `config_comissoes`, e a asserção esperada de `7.50` para `0.00`.
  Manter `produtos.percentual_comissao = 15` preenchido — é essa combinação
  (gate desligado **com** percentual de produto) que nunca foi testada e que dá
  poder discriminante ao AC. Reusar os mesmos ids do `005` (`…0101`
  profissional, `…0301` produto, salão `…0001`) e o mesmo bloco de usuário
  `40000000-…-000c/…-000d`; usar ids de comanda e item **novos** (`…002a` /
  `…002b`) para não colidir com o `005` caso as execuções se sobreponham.
  Usar `begin` / `select plan(1)` / `set local role authenticated` /
  `select * from finish()` / `rollback`. O **título** da asserção `results_eq`
  precisa conter `@spec:AC-046` — é o título que o motor `onp-spec verify`
  lê; tag em comentário não produz prova. Não alterar
  `fn_fechar_comanda`, migrations, `seed.sql` nem `src/`. Se o teste reprovar,
  isso é **achado de defeito** e a tarefa não pode ser marcada como concluída
  por ajuste do valor esperado: o valor esperado vem de
  `plano-arquitetura-salao-beleza-v2_4.md:952` e de
  `0004_fn_fechar_comanda.sql:221-223`, não do resultado observado.
