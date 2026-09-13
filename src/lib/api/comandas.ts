import { supabase } from "../supabaseClient";
import { getCurrentSalonId } from "../salon";
import type { Comanda, ComandaItem, Pagamento, ComandaComItens } from "../../types";

export async function listComandas(): Promise<Comanda[]> {
  const { data, error } = await supabase
    .from("comandas")
    .select("*")
    .order("opened_at", { ascending: false });

  if (error) throw error;
  return data as Comanda[];
}

export async function getComanda(id: string): Promise<ComandaComItens> {
  const { data: comanda, error: comandaError } = await supabase
    .from("comandas")
    .select("*")
    .eq("id", id)
    .single();

  if (comandaError) throw comandaError;

  const { data: itens, error: itensError } = await supabase
    .from("comanda_itens")
    .select("*")
    .eq("comanda_id", id)
    .order("created_at");

  if (itensError) throw itensError;

  const { data: pagamentos, error: pagamentosError } = await supabase
    .from("pagamentos")
    .select("*")
    .eq("comanda_id", id)
    .order("paid_at");

  if (pagamentosError) throw pagamentosError;

  return {
    ...(comanda as Comanda),
    itens: itens as ComandaItem[],
    pagamentos: pagamentos as Pagamento[],
  };
}

export async function createComanda(input: {
  cliente_id?: string;
  profissional_id?: string;
  uuid_cliente: string;
}): Promise<Comanda> {
  const salon_id = await getCurrentSalonId();

  const { data, error } = await supabase
    .from("comandas")
    .insert({
      salon_id,
      cliente_id: input.cliente_id || null,
      profissional_id: input.profissional_id || null,
      uuid_cliente: input.uuid_cliente,
      status: "ABERTA",
    })
    .select()
    .single();

  if (error) throw error;
  return data as Comanda;
}

export async function addItemComanda(input: {
  comanda_id: string;
  tipo: "SERVICO" | "PRODUTO";
  servico_id?: string;
  produto_id?: string;
  descricao_snapshot: string;
  quantidade: number;
  preco_unitario: number;
  profissional_id?: string;
}): Promise<ComandaItem> {
  const { data, error } = await supabase
    .from("comanda_itens")
    .insert({
      comanda_id: input.comanda_id,
      tipo: input.tipo,
      servico_id: input.servico_id || null,
      produto_id: input.produto_id || null,
      descricao_snapshot: input.descricao_snapshot,
      quantidade: input.quantidade,
      preco_unitario: input.preco_unitario,
      profissional_id: input.profissional_id || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as ComandaItem;
}

export async function fecharComanda(
  comanda_id: string,
  pagamentos: { metodo: string; valor_bruto: number }[]
): Promise<{ status: string; total: number; idempotente: boolean }> {
  const { data, error } = await supabase.rpc("fn_fechar_comanda", {
    p_comanda_id: comanda_id,
    p_pagamentos: pagamentos,
  });

  if (error) throw error;
  return data as { status: string; total: number; idempotente: boolean };
}

export async function cancelarComanda(id: string): Promise<void> {
  const { error } = await supabase
    .from("comandas")
    .update({ status: "CANCELADA" })
    .eq("id", id);

  if (error) throw error;
}
