import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RelatorioCaixaPage } from "../src/pages/RelatorioCaixaPage";

const mockRpc = vi.fn();

vi.mock("../src/lib/supabaseClient", () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

describe("RelatorioCaixaPage @spec:AC-009 @spec:AC-011", () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  it("filtra o relatório de caixa com intervalo informado @spec:AC-009", async () => {
    mockRpc.mockResolvedValueOnce({ data: [{ data_inicio: "2026-01-01", data_fim: "2026-01-31", total_vendas: 100, total_entradas: 80, total_saidas: 30, saldo_inicial: 10, saldo_final: 60 }], error: null });
    render(<RelatorioCaixaPage />);

    const inicio = screen.getByLabelText(/início/i);
    const fim = screen.getByLabelText(/fim/i);
    const btn = screen.getByRole("button", { name: /filtrar/i });

    fireEvent.change(inicio, { target: { value: "2026-01-01" } });
    fireEvent.change(fim, { target: { value: "2026-01-31" } });
    fireEvent.click(btn);

    await waitFor(() => expect(mockRpc).toHaveBeenCalledWith("fn_relatorio_caixa", { p_data_inicio: "2026-01-01", p_data_fim: "2026-01-31" }));
    expect(screen.getByText("2026-01-01")).toBeInTheDocument();
  });

  it("informa quando não há dados @spec:AC-011", async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null });
    render(<RelatorioCaixaPage />);

    const inicio = screen.getByLabelText(/início/i);
    const fim = screen.getByLabelText(/fim/i);
    const btn = screen.getByRole("button", { name: /filtrar/i });

    fireEvent.change(inicio, { target: { value: "2025-01-01" } });
    fireEvent.change(fim, { target: { value: "2025-01-31" } });
    fireEvent.click(btn);

    await waitFor(() => expect(screen.getByText(/nenhum registro encontrado/i)).toBeInTheDocument());
  });
});
