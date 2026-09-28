import { useEffect, useState } from "react";
import type { IndicadoresDashboard, Produto } from "../types";
import { getProdutosEstoqueNegativo } from "../lib/api/estoque";
import { getIndicadoresDashboard } from "../lib/api/dashboard";
import { Card } from "../ui/components/Card";
import { Loading } from "../ui/components/Loading";
import { ErrorMessage } from "../ui/components/ErrorMessage";
import { SPACING_MD, SPACING_LG } from "../ui/tokens/spacing";
import { COLOR_PRIMARY, COLOR_SECONDARY } from "../ui/tokens/colors";
import { FONT_HEADING, FONT_SIZE_HEADING } from "../ui/tokens/typography";

/**
 * Texto exibido no lugar dos valores quando a competência não tem movimento
 * (AC-053). É informativo e substitui `R$ 0,00` — nunca aparece junto com ele.
 */
const SEM_MOVIMENTO = "Sem movimento no período";

/**
 * Formata em real. A spec escreve `R$ 0,00` e diz "formatado em real", então o
 * separador decimal é vírgula, ao contrário do `toFixed(2)` usado no resto do
 * projeto. Ver o relatório da Onda C: este é o ponto que mais provavelmente
 * precisa de confirmação.
 */
function formatarReal(valor: number): string {
  return `R$ ${valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function DashboardPage() {
  // Competência corrente como valor inicial; o seletor passa a ser a fonte
  // (AC-047). O `slice(0, 7)` deixa de ser a competência fixa da tela.
  const [competencia, setCompetencia] = useState(() => new Date().toISOString().slice(0, 7));
  const [indicadores, setIndicadores] = useState<IndicadoresDashboard | null>(null);
  const [estoqueNegativo, setEstoqueNegativo] = useState<Produto[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  // Fora do useEffect para que a tela de erro possa reexecutar a carga (AC-042).
  async function carregar() {
    setErro(null);
    try {
      const [neg, ind] = await Promise.all([
        getProdutosEstoqueNegativo(),
        getIndicadoresDashboard(competencia),
      ]);
      setEstoqueNegativo(neg);
      setIndicadores(ind);
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  useEffect(() => {
    carregar();
  }, [competencia]);

  const cartoes: { rotulo: string; chave: string; valor: number }[] = [
    { rotulo: "Faturamento", chave: "faturamento", valor: indicadores?.faturamento ?? 0 },
    { rotulo: "Receita líquida", chave: "receita-liquida", valor: indicadores?.receitaLiquida ?? 0 },
    { rotulo: "CMV", chave: "cmv", valor: indicadores?.cmv ?? 0 },
    { rotulo: "Despesas", chave: "despesas", valor: indicadores?.despesas ?? 0 },
  ];

  return (
    <section>
      <h2 style={{ fontFamily: FONT_HEADING, fontSize: FONT_SIZE_HEADING }}>Dashboard</h2>

      {erro && <ErrorMessage message={erro} onRetry={carregar} />}

      <div style={{ marginTop: SPACING_MD }}>
        <label
          htmlFor="dashboard-competencia"
          style={{ display: "block", marginBottom: SPACING_MD }}
        >
          Competência
        </label>
        <input
          id="dashboard-competencia"
          type="month"
          value={competencia}
          onChange={(e) => setCompetencia(e.target.value)}
        />
      </div>

      {/* Um único Loading para o grupo inteiro. Renderizar um por card
          duplicaria role="status" e quebraria quem procura o estado de
          carregamento por role (AC-040 prova exatamente esse caminho). */}
      {indicadores === null ? (
        <div style={{ maxWidth: 700, marginTop: SPACING_MD }}>
          <Loading message="Carregando..." />
        </div>
      ) : (
        <div
          role="group"
          aria-label="Indicadores do dashboard"
          style={{
            display: "grid",
            gap: SPACING_MD,
            gridTemplateColumns: "1fr 1fr",
            maxWidth: 700,
            marginTop: SPACING_MD,
          }}
        >
          {cartoes.map((c) => (
            <Card key={c.chave}>
              <h3>{c.rotulo}</h3>
              {indicadores.temMovimento ? (
                // ASM-022: movimento verdadeiro com Faturamento zero é valor
                // APURADO. Vale para as duas origens do zero (só despesa em
                // AC-056 e só venda de estoque em AC-057); a interface não as
                // distingue, e não deve distinguir.
                <p
                  data-testid={`indicador-${c.chave}`}
                  style={{ fontSize: "1.5rem", fontWeight: "bold" }}
                >
                  {formatarReal(c.valor)}
                </p>
              ) : (
                // AC-053: ausência total de movimento. Mensagem em vez de
                // `R$ 0,00`, para o zero não parecer valor apurado.
                <p data-testid={`indicador-${c.chave}`}>{SEM_MOVIMENTO}</p>
              )}
            </Card>
          ))}
        </div>
      )}

      {indicadores !== null && !indicadores.temMovimento && (
        <p style={{ marginTop: SPACING_MD, color: COLOR_SECONDARY }}>
          Não há pagamentos, vendas nem despesas em {competencia}.
        </p>
      )}

      <div
        role="group"
        aria-label="Alerta de estoque negativo"
        style={{
          display: "grid",
          gap: SPACING_MD,
          gridTemplateColumns: "1fr",
          maxWidth: 700,
          marginTop: SPACING_LG,
        }}
      >
        <Card>
          <h3>Alerta: Estoque Negativo</h3>
          {estoqueNegativo.length > 0 ? (
            <p style={{ color: COLOR_PRIMARY, fontWeight: "bold" }}>
              {estoqueNegativo.length} produto(s) com estoque negativo
            </p>
          ) : (
            <p style={{ color: "green" }}>Todos os produtos com estoque positivo</p>
          )}
        </Card>
      </div>

      {estoqueNegativo.length > 0 && (
        <section aria-label="Simulação de e-mail diário — saldo negativo" style={{ marginTop: SPACING_LG }}>
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
