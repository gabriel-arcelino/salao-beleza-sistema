import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["tests/**/*.spec.*"],
    reporter: ["tap"],
    // Mesmo teto que as specs de UI já usam em `it(..., 15000)`: sem ele, o
    // primeiro teste de cada arquivo estoura o padrão de 5s sob carga paralela.
    testTimeout: 15000,
  },
});
