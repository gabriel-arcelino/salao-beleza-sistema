import { useEffect, useState } from "react";
import type { Cliente } from "../types";
import { listClientes, createCliente, desativarCliente } from "../lib/api/clientes";
import { SPACING_LG } from "../ui/tokens/spacing";

export function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  async function carregar() {
    try {
      setClientes(await listClientes());
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
      await createCliente({ nome, telefone: telefone || undefined, email: email || undefined });
      setNome("");
      setTelefone("");
      setEmail("");
      await carregar();
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  return (
    <section>
      <h2>Clientes</h2>

      <form onSubmit={handleCriar} style={{ display: "grid", gap: 8, maxWidth: 360, marginBottom: 24 }}>
        <label htmlFor="cliente-nome">Nome</label>
        <input
          id="cliente-nome"
          placeholder="Nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
        />
        <label htmlFor="cliente-telefone">Telefone</label>
        <input
          id="cliente-telefone"
          placeholder="Telefone"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
        />
        <label htmlFor="cliente-email">E-mail</label>
        <input
          id="cliente-email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit">Cadastrar cliente</button>
      </form>

      <section aria-label="Lista de clientes" style={{ marginTop: SPACING_LG }}>
        {erro && <p style={{ color: "crimson" }}>{erro}</p>}

        <ul>
          {clientes.map((c) => (
            <li key={c.id}>
            <strong>{c.nome}</strong> {c.telefone && `— ${c.telefone}`}{" "}
            {!c.ativo && <em>(inativo)</em>}{" "}
            {c.ativo && (
              <button
                onClick={async () => {
                  if (confirm("Desativar este cliente?")) {
                    await desativarCliente(c.id);
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
    </section>
  );
}
