import { supabase } from "../supabaseClient";
import { getCurrentSalonId } from "../salon";
import type { Servico } from "../../types";

export async function listServicos(): Promise<Servico[]> {
  const { data, error } = await supabase.from("servicos").select("*").order("nome");
  if (error) throw error;
  return data as Servico[];
}

export async function createServico(input: {
  nome: string;
  categoria?: string;
  preco: number;
  duracao_minutos?: number;
}): Promise<Servico> {
  const salon_id = await getCurrentSalonId();
  const { data, error } = await supabase
    .from("servicos")
    .insert({ ...input, salon_id })
    .select()
    .single();
  if (error) throw error;
  return data as Servico;
}

export async function updateServico(
  id: string,
  input: Partial<Pick<Servico, "nome" | "categoria" | "preco" | "duracao_minutos">>
): Promise<Servico> {
  const { data, error } = await supabase.from("servicos").update(input).eq("id", id).select().single();
  if (error) throw error;
  return data as Servico;
}

export async function desativarServico(id: string): Promise<void> {
  const { error } = await supabase.from("servicos").update({ ativo: false }).eq("id", id);
  if (error) throw error;
}
