import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { FONT_HEADING, FONT_SIZE_HEADING } from "../../src/ui/tokens/typography";
import { SPACING_MD } from "../../src/ui/tokens/spacing";
import { DashboardPage } from "../../src/pages/DashboardPage";
import { LoginPage } from "../../src/pages/LoginPage";
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
  supabaseFrom: vi.fn(),
  listProfissionais: vi.fn(),
  listClientes: vi.fn(),
  listServicos: vi.fn(),
  listProdutos: vi.fn(),
  listConfigComissoes: vi.fn(),
  listComandas: vi.fn(),
  getComanda: vi.fn(),
  getRelatorioCaixa: vi.fn(),
  getRelatorioComissao: vi.fn(),
  getProdutosEstoqueNegativo: vi.fn(),
  calcularCMV: vi.fn(),
}));

vi.mock("../../src/lib/supabaseClient", () => ({
  supabase: {
    auth: { signInWithPassword: vi.fn() },
    from: mocks.supabaseFrom,
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
  getComanda: mocks.getComanda,
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

const profissional = {
  id: "prof-1",
  nome: "Profissional Teste",
  comissao_percentual_padrao: 40,
  ativo: true,
};

const produto = {
  id: "prod-1",
  nome: "Produto Teste",
  categoria: null,
  preco_venda: 30,
  preco_custo: 20,
  percentual_comissao: null,
  estoque_minimo: 2,
  estoque_atual: -1,
  ativo: true,
};

const comanda = { id: "comanda-1", numero: 1, status: "ABERTA", total: 50 };

// AC-037 — título principal de página com FONT_HEADING e FONT_SIZE_HEADING.
// AC-038 — grupos com estrutura explícita e separação visual entre eles.
const PAGINAS = [
  {
    nome: "DashboardPage",
    arquivo: "src/pages/DashboardPage.tsx",
    titulo: "Dashboard",
    nivel: 2,
    carregar: mocks.getProdutosEstoqueNegativo,
    renderizar: () => <DashboardPage />,
  },
  {
    nome: "LoginPage",
    arquivo: "src/pages/LoginPage.tsx",
    titulo: "Login",
    nivel: 1,
    carregar: null,
    renderizar: () => <LoginPage onLogin={vi.fn()} />,
  },
  {
    nome: "ProfissionaisPage",
    arquivo: "src/pages/ProfissionaisPage.tsx",
    titulo: "Profissionais",
    nivel: 2,
    carregar: mocks.listProfissionais,
    renderizar: () => <ProfissionaisPage />,
  },
  {
    nome: "ClientesPage",
    arquivo: "src/pages/ClientesPage.tsx",
    titulo: "Clientes",
    nivel: 2,
    carregar: mocks.listClientes,
    renderizar: () => <ClientesPage />,
  },
  {
    nome: "ServicosPage",
    arquivo: "src/pages/ServicosPage.tsx",
    titulo: "Serviços",
    nivel: 2,
    carregar: mocks.listServicos,
    renderizar: () => <ServicosPage />,
  },
  {
    nome: "ProdutosPage",
    arquivo: "src/pages/ProdutosPage.tsx",
    titulo: "Produtos",
    nivel: 2,
    carregar: mocks.listProdutos,
    renderizar: () => <ProdutosPage />,
  },
  {
    nome: "ConfigComissoesPage",
    arquivo: "src/pages/ConfigComissoesPage.tsx",
    titulo: "Configuração de Comissão",
    nivel: 2,
    carregar: mocks.listConfigComissoes,
    renderizar: () => <ConfigComissoesPage />,
  },
  {
    nome: "ComandasPage",
    arquivo: "src/pages/ComandasPage.tsx",
    titulo: "Comandas",
    nivel: 2,
    carregar: mocks.listComandas,
    renderizar: () => <ComandasPage />,
  },
  {
    nome: "RelatorioEstoquePage",
    arquivo: "src/pages/RelatorioEstoquePage.tsx",
    titulo: "Relatório: Saldo Negativo — Pendente de Correção",
    nivel: 2,
    carregar: mocks.getProdutosEstoqueNegativo,
    renderizar: () => <RelatorioEstoquePage />,
  },
  {
    nome: "RelatorioCaixaPage",
    arquivo: "src/pages/RelatorioCaixaPage.tsx",
    titulo: "Relatório: Fechamento de Caixa",
    nivel: 2,
    carregar: null,
    renderizar: () => <RelatorioCaixaPage />,
  },
  {
    nome: "RelatorioComissaoPage",
    arquivo: "src/pages/RelatorioComissaoPage.tsx",
    titulo: "Relatório: Comissão por Profissional",
    nivel: 2,
    carregar: mocks.listProfissionais,
    renderizar: () => <RelatorioComissaoPage />,
  },
];

// Grupo explícito: div com role="group", section com aria-label ou form nomeado
// (form nomeado é o landmark "form" com nome acessível, equivalente estrutural).
const SELETOR_GRUPO = '[role="group"], section[aria-label], form[aria-label]';

function gruposDaPagina(container: HTMLElement): HTMLElement[] {
  const raiz = container.firstElementChild;
  if (!raiz) return [];

  return Array.from(raiz.children).filter((filho): filho is HTMLElement =>
    filho instanceof HTMLElement && filho.matches(SELETOR_GRUPO)
  );
}

function temCard(grupo: HTMLElement): boolean {
  return grupo.querySelector('[data-testid="card"]') !== null;
}

function temBordaPersistente(grupo: HTMLElement): boolean {
  const calculado = window.getComputedStyle(grupo);
  const borda = ["top", "right", "bottom", "left"].some((lado) => {
    const largura = Number.parseFloat(calculado.getPropertyValue(`border-${lado}-width`));
    const tipo = calculado.getPropertyValue(`border-${lado}-style`);
    return Number.isFinite(largura) && largura > 0 && tipo !== "none" && tipo !== "hidden";
  });

  if (borda) return true;

  return [
    grupo.style.border,
    grupo.style.borderTop,
    grupo.style.borderRight,
    grupo.style.borderBottom,
    grupo.style.borderLeft,
  ].some((valor) => {
    const texto = valor.trim().toLowerCase();
    return texto.length > 0 && !texto.includes("none") && !texto.includes("hidden");
  });
}

function margemDoGrupo(grupo: HTMLElement): number {
  return Math.max(
    Number.parseFloat(grupo.style.marginTop || "") || 0,
    Number.parseFloat(grupo.style.marginBottom || "") || 0
  );
}

// AC-038: mecanismos válidos são Card, borda ou marginTop/marginBottom >= SPACING_MD.
// O `gap` interno do formulário nunca é aceito aqui.
function temSeparacaoVisual(grupo: HTMLElement): boolean {
  return (
    margemDoGrupo(grupo) >= SPACING_MD || temCard(grupo) || temBordaPersistente(grupo)
  );
}

function rotulo(grupo: HTMLElement): string {
  return grupo.getAttribute("aria-label") ?? grupo.tagName.toLowerCase();
}

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset());
  mocks.listProfissionais.mockResolvedValue([profissional]);
  mocks.listClientes.mockResolvedValue([]);
  mocks.listServicos.mockResolvedValue([]);
  mocks.listProdutos.mockResolvedValue([produto]);
  mocks.listConfigComissoes.mockResolvedValue([]);
  mocks.listComandas.mockResolvedValue([comanda]);
  mocks.getComanda.mockResolvedValue({ ...comanda, itens: [], pagamentos: [] });
  mocks.getRelatorioCaixa.mockResolvedValue([]);
  mocks.getRelatorioComissao.mockResolvedValue([]);
  mocks.getProdutosEstoqueNegativo.mockResolvedValue([produto]);
  mocks.calcularCMV.mockResolvedValue(1234.56);
});

afterEach(() => {
  cleanup();
});

describe("Refinamento de interface — tipografia @spec:AC-037 @spec:AC-038", () => {
  it("define FONT_SIZE_HEADING e referencia FONT_HEADING/FONT_SIZE_HEADING no título principal @spec:AC-037", () => {
    const fonteTokens = readFileSync(
      resolve(process.cwd(), "src/ui/tokens/typography.ts"),
      "utf-8"
    );

    expect(fonteTokens).toMatch(/FONT_SIZE_HEADING\s*=\s*"1\.5rem"/);
    expect(FONT_SIZE_HEADING).toBe("1.5rem");

    for (const pagina of PAGINAS) {
      const fonte = readFileSync(resolve(process.cwd(), pagina.arquivo), "utf-8");

      expect(
        fonte,
        pagina.nome
      ).toMatch(/import\s*\{[^}]*FONT_SIZE_HEADING[^}]*\}\s*from\s*"\.\.\/ui\/tokens\/typography"/);

      const aberturaTitulo = fonte.match(/<h[12]\b[^>]*>/)?.[0] ?? "";

      expect(aberturaTitulo, `${pagina.nome}: título principal`).toContain("fontFamily: FONT_HEADING");
      expect(aberturaTitulo, `${pagina.nome}: título principal`).toContain("fontSize: FONT_SIZE_HEADING");
      expect(aberturaTitulo, `${pagina.nome}: valor literal não substitui o token`).not.toContain(
        "1.5rem"
      );
    }
  });

  it.each(PAGINAS)(
    "aplica os tokens no título principal e separa visualmente os grupos de $nome @spec:AC-037 @spec:AC-038",
    async (pagina) => {
      const { container } = render(pagina.renderizar());
      if (pagina.carregar) {
        await waitFor(() => expect(pagina.carregar).toHaveBeenCalled());
      }

      // AC-037 — tamanho e família do título vêm dos tokens.
      const titulo = screen.getByRole("heading", { level: pagina.nivel, name: pagina.titulo });
      expect(titulo.style.fontFamily, pagina.nome).toBe(FONT_HEADING);
      expect(titulo.style.fontSize, pagina.nome).toBe(FONT_SIZE_HEADING);

      // AC-038 — grupos explícitos, conteúdo dentro deles e separação visual entre eles.
      const grupos = gruposDaPagina(container);
      expect(grupos.length, `${pagina.nome}: ao menos um grupo explícito`).toBeGreaterThanOrEqual(1);

      const conteudos = Array.from(
        container.querySelectorAll<HTMLElement>("form, ul, table, [role='region']")
      );
      expect(conteudos.length, `${pagina.nome}: há conteúdo a agrupar`).toBeGreaterThan(0);

      for (const conteudo of conteudos) {
        expect(
          conteudo.closest(SELETOR_GRUPO),
          `${pagina.nome}: "${conteudo.tagName.toLowerCase()}" fora de qualquer grupo explícito`
        ).not.toBeNull();
      }

      if (grupos.length > 1) {
        for (let indice = 1; indice < grupos.length; indice += 1) {
          const anterior = grupos[indice - 1];
          const atual = grupos[indice];

          expect(
            temSeparacaoVisual(anterior) || temSeparacaoVisual(atual),
            `${pagina.nome}: sem separação visual entre "${rotulo(anterior)}" e "${rotulo(atual)}"`
          ).toBe(true);
        }
      } else {
        expect(
          temSeparacaoVisual(grupos[0]),
          `${pagina.nome}: o único grupo precisa estar separado do título`
        ).toBe(true);
      }
    },
    15000
  );

  // Guarda do verificador: se o helper passar a aceitar `gap`, este teste quebra.
  // Não é rastreabilidade; é a prova de que AC-038 não pode ser satisfeita por `gap`.
  it("reprova grupo cuja única separação é o gap interno do formulário", () => {
    const container = document.createElement("div");
    container.innerHTML = `
      <section>
        <h2>Título</h2>
        <form aria-label="Formulário" style="display: grid; gap: 24px"></form>
        <section aria-label="Lista"></section>
      </section>
    `;

    const grupos = gruposDaPagina(container);

    expect(grupos).toHaveLength(2);
    expect(grupos[0].getAttribute("style")).toContain("gap: 24px");
    expect(temSeparacaoVisual(grupos[0])).toBe(false);
    expect(temSeparacaoVisual(grupos[1])).toBe(false);
  });
});
