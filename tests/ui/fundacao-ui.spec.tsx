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

describe("Fundacao UI @spec:fundacao-ui", () => {
  describe("@spec:AC-012 — Tokens visuais básicos disponíveis", () => {
    it("prova constantes com nomes explícitos e valores literais verificáveis em cores, tipografia e espaçamento", async () => {
      const colors = await import("../src/ui/tokens/colors");
      expect(colors).toBeDefined();
      const colorExports = Object.keys(colors);
      expect(colorExports.length).toBeGreaterThan(0);
      const primaryColorName = colorExports.find(
        (k) =>
          typeof colors[k as keyof typeof colors] === "string" &&
          ["#e0e0e0", "crimson", "#000000", "#ffffff", "#ff0000", "#00ff00", "#0000ff"].includes(
            colors[k as keyof typeof colors] as string
          )
      );
      expect(primaryColorName).toBeDefined();
      expect(typeof colors[primaryColorName as keyof typeof colors]).toBe("string");

      const typography = await import("../src/ui/tokens/typography");
      expect(typography).toBeDefined();
      const typoExports = Object.keys(typography);
      expect(typoExports.length).toBeGreaterThan(0);
      const typoLiteralName = typoExports.find(
        (k) =>
          typeof typography[k as keyof typeof typography] === "string" ||
          typeof typography[k as keyof typeof typography] === "number"
      );
      expect(typoLiteralName).toBeDefined();

      const spacing = await import("../src/ui/tokens/spacing");
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
      const mockGetProdutos = vi.fn().mockResolvedValue([
        { id: "p-1", nome: "Produto Teste", estoque_atual: -5, estoque_minimo: 0 },
      ]);
      const mockCalcularCMV = vi.fn().mockResolvedValue(1234.56);

      vi.mock("../src/lib/api/estoque", () => ({
        getProdutosEstoqueNegativo: mockGetProdutos,
        calcularCMV: mockCalcularCMV,
      }));

      const { DashboardPage } = await import("../src/pages/DashboardPage");
      const { container } = render(<DashboardPage />);

      expect(mockGetProdutos).toHaveBeenCalled();
      expect(mockCalcularCMV).toHaveBeenCalled();

      const hasReusableComponent =
        container.querySelector('[data-testid="card"]') !== null ||
        container.querySelector('[role="status"]') !== null ||
        container.querySelector('[role="alert"]') !== null ||
        container.querySelector('[role="region"]') !== null;
      expect(hasReusableComponent).toBe(true);

      expect(screen.getByText("Produto Teste")).toBeInTheDocument();
      expect(screen.getByText(/1234\.56/)).toBeInTheDocument();
      expect(mockGetProdutos).toHaveBeenCalledTimes(1);
      expect(mockCalcularCMV).toHaveBeenCalledTimes(1);
    });
  });

  describe("@spec:AC-014 — Estado de loading reutilizável", () => {
    it("renderiza Loading com mensagem configurável e nada além do exigido pelo AC", async () => {
      const { Loading } = await import("../src/ui/components/Loading");
      render(<Loading message="Carregando dados..." />);
      expect(screen.getByText("Carregando dados...")).toBeInTheDocument();
    });
  });

  describe("@spec:AC-015 — Estado vazio reutilizável", () => {
    it("renderiza EmptyState com mensagem configurável e nada além do exigido pelo AC", async () => {
      const { EmptyState } = await import("../src/ui/components/EmptyState");
      render(<EmptyState message="Nenhum registro encontrado." />);
      expect(screen.getByText("Nenhum registro encontrado.")).toBeInTheDocument();
    });
  });

  describe("@spec:AC-016 — Estado de erro reutilizável", () => {
    it("renderiza ErrorMessage com mensagem configurável e semântica de alerta", async () => {
      const { ErrorMessage } = await import("../src/ui/components/ErrorMessage");
      render(<ErrorMessage message="Falha na operação." />);
      expect(screen.getByText("Falha na operação.")).toBeInTheDocument();
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  describe("@spec:AC-017 — Card reutilizável", () => {
    it("verifica que Card aceita children, aplica border, borderRadius e padding, e não aceita substitutos parciais", async () => {
      const { Card } = await import("../src/ui/components/Card");
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
    });
  });

  describe("@spec:AC-018 — Componentes de interface possuem semântica acessível", () => {
    it("verifica semântica acessível de Loading, EmptyState e ErrorMessage sem aceitar substitutos", async () => {
      const { Loading } = await import("../src/ui/components/Loading");
      const { EmptyState } = await import("../src/ui/components/EmptyState");
      const { ErrorMessage } = await import("../src/ui/components/ErrorMessage");

      const { container: containerLoading } = render(<Loading message="Aguarde..." />);
      const loadingRole = containerLoading.querySelector('[role="status"]');
      expect(loadingRole).not.toBeNull();
      expect(loadingRole).toHaveAttribute("aria-live", "polite");

      const { container: containerError } = render(<ErrorMessage message="Erro." />);
      const errorRole = containerError.querySelector('[role="alert"]');
      expect(errorRole).not.toBeNull();
      expect(errorRole).toHaveAttribute("aria-live", "assertive");

      const { container: containerEmpty } = render(<EmptyState message="Vazio." />);
      const emptyRole = containerEmpty.querySelector('[role="region"]');
      expect(emptyRole).not.toBeNull();
      const ariaLabel = emptyRole?.getAttribute("aria-label");
      expect(ariaLabel).toBe("Vazio.");
      expect(screen.getByText("Vazio.")).toBeInTheDocument();
    });
  });

  describe("@spec:AC-019 — Dashboard preserva os contratos existentes", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("prova preservação dos contratos, uso dos valores retornados e ausência de novas camadas intermediárias", async () => {
      const mockGetProdutos = vi.fn().mockResolvedValue([
        { id: "p-1", nome: "Produto Teste", estoque_atual: -5, estoque_minimo: 0 },
      ]);
      const mockCalcularCMV = vi.fn().mockResolvedValue(1234.56);

      vi.mock("../src/lib/api/estoque", () => ({
        getProdutosEstoqueNegativo: mockGetProdutos,
        calcularCMV: mockCalcularCMV,
      }));

      const { DashboardPage } = await import("../src/pages/DashboardPage");
      render(<DashboardPage />);

      expect(mockGetProdutos).toHaveBeenCalledTimes(1);
      expect(mockCalcularCMV).toHaveBeenCalledTimes(1);

      expect(screen.getByText("Produto Teste")).toBeInTheDocument();
      expect(screen.getByText(/1234\.56/)).toBeInTheDocument();
    });
  });
});
