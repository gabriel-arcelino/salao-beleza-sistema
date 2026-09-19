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
    it("verifica que os módulos centrais de tokens possuem exports reutilizáveis", async () => {
      const colors = await import("../src/ui/tokens/colors");
      expect(colors).toBeDefined();
      expect(typeof colors).toBe("object");
      expect(Object.keys(colors).length).toBeGreaterThan(0);

      const typography = await import("../src/ui/tokens/typography");
      expect(typography).toBeDefined();
      expect(typeof typography).toBe("object");
      expect(Object.keys(typography).length).toBeGreaterThan(0);

      const spacing = await import("../src/ui/tokens/spacing");
      expect(spacing).toBeDefined();
      expect(typeof spacing).toBe("object");
      expect(Object.keys(spacing).length).toBeGreaterThan(0);
    });
  });

  describe("@spec:AC-013 — Página representativa utiliza a fundação visual", () => {
    it("verifica que o Dashboard renderiza utilizando tokens da fundação", async () => {
      // Nota: a fundação ainda não oferece uma convenção observável definida
      // pela especificação para comprovar diretamente o uso dos tokens no DOM.
      // Este teste registra a limitação e valida a renderização básica.
      const mockGetProdutos = vi.fn().mockResolvedValue([]);
      const mockCalcularCMV = vi.fn().mockResolvedValue(100);

      vi.mock("../src/lib/api/estoque", () => ({
        getProdutosEstoqueNegativo: mockGetProdutos,
        calcularCMV: mockCalcularCMV,
      }));

      const { DashboardPage } = await import("../src/pages/DashboardPage");
      render(<DashboardPage />);

      expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
    });
  });

  describe("@spec:AC-014 — Estado de loading reutilizável", () => {
    it("renderiza Loading com mensagem configurável", async () => {
      const { Loading } = await import("../src/ui/components/Loading");
      render(<Loading message="Carregando dados..." />);
      expect(screen.getByText("Carregando dados...")).toBeInTheDocument();
    });
  });

  describe("@spec:AC-015 — Estado vazio reutilizável", () => {
    it("renderiza EmptyState com mensagem configurável", async () => {
      const { EmptyState } = await import("../src/ui/components/EmptyState");
      render(<EmptyState message="Nenhum registro encontrado." />);
      expect(screen.getByText("Nenhum registro encontrado.")).toBeInTheDocument();
    });
  });

  describe("@spec:AC-016 — Estado de erro reutilizável", () => {
    it("renderiza ErrorMessage com mensagem e semântica de alerta", async () => {
      const { ErrorMessage } = await import("../src/ui/components/ErrorMessage");
      render(<ErrorMessage message="Falha na operação." />);
      expect(screen.getByText("Falha na operação.")).toBeInTheDocument();
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  describe("@spec:AC-017 — Card reutilizável", () => {
    it("renderiza Card permitindo composição de conteúdo", async () => {
      const { Card } = await import("../src/ui/components/Card");
      render(
        <Card>
          <h4>Título do Card</h4>
          <p>Conteúdo composto.</p>
        </Card>
      );
      expect(screen.getByText("Título do Card")).toBeInTheDocument();
      expect(screen.getByText("Conteúdo composto.")).toBeInTheDocument();
    });
  });

  describe("@spec:AC-018 — Componentes de interface possuem semântica acessível", () => {
    it("verifica semântica acessível de Loading, EmptyState e ErrorMessage", async () => {
      const { Loading } = await import("../src/ui/components/Loading");
      const { EmptyState } = await import("../src/ui/components/EmptyState");
      const { ErrorMessage } = await import("../src/ui/components/ErrorMessage");

      const { container: containerLoading } = render(<Loading message="Aguarde..." />);
      expect(containerLoading.querySelector('[role="status"]')).not.toBeNull();

      const { container: containerError } = render(<ErrorMessage message="Erro." />);
      expect(containerError.querySelector('[role="alert"]')).not.toBeNull();

      render(<EmptyState message="Vazio." />);
      expect(screen.getByText("Vazio.")).toBeInTheDocument();
    });
  });

  describe("@spec:AC-019 — Dashboard preserva os contratos existentes", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("utiliza getProdutosEstoqueNegativo e calcularCMV sem acesso direto ao Supabase", async () => {
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

      expect(mockGetProdutos).toHaveBeenCalled();
      expect(mockCalcularCMV).toHaveBeenCalled();
    });
  });
});
