import { useEffect, useState } from "react";
import type { Produto } from "../types";
import { getProdutosEstoqueNegativo } from "../lib/api/estoque";
import { supabase } from "../lib/supabaseClient";

export function RelatorioEstoquePage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  async function carregar() {
    try {
      setProdutos(await getProdutosEstoqueNegativo());
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  return (
    <section>
      <h2>Relatório: Saldo Negativo — Pendente de Correção</h2>

      {erro && <p style={{ color: "crimson" }}>{erro}</p>}

      {produtos.length === 0 ? (
        <p>Nenhum produto com estoque negativo. Todos os saldos estão positivos.</p>
      ) : (
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
                  <button
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
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
