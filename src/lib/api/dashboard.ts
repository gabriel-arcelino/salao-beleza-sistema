import { supabase } from "../supabaseClient";
import type { IndicadoresDashboard } from "../../types";

/**
 * Indicadores do dashboard para uma competência mensal (`YYYY-MM`).
 *
 * Delega a agregação para `fn_dashboard_indicadores` (migration 0014), que por
 * sua vez delega Faturamento, Receita líquida e CMV às funções já existentes.
 * Esta camada não calcula nada: apenas converte o que o Postgres devolve.
 *
 * `temMovimento` distingue "sem dado no período" de "valor apurado igual a
 * zero". Quando é `false`, a interface informa que não há movimento; quando é
 * `true` e `faturamento` é `0`, o zero é um valor apurado e deve ser exibido.
 */
export async function getIndicadoresDashboard(competencia: string): Promise<IndicadoresDashboard> {
  const { data, error } = await supabase.rpc("fn_dashboard_indicadores", {
    p_competencia: competencia,
  });

  if (error) throw error;

  // A função retorna TABLE, então chega uma linha. O fallback cobre o caso de
  // retorno vazio sem inventar movimento: sem linha, não há dado.
  const row = ((data ?? []) as Record<string, unknown>[])[0];

  if (!row) {
    return {
      faturamento: 0,
      receitaLiquida: 0,
      despesas: 0,
      cmv: 0,
      temMovimento: false,
    };
  }

  return {
    faturamento: Number(row.faturamento) || 0,
    receitaLiquida: Number(row.receita_liquida) || 0,
    despesas: Number(row.despesas) || 0,
    cmv: Number(row.cmv) || 0,
    temMovimento: Boolean(row.tem_movimento),
  };
}
