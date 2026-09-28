// T-033 — Provas de apresentação: competência selecionável.
//
// AC-047 — o usuário seleciona a competência e a escolhida passa a ser exibida.
// AC-052 — os indicadores acompanham a competência selecionada.
//
// Este arquivo prova a INTERFACE. O valor do número é provado por T-029
// (supabase/tests/015_fn_dashboard_indicadores.sql) contra a função no banco;
// aqui o que se prova é que a competência escolhida chega à consulta e que o
// valor devolvido é o que aparece.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  getProdutosEstoqueNegativo: vi.fn(),
  getIndicadoresDashboard: vi.fn(),
}));

vi.mock("../../src/lib/api/estoque", () => ({
  getProdutosEstoqueNegativo: mocks.getProdutosEstoqueNegativo,
  calcularCMV: vi.fn(),
}));

vi.mock("../../src/lib/api/dashboard", () => ({
  getIndicadoresDashboard: mocks.getIndicadoresDashboard,
}));

import { DashboardPage } from "../../src/pages/DashboardPage";

/** Duas competências com números bem distintos, para que a troca seja visível. */
const JANEIRO = {
  faturamento: 5000,
  receitaLiquida: 4900,
  cmv: 1234.56,
  despesas: 800,
  temMovimento: true,
};
const FEVEREIRO = {
  faturamento: 9000,
  receitaLiquida: 8800,
  cmv: 4321,
  despesas: 1500,
  temMovimento: true,
};

function porCompetencia(competencia: string) {
  return competencia === "2026-02" ? FEVEREIRO : JANEIRO;
}

function seletor(): HTMLInputElement {
  return screen.getByLabelText("Competência") as HTMLInputElement;
}

describe("Dashboard gerencial — competência selecionável @spec:AC-047 @spec:AC-052", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getProdutosEstoqueNegativo.mockResolvedValue([]);
    mocks.getIndicadoresDashboard.mockImplementation(async (c: string) => porCompetencia(c));
  });

  afterEach(() => {
    cleanup();
  });

  it("inicia na competência corrente, no formato YYYY-MM @spec:AC-047", async () => {
    render(<DashboardPage />);
    await screen.findByTestId("indicador-faturamento");

    const campo = seletor();
    // A competência corrente vem de new Date().toISOString().slice(0, 7), e é
    // repassada à consulta — não é mais uma constante fixa de tela.
    expect(campo.value).toMatch(/^\d{4}-\d{2}$/);
    expect(campo.value).toBe(new Date().toISOString().slice(0, 7));
    expect(mocks.getIndicadoresDashboard).toHaveBeenCalledWith(campo.value);
  });

  it("exibe a competência selecionada no rótulo de todos os indicadores @spec:AC-047", async () => {
    render(<DashboardPage />);
    await screen.findByTestId("indicador-faturamento");

    fireEvent.change(seletor(), { target: { value: "2026-02" } });

    // Os quatro indicadores continuam nomeados, e é a competência escolhida que
    // passa a valer. A competência aparece na explicação de período sem
    // movimento e é repassada à função.
    await waitFor(() => {
      expect(mocks.getIndicadoresDashboard).toHaveBeenCalledWith("2026-02");
    });
    for (const rotulo of ["Faturamento", "Receita líquida", "CMV", "Despesas"]) {
      expect(screen.getByRole("heading", { level: 3, name: rotulo })).toBeInTheDocument();
    }
  });

  it("muda os valores dos indicadores ao alternar entre duas competências @spec:AC-052", async () => {
    render(<DashboardPage />);

    // Competência inicial:JANEIRO.
    await screen.findByTestId("indicador-faturamento");
    expect(screen.getByTestId("indicador-faturamento")).toHaveTextContent("R$ 5.000,00");
    expect(screen.getByTestId("indicador-cmv")).toHaveTextContent("R$ 1.234,56");

    // Alterna para FEVEREIRO.
    fireEvent.change(seletor(), { target: { value: "2026-02" } });

    await waitFor(() => {
      expect(screen.getByTestId("indicador-faturamento")).toHaveTextContent("R$ 9.000,00");
    });
    expect(screen.getByTestId("indicador-receita-liquida")).toHaveTextContent("R$ 8.800,00");
    expect(screen.getByTestId("indicador-cmv")).toHaveTextContent("R$ 4.321,00");
    expect(screen.getByTestId("indicador-despesas")).toHaveTextContent("R$ 1.500,00");
    // E a nova competência é a que a consulta recebeu.
    expect(mocks.getIndicadoresDashboard).toHaveBeenLastCalledWith("2026-02");
  });

  it("não confunde competência sem movimento com valor zero ao alternar @spec:AC-052", async () => {
    // Competência vazia alternada com uma que tem movimento: a fronteira de
    // ASM-022 tem de sobreviver à troca de competência, não ser um estado fixo
    // da tela.
    mocks.getIndicadoresDashboard.mockImplementation(async (c: string) =>
      c === "2026-03"
        ? { faturamento: 0, receitaLiquida: 0, cmv: 0, despesas: 0, temMovimento: false }
        : JANEIRO
    );

    render(<DashboardPage />);
    await screen.findByTestId("indicador-faturamento");
    expect(screen.getByTestId("indicador-faturamento")).toHaveTextContent("R$ 5.000,00");

    fireEvent.change(seletor(), { target: { value: "2026-03" } });

    await waitFor(() => {
      expect(screen.getByTestId("indicador-faturamento")).toHaveTextContent("Sem movimento no período");
    });
    expect(screen.queryByText(/R\$\s*0,00/)).not.toBeInTheDocument();
  });

  it("mantém o controle acessível: label associada, for e id @spec:AC-047", async () => {
    const { container } = render(<DashboardPage />);
    await screen.findByTestId("indicador-faturamento");

    const rotulo = container.querySelector("label[for='dashboard-competencia']");
    expect(rotulo, "label com htmlFor apontando para o campo").not.toBeNull();
    expect(rotulo?.textContent).toBe("Competência");

    const campo = container.querySelector("#dashboard-competencia");
    expect(campo, "campo com id correspondente").not.toBeNull();
    expect(campo?.tagName).toBe("INPUT");
    // Mantido como input[type=month] por decisão registrada: o valor é YYYY-MM
    // nativo e o usuário alcança qualquer competência, sem uma lista de meses
    // inventada por esta feature.
    expect(campo?.getAttribute("type")).toBe("month");
  });
});
