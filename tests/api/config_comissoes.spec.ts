// Prova de AC-065: a violacao de unicidade devolvida pelo banco e traduzida
// em erro de dominio, com mensagem que distingue o nivel.
//
// Feature integridade-config-comissoes, tarefa T-047.
//
// O cliente Supabase e mockado. O que se prova aqui e a traducao feita pelo
// codigo da aplicacao, e NAO o comportamento do PostgREST: esse foi medido em
// 2026-09-29 pela fronteira real e as duas mensagens tecnicas usadas abaixo sao
// as medidas.
//
// As quatro asserts comparam mensagens por IGUALDADE, nunca por substring.
// A razao esta no proprio codigo: a mensagem tecnica do nivel servico e
// `... "config_comissoes_salon_id_profissional_id_servico_id_key"`, que contem
// as palavras `profissional` e `servico`. Uma prova por `contains(...)` passaria
// com o erro nao traduzido. E `contains('23505')` seria tautologia, porque
// `23505` vive em `error.code`, nunca em `error.message`.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createConfigComissao } from "../../src/lib/api/config_comissoes";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  single: vi.fn(),
  from: vi.fn(),
}));

vi.mock("../../src/lib/supabaseClient", () => ({
  supabase: {
    auth: { getSession: mocks.getSession },
    from: mocks.from,
  },
}));

const SALON = "00000000-0000-0000-0000-000000000001";
const PROFISSIONAL = "00000000-0000-0000-0000-000000000101";
const SERVICO = "00000000-0000-0000-0000-000000000201";

// Mensagens tecnicas reais, medidas pela fronteira PostgREST. Uma por cenario:
// a duplicata de nivel profissional vem do indice parcial criado em T-044
// (config_comissoes_prof_nivel_uniq) e a de nivel servico do unique de tres
// colunas de 0001:141. Perder essa distincao faria a prova passar as.
const MSG_TECNICA_NIVEL_PROFISSIONAL =
  'duplicate key value violates unique constraint "config_comissoes_prof_nivel_uniq"';
const MSG_TECNICA_NIVEL_SERVICO =
  'duplicate key value violates unique constraint "config_comissoes_salon_id_profissional_id_servico_id_key"';

const COMUM = {
  profissional_id: PROFISSIONAL,
  base_calculo: "BRUTO" as const,
  rateio_taxa: "SALAO" as const,
  comissao_sobre_produto: false,
  timing_repasse: "IMEDIATO" as const,
};

const PAYLOAD_NIVEL_PROFISSIONAL = { ...COMUM, servico_id: null, comissao_percentual: 40 };
const PAYLOAD_NIVEL_SERVICO = { ...COMUM, servico_id: SERVICO, comissao_percentual: 55 };

function erro23505(message: string) {
  return { code: "23505", message, details: "", hint: "" };
}

// Invoca createConfigComissao com o banco recusando, e devolve o texto da
// mensagem de erro que chegou ao chamador. Se nao houver erro, falha alto: uma
// traducao que engole a falha nao produziria prova de nada.
async function mensagemDeDominio(
  input: typeof PAYLOAD_NIVEL_PROFISSIONAL | typeof PAYLOAD_NIVEL_SERVICO,
  error: ReturnType<typeof erro23505>
): Promise<string> {
  mocks.single.mockResolvedValue({ data: null, error });
  try {
    await createConfigComissao(input);
  } catch (e) {
    return (e as Error).message;
  }
  throw new Error("createConfigComissao deveria ter lancado, e nao lancou");
}

beforeEach(() => {
  mocks.getSession.mockResolvedValue({
    data: {
      session: { user: { app_metadata: { salon_id: SALON } } },
    },
  });
  mocks.from.mockReturnValue({
    insert: () => ({ select: () => ({ single: mocks.single }) }),
  });
});

describe("createConfigComissao — traducao da violacao de unicidade (AC-065)", () => {
  it("a mensagem de dominio do nivel profissional e a do nivel servico sao diferentes entre si @spec:AC-065", async () => {
    const profissional = await mensagemDeDominio(
      PAYLOAD_NIVEL_PROFISSIONAL,
      erro23505(MSG_TECNICA_NIVEL_PROFISSIONAL)
    );
    const servico = await mensagemDeDominio(
      PAYLOAD_NIVEL_SERVICO,
      erro23505(MSG_TECNICA_NIVEL_SERVICO)
    );

    expect(profissional).not.toBe(servico);
  });

  it("a mensagem do nivel profissional difere da mensagem tecnica real devolvida pelo banco nesse caso @spec:AC-065", async () => {
    const mensagem = await mensagemDeDominio(
      PAYLOAD_NIVEL_PROFISSIONAL,
      erro23505(MSG_TECNICA_NIVEL_PROFISSIONAL)
    );

    expect(mensagem).not.toBe(MSG_TECNICA_NIVEL_PROFISSIONAL);
  });

  it("a mensagem do nivel servico difere da mensagem tecnica real devolvida pelo banco nesse caso @spec:AC-065", async () => {
    const mensagem = await mensagemDeDominio(
      PAYLOAD_NIVEL_SERVICO,
      erro23505(MSG_TECNICA_NIVEL_SERVICO)
    );

    expect(mensagem).not.toBe(MSG_TECNICA_NIVEL_SERVICO);
  });

  it("nenhuma das duas mensagens de dominio contem nome de constraint nem o codigo 23505 @spec:AC-065", async () => {
    const profissional = await mensagemDeDominio(
      PAYLOAD_NIVEL_PROFISSIONAL,
      erro23505(MSG_TECNICA_NIVEL_PROFISSIONAL)
    );
    const servico = await mensagemDeDominio(
      PAYLOAD_NIVEL_SERVICO,
      erro23505(MSG_TECNICA_NIVEL_SERVICO)
    );

    // Propriedade exigida para AMBAS, verificadas na mesma assert: nenhuma das
    // duas mensagens pode conter o nome de uma constraint nem o codigo.
    for (const [rotulo, mensagem] of [
      ["nivel profissional", profissional],
      ["nivel servico", servico],
    ] as const) {
      expect(mensagem, rotulo).not.toContain("23505");
      expect(mensagem, rotulo).not.toMatch(/config_comissoes_\w+/);
    }
  });
});
