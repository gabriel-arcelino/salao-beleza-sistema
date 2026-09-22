import { supabase } from "../supabaseClient";
import type { Produto } from "../../types";

export async function getProdutosEstoqueNegativo(): Promise<Produto[]> {
  const { data, error } = await supabase
    .from("produtos")
    .select("*")
    .lt("estoque_atual", 0)
    .order("estoque_atual");

  if (error) throw error;
  return (data ?? []) as Produto[];
}

export async function calcularCMV(competencia: string): Promise<number> {
  const { data, error } = await supabase.rpc("fn_calcular_cmv", {
    p_competencia: competencia,
  });

  if (error) throw error;
  return Number(data);
}
