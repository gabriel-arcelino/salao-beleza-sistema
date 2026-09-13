-- ============================================================================
-- Migration 0001: Schema inicial
-- Baseado em plano-arquitetura-salao-beleza-v2_4.md, Seção 10 (Entidades)
--
-- Convenções:
--   - PK sempre uuid, default gen_random_uuid()
--   - Todas as entidades de negócio carregam salon_id (Seção 18, multi-tenancy)
--   - Timestamps em timestamptz
--   - RLS é HABILITADA aqui, mas as POLÍTICAS ficam na migration 0002
--     (nunca deixar uma tabela sem RLS habilitada entre as duas migrations
--      em produção — rode as duas sempre juntas)
-- ============================================================================

create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ----------------------------------------------------------------------------
-- Tabela auxiliar: salões (multi-tenancy, Seção 18)
-- Não estava explicitamente listada na Seção 10, mas é pré-requisito de FK
-- para salon_id em todas as tabelas abaixo. ASSUNÇÃO — confirme o nome/campos
-- se já existir uma definição própria no seu ambiente.
-- ----------------------------------------------------------------------------
create table saloes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 10.1 Profissionais
-- ----------------------------------------------------------------------------
create table profissionais (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references saloes(id),
  nome text not null,
  telefone text,
  comissao_percentual_padrao numeric(5,2) not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 10.2 Usuários
-- ----------------------------------------------------------------------------
create type perfil_usuario as enum ('ADMIN', 'GERENTE', 'RECEPCAO', 'PROFISSIONAL');

create table usuarios (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references saloes(id),
  auth_user_id uuid not null unique, -- FK lógica para auth.users (Supabase Auth)
  nome text not null,
  perfil perfil_usuario not null,
  profissional_id uuid references profissionais(id),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 10.3 Clientes
-- ----------------------------------------------------------------------------
create table clientes (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references saloes(id),
  nome text not null,
  telefone text,
  email text,
  observacoes text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 10.4 Serviços
-- ----------------------------------------------------------------------------
create table servicos (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references saloes(id),
  nome text not null,
  categoria text,
  preco numeric(10,2) not null,
  duracao_minutos integer,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 10.5 Produtos  (inclui percentual_comissao [v2.3])
-- ----------------------------------------------------------------------------
create table produtos (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references saloes(id),
  sku text,
  nome text not null,
  categoria text,
  preco_custo numeric(10,2) not null default 0, -- custo médio ponderado móvel vigente [v2]
  preco_venda numeric(10,2) not null,
  percentual_comissao numeric(5,2), -- [v2.3] nullable; override por produto (ver 11.3.3)
  estoque_minimo numeric(10,2) not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 10.9 Configuração de Taxas
-- ----------------------------------------------------------------------------
create table config_taxas (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references saloes(id),
  metodo text not null, -- DINHEIRO | PIX | DEBITO | CREDITO
  taxa_percentual numeric(5,2) not null default 0,
  ativo boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (salon_id, metodo)
);

-- ----------------------------------------------------------------------------
-- 10.9.1 Configuração de Comissões [v2 / v2.3]
-- ----------------------------------------------------------------------------
create type base_calculo_comissao as enum ('BRUTO', 'LIQUIDO_APOS_DESCONTO');
create type rateio_taxa_tipo as enum ('SALAO', 'PROFISSIONAL_PROPORCIONAL', 'POR_FORMA_PAGAMENTO'); -- [v2.3] PERSONALIZADO removido
create type timing_repasse_tipo as enum ('IMEDIATO', 'APOS_LIQUIDACAO_BANCARIA');

create table config_comissoes (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references saloes(id),
  profissional_id uuid not null references profissionais(id),
  servico_id uuid references servicos(id), -- NULL = aplica a qualquer serviço
  comissao_percentual numeric(5,2),
  base_calculo base_calculo_comissao not null default 'BRUTO',
  rateio_taxa rateio_taxa_tipo not null default 'SALAO',
  rateio_taxa_por_forma_pagamento jsonb, -- [v2.3] obrigatório em regra de aplicação quando rateio_taxa = POR_FORMA_PAGAMENTO
  comissao_sobre_produto boolean not null default false,
  timing_repasse timing_repasse_tipo not null default 'IMEDIATO',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (salon_id, profissional_id, servico_id)
);

-- ----------------------------------------------------------------------------
-- 10.9.2 Motivos de Desconto [v2]
-- ----------------------------------------------------------------------------
create table motivos_desconto (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references saloes(id),
  descricao text not null,
  afeta_comissao boolean not null default true,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 10.6 Comandas
-- ----------------------------------------------------------------------------
create type comanda_status as enum ('ABERTA', 'FINALIZADA', 'CANCELADA');

create table comandas (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references saloes(id),
  numero bigint generated always as identity,
  uuid_cliente uuid not null unique, -- [v2] gerado no dispositivo antes do envio; garante idempotência
  cliente_id uuid references clientes(id),
  profissional_id uuid references profissionais(id), -- "principal" p/ exibição; NUNCA usar em cálculo financeiro (ver nota 10.6)
  status comanda_status not null default 'ABERTA',
  subtotal numeric(10,2) not null default 0,
  desconto numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  opened_at timestamptz not null default now(),
  closed_at timestamptz, -- base da competência financeira (Seção 11.6)
  created_by uuid references usuarios(id),
  closed_by uuid references usuarios(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 10.7 Itens da Comanda
-- ----------------------------------------------------------------------------
create type item_tipo as enum ('SERVICO', 'PRODUTO');

create table comanda_itens (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references saloes(id),
  comanda_id uuid not null references comandas(id),
  tipo item_tipo not null,
  servico_id uuid references servicos(id),
  produto_id uuid references produtos(id),
  descricao_snapshot text not null,
  quantidade numeric(10,2) not null default 1,
  data_atendimento timestamptz, -- exibição/auditoria apenas — NUNCA usar em cálculo de competência
  preco_unitario numeric(10,2) not null,
  desconto numeric(10,2) not null default 0,
  motivo_desconto_id uuid references motivos_desconto(id), -- obrigatório se houver desconto (validação na RPC)
  total numeric(10,2) not null,
  profissional_id uuid references profissionais(id),
  comissao_percentual_snapshot numeric(5,2),
  comissao_valor_snapshot numeric(10,2),
  comissao_processada boolean not null default false,
  fechamento_comissao_id uuid, -- FK adicionada após criar fechamentos_comissao (ver fim do arquivo)
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 10.8 Pagamentos
-- ----------------------------------------------------------------------------
create table pagamentos (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references saloes(id),
  comanda_id uuid not null references comandas(id),
  metodo text not null, -- DINHEIRO | PIX | DEBITO | CREDITO
  valor_bruto numeric(10,2) not null,
  taxa_percentual numeric(5,2) not null default 0,
  taxa_valor numeric(10,2) not null default 0,
  valor_liquido numeric(10,2) not null,
  parcelas integer default 1,
  identificador_transacao text,
  data_liquidacao_bancaria date, -- estimada; conciliação, não competência
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 10.10 Movimentações de Estoque
-- [v2.4] SEM motivo_bypass / bypass_aplicado — venda nunca bloqueia (ver 11.1, 10.10)
-- ----------------------------------------------------------------------------
create type movimentacao_tipo as enum ('ENTRADA', 'VENDA', 'AJUSTE', 'PERDA', 'DEVOLUCAO', 'INVENTARIO');

create table movimentacoes_estoque (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references saloes(id),
  produto_id uuid not null references produtos(id),
  tipo movimentacao_tipo not null,
  quantidade numeric(10,2) not null,
  custo_unitario numeric(10,2) not null, -- custo médio ponderado móvel vigente no momento da movimentação
  origem_tipo text,
  origem_id uuid,
  observacao text,
  created_at timestamptz not null default now(),
  created_by uuid references usuarios(id)
);

-- ----------------------------------------------------------------------------
-- 10.11 Despesas
-- ----------------------------------------------------------------------------
create type despesa_tipo as enum ('FIXA', 'VARIAVEL');

create table despesas (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references saloes(id),
  descricao text not null,
  categoria text,
  tipo despesa_tipo not null,
  valor numeric(10,2) not null,
  profissional_id uuid references profissionais(id), -- preenchido para adiantamentos/vales
  data_competencia date not null,
  data_pagamento date,
  status text not null default 'PENDENTE',
  observacao text,
  created_by uuid references usuarios(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 10.12 Fechamentos de Comissão [v2 / v2.2]
-- ----------------------------------------------------------------------------
create type fechamento_status as enum ('ABERTO', 'FECHADO');

create table fechamentos_comissao (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references saloes(id),
  profissional_id uuid not null references profissionais(id),
  competencia text not null, -- formato 'YYYY-MM'
  status fechamento_status not null default 'ABERTO',
  total_bruto_calculado numeric(10,2) not null default 0,
  total_adiantamentos_abatidos numeric(10,2) not null default 0,
  saldo_anterior_competencia numeric(10,2) not null default 0,
  total_ajustes numeric(10,2) not null default 0,
  total_pago numeric(10,2) not null default 0, -- [v2.2] nunca negativo — validado na RPC, não aqui
  saldo_devedor_gerado numeric(10,2) not null default 0,
  fechado_em timestamptz,
  fechado_por uuid references usuarios(id),
  created_at timestamptz not null default now(),
  unique (salon_id, profissional_id, competencia)
);

alter table comanda_itens
  add constraint fk_comanda_itens_fechamento
  foreign key (fechamento_comissao_id) references fechamentos_comissao(id);

-- ----------------------------------------------------------------------------
-- ajustes_comissao — campos inferidos a partir do uso descrito nas Seções
-- 11.5, 11.7 e 40 do documento; NÃO havia um bloco de schema explícito para
-- esta entidade no doc original. ASSUNÇÃO — valide com o restante do time
-- antes de tratar como definitivo.
-- ----------------------------------------------------------------------------
create table ajustes_comissao (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references saloes(id),
  profissional_id uuid not null references profissionais(id),
  competencia_origem text,          -- competência já fechada que originou o ajuste (se houver)
  competencia_lancamento text not null, -- competência aberta vigente onde o ajuste é lançado (Seção 11.5)
  comanda_item_id uuid references comanda_itens(id),
  valor numeric(10,2) not null,     -- pode ser negativo (estorno) ou positivo (correção a favor)
  motivo text not null,
  created_by uuid references usuarios(id),
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 20. Auditoria
-- ----------------------------------------------------------------------------
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references saloes(id),
  user_id uuid references usuarios(id),
  entity text not null,
  entity_id uuid,
  action text not null, -- LOGIN | CRIACAO | ALTERACAO | CANCELAMENTO | ESTORNO | FECHAMENTO_COMANDA |
                         -- ALTERACAO_TAXA | ALTERACAO_COMISSAO | AJUSTE_ESTOQUE |
                         -- VENDA_COM_SALDO_NEGATIVO [renomeado v2.4] | FECHAMENTO_COMISSAO_MENSAL |
                         -- AJUSTE_COMISSAO_RETROATIVO
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Habilita RLS em todas as tabelas de negócio (políticas na migration 0002)
-- ----------------------------------------------------------------------------
alter table saloes enable row level security;
alter table profissionais enable row level security;
alter table usuarios enable row level security;
alter table clientes enable row level security;
alter table servicos enable row level security;
alter table produtos enable row level security;
alter table config_taxas enable row level security;
alter table config_comissoes enable row level security;
alter table motivos_desconto enable row level security;
alter table comandas enable row level security;
alter table comanda_itens enable row level security;
alter table pagamentos enable row level security;
alter table movimentacoes_estoque enable row level security;
alter table despesas enable row level security;
alter table fechamentos_comissao enable row level security;
alter table ajustes_comissao enable row level security;
alter table audit_log enable row level security;
