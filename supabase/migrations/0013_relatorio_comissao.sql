-- ============================================================================
-- Migration 0013: fn_relatorio_comissao
-- ============================================================================

create or replace function fn_relatorio_comissao(
    p_competencia text,
    p_profissional_id_param uuid
)
returns table (
    competencia text,
    profissional_id uuid,
    items jsonb,
    total_bruto numeric(10,2),
    total_comissao numeric(10,2)
)
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_salon_id uuid := auth_helpers.current_salon_id();
begin
    if v_salon_id is null then
        raise exception 'Sessão sem salon_id — usuário não autenticado corretamente.';
    end if;

    if auth_helpers.current_perfil() not in ('ADMIN', 'GERENTE') then
        raise exception 'Apenas ADMIN ou GERENTE podem consultar o relatório de comissão.';
    end if;

    if p_competencia !~ '^\d{4}-\d{2}$' then
        raise exception 'Competência deve estar no formato YYYY-MM.';
    end if;

    -- Verifica se o profissional pertence ao salão
    if not exists (
        select 1 from public.profissionais
        where id = p_profissional_id_param and salon_id = v_salon_id
    ) then
        raise exception 'Profissional % não encontrado neste salão.', p_profissional_id_param;
    end if;

    return query
    with salon_check as (
        select v_salon_id as salon_id
    ),
    items_data as (
        select
            ci.comanda_id,
            c.numero,
            cl.nome as cliente_nome,
            ci.tipo as item_tipo,
            ci.descricao_snapshot,
            ci.quantidade,
            ci.preco_unitario,
            ci.total,
            ci.comissao_percentual_snapshot,
            ci.comissao_valor_snapshot
        from public.comanda_itens ci
        join public.comandas c on c.id = ci.comanda_id
        join public.clientes cl on cl.id = c.cliente_id
        where ci.salon_id = (select salon_id from salon_check)
          and ci.profissional_id = p_profissional_id_param
          and c.status = 'FINALIZADA'
          and to_char(c.closed_at, 'YYYY-MM') = p_competencia
    ),
    totals as (
        select
            coalesce(sum(total), 0) as total_bruto,
            coalesce(sum(comissao_valor_snapshot), 0) as total_comissao_raw
        from items_data
    ),
    adiantamentos as (
        select coalesce(sum(valor), 0) as total_adiantamentos
        from public.despesas
        where salon_id = (select salon_id from salon_check)
          and profissional_id = p_profissional_id_param
          and categoria = 'ADIANTAMENTO'
          and to_char(data_competencia, 'YYYY-MM') = p_competencia
    ),
    ajustes as (
        select coalesce(sum(valor), 0) as total_ajustes
        from public.ajustes_comissao
        where salon_id = (select salon_id from salon_check)
          and profissional_id = p_profissional_id_param
          and competencia_lancamento = p_competencia
    )
    select
        p_competencia as competencia,
        p_profissional_id_param as profissional_id,
        coalesce(
            jsonb_agg(
                jsonb_build_object(
                    'comandaId', comanda_id,
                    'numero', numero,
                    'clienteNome', cliente_nome,
                    'itemTipo', item_tipo,
                    'descricaoSnapshot', descricao_snapshot,
                    'quantidade', quantidade,
                    'precoUnitario', preco_unitario,
                    'total', total,
                    'comissaoPercentualSnapshot', comissao_percentual_snapshot,
                    'comissaoValorSnapshot', comissao_valor_snapshot
                )
                order by comanda_id
            ) filter (where comanda_id is not null),
            '[]'::jsonb
        ) as items,
        total_bruto,
        greatest((select total_comissao_raw from totals) - (select total_adiantamentos from adiantamentos) + (select total_ajustes from ajustes), 0) as total_comissao
    from items_data, totals, adiantamentos, ajustes
    group by total_bruto, total_comissao_raw, total_adiantamentos, total_ajustes;
end;
$$;