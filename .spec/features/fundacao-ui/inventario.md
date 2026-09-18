# Inventario
> feature: fundacao-ui
> tarefa: T-006

---

## 1. Observado — layout

- App.tsx: container raiz usa style={{ fontFamily: "sans-serif", padding: "2rem" }}. Nenhum layout responsivo formal; apenas padding fixo.
- DashboardPage.tsx: grid de 2 colunas (gridTemplateColumns: "1fr 1fr") com maxWidth: 700. Em telas menores, o grid pode quebrar sem media queries.
- RelatorioCaixaPage.tsx e RelatorioComissaoPage.tsx: tabelas com width: "100%", sem scroll horizontal em telas estreitas.
- ComandasPage.tsx: lista (ul) e formularios empilhados verticalmente; sem container de largura maxima.

## 2. Problema — layout

- Nao ha sistema de grade responsivo; maxWidth: 700 no Dashboard limita conteudo em desktop mas nao garante adaptacao em mobile.
- ontFamily: "sans-serif" e uma constante inline repetida; se alterada, precisa ser editada em cada arquivo.

## 3. Hipotese / recomendacao — layout

- Criar constantes de layout (spacing, maxContentWidth) no escopo inicial; usar apenas quando justificar reutilizacao.

---

## 4. Observado — navegacao

- App.tsx: navegacao por abas horizontais com display: flex, gap: 8, lexWrap: "wrap". Botoes simples (utton sem ria-pressed ou ria-current).
- Nenhuma indicacao de pagina ativa alem de ontWeight: "bold". Sem ria-label, ria-selected ou foco visivel definido.
- A ordem das abas segue a sequencia de fases (Dashboard, Cadastros, Comandas, Relatorios).

## 5. Problema — navegacao

- A aba ativa nao e comunicada a leitores de tela; ontWeight e apenas visual.
- Sem ria-current="page" ou ria-selected="true".

## 6. Hipotese / recomendacao — navegacao

- Adicionar ria-current na aba ativa; considerar componente Button reutilizavel com variante ctive apenas quando justificado pelo uso real (Dashboard e App).

---

## 7. Observado — botoes e acoes

- App.tsx: botoes de aba e "Sair" com estilos minimos (ontWeight para ativo, marginLeft: "auto").
- DashboardPage.tsx: sem botoes de interacao; apenas exibicao.
- ComandasPage.tsx: botoes para "Ver", "Cancelar", "Abrir comanda", "Adicionar item", "Fechar comanda". Estilos minimos, sem disabled visual consistente (exceto no "Fechar").
- RelatorioCaixaPage.tsx: botao "Filtrar" com 	ype="submit".
- Nenhum componente Button compartilhado; cada pagina define estilos inline.

## 8. Problema — botoes

- Sem padrao visual de botao (cor primaria, hover, disabled). Cada pagina repete style manualmente.
- Nenhum feedback de loading no clique (exceto setCarregando que so altera texto, nao o botao).

## 9. Hipotese / recomendacao — botoes

- Criar Button apenas se usado em pelo menos 2 paginas; no escopo atual, Dashboard nao precisa de botao, mas App.tsx e ComandasPage.tsx sim.

---

## 10. Observado — formularios e campos

- App.tsx: nao ha formularios.
- DashboardPage.tsx: nao ha campos de entrada (apenas exibicao).
- RelatorioCaixaPage.tsx: label com htmlFor implicito (texto dentro do label, input aninhado). input com 	ype="date", equired, style={{ display: "block", marginTop: 4 }}.
- RelatorioComissaoPage.tsx: label com texto e input/select aninhados; pattern="^\d{4}-\d{2}$" para competencia; equired presente.
- ComandasPage.tsx: multiplos select e input sem label explicito (texto ao lado ou acima, mas sem label com htmlFor); equired usado. Nenhum ria-label.

## 11. Problema — formularios

- ComandasPage.tsx: campos (select, input) sem label associado; acessibilidade comprometida.
- Nenhum componente FormField reutilizavel; estilos repetidos (display: "block", marginTop: 4).
- Nenhum foco visual definido (outline removido por padrao no browser, mas sem substituicao).

## 12. Hipotese / recomendacao — formularios

- Criar FormField reutilizavel com label obrigatorio, equired, ria-label opcional; usado no Dashboard se houver filtros futuros e nas paginas de formulario existentes. Justificado pelo uso real em pelo menos RelatorioCaixaPage, RelatorioComissaoPage e ComandasPage.

---

## 13. Observado — tabelas / cards

- DashboardPage.tsx: cards com order, orderRadius, padding, ox-shadow ausente. Dois cards lado a lado (1fr 1fr).
- RelatorioCaixaPage.tsx: tabela com orderCollapse: "collapse", orderBottom: "1px solid #ddd", padding: 8. Sem cabecalhos com contraste definido.
- RelatorioComissaoPage.tsx: tabela similar, com marginBottom, padding, orderTop para totais.
- Nenhum componente Card compartilhado; cada pagina define div com order manualmente.

