// Prova do caminho de volta: reativar um cadastro desativado, e a falha de
// escrita aparecer em vez de sumir.
//
// Feature reativar-cadastros, tasks T-068, T-069 e T-070.
//
// O loja abaixo e mutavel de proposito. Reativar precisa ter efeito OBSERVAVEL
// para o teste significantemente: se `ativar*` nao mudasse nada, o registro
// voltaria a aparecer na operacao nova por acidente do mock, e AC-090 passaria
// sem que a feature fizesse nada. As telas recarregam depois da acao, entao o
// efeito aparece como na aplicacao.

import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ClientesPage } from "../../src/pages/ClientesPage";
import { ProdutosPage } from "../../src/pages/ProdutosPage";
import { ServicosPage } from "../../src/pages/ServicosPage";
import { ProfissionaisPage } from "../../src/pages/ProfissionaisPage";
import { ComandasPage } from "../../src/pages/ComandasPage";
import { ConfigComissoesPage } from "../../src/pages/ConfigComissoesPage";

// Cada entidade tem o SEU fixture. Antes havia um so, com o formato de
// profissional, e `ProdutosPage` quebrava em `p.preco_custo.toFixed(2)` - a tela
// nao renderizava e o teste reprovava com "nao encontrei o nome", que aponta para
// o seletor errado e nao para a causa. O fixture precisa ter os campos que a tela
// LÊ na listagem, nao os que a API recebe.
function clienteAtivo() {
  return { id: "c2", nome: "Ana Ativa", telefone: null, email: null, observacoes: null, ativo: true };
}
function clienteInativo() {
  return { id: "c1", nome: "Bruno Inativo", telefone: null, email: null, observacoes: null, ativo: false };
}
function produtoAtivo() {
  return {
    id: "d2", nome: "Shampoo Ativo", sku: null, categoria: null, preco_custo: 10,
    preco_venda: 20, percentual_comissao: null, estoque_minimo: 1, estoque_atual: 10, ativo: true,
  };
}
function produtoInativo() {
  return {
    id: "d1", nome: "Condicionador Inativo", sku: null, categoria: null, preco_custo: 10,
    preco_venda: 20, percentual_comissao: null, estoque_minimo: 1, estoque_atual: 0, ativo: false,
  };
}
function profAtivo() {
  return { id: "p2", nome: "Carla Ativa", telefone: null, comissao_percentual_padrao: 40, ativo: true };
}
function profInativo() {
  return { id: "p1", nome: "Bruno Inativo", telefone: null, comissao_percentual_padrao: 40, ativo: false };
}
function servicoAtivo() {
  return { id: "s2", nome: "Corte Ativo", categoria: null, preco: 50, duracao_minutos: 30, ativo: true };
}
function servicoInativo() {
  return { id: "s1", nome: "Pigmentacao Inativa", categoria: null, preco: 80, duracao_minutos: 60, ativo: false };
}

// Uma comanda ABERTA e o que faz o formulario de item existir. Sem ela, o
// `ComandasPage` mostra so a lista e nao ha `<select>` de servico para inspecionar
// - o erro aparece como "select #comanda-item-servico nao encontrado", que parece
// bug de aplicacao e e falta de dado no teste.
const COMANDA = {
  id: "cmd-1", numero: 1, status: "ABERTA", total: 0, subtotal: 0, desconto: 0,
  cliente_id: null, uuid_cliente: "11111111-1111-1111-1111-111111111111",
  profissional_id: null, itens: [],
};

const store = vi.hoisted(() => ({
  clientes: [] as Array<Record<string, unknown>>,
  produtos: [] as Array<Record<string, unknown>>,
  profissionais: [] as Array<Record<string, unknown>>,
  servicos: [] as Array<Record<string, unknown>>,
}));

const mocks = vi.hoisted(() => ({
  listClientes: vi.fn(),
  listProdutos: vi.fn(),
  listProfissionais: vi.fn(),
  listServicos: vi.fn(),
  createCliente: vi.fn(),
  updateCliente: vi.fn(),
  ativarCliente: vi.fn(),
  desativarCliente: vi.fn(),
  ativarProduto: vi.fn(),
  desativarProduto: vi.fn(),
  ativarProfissional: vi.fn(),
  desativarProfissional: vi.fn(),
  ativarServico: vi.fn(),
  desativarServico: vi.fn(),
  listComandas: vi.fn(),
  getComanda: vi.fn(),
  listConfigComissoes: vi.fn(),
}));

