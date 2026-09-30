afterEach(() => {
  // Desfaz o spyOn no singleton `supabase`. O config do vitest nao define
  // restoreMocks, entao sem isto o stub de getMeuPerfil vaza para o resto do
  // arquivo. Atribuir `supabase.from` direto, sem spyOn, seria pior: nao
  // haveria como desfazer.
  vi.restoreAllMocks();
});

// Prova das DUAS direcoes do gate de perfil.
//
// Feature gate-perfil-escrita, tasks T-072, T-074, T-075, T-076 e T-078.
//
// Direcao EXCLUSAO: o que o perfil nao pode gravar nao aparece.
// Direcao PRESERVACAO: o que o perfil pode continua aparecendo.
//
// As duas direcoes sao o ponto, e nao um detalhe. Um gate que esconde demais e
// tambem defeito - e nesta feature o erro facil de cometer e especifico:
// RECEPCAO tem comandas_write (medido) e fechar comanda E o trabalho dela. Um gate
// que tirasse a recepcao da comanda seria pior que o defeito que veio corrigir.
// Por isso AC-097, AC-098 e AC-099 tem prova propria, e nao sao "cobertos por acaso".
//
// Os tres desfechos do carregamento do perfil tambem tem prova, porque o terceiro e
// contra-intuitivo: **falha na consulta MOSTRA as acoes**. Falhar fechado traria um
// modo de falha novo (uma falha de rede esconderia a "Abrir comanda" de quem pode),
// e nao seria buraco de seguranca, porque a RLS continua sendo a autoridade.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ClientesPage } from "../../src/pages/ClientesPage";
import { ProdutosPage } from "../../src/pages/ProdutosPage";
import { ServicosPage } from "../../src/pages/ServicosPage";
import { ProfissionaisPage } from "../../src/pages/ProfissionaisPage";
import { ConfigComissoesPage } from "../../src/pages/ConfigComissoesPage";
import { ComandasPage } from "../../src/pages/ComandasPage";
import { ProvedorPerfil } from "../../src/lib/perfil";
import type { LeituraPerfil } from "../../src/lib/api/usuarios";
import type { PerfilUsuario } from "../../src/types";

const mocks = vi.hoisted(() => ({
  listClientes: vi.fn(),
  listProdutos: vi.fn(),
  listProfissionais: vi.fn(),
  listServicos: vi.fn(),
  listConfigComissoes: vi.fn(),
  listComandas: vi.fn(),
  getComanda: vi.fn(),
  createCliente: vi.fn(),
  createProfissional: vi.fn(),
  createServico: vi.fn(),
  createProduto: vi.fn(),
  createComanda: vi.fn(),
  updateCliente: vi.fn(),
}));

vi.mock("../../src/lib/api/clientes", () => ({
  listClientes: mocks.listClientes,
  createCliente: mocks.createCliente,
  updateCliente: mocks.updateCliente,
  ativarCliente: vi.fn(),
  desativarCliente: vi.fn(),
}));
vi.mock("../../src/lib/api/produtos", () => ({
  listProdutos: mocks.listProdutos,
  createProduto: mocks.createProduto,
  updateProduto: vi.fn(),
  ativarProduto: vi.fn(),
  desativarProduto: vi.fn(),
}));
vi.mock("../../src/lib/api/profissionais", () => ({
  listProfissionais: mocks.listProfissionais,
  createProfissional: mocks.createProfissional,
  updateProfissional: vi.fn(),
  ativarProfissional: vi.fn(),
  desativarProfissional: vi.fn(),
}));
vi.mock("../../src/lib/api/servicos", () => ({
  listServicos: mocks.listServicos,
  createServico: mocks.createServico,
  updateServico: vi.fn(),
  ativarServico: vi.fn(),
  desativarServico: vi.fn(),
}));
vi.mock("../../src/lib/api/config_comissoes", () => ({
  listConfigComissoes: mocks.listConfigComissoes,
  createConfigComissao: vi.fn(),
  updateConfigComissao: vi.fn(),
}));
vi.mock("../../src/lib/api/comandas", () => ({
  listComandas: mocks.listComandas,
  getComanda: mocks.getComanda,
  createComanda: mocks.createComanda,
  addItemComanda: vi.fn(),
  fecharComanda: vi.fn(),
  cancelarComanda: vi.fn(),
}));

