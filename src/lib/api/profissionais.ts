import { supabase } from "../supabaseClient";
import { getCurrentSalonId } from "../salon";
import type { Profissional } from "../../types";

export async function listProfissionais(): Promise<Profissional[]> {
  const { data, error } = await supabase
    .from("profissionais")
    .select("*")
    .order("nome");

  if (error) throw error;
  return data as Profissional[];
}

export async function createProfissional(input: {
  nome: string;
  telefone?: string;
  comissao_percentual_padrao: number;
}): Promise<Profissional> {
  const salon_id = await getCurrentSalonId();

  const { data, error } = await supabase
    .from("profissionais")
    .insert({ ...input, salon_id })
    .select()
    .single();

  if (error) throw error;
  return data as Profissional;
}

export async function updateProfissional(
  id: string,
  input: Partial<Pick<Profissional, "nome" | "telefone" | "comissao_percentual_padrao">>
): Promise<Profissional> {
  const { data, error } = await supabase
    .from("profissionais")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Profissional;
}

// Nunca DELETE de verdade num profissional que já tem histórico de
// comanda/comissão vinculado — desativa, não apaga (mesmo princípio de
// qualquer cadastro referenciado por dado financeiro).
export async function desativarProfissional(id: string): Promise<void> {
  const { error } = await supabase
    .from("profissionais")
    .update({ ativo: false })
    .eq("id", id);

  if (error) throw error;
}
