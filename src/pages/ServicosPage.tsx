import { useEffect, useState } from "react";
import type { Servico } from "../types";
import { listServicos, createServico, desativarServico } from "../lib/api/servicos";
import { Card } from "../ui/components/Card";
import { EmptyState } from "../ui/components/EmptyState";
import { SPACING_LG } from "../ui/tokens/spacing";

export function ServicosPage() {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("");
  const [preco, setPreco] = useState("");
  const [duracao, setDuracao] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  async function carregar() {
    try {
      setServicos(await listServicos());
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
      await createServico({
        nome,
        categoria: categoria || undefined,
        preco: Number(preco),
        duracao_minutos: duracao ? Number(duracao) : undefined,
      });
      setNome("");
      setCategoria("");
      setPreco("");
      setDuracao("");
      await carregar();
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  return (
    <section>
      <h2>Serviços</h2>

      <form onSubmit={handleCriar} style={{ display: "grid", gap: 8, maxWidth: 360, marginBottom: 24 }}>
        <label htmlFor="servico-nome">Nome</label>
        <input
          id="servico-nome"
          placeholder="Nome (ex.: Corte)"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
        />
        <label htmlFor="servico-categoria">Categoria</label>
        <input
          id="servico-categoria"
          placeholder="Categoria"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
        />
        <label htmlFor="servico-preco">Preço</label>
        <input
          id="servico-preco"
          type="number"
          step="0.01"
          placeholder="Preço"
          value={preco}
          onChange={(e) => setPreco(e.target.value)}
          required
        />
        <label htmlFor="servico-duracao">Duração (minutos)</label>
        <input
          id="servico-duracao"
          type="number"
          placeholder="Duração (minutos)"
          value={duracao}
          onChange={(e) => setDuracao(e.target.value)}
        />
        <button type="submit">Cadastrar serviço</button>
      </form>

      <section aria-label="Lista de serviços" style={{ marginTop: SPACING_LG }}>
        <Card>
          {erro && <p style={{ color: "crimson" }}>{erro}</p>}

          {!erro && servicos.length === 0 ? (
            <EmptyState message="Nenhum serviço cadastrado." />
          ) : (
            <ul>
              {servicos.map((s) => (
                <li key={s.id}>
                  <strong>{s.nome}</strong> — R$ {s.preco.toFixed(2)} {!s.ativo && <em>(inativo)</em>}{" "}
                  {s.ativo && (
                    <button
                      onClick={async () => {
                        if (confirm("Desativar este serviço?")) {
                          await desativarServico(s.id);
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
          )}
        </Card>
      </section>
    </section>
  );
}
