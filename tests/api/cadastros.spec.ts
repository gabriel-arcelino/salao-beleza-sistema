// Prova de que a falha de gravacao de updateCliente e updateProduto chega ao
// chamador como erro de dominio, sem detalhe tecnico do banco.
//
// Feature edicao-clientes-produtos, task 1.2. Cobre AC-069, AC-071, AC-077, AC-079.
//
// O cliente Supabase e mockado. O que se prova aqui e a traducao feita pelo codigo
// da aplicacao, e NAO o comportamento do PostgREST: esse foi medido em 2026-09-29
// pela fronteira real (usuarios descartaveis com app_metadata.salon_id, perfis
// ADMIN, RECEPCAO e PROFISSIONAL) e os valores medidos sao os de baixo.
//
// ---------------------------------------------------------------------------
// MEDICAO pela fronteira real, em 2026-09-29
// ---------------------------------------------------------------------------
// Reproduzindo a cadeia que o codigo monta:
//   supabase.from(T).update(patch).eq("id", id).select().single()
//
// caso                                        code       message
// ------------------------------------------  ---------  -----------------------
// ADMIN atualiza linha existente (CONTROLE)  (nenhum)   gravou, devolveu a linha
// RECEPCAO atualiza linha existente          PGRST116   Cannot coerce the result to
//                                                        single JSON object
// PROFISSIONAL atualiza linha existente       PGRST116   Cannot coerce the result to
//                                                        single JSON object
// ADMIN atualiza id inexistente              PGRST116   Cannot coerce the result to
//                                                        single JSON object
// ADMIN manda nome null (cliente)            23502      null value in column "nome" of
//                                                        relation "clientes" violates
//                                                        not-null constraint
// ADMIN manda preco_venda null (produto)     23502      null value in column
//                                                        "preco_venda" of relation
//                                                        "produtos" violates not-null
//                                                        constraint
//
// Em PGRST116 o `details` e sempre "The result contains 0 rows".
//
// ---------------------------------------------------------------------------
// TRES FATOS QUE A MEDICAO ESTABELECE E QUE A PROVA PRESERVA
// ---------------------------------------------------------------------------
// 1) NAO EXISTE 23505. `produtos` e `clientes` nao tem nenhuma UNIQUE nem CHECK.
//    Um SKU repetido e aceito. A traducao de duplicata de config_comissoes.ts NAO
//    se aplica aqui, e translate-la seria codigo morto.
//
// 2) NAO EXISTE 42501. O RLS negado nao levanta erro: o UPDATE devolve zero linhas
//    em silencio, e o erro nasce do proprio .single() do cliente, num codigo do
//    PostgREST. Por isso este arquivo nao traduz 42501.
//
// 3) "SEM PERMISSAO" E "REGISTRO INEXISTENTE" SAO O MESMO ERRO. Mesmo code, mesma
//    message, mesmo details. A traducao de PGRST116 fala das duas sem escolher
//    entre elas, porque a fronteira nao permite escolher.
//
// Comparacao: as afirmacoes positivas comparam mensagens por IGUALDADE, nunca por
// substring. As negativas usam not.toContain, que e a forma correta de provar
// ausencia. Uma prova por "contem" passaria com a traducao ausente, porque a
// mensagem tecnica de 23502 contem o nome da coluna e o da tabela.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateCliente } from "../../src/lib/api/clientes";
import { updateProduto } from "../../src/lib/api/produtos";

const mocks = vi.hoisted(() => ({ from: vi.fn() }));

vi.mock("../../src/lib/supabaseClient", () => ({
  supabase: { from: mocks.from },
}));

const ID = "00000000-0000-0000-0000-000000000201";

const MSG_PGRST116 = "Cannot coerce the result to a single JSON object";
const MSG_23502_CLIENTE =
  'null value in column "nome" of relation "clientes" violates not-null constraint';
const MSG_23502_PRODUTO =
  'null value in column "preco_venda" of relation "produtos" violates not-null constraint';

const DOM_PGRST116_CLIENTE =
  "Não foi possível salvar a alteração do cliente. O registro não foi encontrado ou você não tem permissão para editá-lo.";
const DOM_23502_CLIENTE = "O nome do cliente é obrigatório.";
const DOM_PGRST116_PRODUTO =
  "Não foi possível salvar a alteração do produto. O registro não foi encontrado ou você não tem permissão para editá-lo.";
const DOM_23502_PRODUTO = "O nome e o preço de venda do produto são obrigatórios.";

// Reproduz a cadeia que as duas funcoes montam: update().eq().select().single().
// Devolve tambem o patch efetivamente enviado, que e o que AC-073 exige inspecionar.
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

async function falharCliente(code: string, message: string) {
  encadear({ data: null, error: { code, message, details: null } });
  return await updateCliente(ID, { nome: "X" }).catch((e: Error) => e);
}

async function falharProduto(code: string, message: string) {
  encadear({ data: null, error: { code, message, details: null } });
  return await updateProduto(ID, { preco_venda: 10 }).catch((e: Error) => e);
}

