-- ============================================================================
-- Migration 0002: Políticas de RLS
-- Baseado em plano-arquitetura-salao-beleza-v2_4.md, Seção 19 (RLS) e
-- Seção 17.2 (matriz de acesso por perfil)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Função central de resolução de tenant (Seção 19, padrão concreto recomendado)
-- Lê salon_id de app_metadata do JWT (não editável pelo cliente)
-- ----------------------------------------------------------------------------
create schema if not exists auth_helpers;

create or replace function auth_helpers.current_salon_id()
returns uuid
language sql
stable
security definer
as $$
select coalesce(
  (nullif(current_setting('request.jwt.claims', true), '')::jsonb -> 'app_metadata' ->> 'salon_id')::uuid,
  (auth.jwt() -> 'app_metadata' ->> 'salon_id')::uuid
);
$$;

create or replace function auth_helpers.current_usuario_id()
returns uuid
language sql
stable
security definer
as $$
  select id from usuarios where auth_user_id = auth.uid();
$$;

create or replace function auth_helpers.current_perfil()
returns perfil_usuario
language sql
stable
security definer
as $$
  select perfil from usuarios where auth_user_id = auth.uid();
$$;

create or replace function auth_helpers.current_profissional_id()
returns uuid
language sql
stable
security definer
as $$
  select profissional_id from usuarios where auth_user_id = auth.uid();
$$;

-- ----------------------------------------------------------------------------
-- Política padrão: isolamento por salão em todas as tabelas de negócio
-- (Seção 18) — todo perfil autenticado do salão pode ao menos SELECT;
-- restrições mais finas (por perfil) são adicionadas por cima disso.
-- ----------------------------------------------------------------------------

-- Tabelas de cadastro simples: qualquer perfil do salão lê; só
-- ADMIN/GERENTE escrevem.
do $$
declare
  tabela text;
begin
  foreach tabela in array array[
    'profissionais', 'clientes', 'servicos', 'produtos',
    'config_taxas', 'config_comissoes', 'motivos_desconto'
  ]
  loop
    execute format(
      'create policy %I_select on %I for select using (salon_id = auth_helpers.current_salon_id());',
      tabela, tabela
    );
    execute format(
      'create policy %I_write on %I for all using (
         salon_id = auth_helpers.current_salon_id()
         and auth_helpers.current_perfil() in (''ADMIN'', ''GERENTE'')
       ) with check (
         salon_id = auth_helpers.current_salon_id()
         and auth_helpers.current_perfil() in (''ADMIN'', ''GERENTE'')
       );',
      tabela, tabela
    );
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- usuarios: só ADMIN gerencia contas; qualquer perfil pode ler o próprio
-- registro (necessário para telas de perfil/login).
-- ----------------------------------------------------------------------------
create policy usuarios_select_own on usuarios
  for select using (auth_user_id = auth.uid());

create policy usuarios_select_admin on usuarios
  for select using (
    salon_id = auth_helpers.current_salon_id()
    and auth_helpers.current_perfil() = 'ADMIN'
  );

create policy usuarios_write_admin on usuarios
  for all using (
    salon_id = auth_helpers.current_salon_id()
    and auth_helpers.current_perfil() = 'ADMIN'
  ) with check (
    salon_id = auth_helpers.current_salon_id()
    and auth_helpers.current_perfil() = 'ADMIN'
  );

-- ----------------------------------------------------------------------------
-- comandas / comanda_itens / pagamentos
-- Matriz Seção 17.2: PROFISSIONAL não visualiza valores/comissão de itens
-- de outros profissionais. RECEPCAO/GERENTE/ADMIN veem tudo do salão.
-- ----------------------------------------------------------------------------
create policy comandas_select on comandas
  for select using (salon_id = auth_helpers.current_salon_id());

create policy comandas_write on comandas
  for all using (
    salon_id = auth_helpers.current_salon_id()
    and auth_helpers.current_perfil() in ('ADMIN', 'GERENTE', 'RECEPCAO')
  ) with check (
    salon_id = auth_helpers.current_salon_id()
    and auth_helpers.current_perfil() in ('ADMIN', 'GERENTE', 'RECEPCAO')
  );

-- comanda_itens: PROFISSIONAL só vê itens onde é o profissional do item
-- (Seção 17.2 — "não visualiza valores/comissão de terceiros")
create policy comanda_itens_select_staff on comanda_itens
  for select using (
    salon_id = auth_helpers.current_salon_id()
    and auth_helpers.current_perfil() in ('ADMIN', 'GERENTE', 'RECEPCAO')
  );

create policy comanda_itens_select_profissional on comanda_itens
  for select using (
    salon_id = auth_helpers.current_salon_id()
    and auth_helpers.current_perfil() = 'PROFISSIONAL'
    and profissional_id = auth_helpers.current_profissional_id()
  );

create policy comanda_itens_write on comanda_itens
  for all using (
    salon_id = auth_helpers.current_salon_id()
    and auth_helpers.current_perfil() in ('ADMIN', 'GERENTE', 'RECEPCAO')
  ) with check (
    salon_id = auth_helpers.current_salon_id()
    and auth_helpers.current_perfil() in ('ADMIN', 'GERENTE', 'RECEPCAO')
  );

