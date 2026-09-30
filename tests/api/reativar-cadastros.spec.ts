// Prova da traducao de erro das escritas de desativar e reativar.
//
// Feature reativar-cadastros, tasks T-067 e T-070.
//
// ---------------------------------------------------------------------------
// MEDICAO pela fronteira real, em 2026-09-30
// ---------------------------------------------------------------------------
// Reproduzindo a cadeia que o codigo montava ANTES desta feature:
//
//   supabase.from(T).update({ ativo: false }).eq("id", id)     <- sem .select()
//
// caso                                        code       o que acontece
// ------------------------------------------  ---------  -------------------------
// ADMIN desativa linha existente (CONTROLE)  (nenhum)   UPDATE 1, grava e devolve nada
// RECEPCAO desativa linha existente          (NENHUM)   UPDATE 0, e NADA e levantado
// ADMIN reativa linha existente (CONTROLE)   (nenhum)   UPDATE 1
// RECEPCAO reativa linha existente           (NENHUM)   UPDATE 0, e NADA e levantado
//
// Este e o defeito que a feature corrige. Sem .select() nao existe erro para o
// cliente traduzir: a recusa do RLS devolve zero linhas em silencio, a tela recarrega
// como se tivesse gravado, e a pessoa nao recebe sinal nenhum.
//
// A cadeia nova e a mesma de update*:
//
//   supabase.from(T).update({ ativo: X }).eq("id", id).select().single()
//
// e ai o PGRST116 nasce - do .single() do PostgREST, nao de um codigo do Postgres.
// 42501 NAO EXISTE nesta fronteira. Ver os fatos medidos registrados em
// tests/api/cadastros.spec.ts, que mediu a mesma coisa para update*.
//
// O que este arquivo prova e a TRADUCAO feita pelo codigo da aplicacao, nao o
// comportamento do PostgREST - esse esta medido acima e no arquivo irmão.
// ---------------------------------------------------------------------------

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ativarCliente,
  desativarCliente,
} from "../../src/lib/api/clientes";
import { ativarProduto, desativarProduto } from "../../src/lib/api/produtos";
import { ativarProfissional, desativarProfissional } from "../../src/lib/api/profissionais";
import { ativarServico, desativarServico } from "../../src/lib/api/servicos";

const mocks = vi.hoisted(() => ({ from: vi.fn() }));

vi.mock("../../src/lib/supabaseClient", () => ({
  supabase: { from: mocks.from },
}));

const ID = "00000000-0000-0000-0000-000000000201";
const PGRST116 = "Cannot coerce the result to a single JSON object";
const DETALHES = "The result contains 0 rows";

// Reproduz update().eq().select().single() e devolve o patch enviado, que e o
// que prova que a escrita e a de `ativo` e nada mais.
function encadear(retorno: { data: unknown; error: unknown }) {
  const enviado: { patch: unknown } = { patch: undefined };
  const single = vi.fn(async () => retorno);
  const select = vi.fn(() => ({ single }));
  const eq = vi.fn(() => ({ select }));
  const update = vi.fn((p: unknown) => {
    enviado.patch = p;
    return { eq };
  });
  mocks.from.mockReturnValue({ update });
  return { update, eq, select, single, enviado };
}

const RECUSA = { data: null, error: { code: "PGRST116", message: PGRST116, details: DETALHES } };
const SUCESSO = { data: { id: ID }, error: null };

