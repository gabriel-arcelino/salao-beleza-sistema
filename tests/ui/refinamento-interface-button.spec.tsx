import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Button } from "../../src/ui/components/Button";
import { LoginPage } from "../../src/pages/LoginPage";
import { ProfissionaisPage } from "../../src/pages/ProfissionaisPage";
import { ClientesPage } from "../../src/pages/ClientesPage";
import { ServicosPage } from "../../src/pages/ServicosPage";
import { ProdutosPage } from "../../src/pages/ProdutosPage";
import { ConfigComissoesPage } from "../../src/pages/ConfigComissoesPage";
import { ComandasPage } from "../../src/pages/ComandasPage";
import { RelatorioCaixaPage } from "../../src/pages/RelatorioCaixaPage";
import { RelatorioComissaoPage } from "../../src/pages/RelatorioComissaoPage";

const mocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  supabaseFrom: vi.fn(),
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
  getRelatorioCaixa: vi.fn(),
  getRelatorioComissao: vi.fn(),
}));

vi.mock("../../src/lib/supabaseClient", () => ({
  supabase: {
    auth: { signInWithPassword: mocks.signInWithPassword },
    from: mocks.supabaseFrom,
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
  telefone: null,
  email: null,
  observacoes: null,
  ativo: true,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const servico = {
  id: "servico-1",
  salon_id: "salao-1",
  nome: "Serviço Teste",
  categoria: null,
  preco: 50,
  duracao_minutos: 30,
  ativo: true,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const produto = {
  id: "produto-1",
  salon_id: "salao-1",
  sku: null,
  nome: "Produto Teste",
  categoria: null,
  preco_custo: 20,
  preco_venda: 30,
  percentual_comissao: null,
  estoque_minimo: 2,
  estoque_atual: 10,
  ativo: true,
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

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset());
  mocks.signInWithPassword.mockResolvedValue({ error: null });
  mocks.listProfissionais.mockResolvedValue([profissional]);
  mocks.listClientes.mockResolvedValue([cliente]);
  mocks.listServicos.mockResolvedValue([servico]);
  mocks.listProdutos.mockResolvedValue([produto]);
  mocks.listConfigComissoes.mockResolvedValue([]);
  mocks.listComandas.mockResolvedValue([comanda]);
  mocks.getComanda.mockResolvedValue({ ...comanda, itens: [], pagamentos: [] });
  mocks.getRelatorioCaixa.mockResolvedValue([]);
  mocks.getRelatorioComissao.mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
});

function estilo(button: HTMLElement) {
  const computed = window.getComputedStyle(button);
  return {
    backgroundColor: computed.backgroundColor,
    color: computed.color,
    fontWeight: computed.fontWeight,
  };
}

describe("Refinamento de interface — Button @spec:AC-035 @spec:AC-036", () => {
  it("renderiza variantes primary, neutral e destructive visualmente distintas @spec:AC-035 @spec:AC-036", () => {
    render(
      <>
        <Button variant="primary">Ação primária</Button>
        <Button variant="neutral">Ação neutra</Button>
        <Button variant="destructive">Ação destrutiva</Button>
      </>
    );

    const primary = screen.getByRole("button", { name: "Ação primária" });
    const neutral = screen.getByRole("button", { name: "Ação neutra" });
    const destructive = screen.getByRole("button", { name: "Ação destrutiva" });

    expect(primary).toHaveAttribute("data-variant", "primary");
    expect(neutral).toHaveAttribute("data-variant", "neutral");
    expect(destructive).toHaveAttribute("data-variant", "destructive");

    const primaryStyle = estilo(primary);
    const neutralStyle = estilo(neutral);
    const destructiveStyle = estilo(destructive);

    expect(primaryStyle.backgroundColor).not.toBe(neutralStyle.backgroundColor);
    expect(primaryStyle.color).not.toBe(neutralStyle.color);
    expect(destructiveStyle.color).not.toBe(neutralStyle.color);
    expect(primaryStyle.backgroundColor).not.toBe(destructiveStyle.backgroundColor);
  }, 15000);

  it.each([
    {
      nome: "Login",
      acao: "Entrar",
      renderizar: () => <LoginPage onLogin={vi.fn()} />,
    },
    {
      nome: "Profissionais",
      acao: "Cadastrar profissional",
      renderizar: () => <ProfissionaisPage />,
    },
    {
      nome: "Clientes",
      acao: "Cadastrar cliente",
      renderizar: () => <ClientesPage />,
    },
    {
      nome: "Serviços",
      acao: "Cadastrar serviço",
      renderizar: () => <ServicosPage />,
    },
    {
      nome: "Produtos",
      acao: "Cadastrar produto",
      renderizar: () => <ProdutosPage />,
    },
    {
      nome: "Configuração de Comissão",
      acao: "Salvar configuração",
      renderizar: () => <ConfigComissoesPage />,
    },
    {
      nome: "Comandas",
      acao: "Abrir comanda",
      renderizar: () => <ComandasPage />,
    },
    {
      nome: "Relatório de Caixa",
      acao: "Filtrar",
      renderizar: () => <RelatorioCaixaPage />,
    },
    {
      nome: "Relatório de Comissão",
      acao: "Filtrar",
      renderizar: () => <RelatorioComissaoPage />,
    },
  ])(
    "aplica a variante primary à ação principal de $nome @spec:AC-035",
    async ({ nome, acao, renderizar }) => {
      render(renderizar());
      const botao = await screen.findByRole("button", { name: acao });

      expect(botao, nome).toHaveAttribute("data-variant", "primary");
      expect(estilo(botao).backgroundColor, nome).not.toBe("rgba(0, 0, 0, 0)");
    },
    10000
  );

  it("mantém Adicionar item e Fechar comanda como ações primárias na comanda selecionada @spec:AC-035", async () => {
    render(<ComandasPage />);

    const ver = await screen.findByRole("button", { name: "Ver" });
    expect(ver).toHaveAttribute("data-variant", "neutral");
    fireEvent.click(ver);

    expect(await screen.findByRole("button", { name: "Adicionar item" })).toHaveAttribute(
      "data-variant",
      "primary"
    );
    const fechar = screen.getByRole("button", { name: "Fechar comanda" });
    expect(fechar).toHaveAttribute("data-variant", "primary");
    expect(fechar).toBeDisabled();
  });

  it.each([
    {
      nome: "Profissionais",
      acao: "Desativar",
      renderizar: () => <ProfissionaisPage />,
    },
    {
      nome: "Clientes",
      acao: "Desativar",
      renderizar: () => <ClientesPage />,
    },
    {
      nome: "Serviços",
      acao: "Desativar",
      renderizar: () => <ServicosPage />,
    },
    {
      nome: "Produtos",
      acao: "Desativar",
      renderizar: () => <ProdutosPage />,
    },
    {
      nome: "Comandas",
      acao: "Cancelar",
      renderizar: () => <ComandasPage />,
    },
  ])(
    "aplica a variante destructive à ação $acao de $nome @spec:AC-036",
    async ({ nome, acao, renderizar }) => {
      render(renderizar());
      const destrutivo = await screen.findByRole("button", { name: acao });

      expect(destrutivo, nome).toHaveAttribute("data-variant", "destructive");
      expect(estilo(destrutivo).color, nome).not.toBe("rgb(51, 51, 51)");
    },
    10000
  );
});