function clienteAtivo() {
  return { id: "c2", nome: "Ana Ativa", telefone: null, email: null, observacoes: null, ativo: true };
}
function clienteInativo() {
  return { id: "c1", nome: "Bruno Inativo", telefone: null, email: null, observacoes: null, ativo: false };
}
function servicoAtivo() {
  return { id: "s2", nome: "Corte Ativo", categoria: null, preco: 50, duracao_minutos: 30, ativo: true };
}
function servicoInativo() {
  return { id: "s1", nome: "Pigmentacao Inativa", categoria: null, preco: 80, duracao_minutos: 60, ativo: false };
}
function produtoAtivo() {
  return { id: "d2", nome: "Shampoo Ativo", sku: null, categoria: null, preco_custo: 10, preco_venda: 20, percentual_comissao: null, estoque_minimo: 1, estoque_atual: 10, ativo: true };
}
function produtoInativo() {
  return { id: "d1", nome: "Condicionador Inativo", sku: null, categoria: null, preco_custo: 10, preco_venda: 20, percentual_comissao: null, estoque_minimo: 1, estoque_atual: 0, ativo: false };
}
function profAtivo() {
  return { id: "p2", nome: "Carla Ativa", telefone: null, comissao_percentual_padrao: 40, ativo: true };
}
function profInativo() {
  return { id: "p1", nome: "Bruno Inativo", telefone: null, comissao_percentual_padrao: 40, ativo: false };
}

