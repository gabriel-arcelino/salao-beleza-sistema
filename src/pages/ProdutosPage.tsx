import { useEffect, useState } from "react";
import type { Produto } from "../types";
import { listProdutos, createProduto, desativarProduto } from "../lib/api/produtos";
import { Card } from "../ui/components/Card";
import { Button } from "../ui/components/Button";
import { EmptyState } from "../ui/components/EmptyState";
import { SPACING_LG } from "../ui/tokens/spacing";

export function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("");
  const [precoCusto, setPrecoCusto] = useState("");
  const [precoVenda, setPrecoVenda] = useState("");
  const [percentualComissao, setPercentualComissao] = useState(""); // vazio = herda default (10.5)
  const [erro, setErro] = useState<string | null>(null);

  async function carregar() {
    try {
      setProdutos(await listProdutos());
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    try {
      await createProduto({
        nome,
        categoria: categoria || undefined,
        preco_custo: Number(precoCusto || 0),
        preco_venda: Number(precoVenda),
        percentual_comissao: percentualComissao ? Number(percentualComissao) : undefined,
      });
      setNome("");
      setCategoria("");
      setPrecoCusto("");
      setPrecoVenda("");
      setPercentualComissao("");
      await carregar();
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  return (
    <section>
      <h2>Produtos</h2>

      <form onSubmit={handleCriar} style={{ display: "grid", gap: 8, maxWidth: 360, marginBottom: 24 }}>
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
        <label htmlFor="produto-preco-custo">Preço de custo inicial</label>
        <input
          id="produto-preco-custo"
          type="number"
          step="0.01"
          placeholder="Preço de custo inicial"
          value={precoCusto}
          onChange={(e) => setPrecoCusto(e.target.value)}
        />
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
        <Button type="submit" variant="primary">Cadastrar produto</Button>
      </form>

      <section aria-label="Lista de produtos" style={{ marginTop: SPACING_LG }}>
        <Card>
          {erro && <p style={{ color: "crimson" }}>{erro}</p>}

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
