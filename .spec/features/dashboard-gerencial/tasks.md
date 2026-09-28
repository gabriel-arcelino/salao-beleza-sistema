# Tasks: Dashboard gerencial

> feature: dashboard-gerencial

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

## Tasks não escritas nesta etapa

Esta feature está na fase de **especificação (G1)**. O escopo está fechado e os
critérios de aceite estão redigidos em `spec.md` (AC-047 a AC-055), mas as tasks
**não** foram decompostas.

A decompposição é a etapa seguinte do processo e depende de uma escolha que ainda
não fiz: **paralelizar ou sequencial**. Com 9 critérios de aceite distribute entre
migration SQL, camada de API e apresentação, é provável que existam faixas
paralelas com arquivos disjuntos — mas isso é escolha de quem executa, e registrar
a ordem aqui antes de perguntar seria antecipar a decisão.

O placeholder que o gerador criou (`T-001`, com `Refs: US-021, AC-047` e
`Arquivos: src/exemplo.js`) foi **removido** em vez de deixado: `src/exemplo.js`
não existe, faria o audit acusar `ARQUIVO_INEXISTENTE` na raiz, e uma task
pendente apontando para arquivo inexistente é ruído que esconde defeito real.

Nenhum `T-xxx` foi consumido. O próximo livre é **T-028**.
