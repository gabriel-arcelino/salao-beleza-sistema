import { useEffect, useState } from "react";
import type { Produto } from "../types";
import { listProdutos, createProduto, updateProduto, desativarProduto } from "../lib/api/produtos";
import { Card } from "../ui/components/Card";
import { Button } from "../ui/components/Button";
import { EmptyState } from "../ui/components/EmptyState";
import { ErrorMessage } from "../ui/components/ErrorMessage";
import { SPACING_LG } from "../ui/tokens/spacing";
import { FONT_HEADING, FONT_SIZE_HEADING } from "../ui/tokens/typography";

export function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("");
  const [precoCusto, setPrecoCusto] = useState("");
  const [precoVenda, setPrecoVenda] = useState("");
  const [percentualComissao, setPercentualComissao] = useState(""); // vazio = herda default (10.5)
  const [erro, setErro] = useState<string | null>(null);
  // null = modo cadastro. Preenchido = modo edicao. O mesmo formulario atende os
  // dois, com uma excecao deliberada: o campo de preco de custo so existe no
  // cadastro (ver o comentario no JSX).
  const [editando, setEditando] = useState<Produto | null>(null);

  async function carregar() {
    setErro(null);
    try {
      setProdutos(await listProdutos());
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  function limparFormulario() {
    setNome("");
    setCategoria("");
    setPrecoCusto("");
    setPrecoVenda("");
    setPercentualComissao("");
    setEditando(null);
  }

  function iniciarEdicao(p: Produto) {
    setErro(null);
    setEditando(p);
    setNome(p.nome);
    setCategoria(p.categoria ?? "");
    setPrecoCusto(""); // nunca reaproveitado na edicao
    setPrecoVenda(String(p.preco_venda));
    setPercentualComissao(p.percentual_comissao != null ? String(p.percentual_comissao) : "");
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    // O banco nao valida faixa: medido, preco_venda = -1, percentual 150 e -5 e
    // estoque_minimo negativo foram todos aceitos pela fronteira real. A
    // validacao vive aqui.
    const venda = Number(precoVenda);
    if (!Number.isFinite(venda) || venda < 0) {
      setErro("Preço de venda inválido. Informe um valor maior ou igual a zero.");
      return;
    }
    const pct = percentualComissao ? Number(percentualComissao) : null;
    if (pct !== null && (!Number.isFinite(pct) || pct < 0 || pct > 100)) {
      setErro("Percentual de comissão inválido. Informe um valor entre 0 e 100.");
      return;
    }
    try {
      if (editando) {
        // Campo opcional vazio vira null (limpa o percentual, voltando a herdar
        // o default) e nao undefined (que e descartado na serializacao e
        // deixaria o valor antigo intacto). preco_custo e estoque_atual NAO
        // entram: ver produtos.ts e o comentario do campo de custo no JSX.
        await updateProduto(editando.id, {
          nome,
          categoria: categoria || null,
          preco_venda: venda,
          percentual_comissao: pct,
        });
      } else {
        await createProduto({
          nome,
          categoria: categoria || undefined,
          preco_custo: Number(precoCusto || 0),
          preco_venda: venda,
          percentual_comissao: pct ?? undefined,
        });
      }
      limparFormulario();
      // Reconsulta em vez de aplicar a linha devolvida ao estado local: a
      // listagem tem um unico caminho de atualizacao, o mesmo que a monta.
      await carregar();
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  return (
    <section>
      <h2 style={{ fontFamily: FONT_HEADING, fontSize: FONT_SIZE_HEADING }}>Produtos</h2>

      <form
        onSubmit={handleSalvar}
        aria-label={
          editando ? "Formulário de edição de produto" : "Formulário de cadastro de produto"
        }
        style={{ display: "grid", gap: 8, maxWidth: 360, marginBottom: SPACING_LG }}
      >
        <label htmlFor="produto-nome">Nome</label>
        <input
          id="produto-nome"
          placeholder="Nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
        />
        <label htmlFor="produto-categoria">Categoria</label>
        <input
          id="produto-categoria"
          placeholder="Categoria"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
        />
        {/* O preco de custo so existe no cadastro. Ele e recalculado pela RPC de
            movimentacao de estoque (custo medio ponderavel) e lido ao vivo por
            fn_fechar_comanda ao gravar o custo unitario da saida — edita-lo aqui
            mudaria retroativamente a auditoria de custo. Ver produtos.ts:36-40. */}
        {!editando && (
          <>
            <label htmlFor="produto-preco-custo">Preço de custo inicial</label>
            <input
              id="produto-preco-custo"
              type="number"
              step="0.01"
              placeholder="Preço de custo inicial"
              value={precoCusto}
              onChange={(e) => setPrecoCusto(e.target.value)}
            />
          </>
        )}
        {editando && (
          <p style={{ margin: 0 }}>
            Editando <strong>{editando.nome}</strong> — custo e estoque atual não são
            editáveis aqui.
          </p>
        )}
        <label htmlFor="produto-preco-venda">Preço de venda</label>
        <input
          id="produto-preco-venda"
          type="number"
          step="0.01"
          placeholder="Preço de venda"
          value={precoVenda}
          onChange={(e) => setPrecoVenda(e.target.value)}
          required
        />
        <label>
          % comissão específica deste produto (deixe vazio para herdar o default)
          <input
            id="produto-percentual-comissao"
            type="number"
            step="0.01"
            value={percentualComissao}
            onChange={(e) => setPercentualComissao(e.target.value)}
          />
        </label>
        {editando && (
          <p style={{ margin: 0, fontSize: 13 }}>
            Alterar este percentual vale para as comandas <strong>ainda abertas</strong> que
            usarem este produto: o fechamento delas vai usar o novo valor. Comandas já
            fechadas mantêm a comissão que foi apurada.
          </p>
        )}
        <Button type="submit" variant="primary">
          {editando ? "Salvar alterações" : "Cadastrar produto"}
        </Button>
        {editando && (
          <Button type="button" variant="neutral" onClick={limparFormulario}>
            Cancelar edição
          </Button>
        )}
      </form>

      <section aria-label="Lista de produtos" style={{ marginTop: SPACING_LG }}>
        <Card>
          {erro && <ErrorMessage message={erro} onRetry={carregar} />}

          {!erro && produtos.length === 0 ? (
            <EmptyState message="Nenhum produto cadastrado." />
          ) : (
            <ul>
              {produtos.map((p) => (
                <li key={p.id}>
                  <strong>{p.nome}</strong> — venda R$ {p.preco_venda.toFixed(2)} / custo R${" "}
                  {p.preco_custo.toFixed(2)}
                  {p.percentual_comissao != null && ` — comissão própria: ${p.percentual_comissao}%`}
                  {!p.ativo && <em> (inativo)</em>}{" "}
                  <Button variant="neutral" onClick={() => iniciarEdicao(p)}>
                    Editar
                  </Button>{" "}
                  {p.ativo && (
                    <Button
                      variant="destructive"
                      onClick={async () => {
                        if (confirm("Desativar este produto?")) {
                          await desativarProduto(p.id);
                          await carregar();
                        }
                      }}
                    >
                      Desativar
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </section>
  );
}
