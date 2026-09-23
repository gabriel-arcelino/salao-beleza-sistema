import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";

// AC-012 — Tokens visuais básicos disponíveis
// AC-013 — Página representativa utiliza a fundação visual
// AC-014 — Estado de loading reutilizável
// AC-015 — Estado vazio reutilizável
// AC-016 — Estado de erro reutilizável
// AC-017 — Card reutilizável
// AC-018 — Componentes de interface possuem semântica acessível
// AC-019 — Dashboard preserva os contratos existentes

const mockModule = vi.hoisted(() => ({
  mockGetProdutos: vi.fn().mockResolvedValue([
    { id: "p-1", nome: "Produto Teste", estoque_atual: -5, estoque_minimo: 0 },
  ]),
  mockCalcularCMV: vi.fn().mockResolvedValue(1234.56),
}));

vi.mock("../../src/lib/api/estoque", () => ({
  getProdutosEstoqueNegativo: mockModule.mockGetProdutos,
  calcularCMV: mockModule.mockCalcularCMV,
}));

describe("Fundacao UI @spec:fundacao-ui", () => {
  describe("@spec:AC-012 — Tokens visuais básicos disponíveis", () => {
    it("prova constantes com nomes explícitos e valores literais verificáveis em cores, tipografia e espaçamento", async () => {
      const colors = await import("../../src/ui/tokens/colors");
      expect(colors).toBeDefined();
      const colorExports = Object.keys(colors);
      expect(colorExports.length).toBeGreaterThan(0);
      // AC-012 exige nomes convencionados: COLOR_PRIMARY, SPACING_MD, FONT_BODY
      expect(colors).toHaveProperty("COLOR_PRIMARY");
      expect(colors.COLOR_PRIMARY).toBe("crimson");

      const typography = await import("../../src/ui/tokens/typography");
      expect(typography).toBeDefined();
      const typoExports = Object.keys(typography);
      expect(typoExports.length).toBeGreaterThan(0);
      const typoLiteralName = typoExports.find(
        (k) =>
          typeof typography[k as keyof typeof typography] === "string" ||
          typeof typography[k as keyof typeof typography] === "number"
      );
      expect(typoLiteralName).toBeDefined();

      const spacing = await import("../../src/ui/tokens/spacing");
      expect(spacing).toBeDefined();
      const spacingExports = Object.keys(spacing);
      expect(spacingExports.length).toBeGreaterThan(0);
      const spacingLiteralName = spacingExports.find(
        (k) =>
          spacing[k as keyof typeof spacing] === 16 ||
          spacing[k as keyof typeof spacing] === "16px" ||
          spacing[k as keyof typeof spacing] === "1rem" ||
          spacing[k as keyof typeof spacing] === "2rem"
      );
      expect(spacingLiteralName).toBeDefined();
    });
  });

  describe("@spec:AC-013 — Página representativa utiliza a fundação visual", () => {
    it("prova que Dashboard usa componente reutilizável, consome tokens e preserva contratos existentes", async () => {
      const { DashboardPage } = await import("../../src/pages/DashboardPage");
      const { container } = render(<DashboardPage />);

      expect(mockModule.mockGetProdutos).toHaveBeenCalled();
      expect(mockModule.mockCalcularCMV).toHaveBeenCalled();

      const hasReusableComponent =
        container.querySelector('[data-testid="card"]') !== null ||
        container.querySelector('[role="status"]') !== null ||
        container.querySelector('[role="alert"]') !== null ||
        container.querySelector('[role="region"]') !== null;
      expect(hasReusableComponent).toBe(true);

      await screen.findByText("Produto Teste");
      await screen.findByText(/1234\.56/);

      // Evidência 5: preservação do contrato de importação direta (verificação estática no arquivo fonte)
      const fs = await import("fs");
      const dashboardSource = fs.readFileSync(require("path").resolve("src/pages/DashboardPage.tsx"), "utf-8");
      expect(dashboardSource).toContain("../lib/api/estoque");
      // Evidência 6: ausência de novas camadas intermediárias (domain/, repositories/, services/) no arquivo fonte
      expect(dashboardSource).not.toContain("domain/");
      expect(dashboardSource).not.toContain("repositories/");
      expect(dashboardSource).not.toContain("services/");
      expect(mockModule.mockGetProdutos).toHaveBeenCalledTimes(1);
      expect(mockModule.mockCalcularCMV).toHaveBeenCalledTimes(1);
    });
  });

  describe("@spec:AC-014 — Estado de loading reutilizável", () => {
    it("renderiza Loading com mensagem configurável e nada além do exigido pelo AC", async () => {
      const { Loading } = await import("../../src/ui/components/Loading");
      render(<Loading message="Carregando dados..." />);
      expect(screen.getByText("Carregando dados...")).toBeInTheDocument();
    });
  });

  describe("@spec:AC-015 — Estado vazio reutilizável", () => {
    it("renderiza EmptyState com mensagem configurável e nada além do exigido pelo AC", async () => {
      const { EmptyState } = await import("../../src/ui/components/EmptyState");
      render(<EmptyState message="Nenhum registro encontrado." />);
      expect(screen.getByText("Nenhum registro encontrado.")).toBeInTheDocument();
    });
  });

  describe("@spec:AC-016 — Estado de erro reutilizável", () => {
    it("renderiza ErrorMessage com mensagem configurável e semântica de alerta", async () => {
      const { ErrorMessage } = await import("../../src/ui/components/ErrorMessage");
      render(<ErrorMessage message="Falha na operação." />);
      expect(screen.getByText("Falha na operação.")).toBeInTheDocument();
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  describe("@spec:AC-017 — Card reutilizável", () => {
    it("verifica que Card aceita children, aplica border, borderRadius e padding, e não aceita substitutos parciais", async () => {
      const { Card } = await import("../../src/ui/components/Card");
      const { container } = render(
        <Card>
          <h4>Título do Card</h4>
          <p>Conteúdo composto.</p>
        </Card>
      );

      expect(screen.getByText("Título do Card")).toBeInTheDocument();
      expect(screen.getByText("Conteúdo composto.")).toBeInTheDocument();

      const rootElement = container.firstChild as HTMLElement;
      expect(rootElement).not.toBeNull();
      const style = window.getComputedStyle(rootElement);

      const hasBorder =
        style.border !== "none" &&
        style.border !== "" &&
        style.border !== "0px none";
      const borderRadiusVal = parseFloat(style.borderRadius);
      const hasBorderRadius = !isNaN(borderRadiusVal) && borderRadiusVal > 0;
      const hasPadding =
        parseFloat(style.padding) > 0 ||
        parseFloat(style.paddingTop) > 0 ||
        parseFloat(style.paddingBottom) > 0 ||
        parseFloat(style.paddingLeft) > 0 ||
        parseFloat(style.paddingRight) > 0;

      expect(hasBorder).toBe(true);
      expect(hasBorderRadius).toBe(true);
      expect(hasPadding).toBe(true);

      // Evidência adicional: Card é utilizado pelo Dashboard (verificação estática no arquivo fonte)
      const fs_17 = await import("fs");
      const dashboardPageSource_17 = fs_17.readFileSync("src/pages/DashboardPage.tsx", "utf-8");
      expect(dashboardPageSource_17.includes("Card")).toBe(true);

      // Evidência adicional: Card é utilizado pelo Dashboard (verificação estática no arquivo fonte)
      const fs = await import("fs");
      const dashboardPageSource = fs.readFileSync(require("path").resolve("src/pages/DashboardPage.tsx"), "utf-8");
      expect(dashboardPageSource.includes("Card")).toBe(true);
    });
  });

  describe("@spec:AC-018 — Componentes de interface possuem semântica acessível", () => {
    it("verifica semântica acessível de Loading, EmptyState e ErrorMessage sem aceitar substitutos", async () => {
      const { Loading } = await import("../../src/ui/components/Loading");
      const { EmptyState } = await import("../../src/ui/components/EmptyState");
      const { ErrorMessage } = await import("../../src/ui/components/ErrorMessage");

      const { container: containerLoading } = render(<Loading message="Aguarde..." />);
      const loadingRole = containerLoading.querySelector('[role="status"]');
      expect(loadingRole).not.toBeNull();
      expect(loadingRole).toHaveAttribute("aria-live", "polite");

      const { container: containerError } = render(<ErrorMessage message="Erro." />);
      const errorRole = containerError.querySelector('[role="alert"]');
      expect(errorRole).not.toBeNull();
      expect(errorRole).toHaveAttribute("aria-live", "assertive");

      // Evidência de derivação dinâmica: testar duas mensagens diferentes para provar que aria-label não é fixo
      const { container: containerEmpty1 } = render(<EmptyState message="Vazio." />);
      const emptyRole1 = containerEmpty1.querySelector('[role="region"]');
      expect(emptyRole1).not.toBeNull();
      expect(emptyRole1?.getAttribute("aria-label")).toBe("Vazio.");

      const { container: containerEmpty2 } = render(<EmptyState message="Nenhum registro encontrado." />);
      const emptyRole2 = containerEmpty2.querySelector('[role="region"]');
      expect(emptyRole2).not.toBeNull();
      expect(emptyRole2?.getAttribute("aria-label")).toBe("Nenhum registro encontrado.");

      expect(screen.getByText("Vazio.")).toBeInTheDocument();
    });
  });

  describe("@spec:AC-019 — Dashboard preserva os contratos existentes", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("prova preservação dos contratos, uso dos valores retornados e ausência de novas camadas intermediárias", async () => {
      const { DashboardPage } = await import("../../src/pages/DashboardPage");
      render(<DashboardPage />);

      expect(mockModule.mockGetProdutos).toHaveBeenCalledTimes(1);
      expect(mockModule.mockCalcularCMV).toHaveBeenCalledTimes(1);

      await screen.findByText("Produto Teste");
      await screen.findByText(/1234\.56/);

      // Evidência 5: preservação do contrato de importação direta (verificação estática no arquivo fonte)
      const fs = await import("fs");
      const dashboardSource = fs.readFileSync(require("path").resolve("src/pages/DashboardPage.tsx"), "utf-8");
      expect(dashboardSource).toContain("../lib/api/estoque");
      // Evidência 6: ausência de novas camadas intermediárias (domain/, repositories/, services/) no arquivo fonte
      expect(dashboardSource).not.toContain("domain/");
      expect(dashboardSource).not.toContain("repositories/");
      expect(dashboardSource).not.toContain("services/");
    });
  });
});
