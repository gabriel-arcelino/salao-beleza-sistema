-- ============================================================================
-- Migration 0011: fn_calcular_cmv
--
-- Implementa Seção 42 (CMV — Custo do Mercadoria Vendida).
--
-- Calcula o CMV de uma competência somando custo_unitario * |quantidade|
-- de todas as movimentações de estoque do tipo 'VENDA' no período.
-- Cada venda registra o custo médio ponderado vigente no momento
-- (fn_fechar_comanda, migration 0004) — CMV reflete o custo real
-- das unidades despachadas, não o preço de venda.
--
-- Parâmetros:
--   p_competencia: texto no formato 'YYYY-MM'
--
-- Retorna numeric(10,2) — total do CMV para o salão e competência.
-- ============================================================================

create or replace function fn_calcular_cmv(
  p_competencia text
)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_salon_id uuid := auth_helpers.current_salon_id();
  v_cmv numeric(10,2) := 0;
begin
  if v_salon_id is null then
    raise exception 'Sessão sem salon_id — usuário não autenticado corretamente.';
  end if;

  if p_competencia !~ '^\d{4}-\d{2}$' then
    raise exception 'Competência deve estar no formato YYYY-MM.';
  end if;

  select coalesce(sum(custo_unitario * abs(quantidade)), 0)
  into v_cmv
  from public.movimentacoes_estoque
  where salon_id = v_salon_id
    and tipo = 'VENDA'
    and to_char(created_at, 'YYYY-MM') = p_competencia;

  return v_cmv;
end;
$$;
