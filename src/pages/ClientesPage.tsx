import { useEffect, useState } from "react";
import type { Cliente } from "../types";
import { listClientes, createCliente, updateCliente, desativarCliente, ativarCliente } from "../lib/api/clientes";
import { Card } from "../ui/components/Card";
import { Button } from "../ui/components/Button";
import { EmptyState } from "../ui/components/EmptyState";
import { ErrorMessage } from "../ui/components/ErrorMessage";
import { usePerfil } from "../lib/perfil";
import { AvisoPerfilSemEscrita } from "../ui/components/AvisoPerfilSemEscrita";
import { SPACING_LG } from "../ui/tokens/spacing";
import { FONT_HEADING, FONT_SIZE_HEADING } from "../ui/tokens/typography";

// O banco nao valida formato de e-mail (medido: "nao-e-email" foi aceito pela
// fronteira real em 2026-09-29), entao a validação vive aqui. Fica no JS, e nao
// em type="email" do input, para que a regra do e-mail e as de preco e percentual
// estejam na mesma camada e a mensagem seja a do aplicativo. O campo e
// type="text" de proposito: com type="email" o navegador bloqueia a submissao
// antes do onSubmit rodar, e a validação do aplicativo nunca executa.
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  // Gate de escrita: a RLS ja recusa, o gate evita oferecer o clique que vai falhar.
  const { leitura, pode } = usePerfil();
  const podeGravar = pode("clientes");
  // O aviso so aparece com o perfil em maos: enquanto carrega, ou se a leitura
  // falhou (D-3), as acoes continuam visiveis e nao ha o que avisar.
  const perfilCarregado = leitura?.estado === "carregado" ? leitura.perfil : null;
  // null = modo cadastro. Preenchido = modo edicao. O mesmo formulario atende os
  // dois casos: os campos e o tratamento de erro sao identicos, e duas copias
  // divergem no primeiro ajuste sem dar sinal.
  const [editando, setEditando] = useState<Cliente | null>(null);

  // Desativar e reativar sao a mesma escrita com valores opostos, entao ficam
  // juntos. O try/catch e o que impede a falha silenciosa: sem ele, a recusa da
  // escrita levanta erro nao tratado e a pessoa nao ve nada. A recarga so
  // acontece DEPOIS do sucesso - se falhou, a lista fica como estava, que e o
  // que AC-094 exige.
  async function alternarAtivo(id: string, ativando: boolean) {
    setErro(null);
    try {
      if (ativando) {
        await ativarCliente(id);
      } else {
        await desativarCliente(id);
      }
      await carregar();
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  async function carregar() {
    setErro(null);
    try {
      setClientes(await listClientes());
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  function limparFormulario() {
    setNome("");
    setTelefone("");
    setEmail("");
    setObservacoes("");
    setEditando(null);
  }

  function iniciarEdicao(c: Cliente) {
    setErro(null);
    setEditando(c);
    setNome(c.nome);
    setTelefone(c.telefone ?? "");
    setEmail(c.email ?? "");
    setObservacoes(c.observacoes ?? "");
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (email && !EMAIL_VALIDO.test(email)) {
      setErro("E-mail inválido. Confira o endereço informado.");
      return;
    }
    // Campo opcional vazio vira null (limpa o dado) e nao undefined (que e
    // descartado na serializacao e deixaria o valor antigo intacto).
    const campos = {
      nome,
      telefone: telefone || null,
      email: email || null,
      observacoes: observacoes || null,
    };
    try {
      if (editando) {
        await updateCliente(editando.id, campos);
      } else {
        await createCliente({
          nome,
          telefone: telefone || undefined,
          email: email || undefined,
          observacoes: observacoes || undefined,
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
      <h2 style={{ fontFamily: FONT_HEADING, fontSize: FONT_SIZE_HEADING }}>Clientes</h2>

      {podeGravar ? (
      <form
        onSubmit={handleSalvar}
        aria-label={
          editando ? "Formulário de edição de cliente" : "Formulário de cadastro de cliente"
        }
        style={{ display: "grid", gap: 8, maxWidth: 360, marginBottom: SPACING_LG }}
      >
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
          aria-invalid={email !== "" && !EMAIL_VALIDO.test(email)}
        />
        <label htmlFor="cliente-observacoes">Observações</label>
        <input
          id="cliente-observacoes"
          placeholder="Observações"
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
        />
        <Button type="submit" variant="primary">
          {editando ? "Salvar alterações" : "Cadastrar cliente"}
        </Button>
        {editando && (
          <Button type="button" variant="neutral" onClick={limparFormulario}>
            Cancelar edição
          </Button>
        )}
      </form>
      ) : (
        <AvisoPerfilSemEscrita
          perfil={perfilCarregado!}
          oQue="cadastros de cliente"
        />
      )}

      <section aria-label="Lista de clientes" style={{ marginTop: SPACING_LG }}>
        <Card>
          {erro && <ErrorMessage message={erro} onRetry={carregar} />}

          {!erro && clientes.length === 0 ? (
            <EmptyState message="Nenhum cliente cadastrado." />
          ) : (
            <ul>
              {clientes.map((c) => (
                <li key={c.id}>
                  <strong>{c.nome}</strong> {c.telefone && `- ${c.telefone}`}{" "}
                  {!c.ativo && <em>(inativo)</em>}{" "}
                  {podeGravar && (
                    <>
                      <Button variant="neutral" onClick={() => iniciarEdicao(c)}>
                        Editar
                      </Button>{" "}
                      {c.ativo ? (
                        <Button
                          variant="destructive"
                          onClick={async () => {
                            if (confirm("Desativar este cliente?")) {
                              await alternarAtivo(c.id, false);
                            }
                          }}
                        >
                          Desativar
                        </Button>
                      ) : (
                        <Button variant="primary" onClick={() => alternarAtivo(c.id, true)}>
                          Reativar
                        </Button>
                      )}
                    </>
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

