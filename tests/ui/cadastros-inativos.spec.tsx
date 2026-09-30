// Prova das duas direcoes do filtro de cadastros inativos.
//
// Feature cadastros-inativos-operacoes-novas, task T-065.
//
// Direcao EXCLUSAO: um servico, produto ou profissional desativado nao pode ser
// escolhido numa operacao NOVA.
//
// Direcao PRESERVACAO: o filtro nao pode vazar para onde o inativo precisa
// continuar visivel - as telas de cadastro, o relatorio de comissao, e o item JA
// registrado de uma comanda.
//
// A segunda direcao e a que pega o erro classico: filtrar em list* resolveria os
// dois problemas e apagaria o cadastro desativado da tela que o responsavel usa
// para ver o que desativou. Por isso ela tem assercao propria.

import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ComandasPage } from "../../src/pages/ComandasPage";
import { ConfigComissoesPage } from "../../src/pages/ConfigComissoesPage";
import { ProfissionaisPage } from "../../src/pages/ProfissionaisPage";
import { RelatorioComissaoPage } from "../../src/pages/RelatorioComissaoPage";

const mocks = vi.hoisted(() => ({
  listComandas: vi.fn(),
  addItemComanda: vi.fn(),
  getComanda: vi.fn(),
  createComanda: vi.fn(),
  fecharComanda: vi.fn(),
  cancelarComanda: vi.fn(),
  listProfissionais: vi.fn(),
  listServicos: vi.fn(),
  listProdutos: vi.fn(),
  listConfigComissoes: vi.fn(),
  createConfigComissao: vi.fn(),
}));

vi.mock("../../src/lib/api/comandas", () => ({
  listComandas: mocks.listComandas,
  createComanda: mocks.createComanda,
  addItemComanda: mocks.addItemComanda,
  getComanda: mocks.getComanda,
  fecharComanda: mocks.fecharComanda,
  cancelarComanda: mocks.cancelarComanda,
}));
vi.mock("../../src/lib/api/profissionais", () => ({
  listProfissionais: mocks.listProfissionais,
  createProfissional: vi.fn(),
  updateProfissional: vi.fn(),
  desativarProfissional: vi.fn(),
}));
vi.mock("../../src/lib/api/servicos", () => ({
  listServicos: mocks.listServicos,
  createServico: vi.fn(),
  updateServico: vi.fn(),
  desativarServico: vi.fn(),
}));
vi.mock("../../src/lib/api/produtos", () => ({
  listProdutos: mocks.listProdutos,
  createProduto: vi.fn(),
  updateProduto: vi.fn(),
  desativarProduto: vi.fn(),
}));
vi.mock("../../src/lib/api/config_comissoes", () => ({
  listConfigComissoes: mocks.listConfigComissoes,
  createConfigComissao: mocks.createConfigComissao,
  updateConfigComissao: vi.fn(),
}));

function prof(n: number) {
  return {
    id: `p${n}`,
    nome: `Prof ${n} ${n % 2 ? "inativo" : "ativo"}`,
    telefone: null,
    comissao_percentual_padrao: 40,
    ativo: n % 2 === 0,
  };
}
function serv(n: number) {
  return {
    id: `s${n}`,
    nome: `Serv ${n} ${n % 2 ? "inativo" : "ativo"}`,
    categoria: null,
    preco: 50,
    duracao_minutos: 30,
    ativo: n % 2 === 0,
  };
}
function prod(n: number) {
  return {
    id: `d${n}`,
    nome: `Prod ${n} ${n % 2 ? "inativo" : "ativo"}`,
    sku: null,
    categoria: null,
    preco_custo: 10,
    preco_venda: 20,
    percentual_comissao: null,
    estoque_minimo: 1,
    estoque_atual: 10,
    ativo: n % 2 === 0,
  };
}