// As quatro entidades, com o verbo e o substantivo que a mensagem deve usar.
const ENTIDADES = [
  { nome: "cliente", ativar: ativarCliente, desativar: desativarCliente },
  { nome: "produto", ativar: ativarProduto, desativar: desativarProduto },
  { nome: "profissional", ativar: ativarProfissional, desativar: desativarProfissional },
  { nome: "servico", ativar: ativarServico, desativar: desativarServico },
] as const;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("A escrita enviada e a de `ativo`, e nada mais", () => {
  it("ativar escreve ativo:true e desativar escreve ativo=false", async () => {
    for (const e of ENTIDADES) {
      const a = encadear(SUCESSO);
      await e.ativar(ID);
      expect(a.enviado.patch, `${e.nome} ativar`).toEqual({ ativo: true });

      const d = encadear(SUCESSO);
      await e.desativar(ID);
      expect(d.enviado.patch, `${e.nome} desativar`).toEqual({ ativo: false });
    }
  });

  it("a escrita nao carrega nenhum outro campo do cadastro", async () => {
    // `ativo` nao esta na allowlist de update* (medido: Partial<Pick<T, ...>> sem
    // `ativo`), entao nenhuma das duas funcoes pode sobrescrever nome, preco ou
    // percentual por acidente. O patch tem uma chave so.
    for (const e of ENTIDADES) {
      const a = encadear(SUCESSO);
      await e.ativar(ID);
      expect(Object.keys(a.enviado.patch as object)).toEqual(["ativo"]);
    }
  });
});

describe("A recusa chega ao chamador como erro de dominio", () => {
  it("PGRST116 vira mensagem de acao, nas quatro entidades e nos dois sentidos", async () => {
    for (const e of ENTIDADES) {
      for (const [verbo, fn] of [
        ["desativar", e.desativar],
        ["reativar", e.ativar],
      ] as const) {
        encadear(RECUSA);
        const erro = await fn(ID).catch((x: Error) => x);
        expect(erro, `${e.nome} ${verbo}`).toBeInstanceOf(Error);
        expect(erro.message).toContain(verbo);
        expect(erro.message).toContain(e.nome === "servico" ? "serviço" : e.nome);
      }
    }
  });

  it("a mensagem nao diz se o registro existe", async () => {
    // D-3. "Nao encontrado" e "sem permissao" sao indistinguiveis na fronteira, e
    // a interface nao pode separa-las: seria oraculo de existencia para quem nao
    // enxerga a linha.
    for (const e of ENTIDADES) {
      encadear(RECUSA);
      const erro = await e.ativar(ID).catch((x: Error) => x);
      expect(erro.message).toMatch(/não foi encontrado ou você não tem permissão/i);
    }
  });

  it("a mensagem nao vaza codigo, tabela, coluna nem identificador", async () => {
    for (const e of ENTIDADES) {
      for (const fn of [e.ativar, e.desativar] as const) {
        encadear(RECUSA);
        const erro = await fn(ID).catch((x: Error) => x);
        const m = erro.message;
        expect(m, e.nome).not.toMatch(/PGRST/i);
        expect(m, e.nome).not.toMatch(/postgrest/i);
        expect(m, e.nome).not.toMatch(/violates|constraint|relation/i);
        expect(m, e.nome).not.toMatch(/\d{8}-\d{4}-\d{4}-\d{4}-\d{12}/);
        expect(m, e.nome).not.toContain(e.nome === "servico" ? "servicos" : e.nome + "s");
      }
    }
  });
});

describe("O que NAO e erro de dominio continua cru", () => {
  it("um erro que nao e PGRST116 e repassado sem traducao", async () => {
    // Traduzir por conveniencia esconderia erro de rede, de schema ou de
    // constraint com a mensagem de "sem permissao", que seria mentira.
    const BRUTO = {
      error: { code: "23505", message: "duplicate key value", details: null },
    };
    for (const e of ENTIDADES) {
      encadear(BRUTO);
      const recebido = await e.ativar(ID).catch((x: unknown) => x);
      // Repassa o MESMO objeto que a fronteira devolveu, sem embrulhar nem
      // converter. `throw error` num objeto de erro do PostgREST nao produz uma
      // instancia de Error - e o mesmo que update* ja faz. Por isso a asercao e
      // de identidade, e nao toBeInstanceOf(Error).
      expect(recebido, e.nome).toBe(BRUTO.error);
      expect((recebido as { message: string }).message).not.toMatch(/permissão/i);
    }
  });

  it("no sucesso, nada e lancado", async () => {
    for (const e of ENTIDADES) {
      encadear(SUCESSO);
      await expect(e.ativar(ID)).resolves.toBeUndefined();
      await expect(e.desativar(ID)).resolves.toBeUndefined();
    }
  });
});
