import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ErrorMessage } from "../../src/ui/components/ErrorMessage";
import { DashboardPage } from "../../src/pages/DashboardPage";

const mocks = vi.hoisted(() => ({
  getProdutosEstoqueNegativo: vi.fn(),
  calcularCMV: vi.fn(),
}));

vi.mock("../../src/lib/api/estoque", () => ({
  getProdutosEstoqueNegativo: mocks.getProdutosEstoqueNegativo,
  calcularCMV: mocks.calcularCMV,
}));

const FALHA = "Falha ao consultar o estoque.";

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset());
});

afterEach(() => {
  cleanup();
});

describe("Recuperação de carga — @spec:AC-042 @spec:AC-043 @spec:AC-045", () => {
  it("mantém a semântica de alerta com e sem a ação de recuperação @spec:AC-045", () => {
    const semAcao = render(<ErrorMessage message="Falha na operação." />);
    const alerta = semAcao.container.querySelector('[role="alert"]');

    expect(alerta, "role=alert preservado").not.toBeNull();
    expect(alerta).toHaveAttribute("aria-live", "assertive");
    expect(alerta).toHaveTextContent("Falha na operação.");
    expect(
      screen.queryByRole("button", { name: "Tentar novamente" }),
      "sem onRetry não há ação de recuperação"
    ).not.toBeInTheDocument();
    semAcao.unmount();

    render(<ErrorMessage message="Falha na operação." onRetry={vi.fn()} />);
    const comAcao = screen.getByRole("alert");

    expect(comAcao, "role=alert preservado com onRetry").toHaveAttribute("aria-live", "assertive");
    expect(comAcao).toHaveTextContent("Falha na operação.");
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeVisible();
  });

  it("oferece tentar novamente quando a carga falha @spec:AC-042", async () => {
    mocks.getProdutosEstoqueNegativo.mockRejectedValue(new Error(FALHA));
    mocks.calcularCMV.mockResolvedValue(0);

    render(<DashboardPage />);

    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent(FALHA);
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeVisible();
  }, 15000);

  it("reexecuta a carga e limpa o erro quando a nova tentativa funciona @spec:AC-042 @spec:AC-043", async () => {
    mocks.getProdutosEstoqueNegativo.mockRejectedValueOnce(new Error(FALHA));
    mocks.getProdutosEstoqueNegativo.mockResolvedValueOnce([
      { id: "p-1", nome: "Produto Negativo", estoque_atual: -3, estoque_minimo: 0 },
    ]);
    mocks.calcularCMV.mockResolvedValue(1234.56);

    render(<DashboardPage />);

    await screen.findByRole("alert");

    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));

    // O erro some...
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    // ...e os dados da segunda chamada aparecem.
    expect(await screen.findByText(/Produto Negativo/)).toBeVisible();
    expect(screen.getByText(/1234\.56/)).toBeVisible();

    // A carga inicial falhou uma vez; a segunda chamada é a nova tentativa.
    expect(mocks.getProdutosEstoqueNegativo).toHaveBeenCalledTimes(2);
    expect(mocks.getProdutosEstoqueNegativo).toHaveBeenNthCalledWith(1);
    expect(mocks.getProdutosEstoqueNegativo).toHaveBeenNthCalledWith(2);
  }, 15000);
});
