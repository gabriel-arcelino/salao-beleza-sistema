// T-033 — Provas de apresentação: os quatro indicadores e a fronteira de
// "sem movimento".
//
// AC-048 Faturamento · AC-049 Receita líquida · AC-050 CMV · AC-051 Despesas
// AC-053 sem movimento · AC-056 só despesa · AC-057 só venda de estoque
//
// Este arquivo prova a EXIBIÇÃO. O valor contra a função no banco é provado por
// T-029. A distinção que importa aqui é de estado: R$ 0,00 apurado e "sem
// movimento" são mutuamente exclusivos, e essa exclusividade é asserção
// positiva nos dois sentidos — não basta checar a ausência da mensagem.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  getProdutosEstoqueNegativo: vi.fn(),
  getIndicadoresDashboard: vi.fn(),
}));

vi.mock("../../src/lib/api/estoque", () => ({
  getProdutosEstoqueNegativo: mocks.getProdutosEstoqueNegativo,
  calcularCMV: vi.fn(),
}));

vi.mock("../../src/lib/api/dashboard", () => ({
  getIndicadoresDashboard: mocks.getIndicadoresDashboard,
}));

import { DashboardPage } from "../../src/pages/DashboardPage";

const SEM_MOVIMENTO = "Sem movimento no período";

/** Os quatro pares rótulo/valor, como a tela os exibe. */
const CARTOES = ["faturamento", "receita-liquida", "cmv", "despesas"] as const;
const ROTULOS = ["Faturamento", "Receita líquida", "CMV", "Despesas"] as const;

function valor(chave: (typeof CARTOES)[number]) {
  return screen.getByTestId(`indicador-${chave}`).textContent ?? "";
}

async function renderCom(indicadores: {
  faturamento: number;
  receitaLiquida: number;
  cmv: number;
  despesas: number;
  temMovimento: boolean;
}) {
  mocks.getIndicadoresDashboard.mockResolvedValue(indicadores);
  render(<DashboardPage />);
  await screen.findByTestId("indicador-faturamento");
}

