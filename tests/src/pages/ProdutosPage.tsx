import { useEffect, useState } from "react";
import type { Produto } from "../types";
import { listProdutos, createProduto, desativarProduto } from "../lib/api/produtos";

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
        <input placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
        <input placeholder="Categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)} />
        <input
          type="number"
          step="0.01"
          placeholder="Preço de custo inicial"
          value={precoCusto}
          onChange={(e) => setPrecoCusto(e.target.value)}
        />
        <input
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
            type="number"
            step="0.01"
            value={percentualComissao}
            onChange={(e) => setPercentualComissao(e.target.value)}
          />
        </label>
        <button type="submit">Cadastrar produto</button>
      </form>

      {erro && <p style={{ color: "crimson" }}>{erro}</p>}

      <ul>
        {produtos.map((p) => (
          <li key={p.id}>
            <strong>{p.nome}</strong> — venda R$ {p.preco_venda.toFixed(2)} / custo R${" "}
            {p.preco_custo.toFixed(2)}
            {p.percentual_comissao != null && ` — comissão própria: ${p.percentual_comissao}%`}
            {!p.ativo && <em> (inativo)</em>}{" "}
            {p.ativo && (
              <button
                onClick={async () => {
                  if (confirm("Desativar este produto?")) {
                    await desativarProduto(p.id);
                    await carregar();
                  }
                }}
              >
                Desativar
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