vi.mock("../../src/lib/api/clientes", () => ({
  listClientes: mocks.listClientes,
  createCliente: mocks.createCliente,
  updateCliente: mocks.updateCliente,
  ativarCliente: mocks.ativarCliente,
  desativarCliente: mocks.desativarCliente,
}));
vi.mock("../../src/lib/api/produtos", () => ({
  listProdutos: mocks.listProdutos,
  createProduto: vi.fn(),
  updateProduto: vi.fn(),
  ativarProduto: mocks.ativarProduto,
  desativarProduto: mocks.desativarProduto,
}));
vi.mock("../../src/lib/api/profissionais", () => ({
  listProfissionais: mocks.listProfissionais,
  createProfissional: vi.fn(),
  updateProfissional: vi.fn(),
  ativarProfissional: mocks.ativarProfissional,
  desativarProfissional: mocks.desativarProfissional,
}));
vi.mock("../../src/lib/api/servicos", () => ({
  listServicos: mocks.listServicos,
  createServico: vi.fn(),
  updateServico: vi.fn(),
  ativarServico: mocks.ativarServico,
  desativarServico: mocks.desativarServico,
}));
vi.mock("../../src/lib/api/comandas", () => ({
  listComandas: mocks.listComandas,
  getComanda: mocks.getComanda,
  createComanda: vi.fn(),
  addItemComanda: vi.fn(),
  fecharComanda: vi.fn(),
  cancelarComanda: vi.fn(),
}));
vi.mock("../../src/lib/api/config_comissoes", () => ({
  listConfigComissoes: mocks.listConfigComissoes,
  createConfigComissao: vi.fn(),
  updateConfigComissao: vi.fn(),
}));

// A loja e a fonte da verdade: `ativar*` muda o registro, e `list*` devolve o
// estado corrente. E o que faz a reativacao ter efeito observavel.
function idsDe(linha: Record<string, unknown>) {
  return linha.id as string;
}
function alternar(linhas: Array<Record<string, unknown>>, id: string, valor: boolean) {
  const alvo = linhas.find((l) => idsDe(l) === id);
  if (!alvo) throw new Error(`registro ${id} ausente da loja`);
  alvo.ativo = valor;
}

