import { supabase } from "../supabaseClient";
import type { RelatorioCaixa, RelatorioComissao, RelatorioComissaoItem } from "../../types";

export async function getRelatorioCaixa(inicio: string, fim: string): Promise<RelatorioCaixa[]> {
  const { data, error } = await supabase.rpc("fn_relatorio_caixa", {
    p_data_inicio: inicio,
    p_data_fim: fim,
  });

  if (error) throw error;
  return (data ?? []) as RelatorioCaixa[];
}

export async function getRelatorioComissao(
  competencia: string,
  profissionalId: string
): Promise<RelatorioComissao[]> {
  const { data, error } = await supabase.rpc("fn_relatorio_comissao", {
    p_competencia: competencia,
    p_profissional_id_param: profissionalId,
  });

  if (error) throw error;

  // A função retorna uma tabela, mas para consistência com o contrato
  // esperado (RelatorioComissao[]), transformamos o resultado.
  // Se data é array, mapeamos; se é objeto único, envolvemos em array.
  const raw = (data ?? []) as Record<string, unknown>[];
  return raw.map((row) => {
    const itemsRaw = (row.items as unknown) || [];
    const items = Array.isArray(itemsRaw)
      ? (itemsRaw as RelatorioComissaoItem[])
      : [];

    return {
      items,
      totalBruto: Number(row.total_bruto) || 0,
      totalComissao: Number(row.total_comissao) || 0,
    } as RelatorioComissao;
  });
}
