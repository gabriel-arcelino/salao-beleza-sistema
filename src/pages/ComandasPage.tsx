import { useEffect, useState } from "react";
import type { Comanda, ComandaComItens, Profissional, Servico, Produto } from "../types";
import {
  listComandas,
  createComanda,
  addItemComanda,
  getComanda,
  fecharComanda,
  cancelarComanda,
} from "../lib/api/comandas";
import { listProfissionais } from "../lib/api/profissionais";
import { listServicos } from "../lib/api/servicos";
import { listProdutos } from "../lib/api/produtos";
import { SPACING_LG } from "../ui/tokens/spacing";

export function ComandasPage() {
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [comandaSelecionada, setComandaSelecionada] = useState<ComandaComItens | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  const [novaComandaProfissional, setNovaComandaProfissional] = useState("");
  const [novoItemTipo, setNovoItemTipo] = useState<"SERVICO" | "PRODUTO">("SERVICO");
  const [novoItemServico, setNovoItemServico] = useState("");
  const [novoItemProduto, setNovoItemProduto] = useState("");
  const [novoItemQtd, setNovoItemQtd] = useState("1");
  const [novoItemProfissional, setNovoItemProfissional] = useState("");

  const [pagamentos, setPagamentos] = useState<{ metodo: string; valor_bruto: number }[]>([]);
  const [pagamentoMetodo, setPagamentoMetodo] = useState("DINHEIRO");
  const [pagamentoValor, setPagamentoValor] = useState("");

  async function carregar() {
    setCarregando(true);
    try {
      const [c, p, s, prod] = await Promise.all([
        listComandas(),
        listProfissionais(),
        listServicos(),
        listProdutos(),
      ]);
      setComandas(c);
      setProfissionais(p);
      setServicos(s);
      setProdutos(prod);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function handleCriarComanda(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    try {
      const uuid = crypto.randomUUID();
      const comanda = await createComanda({
        uuid_cliente: uuid,
        profissional_id: novaComandaProfissional || undefined,
      });
      await carregar();
      setComandaSelecionada({
        ...comanda,
        itens: [],
        pagamentos: [],
      });
      setNovaComandaProfissional("");
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!comandaSelecionada) return;
    setErro(null);
    try {
      const preco =
        novoItemTipo === "SERVICO"
          ? servicos.find((s) => s.id === novoItemServico)?.preco ?? 0
          : produtos.find((p) => p.id === novoItemProduto)?.preco_venda ?? 0;

      const descricao =
        novoItemTipo === "SERVICO"
          ? servicos.find((s) => s.id === novoItemServico)?.nome ?? ""
          : produtos.find((p) => p.id === novoItemProduto)?.nome ?? "";

      await addItemComanda({
        comanda_id: comandaSelecionada.id,
        tipo: novoItemTipo,
        servico_id: novoItemTipo === "SERVICO" ? novoItemServico : undefined,
        produto_id: novoItemTipo === "PRODUTO" ? novoItemProduto : undefined,
        descricao_snapshot: descricao,
        quantidade: Number(novoItemQtd),
        preco_unitario: preco,
        profissional_id: novoItemProfissional || undefined,
      });

      setNovoItemServico("");
      setNovoItemProduto("");
      setNovoItemQtd("1");
      setNovoItemProfissional("");

      const atualizada = await getComanda(comandaSelecionada.id);
      setComandaSelecionada(atualizada);
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  async function handleFechar() {
    if (!comandaSelecionada) return;
    setErro(null);
    try {
      const resultado = await fecharComanda(comandaSelecionada.id, pagamentos);
      alert(`Comanda fechada! Total: R$ ${resultado.total.toFixed(2)}`);
      setComandaSelecionada(null);
      setPagamentos([]);
      await carregar();
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  async function handleCancelar(id: string) {
    if (!confirm("Cancelar esta comanda?")) return;
    try {
      await cancelarComanda(id);
      await carregar();
      setComandaSelecionada(null);
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  function adicionarPagamento() {
    if (!pagamentoValor || Number(pagamentoValor) <= 0) return;
    setPagamentos((prev) => [
      ...prev,
      { metodo: pagamentoMetodo, valor_bruto: Number(pagamentoValor) },
    ]);
    setPagamentoValor("");
  }

  const subtotal = comandaSelecionada?.itens.reduce(
    (acc, item) => acc + item.preco_unitario * item.quantidade,
    0
  ) ?? 0;

  return (
    <section>
      <h2>Comandas</h2>

      {erro && <p style={{ color: "crimson" }}>{erro}</p>}
      {carregando && <p>Carregando...</p>}

      {!comandaSelecionada ? (
        <>
          <form onSubmit={handleCriarComanda} style={{ marginBottom: 24 }}>
            <label>
              Profissional (opcional)
              <select
                id="comanda-profissional"
                value={novaComandaProfissional}
                onChange={(e) => setNovaComandaProfissional(e.target.value)}
              >
                <option value="">Nenhum</option>
                {profissionais.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit">Abrir comanda</button>
          </form>

          <section aria-label="Lista de comandas" style={{ marginTop: SPACING_LG }}>
            <ul>
              {comandas.map((c) => (
                <li key={c.id}>
                  <strong>#{c.numero}</strong> — {c.status} — R$ {c.total.toFixed(2)}{" "}
                  <button onClick={() => getComanda(c.id).then(setComandaSelecionada)}>
                    Ver
                  </button>{" "}
                  {c.status === "ABERTA" && (
                    <button onClick={() => handleCancelar(c.id)}>Cancelar</button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : (
        <>
          <button onClick={() => setComandaSelecionada(null)} style={{ marginBottom: 16 }}>
            Voltar para lista
          </button>

          <h3>
            Comanda #{comandaSelecionada.numero} — {comandaSelecionada.status}
          </h3>

          <p>Subtotal: R$ {subtotal.toFixed(2)}</p>

          <h4>Itens</h4>
          <ul>
            {comandaSelecionada.itens.map((item) => (
              <li key={item.id}>
                {item.descricao_snapshot} — {item.quantidade}x R$ {item.preco_unitario.toFixed(2)} = R$ {item.total.toFixed(2)}
              </li>
            ))}
          </ul>

          {comandaSelecionada.status === "ABERTA" && (
            <form onSubmit={handleAddItem} style={{ marginBottom: 24 }}>
              <label htmlFor="comanda-item-tipo">Tipo de item</label>
              <select
                id="comanda-item-tipo"
                value={novoItemTipo}
                onChange={(e) => setNovoItemTipo(e.target.value as "SERVICO" | "PRODUTO")}
              >
                <option value="SERVICO">Serviço</option>
                <option value="PRODUTO">Produto</option>
              </select>

              {novoItemTipo === "SERVICO" ? (
                <>
                  <label htmlFor="comanda-item-servico">Serviço</label>
                  <select
                    id="comanda-item-servico"
                    value={novoItemServico}
                    onChange={(e) => setNovoItemServico(e.target.value)}
                    required
                  >
                    <option value="">Selecione serviço</option>
                    {servicos.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nome} — R$ {s.preco.toFixed(2)}
                      </option>
                    ))}
                  </select>
                </>
              ) : (
                <>
                  <label htmlFor="comanda-item-produto">Produto</label>
                  <select
                    id="comanda-item-produto"
                    value={novoItemProduto}
                    onChange={(e) => setNovoItemProduto(e.target.value)}
                    required
                  >
                    <option value="">Selecione produto</option>
                    {produtos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome} — R$ {p.preco_venda.toFixed(2)}
                      </option>
                    ))}
                  </select>
                </>
              )}

              <label htmlFor="comanda-item-quantidade">Quantidade</label>
              <input
                id="comanda-item-quantidade"
                type="number"
                step="0.01"
                placeholder="Qtd"
                value={novoItemQtd}
                onChange={(e) => setNovoItemQtd(e.target.value)}
                required
              />
              <label htmlFor="comanda-item-profissional">Profissional (opcional)</label>
              <select
                id="comanda-item-profissional"
                value={novoItemProfissional}
                onChange={(e) => setNovoItemProfissional(e.target.value)}
              >
                <option value="">Profissional (opcional)</option>
                {profissionais.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
              <button type="submit">Adicionar item</button>
            </form>
          )}

          {comandaSelecionada.status === "ABERTA" && (
            <section aria-label="Pagamentos da comanda" style={{ marginTop: SPACING_LG }}>
              <h4>Pagamentos</h4>
              <ul>
                {pagamentos.map((p, i) => (
                  <li key={i}>
                    {p.metodo}: R$ {p.valor_bruto.toFixed(2)}
                  </li>
                ))}
              </ul>
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <label>
                  Forma de pagamento
                  <select
                    id="comanda-pagamento-metodo"
                    value={pagamentoMetodo}
                    onChange={(e) => setPagamentoMetodo(e.target.value)}
                  >
                    <option value="DINHEIRO">Dinheiro</option>
                    <option value="PIX">Pix</option>
                    <option value="DEBITO">Débito</option>
                    <option value="CREDITO">Crédito</option>
                  </select>
                </label>
                <label>
                  Valor
                  <input
                    id="comanda-pagamento-valor"
                    type="number"
                    step="0.01"
                    placeholder="Valor"
                    value={pagamentoValor}
                    onChange={(e) => setPagamentoValor(e.target.value)}
                  />
                </label>
                <button type="button" onClick={adicionarPagamento}>
                  Adicionar pagamento
                </button>
              </div>

              <button onClick={handleFechar} disabled={pagamentos.length === 0}>
                Fechar comanda
              </button>
            </section>
          )}
        </>
      )}
    </section>
  );
}
