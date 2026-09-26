import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import App from "../../src/App";
import { COLOR_PRIMARY } from "../../src/ui/tokens/colors";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signOut: vi.fn(),
  unsubscribe: vi.fn(),
  listProfissionais: vi.fn(),
  listClientes: vi.fn(),
  listServicos: vi.fn(),
  listProdutos: vi.fn(),
  listConfigComissoes: vi.fn(),
  listComandas: vi.fn(),
  getRelatorioCaixa: vi.fn(),
  getRelatorioComissao: vi.fn(),
  getProdutosEstoqueNegativo: vi.fn(),
  calcularCMV: vi.fn(),
}));

vi.mock("../../src/lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: mocks.onAuthStateChange,
      signOut: mocks.signOut,
    },
  },
}));

vi.mock("../../src/lib/api/profissionais", () => ({
  listProfissionais: mocks.listProfissionais,
  createProfissional: vi.fn(),
  desativarProfissional: vi.fn(),
}));

vi.mock("../../src/lib/api/clientes", () => ({
  listClientes: mocks.listClientes,
  createCliente: vi.fn(),
  desativarCliente: vi.fn(),
}));

vi.mock("../../src/lib/api/servicos", () => ({
  listServicos: mocks.listServicos,
  createServico: vi.fn(),
  desativarServico: vi.fn(),
}));

vi.mock("../../src/lib/api/produtos", () => ({
  listProdutos: mocks.listProdutos,
  createProduto: vi.fn(),
  desativarProduto: vi.fn(),
}));

vi.mock("../../src/lib/api/config_comissoes", () => ({
  listConfigComissoes: mocks.listConfigComissoes,
  createConfigComissao: vi.fn(),
}));

vi.mock("../../src/lib/api/comandas", () => ({
  listComandas: mocks.listComandas,
  createComanda: vi.fn(),
  addItemComanda: vi.fn(),
  getComanda: vi.fn(),
  fecharComanda: vi.fn(),
  cancelarComanda: vi.fn(),
}));

vi.mock("../../src/lib/api/relatorios", () => ({
  getRelatorioCaixa: mocks.getRelatorioCaixa,
  getRelatorioComissao: mocks.getRelatorioComissao,
}));

vi.mock("../../src/lib/api/estoque", () => ({
  getProdutosEstoqueNegativo: mocks.getProdutosEstoqueNegativo,
  calcularCMV: mocks.calcularCMV,
}));

const ABAS = [
  "Dashboard",
  "Profissionais",
  "Clientes",
  "Serviços",
  "Produtos",
  "Configurar Comissão",
  "Comandas",
  "Relatório de Estoque",
  "Fechamento de Caixa",
  "Comissão por Profissional",
];

function aba(nome: string): HTMLElement {
  return screen.getByRole("button", { name: nome });
}

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset());
  mocks.getSession.mockResolvedValue({ data: { session: { user: { id: "u-1" } } } });
  mocks.onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: mocks.unsubscribe } },
  });
  mocks.listProfissionais.mockResolvedValue([]);
  mocks.listClientes.mockResolvedValue([]);
  mocks.listServicos.mockResolvedValue([]);
  mocks.listProdutos.mockResolvedValue([]);
  mocks.listConfigComissoes.mockResolvedValue([]);
  mocks.listComandas.mockResolvedValue([]);
  mocks.getRelatorioCaixa.mockResolvedValue([]);
  mocks.getRelatorioComissao.mockResolvedValue([]);
  mocks.getProdutosEstoqueNegativo.mockResolvedValue([]);
  mocks.calcularCMV.mockResolvedValue(0);
});

afterEach(() => {
  cleanup();
});

async function renderAutenticado() {
  render(<App />);
  await screen.findByRole("button", { name: "Dashboard" });
}

function esperarIndicadorVisivel(nome: string) {
  const botao = aba(nome);
  expect(botao).toHaveAttribute("aria-current", "page");
  expect(botao.style.fontWeight).toBe("bold");
  expect(botao.style.borderBottom).toContain(COLOR_PRIMARY);
  return botao;
}

describe("Navegação — aba ativa @spec:AC-039", () => {
  it("usa COLOR_PRIMARY no borderBottom em vez de cor literal @spec:AC-039", () => {
    const fonte = readFileSync(resolve(process.cwd(), "src/App.tsx"), "utf-8");

    expect(fonte).toMatch(/import\s*\{[^}]*COLOR_PRIMARY[^}]*\}\s*from\s*"\.\/ui\/tokens\/colors"/);
    expect(fonte).toMatch(/borderBottom:\s*[\s\S]{0,80}COLOR_PRIMARY/);
  });

  it("marca a aba inicial como atual com indicador visual e semântico @spec:AC-039", async () => {
    await renderAutenticado();

    esperarIndicadorVisivel("Dashboard");

    for (const nome of ABAS.filter((abaNome) => abaNome !== "Dashboard")) {
      const inativa = aba(nome);
      expect(inativa, nome).not.toHaveAttribute("aria-current");
      expect(inativa.style.fontWeight, nome).toBe("normal");
      expect(inativa.style.borderBottom, nome).not.toContain(COLOR_PRIMARY);
    }
  }, 15000);

  it("preserva peso negrito e transferem o indicador ao trocar de aba @spec:AC-039", async () => {
    await renderAutenticado();

    fireEvent.click(aba("Clientes"));

    esperarIndicadorVisivel("Clientes");

    const anterior = aba("Dashboard");
    expect(anterior).not.toHaveAttribute("aria-current");
    expect(anterior.style.borderBottom).not.toContain(COLOR_PRIMARY);

    // A troca de aba continua funcional: a página destino é renderizada.
    await waitFor(() => expect(mocks.listClientes).toHaveBeenCalled());
  }, 15000);

  it("não marca o botão de sair como aba atual @spec:AC-039", async () => {
    await renderAutenticado();

    const sair = screen.getByRole("button", { name: "Sair" });

    expect(sair).not.toHaveAttribute("aria-current");
    expect(sair.style.borderBottom ?? "").not.toContain(COLOR_PRIMARY);
  }, 15000);

  it("mantém a altura da barra com borda de mesma espessura em todas as abas @spec:AC-039", async () => {
    await renderAutenticado();

    const espessuras = ABAS.map((nome) => {
      const largura = Number.parseFloat(aba(nome).style.borderBottomWidth);
      expect(Number.isFinite(largura), nome).toBe(true);
      return largura;
    });

    // Trocar de aba não deve alterar a altura da barra de navegação.
    expect(new Set(espessuras).size).toBe(1);
  }, 15000);
});
