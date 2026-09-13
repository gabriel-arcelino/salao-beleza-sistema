// Espelha supabase/migrations/0001_initial_schema.sql
// Mantenha isso sincronizado manualmente por enquanto — gerar tipos via
// `supabase gen types typescript` é o próximo passo natural quando o
// schema estabilizar, mas nesta fase (schema ainda mudando) a geração
// automática atrapalha mais do que ajuda.

export interface Profissional {
  id: string;
  salon_id: string;
  nome: string;
  telefone: string | null;
  comissao_percentual_padrao: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Cliente {
  id: string;
  salon_id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  observacoes: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Servico {
  id: string;
  salon_id: string;
  nome: string;
  categoria: string | null;
  preco: number;
  duracao_minutos: number | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Produto {
  id: string;
  salon_id: string;
  sku: string | null;
  nome: string;
  categoria: string | null;
  preco_custo: number;
  preco_venda: number;
  percentual_comissao: number | null; // [v2.3] override por produto
  estoque_minimo: number;
  estoque_atual: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export type BaseCalculoComissao = "BRUTO" | "LIQUIDO_APOS_DESCONTO";
export type RateioTaxaTipo = "SALAO" | "PROFISSIONAL_PROPORCIONAL" | "POR_FORMA_PAGAMENTO"; // [v2.3]
export type TimingRepasseTipo = "IMEDIATO" | "APOS_LIQUIDACAO_BANCARIA";

export interface ConfigComissao {
  id: string;
  salon_id: string;
  profissional_id: string;
  servico_id: string | null; // NULL = aplica a qualquer serviço
  comissao_percentual: number | null;
  base_calculo: BaseCalculoComissao;
  rateio_taxa: RateioTaxaTipo;
  rateio_taxa_por_forma_pagamento: Record<string, number> | null; // [v2.3]
  comissao_sobre_produto: boolean;
  timing_repasse: TimingRepasseTipo;
  created_at: string;
  updated_at: string;
}

export type ComandaStatus = "ABERTA" | "FINALIZADA" | "CANCELADA";
export type ItemTipo = "SERVICO" | "PRODUTO";

export interface Comanda {
  id: string;
  salon_id: string;
  numero: number;
  uuid_cliente: string;
  cliente_id: string | null;
  profissional_id: string | null;
  status: ComandaStatus;
  subtotal: number;
  desconto: number;
  total: number;
  opened_at: string;
  closed_at: string | null;
  created_by: string | null;
  closed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComandaItem {
  id: string;
  salon_id: string;
  comanda_id: string;
  tipo: ItemTipo;
  servico_id: string | null;
  produto_id: string | null;
  descricao_snapshot: string;
  quantidade: number;
  data_atendimento: string | null;
  preco_unitario: number;
  desconto: number;
  motivo_desconto_id: string | null;
  total: number;
  profissional_id: string | null;
  comissao_percentual_snapshot: number | null;
  comissao_valor_snapshot: number | null;
  comissao_processada: boolean;
  fechamento_comissao_id: string | null;
  created_at: string;
}

export interface Pagamento {
  id: string;
  salon_id: string;
  comanda_id: string;
  metodo: string;
  valor_bruto: number;
  taxa_percentual: number;
  taxa_valor: number;
  valor_liquido: number;
  parcelas: number;
  identificador_transacao: string | null;
  data_liquidacao_bancaria: string | null;
  paid_at: string;
  created_at: string;
}

export interface ComandaComItens extends Comanda {
  itens: ComandaItem[];
  pagamentos: Pagamento[];
}
