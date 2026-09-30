// Prova da traducao do 42501 no create*, e da cadeia de traducao de erro.
//
// Feature gate-perfil-escrita, tasks T-076 e T-078.
//
// ---------------------------------------------------------------------------
// MEDICAO pela fronteira real, em 2026-09-30
// ---------------------------------------------------------------------------
// O INSERT recusado pelo RLS e ASSIMETRICO em relacao ao UPDATE:
//
//   INSERT recusado -> ERROR: new row violates row-level security policy for
//                      table "clientes"          (PostgREST devolve 42501)
//   UPDATE recusado -> UPDATE 0, sem erro nenhum  (silencioso; e por isso que
//                      desativar* precisa de .select(), em reativar-cadastros)
//
// E o que a medicao de 2026-09-30 establishes com o usuario autenticado SEM linha
// em `usuarios`: `achou_a_si=0`, e o INSERT em clientes levanta exatamente esse
// erro. Como `current_perfil()` e nulo, nenhuma policy de escrita casa, e o
// WITH CHECK reprova a linha nova.
//
// Sem traducao, `createCliente` faz `throw error` cru e a tela faz
// `setErro((e as Error).message)`: o texto do Postgres, **citando o nome da tabela**,
// chegava ao usuario.
//
// Este arquivo prova a TRADUCAO feita pelo codigo. O comportamento do PostgREST esta
// medido acima e no arquivo irmao.
// ---------------------------------------------------------------------------

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCliente } from "../../src/lib/api/clientes";
import { createProduto } from "../../src/lib/api/produtos";
import { createProfissional } from "../../src/lib/api/profissionais";
import { createServico } from "../../src/lib/api/servicos";
import { createComanda } from "../../src/lib/api/comandas";
import { createConfigComissao } from "../../src/lib/api/config_comissoes";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  getCurrentSalonId: vi.fn(),
}));

vi.mock("../../src/lib/supabaseClient", () => ({ supabase: { from: mocks.from } }));
vi.mock("../../src/lib/salon", () => ({ getCurrentSalonId: mocks.getCurrentSalonId }));

const SALON = "00000000-0000-0000-0000-000000000001";
const MSG_42501 =
  'new row violates row-level security policy for table "clientes"';

// Reproduz insert().select().single() e devolve o patch enviado.
function encadear(retorno: { data: unknown; error: unknown }) {
  const single = vi.fn(async () => retorno);
  const select = vi.fn(() => ({ single }));
  const insert = vi.fn(() => ({ select }));
  mocks.from.mockReturnValue({ insert });
  return { insert, select, single };
}

const RECUSA_42501 = { data: null, error: { code: "42501", message: MSG_42501, details: null } };
const SUCESSO = { data: { id: "x" }, error: null };

// As seis entidades que a interface usa, com o que cada create precisa de entrada.
const CHAMADAS = [
  { nome: "cliente", fn: createCliente, arg: { nome: "Ana" } },
  { nome: "produto", fn: createProduto, arg: { nome: "X", preco: 10 } },
  { nome: "profissional", fn: createProfissional, arg: { nome: "Y", comissao_percentual_padrao: 40 } },
  { nome: "serviço", fn: createServico, arg: { nome: "Z", preco: 50 } },
  { nome: "comanda", fn: createComanda, arg: { uuid_cliente: "11111111-1111-1111-1111-111111111111" } },
  {
    nome: "configuração de comissão",
    fn: createConfigComissao,
    arg: { profissional_id: "p1", comissao_percentual: 40, base_calculo: "BRUTO", rateio_taxa: "SALAO" },
  },
] as const;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getCurrentSalonId.mockResolvedValue(SALON);
});

describe("O 42501 do INSERT recusado vira erro de dominio", () => {
  it("as seis entidades traduzem, e nenhuma deixa passar o texto cru @spec:AC-101", async () => {
    for (const c of CHAMADAS) {
      encadear(RECUSA_42501);
      const erro = await c.fn(c.arg as never).catch((e: Error) => e);
      expect(erro, c.nome).toBeInstanceOf(Error);
      expect(erro.message, c.nome).toMatch(/não foi possível gravar/i);
      expect(erro.message, c.nome).toContain(c.nome);
      expect(erro.message, c.nome).toMatch(/permissão/i);
    }
  });

  it("a mensagem nao vaza codigo, tabela, policy nem PostgREST @spec:AC-102", async () => {
    // O texto cru que chegava citava `table "clientes"` e `row-level security`.
    // Nenhum dos dois pode sobreviver a traducao.
    for (const c of CHAMADAS) {
      encadear(RECUSA_42501);
      const erro = await c.fn(c.arg as never).catch((e: Error) => e);
      const m = erro.message;
      expect(m, c.nome).not.toMatch(/42501/);
      expect(m, c.nome).not.toMatch(/PostgREST/i);
      expect(m, c.nome).not.toMatch(/row-level security/i);
      expect(m, c.nome).not.toMatch(/violates|constraint|relation/i);
      expect(m, c.nome).not.toMatch(/policy/i);
      expect(m, c.nome).not.toMatch(/\d{8}-\d{4}-\d{4}-\d{4}-\d{12}/);
    }
  });

  it("a traducao nao diz o NOME da tabela @spec:AC-102", async () => {
    const TABELAS = ["clientes", "produtos", "profissionais", "servicos", "comandas", "config_comissoes"];
    for (const c of CHAMADAS) {
      encadear(RECUSA_42501);
      const erro = await c.fn(c.arg as never).catch((e: Error) => e);
      for (const t of TABELAS) {
        expect(erro.message.toLowerCase(), `${c.nome} x ${t}`).not.toContain(t);
      }
    }
  });
});

describe("O que nao e 42501 continua cru, e o sucesso nao lanca", () => {
  it("um erro que nao e 42501 e repassado sem traducao", async () => {
    // Traduzir por conveniência esconderia erro de rede, de schema ou de
    // constraint com a mensagem de "sem permissão", que seria mentira.
    const BRUTO = { error: { code: "23502", message: "null value in column", details: null } };
    for (const c of CHAMADAS) {
      encadear({ data: null, ...BRUTO });
      const recebido = await c.fn(c.arg as never).catch((e: unknown) => e);
      expect(recebido, c.nome).toBe(BRUTO.error);
      expect((recebido as { message: string }).message).not.toMatch(/permissão/i);
    }
  });

  it("no sucesso, nada e lancado e a linha volta", async () => {
    for (const c of CHAMADAS) {
      encadear(SUCESSO);
      await expect(c.fn(c.arg as never)).resolves.toBeDefined();
    }
  });

  it("o salon_id continua sendo enviado em toda criacao", async () => {
    // A RLS decide o que PODE gravar, mas nao preenche salon_id: ele tem de vir
    // explicito. Regressao: uma traducao mal colocada pode perder o insert.
    for (const c of CHAMADAS) {
      const e = encadear(SUCESSO);
      await c.fn(c.arg as never).catch(() => undefined);
      const patch = e.insert.mock.calls[0][0] as Record<string, unknown>;
      expect(patch.salon_id, c.nome).toBe(SALON);
    }
  });
});