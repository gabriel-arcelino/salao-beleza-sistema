import { supabase } from "../supabaseClient";
import { getCurrentSalonId } from "../salon";
import type { ConfigComissao } from "../../types";

export async function listConfigComissoes(): Promise<ConfigComissao[]> {
  const { data, error } = await supabase
    .from("config_comissoes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as ConfigComissao[];
}

export async function createConfigComissao(input: {
  profissional_id: string;
  servico_id?: string | null; // NULL = aplica a qualquer serviço deste profissional
  comissao_percentual?: number;
  base_calculo: ConfigComissao["base_calculo"];
  rateio_taxa: ConfigComissao["rateio_taxa"];
  rateio_taxa_por_forma_pagamento?: Record<string, number> | null; // obrigatório se rateio_taxa = POR_FORMA_PAGAMENTO
  comissao_sobre_produto: boolean;
  timing_repasse: ConfigComissao["timing_repasse"];
}): Promise<ConfigComissao> {
  // Validação de domínio replicada aqui no cliente só para feedback rápido
  // de UX — a garantia de verdade é a RPC de fechamento (Protocolo B), que
  // rejeita silenciosamente qualquer inconsistência disso na hora de
  // calcular. Não confie só nesta checagem.
  if (input.rateio_taxa === "POR_FORMA_PAGAMENTO" && !input.rateio_taxa_por_forma_pagamento) {
    throw new Error(
      "rateio_taxa_por_forma_pagamento é obrigatório quando rateio_taxa = POR_FORMA_PAGAMENTO."
    );
  }

  const salon_id = await getCurrentSalonId();
  const { data, error } = await supabase
    .from("config_comissoes")
    .insert({ ...input, salon_id })
    .select()
    .single();
  if (error) throw error;
  return data as ConfigComissao;
}

export async function updateConfigComissao(
  id: string,
  input: Partial<Omit<ConfigComissao, "id" | "salon_id" | "created_at" | "updated_at">>
): Promise<ConfigComissao> {
  const { data, error } = await supabase
    .from("config_comissoes")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as ConfigComissao;
}
