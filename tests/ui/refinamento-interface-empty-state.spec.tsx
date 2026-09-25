import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ProfissionaisPage } from "../../src/pages/ProfissionaisPage";
import { ClientesPage } from "../../src/pages/ClientesPage";
import { ServicosPage } from "../../src/pages/ServicosPage";
import { ProdutosPage } from "../../src/pages/ProdutosPage";
import { ConfigComissoesPage } from "../../src/pages/ConfigComissoesPage";
import { ComandasPage } from "../../src/pages/ComandasPage";
import { RelatorioEstoquePage } from "../../src/pages/RelatorioEstoquePage";
import { RelatorioCaixaPage } from "../../src/pages/RelatorioCaixaPage";
import { RelatorioComissaoPage } from "../../src/pages/RelatorioComissaoPage";

const mocks = vi.hoisted(() => ({
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
  getProdutosEstoqueNegativo: vi.fn(),
  getRelatorioCaixa: vi.fn(),
  getRelatorioComissao: vi.fn(),
  supabaseFrom: vi.fn(),
}));

vi.mock("../../src/lib/supabaseClient", () => ({
  supabase: { from: mocks.supabaseFrom },
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

vi.mock("../../src/lib/api/estoque", () => ({
  getProdutosEstoqueNegativo: mocks.getProdutosEstoqueNegativo,
}));

vi.mock("../../src/lib/api/relatorios", () => ({
  getRelatorioCaixa: mocks.getRelatorioCaixa,
  getRelatorioComissao: mocks.getRelatorioComissao,
}));

const profissional = {
  id: "prof-1",
  salon_id: "salao-1",
  nome: "Profissional Teste",
  telefone: null,
  comissao_percentual_padrao: 40,
  ativo: true,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const cliente = {
  id: "cliente-1",
  salon_id: "salao-1",
  nome: "Cliente Teste",
  telefone: "11999999999",
  email: "cliente@teste.com",
  observacoes: null,
  ativo: true,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const servico = {
  id: "servico-1",
  salon_id: "salao-1",
  nome: "Serviço Teste",
  categoria: "Cuidado",
  preco: 50,
  duracao_minutos: 30,
  ativo: true,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const produto = {
  id: "produto-1",
  salon_id: "salao-1",
  sku: "SKU-1",
  nome: "Produto Teste",
  categoria: "Cuidados",
  preco_custo: 20,
  preco_venda: 30,
  percentual_comissao: null,
  estoque_minimo: 2,
  estoque_atual: -1,
  ativo: true,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const config = {
  id: "config-1",
  salon_id: "salao-1",
  profissional_id: profissional.id,
  servico_id: servico.id,
  comissao_percentual: 15,
  base_calculo: "BRUTO",
  rateio_taxa: "SALAO",
  rateio_taxa_por_forma_pagamento: null,
  comissao_sobre_produto: false,
  timing_repasse: "IMEDIATO",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const comanda = {
  id: "comanda-1",
  salon_id: "salao-1",
  numero: 1,
  uuid_cliente: "uuid-1",
  cliente_id: null,
  profissional_id: null,
  status: "ABERTA",
  subtotal: 50,
  desconto: 0,
  total: 50,
  opened_at: "2026-01-01T00:00:00.000Z",
  closed_at: null,
  created_by: null,
  closed_by: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const relatorioCaixa = {
  data_inicio: "2026-01-01",
  data_fim: "2026-01-31",
  total_vendas: 100,
  total_entradas: 20,
  total_saidas: 10,
  saldo_inicial: 50,
  saldo_final: 160,
};

const relatorioComissao = {
  items: [
    {
      comandaId: comanda.id,
      numero: 1,
      clienteNome: "Cliente Teste",
      itemTipo: "SERVICO",
      descricaoSnapshot: "Serviço Teste",
      quantidade: 1,
      precoUnitario: 50,
      total: 50,
      comissaoPercentualSnapshot: 15,
      comissaoValorSnapshot: 7.5,
    },
  ],
  totalBruto: 50,
  totalComissao: 7.5,
};

const mensagens = {
  profissionais: "Nenhum profissional cadastrado.",
  clientes: "Nenhum cliente cadastrado.",
  servicos: "Nenhum serviço cadastrado.",
  produtos: "Nenhum produto cadastrado.",
  configuracoes: "Nenhuma configuração de comissão cadastrada.",
  comandas: "Nenhuma comanda cadastrada.",
  estoque: "Nenhum produto com estoque negativo. Todos os saldos estão positivos.",
  caixa: "Nenhum registro encontrado para o intervalo informado.",
  comissao: "Nenhum registro encontrado para os filtros informados.",
} as const;

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset());
  mocks.listProfissionais.mockResolvedValue([]);
  mocks.listClientes.mockResolvedValue([]);
  mocks.listServicos.mockResolvedValue([]);
  mocks.listProdutos.mockResolvedValue([]);
  mocks.listConfigComissoes.mockResolvedValue([]);
  mocks.listComandas.mockResolvedValue([]);
  mocks.getProdutosEstoqueNegativo.mockResolvedValue([]);
  mocks.getRelatorioCaixa.mockResolvedValue([]);
  mocks.getRelatorioComissao.mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
});

async function confirmarEmptyStateVisivel(message: string) {
  const estadoVazio = await screen.findByRole("region", { name: message });
  expect(estadoVazio).toHaveAttribute("aria-label", message);
  expect(estadoVazio).toHaveTextContent(message);
  expect(estadoVazio).toBeVisible();
}

async function confirmarEmptyStateDeColecaoVisivel(container: HTMLElement, message: string) {
  const estadoVazio = await screen.findByRole("region", { name: message });
  expect(estadoVazio).toHaveAttribute("aria-label", message);
  expect(estadoVazio).toHaveTextContent(message);
  expect(estadoVazio).toBeVisible();
  expect(estadoVazio.closest("ul, ol, li")).toBeNull();
  expect(container.querySelector("ul, ol, li")).toBeNull();
}

function confirmarEmptyStateAusente(message: string) {
  expect(screen.queryByRole("region", { name: message })).not.toBeInTheDocument();
}

function preencherFiltroCaixa() {
  fireEvent.change(screen.getByLabelText("Início"), { target: { value: "2026-01-01" } });
  fireEvent.change(screen.getByLabelText("Fim"), { target: { value: "2026-01-31" } });
}

async function preencherFiltroComissao() {
  fireEvent.change(screen.getByLabelText("Competência (YYYY-MM)"), {
    target: { value: "2026-01" },
  });
  fireEvent.change(await screen.findByLabelText("Profissional"), {
    target: { value: profissional.id },
  });
}

describe("Refinamento de interface — EmptyState @spec:AC-033 @spec:AC-034", () => {
  it("exibe o estado vazio de profissionais somente quando a lista estiver vazia @spec:AC-033 @spec:AC-034", async () => {
    const listaVazia = render(<ProfissionaisPage />);
    await waitFor(() => expect(mocks.listProfissionais).toHaveBeenCalledTimes(1));
    await confirmarEmptyStateDeColecaoVisivel(listaVazia.container, mensagens.profissionais);
    listaVazia.unmount();

    mocks.listProfissionais.mockResolvedValue([profissional]);
    render(<ProfissionaisPage />);

    expect(await screen.findByText("Profissional Teste")).toBeVisible();
    confirmarEmptyStateAusente(mensagens.profissionais);
  });

  it("exibe o estado vazio de clientes somente quando a lista estiver vazia @spec:AC-033 @spec:AC-034", async () => {
    const listaVazia = render(<ClientesPage />);
    await waitFor(() => expect(mocks.listClientes).toHaveBeenCalledTimes(1));
    await confirmarEmptyStateDeColecaoVisivel(listaVazia.container, mensagens.clientes);
    listaVazia.unmount();

    mocks.listClientes.mockResolvedValue([cliente]);
    render(<ClientesPage />);

    expect(await screen.findByText("Cliente Teste")).toBeVisible();
    confirmarEmptyStateAusente(mensagens.clientes);
  });

  it("exibe o estado vazio de serviços somente quando a lista estiver vazia @spec:AC-033 @spec:AC-034", async () => {
    const listaVazia = render(<ServicosPage />);
    await waitFor(() => expect(mocks.listServicos).toHaveBeenCalledTimes(1));
    await confirmarEmptyStateDeColecaoVisivel(listaVazia.container, mensagens.servicos);
    listaVazia.unmount();

    mocks.listServicos.mockResolvedValue([servico]);
    render(<ServicosPage />);

    expect(await screen.findByText("Serviço Teste")).toBeVisible();
    confirmarEmptyStateAusente(mensagens.servicos);
  });

  it("exibe o estado vazio de produtos somente quando a lista estiver vazia @spec:AC-033 @spec:AC-034", async () => {
    const listaVazia = render(<ProdutosPage />);
    await waitFor(() => expect(mocks.listProdutos).toHaveBeenCalledTimes(1));
    await confirmarEmptyStateDeColecaoVisivel(listaVazia.container, mensagens.produtos);
    listaVazia.unmount();

    mocks.listProdutos.mockResolvedValue([produto]);
    render(<ProdutosPage />);

    expect(await screen.findByText("Produto Teste")).toBeVisible();
    confirmarEmptyStateAusente(mensagens.produtos);
  });

  it("exibe o estado vazio de configurações de comissão somente quando a lista estiver vazia @spec:AC-033 @spec:AC-034", async () => {
    const listaVazia = render(<ConfigComissoesPage />);
    await waitFor(() => expect(mocks.listConfigComissoes).toHaveBeenCalledTimes(1));
    await confirmarEmptyStateDeColecaoVisivel(listaVazia.container, mensagens.configuracoes);
    listaVazia.unmount();

    mocks.listConfigComissoes.mockResolvedValue([config]);
    mocks.listProfissionais.mockResolvedValue([profissional]);
    mocks.listServicos.mockResolvedValue([servico]);
    const listaComConfig = render(<ConfigComissoesPage />);

    await waitFor(() => {
      const lista = listaComConfig.container.querySelector("ul");
      expect(lista).toHaveTextContent(/Profissional Teste.*Serviço Teste.*BRUTO.*SALAO/);
    });
    confirmarEmptyStateAusente(mensagens.configuracoes);
  });

  it("exibe o estado vazio inicial de comandas sem alterar a lista com registros @spec:AC-033 @spec:AC-034", async () => {
    const listaVazia = render(<ComandasPage />);
    await waitFor(() => expect(mocks.listComandas).toHaveBeenCalledTimes(1));
    await confirmarEmptyStateDeColecaoVisivel(listaVazia.container, mensagens.comandas);
    listaVazia.unmount();

    mocks.listComandas.mockResolvedValue([comanda]);
    render(<ComandasPage />);

    expect(await screen.findByRole("button", { name: "Ver" })).toBeVisible();
    confirmarEmptyStateAusente(mensagens.comandas);
  });

  it("aguarda a consulta de estoque antes de exibir o estado vazio @spec:AC-033 @spec:AC-034", async () => {
    let resolverConsulta: (value: typeof produto[]) => void = () => undefined;
    mocks.getProdutosEstoqueNegativo.mockImplementationOnce(
      () =>
        new Promise<typeof produto[]>((resolve) => {
          resolverConsulta = resolve;
        })
    );

    const relatorioVazio = render(<RelatorioEstoquePage />);
    await waitFor(() => expect(mocks.getProdutosEstoqueNegativo).toHaveBeenCalledTimes(1));
    confirmarEmptyStateAusente(mensagens.estoque);

    await act(async () => {
      resolverConsulta([]);
    });
    await confirmarEmptyStateVisivel(mensagens.estoque);
    relatorioVazio.unmount();

    mocks.getProdutosEstoqueNegativo.mockResolvedValue([produto]);
    render(<RelatorioEstoquePage />);

    expect(await screen.findByRole("row", { name: /Produto Teste/ })).toBeVisible();
    confirmarEmptyStateAusente(mensagens.estoque);
  });

  it("só exibe o estado vazio do caixa após uma consulta confirmada @spec:AC-033 @spec:AC-034", async () => {
    const relatorioVazio = render(<RelatorioCaixaPage />);
    preencherFiltroCaixa();
    confirmarEmptyStateAusente(mensagens.caixa);
    expect(mocks.getRelatorioCaixa).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Filtrar" }));
    await waitFor(() =>
      expect(mocks.getRelatorioCaixa).toHaveBeenCalledWith("2026-01-01", "2026-01-31")
    );
    await confirmarEmptyStateVisivel(mensagens.caixa);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    relatorioVazio.unmount();

    mocks.getRelatorioCaixa.mockResolvedValue([relatorioCaixa]);
    render(<RelatorioCaixaPage />);
    preencherFiltroCaixa();
    fireEvent.click(screen.getByRole("button", { name: "Filtrar" }));

    expect(await screen.findByRole("table")).toBeVisible();
    expect(screen.getByText("2026-01-01")).toBeVisible();
    confirmarEmptyStateAusente(mensagens.caixa);
  });

  it("só exibe o estado vazio de comissão após consulta válida e mantém mensagens de validação @spec:AC-033 @spec:AC-034", async () => {
    mocks.listProfissionais.mockResolvedValue([profissional]);
    const relatorioVazio = render(<RelatorioComissaoPage />);

    const formulario = screen.getByRole("button", { name: "Filtrar" }).closest("form");
    expect(formulario).not.toBeNull();
    fireEvent.submit(formulario!);
    expect(await screen.findByText("Selecione um profissional e informe a competência.")).toBeVisible();
    confirmarEmptyStateAusente(mensagens.comissao);
    expect(mocks.getRelatorioComissao).not.toHaveBeenCalled();

    await preencherFiltroComissao();
    confirmarEmptyStateAusente(mensagens.comissao);
    fireEvent.click(screen.getByRole("button", { name: "Filtrar" }));
    await waitFor(() =>
      expect(mocks.getRelatorioComissao).toHaveBeenCalledWith("2026-01", profissional.id)
    );
    await confirmarEmptyStateVisivel(mensagens.comissao);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    relatorioVazio.unmount();

    mocks.getRelatorioComissao.mockResolvedValue([relatorioComissao]);
    render(<RelatorioComissaoPage />);
    await preencherFiltroComissao();
    fireEvent.click(screen.getByRole("button", { name: "Filtrar" }));

    expect(await screen.findByRole("table")).toBeVisible();
    expect(screen.getByText("Cliente Teste")).toBeVisible();
    confirmarEmptyStateAusente(mensagens.comissao);
  });
});
