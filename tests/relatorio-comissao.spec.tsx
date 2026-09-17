import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RelatorioComissaoPage } from "../src/pages/RelatorioComissaoPage";

const mockRpc = vi.fn();

vi.mock("../src/lib/supabaseClient", () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

vi.mock("../src/lib/api/profissionais", () => ({
  listProfissionais: () => Promise.resolve([{ id: "prof-1", nome: "Prof Teste", ativo: true }]),
}));

describe("RelatorioComissaoPage @spec:AC-010 @spec:AC-011", () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  it("filtra o relatório de comissão com competência e profissional @spec:AC-010", async () => {
    mockRpc.mockResolvedValueOnce({ data: [{ competencia: "2026-01", profissional_id: "prof-1", items: [{ comandaId: "c-1", numero: 1, clienteNome: "Cliente A", itemTipo: "SERVICO", descricaoSnapshot: "Serviço", quantidade: 1, precoUnitario: 100, total: 100, comissaoPercentualSnapshot: 20, comissaoValorSnapshot: 20 }], total_bruto: 100, total_comissao: 20 }], error: null });
    render(<RelatorioComissaoPage />);

    await waitFor(() => expect(screen.getByLabelText(/profissional/i)).toBeInTheDocument());

    const competencia = screen.getByPlaceholderText(/2026-01/i);
    const select = screen.getByLabelText(/profissional/i);
    const btn = screen.getByRole("button", { name: /filtrar/i });

    fireEvent.change(competencia, { target: { value: "2026-01" } });
    fireEvent.change(select, { target: { value: "prof-1" } });
    fireEvent.click(btn);

    await waitFor(() => expect(mockRpc).toHaveBeenCalledWith("fn_relatorio_comissao", { p_competencia: "2026-01", p_profissional_id_param: "prof-1" }));
    expect(screen.getByText(/total bruto/i)).toBeInTheDocument();
  });

  it("informa quando não há dados @spec:AC-011", async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null });
    render(<RelatorioComissaoPage />);

    await waitFor(() => expect(screen.getByLabelText(/profissional/i)).toBeInTheDocument());

    const competencia = screen.getByPlaceholderText(/2026-01/i);
    const select = screen.getByLabelText(/profissional/i);
    const btn = screen.getByRole("button", { name: /filtrar/i });

    fireEvent.change(competencia, { target: { value: "2025-01" } });
    fireEvent.change(select, { target: { value: "prof-1" } });
    fireEvent.click(btn);

    await waitFor(() => expect(screen.getByText(/nenhum registro encontrado/i)).toBeInTheDocument());
  });
});
