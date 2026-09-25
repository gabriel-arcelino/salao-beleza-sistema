import { useEffect, useState } from "react";
import type { Profissional } from "../types";
import {
  listProfissionais,
  createProfissional,
  desativarProfissional,
} from "../lib/api/profissionais";
import { Card } from "../ui/components/Card";
import { Button } from "../ui/components/Button";
import { EmptyState } from "../ui/components/EmptyState";
import { SPACING_LG } from "../ui/tokens/spacing";
import { FONT_HEADING, FONT_SIZE_HEADING } from "../ui/tokens/typography";

export function ProfissionaisPage() {
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [comissaoPadrao, setComissaoPadrao] = useState("40");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    setCarregando(true);
    try {
      setProfissionais(await listProfissionais());
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    try {
      await createProfissional({
        nome,
        telefone: telefone || undefined,
        comissao_percentual_padrao: Number(comissaoPadrao),
      });
      setNome("");
      setTelefone("");
      setComissaoPadrao("40");
      await carregar();
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  async function handleDesativar(id: string) {
    if (!confirm("Desativar este profissional?")) return;
    await desativarProfissional(id);
    await carregar();
  }

  return (
    <section>
      <h2 style={{ fontFamily: FONT_HEADING, fontSize: FONT_SIZE_HEADING }}>Profissionais</h2>

      <form
        onSubmit={handleCriar}
        aria-label="Formulário de cadastro de profissional"
        style={{ display: "grid", gap: 8, maxWidth: 360, marginBottom: SPACING_LG }}
      >
        <label htmlFor="profissional-nome">Nome</label>
        <input
          id="profissional-nome"
          placeholder="Nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
        />
        <label htmlFor="profissional-telefone">Telefone</label>
        <input
          id="profissional-telefone"
          placeholder="Telefone"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
        />
        <label>
          Comissão padrão (%)
          <input
            id="profissional-comissao-padrao"
            type="number"
            step="0.01"
            value={comissaoPadrao}
            onChange={(e) => setComissaoPadrao(e.target.value)}
            required
          />
        </label>
        <Button type="submit" variant="primary">Cadastrar profissional</Button>
      </form>

      <section aria-label="Lista de profissionais" style={{ marginTop: SPACING_LG }}>
        <Card>
          {erro && <p style={{ color: "crimson" }}>{erro}</p>}
          {carregando && <p>Carregando...</p>}

          {!carregando && !erro && profissionais.length === 0 ? (
            <EmptyState message="Nenhum profissional cadastrado." />
          ) : (
            <ul>
              {profissionais.map((p) => (
                <li key={p.id}>
                  <strong>{p.nome}</strong> — {p.comissao_percentual_padrao}%{" "}
                  {!p.ativo && <em>(inativo)</em>}{" "}
                  {p.ativo && (
                    <Button variant="destructive" onClick={() => handleDesativar(p.id)}>
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
