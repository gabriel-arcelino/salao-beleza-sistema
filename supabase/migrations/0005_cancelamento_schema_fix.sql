-- ============================================================================
-- Migration 0005: campos de cancelamento/estorno
-- Gap encontrado ao projetar fn_cancelar_comanda (Seção 11.5) — o schema
-- não tinha onde guardar motivo de cancelamento nem marcar pagamento como
-- estornado (o plano exige "não apagar", então precisa de flag, não DELETE).
-- ============================================================================

alter table comandas
add column motivo_cancelamento text,
add column cancelado_em timestamptz,
add column cancelado_por uuid references usuarios(id);

alter table pagamentos
add column estornado boolean not null default false,
add column estornado_em timestamptz;
