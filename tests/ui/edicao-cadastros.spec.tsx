// Prova do comportamento de interface da edicao de clientes e produtos.
//
// Feature edicao-clientes-produtos, task 4.2.
//
// Cobre AC-001, AC-002, AC-003, AC-005, AC-007, AC-008, AC-009, AC-013 e a parte
// de comunicacao de AC-014. A parte de integridade de AC-006 e AC-012 tem prova na
// camada de API (tests/api/cadastros.spec.ts), onde a traducao e verificavel.
//
// A semantica de comanda de AC-010 e AC-011 tem prova em
// supabase/tests/018_edicao_produto_preserva_comanda.sql — e a interface nao tem
// como provar isso sem subir uma comanda de verdade.
//
// O modulo de API e mockado. O que se prova aqui e o que a TELA faz com a
// resposta: o que envia, o que exibe, e o que nao exibe.

import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ClientesPage } from "../../src/pages/ClientesPage";
import { ProdutosPage } from "../../src/pages/ProdutosPage";

const mocks = vi.hoisted(() => ({
  listClientes: vi.fn(),
  createCliente: vi.fn(),
  updateCliente: vi.fn(),
  desativarCliente: vi.fn(),
  listProdutos: vi.fn(),
  createProduto: vi.fn(),
  updateProduto: vi.fn(),
  desativarProduto: vi.fn(),
}));

vi.mock("../../src/lib/api/clientes", () => ({
  listClientes: mocks.listClientes,
  createCliente: mocks.createCliente,
  updateCliente: mocks.updateCliente,
  desativarCliente: mocks.desativarCliente,
}));

vi.mock("../../src/lib/api/produtos", () => ({
  listProdutos: mocks.listProdutos,
  createProduto: mocks.createProduto,
  updateProduto: mocks.updateProduto,
  desativarProduto: mocks.desativarProduto,
}));

const CLIENTE = {
  id: "c1", salon_id: "s1", nome: "Ana Souza", telefone: "111", email: "ana@x.com",
  observacoes: "prefere manha", ativo: true, created_at: "", updated_at: "",
};
const PRODUTO = {
  id: "p1", salon_id: "s1", sku: "SKU-1", nome: "Shampoo", categoria: "Cuidado",
  preco_custo: 10, preco_venda: 25, percentual_comissao: 12, estoque_minimo: 5,
  estoque_atual: 100, ativo: true, created_at: "", updated_at: "",
};

// A listagem e reconsultada depois de gravar, entao o mock precisa devolver valores
// diferentes na segunda chamada: se a tela aplicasse a linha antiga em memoria, a
// alteracao jamais apareceria e a prova passaria a topar.
function clientesQueMudamAoGravar() {
  let jaGravou = false;
  mocks.listClientes.mockImplementation(async () =>
    jaGravou ? [{ ...CLIENTE, nome: "Ana Souza Lima", telefone: "999" }] : [CLIENTE]
  );
  mocks.updateCliente.mockImplementation(async () => {
    jaGravou = true;
    return { ...CLIENTE, nome: "Ana Souza Lima" };
  });
}

function produtosQueMudamAoGravar() {
  let jaGravou = false;
  mocks.listProdutos.mockImplementation(async () =>
    jaGravou
      ? [{ ...PRODUTO, nome: "Shampoo Premium", preco_venda: 40, percentual_comissao: 18 }]
      : [PRODUTO]
  );
  mocks.updateProduto.mockImplementation(async () => {
    jaGravou = true;
    return { ...PRODUTO, nome: "Shampoo Premium" };
  });
}

async function abrirEdicaoDeCliente() {
  render(<ClientesPage />);
  fireEvent.click(await screen.findByRole("button", { name: "Editar" }));
  return screen.findByRole("form", { name: "Formulário de edição de cliente" });
}

async function abrirEdicaoDeProduto() {
  render(<ProdutosPage />);
  fireEvent.click(await screen.findByRole("button", { name: "Editar" }));
  return screen.findByRole("form", { name: "Formulário de edição de produto" });
}