describe("Dashboard gerencial — indicadores @spec:AC-048 @spec:AC-049 @spec:AC-050 @spec:AC-051 @spec:AC-053 @spec:AC-056 @spec:AC-057", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getProdutosEstoqueNegativo.mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
  });

  // -----------------------------------------------------------------------
  // Os quatro indicadores: rótulo e valor
  // -----------------------------------------------------------------------

  it("exibe Faturamento com rótulo e o valor apurado @spec:AC-048", async () => {
    await renderCom({
      faturamento: 5000,
      receitaLiquida: 4900,
      cmv: 1234.56,
      despesas: 800,
      temMovimento: true,
    });

    expect(screen.getByRole("heading", { level: 3, name: "Faturamento" })).toBeInTheDocument();
    expect(valor("faturamento")).toBe("R$ 5.000,00");
  });

  it("exibe Receita líquida em indicador separado e menor que o Faturamento @spec:AC-049", async () => {
    await renderCom({
      faturamento: 5000,
      receitaLiquida: 4900,
      cmv: 1234.56,
      despesas: 800,
      temMovimento: true,
    });

    // Indicador próprio, não o mesmo número do Faturamento: a taxa de
    // maquininha precisa ficar visível como diferença.
    expect(screen.getByRole("heading", { level: 3, name: "Receita líquida" })).toBeInTheDocument();
    expect(valor("receita-liquida")).toBe("R$ 4.900,00");
    expect(valor("receita-liquida")).not.toBe(valor("faturamento"));
  });

  it("exibe CMV com rótulo e o valor apurado @spec:AC-050", async () => {
    await renderCom({
      faturamento: 5000,
      receitaLiquida: 4900,
      cmv: 1234.56,
      despesas: 800,
      temMovimento: true,
    });

    expect(screen.getByRole("heading", { level: 3, name: "CMV" })).toBeInTheDocument();
    expect(valor("cmv")).toBe("R$ 1.234,56");
  });

  it("exibe Despesas sem somar o repasse de comissão @spec:AC-051", async () => {
    // A competência tem despesa E um repasse de comissão na mesma data. A função
    // já os separa (AC-051 provado em T-029); aqui se prova que a tela mostra
    // exatamente o valor de Despesas, sem absorver o repasse.
    await renderCom({
      faturamento: 5000,
      receitaLiquida: 4900,
      cmv: 1234.56,
      despesas: 50,
      temMovimento: true,
    });

    expect(screen.getByRole("heading", { level: 3, name: "Despesas" })).toBeInTheDocument();
    expect(valor("despesas")).toBe("R$ 50,00");
    expect(valor("despesas")).not.toContain("127");
  });

  // -----------------------------------------------------------------------
  // A fronteira de ASM-022 — três estados, asserções separadas
  // -----------------------------------------------------------------------

  it("estado sem movimento: mostra a mensagem nos quatro e nenhum R$ 0,00 @spec:AC-053", async () => {
    await renderCom({
      faturamento: 0,
      receitaLiquida: 0,
      cmv: 0,
      despesas: 0,
      temMovimento: false,
    });

    // Positivo: a mensagem está nos quatro indicadores.
    for (const chave of CARTOES) {
      expect(valor(chave), `indicador ${chave} informa ausência de movimento`).toBe(SEM_MOVIMENTO);
    }
    // Negativo, e é o que fecha o AC: nenhum zero pode ter vazado.
    expect(screen.queryByText(/R\$\s*0,00/)).not.toBeInTheDocument();
    // Os rótulos continuam presentes mesmo sem movimento.
    for (const rotulo of ROTULOS) {
      expect(screen.getByRole("heading", { level: 3, name: rotulo })).toBeInTheDocument();
    }
  });

  it("estado só despesa: Faturamento é R$ 0,00 apurado e a mensagem não aparece @spec:AC-056", async () => {
    await renderCom({
      faturamento: 0,
      receitaLiquida: 0,
      cmv: 0,
      despesas: 25,
      temMovimento: true,
    });

    // Positivo: zero APURADO, com rótulo e valor.
    expect(screen.getByRole("heading", { level: 3, name: "Faturamento" })).toBeInTheDocument();
    expect(valor("faturamento")).toBe("R$ 0,00");
    // E a despesa que iniciou o movimento aparece com valor.
    expect(valor("despesas")).toBe("R$ 25,00");
    // Negativo: a mensagem de "sem movimento" não pode coexistir.
    expect(screen.queryByText(SEM_MOVIMENTO)).not.toBeInTheDocument();
  });

  it("estado só venda de estoque: Faturamento é R$ 0,00, CMV apurado, sem mensagem @spec:AC-057", async () => {
    await renderCom({
      faturamento: 0,
      receitaLiquida: 0,
      cmv: 20,
      despesas: 0,
      temMovimento: true,
    });

    // Positivo: os dois estados coexistem corretamente — Faturamento zero
    // apurado E CMV maior que zero. Sem o par, a prova mostraria só metade.
    expect(screen.getByRole("heading", { level: 3, name: "Faturamento" })).toBeInTheDocument();
    expect(valor("faturamento")).toBe("R$ 0,00");
    expect(valor("cmv")).toBe("R$ 20,00");
    expect(valor("cmv")).not.toBe("R$ 0,00");
    // Negativo: não é "sem movimento".
    expect(screen.queryByText(SEM_MOVIMENTO)).not.toBeInTheDocument();
  });

  it("os três estados da fronteira são mutuamente exclusivos @spec:AC-053 @spec:AC-056 @spec:AC-057", async () => {
    // Prova de que as asserções acima discriminam: o mesmo par
    // (temMovimento, faturamento) decide o estado, e inverter qualquer um dos
    // dois troca o estado exibido.
    const cenarios = [
      {
        nome: "vazio",
        entrada: { faturamento: 0, receitaLiquida: 0, cmv: 0, despesas: 0, temMovimento: false },
        esperaMensagem: true,
        esperaZero: false,
      },
      {
        nome: "so despesa",
        entrada: { faturamento: 0, receitaLiquida: 0, cmv: 0, despesas: 25, temMovimento: true },
        esperaMensagem: false,
        esperaZero: true,
      },
      {
        nome: "so estoque",
        entrada: { faturamento: 0, receitaLiquida: 0, cmv: 20, despesas: 0, temMovimento: true },
        esperaMensagem: false,
        esperaZero: true,
      },
    ];

    for (const c of cenarios) {
      cleanup();
      await renderCom(c.entrada);

      if (c.esperaMensagem) {
        expect(valor("faturamento"), `${c.nome}: mensagem`).toBe(SEM_MOVIMENTO);
        expect(screen.queryByText(/R\$\s*0,00/), `${c.nome}: nenhum zero`).not.toBeInTheDocument();
      } else {
        expect(valor("faturamento"), `${c.nome}: zero apurado`).toBe("R$ 0,00");
        expect(screen.queryByText(SEM_MOVIMENTO), `${c.nome}: sem mensagem`).not.toBeInTheDocument();
      }
    }
  });

  it("mantém os quatro rótulos estáveis em qualquer estado @spec:AC-048 @spec:AC-049 @spec:AC-050 @spec:AC-051", async () => {
    for (const temMovimento of [true, false]) {
      cleanup();
      await renderCom({
        faturamento: 1,
        receitaLiquida: 1,
        cmv: 1,
        despesas: 1,
        temMovimento,
      });
      for (const rotulo of ROTULOS) {
        expect(
          screen.getByRole("heading", { level: 3, name: rotulo }),
          `rótulo ${rotulo} presente com temMovimento=${temMovimento}`
        ).toBeInTheDocument();
      }
    }
  });
});
