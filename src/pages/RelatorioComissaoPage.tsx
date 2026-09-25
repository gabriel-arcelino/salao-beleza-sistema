import { useState, useEffect } from "react";
import { getRelatorioComissao } from "../lib/api/relatorios";
import { listProfissionais } from "../lib/api/profissionais";
import type { RelatorioComissao, Profissional } from "../types";
import { EmptyState } from "../ui/components/EmptyState";

export function RelatorioComissaoPage() {
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [profissionalId, setProfissionalId] = useState("");
  const [competencia, setCompetencia] = useState("");
  const [resultados, setResultados] = useState<RelatorioComissao[]>([]);
  const [consultaRealizada, setConsultaRealizada] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    listProfissionais()
      .then(setProfissionais)
      .catch((e) => setErro((e as Error).message));
  }, []);

  async function handleFiltrar(e: React.FormEvent) {
    e.preventDefault();
    if (!profissionalId || !competencia) {
      setConsultaRealizada(false);
      setErro("Selecione um profissional e informe a competência.");
      return;
    }
    setErro(null);
    setConsultaRealizada(false);
    setCarregando(true);
    try {
      const dados = await getRelatorioComissao(competencia, profissionalId);
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

  const relatorio = resultados[0] || null;

  return (
    <section>
      <h2>Relatório: Comissão por Profissional</h2>

      {erro && <p style={{ color: "crimson" }}>{erro}</p>}
      {carregando && <p>Carregando...</p>}

      <form onSubmit={handleFiltrar} style={{ marginBottom: 24, display: "flex", gap: 8, alignItems: "center" }}>
        <label>
          Competência (YYYY-MM)
          <input
            type="text"
            placeholder="2026-01"
            value={competencia}
            onChange={(e) => {
              setConsultaRealizada(false);
              setCompetencia(e.target.value);
            }}
            required
            pattern="^\d{4}-\d{2}$"
            style={{ display: "block", marginTop: 4 }}
          />
        </label>
        <label>
          Profissional
          <select
            value={profissionalId}
            onChange={(e) => {
              setConsultaRealizada(false);
              setProfissionalId(e.target.value);
            }}
            required
            style={{ display: "block", marginTop: 4 }}
          >
            <option value="">Selecione</option>
            {profissionais.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" style={{ marginTop: 18 }}>
          Filtrar
        </button>
      </form>

      {!carregando && resultados.length > 0 && relatorio && (
        <>
          <div style={{ marginBottom: 16 }}>
            <strong>Competência:</strong> {competencia} —{" "}
            <strong>Profissional:</strong>{" "}
            {profissionais.find((p) => p.id === profissionalId)?.nome || profissionalId}
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Comanda</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Cliente</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Item</th>
                <th style={{ textAlign: "center", borderBottom: "1px solid #ddd", padding: 8 }}>Qtd</th>
                <th style={{ textAlign: "right", borderBottom: "1px solid #ddd", padding: 8 }}>Unitário</th>
                <th style={{ textAlign: "right", borderBottom: "1px solid #ddd", padding: 8 }}>Total</th>
                <th style={{ textAlign: "right", borderBottom: "1px solid #ddd", padding: 8 }}>% Com.</th>
                <th style={{ textAlign: "right", borderBottom: "1px solid #ddd", padding: 8 }}>Valor Com.</th>
              </tr>
            </thead>
            <tbody>
              {relatorio.items.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ padding: 8 }}>#{item.numero}</td>
                  <td style={{ padding: 8 }}>{item.clienteNome}</td>
                  <td style={{ padding: 8 }}>{item.descricaoSnapshot}</td>
                  <td style={{ textAlign: "center", padding: 8 }}>{item.quantidade}</td>
                  <td style={{ textAlign: "right", padding: 8 }}>{item.precoUnitario.toFixed(2)}</td>
                  <td style={{ textAlign: "right", padding: 8 }}>{item.total.toFixed(2)}</td>
                  <td style={{ textAlign: "right", padding: 8 }}>
                    {item.comissaoPercentualSnapshot?.toFixed(2) ?? "-"}
                  </td>
                  <td style={{ textAlign: "right", padding: 8 }}>
                    {item.comissaoValorSnapshot?.toFixed(2) ?? "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ borderTop: "2px solid #333", paddingTop: 12, marginTop: 12 }}>
            <p>
              <strong>Total Bruto:</strong> R$ {Number(relatorio.totalBruto ?? 0).toFixed(2)}{" "}
              <span style={{ marginLeft: 24 }}>
                <strong>Total Comissão:</strong> R$ {Number(relatorio.totalComissao ?? 0).toFixed(2)}
              </span>
            </p>
          </div>
        </>
      )}

      {!carregando && consultaRealizada && resultados.length === 0 && !erro && (
        <EmptyState message="Nenhum registro encontrado para os filtros informados." />
      )}
    </section>
  );
}
