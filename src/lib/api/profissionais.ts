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

  if (error) {
    // 42501: medido em 2026-09-30, e o que o INSERT recusado pelo RLS levanta. E
    // DIFERENTE do UPDATE, que devolve zero linhas em silencio - e por isso
    // desativar* precisa de .select(), em reativar-cadastros. Traduzido para que
    // o texto do banco, que cita o nome da tabela, nunca chegue a tela.
    if (error.code === "42501") {
      throw new Error(
        "Não foi possível gravar o profissional. Seu perfil pode não ter permissão para esta operação."
      );
    }
    throw error;
  }
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
//
// A cadeia pede .select().single() para que a recusa de RLS vire erro: medido, o
// RLS negado não levanta nada, devolve zero linhas, e sem o .single() a falha é
// silenciosa. Ver a nota longa em clientes.ts, que traz a medição.
function erroDeEscrita(acao: "desativar" | "reativar"): Error {
  return new Error(
    `Não foi possível ${acao} o profissional. O registro não foi encontrado ou você não tem permissão.`
  );
}

export async function desativarProfissional(id: string): Promise<void> {
  const { error } = await supabase
    .from("profissionais")
    .update({ ativo: false })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") throw erroDeEscrita("desativar");
    throw error;
  }
}

export async function ativarProfissional(id: string): Promise<void> {
  const { error } = await supabase
    .from("profissionais")
    .update({ ativo: true })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") throw erroDeEscrita("reativar");
    throw error;
  }
}
