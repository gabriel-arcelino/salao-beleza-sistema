import { useEffect, useState } from "react";
import type { ConfigComissao, Profissional, Servico } from "../types";
import { listConfigComissoes, createConfigComissao } from "../lib/api/config_comissoes";
import { listProfissionais } from "../lib/api/profissionais";
import { listServicos } from "../lib/api/servicos";

const METODOS_PAGAMENTO = ["DINHEIRO", "PIX", "DEBITO", "CREDITO"] as const;

export function ConfigComissoesPage() {
  const [configs, setConfigs] = useState<ConfigComissao[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  const [profissionalId, setProfissionalId] = useState("");
  const [servicoId, setServicoId] = useState(""); // "" = aplica a qualquer serviço
  const [comissaoPercentual, setComissaoPercentual] = useState("");
  const [baseCalculo, setBaseCalculo] = useState<ConfigComissao["base_calculo"]>("BRUTO");
  const [rateioTaxa, setRateioTaxa] = useState<ConfigComissao["rateio_taxa"]>("SALAO");
  const [rateioPorMetodo, setRateioPorMetodo] = useState<Record<string, string>>({
    DINHEIRO: "0",
    PIX: "0",
    DEBITO: "0",
    CREDITO: "0",
  });
  const [comissaoSobreProduto, setComissaoSobreProduto] = useState(false);
  const [timingRepasse, setTimingRepasse] =
    useState<ConfigComissao["timing_repasse"]>("IMEDIATO");

  async function carregar() {
    try {
      const [c, p, s] = await Promise.all([listConfigComissoes(), listProfissionais(), listServicos()]);
      setConfigs(c);
      setProfissionais(p);
      setServicos(s);
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
      await createConfigComissao({
        profissional_id: profissionalId,
        servico_id: servicoId || null,
        comissao_percentual: comissaoPercentual ? Number(comissaoPercentual) : undefined,
        base_calculo: baseCalculo,
        rateio_taxa: rateioTaxa,
        rateio_taxa_por_forma_pagamento:
          rateioTaxa === "POR_FORMA_PAGAMENTO"
            ? Object.fromEntries(
                Object.entries(rateioPorMetodo).map(([k, v]) => [k, Number(v)])
              )
            : null,
        comissao_sobre_produto: comissaoSobreProduto,
        timing_repasse: timingRepasse,
      });
      await carregar();
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  return (
    <section>
      <h2>Configuração de Comissão</h2>
      <p style={{ maxWidth: 520 }}>
        Deixe "Serviço" vazio para criar o default do profissional (vale para qualquer serviço que não
        tenha uma configuração específica — Seção 10.9.1 do plano).
      </p>

      <form onSubmit={handleCriar} style={{ display: "grid", gap: 8, maxWidth: 420, marginBottom: 24 }}>
        <label>
          Profissional
          <select
            id="config-comissao-profissional"
            value={profissionalId}
            onChange={(e) => setProfissionalId(e.target.value)}
            required
          >
            <option value="">Selecione</option>
            {profissionais.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </label>

        <label>
          Serviço (vazio = default do profissional)
          <select id="config-comissao-servico" value={servicoId} onChange={(e) => setServicoId(e.target.value)}>
            <option value="">Qualquer serviço (default)</option>
            {servicos.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
        </label>

        <label>
          % de comissão (vazio = usa o padrão do cadastro do profissional)
          <input
            id="config-comissao-percentual"
            type="number"
            step="0.01"
            value={comissaoPercentual}
            onChange={(e) => setComissaoPercentual(e.target.value)}
          />
        </label>

        <label>
          Base de cálculo
          <select
            id="config-comissao-base-calculo"
            value={baseCalculo}
            onChange={(e) => setBaseCalculo(e.target.value as ConfigComissao["base_calculo"])}
          >
            <option value="BRUTO">Bruto</option>
            <option value="LIQUIDO_APOS_DESCONTO">Líquido após desconto</option>
          </select>
        </label>
        <p style={{ fontSize: 12, color: "#666", marginTop: -4 }}>
          Lembrete (Seção 40, decisão v2.4): o efeito real do desconto sobre a comissão é resolvido por
          motivo de desconto (<code>motivos_desconto.afeta_comissao</code>), não só por este campo — este
          é o comportamento default quando não há desconto na comanda.
        </p>

        <label>
          Rateio de taxa da maquininha
          <select
            id="config-comissao-rateio-taxa"
            value={rateioTaxa}
            onChange={(e) => setRateioTaxa(e.target.value as ConfigComissao["rateio_taxa"])}
          >
            <option value="SALAO">Salão absorve 100%</option>
            <option value="PROFISSIONAL_PROPORCIONAL">Profissional absorve proporcional</option>
            <option value="POR_FORMA_PAGAMENTO">Configurável por forma de pagamento</option>
          </select>
        </label>

        {rateioTaxa === "POR_FORMA_PAGAMENTO" && (
          <fieldset style={{ display: "grid", gap: 4 }}>
            <legend>% absorvido pelo profissional, por forma de pagamento</legend>
            {METODOS_PAGAMENTO.map((metodo) => (
              <label key={metodo}>
                {metodo}
                <input
                  id={`config-comissao-rateio-${metodo.toLowerCase()}`}
                  type="number"
                  step="0.01"
                  value={rateioPorMetodo[metodo]}
                  onChange={(e) =>
                    setRateioPorMetodo((prev) => ({ ...prev, [metodo]: e.target.value }))
                  }
                />
              </label>
            ))}
          </fieldset>
        )}

        <label>
          <input
            id="config-comissao-sobre-produto"
            type="checkbox"
            checked={comissaoSobreProduto}
            onChange={(e) => setComissaoSobreProduto(e.target.checked)}
          />{" "}
          Gera comissão sobre produto vendido no balcão
        </label>

        <label>
          Timing do repasse
          <select
            id="config-comissao-timing-repasse"
            value={timingRepasse}
            onChange={(e) => setTimingRepasse(e.target.value as ConfigComissao["timing_repasse"])}
          >
            <option value="IMEDIATO">Imediato</option>
            <option value="APOS_LIQUIDACAO_BANCARIA">Após liquidação bancária</option>
          </select>
        </label>

        <button type="submit">Salvar configuração</button>
      </form>

      {erro && <p style={{ color: "crimson" }}>{erro}</p>}

      <ul>
        {configs.map((c) => {
          const prof = profissionais.find((p) => p.id === c.profissional_id);
          const serv = servicos.find((s) => s.id === c.servico_id);
          return (
            <li key={c.id}>
              <strong>{prof?.nome ?? c.profissional_id}</strong> —{" "}
              {serv ? serv.nome : "qualquer serviço"} — {c.base_calculo} / {c.rateio_taxa}
              {c.comissao_percentual != null && ` — ${c.comissao_percentual}%`}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
