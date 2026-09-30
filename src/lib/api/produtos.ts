import { supabase } from "../supabaseClient";
import { getCurrentSalonId } from "../salon";
import type { Produto } from "../../types";

export async function listProdutos(): Promise<Produto[]> {
  const { data, error } = await supabase.from("produtos").select("*").order("nome");
  if (error) throw error;
  return data as Produto[];
}

export async function createProduto(input: {
  nome: string;
  sku?: string;
  categoria?: string;
  preco_custo: number;
  preco_venda: number;
  percentual_comissao?: number; // [v2.3] opcional — NULL herda o default de config_comissoes
  estoque_minimo?: number;
}): Promise<Produto> {
  const salon_id = await getCurrentSalonId();
  const { data, error } = await supabase
    .from("produtos")
    .insert({ ...input, salon_id })
    .select()
    .single();
  if (error) throw error;
  return data as Produto;
}

export async function updateProduto(
  id: string,
  input: Partial<
    Pick<Produto, "nome" | "sku" | "categoria" | "preco_venda" | "percentual_comissao" | "estoque_minimo">
  >
): Promise<Produto> {
  // Nota: preco_custo NUNCA é editado manualmente aqui — ele é recalculado
  // pela RPC de movimentação de estoque (custo médio ponderado móvel,
  // Seção 10.10/10.5). Editar direto por essa tela quebraria a auditoria
  // de custo. Se precisar corrigir custo, isso é uma ENTRADA de ajuste,
  // não um UPDATE de cadastro.
  const { data, error } = await supabase.from("produtos").update(input).eq("id", id).select().single();
  if (error) {
    // PGRST116 e 23502: ver o comentario equivalente em clientes.ts. A medicao de
    // fronteira e a mesma para as duas entidades: nao existe 23505 aqui (produtos
    // nao tem nenhuma UNIQUE nem CHECK) e nao existe 42501 (o RLS negado devolve
    // zero linhas em silencio, e o erro nasce do .single() do cliente). Traduzir
    // um codigo que a fronteira nao entrega seria codigo morto.
    if (error.code === "PGRST116") {
      throw new Error(
        "Não foi possível salvar a alteração do produto. O registro não foi encontrado ou você não tem permissão para editá-lo."
      );
    }
    if (error.code === "23502") {
      throw new Error("O nome e o preço de venda do produto são obrigatórios.");
    }
    throw error;
  }
  return data as Produto;
}

export async function desativarProduto(id: string): Promise<void> {
  const { error } = await supabase.from("produtos").update({ ativo: false }).eq("id", id);
  if (error) throw error;
}
