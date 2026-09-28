import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import App from "../../src/App";

const require = createRequire(import.meta.url);
const { decodeClaims, publicClaims, publicResponse } = require("../../scripts/diagnostico-jwt.cjs") as {
  decodeClaims: (token: string) => Record<string, unknown>;
  publicClaims: (claims: Record<string, unknown>) => Record<string, unknown>;
  publicResponse: (response: unknown, body: string, durationMs: number) => Record<string, unknown>;
};

const mocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  getProdutosEstoqueNegativo: vi.fn(),
  getIndicadoresDashboard: vi.fn(),
}));

vi.mock("../../src/lib/supabaseClient", () => ({
  supabase: {
    auth: {
      signInWithPassword: mocks.signInWithPassword,
      getSession: mocks.getSession,
      onAuthStateChange: mocks.onAuthStateChange,
    },
  },
}));

vi.mock("../../src/lib/api/estoque", () => ({
  getProdutosEstoqueNegativo: mocks.getProdutosEstoqueNegativo,
}));

vi.mock("../../src/lib/api/dashboard", () => ({
  getIndicadoresDashboard: mocks.getIndicadoresDashboard,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.signInWithPassword.mockResolvedValue({ error: null });
  mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
  mocks.onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  });
  mocks.getProdutosEstoqueNegativo.mockResolvedValue([]);
  mocks.getIndicadoresDashboard.mockResolvedValue({
    faturamento: 100,
    receitaLiquida: 90,
    cmv: 10,
    despesas: 20,
    temMovimento: true,
  });
});

afterEach(() => {
  cleanup();
});

describe("Diagnóstico JWT — evidência e login @spec:AC-061", () => {
  it("mantém a evidência sem segredos e registra o diagnóstico inconclusivo @spec:AC-058 @spec:AC-059", () => {
    const evidence = readFileSync("docs/diagnostico-jwt.md", "utf8");
    const payload = Buffer.from(JSON.stringify({ iat: 1790600000, exp: 1790603600, aud: "authenticated" })).toString("base64url");
    const claims = publicClaims(decodeClaims(["header", payload, "signature"].join(".")));
    const response = publicResponse(
      { status: 401, headers: new Map([["content-type", "application/json"]]) },
      JSON.stringify({ code: "PGRST303", message: "JWT issued at future", access_token: "secret" }),
      4
    );

    expect(evidence).toContain("iat");
    expect(evidence).toContain("exp");
    expect(evidence).toContain("nenhuma credencial ou token foi persistido");
    expect(evidence).toContain("não há log do GoTrue/PostgREST");
    expect(evidence).not.toContain("senha123");
    expect(claims).toMatchObject({ audience: "authenticated" });
    expect(response).toMatchObject({ status: 401, error_code: "PGRST303", error_message: "JWT issued at future" });
    expect(response).not.toHaveProperty("access_token");
  });

  it("mantém o login e carrega o Dashboard quando o Auth retorna sucesso @spec:AC-061", async () => {
    render(<App />);

    fireEvent.change(await screen.findByLabelText("E-mail"), {
      target: { value: "fixture@example.test" },
    });
    fireEvent.change(screen.getByLabelText("Senha"), {
      target: { value: "test-password-fixture" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeVisible();
    expect(await screen.findByText("R$ 100,00")).toBeVisible();
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: "fixture@example.test",
      password: "test-password-fixture",
    });
    expect(mocks.getIndicadoresDashboard).toHaveBeenCalled();
  });
});