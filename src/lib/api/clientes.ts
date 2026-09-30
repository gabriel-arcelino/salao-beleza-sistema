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
  if (error) {
    // 42501: medido em 2026-09-30, e o que o INSERT recusado pelo RLS levanta. E
    // DIFERENTE do UPDATE, que devolve zero linhas em silencio - e por isso
    // desativar* precisa de .select(), em reativar-cadastros. Traduzido para que
    // o texto do banco, que cita o nome da tabela, nunca chegue a tela.
    if (error.code === "42501") {
      throw new Error(
        "Não foi possível gravar o cliente. Seu perfil pode não ter permissão para esta operação."
      );
    }
    throw error;
  }
  return data as Cliente;
}

export async function updateCliente(
  id: string,
  input: Partial<Pick<Cliente, "nome" | "telefone" | "email" | "observacoes">>
): Promise<Cliente> {
  const { data, error } = await supabase.from("clientes").update(input).eq("id", id).select().single();
  if (error) {
    // PGRST116: a cadeia update().eq().select().single() nao devolveu uma linha.
    // Medido em 2026-09-29 pela fronteira real: e o que chega quando o id nao
    // existe E quando o RLS esconde a linha, porque a policy clientes_write so
    // admite ADMIN e GERENTE. As duas situacoes sao INDISTINGUEIVEIS de proposito
    // - a interface nao as separa, e separar seria um oraculo de existencia para
    // quem nao tem permissao. A mensagem fala so que a gravacao falhou.
    if (error.code === "PGRST116") {
      throw new Error(
        "Não foi possível salvar a alteração do cliente. O registro não foi encontrado ou você não tem permissão para editá-lo."
      );
    }
    // 23502: `nome` e NOT NULL. A mensagem original traz o nome da coluna, o da
    // tabela e "not-null constraint" - nada disso deve chegar a tela.
    if (error.code === "23502") {
      throw new Error("O nome do cliente é obrigatório.");
    }
    throw error;
  }
  return data as Cliente;
}

// Traducao do PGRST116 destas duas escritas. Medido: o RLS negado NAO levanta erro,
// devolve zero linhas, e o erro nasce do .single() do cliente - por isso a cadeia
// precisa pedir .select(). Sem isso a falha e silenciosa: o UPDATE afeta 0 linhas,
// nenhum erro e levantado, e a tela recarrega como se tivesse gravado. Medido como
// RECEPCAO em 2026-09-30: "UPDATE 0", registro continua ativo.
//
// "Nao encontrado" e "sem permissao" sao INDISTINGUEIVEIS de proposito, pela mesma
// razao de D-6: separar as duas seria oraculo de existencia para quem nao enxerga
// a linha. A mensagem fala so que a gravacao nao foi feita.
function erroDeEscrita(acao: "desativar" | "reativar"): Error {
  return new Error(
    `Não foi possível ${acao} o cliente. O registro não foi encontrado ou você não tem permissão.`
  );
}

export async function desativarCliente(id: string): Promise<void> {
  const { error } = await supabase
    .from("clientes")
    .update({ ativo: false })
    .eq("id", id)
    .select()
    .single();
  if (error) {
    if (error.code === "PGRST116") throw erroDeEscrita("desativar");
    throw error;
  }
}

export async function ativarCliente(id: string): Promise<void> {
  const { error } = await supabase
    .from("clientes")
    .update({ ativo: true })
    .eq("id", id)
    .select()
    .single();
  if (error) {
    if (error.code === "PGRST116") throw erroDeEscrita("reativar");
    throw error;
  }
}