beforeEach(() => {
  vi.clearAllMocks();
  store.clientes = [clienteAtivo(), clienteInativo()];
  store.produtos = [produtoAtivo(), produtoInativo()];
  store.profissionais = [profAtivo(), profInativo()];
  store.servicos = [servicoAtivo(), servicoInativo()];

  mocks.listClientes.mockImplementation(async () => store.clientes.map((c) => ({ ...c })));
  mocks.listProdutos.mockImplementation(async () => store.produtos.map((c) => ({ ...c })));
  mocks.listProfissionais.mockImplementation(async () => store.profissionais.map((c) => ({ ...c })));
  mocks.listServicos.mockImplementation(async () => store.servicos.map((c) => ({ ...c })));
  mocks.listComandas.mockResolvedValue([COMANDA]);
  mocks.getComanda.mockResolvedValue(COMANDA);
  mocks.listConfigComissoes.mockResolvedValue([]);

  // A edicao precisa VALER no teste: se update* devolvesse sem alterar a loja, a
  // linha voltaria com o nome antigo e a prova de AC-093 estaria medindo o mock,
  // nao a aplicacao.
  mocks.updateCliente.mockImplementation(async (id: string, patch: Record<string, unknown>) => {
    const alvo = store.clientes.find((c) => c.id === id);
    if (alvo) Object.assign(alvo, patch);
    return { ...alvo };
  });

  mocks.ativarCliente.mockImplementation(async (id: string) => alternar(store.clientes, id, true));
  mocks.ativarProduto.mockImplementation(async (id: string) => alternar(store.produtos, id, true));
  mocks.ativarProfissional.mockImplementation(async (id: string) => alternar(store.profissionais, id, true));
  mocks.ativarServico.mockImplementation(async (id: string) => alternar(store.servicos, id, true));

  mocks.desativarCliente.mockImplementation(async (id: string) => alternar(store.clientes, id, false));
  mocks.desativarProduto.mockImplementation(async (id: string) => alternar(store.produtos, id, false));
  mocks.desativarProfissional.mockImplementation(async (id: string) => alternar(store.profissionais, id, false));
  mocks.desativarServico.mockImplementation(async (id: string) => alternar(store.servicos, id, false));

  // Desativar passa por confirm() no navegador. O stub é devolvido por clique, e
  // nao por teste, porque o comportamento do dialogo nao e o que se prova aqui.
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

// A linha e o <li>; e dentro dele que mora o botao da linha. Sem este recorte, um
// "Reativar" em outra linha satisfaria a asercao.
function linhaDo(nome: string) {
  const el = screen.getByText(nome);
  const li = el.closest("li");
  if (!li) throw new Error(`"${nome}" nao esta dentro de um <li>`);
  return li;
}

function opcoesDoSelect(id: string) {
  const campo = document.getElementById(id);
  if (!(campo instanceof HTMLSelectElement)) throw new Error(`select #${id} nao encontrado`);
  return within(campo).getAllByRole("option").map((o) => o.textContent ?? "");
}

// O select de item da comanda mostra "nome - R$ preco", e o de servico da tela de
// comissao mostra so o nome. Por isso a busca e por TRECHO: `toContain` exato
// reprovaria por causa do preco, e a falha apontaria para o cadastro, nao para o
// texto do option.
function selectOferece(id: string, trecho: string) {
  return opcoesDoSelect(id).some((o) => o.includes(trecho));
}

const TELAS = [
  { nome: "cliente", Pagina: ClientesPage, inativo: "Bruno Inativo", ativo: "Ana Ativa" },
  { nome: "produto", Pagina: ProdutosPage, inativo: "Condicionador Inativo", ativo: "Shampoo Ativo" },
  { nome: "profissional", Pagina: ProfissionaisPage, inativo: "Bruno Inativo", ativo: "Carla Ativa" },
  { nome: "servico", Pagina: ServicosPage, inativo: "Pigmentacao Inativa", ativo: "Corte Ativo" },
] as const;

// O `ComandasPage` so expoe o formulario de item depois que uma comanda e aberta.
// Devolve o `unmount` para o teste poder trocar de tela dentro do mesmo caso, e
// ESPERA as opcoes popularem: abrir a comanda resolve `getComanda`, mas o select
// so ganha as opcoes no render seguinte. Asserir antes disso le a lista ainda
// vazia e reprova sem que haja bug.
async function abrirComanda() {
  const r = render(<ComandasPage />);
  fireEvent.click(await screen.findByRole("button", { name: "Ver" }));
  await waitFor(() => expect(mocks.getComanda).toHaveBeenCalled());
  await waitFor(() => expect(opcoesDoSelect("comanda-item-servico").length).toBeGreaterThan(1));
  return r;
}

describe("A linha inativa oferece a volta (AC-089, AC-091, AC-092)", () => {
  it("a linha inativa oferece Reativar nas quatro telas @spec:AC-089", async () => {
    for (const t of TELAS) {
      const { unmount } = render(<t.Pagina />);
      await waitFor(() => expect(screen.getByText(t.inativo)).toBeInTheDocument());
      const linha = linhaDo(t.inativo);
      expect(within(linha).getByRole("button", { name: "Reativar" }), t.nome).toBeInTheDocument();
      unmount();
    }
  });

  it("a linha ativa oferece Desativar e NAO oferece Reativar @spec:AC-092", async () => {
    for (const t of TELAS) {
      const { unmount } = render(<t.Pagina />);
      await waitFor(() => expect(screen.getByText(t.ativo)).toBeInTheDocument());
      const linha = linhaDo(t.ativo);
      expect(within(linha).getByRole("button", { name: "Desativar" }), t.nome).toBeInTheDocument();
      expect(within(linha).queryByRole("button", { name: "Reativar" }), t.nome).not.toBeInTheDocument();
      unmount();
    }
  });

  it("apos reativar, a linha perde a marca de inativo e ganha Desativar @spec:AC-091", async () => {
    const { unmount } = render(<ServicosPage />);
    await waitFor(() => expect(screen.getByText("Pigmentacao Inativa")).toBeInTheDocument());
    expect(linhaDo("Pigmentacao Inativa")).toHaveTextContent("(inativo)");

    fireEvent.click(within(linhaDo("Pigmentacao Inativa")).getByRole("button", { name: "Reativar" }));
    await waitFor(() => expect(mocks.ativarServico).toHaveBeenCalledWith("s1"));
    await waitFor(() => expect(linhaDo("Pigmentacao Inativa")).not.toHaveTextContent("(inativo)"));

    const linha = linhaDo("Pigmentacao Inativa");
    expect(within(linha).getByRole("button", { name: "Desativar" })).toBeInTheDocument();
    expect(within(linha).queryByRole("button", { name: "Reativar" })).not.toBeInTheDocument();
    unmount();
  });

  it("desativar continua desfazendo: a marca volta e o botao troca de lado @spec:AC-091", async () => {
    // O par precisa ser reversivel nos dois sentidos, senao "Reativar" seria so
    // um botao que nunca pode ser testado de novo.
    const { unmount } = render(<ServicosPage />);
    await waitFor(() => expect(screen.getByText("Corte Ativo")).toBeInTheDocument());

    fireEvent.click(within(linhaDo("Corte Ativo")).getByRole("button", { name: "Desativar" }));
    await waitFor(() => expect(linhaDo("Corte Ativo")).toHaveTextContent("(inativo)"));
    expect(within(linhaDo("Corte Ativo")).queryByRole("button", { name: "Desativar" })).not.toBeInTheDocument();

    fireEvent.click(within(linhaDo("Corte Ativo")).getByRole("button", { name: "Reativar" }));
    await waitFor(() => expect(linhaDo("Corte Ativo")).not.toHaveTextContent("(inativo)"));
    expect(within(linhaDo("Corte Ativo")).getByRole("button", { name: "Desativar" })).toBeInTheDocument();
    unmount();
  });
});

describe("Reativar devolve o cadastro ao uso (AC-090)", () => {
  it("o servico reativado volta a ser oferecido na comanda nova @spec:AC-090", async () => {
    // Antes: o filtro da feature anterior esconde o inativo da operacao nova.
    const primeira = await abrirComanda();
    expect(selectOferece("comanda-item-servico", "Pigmentacao Inativa")).toBe(false);
    expect(selectOferece("comanda-item-servico", "Corte Ativo")).toBe(true);
    primeira.unmount();

    // Reativa pela tela de servicos.
    const segunda = render(<ServicosPage />);
    await waitFor(() => expect(screen.getByText("Pigmentacao Inativa")).toBeInTheDocument());
    fireEvent.click(within(linhaDo("Pigmentacao Inativa")).getByRole("button", { name: "Reativar" }));
    await waitFor(() => expect(mocks.ativarServico).toHaveBeenCalledWith("s1"));
    segunda.unmount();

    // Depois: volta a ser oferecido. Este e o efeito que a feature promete.
    const terceira = await abrirComanda();
    await waitFor(() => expect(selectOferece("comanda-item-servico", "Pigmentacao Inativa")).toBe(true));
    terceira.unmount();
  });

  it("o profissional reativado volta a ser oferecido na comanda nova @spec:AC-090", async () => {
    const primeira = await abrirComanda();
    expect(selectOferece("comanda-item-profissional", "Bruno Inativo")).toBe(false);
    primeira.unmount();

    const segunda = render(<ProfissionaisPage />);
    await waitFor(() => expect(screen.getByText("Bruno Inativo")).toBeInTheDocument());
    fireEvent.click(within(linhaDo("Bruno Inativo")).getByRole("button", { name: "Reativar" }));
    await waitFor(() => expect(mocks.ativarProfissional).toHaveBeenCalledWith("p1"));
    segunda.unmount();

    const terceira = await abrirComanda();
    expect(selectOferece("comanda-item-profissional", "Bruno Inativo")).toBe(true);
    terceira.unmount();
  });

  it("o servico reativado volta a ser oferecido na configuracao de comissao @spec:AC-090", async () => {
    const primeira = render(<ServicosPage />);
    await waitFor(() => expect(screen.getByText("Pigmentacao Inativa")).toBeInTheDocument());
    fireEvent.click(within(linhaDo("Pigmentacao Inativa")).getByRole("button", { name: "Reativar" }));
    await waitFor(() => expect(mocks.ativarServico).toHaveBeenCalledWith("s1"));
    primeira.unmount();

    const segunda = render(<ConfigComissoesPage />);
    await waitFor(() => expect(mocks.listServicos).toHaveBeenCalled());
    expect(selectOferece("config-comissao-servico", "Pigmentacao Inativa")).toBe(true);
    segunda.unmount();
  });
});

describe("Reativar nao e atalho para editar (AC-093)", () => {
  it("salvar a edicao de um inativo nao o reativa @spec:AC-093", async () => {
    const { unmount } = render(<ClientesPage />);
    await waitFor(() => expect(screen.getByText("Bruno Inativo")).toBeInTheDocument());

    fireEvent.click(within(linhaDo("Bruno Inativo")).getByRole("button", { name: "Editar" }));
    const campo = document.getElementById("cliente-nome") as HTMLInputElement;
    fireEvent.change(campo, { target: { value: "Bruno Corrigido" } });
    fireEvent.click(screen.getByRole("button", { name: /salvar altera/i }));

    await waitFor(() => expect(mocks.updateCliente).toHaveBeenCalled());
    // A protecao real e o TIPO: `ativo` nao esta na allowlist de update*, entao o
    // patch nao pode carrega-lo. E o que impede a reativacao de acontecer por
    // efeito colateral de salvar um nome.
    const patch = mocks.updateCliente.mock.calls[0][1] as Record<string, unknown>;
    expect(patch).not.toHaveProperty("ativo");
    expect(patch.nome).toBe("Bruno Corrigido");
    unmount();

    // E o efeito: o cadastro continua inativo depois de salvar a edicao.
    const depois = render(<ClientesPage />);
    await waitFor(() => expect(screen.getByText("Bruno Corrigido")).toBeInTheDocument());
    expect(linhaDo("Bruno Corrigido")).toHaveTextContent("(inativo)");
    expect(within(linhaDo("Bruno Corrigido")).getByRole("button", { name: "Reativar" })).toBeInTheDocument();
    depois.unmount();
  });
});

describe("A falha de escrita aparece (AC-094)", () => {
  const RECUSA = new Error(
    "Não foi possível reativar o cliente. O registro não foi encontrado ou você não tem permissão."
  );

  it("uma escrita recusada vira mensagem e o cadastro fica como estava @spec:AC-094", async () => {
    mocks.ativarCliente.mockRejectedValue(RECUSA);
    const { unmount } = render(<ClientesPage />);
    await waitFor(() => expect(screen.getByText("Bruno Inativo")).toBeInTheDocument());

    const recarregouAntes = mocks.listClientes.mock.calls.length;
    fireEvent.click(within(linhaDo("Bruno Inativo")).getByRole("button", { name: "Reativar" }));

    // A mensagem e a da acao, e aparece.
    expect(await screen.findByText(/não foi possível reativar o cliente/i)).toBeInTheDocument();
    // A recarga nao aconteceu: recarregar depois de uma falha e o que fazia a
    // recusa parecer sucesso, porque a lista voltava igual.
    expect(mocks.listClientes.mock.calls.length).toBe(recarregouAntes);
    unmount();
  });

  it("a falha de desativar tambem aparece @spec:AC-094", async () => {
    mocks.desativarServico.mockRejectedValue(
      new Error("Não foi possível desativar o serviço. O registro não foi encontrado ou você não tem permissão.")
    );
    const { unmount } = render(<ServicosPage />);
    await waitFor(() => expect(screen.getByText("Corte Ativo")).toBeInTheDocument());

    fireEvent.click(within(linhaDo("Corte Ativo")).getByRole("button", { name: "Desativar" }));
    expect(await screen.findByText(/não foi possível desativar o serviço/i)).toBeInTheDocument();
    unmount();
  });

  it("a mensagem nao vaza detalhe tecnico @spec:AC-094", async () => {
    mocks.ativarCliente.mockRejectedValue(RECUSA);
    const { unmount } = render(<ClientesPage />);
    await waitFor(() => expect(screen.getByText("Bruno Inativo")).toBeInTheDocument());
    fireEvent.click(within(linhaDo("Bruno Inativo")).getByRole("button", { name: "Reativar" }));

    const aviso = await screen.findByText(/não foi possível reativar o cliente/i);
    const m = aviso.textContent ?? "";
    expect(m).not.toMatch(/PGRST/i);
    expect(m).not.toMatch(/postgrest/i);
    expect(m).not.toMatch(/violates|constraint|relation/i);
    expect(m).not.toMatch(/\d{8}-\d{4}-\d{4}-\d{4}-\d{12}/);
    expect(m).not.toContain("clientes");
    unmount();
  });
});
