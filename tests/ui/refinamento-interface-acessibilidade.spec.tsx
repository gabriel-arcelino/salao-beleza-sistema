import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Loading } from "../../src/ui/components/Loading";
import { EmptyState } from "../../src/ui/components/EmptyState";
import { ErrorMessage } from "../../src/ui/components/ErrorMessage";

const mocks = vi.hoisted(() => ({
  supabaseFrom: vi.fn(),
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  listClientes: vi.fn(),
  getProdutosEstoqueNegativo: vi.fn(),
  calcularCMV: vi.fn(),
}));

vi.mock("../../src/lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: mocks.onAuthStateChange,
    },
    from: mocks.supabaseFrom,
  },
}));

vi.mock("../../src/lib/api/clientes", () => ({
  listClientes: mocks.listClientes,
  createCliente: vi.fn(),
  desativarCliente: vi.fn(),
}));

vi.mock("../../src/lib/api/estoque", () => ({
  getProdutosEstoqueNegativo: mocks.getProdutosEstoqueNegativo,
  calcularCMV: mocks.calcularCMV,
}));

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset());
  mocks.getSession.mockResolvedValue({ data: { session: { user: { id: "u-1" } } } });
  mocks.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
  mocks.listClientes.mockResolvedValue([]);
  mocks.getProdutosEstoqueNegativo.mockResolvedValue([]);
  mocks.calcularCMV.mockResolvedValue(0);
});

afterEach(() => {
  cleanup();
});

describe("Refinamento de interface — acessibilidade @spec:AC-040", () => {
  it("preserva a semântica de Loading, EmptyState e ErrorMessage @spec:AC-040", () => {
    const loading = render(<Loading message="Carregando comandas..." />);
    const status = loading.container.querySelector('[role="status"]');
    expect(status, "Loading precisa de role=status").not.toBeNull();
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveTextContent("Carregando comandas...");
    loading.unmount();

    const erro = render(<ErrorMessage message="Falha ao carregar." />);
    const alerta = erro.container.querySelector('[role="alert"]');
    expect(alerta, "ErrorMessage precisa de role=alert").not.toBeNull();
    expect(alerta).toHaveAttribute("aria-live", "assertive");
    expect(alerta).toHaveTextContent("Falha ao carregar.");
    erro.unmount();

    const vazio = render(<EmptyState message="Nenhum cliente cadastrado." />);
    const regiao = vazio.container.querySelector('[role="region"]');
    expect(regiao, "EmptyState precisa de role=region").not.toBeNull();
    expect(regiao).toHaveAttribute("aria-label", "Nenhum cliente cadastrado.");
    expect(regiao).toHaveTextContent("Nenhum cliente cadastrado.");
  });

  // O AC-040 exige que as mudanças visuais desta feature não removam a semântica.
  // Isso só é provável nas páginas reais, não no componente isolado.
  it("mantém a semântica dos componentes renderizados pela aplicação @spec:AC-040", async () => {
    // Dashboard: CMV em carregamento (Loading) e consulta de estoque falhando (ErrorMessage).
    mocks.calcularCMV.mockReturnValue(new Promise(() => undefined));
    mocks.getProdutosEstoqueNegativo.mockRejectedValue(new Error("Falha ao consultar estoque."));

    const { default: App } = await import("../../src/App");
    render(<App />);

    const status = await screen.findByRole("status");
    expect(status, "Loading em produção").toHaveAttribute("aria-live", "polite");

    const alerta = await screen.findByRole("alert");
    expect(alerta, "ErrorMessage em produção").toHaveAttribute("aria-live", "assertive");
    expect(alerta).toHaveTextContent("Falha ao consultar estoque.");

    // Clientes: lista vazia depois da navegação (EmptyState).
    fireEvent.click(screen.getByRole("button", { name: "Clientes" }));

    const regiao = await screen.findByRole("region", { name: "Nenhum cliente cadastrado." });
    expect(regiao, "EmptyState em produção").toHaveTextContent("Nenhum cliente cadastrado.");
  }, 15000);
});