create policy pagamentos_select on pagamentos
  for select using (
    salon_id = auth_helpers.current_salon_id()
    and auth_helpers.current_perfil() in ('ADMIN', 'GERENTE', 'RECEPCAO')
  );

create policy pagamentos_write on pagamentos
  for all using (
    salon_id = auth_helpers.current_salon_id()
    and auth_helpers.current_perfil() in ('ADMIN', 'GERENTE', 'RECEPCAO')
  ) with check (
    salon_id = auth_helpers.current_salon_id()
    and auth_helpers.current_perfil() in ('ADMIN', 'GERENTE', 'RECEPCAO')
  );

-- ----------------------------------------------------------------------------
-- fechamentos_comissao / ajustes_comissao
-- [v2.4] PROFISSIONAL vê SÓ o próprio extrato, sem exceção (Seção 17.2,
-- decisão fechada na Seção 40 — brecha de concessão manual pelo ADMIN foi
-- removida). ADMIN/GERENTE veem e fecham tudo do salão.
-- ----------------------------------------------------------------------------
create policy fechamentos_comissao_select_staff on fechamentos_comissao
  for select using (
    salon_id = auth_helpers.current_salon_id()
    and auth_helpers.current_perfil() in ('ADMIN', 'GERENTE')
  );

create policy fechamentos_comissao_select_profissional on fechamentos_comissao
  for select using (
    salon_id = auth_helpers.current_salon_id()
    and auth_helpers.current_perfil() = 'PROFISSIONAL'
    and profissional_id = auth_helpers.current_profissional_id()
  );

create policy fechamentos_comissao_write on fechamentos_comissao
  for all using (
    salon_id = auth_helpers.current_salon_id()
    and auth_helpers.current_perfil() in ('ADMIN', 'GERENTE')
  ) with check (
    salon_id = auth_helpers.current_salon_id()
    and auth_helpers.current_perfil() in ('ADMIN', 'GERENTE')
  );

create policy ajustes_comissao_select_staff on ajustes_comissao
  for select using (
    salon_id = auth_helpers.current_salon_id()
    and auth_helpers.current_perfil() in ('ADMIN', 'GERENTE')
  );

create policy ajustes_comissao_select_profissional on ajustes_comissao
  for select using (
    salon_id = auth_helpers.current_salon_id()
    and auth_helpers.current_perfil() = 'PROFISSIONAL'
    and profissional_id = auth_helpers.current_profissional_id()
  );

create policy ajustes_comissao_write on ajustes_comissao
  for all using (
    salon_id = auth_helpers.current_salon_id()
    and auth_helpers.current_perfil() in ('ADMIN', 'GERENTE')
  ) with check (
    salon_id = auth_helpers.current_salon_id()
    and auth_helpers.current_perfil() in ('ADMIN', 'GERENTE')
  );

-- ----------------------------------------------------------------------------
-- movimentacoes_estoque / despesas / audit_log
-- Sem acesso de PROFISSIONAL — visão gerencial/operacional apenas.
-- ----------------------------------------------------------------------------
create policy movimentacoes_estoque_select on movimentacoes_estoque
  for select using (
    salon_id = auth_helpers.current_salon_id()
    and auth_helpers.current_perfil() in ('ADMIN', 'GERENTE', 'RECEPCAO')
  );

create policy movimentacoes_estoque_write on movimentacoes_estoque
  for all using (
    salon_id = auth_helpers.current_salon_id()
    and auth_helpers.current_perfil() in ('ADMIN', 'GERENTE', 'RECEPCAO')
  ) with check (
    salon_id = auth_helpers.current_salon_id()
    and auth_helpers.current_perfil() in ('ADMIN', 'GERENTE', 'RECEPCAO')
  );

create policy despesas_select on despesas
  for select using (
    salon_id = auth_helpers.current_salon_id()
    and auth_helpers.current_perfil() in ('ADMIN', 'GERENTE')
  );

create policy despesas_write on despesas
  for all using (
    salon_id = auth_helpers.current_salon_id()
    and auth_helpers.current_perfil() in ('ADMIN', 'GERENTE')
  ) with check (
    salon_id = auth_helpers.current_salon_id()
    and auth_helpers.current_perfil() in ('ADMIN', 'GERENTE')
  );

create policy audit_log_select on audit_log
  for select using (
    salon_id = auth_helpers.current_salon_id()
    and auth_helpers.current_perfil() in ('ADMIN', 'GERENTE')
  );

-- audit_log nunca é escrito diretamente pelo cliente — só pelas RPCs
-- (security definer), por isso não há policy de INSERT/UPDATE/DELETE aqui.

-- ----------------------------------------------------------------------------
-- saloes: usuário só vê o próprio salão.
-- ----------------------------------------------------------------------------
create policy saloes_select on saloes
  for select using (id = auth_helpers.current_salon_id());
