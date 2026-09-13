-- ============================================================================
-- Teste pgTAP: isolamento de RLS entre salões (Fase 4, Protocolo B)
-- Referência: processo-dev-salao-beleza.md, Seção 3 e 4 —
-- "Teste de dois salões simulados tentando acessar dado um do outro —
--  deve falhar 100% das vezes, sem exceção"
--
-- Rodar com: supabase test db
-- ============================================================================

begin;
select plan(4);

-- Setup: dois salões, um cliente em cada
insert into saloes (id, nome) values
  ('11111111-1111-1111-1111-111111111111', 'Salão A'),
  ('22222222-2222-2222-2222-222222222222', 'Salão B');

insert into clientes (id, salon_id, nome) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Cliente do Salão A'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'Cliente do Salão B');

-- CRÍTICO: sem isso, os asserts abaixo rodam como postgres/superusuário,
-- que ignora RLS completamente. "authenticated" é o role que a aplicação
-- real usa via PostgREST — sem esta linha, os testes podem "passar" mesmo
-- com uma policy de RLS quebrada.
set local role authenticated;

-- Simula um usuário autenticado do Salão A (via claim de app_metadata)
-- Ajuste conforme o helper de teste de auth que o projeto adotar
-- (supabase_test_helpers ou equivalente); aqui está o princípio do teste,
-- não a integração final com o mecanismo de mock de JWT.
select set_config('request.jwt.claims',
  '{"app_metadata": {"salon_id": "11111111-1111-1111-1111-111111111111"}}', true);

-- 1. Usuário do Salão A vê o próprio cliente
select isnt_empty(
  $$ select 1 from clientes where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  'Salão A enxerga o próprio cliente'
);

-- 2. Usuário do Salão A NÃO vê cliente do Salão B
select is_empty(
  $$ select 1 from clientes where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' $$,
  'Salão A não enxerga cliente do Salão B'
);

-- Troca para usuário do Salão B
select set_config('request.jwt.claims',
  '{"app_metadata": {"salon_id": "22222222-2222-2222-2222-222222222222"}}', true);

-- 3. Usuário do Salão B vê o próprio cliente
select isnt_empty(
  $$ select 1 from clientes where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' $$,
  'Salão B enxerga o próprio cliente'
);

-- 4. Usuário do Salão B NÃO vê cliente do Salão A
select is_empty(
  $$ select 1 from clientes where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  'Salão B não enxerga cliente do Salão A'
);

select * from finish();
rollback;