const COMANDA_COM_ITEM_DE_SERVICO_INATIVO = {
  id: "cmd-1",
  numero: 1,
  status: "ABERTA",
  total: 50,
  subtotal: 50,
  desconto: 0,
  cliente_id: null,
  uuid_cliente: "11111111-1111-1111-1111-111111111111",
  profissional_id: "p2",
  itens: [
    {
      id: "it-1",
      tipo: "SERVICO",
      descricao_snapshot: "Corte que foi desativado depois",
      quantidade: 1,
      preco_unitario: 50,
      total: 50,
      comissao_valor_snapshot: null,
      comissao_percentual_snapshot: null,
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listComandas.mockResolvedValue([COMANDA_COM_ITEM_DE_SERVICO_INATIVO]);
  mocks.getComanda.mockResolvedValue(COMANDA_COM_ITEM_DE_SERVICO_INATIVO);
  mocks.listProfissionais.mockResolvedValue([prof(1), prof(2)]);
  mocks.listServicos.mockResolvedValue([serv(1), serv(2)]);
  mocks.listProdutos.mockResolvedValue([prod(1), prod(2)]);
  mocks.listConfigComissoes.mockResolvedValue([]);
});

// Os selects de operacao nova tem id proprio. Buscar por id em vez de por texto
// de label: "Profissional (opcional)" aparece duas vezes na tela de comandas, e
// o texto do label nao e um alvo estavel.
function opcoesDoSelect(id: string) {
  const campo = document.getElementById(id);
  if (!(campo instanceof HTMLSelectElement)) {
    throw new Error(`select #${id} nao encontrado`);
  }
  return within(campo).getAllByRole("option").map((o) => o.textContent ?? "");
}

function umItem(id: string) {
  const campo = document.getElementById(id);
  if (!(campo instanceof HTMLSelectElement)) {
    throw new Error(`select #${id} nao encontrado`);
  }
  return campo;
}

async function abrirComanda() {
  render(<ComandasPage />);
  fireEvent.click(await screen.findByRole("button", { name: "Ver" }));
  await waitFor(() => expect(mocks.getComanda).toHaveBeenCalled());
}

describe("Operacao nova nao oferece cadastro inativo (AC-080, AC-082, AC-083, AC-084, AC-085)", () => {
  it("o item novo nao oferece servico inativo @spec:AC-080", async () => {
    await abrirComanda();
    const opcoes = opcoesDoSelect("comanda-item-servico");
    expect(opcoes.some((o) => o.includes("Serv 2 ativo"))).toBe(true);
    expect(opcoes.some((o) => o.includes("Serv 1 inativo"))).toBe(false);
  });

  it("o item novo nao oferece produto inativo @spec:AC-082", async () => {
    await abrirComanda();
    fireEvent.change(umItem("comanda-item-tipo"), { target: { value: "PRODUTO" } });
    const opcoes = opcoesDoSelect("comanda-item-produto");
    expect(opcoes.some((o) => o.includes("Prod 2 ativo"))).toBe(true);
    expect(opcoes.some((o) => o.includes("Prod 1 inativo"))).toBe(false);
  });

  it("o item novo nao oferece profissional inativo @spec:AC-083", async () => {
    await abrirComanda();
    const opcoes = opcoesDoSelect("comanda-item-profissional");
    expect(opcoes.some((o) => o.includes("Prof 2 ativo"))).toBe(true);
    expect(opcoes.some((o) => o.includes("Prof 1 inativo"))).toBe(false);
  });

  it("a comanda nao e atribuida a profissional inativo @spec:AC-084", async () => {
    render(<ComandasPage />);
    await waitFor(() => expect(mocks.listProfissionais).toHaveBeenCalled());
    const opcoes = opcoesDoSelect("comanda-profissional");
    expect(opcoes.some((o) => o.includes("Prof 2 ativo"))).toBe(true);
    expect(opcoes.some((o) => o.includes("Prof 1 inativo"))).toBe(false);
  });

  it("a configuracao nova nao oferece profissional nem servico inativos @spec:AC-085", async () => {
    render(<ConfigComissoesPage />);
    await waitFor(() => expect(mocks.listConfigComissoes).toHaveBeenCalled());

    const profs = opcoesDoSelect("config-comissao-profissional");
    expect(profs.some((o) => o.includes("Prof 2 ativo"))).toBe(true);
    expect(profs.some((o) => o.includes("Prof 1 inativo"))).toBe(false);

    const servs = opcoesDoSelect("config-comissao-servico");
    expect(servs.some((o) => o.includes("Serv 2 ativo"))).toBe(true);
    expect(servs.some((o) => o.includes("Serv 1 inativo"))).toBe(false);
  });
});

describe("O filtro nao vaza para onde o inativo precisa continuar visivel (AC-081, AC-086, AC-087, AC-088)", () => {
  it("item JA registrado de servico desativado continua exibindo descricao e preco @spec:AC-081", async () => {
    await abrirComanda();
    // O item foi gravado antes da desativacao e exibe por descricao_snapshot, sem
    // depender de nenhuma das listas de cadastro. Se sumisse, o historico teria
    // sido quebrado; se aparecesse na selecao, o filtro nao teria sido aplicado.
    // O <li> junta descricao, quantidade e preco em nos de texto irmaos, entao
    // casamos o elemento pelo textContent em vez de pedir um texto exato.
    const itens = within(screen.getByRole("region", { name: "Itens da comanda" }));
    const linha = itens.getByText((_texto, el) => el?.tagName === "LI");
    expect(linha).toHaveTextContent("Corte que foi desativado depois");
    expect(linha).toHaveTextContent("1x R$ 50.00 = R$ 50.00");
  });

  it("config existente de profissional desativado continua exibindo o nome @spec:AC-086", async () => {
    mocks.listConfigComissoes.mockResolvedValue([
      {
        id: "cfg-1",
        profissional_id: "p1",
        servico_id: null,
        comissao_percentual: 40,
        base_calculo: "BRUTO",
        rateio_taxa: "SALAO",
        rateio_por_metodo: {},
        ativo: true,
      },
    ]);
    render(<ConfigComissoesPage />);
    await waitFor(() => expect(mocks.listConfigComissoes).toHaveBeenCalled());
    // O select esconde o inativo, mas a listagem de configs precisa mostrar o NOME
    // dele. Se o filtro tivesse alcancado a lista completa, apareceria "p1".
    expect(await screen.findAllByText("Prof 1 inativo")).not.toHaveLength(0);
    expect(screen.queryByText("p1")).not.toBeInTheDocument();
  });

  it("a tela de cadastro continua listando o inativo, marcado como inativo @spec:AC-087", async () => {
    render(<ProfissionaisPage />);
    await waitFor(() => expect(mocks.listProfissionais).toHaveBeenCalled());
    expect(await screen.findByText("Prof 2 ativo")).toBeInTheDocument();
    expect(await screen.findByText("Prof 1 inativo")).toBeInTheDocument();
    expect(screen.getByText("(inativo)")).toBeInTheDocument();
  });

  it("o relatorio de comissao continua oferecendo o profissional inativo @spec:AC-088", async () => {
    render(<RelatorioComissaoPage />);
    await waitFor(() => expect(mocks.listProfissionais).toHaveBeenCalled());
    // Sem id nesta tela, e o label "Profissional" e unico nela.
    const campo = screen.getByLabelText("Profissional", { exact: true });
    const opcoes = within(campo as HTMLSelectElement)
      .getAllByRole("option")
      .map((o) => o.textContent ?? "");
    expect(opcoes.some((o) => o.includes("Prof 1 inativo"))).toBe(true);
    expect(opcoes.some((o) => o.includes("Prof 2 ativo"))).toBe(true);
  });
});
