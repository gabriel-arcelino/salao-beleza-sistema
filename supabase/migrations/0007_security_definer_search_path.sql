-- ============================================================================
-- Migration 0007: fixa search_path das funções SECURITY DEFINER de suporte
-- ============================================================================

create or replace function auth_helpers.current_salon_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
select coalesce(
  (nullif(pg_catalog.current_setting('request.jwt.claims', true), '')::pg_catalog.jsonb -> 'app_metadata' ->> 'salon_id')::pg_catalog.uuid,
  (auth.jwt() -> 'app_metadata' ->> 'salon_id')::pg_catalog.uuid
);
$$;

create or replace function auth_helpers.current_usuario_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
select id from public.usuarios where auth.uid() = auth_user_id;
$$;

create or replace function auth_helpers.current_perfil()
returns public.perfil_usuario
language sql
stable
security definer
set search_path = ''
as $$
select perfil from public.usuarios where auth_user_id = auth.uid();
$$;

create or replace function auth_helpers.current_profissional_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
select profissional_id from public.usuarios where auth_user_id = auth.uid();
$$;