## 14. Problema — tabelas / cards

- Estilos de card repetidos no Dashboard; tabela sem scope nos cabecalhos, sem caption, sem ria-label.
- Nenhum componente Table ou Card reutilizavel.

## 15. Hipotese / recomendacao — tabelas / cards

- Card justificado: usado no Dashboard (dois cards) e potencialmente em outras paginas de relatorio.
- Table pode ser considerado, mas como nao ha alteracao global, apenas documentar o padrao para uso futuro.

---

## 16. Observado — estados de loading, vazio e erro

- DashboardPage.tsx:
  - loading: cmv !== null ? ... : <p>Carregando...</p> (apenas no card CMV, nao no estoque negativo).
  - vazio: estoqueNegativo.length > 0 ? ... : <p>Todos os produtos com estoque positivo</p> (mensagem positiva, nao vazio explicito).
  - erro: <p style={{ color: "crimson" }}>{erro}</p>.
- RelatorioCaixaPage.tsx:
  - loading: <p>Carregando...</p>.
  - vazio: <p>Nenhum registro encontrado para o intervalo informado.</p>.
  - erro: <p style={{ color: "crimson" }}>{erro}</p>.
- ComandasPage.tsx:
  - loading: <p>Carregando...</p>.
  - vazio: nao ha mensagem explicita para lista de comandas vazia; apenas ul vazio.
  - erro: <p style={{ color: "crimson" }}>{erro}</p>.

## 17. Problema — estados

- Loading: texto simples (Carregando...), sem spinner ou componente padronizado. No Dashboard, o card de estoque negativo nao mostra loading durante a requisicao inicial (apenas apos carregar() ser chamada, mas antes do resultado, estoqueNegativo esta vazio, o que exibe a mensagem positiva incorretamente durante o carregamento).
- Vazio: Dashboard nao tem mensagem de vazio para estoque negativo (exibe "Todos os produtos com estoque positivo" mesmo quando ainda nao carregou); ComandasPage nao trata lista vazia de comandas.
- Erro: padrao visual consistente (crimson), mas sem componente reutilizavel.

## 18. Hipotese / recomendacao — estados

- Loading: componente simples com texto configuravel; usado no Dashboard (para corrigir o estado inicial) e preservado nas paginas existentes.
- EmptyState: componente para mensagem de vazio; usado no Dashboard (estoque negativo sem registros) e documentado para ComandasPage.
- ErrorMessage: componente reutilizavel; ja existe padrao em todas as paginas.

---

## 19. Observado — estilos repetidos

- ontFamily: "sans-serif" — App.tsx (linha 47).
- padding: "2rem" — App.tsx (linha 47).
- color: "crimson" — DashboardPage.tsx (linha 32), RelatorioCaixaPage.tsx, RelatorioComissaoPage.tsx, ComandasPage.tsx.
- order: "1px solid #e0e0e0" — DashboardPage.tsx (cards).
- display: "flex", gap: 8, alignItems: "center" — RelatorioCaixaPage.tsx, RelatorioComissaoPage.tsx, ComandasPage.tsx.
- marginBottom: 24, marginTop: 16, marginTop: 18 — repetidos em multiplos arquivos.
- orderRadius: 8, padding: 16 — DashboardPage.tsx.
- orderCollapse: "collapse" — tabelas nos relatorios.

## 20. Problema — estilos

- Nenhum token de cor, tipografia ou espaco centralizado. Qualquer alteracao de paleta exige edicao manual em multiplos arquivos.
- Nenhuma variavel CSS global ou constante TypeScript para cores/espacamento.

## 21. Hipotese / recomendacao — estilos

- Definir colors.ts, 	ypography.ts, spacing.ts com constantes simples; nao criar design system completo. Justificado pelo uso real em App.tsx, DashboardPage.tsx e paginas de relatorio.

---

## 22. Observado — responsividade

- App.tsx: lexWrap: "wrap" na navegacao; sem breakpoints.
- DashboardPage.tsx: grid de 2 colunas sem minmax ou uto-fit; pode quebrar em telas estreitas.
- Tabelas (RelatorioCaixaPage.tsx, RelatorioComissaoPage.tsx): width: "100%", sem overflow-x: auto ou min-width por coluna.
- ComandasPage.tsx: formularios com display: "flex", sem lexWrap; pode sobrepor elementos em telas menores.

## 23. Problema — responsividade

- Nenhuma media query; nenhum uso de unidades relativas para layout (em usado apenas em padding, mas nao como base responsiva).
- Tabelas podem exceder largura do container sem scroll.

## 24. Hipotese / recomendacao — responsividade

- Nao implementar layout responsivo completo nesta fase; apenas documentar os pontos criticos (grid do Dashboard, tabelas de relatorio, formularios em ComandasPage) para futuras iteracoes.

