import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LoginPage } from "../../src/pages/LoginPage";
import { ProfissionaisPage } from "../../src/pages/ProfissionaisPage";
import { ClientesPage } from "../../src/pages/ClientesPage";
import { ServicosPage } from "../../src/pages/ServicosPage";
import { ProdutosPage } from "../../src/pages/ProdutosPage";
import { ConfigComissoesPage } from "../../src/pages/ConfigComissoesPage";
import { ComandasPage } from "../../src/pages/ComandasPage";

const mocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  listProfissionais: vi.fn(),
  createProfissional: vi.fn(),
  desativarProfissional: vi.fn(),
  listClientes: vi.fn(),
  createCliente: vi.fn(),
  desativarCliente: vi.fn(),
  listServicos: vi.fn(),
  createServico: vi.fn(),
  desativarServico: vi.fn(),
  listProdutos: vi.fn(),
  createProduto: vi.fn(),
  desativarProduto: vi.fn(),
  listConfigComissoes: vi.fn(),
  createConfigComissao: vi.fn(),
  listComandas: vi.fn(),
  createComanda: vi.fn(),
  addItemComanda: vi.fn(),
  getComanda: vi.fn(),
  fecharComanda: vi.fn(),
  cancelarComanda: vi.fn(),
}));

vi.mock("../../src/lib/supabaseClient", () => ({
  supabase: {
    auth: {
      signInWithPassword: mocks.signInWithPassword,
    },
  },
}));

vi.mock("../../src/lib/api/profissionais", () => ({
  listProfissionais: mocks.listProfissionais,
  createProfissional: mocks.createProfissional,
  desativarProfissional: mocks.desativarProfissional,
}));

vi.mock("../../src/lib/api/clientes", () => ({
  listClientes: mocks.listClientes,
  createCliente: mocks.createCliente,
  desativarCliente: mocks.desativarCliente,
}));

vi.mock("../../src/lib/api/servicos", () => ({
  listServicos: mocks.listServicos,
  createServico: mocks.createServico,
  desativarServico: mocks.desativarServico,
}));

vi.mock("../../src/lib/api/produtos", () => ({
  listProdutos: mocks.listProdutos,
  createProduto: mocks.createProduto,
  desativarProduto: mocks.desativarProduto,
}));

vi.mock("../../src/lib/api/config_comissoes", () => ({
  listConfigComissoes: mocks.listConfigComissoes,
  createConfigComissao: mocks.createConfigComissao,
}));

vi.mock("../../src/lib/api/comandas", () => ({
  listComandas: mocks.listComandas,
  createComanda: mocks.createComanda,
  addItemComanda: mocks.addItemComanda,
  getComanda: mocks.getComanda,
  fecharComanda: mocks.fecharComanda,
  cancelarComanda: mocks.cancelarComanda,
}));

const profissional = {
  id: "prof-1",
  nome: "Profissional Teste",
  ativo: true,
  comissao_percentual_padrao: 40,
};

const servico = {
  id: "serv-1",
  nome: "Serviço Teste",
  ativo: true,
  preco: 50,
};

const produto = {
  id: "prod-1",
  nome: "Produto Teste",
  ativo: true,
  preco_venda: 30,
  preco_custo: 20,
};

const comanda = {
  id: "comanda-1",
  numero: 1,
  status: "ABERTA",
  total: 50,
};

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset());

  mocks.signInWithPassword.mockResolvedValue({ error: null });
  mocks.listProfissionais.mockResolvedValue([profissional]);
  mocks.listClientes.mockResolvedValue([]);
  mocks.listServicos.mockResolvedValue([servico]);
  mocks.listProdutos.mockResolvedValue([produto]);
  mocks.listConfigComissoes.mockResolvedValue([]);
  mocks.listComandas.mockResolvedValue([comanda]);
  mocks.getComanda.mockResolvedValue({ ...comanda, itens: [], pagamentos: [] });
});

afterEach(() => {
  cleanup();
});

function expectControlsWithValidLabels(container: HTMLElement) {
  const controls = Array.from(
    container.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input, select")
  );
  expect(controls.length).toBeGreaterThan(0);

  const ids = controls.map((control) => control.id);
  expect(ids.every((id) => id.length > 0)).toBe(true);
  expect(new Set(ids).size).toBe(ids.length);

  for (const control of controls) {
    const associatedLabels = Array.from(control.labels ?? []);
    expect(associatedLabels.length).toBeGreaterThan(0);
    expect(associatedLabels.some((label) => (label.textContent ?? "").trim().length > 0)).toBe(true);

    for (const label of associatedLabels) {
      if (label.htmlFor) {
        expect(label.htmlFor).toBe(control.id);
      }
    }
  }
}

