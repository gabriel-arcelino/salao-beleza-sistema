import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const caminhoTasks = resolve(
  process.cwd(),
  ".spec/features/legado-baseline/tasks.md",
);

function lerArquivosDoBaseline(): string[] {
  const conteudo = readFileSync(caminhoTasks, "utf8");
  const linha = conteudo
    .split(/\r?\n/)
    .find((valor) => valor.startsWith("- Arquivos:"));

  if (!linha) {
    throw new Error("A task de baseline não possui a linha Arquivos:");
  }

  return linha
    .replace(/^- Arquivos:\s*/, "")
    .split(",")
    .map((valor) => valor.trim())
    .filter(Boolean);
}

describe("baseline legado pré-ONP", () => {
  it("mantém todos os arquivos registrados no baseline presentes no projeto @spec:AC-020", () => {
    const ausentes = lerArquivosDoBaseline().filter(
      (arquivo) => !existsSync(resolve(process.cwd(), arquivo)),
    );

    expect(ausentes).toEqual([]);
  });
});
