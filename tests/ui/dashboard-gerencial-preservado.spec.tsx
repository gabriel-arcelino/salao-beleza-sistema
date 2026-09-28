// T-033 — Provas de apresentação: o conteúdo preexistente sobreviveu.
//
// AC-054 — o dashboard preserva o alerta de estoque negativo.
// AC-055 — o dashboard preserva a demonstração de e-mail de saldo negativo.
//
// São ACs de preservação: a prova é que o conteúdo que existia antes da
// competência selecionável continua renderizando, e não que um valor está certo.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";

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

const PRODUTOS_NEGATIVOS = [
  { id: "p-1", nome: "Shampoo X", estoque_atual: -5, estoque_minimo: 0 },
  { id: "p-2", nome: "Condicionador Y", estoque_atual: -2, estoque_minimo: 1 },
];

const INDICADORES = {
  faturamento: 5000,
  receitaLiquida: 4900,
  cmv: 1234.56,
  despesas: 800,
  temMovimento: true,
};

describe("Dashboard gerencial — conteúdo preexistente preservado @spec:AC-054 @spec:AC-055", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getIndicadoresDashboard.mockResolvedValue(INDICADORES);
    mocks.getProdutosEstoqueNegativo.mockResolvedValue(PRODUTOS_NEGATIVOS);
  });

  afterEach(() => {
    cleanup();
  });

  it("mantém o alerta de estoque negativo com a contagem de produtos @spec:AC-054", async () => {
    render(<DashboardPage />);
    await screen.findByTestId("indicador-faturamento");

    expect(screen.getByRole("heading", { level: 3, name: /Alerta: Estoque Negativo/i })).toBeInTheDocument();
    // A contagem é o conteúdo do alerta: dois produtos em saldo negativo.
    expect(screen.getByText(/2 produto\(s\) com estoque negativo/)).toBeInTheDocument();
    // E o alerta não pode ser substituído pela mensagem de "sem movimento",
    // que pertence a outro grupo da tela.
    expect(screen.queryByText("Sem movimento no período")).not.toBeInTheDocument();
  });

  it("mantém a demonstração de e-mail com a lista de produtos em saldo negativo @spec:AC-055", async () => {
    render(<DashboardPage />);
    await screen.findByTestId("indicador-faturamento");

    // Identificada como demonstração, por rótulo acessível.
    const secao = screen.getByRole("region", { name: /Simulação de e-mail diário/i });
    expect(secao).toBeInTheDocument();
    expect(secao).toHaveTextContent("Destinatários: ADMIN, GERENTE");

    // A lista continua com os produtos e o saldo de cada um.
    const itens = secao.querySelectorAll("li");
    expect(itens).toHaveLength(2);
    expect(itens[0]).toHaveTextContent("Shampoo X");
    expect(itens[0]).toHaveTextContent("-5");
    expect(itens[1]).toHaveTextContent("Condicionador Y");
    expect(itens[1]).toHaveTextContent("-2");
  });

  it("alerta e demonstração de e-mail continuam depois de carregar os indicadores @spec:AC-054 @spec:AC-055", async () => {
    render(<DashboardPage />);
    await screen.findByTestId("indicador-faturamento");

    // Os quatro indicadores e o conteúdo preexistente coexistem na mesma tela:
    // o seletor de competência não deslocou o que já existia.
    for (const rotulo of ["Faturamento", "Receita líquida", "CMV", "Despesas"]) {
      expect(screen.getByRole("heading", { level: 3, name: rotulo })).toBeInTheDocument();
    }
    expect(screen.getByText(/2 produto\(s\) com estoque negativo/)).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: /Simulação de e-mail diário/i })
    ).toBeInTheDocument();
  });

  it("sem produtos negativos, o alerta informa o estoque positivo e a demonstração some @spec:AC-054", async () => {
    mocks.getProdutosEstoqueNegativo.mockResolvedValue([]);

    render(<DashboardPage />);
    await screen.findByTestId("indicador-faturamento");

    expect(screen.getByText("Todos os produtos com estoque positivo")).toBeInTheDocument();
    // A demonstração de e-mail é condicionada a haver saldo negativo; sem eles
    // ela não aparece, como antes da competência selecionável.
    expect(screen.queryByRole("region", { name: /Simulação de e-mail diário/i })).not.toBeInTheDocument();
  });
});
