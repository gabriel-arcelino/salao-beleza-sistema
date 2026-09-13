import { useEffect, useState } from "react";
import type { Produto } from "../types";
import { getProdutosEstoqueNegativo, calcularCMV } from "../lib/api/estoque";

export function DashboardPage() {
  const [estoqueNegativo, setEstoqueNegativo] = useState<Produto[]>([]);
  const [cmv, setCmv] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const competenciaAtual = new Date().toISOString().slice(0, 7);

  async function carregar() {
    try {
      const [neg, cmvVal] = await Promise.all([
        getProdutosEstoqueNegativo(),
        calcularCMV(competenciaAtual),
      ]);
      setEstoqueNegativo(neg);
      setCmv(cmvVal);
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  return (
    <section>
      <h2>Dashboard</h2>

      {erro && <p style={{ color: "crimson" }}>{erro}</p>}

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr", maxWidth: 700 }}>
        <div style={{ border: "1px solid #e0e0e0", borderRadius: 8, padding: 16 }}>
          <h3>Alerta: Estoque Negativo</h3>
          {estoqueNegativo.length > 0 ? (
            <p style={{ color: "crimson", fontWeight: "bold" }}>
              {estoqueNegativo.length} produto(s) com estoque negativo
            </p>
          ) : (
            <p style={{ color: "green" }}>Todos os produtos com estoque positivo</p>
          )}
        </div>

        <div style={{ border: "1px solid #e0e0e0", borderRadius: 8, padding: 16 }}>
          <h3>CMV ({competenciaAtual})</h3>
          {cmv !== null ? (
            <p style={{ fontSize: "1.5rem", fontWeight: "bold" }}>R$ {cmv.toFixed(2)}</p>
          ) : (
            <p>Carregando...</p>
          )}
        </div>
      </div>

      {estoqueNegativo.length > 0 && (
        <section style={{ marginTop: 24 }}>
          <h3>Simulação de E-mail Diário — Saldo Negativo</h3>
          <p>Destinatários: ADMIN, GERENTE</p>
          <p>Produtos com estoque negativo que precisam de correção:</p>
          <ul>
            {estoqueNegativo.map((p) => (
              <li key={p.id}>
                <strong>{p.nome}</strong> — estoque: {p.estoque_atual} (mínimo: {p.estoque_minimo})
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}