describe("ClientesPage — edicao de cliente (AC-001, AC-002, AC-003, AC-005)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listClientes.mockResolvedValue([CLIENTE]);
    mocks.createCliente.mockResolvedValue(CLIENTE);
    mocks.desativarCliente.mockResolvedValue(undefined);
  });

  it("a edicao salva e a listagem passa a exibir os dados novos (AC-001)", async () => {
    clientesQueMudamAoGravar();
    const form = await abrirEdicaoDeCliente();

    fireEvent.change(within(form).getByLabelText("Nome"), { target: { value: "Ana Souza Lima" } });
    fireEvent.click(within(form).getByRole("button", { name: "Salvar alterações" }));

    await waitFor(() => expect(mocks.updateCliente).toHaveBeenCalledTimes(1));
    expect(mocks.updateCliente.mock.calls[0][0]).toBe(CLIENTE.id);
    expect(mocks.updateCliente.mock.calls[0][1]).toMatchObject({ nome: "Ana Souza Lima" });

    // Reconsultou e a listagem mostra o novo nome.
    await waitFor(() => expect(mocks.listClientes).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("Ana Souza Lima")).toBeInTheDocument();
  });

  it("a edicao abre com os quatro campos preenchidos e alteraveis (AC-002)", async () => {
    const form = await abrirEdicaoDeCliente();
    expect(within(form).getByLabelText("Nome")).toHaveValue("Ana Souza");
    expect(within(form).getByLabelText("Telefone")).toHaveValue("111");
    expect(within(form).getByLabelText("E-mail")).toHaveValue("ana@x.com");
    expect(within(form).getByLabelText("Observações")).toHaveValue("prefere manha");
  });

  it("cancelar a edicao volta ao modo de cadastro sem gravar (AC-003)", async () => {
    const form = await abrirEdicaoDeCliente();
    fireEvent.change(within(form).getByLabelText("Nome"), { target: { value: "Nao deve gravar" } });
    fireEvent.click(within(form).getByRole("button", { name: "Cancelar edição" }));

    await screen.findByRole("form", { name: "Formulário de cadastro de cliente" });
    expect(mocks.updateCliente).not.toHaveBeenCalled();
  });

  // AC-005: o banco aceita e-mail invalido (medido). A prova exige as DUAS
  // coisas: que a gravacao nao saiu, e que o usuario foi avisado. Um teste que
  // verificasse so "nao persistiu" passaria com uma implementacao que apenas
  // ignorasse o campo.
  it("e-mail invalido nao e submetido e o responsavel e avisado (AC-005)", async () => {
    const form = await abrirEdicaoDeCliente();
    fireEvent.change(within(form).getByLabelText("E-mail"), {
      target: { value: "nao-e-email" },
    });
    fireEvent.click(within(form).getByRole("button", { name: "Salvar alterações" }));

    expect(await screen.findByText(/E-mail inválido/i)).toBeInTheDocument();
    expect(mocks.updateCliente).not.toHaveBeenCalled();
  });

  it("falha da API aparece como a mensagem de dominio, sem detalhe do banco (AC-012)", async () => {
    const DOMINIO =
      "Não foi possível salvar a alteração do cliente. O registro não foi encontrado ou você não tem permissão para editá-lo.";
    mocks.updateCliente.mockRejectedValue(new Error(DOMINIO));
    const form = await abrirEdicaoDeCliente();
    fireEvent.click(within(form).getByRole("button", { name: "Salvar alterações" }));

    const alerta = await screen.findByText(DOMINIO);
    expect(alerta).toBeInTheDocument();
    expect(alerta.textContent).not.toContain("PGRST116");
    expect(alerta.textContent).not.toContain("coerce");
  });

  it("o cadastro de cliente continua funcionando (nao regrediu)", async () => {
    render(<ClientesPage />);
    const form = await screen.findByRole("form", { name: "Formulário de cadastro de cliente" });
    fireEvent.change(within(form).getByLabelText("Nome"), { target: { value: "Novo" } });
    fireEvent.click(within(form).getByRole("button", { name: "Cadastrar cliente" }));

    await waitFor(() => expect(mocks.createCliente).toHaveBeenCalledTimes(1));
    expect(mocks.createCliente.mock.calls[0][0]).toMatchObject({ nome: "Novo" });
    expect(mocks.updateCliente).not.toHaveBeenCalled();
  });
});

