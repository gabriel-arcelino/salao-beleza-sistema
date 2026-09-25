import { useEffect, useState } from "react";
import type { Produto } from "../types";
import { getProdutosEstoqueNegativo } from "../lib/api/estoque";
import { supabase } from "../lib/supabaseClient";
import { Button } from "../ui/components/Button";
import { EmptyState } from "../ui/components/EmptyState";
import { SPACING_LG } from "../ui/tokens/spacing";
import { FONT_HEADING, FONT_SIZE_HEADING } from "../ui/tokens/typography";

export function RelatorioEstoquePage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [consultaConcluida, setConsultaConcluida] = useState(false);

  async function carregar() {
    try {
      setProdutos(await getProdutosEstoqueNegativo());
      setConsultaConcluida(true);
    } catch (e) {
      setConsultaConcluida(false);
      setErro((e as Error).message);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  return (
    <section>
      <h2 style={{ fontFamily: FONT_HEADING, fontSize: FONT_SIZE_HEADING }}>
        Relatório: Saldo Negativo — Pendente de Correção
      </h2>

      <section aria-label="Produtos com estoque negativo" style={{ marginTop: SPACING_LG }}>
        {erro && <p style={{ color: "crimson" }}>{erro}</p>}

        {!erro && consultaConcluida && produtos.length === 0 ? (
          <EmptyState message="Nenhum produto com estoque negativo. Todos os saldos estão positivos." />
        ) : null}

        {!erro && produtos.length > 0 ? (
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 16 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Produto</th>
                <th style={{ textAlign: "center", borderBottom: "1px solid #ddd", padding: 8 }}>Estoque Atual</th>
                <th style={{ textAlign: "center", borderBottom: "1px solid #ddd", padding: 8 }}>Estoque Mínimo</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Categoria</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((p) => (
                <tr key={p.id}>
                  <td style={{ padding: 8 }}>{p.nome}</td>
                  <td style={{ textAlign: "center", padding: 8, color: "crimson", fontWeight: "bold" }}>
                    {p.estoque_atual}
                  </td>
                  <td style={{ textAlign: "center", padding: 8 }}>{p.estoque_minimo}</td>
                  <td style={{ padding: 8 }}>{p.categoria || "-"}</td>
                  <td style={{ padding: 8 }}>
                    <Button
                      variant="destructive"
                      onClick={async () => {
                        if (confirm(`Corrigir estoque de "${p.nome}" para 0?`)) {
                          const { error } = await supabase
                            .from("produtos")
                            .update({ estoque_atual: 0 })
                            .eq("id", p.id);
                          if (error) {
                            setErro(error.message);
                          } else {
                            carregar();
                          }
                        }
                      }}
                    >
                      Zerar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </section>
    </section>
  );
}
