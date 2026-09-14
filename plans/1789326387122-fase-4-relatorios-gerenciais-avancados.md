# Plano: Fase 4 – Relatórios gerenciais avançados

## Contexto
- O sistema já possui:
  - Cadastros (Fase 1)
  - RPCs financeiras (Fase 2): fn_fechar_comanda, fn_cancelar_comanda, fn_estornar_pagamento, fn_fechar_competencia_comissao
  - Estoque/CMV (Fase 3): fn_calcular_cmv, dashboard com alertas, relatório de estoque negativo
- O próximo passo é implementar relatórios gerenciais avançados conforme roadmap.
- Status atual (conforme PROGRESS.md): Testes RLS e RPCs financeiras passando, build frontend sucesso, Supabase local funcionando.

## Objetivo
Implementar dois relatórios gerenciais:
1. Relatórios de fechamento de caixa (diário, semanal, mensal)
2. Relatórios de comissão por profissional (acumulado, por serviço/produto, por período)

## Decisões de arquitetura
- Os relatórios serão implementados como funções SQL (security definer) que retornam dados agregados.
- Cada relatório terá uma API correspondente em `src/lib/api/relatorios.ts`.
- Frontend: criar páginas `RelatorioCaixaPage.tsx` e `RelatorioComissaoPage.tsx` com filtros de período e visualização em tabelas/gráficos.
- Atualizar `App.tsx` com novas abas sob um grupo "Relatórios" (mantendo a mesma estrutura de abas individuais).
- Usar as mesmas convenções de segurança: funções security definer com `set search_path = ''` e `auth_helpers.current_salon_id()`.
- Os relatórios devem ser filtráveis por competência (mês/ano) ou intervalo de datas (para o relatório de caixa) e por profissional e período (para o relatório de comissão).

## Tarefas
1. Criar migration 0012_relatorio_caixa.sql com função `fn_relatorio_caixa(p_data_inicio date, p_data_fim date)` que retorna:
   - data_inicio, data_fim
   - total_vendas (somatório de pagamentos.valor_bruto)
   - total_entradas (somatório de pagamentos.valor_liquido)
   - total_saidas (somatório despesas.valor + somatório fechamentos_comissao.total_pago)
   - saldo_inicial (calculado como total_entradas - total_saidas do período anterior ao início)
   - saldo_final (saldo_inicial + total_entradas - total_saidas do período)
   - Observação: O cálculo de saldo_inicial e saldo_final pode ser complexo; considerar usar uma abordagem cumulativa ou simplificar para o período se necessário.
2. Criar migration 0013_relatorio_comissao.sql com função `fn_relatorio_comissao(p_competencia text, p_profissional_id uuid)` que retorna:
   - Detalhamento das comissões do profissional na competência, incluindo:
     - comanda_id, numero, cliente_nome
     - item_tipo, descricao_snapshot, quantidade, preco_unitario, total
     - comissao_percentual_snapshot, comissao_valor_snapshot
   - Além de totais: total_bruto, total_comissao, etc.
3. Criar testes pgTAP para cada função (0012 e 0013) com cenários de entrada variada.
4. Criar `src/lib/api/relatorios.ts` com funções:
   - `getRelatorioCaixa(inicio: string, fim: string): Promise<RelatorioCaixa[]>`
   - `getRelatorioComissao(competencia: string, profissionalId: string): Promise<RelatorioComissao[]>`
5. Criar `src/pages/RelatorioCaixaPage.tsx` e `src/pages/RelatorioComissaoPage.tsx` com formulários de filtro e exibição de dados.
   - RelatorioCaixaPage: campos de data de início e fim, botão filtrar, tabela ou card com os resultados.
   - RelatorioComissaoPage: campos de mês/ano (competência) e seleção de profissional, botão filtrar, tabela com detalhamento e totais.
6. Atualizar `src/App.tsx` para incluir as novas abas no array `ABAS`:
   - { id: "relatorio-caixa", label: "Fechamento de Caixa", Component: RelatorioCaixaPage }
   - { id: "relatorio-comissao", label: "Comissão por Profissional", Component: RelatorioComissaoPage }
7. Atualizar `src/types.ts` com novas interfaces para os dados dos relatórios:
   - interface RelatorioCaixa { data_inicio: string; data_fim: string; total_vendas: number; total_entradas: number; total_saidas: number; saldo_inicial: number; saldo_final: number; }
   - interface RelatorioComissaoItem { comandaId: string; numero: number; clienteNome: string; itemTipo: 'SERVICO' | 'PRODUTO'; descricaoSnapshot: string; quantidade: number; precoUnitario: number; total: number; comissaoPercentualSnapshot: number | null; comissaoValorSnapshot: number | null; }
   - interface RelatorioComissao { items: RelatorioComissaoItem[]; totalBruto: number; totalComissao: number; }
8. Executar `npx supabase db reset`, `npx supabase test db` e `npm run build` para validar.
9. Validar manualmente o fluxo de relatórios no frontend.

## Critérios de aceitação
- Todos os testes pgTAP passam.
- O frontend builda sem erros.
- Os relatórios retornam dados corretos para cenários de teste.
- A UI exibe os dados de forma legível e permite filtragem por período/profissional.

## Riscos
- Complexidade de joins entre múltiplas tabelas (comandas, pagamentos, movimentacoes_estoque, ajustes_comissao, despesas, fechamentos_comissao) pode impactar performance em grandes volumes; considerar adicionar índices se necessário.
- Necessidade de tratar fusos horários e datas corretamente (usar `created_at` ou `paid_at` conforme contexto). Para o relatório de caixa, usar `paid_at` dos pagamentos e `data_pagamento` das despesas.
- O cálculo de saldo_inicial para o relatório de caixa pode ser oneroso; considerar se o requisito de saldo inicial e final é essencial ou se pode ser substituído por totais do período.

## Próximos passos após este plano
- Validar manualmente os relatórios no ambiente local.
- Considerar implementação de exportação CSV/PDF e agendamento de envio (e‑mail) como melhorias futuras.