---

## 25. Observado — acessibilidade

- Nenhum ria-label nos botoes da navegacao (App.tsx).
- Nenhum ria-current ou ria-selected para aba ativa (App.tsx).
- label presente em RelatorioCaixaPage.tsx e RelatorioComissaoPage.tsx, mas sem htmlFor explicito (texto dentro do label com input aninhado — funciona, mas nao e ideal para leitores de tela).
- ComandasPage.tsx: label ausente; apenas texto ao lado do campo.
- Nenhum lt ou ria-describedby.
- Nenhum ocus-visible definido; o foco padrao do navegador pode ser invisivel se estilos globais o removem.
- Nenhum ole ou landmark (main, 
av, header) usado.

## 26. Problema — acessibilidade

- App.tsx: navegacao sem semantica (
av sem ria-label); botoes sem ria-pressed.
- DashboardPage.tsx: section sem ria-label; cards sem ria-label ou ole="region".
- ComandasPage.tsx: campos sem label associado; select sem ria-label.

## 27. Hipotese / recomendacao — acessibilidade

- Corrigir label associado nos formularios (DashboardPage se adicionados filtros; ComandasPage ja existente); nao alterar codigo nesta tarefa, apenas documentar.
- Adicionar ria-label basico nos componentes reutilizaveis (Loading, EmptyState, ErrorMessage, Card) quando criados.

---

## 28. Candidatos a componentes reutilizaveis (justificados)

### Card
- Justificativa: usado no Dashboard (dois cards lado a lado); padrao de order, orderRadius, padding, ox-shadow ausente mas replicavel. Se criado, deve aceitar 	itle e children como props.
- Arquivos afetados: DashboardPage.tsx; potencialmente RelatorioCaixaPage.tsx (cards de resultados) se evoluido.

### Button
- Justificativa: usado em App.tsx (abas, sair), ComandasPage.tsx (multiplos botoes), RelatorioCaixaPage.tsx e RelatorioComissaoPage.tsx (filtrar). Sem componente, cada pagina define style manualmente.
- Arquivos afetados: App.tsx, ComandasPage.tsx, RelatorioCaixaPage.tsx, RelatorioComissaoPage.tsx.

### Loading
- Justificativa: padrao repetido (<p>Carregando...</p>) em DashboardPage.tsx, RelatorioCaixaPage.tsx, RelatorioComissaoPage.tsx, ComandasPage.tsx. Componente simples com texto configuravel resolve duplicacao.
- Arquivos afetados: todas as paginas listadas.

### EmptyState
- Justificativa: DashboardPage.tsx precisa de mensagem de vazio para estoque negativo; RelatorioCaixaPage.tsx e RelatorioComissaoPage.tsx ja tem mensagens de vazio, mas sem componente. ComandasPage.tsx nao trata vazio.
- Arquivos afetados: DashboardPage.tsx (prioritario), paginas de relatorio.

### ErrorMessage
- Justificativa: padrao color: "crimson" repetido em todas as paginas; componente simples com prop message padroniza a exibicao.
- Arquivos afetados: todas as paginas com erro.

### FormField
- Justificativa: RelatorioCaixaPage.tsx, RelatorioComissaoPage.tsx e ComandasPage.tsx usam label + input/select com estilos repetidos (display: "block", marginTop: 4). Componente unifica acessibilidade (label associado, equired, pattern) e reduz duplicacao.
- Arquivos afetados: RelatorioCaixaPage.tsx, RelatorioComissaoPage.tsx, ComandasPage.tsx.

---

## 29. Observado — contratos de dados

- DashboardPage.tsx: consome getProdutosEstoqueNegativo() e calcularCMV() de src/lib/api/estoque.
- Nenhuma alteracao nos contratos observada; os dados retornados sao arrays ou numeros.
- A interface atual nao introduz novas camadas (domain/, epositories/, services/); mantem a arquitetura simples vigente.

## 30. Problema — contratos

- Nenhum problema arquitetural; a preservacao esta confirmada.

---

## Resumo executivo (para auditoria)

- Inventario criado: .spec/features/fundacao-ui/inventario.md.
- Nenhum arquivo em src/ alterado; nenhum componente implementado.
- Nenhuma biblioteca instalada; package.json preservado.
- Os padroes repetidos (ontFamily, padding, color: crimson, Carregando..., card com order) sao documentados e candidatos a componentes sao justificados pelo uso real em pelo menos uma pagina.
- Acessibilidade: problemas identificados em App.tsx (navegacao), DashboardPage.tsx (cards sem label), ComandasPage.tsx (campos sem label associado).
- Responsividade: pontos criticos documentados (grid do Dashboard, tabelas de relatorio, formularios em ComandasPage).
- Estado: DashboardPage.tsx tem loading parcial (apenas CMV) e vazio implicito; ComandasPage.tsx nao trata lista vazia.
- Nenhuma tarefa posterior executada.
