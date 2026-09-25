import { useState } from "react";
import { getRelatorioCaixa } from "../lib/api/relatorios";
import type { RelatorioCaixa } from "../types";
import { EmptyState } from "../ui/components/EmptyState";

export function RelatorioCaixaPage() {
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [resultados, setResultados] = useState<RelatorioCaixa[]>([]);
  const [consultaRealizada, setConsultaRealizada] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function handleFiltrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setConsultaRealizada(false);
    setCarregando(true);
    try {
      const dados = await getRelatorioCaixa(inicio, fim);
      setResultados(dados);
      setConsultaRealizada(true);
    } catch (e) {
      setConsultaRealizada(false);
      setErro((e as Error).message);
      setResultados([]);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <section>
      <h2>Relatório: Fechamento de Caixa</h2>

      {erro && <p style={{ color: "crimson" }}>{erro}</p>}
      {carregando && <p>Carregando...</p>}

      <form onSubmit={handleFiltrar} style={{ marginBottom: 24, display: "flex", gap: 8, alignItems: "center" }}>
        <label>
          Início
          <input
            type="date"
            value={inicio}
            onChange={(e) => {
              setConsultaRealizada(false);
              setInicio(e.target.value);
            }}
            required
            style={{ display: "block", marginTop: 4 }}
          />
        </label>
        <label>
          Fim
          <input
            type="date"
            value={fim}
            onChange={(e) => {
              setConsultaRealizada(false);
              setFim(e.target.value);
            }}
            required
            style={{ display: "block", marginTop: 4 }}
          />
        </label>
        <button type="submit" style={{ marginTop: 18 }}>
          Filtrar
        </button>
      </form>

      {consultaRealizada && resultados.length === 0 && !carregando && !erro ? (
        <EmptyState message="Nenhum registro encontrado para o intervalo informado." />
      ) : (
        resultados.length > 0 && (
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 16 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Início</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Fim</th>
                <th style={{ textAlign: "right", borderBottom: "1px solid #ddd", padding: 8 }}>Vendas</th>
                <th style={{ textAlign: "right", borderBottom: "1px solid #ddd", padding: 8 }}>Entradas</th>
                <th style={{ textAlign: "right", borderBottom: "1px solid #ddd", padding: 8 }}>Saídas</th>
                <th style={{ textAlign: "right", borderBottom: "1px solid #ddd", padding: 8 }}>Saldo Inicial</th>
                <th style={{ textAlign: "right", borderBottom: "1px solid #ddd", padding: 8 }}>Saldo Final</th>
              </tr>
            </thead>
            <tbody>
              {resultados.map((r, i) => (
                <tr key={i}>
                  <td style={{ padding: 8 }}>{r.data_inicio}</td>
                  <td style={{ padding: 8 }}>{r.data_fim}</td>
                  <td style={{ textAlign: "right", padding: 8 }}>{Number(r.total_vendas).toFixed(2)}</td>
                  <td style={{ textAlign: "right", padding: 8 }}>{Number(r.total_entradas).toFixed(2)}</td>
                  <td style={{ textAlign: "right", padding: 8 }}>{Number(r.total_saidas).toFixed(2)}</td>
                  <td style={{ textAlign: "right", padding: 8 }}>{Number(r.saldo_inicial).toFixed(2)}</td>
                  <td style={{ textAlign: "right", padding: 8 }}>{Number(r.saldo_final).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}
    </section>
  );
}
