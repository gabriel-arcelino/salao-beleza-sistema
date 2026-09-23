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
          and ci.comissao_processada = false
    ),
    items_agg as (
        select coalesce(
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
        ) as items
        from items_data
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
          and public.despesas.profissional_id = p_profissional_id_param
          and categoria = 'ADIANTAMENTO'
          and to_char(data_competencia, 'YYYY-MM') = p_competencia
    ),
    ajustes as (
        select coalesce(sum(valor), 0) as total_ajustes
        from public.ajustes_comissao
        where salon_id = (select salon_id from salon_check)
          and public.ajustes_comissao.profissional_id = p_profissional_id_param
          and competencia_lancamento = p_competencia
    )
    select
        p_competencia as competencia,
        p_profissional_id_param as profissional_id,
        items_agg.items,
        totals.total_bruto,
        greatest(totals.total_comissao_raw - adiantamentos.total_adiantamentos + ajustes.total_ajustes, 0) as total_comissao
    from items_agg, totals, adiantamentos, ajustes;
end;
$$;

-- ============================================================================
-- Test 013: fn_relatorio_comissao
-- ============================================================================

-- Idempotent fixtures: create required tables if not present (isolates feature)
create extension if not exists "pgcrypto";
alter table public.pagamentos add column if not exists estornado boolean not null default false;
create table if not exists public.saloes (id uuid primary key default gen_random_uuid(), nome text not null, ativo boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.usuarios (id uuid primary key default gen_random_uuid(), salon_id uuid not null references public.saloes(id), auth_user_id uuid not null unique, nome text not null, perfil text not null, profissional_id uuid, ativo boolean not null default true, created_at timestamptz not null default now());
create table if not exists public.profissionais (id uuid primary key default gen_random_uuid(), salon_id uuid not null references public.saloes(id), nome text not null, telefone text, comissao_percentual_padrao numeric(5,2) not null default 0, ativo boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.clientes (id uuid primary key default gen_random_uuid(), salon_id uuid not null references public.saloes(id), nome text not null, telefone text, email text, observacoes text, ativo boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.servicos (id uuid primary key default gen_random_uuid(), salon_id uuid not null references public.saloes(id), nome text not null, categoria text, preco numeric(10,2) not null, duracao_minutos integer, ativo boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.comandas (id uuid primary key default gen_random_uuid(), salon_id uuid not null references public.saloes(id), numero bigint generated always as identity, uuid_cliente uuid not null unique, cliente_id uuid references public.clientes(id), profissional_id uuid references public.profissionais(id), status text not null default 'ABERTA', subtotal numeric(10,2) not null default 0, desconto numeric(10,2) not null default 0, total numeric(10,2) not null default 0, opened_at timestamptz not null default now(), closed_at timestamptz, created_by uuid references public.usuarios(id), closed_by uuid references public.usuarios(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.comanda_itens (id uuid primary key default gen_random_uuid(), salon_id uuid not null references public.saloes(id), comanda_id uuid not null references public.comandas(id), tipo text not null, servico_id uuid references public.servicos(id), produto_id uuid, descricao_snapshot text not null, quantidade numeric(10,2) not null default 1, data_atendimento timestamptz, preco_unitario numeric(10,2) not null, desconto numeric(10,2) not null default 0, motivo_desconto_id uuid, total numeric(10,2) not null, profissional_id uuid references public.profissionais(id), comissao_percentual_snapshot numeric(5,2), comissao_valor_snapshot numeric(10,2), comissao_processada boolean not null default false, fechamento_comissao_id uuid, created_at timestamptz not null default now());
create table if not exists public.pagamentos (id uuid primary key default gen_random_uuid(), salon_id uuid not null references public.saloes(id), comanda_id uuid not null references public.comandas(id), metodo text not null, valor_bruto numeric(10,2) not null, taxa_percentual numeric(5,2) not null default 0, taxa_valor numeric(10,2) not null default 0, valor_liquido numeric(10,2) not null, parcelas integer default 1, identificador_transacao text, data_liquidacao_bancaria date, paid_at timestamptz not null default now(), estornado boolean not null default false, created_at timestamptz not null default now());
create table if not exists public.despesas (id uuid primary key default gen_random_uuid(), salon_id uuid not null references public.saloes(id), descricao text not null, categoria text, tipo text not null default 'FIXA', valor numeric(10,2) not null, profissional_id uuid references public.profissionais(id), data_competencia date not null, data_pagamento date, status text not null default 'PENDENTE', observacao text, created_by uuid references public.usuarios(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.fechamentos_comissao (id uuid primary key default gen_random_uuid(), salon_id uuid not null references public.saloes(id), profissional_id uuid not null references public.profissionais(id), competencia text not null, status text not null default 'ABERTO', total_bruto_calculado numeric(10,2) not null default 0, total_adiantamentos_abatidos numeric(10,2) not null default 0, saldo_anterior_competencia numeric(10,2) not null default 0, total_ajustes numeric(10,2) not null default 0, total_pago numeric(10,2) not null default 0, saldo_devedor_gerado numeric(10,2) not null default 0, fechado_em timestamptz, fechado_por uuid references public.usuarios(id), created_at timestamptz not null default now());
create table if not exists public.ajustes_comissao (id uuid primary key default gen_random_uuid(), salon_id uuid not null references public.saloes(id), profissional_id uuid not null references public.profissionais(id), competencia_origem text, competencia_lancamento text not null, comanda_item_id uuid references public.comanda_itens(id), valor numeric(10,2) not null, motivo text not null, created_by uuid references public.usuarios(id), created_at timestamptz not null default now());
create table if not exists public.config_comissoes (id uuid primary key default gen_random_uuid(), salon_id uuid not null references public.saloes(id), profissional_id uuid not null references public.profissionais(id), servico_id uuid references public.servicos(id), comissao_percentual numeric(5,2), base_calculo text not null default 'BRUTO', rateio_taxa text not null default 'SALAO', rateio_taxa_por_forma_pagamento jsonb, comissao_sobre_produto boolean not null default false, timing_repasse text not null default 'IMEDIATO', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (salon_id, profissional_id, servico_id));

create or replace function fn_relatorio_comissao(p_competencia text, p_profissional_id_param uuid) returns table (competencia text, profissional_id uuid, items jsonb, total_bruto numeric(10,2), total_comissao numeric(10,2)) language plpgsql security definer set search_path = '' as $$ declare v_salon_id uuid := auth_helpers.current_salon_id(); begin if v_salon_id is null then raise exception 'Sessão sem salon_id — usuário não autenticado corretamente.'; end if; if auth_helpers.current_perfil() not in ('ADMIN', 'GERENTE') then raise exception 'Apenas ADMIN ou GERENTE podem consultar o relatório de comissão.'; end if; if p_competencia !~ '^\d{4}-\d{2}$' then raise exception 'Competência deve estar no formato YYYY-MM.'; end if; if not exists (select 1 from public.profissionais where id = p_profissional_id_param and salon_id = v_salon_id) then raise exception 'Profissional % não encontrado neste salão.', p_profissional_id_param; end if; return query with salon_check as (select v_salon_id as salon_id), items_data as (select ci.comanda_id, c.numero, cl.nome as cliente_nome, ci.tipo as item_tipo, ci.descricao_snapshot, ci.quantidade, ci.preco_unitario, ci.total, ci.comissao_percentual_snapshot, ci.comissao_valor_snapshot from public.comanda_itens ci join public.comandas c on c.id = ci.comanda_id join public.clientes cl on cl.id = c.cliente_id where ci.salon_id = (select salon_id from salon_check) and ci.profissional_id = p_profissional_id_param and c.status = 'FINALIZADA' and to_char(c.closed_at, 'YYYY-MM') = p_competencia and ci.comissao_processada = false), items_agg as (select coalesce(jsonb_agg(jsonb_build_object('comandaId', comanda_id, 'numero', numero, 'clienteNome', cliente_nome, 'itemTipo', item_tipo, 'descricaoSnapshot', descricao_snapshot, 'quantidade', quantidade, 'precoUnitario', preco_unitario, 'total', total, 'comissaoPercentualSnapshot', comissao_percentual_snapshot, 'comissaoValorSnapshot', comissao_valor_snapshot) order by comanda_id) filter (where comanda_id is not null), '[]'::jsonb) as items from items_data), totals as (select coalesce(sum(total), 0) as total_bruto, coalesce(sum(comissao_valor_snapshot), 0) as total_comissao_raw from items_data), adiantamentos as (select coalesce(sum(valor), 0) as total_adiantamentos from public.despesas where salon_id = (select salon_id from salon_check) and public.despesas.profissional_id = p_profissional_id_param and categoria = 'ADIANTAMENTO' and to_char(data_competencia, 'YYYY-MM') = p_competencia), ajustes as (select coalesce(sum(valor), 0) as total_ajustes from public.ajustes_comissao where salon_id = (select salon_id from salon_check) and public.ajustes_comissao.profissional_id = p_profissional_id_param and competencia_lancamento = p_competencia) select p_competencia as competencia, p_profissional_id_param as profissional_id, items_agg.items, totals.total_bruto, greatest(totals.total_comissao_raw - adiantamentos.total_adiantamentos + ajustes.total_ajustes, 0) as total_comissao from items_agg, totals, adiantamentos, ajustes; end; $$;

begin;

-- Insert test data (executed as superuser, bypassing RLS)
-- Insert saloon
insert into public.saloes (id, nome) values
('00000000-0000-0000-0000-000000000001', 'Salão Teste')
on conflict do nothing;

-- Insert usuario (for created_by/closed_by foreign keys)
insert into public.usuarios (id, salon_id, auth_user_id, nome, perfil, profissional_id, ativo, created_at)
values ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Admin User', 'ADMIN', null, true, now())
on conflict do nothing;

-- Insert profissional
insert into public.profissionais (id, salon_id, nome, telefone, comissao_percentual_padrao, ativo, created_at, updated_at)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000001', 'Prof Test', '(11) 9999-9999', 0, true, now(), now())
on conflict do nothing;

-- Insert cliente
insert into public.clientes (id, salon_id, nome, telefone, email, observacoes, ativo, created_at, updated_at)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000001', 'Cliente Test', '(11) 8888-8888', 'test@example.com', 'Obs', true, now(), now())
on conflict do nothing;

-- Insert servico (for comission)
insert into public.servicos (id, salon_id, nome, preco)
values ('cccccccc-cccc-cccc-cccc-cccccccccccc', '00000000-0000-0000-0000-000000000001', 'Serviço Teste', 100.00)
on conflict do nothing;

-- Insert config_comissoes (default)
insert into public.config_comissoes (salon_id, profissional_id, servico_id, comissao_percentual, base_calculo, rateio_taxa, comissao_sobre_produto, timing_repasse)
values ('00000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null, 20, 'BRUTO', 'SALAO', false, 'IMEDIATO')
on conflict do nothing;

-- Insert comanda (finalizada) within competência 2026-01
insert into public.comandas (id, salon_id, uuid_cliente, cliente_id, profissional_id, status, subtotal, desconto, total, opened_at, closed_at, created_by, closed_by, created_at, updated_at)
values ('dddddddd-dddd-dddd-dddd-dddddddddddd', '00000000-0000-0000-0000-000000000001', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'FINALIZADA', 100.00, 0, 100.00, '2026-01-05', '2026-01-15', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', now(), now())
on conflict do nothing;

-- Insert comanda_item for the above comanda (serviço)
insert into public.comanda_itens (id, salon_id, comanda_id, tipo, servico_id, descricao_snapshot, quantidade, preco_unitario, total, profissional_id, comissao_percentual_snapshot, comissao_valor_snapshot, comissao_processada)
values ('ffffffff-ffff-ffff-ffff-ffffffffffff', '00000000-0000-0000-0000-000000000001', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'SERVICO', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Serviço Teste', 1, 100.00, 100.00, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 20, 20.00, false)
on conflict do nothing;

-- Insert a comanda_item that is already processed (should be excluded)
insert into public.comandas (id, salon_id, uuid_cliente, cliente_id, profissional_id, status, subtotal, desconto, total, opened_at, closed_at, created_by, closed_by, created_at, updated_at)
values ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'FINALIZADA', 50.00, 0, 50.00, '2026-01-08', '2026-01-20', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', now(), now())
on conflict do nothing;

insert into public.comanda_itens (id, salon_id, comanda_id, tipo, servico_id, descricao_snapshot, quantidade, preco_unitario, total, profissional_id, comissao_percentual_snapshot, comissao_valor_snapshot, comissao_processada)
values ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'SERVICO', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Serviço Teste', 1, 50.00, 50.00, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 20, 10.00, true) -- already processed
on conflict do nothing;

-- Insert an adiantamento (despesa) within competência 2026-01
insert into public.despesas (id, salon_id, descricao, categoria, tipo, valor, profissional_id, data_competencia, data_pagamento, status, observacao, created_by, created_at, updated_at)
values ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000001', 'Adiantamento teste', 'ADIANTAMENTO', 'VARIAVEL', 30.00, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-01-10', '2026-01-10', 'PAGO', 'Obs', '00000000-0000-0000-0000-000000000001', now(), now())
on conflict do nothing;

-- Insert an ajuste de comissão (positive) within competência 2026-01
insert into public.ajustes_comissao (id, salon_id, profissional_id, competencia_origem, competencia_lancamento, valor, motivo, created_by)
values ('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null, '2026-01', 15.00, 'Teste', '00000000-0000-0000-0000-000000000001')
on conflict do nothing;

-- Insert another ajuste negativo (to test subtraction)
insert into public.ajustes_comissao (id, salon_id, profissional_id, competencia_origem, competencia_lancamento, valor, motivo, created_by)
values ('66666666-6666-6666-6666-666666666666', '00000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null, '2026-01', -5.00, 'Teste', '00000000-0000-0000-0000-000000000001')
on conflict do nothing;

-- Simulate an authenticated admin user for the function calls
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-000000000001", "role": "authenticated", "app_metadata": {"salon_id": "00000000-0000-0000-0000-000000000001"}}', true);

-- Plan 5 tests
select plan(5);

-- Test 1: Competência antes de qualquer data (vazio)
select ok(
    (select count(*)::integer from fn_relatorio_comissao('2025-01', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')) = 1 and
    (select items::jsonb from fn_relatorio_comissao('2025-01', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')) = '[]'::jsonb and
    (select total_bruto from fn_relatorio_comissao('2025-01', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')) = 0 and
    (select total_comissao from fn_relatorio_comissao('2025-01', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')) = 0,
    'empty competencia before any data @spec:AC-006 @spec:AC-007 @spec:AC-008'
);

-- Test 2: Competência com dados (Jan 2026) sem adiantamentos nem ajustes (exceto aqueles inseridos)
-- We have one item with total 100, comissao_valor_snapshot 20.
-- Also we have adiantamento 30 and ajustes +15 -5 = +10 net.
-- total_bruto = 100
-- total_comissao_raw = 20
-- total_adiantamentos = 30
-- total_ajustes = 10
-- total_comissao = greatest(20 - 30 + 10, 0) = 0
select ok(
    (select total_bruto from fn_relatorio_comissao('2026-01', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')) = 100.00 and
    (select total_comissao from fn_relatorio_comissao('2026-01', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')) = 0.00,
    'competencia with data (Jan 2026) @spec:AC-006 @spec:AC-007 @spec:AC-008'
);

-- Test 3: Competência apenas com adiantamento maior que comissao (zero already tested above)
-- We'll also verify items count
select ok(
    (select jsonb_array_length(items) from fn_relatorio_comissao('2026-01', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')) = 1,
    'items count matches @spec:AC-006'
);

-- Test 4: Competência com outro profissional (sem dados) -> zero
insert into public.profissionais (id, salon_id, nome, telefone, comissao_percentual_padrao, ativo, created_at, updated_at)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000001', 'Prof Test 2', '(11) 9999-9998', 0, true, now(), now())
on conflict do nothing;

select ok(
    (select total_bruto from fn_relatorio_comissao('2026-01', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')) = 0 and
    (select total_comissao from fn_relatorio_comissao('2026-01', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')) = 0,
    'other profissional with no data @spec:AC-006 @spec:AC-007 @spec:AC-008'
);

-- Test 5: Verificar que comissao_processada = true é excluída
-- We already have one processed item (comissao_valor_snapshot 10). It should not appear in items nor affect totals.
-- The only item in items should be the unprocessed one (comissao 20).
select ok(
    (select jsonb_array_length(items) from fn_relatorio_comissao('2026-01', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')) = 1 and
    (select (items->0->>'comissaoValorSnapshot')::numeric from fn_relatorio_comissao('2026-01', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')) = 20.00,
    'processed items excluded @spec:AC-006'
);

select * from finish();
rollback;