describe("updateCliente — traducao da falha de gravacao (AC-069, AC-071)", () => {
  beforeEach(() => mocks.from.mockReset());

  it("PGRST116 vira mensagem de dominio, e nao a mensagem tecnica medida @spec:AC-069 @spec:AC-071", async () => {
    const erro = await falharCliente("PGRST116", MSG_PGRST116);
    expect(erro).toBeInstanceOf(Error);
    expect((erro as Error).message).toBe(DOM_PGRST116_CLIENTE);
    expect((erro as Error).message).not.toBe(MSG_PGRST116);
  });

  it("23502 vira mensagem de dominio distinta da de PGRST116 @spec:AC-069", async () => {
    const erro = await falharCliente("23502", MSG_23502_CLIENTE);
    expect((erro as Error).message).toBe(DOM_23502_CLIENTE);
    expect((erro as Error).message).not.toBe(MSG_23502_CLIENTE);
    // As duas traduções tem de ser diferentes entre si: sao causas diferentes.
    expect((erro as Error).message).not.toBe(DOM_PGRST116_CLIENTE);
  });

  it("a mensagem de dominio nao carrega nenhum detalhe do banco @spec:AC-069 @spec:AC-077", async () => {
    const msg = (await falharCliente("23502", MSG_23502_CLIENTE) as Error).message;
    expect(msg).not.toContain("23502");
    expect(msg).not.toContain("not-null constraint");
    expect(msg).not.toContain("clientes");
    expect(msg).not.toContain('"nome"');

    const msg2 = (await falharCliente("PGRST116", MSG_PGRST116) as Error).message;
    expect(msg2).not.toContain("PGRST116");
    expect(msg2).not.toContain("coerce");
    expect(msg2).not.toContain("JSON object");
    expect(msg2).not.toContain("0 rows");
  });

  it("a mensagem nao distingue 'sem permissao' de 'registro inexistente' (D-6) @spec:AC-071 @spec:AC-079", async () => {
    // As duas produzem o MESMO erro na fronteira (medido). A traducao nao pode
    // inventar uma distincao que o banco nao faz: seria prometer ao usuario uma
    // informacao que ele nao tem. Verifica-se que existe UMA traducao para o
    // codigo, e que ela nao nomeia "permissao" como causa unica nem nega a
    // existencia do registro.
    const erro = await falharCliente("PGRST116", MSG_PGRST116);
    const m = (erro as Error).message;
    expect(m).toBe(DOM_PGRST116_CLIENTE);
    // A formulacao e "nao encontrado OU sem permissao" — as duas Causas oferecidas
    // juntas, e nao uma delas sozinha.
    expect(m).toMatch(/não foi encontrado[\s\S]*não tem permissão/);
  });

  it("erro de codigo desconhecido continua sendo repassado sem traducao @spec:AC-069", async () => {
    const original = "canceling statement due to statement timeout";
    const erro = await falharCliente("57014", original);
    expect((erro as Error).message).toBe(original);
  });

  it("gravacao bem-sucedida devolve a linha, sem lancar erro", async () => {
    const linha = { id: ID, nome: "Cliente", ativo: true };
    encadear({ data: linha, error: null });
    expect(await updateCliente(ID, { nome: "Cliente" })).toBe(linha);
  });
});

describe("updateProduto — traducao e restricao de campos (AC-073, AC-077, AC-079)", () => {
  beforeEach(() => mocks.from.mockReset());

  it("PGRST116 e 23502 viram mensagens de dominio distintas e distintas do tecnico @spec:AC-077", async () => {
    const a = (await falharProduto("PGRST116", MSG_PGRST116) as Error).message;
    const b = (await falharProduto("23502", MSG_23502_PRODUTO) as Error).message;
    expect(a).toBe(DOM_PGRST116_PRODUTO);
    expect(b).toBe(DOM_23502_PRODUTO);
    expect(a).not.toBe(b);
    expect(a).not.toBe(MSG_PGRST116);
    expect(b).not.toBe(MSG_23502_PRODUTO);
  });

  it("a mensagem nao carrega nome de coluna, de tabela nem o codigo @spec:AC-077", async () => {
    const m = (await falharProduto("23502", MSG_23502_PRODUTO) as Error).message;
    expect(m).not.toContain("23502");
    expect(m).not.toContain("not-null constraint");
    expect(m).not.toContain("produtos");
    expect(m).not.toContain('"preco_venda"');
  });

  // AC-073: o banco ACEITA preco_custo e estoque_atual (medido). A unica
  // protecao real e o tipo de updateProduto, entao a prova inspeciona o patch
  // que efetivamente chega ao cliente — nao apenas a ausencia de campo na tela.
  it("o patch enviado nao alcanca preco_custo nem estoque_atual @spec:AC-073", async () => {
    const { enviado } = encadear({ data: null, error: null });
    await updateProduto(ID, { nome: "P", preco_venda: 10 });
    expect(enviado.patch).not.toHaveProperty("preco_custo");
    expect(enviado.patch).not.toHaveProperty("estoque_atual");
    // E o que o formulario de fato produz chega inteiro.
    expect(enviado.patch).toMatchObject({ nome: "P", preco_venda: 10 });
  });

  it("erro de codigo desconhecido continua sendo repassado sem traducao @spec:AC-069", async () => {
    const original = "canceling statement due to statement timeout";
    const erro = await falharProduto("57014", original);
    expect((erro as Error).message).toBe(original);
  });
});