describe("ProdutosPage — edicao de produto (AC-007, AC-008, AC-009, AC-013, AC-014)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listProdutos.mockResolvedValue([PRODUTO]);
    mocks.createProduto.mockResolvedValue(PRODUTO);
    mocks.desativarProduto.mockResolvedValue(undefined);
  });

  it("a edicao salva e a listagem passa a exibir preco e percentual novos (AC-007)", async () => {
    produtosQueMudamAoGravar();
    const form = await abrirEdicaoDeProduto();

    fireEvent.change(within(form).getByLabelText("Nome"), { target: { value: "Shampoo Premium" } });
    fireEvent.change(within(form).getByLabelText("Preço de venda"), { target: { value: "40" } });
    fireEvent.change(within(form).getByLabelText(/comissão específica/i), {
      target: { value: "18" },
    });
    fireEvent.click(within(form).getByRole("button", { name: "Salvar alterações" }));

    await waitFor(() => expect(mocks.updateProduto).toHaveBeenCalledTimes(1));
    expect(mocks.updateProduto.mock.calls[0][0]).toBe(PRODUTO.id);
    expect(mocks.updateProduto.mock.calls[0][1]).toMatchObject({
      nome: "Shampoo Premium",
      preco_venda: 40,
      percentual_comissao: 18,
    });

    await waitFor(() => expect(mocks.listProdutos).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("Shampoo Premium")).toBeInTheDocument();
    expect(await screen.findByText(/R\$ 40\.00/)).toBeInTheDocument();
  });

  // AC-008, interface: o formulario de edicao nao tem preco de custo nem estoque.
  // A outra metade (o patch nao os alcanca) tem prova em tests/api/cadastros.spec.ts,
  // porque e ali que o objeto enviado e inspecionavel.
  it("o formulario de edicao nao oferece preco de custo nem estoque (AC-008)", async () => {
    const form = await abrirEdicaoDeProduto();
    expect(within(form).queryByLabelText(/custo/i)).not.toBeInTheDocument();
    expect(within(form).queryByLabelText(/estoque/i)).not.toBeInTheDocument();
  });

  it("o percentual gravado e null quando o campo e esvaziado (AC-009)", async () => {
    mocks.updateProduto.mockResolvedValue(PRODUTO);
    const form = await abrirEdicaoDeProduto();

    // O produto tem percentual 12. Esvaziar o campo deve GRAVAR null (herdar o
    // default), e nao undefined (que e descartado e deixaria 12 intacto).
    fireEvent.change(within(form).getByLabelText(/comissão específica/i), { target: { value: "" } });
    fireEvent.click(within(form).getByRole("button", { name: "Salvar alterações" }));

    await waitFor(() => expect(mocks.updateProduto).toHaveBeenCalledTimes(1));
    const patch = mocks.updateProduto.mock.calls[0][1] as Record<string, unknown>;
    expect(patch).toHaveProperty("percentual_comissao", null);
  });

  it("percentual negativo ou acima de 100 nao e submetido (AC-013)", async () => {
    const form = await abrirEdicaoDeProduto();
    const campo = within(form).getByLabelText(/comissão específica/i);

    fireEvent.change(campo, { target: { value: "-5" } });
    fireEvent.click(within(form).getByRole("button", { name: "Salvar alterações" }));
    expect(await screen.findByText(/Percentual de comissão inválido/i)).toBeInTheDocument();
    expect(mocks.updateProduto).not.toHaveBeenCalled();

    fireEvent.change(campo, { target: { value: "150" } });
    fireEvent.click(within(form).getByRole("button", { name: "Salvar alterações" }));
    await waitFor(() => expect(screen.getByText(/Percentual de comissão inválido/i)).toBeInTheDocument());
    expect(mocks.updateProduto).not.toHaveBeenCalled();
  });

  it("preco de venda negativo nao e submetido (AC-013)", async () => {
    const form = await abrirEdicaoDeProduto();
    fireEvent.change(within(form).getByLabelText("Preço de venda"), { target: { value: "-1" } });
    fireEvent.click(within(form).getByRole("button", { name: "Salvar alterações" }));

    expect(await screen.findByText(/Preço de venda inválido/i)).toBeInTheDocument();
    expect(mocks.updateProduto).not.toHaveBeenCalled();
  });

  // AC-014, comunicacao: o criterio e sobre o que a TELA DIZ. A semantica que
  // esse texto descreve tem prova no pgTAP 018.
  it("a tela comunica o efeito do percentual sobre comandas abertas (AC-014)", async () => {
    const form = await abrirEdicaoDeProduto();
    const texto = form.textContent ?? "";

    // Diz que vale para as ainda abertas...
    expect(texto).toMatch(/ainda abertas/);
    // ...e diz que as fechadas nao mudam.
    expect(texto).toMatch(/já\s*\n?\s*fechadas mantêm/);
  });

  it("o cadastro de produto continua funcionando, com o campo de custo (nao regrediu)", async () => {
    render(<ProdutosPage />);
    const form = await screen.findByRole("form", { name: "Formulário de cadastro de produto" });

    // O campo de custo existe no cadastro — e so lá.
    expect(within(form).getByLabelText(/custo/i)).toBeInTheDocument();

    fireEvent.change(within(form).getByLabelText("Nome"), { target: { value: "Novo" } });
    fireEvent.change(within(form).getByLabelText(/custo/i), { target: { value: "10" } });
    fireEvent.change(within(form).getByLabelText("Preço de venda"), { target: { value: "20" } });
    fireEvent.click(within(form).getByRole("button", { name: "Cadastrar produto" }));

    await waitFor(() => expect(mocks.createProduto).toHaveBeenCalledTimes(1));
    expect(mocks.createProduto.mock.calls[0][0]).toMatchObject({
      nome: "Novo",
      preco_custo: 10,
      preco_venda: 20,
    });
    expect(mocks.updateProduto).not.toHaveBeenCalled();
  });
});
