import { useEffect, useState } from "react";
import type { Profissional } from "../types";
import {
  listProfissionais,
  createProfissional,
  desativarProfissional,
  ativarProfissional,
} from "../lib/api/profissionais";
import { Card } from "../ui/components/Card";
import { Button } from "../ui/components/Button";
import { EmptyState } from "../ui/components/EmptyState";
import { ErrorMessage } from "../ui/components/ErrorMessage";
import { usePerfil } from "../lib/perfil";
import { AvisoPerfilSemEscrita } from "../ui/components/AvisoPerfilSemEscrita";
import { SPACING_LG } from "../ui/tokens/spacing";
import { FONT_HEADING, FONT_SIZE_HEADING } from "../ui/tokens/typography";

export function ProfissionaisPage() {
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [comissaoPadrao, setComissaoPadrao] = useState("40");
  const [erro, setErro] = useState<string | null>(null);
  // Gate de escrita: a RLS ja recusa, o gate evita oferecer o clique que vai falhar.
  const { leitura, pode } = usePerfil();
  const podeGravar = pode("profissionais");
  // O aviso so aparece com o perfil em maos: enquanto carrega, ou se a leitura
  // falhou (D-3), as acoes continuam visiveis e nao ha o que avisar.
  const perfilCarregado = leitura?.estado === "carregado" ? leitura.perfil : null;
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    setErro(null);
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

  // Reativar e o mesmo par de escrita, e aqui a funcao ja existia - por isso ela
  // virou "alternar" em vez de ganhar uma irma. Nesta tela a linha fica com UM
  // botao so: nao existe "Editar" porque updateProfissional e orfa (medido).
  async function handleAlternarAtivo(id: string, ativando: boolean) {
    if (!ativando && !confirm("Desativar este profissional?")) return;
    setErro(null);
    try {
      if (ativando) {
        await ativarProfissional(id);
      } else {
        await desativarProfissional(id);
      }
      await carregar();
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  return (
    <section>
      <h2 style={{ fontFamily: FONT_HEADING, fontSize: FONT_SIZE_HEADING }}>Profissionais</h2>

      {podeGravar ? (
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
      ) : (
        <AvisoPerfilSemEscrita
          perfil={perfilCarregado!}
          oQue="cadastros de profissional"
        />
      )}

      <section aria-label="Lista de profissionais" style={{ marginTop: SPACING_LG }}>
        <Card>
          {erro && <ErrorMessage message={erro} onRetry={carregar} />}
          {carregando && <p>Carregando...</p>}

          {!carregando && !erro && profissionais.length === 0 ? (
            <EmptyState message="Nenhum profissional cadastrado." />
          ) : (
            <ul>
              {profissionais.map((p) => (
                <li key={p.id}>
                  <strong>{p.nome}</strong> — {p.comissao_percentual_padrao}%{" "}
                  {!p.ativo && <em>(inativo)</em>}{" "}
                  {podeGravar &&
                    (p.ativo ? (
                      <Button variant="destructive" onClick={() => handleAlternarAtivo(p.id, false)}>
                        Desativar
                      </Button>
                    ) : (
                      <Button variant="primary" onClick={() => handleAlternarAtivo(p.id, true)}>
                        Reativar
                      </Button>
                    ))}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </section>
  );
}

