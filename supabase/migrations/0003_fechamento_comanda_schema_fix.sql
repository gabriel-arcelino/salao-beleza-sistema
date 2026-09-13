-- ============================================================================
-- Migration 0003: Ajustes de schema para viabilizar fn_fechar_comanda
--
-- Dois gaps encontrados ao implementar a Fase 2 (Protocolo B) que o plano
-- v2.4 descreve em prosa mas nunca materializou em coluna:
--   1. Saldo de estoque (Seção 10.10 referencia "estoque_atual" na fórmula de custo médio, mas produtos nunca ganhou essa coluna).
--   2. Desconto no nível da comanda (Seção 11.3.1 descreve desconto aplicado no total da comanda, com um motivo — mas motivo_desconto_id só existia em comanda_itens).
-- ============================================================================

alter table produtos
add column estoque_atual numeric(10,2) not null default 0;

alter table comandas
add column motivo_desconto_id uuid references motivos_desconto(id);

-- comanda_itens.motivo_desconto_id continua existindo para o caso de
-- desconto aplicado item a item (fora do fluxo de rateio da Seção 11.3.1);
-- quando o desconto vem do total da comanda, a RPC replica o mesmo
-- motivo_desconto_id de comandas para cada item, só para consulta.
