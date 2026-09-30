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

// Traducao do PGRST116 destas duas escritas. A cadeia precisa pedir .select():
// medido, o RLS negado devolve zero linhas sem levantar erro, e sem o .single() a
// falha e silenciosa. "Nao encontrado" e "sem permissao" ficam INDISTINGUEIVEIS de
// proposito. Ver a nota longa em clientes.ts.
function erroDeEscrita(acao: "desativar" | "reativar"): Error {
  return new Error(
    `Não foi possível ${acao} o serviço. O registro não foi encontrado ou você não tem permissão.`
  );
}

export async function desativarServico(id: string): Promise<void> {
  const { error } = await supabase
    .from("servicos")
    .update({ ativo: false })
    .eq("id", id)
    .select()
    .single();
  if (error) {
    if (error.code === "PGRST116") throw erroDeEscrita("desativar");
    throw error;
  }
}

export async function ativarServico(id: string): Promise<void> {
  const { error } = await supabase
    .from("servicos")
    .update({ ativo: true })
    .eq("id", id)
    .select()
    .single();
  if (error) {
    if (error.code === "PGRST116") throw erroDeEscrita("reativar");
    throw error;
  }
}
