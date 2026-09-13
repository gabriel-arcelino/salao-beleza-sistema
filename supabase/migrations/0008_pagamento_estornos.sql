-- ============================================================================
-- Migration 0008: pagamento_estornos
--
-- Suporta estorno parcial/múltiplo de um pagamento específico (Seção 41 —
-- fn_estornar_pagamento), distinto do estorno total feito por
-- fn_cancelar_comanda (que continua usando pagamentos.estornado direto).
-- ============================================================================

create table pagamento_estornos (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references saloes(id),
  pagamento_id uuid not null references pagamentos(id),
  valor numeric(10,2) not null check (valor > 0),
  motivo text not null,
  created_by uuid references usuarios(id),
  created_at timestamptz not null default now()
);

alter table pagamento_estornos enable row level security;

create policy pagamento_estornos_select on pagamento_estornos
for select using (
  salon_id = auth_helpers.current_salon_id()
  and auth_helpers.current_perfil() in ('ADMIN', 'GERENTE', 'RECEPCAO')
);

-- Sem policy de INSERT/UPDATE/DELETE: só a RPC (security definer) escreve
-- aqui, mesmo padrão de audit_log.
