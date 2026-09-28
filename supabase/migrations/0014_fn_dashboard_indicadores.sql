-- ============================================================================
-- Migration 0014: fn_dashboard_indicadores
--
-- Indicadores do dashboard executivo por competência mensal (YYYY-MM).
-- Implementa o §16 do plano (plano-arquitetura-salao-beleza-v2_5.md) para as
-- métricas desta feature: Faturamento, Receita líquida, CMV e Despesas.
--
-- PRINCÍPIO DE FONTE DE VERDADE — esta função DELEGA, não reimplementa:
--   Faturamento     -> public.fn_relatorio_caixa(...).total_vendas
--   Receita líquida -> public.fn_relatorio_caixa(...).total_entradas
--   CMV             -> public.fn_calcular_cmv(p_competencia)
--   Despesas        -> agregação própria (ver nota de duplicação abaixo)
--
-- DUPLICAÇÃO DELIBERADA E ÚNICA: a soma de despesas.
--   Origem da semântica: 0012_relatorio_caixa.sql:64-71 e :85, que somam
--   despesas.valor por data_pagamento SEM checar status. Em 0012 ela é fundida
--   com fechamentos_comissao.total_pago em total_saidas (:108), e não há campo
--   de despesas isolado. Extrair exigiria reescrever 0012, o que a decisão de
--   produto proíbe. Duplica-se portanto UM agregado, sem semântica de período
--   além de data_pagamento e sem filtro de status. É a única fórmula nova.
--
-- CONSTRAINT: search_path é vazio por segurança (ver 0007), portanto TODA
-- chamada interna precisa ser qualificada. Sem o prefixo public. a função não
-- compila — comportamento verificado, não presumido.
--
-- Por que tem_movimento: o AC-053 exige distinguir "sem dado" de "R$ 0,00
-- apurado", e um numeric sozinho não faz essa distinção. Definição derivada da
-- decisão de produto (ASM-022 na spec dashboard-gerencial): vale uma linha de
-- origem em pagamentos, despesas OU movimentação de estoque VENDA.
-- ============================================================================

create or replace function public.fn_dashboard_indicadores(
    p_competencia text
)
returns table (
    faturamento     numeric,
    receita_liquida numeric,
    despesas        numeric,
    cmv             numeric,
    tem_movimento   boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_salon_id uuid := auth_helpers.current_salon_id();
    v_ini      date;
    v_fim      date;
    v_fat      numeric;
    v_liq      numeric;
    v_desp     numeric;
    v_cmv      numeric;
    v_mov      boolean;
begin
    -- Guarda de contexto: sem salão a função aborta, nunca devolve zero.
    -- Mesma mensagem de 0012 e 0011, para que a falha seja ruidosa e uniforme.
    if v_salon_id is null then
        raise exception 'Sessão sem salon_id — usuário não autenticado corretamente.';
    end if;

    if p_competencia !~ '^\d{4}-\d{2}$' then
        raise exception 'Competência deve estar no formato YYYY-MM.';
    end if;

    v_ini := (p_competencia || '-01')::date;
    v_fim := (date_trunc('month', v_ini)::date + interval '1 month - 1 day')::date;

    -- DELEGAÇÃO 1: faturamento e receita líquida vêm da função de caixa.
    -- Não reimplementados aqui. O intervalo é derivado da competência, o que é
    -- aritmética de calendário, não regra de negócio.
    select c.total_vendas, c.total_entradas
      into v_fat, v_liq
    from public.fn_relatorio_caixa(v_ini, v_fim) c;

    -- ÚNICA FÓRMULA NOVA: despesas isoladas. Alinhada a 0012:64-71,85 —
    -- por data_pagamento, sem filtro de status.
    select coalesce(sum(d.valor), 0)
      into v_desp
    from public.despesas d
    where d.salon_id = v_salon_id
      and d.data_pagamento between v_ini and v_fim;

    -- DELEGAÇÃO 2: CMV. A função já é por competência; recebe o parâmetro direto.
    v_cmv := public.fn_calcular_cmv(p_competencia);

    -- tem_movimento: existe ao menos UMA linha de origem em qualquer das três.
    -- movimentacoes_estoque entra porque venda de produto sem pagamento é
    -- possível (vendas parcialmente pagas, §10.7 do plano): sem ela, uma
    -- competência com produto vendido e não pago cairia em "sem movimento"
    -- exibindo R$ 0,00 de Faturamento ao lado de um CMV apurado.
    select
           exists (
               select 1 from public.pagamentos pg
               where pg.salon_id = v_salon_id
                 and pg.paid_at::date between v_ini and v_fim
           )
        or exists (
               select 1 from public.despesas dd
               where dd.salon_id = v_salon_id
                 and dd.data_pagamento between v_ini and v_fim
           )
        or exists (
               select 1 from public.movimentacoes_estoque ms
               where ms.salon_id = v_salon_id
                 and ms.tipo = 'VENDA'
                 and ms.created_at::date between v_ini and v_fim
           )
      into v_mov;

    return query select v_fat, v_liq, v_desp, v_cmv, v_mov;
end;
$$;