describe("Refinamento de interface — formulários @spec:AC-031 @spec:AC-032 @spec:AC-041", () => {
  it("associa labels visíveis e ids únicos aos controles de cadastro @spec:AC-031 @spec:AC-041", async () => {
    const login = render(<LoginPage onLogin={vi.fn()} />);
    expectControlsWithValidLabels(login.container);

    const profissionais = render(<ProfissionaisPage />);
    await waitFor(() => expect(mocks.listProfissionais).toHaveBeenCalled());
    expectControlsWithValidLabels(profissionais.container);

    const clientes = render(<ClientesPage />);
    await waitFor(() => expect(mocks.listClientes).toHaveBeenCalled());
    expectControlsWithValidLabels(clientes.container);

    const servicos = render(<ServicosPage />);
    await waitFor(() => expect(mocks.listServicos).toHaveBeenCalled());
    expectControlsWithValidLabels(servicos.container);

    const produtos = render(<ProdutosPage />);
    await waitFor(() => expect(mocks.listProdutos).toHaveBeenCalled());
    expectControlsWithValidLabels(produtos.container);
  });

  it("preserva labels aninhados válidos e identifica também os campos condicionais de comissão @spec:AC-031 @spec:AC-041", async () => {
    const config = render(<ConfigComissoesPage />);
    await waitFor(() => expect(mocks.listConfigComissoes).toHaveBeenCalled());
    expectControlsWithValidLabels(config.container);

    const rateio = config.container.querySelector<HTMLSelectElement>("#config-comissao-rateio-taxa");
    expect(rateio).not.toBeNull();
    fireEvent.change(rateio!, { target: { value: "POR_FORMA_PAGAMENTO" } });

    expectControlsWithValidLabels(config.container);
  });

  it("asocia todos os controles de comanda, incluindo os formulários de item e pagamento @spec:AC-031 @spec:AC-041", async () => {
    const comandas = render(<ComandasPage />);
    await waitFor(() => expect(mocks.listComandas).toHaveBeenCalled());
    expectControlsWithValidLabels(comandas.container);

    const verComanda = await screen.findByRole("button", { name: "Ver" });
    fireEvent.click(verComanda);
    await waitFor(() => expect(mocks.getComanda).toHaveBeenCalledWith("comanda-1"));
    await screen.findByRole("button", { name: "Adicionar item" });
    expectControlsWithValidLabels(comandas.container);

    const tipoItem = comandas.container.querySelector<HTMLSelectElement>("#comanda-item-tipo");
    expect(tipoItem).not.toBeNull();
    fireEvent.change(tipoItem!, { target: { value: "PRODUTO" } });
    expectControlsWithValidLabels(comandas.container);

    fireEvent.change(tipoItem!, { target: { value: "SERVICO" } });
    expectControlsWithValidLabels(comandas.container);
  });

  it("mantém listas em contêineres estruturais separados por espaçamento explícito @spec:AC-032", async () => {
    const paginas = [
      { nome: "Profissionais", Component: ProfissionaisPage, carregar: mocks.listProfissionais },
      { nome: "Clientes", Component: ClientesPage, carregar: mocks.listClientes },
      { nome: "Serviços", Component: ServicosPage, carregar: mocks.listServicos },
      { nome: "Produtos", Component: ProdutosPage, carregar: mocks.listProdutos },
      { nome: "Comandas", Component: ComandasPage, carregar: mocks.listComandas },
    ];

    for (const pagina of paginas) {
      const { container } = render(<pagina.Component />);
      await waitFor(() => expect(pagina.carregar).toHaveBeenCalled());

      const formulario = container.querySelector("form");
      expect(formulario, pagina.nome).not.toBeNull();

      const conteudoPosterior = formulario?.nextElementSibling as HTMLElement | null;
      expect(conteudoPosterior, pagina.nome).not.toBeNull();
      expect(conteudoPosterior?.tagName).toBe("SECTION");
      expect(conteudoPosterior?.getAttribute("aria-label")).toMatch(/^Lista/);
      expect(conteudoPosterior?.querySelector("ul")).not.toBeNull();
      expect(parseFloat(conteudoPosterior?.style.marginTop ?? "")).toBeGreaterThanOrEqual(24);

      cleanup();
    }
  });
});