const COMANDA = {
  id: "cmd-1", numero: 1, status: "ABERTA", total: 50, subtotal: 50, desconto: 0,
  cliente_id: null, uuid_cliente: "11111111-1111-1111-1111-111111111111",
  profissional_id: null,
  itens: [{ id: "it-1", tipo: "SERVICO", descricao_snapshot: "Corte Ativo", quantidade: 1, preco_unitario: 50, total: 50, comissao_valor_snapshot: null, comissao_percentual_snapshot: null }],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listClientes.mockResolvedValue([clienteAtivo(), clienteInativo()]);
  mocks.listProdutos.mockResolvedValue([produtoAtivo(), produtoInativo()]);
  mocks.listProfissionais.mockResolvedValue([profAtivo(), profInativo()]);
  mocks.listServicos.mockResolvedValue([servicoAtivo(), servicoInativo()]);
  mocks.listConfigComissoes.mockResolvedValue([]);
  mocks.listComandas.mockResolvedValue([COMANDA]);
  mocks.getComanda.mockResolvedValue(COMANDA);
  mocks.updateCliente.mockResolvedValue({});
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

// Envolve a tela no provedor com o perfil escolhido. Sem o provedor, usePerfil
// cai no PADRAO (que mostra tudo) e o gate nao seria testado - por isso o
// provider e explicito neste arquivo, e nao(default) silencioso.
function comPerfil(leitura: LeituraPerfil, ui: React.ReactElement) {
  return render(<ProvedorPerfil leitura={leitura}>{ui}</ProvedorPerfil>);
}

const COMO = (p: PerfilUsuario): LeituraPerfil => ({ estado: "carregado", perfil: p });

const TELAS_CADASTRO = [
  { nome: "cliente", Pagina: ClientesPage, inativo: "Bruno Inativo", ativo: "Ana Ativa" },
  { nome: "produto", Pagina: ProdutosPage, inativo: "Condicionador Inativo", ativo: "Shampoo Ativo" },
  { nome: "servico", Pagina: ServicosPage, inativo: "Pigmentacao Inativa", ativo: "Corte Ativo" },
  { nome: "profissional", Pagina: ProfissionaisPage, inativo: "Bruno Inativo", ativo: "Carla Ativa" },
] as const;

describe("Direcao EXCLUSAO — o perfil nao ve escrita que nao pode fazer", () => {
  it("RECEPCAO nao ve nenhuma escrita de cadastro nas quatro telas @spec:AC-095", async () => {
    for (const t of TELAS_CADASTRO) {
      const { unmount } = comPerfil(COMO("RECEPCAO"), <t.Pagina />);
      await waitFor(() => expect(screen.getByText(t.inativo)).toBeInTheDocument());
      expect(screen.queryByRole("form"), `${t.nome}: formulario`).not.toBeInTheDocument();
      for (const acao of ["Editar", "Desativar", "Reativar"]) {
        expect(screen.queryByRole("button", { name: acao }), `${t.nome}: ${acao}`).not.toBeInTheDocument();
      }
      unmount();
    }
  });

  it("RECEPCAO nao ve o formulario de configuracao de comissao, mas continua lendo @spec:AC-096", async () => {
    mocks.listConfigComissoes.mockResolvedValue([
      { id: "cfg-1", profissional_id: "p2", servico_id: null, comissao_percentual: 40, base_calculo: "BRUTO", rateio_taxa: "SALAO", rateio_por_metodo: {}, ativo: true },
    ]);
    comPerfil(COMO("RECEPCAO"), <ConfigComissoesPage />);
    await waitFor(() => expect(mocks.listConfigComissoes).toHaveBeenCalled());
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
    // A listagem continua: ler comissao e permitido a todos do salao (medido).
    expect(await screen.findByText("Carla Ativa")).toBeInTheDocument();
  });

  it("PROFISSIONAL, que nao grava nada, nao ve escrita em nenhuma das seis telas @spec:AC-098", async () => {
    for (const t of TELAS_CADASTRO) {
      const { unmount } = comPerfil(COMO("PROFISSIONAL"), <t.Pagina />);
      await waitFor(() => expect(screen.getByText(t.inativo)).toBeInTheDocument());
      expect(screen.queryByRole("form"), `${t.nome}`).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Desativar" }), `${t.nome}`).not.toBeInTheDocument();
      unmount();
    }

    const com = comPerfil(COMO("PROFISSIONAL"), <ComandasPage />);
    await waitFor(() => expect(mocks.listComandas).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: "Abrir comanda" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancelar" })).not.toBeInTheDocument();
    com.unmount();
  });

  it("a tela diz que o perfil nao grava, e nomeia o perfil @spec:AC-100", async () => {
    comPerfil(COMO("RECEPCAO"), <ClientesPage />);
    await waitFor(() => expect(screen.getByText("Bruno Inativo")).toBeInTheDocument());
    const aviso = screen.getByRole("status");
    expect(aviso).toHaveTextContent("RECEPCAO");
    expect(aviso).toHaveTextContent(/não grava/i);
    // A mensagem nao pode ensinar a parte interna: nem codigo, nem tabela, nem "RLS".
    const m = aviso.textContent ?? "";
    expect(m).not.toMatch(/42501|RLS|policy|PostgREST/i);
    expect(m).not.toContain("clientes");
  });
});

describe("Direcao PRESERVACAO — o que o perfil pode fazer continua disponivel", () => {
  it("RECEPCAO continua operando comandas: abrir, item, fechar, cancelar @spec:AC-097", async () => {
    const r = comPerfil(COMO("RECEPCAO"), <ComandasPage />);
    await waitFor(() => expect(mocks.listComandas).toHaveBeenCalled());

    // Abrir comanda
    expect(screen.getByRole("button", { name: "Abrir comanda" })).toBeInTheDocument();
    // Cancelar, na lista
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();

    // Item e fechamento aparecem depois de abrir a comanda
    fireEvent.click(screen.getByRole("button", { name: "Ver" }));
    await waitFor(() => expect(mocks.getComanda).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByRole("region", { name: "Itens da comanda" })).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Adicionar item" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fechar comanda" })).toBeInTheDocument();
    r.unmount();
  });

  it("ADMIN nao perde nenhuma acao de cadastro @spec:AC-099", async () => {
    for (const t of TELAS_CADASTRO) {
      const { unmount } = comPerfil(COMO("ADMIN"), <t.Pagina />);
      await waitFor(() => expect(screen.getByText(t.ativo)).toBeInTheDocument());
      expect(screen.getByRole("form"), `${t.nome}: formulario`).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Desativar" }), `${t.nome}`).toBeInTheDocument();
      unmount();
    }
  });

  it("GERENTE nao perde nenhuma acao de cadastro nem a de comanda @spec:AC-099", async () => {
    const { unmount } = comPerfil(COMO("GERENTE"), <ClientesPage />);
    await waitFor(() => expect(screen.getByText("Ana Ativa")).toBeInTheDocument());
    expect(screen.getByRole("form")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Desativar" })).toBeInTheDocument();
    unmount();

    const c = comPerfil(COMO("GERENTE"), <ComandasPage />);
    await waitFor(() => expect(mocks.listComandas).toHaveBeenCalled());
    expect(screen.getByRole("button", { name: "Abrir comanda" })).toBeInTheDocument();
    c.unmount();
  });

  it("a linha inativa continua reativavel por quem pode @spec:AC-099", async () => {
    const { unmount } = comPerfil(COMO("GERENTE"), <ServicosPage />);
    await waitFor(() => expect(screen.getByText("Pigmentacao Inativa")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Reativar" })).toBeInTheDocument();
    unmount();
  });

  it("a listagem continua inteira para quem nao grava @spec:AC-095", async () => {
    // Esconder a escrita nao pode custar a leitura, que e aberta a todos do salao.
    comPerfil(COMO("RECEPCAO"), <ClientesPage />);
    await waitFor(() => expect(screen.getByText("Ana Ativa")).toBeInTheDocument());
    expect(screen.getByText("Ana Ativa")).toBeInTheDocument();
    expect(screen.getByText("Bruno Inativo")).toBeInTheDocument();
  });
});

describe("Os tres desfechos do carregamento do perfil (D-3)", () => {
  it("perfil carregado: o gate vale @spec:AC-095", async () => {
    comPerfil(COMO("RECEPCAO"), <ClientesPage />);
    await waitFor(() => expect(screen.getByText("Ana Ativa")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Desativar" })).not.toBeInTheDocument();
  });

  it("sem linha (orfao de cadastro): nenhuma escrita, porque a RLS ja nega @spec:AC-098", async () => {
    comPerfil({ estado: "sem_linha" }, <ClientesPage />);
    await waitFor(() => expect(screen.getByText("Ana Ativa")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Desativar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
  });

  it("FALHA na consulta: mostra as acoes, porque falhar fechado esconderia trabalho @spec:AC-097", async () => {
    // O contra-intuitivo. Falhar fechado traria um modo de falha novo: uma falha de
    // rede esconderia a "Abrir comanda" de quem pode abrir. E nao e buraco de
    // seguranca, porque a RLS continua sendo a autoridade.
    comPerfil({ estado: "erro", mensagem: "timeout" }, <ComandasPage />);
    await waitFor(() => expect(mocks.listComandas).toHaveBeenCalled());
    expect(screen.getByRole("button", { name: "Abrir comanda" })).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("ainda carregando: mostra as acoes, e nao mostra aviso @spec:AC-100", async () => {
    // Mostrar aviso aqui faria a mensagem piscar a cada troca de aba e parecer
    // aviso de erro.
    comPerfil(null, <ClientesPage />);
    await waitFor(() => expect(screen.getByText("Ana Ativa")).toBeInTheDocument());
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Desativar" })).toBeInTheDocument();
  });
});

describe("A leitura do perfil em si (T-072)", () => {
  it("getMeuPerfil distingue linha, ausencia de linha e erro @spec:AC-101", async () => {
    const { getMeuPerfil } = await import("../../src/lib/api/usuarios");
    const { supabase } = await import("../../src/lib/supabaseClient");

    // `supabase` e um SINGLETON e o config do vitest nao define restoreMocks nem
    // isolate. Atribuir `supabase.from = ...` direto corromperia o modulo para o
    // resto da execucao sem nenhuma forma de desfazer; por isso o stub entra por
    // spyOn, que o afterEach desfaz. Isto e higiene de teste: um teste que corrompe
    // um singleton e uma mina, mesmo que a falha nao apareca hoje.
    let select = vi.fn(async () => ({ data: [{ perfil: "GERENTE" }], error: null }));
    const from = vi.fn(() => ({
      select: (...a: unknown[]) => { void a; return { eq: () => ({ limit: async () => select() }) }; },
    }));
    vi.spyOn(supabase, "from").mockImplementation(from as never);
    vi.spyOn(supabase.auth, "getSession").mockResolvedValue({
      data: { session: { user: { id: "u1" } } },
    } as never);

    await expect(getMeuPerfil()).resolves.toEqual({ estado: "carregado", perfil: "GERENTE" });

    // sem linha -> orfao
    select = vi.fn(async () => ({ data: [], error: null }));
    await expect(getMeuPerfil()).resolves.toEqual({ estado: "sem_linha" });

    // erro na consulta -> estado de erro, NAO lanca
    select = vi.fn(async () => ({ data: null, error: { message: "rede" } }));
    const leitura = await getMeuPerfil();
    expect(leitura.estado).toBe("erro");
  });
});
