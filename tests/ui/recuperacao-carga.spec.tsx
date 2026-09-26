import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ErrorMessage } from "../../src/ui/components/ErrorMessage";
import { DashboardPage } from "../../src/pages/DashboardPage";
import { ClientesPage } from "../../src/pages/ClientesPage";
import { ProfissionaisPage } from "../../src/pages/ProfissionaisPage";
import { ServicosPage } from "../../src/pages/ServicosPage";
import { ProdutosPage } from "../../src/pages/ProdutosPage";
import { ConfigComissoesPage } from "../../src/pages/ConfigComissoesPage";
import { ComandasPage } from "../../src/pages/ComandasPage";
import { RelatorioEstoquePage } from "../../src/pages/RelatorioEstoquePage";
import { RelatorioCaixaPage } from "../../src/pages/RelatorioCaixaPage";
import { RelatorioComissaoPage } from "../../src/pages/RelatorioComissaoPage";

const mocks = vi.hoisted(() => ({
  getProdutosEstoqueNegativo: vi.fn(),
  calcularCMV: vi.fn(),
  listClientes: vi.fn(),
  listProfissionais: vi.fn(),
  listServicos: vi.fn(),
  listProdutos: vi.fn(),
  listConfigComissoes: vi.fn(),
  listComandas: vi.fn(),
  getRelatorioCaixa: vi.fn(),
  getRelatorioComissao: vi.fn(),
}));

vi.mock("../../src/lib/api/estoque", () => ({
  getProdutosEstoqueNegativo: mocks.getProdutosEstoqueNegativo,
  calcularCMV: mocks.calcularCMV,
}));

vi.mock("../../src/lib/api/clientes", () => ({
  listClientes: mocks.listClientes,
  createCliente: vi.fn(),
  desativarCliente: vi.fn(),
}));

vi.mock("../../src/lib/api/profissionais", () => ({
  listProfissionais: mocks.listProfissionais,
  createProfissional: vi.fn(),
  desativarProfissional: vi.fn(),
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

const FALHA = "Falha ao consultar o estoque.";

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset());
  mocks.calcularCMV.mockResolvedValue(0);
  mocks.listProfissionais.mockResolvedValue([]);
  mocks.listServicos.mockResolvedValue([]);
  mocks.listProdutos.mockResolvedValue([]);
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

// AC-044: a recuperação não pode ser amostra. Os dois relatórios de caixa e comissão
// só carregam por submit do formulário, então a falha precisa ser provocada por ele —
// não há carga inicial para quebrar.
const PAGINAS_COM_FALHA_NO_MOUNT: {
  nome: string;
  falhar: () => void;
  renderizar: () => JSX.Element;
}[] = [
  {
    nome: "Dashboard",
    falhar: () => mocks.getProdutosEstoqueNegativo.mockRejectedValue(new Error(FALHA)),
    renderizar: () => <DashboardPage />,
  },
  {
    nome: "Clientes",
    falhar: () => mocks.listClientes.mockRejectedValue(new Error(FALHA)),
    renderizar: () => <ClientesPage />,
  },
  {
    nome: "Profissionais",
    falhar: () => mocks.listProfissionais.mockRejectedValue(new Error(FALHA)),
    renderizar: () => <ProfissionaisPage />,
  },
  {
    nome: "Serviços",
    falhar: () => mocks.listServicos.mockRejectedValue(new Error(FALHA)),
    renderizar: () => <ServicosPage />,
  },
  {
    nome: "Produtos",
    falhar: () => mocks.listProdutos.mockRejectedValue(new Error(FALHA)),
    renderizar: () => <ProdutosPage />,
  },
  {
    nome: "Configuração de Comissão",
    falhar: () => mocks.listConfigComissoes.mockRejectedValue(new Error(FALHA)),
    renderizar: () => <ConfigComissoesPage />,
  },
  {
    nome: "Comandas",
    falhar: () => mocks.listComandas.mockRejectedValue(new Error(FALHA)),
    renderizar: () => <ComandasPage />,
  },
  {
    nome: "Relatório de Estoque",
    falhar: () => mocks.getProdutosEstoqueNegativo.mockRejectedValue(new Error(FALHA)),
    renderizar: () => <RelatorioEstoquePage />,
  },
];

describe("Recuperação de carga — cobertura @spec:AC-044", () => {
  it.each(PAGINAS_COM_FALHA_NO_MOUNT)(
    "oferece tentar novamente em $nome quando a carga inicial falha @spec:AC-044",
    async ({ nome, falhar, renderizar }) => {
      falhar();
      render(renderizar());

      const alerta = await screen.findByRole("alert");
      expect(alerta, nome).toHaveTextContent(FALHA);
      expect(screen.getByRole("button", { name: "Tentar novamente" }), nome).toBeVisible();
    },
    15000
  );

  it("oferece tentar novamente no Fechamento de Caixa quando a consulta falha @spec:AC-044", async () => {
    mocks.getRelatorioCaixa.mockRejectedValue(new Error(FALHA));
    render(<RelatorioCaixaPage />);

    fireEvent.change(screen.getByLabelText("Início"), { target: { value: "2026-01-01" } });
    fireEvent.change(screen.getByLabelText("Fim"), { target: { value: "2026-01-31" } });
    fireEvent.click(screen.getByRole("button", { name: "Filtrar" }));

    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent(FALHA);
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeVisible();
  }, 15000);

  it("oferece tentar novamente na Comissão por Profissional quando a consulta falha @spec:AC-044", async () => {
    mocks.listProfissionais.mockResolvedValue([{ id: "prof-1", nome: "Profissional Teste", ativo: true }]);
    mocks.getRelatorioComissao.mockRejectedValue(new Error(FALHA));
    render(<RelatorioComissaoPage />);

    fireEvent.change(screen.getByLabelText("Competência (YYYY-MM)"), {
      target: { value: "2026-01" },
    });
    fireEvent.change(await screen.findByLabelText("Profissional"), {
      target: { value: "prof-1" },
    });
    // fireEvent.submit no formulário: é o mesmo disparo usado pela spec de estados vazios.
    fireEvent.submit(screen.getByRole("button", { name: "Filtrar" }).closest("form")!);

    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent(FALHA);
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeVisible();
  }, 15000);
});
