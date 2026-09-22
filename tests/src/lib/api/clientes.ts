import { supabase } from "../supabaseClient";
import { getCurrentSalonId } from "../salon";
import type { Cliente } from "../../types";

export async function listClientes(): Promise<Cliente[]> {
  const { data, error } = await supabase.from("clientes").select("*").order("nome");
  if (error) throw error;
  return data as Cliente[];
}

export async function createCliente(input: {
  nome: string;
  telefone?: string;
  email?: string;
  observacoes?: string;
}): Promise<Cliente> {
  const salon_id = await getCurrentSalonId();
  const { data, error } = await supabase
    .from("clientes")
    .insert({ ...input, salon_id })
    .select()
    .single();
  if (error) throw error;
  return data as Cliente;
}

export async function updateCliente(
  id: string,
  input: Partial<Pick<Cliente, "nome" | "telefone" | "email" | "observacoes">>
): Promise<Cliente> {
  const { data, error } = await supabase.from("clientes").update(input).eq("id", id).select().single();
  if (error) throw error;
  return data as Cliente;
}

export async function desativarCliente(id: string): Promise<void> {
  const { error } = await supabase.from("clientes").update({ ativo: false }).eq("id", id);
  if (error) throw error;
}
