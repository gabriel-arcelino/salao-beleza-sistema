import { useEffect, useState } from "react";
import type { Servico } from "../types";
import { listServicos, createServico, desativarServico, ativarServico } from "../lib/api/servicos";
import { Card } from "../ui/components/Card";
import { Button } from "../ui/components/Button";
import { EmptyState } from "../ui/components/EmptyState";
import { ErrorMessage } from "../ui/components/ErrorMessage";
import { usePerfil } from "../lib/perfil";
import { AvisoPerfilSemEscrita } from "../ui/components/AvisoPerfilSemEscrita";
import { SPACING_LG } from "../ui/tokens/spacing";
import { FONT_HEADING, FONT_SIZE_HEADING } from "../ui/tokens/typography";

export function ServicosPage() {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("");
  const [preco, setPreco] = useState("");
  const [duracao, setDuracao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  // Gate de escrita: a RLS ja recusa, o gate evita oferecer o clique que vai falhar.
  const { leitura, pode } = usePerfil();
  const podeGravar = pode("servicos");
  // O aviso so aparece com o perfil em maos: enquanto carrega, ou se a leitura
  // falhou (D-3), as acoes continuam visiveis e nao ha o que avisar.
  const perfilCarregado = leitura?.estado === "carregado" ? leitura.perfil : null;


  // Ver a nota em ClientesPage: try/catch e o que impede a falha silenciosa, e a
  // recarga so acontece depois do sucesso.
  async function alternarAtivo(id: string, ativando: boolean) {
    setErro(null);
    try {
      if (ativando) {
        await ativarServico(id);
      } else {
        await desativarServico(id);
      }
      await carregar();
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  async function carregar() {
    setErro(null);
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
      <h2 style={{ fontFamily: FONT_HEADING, fontSize: FONT_SIZE_HEADING }}>Serviços</h2>

      {podeGravar ? (
      <form
        onSubmit={handleCriar}
        aria-label="Formulário de cadastro de serviço"
        style={{ display: "grid", gap: 8, maxWidth: 360, marginBottom: SPACING_LG }}
      >
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
        <Button type="submit" variant="primary">Cadastrar serviço</Button>
      </form>
      ) : (
        <AvisoPerfilSemEscrita
          perfil={perfilCarregado!}
          oQue="cadastros de serviço"
        />
      )}

      <section aria-label="Lista de serviços" style={{ marginTop: SPACING_LG }}>
        <Card>
          {erro && <ErrorMessage message={erro} onRetry={carregar} />}

          {!erro && servicos.length === 0 ? (
            <EmptyState message="Nenhum serviço cadastrado." />
          ) : (
            <ul>
              {servicos.map((s) => (
                <li key={s.id}>
                  <strong>{s.nome}</strong> — R$ {s.preco.toFixed(2)} {!s.ativo && <em>(inativo)</em>}{" "}
                  {podeGravar &&
                    (s.ativo ? (
                      <Button
                        variant="destructive"
                        onClick={async () => {
                          if (confirm("Desativar este serviço?")) {
                            await alternarAtivo(s.id, false);
                          }
                        }}
                      >
                        Desativar
                      </Button>
                    ) : (
                      <Button variant="primary" onClick={() => alternarAtivo(s.id, true)}>
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

