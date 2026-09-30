import { useEffect, useState } from "react";
import { ProfissionaisPage } from "./pages/ProfissionaisPage";
import { ClientesPage } from "./pages/ClientesPage";
import { ServicosPage } from "./pages/ServicosPage";
import { ProdutosPage } from "./pages/ProdutosPage";
import { ConfigComissoesPage } from "./pages/ConfigComissoesPage";
import { ComandasPage } from "./pages/ComandasPage";
import { DashboardPage } from "./pages/DashboardPage";
import { RelatorioEstoquePage } from "./pages/RelatorioEstoquePage";
import { RelatorioCaixaPage } from "./pages/RelatorioCaixaPage";
import { RelatorioComissaoPage } from "./pages/RelatorioComissaoPage";
import { LoginPage } from "./pages/LoginPage";
import { supabase } from "./lib/supabaseClient";
import { getMeuPerfil } from "./lib/api/usuarios";
import type { LeituraPerfil } from "./lib/api/usuarios";
import { ProvedorPerfil } from "./lib/perfil";
import { COLOR_PRIMARY } from "./ui/tokens/colors";

// Ordem das abas: Fase 1 (cadastros) → Fase 2 (comandas/financeiro) → Fase 3 (dashboard/estoque)
const ABAS = [
  { id: "dashboard", label: "Dashboard", Component: DashboardPage },
  { id: "profissionais", label: "Profissionais", Component: ProfissionaisPage },
  { id: "clientes", label: "Clientes", Component: ClientesPage },
  { id: "servicos", label: "Serviços", Component: ServicosPage },
  { id: "produtos", label: "Produtos", Component: ProdutosPage },
  { id: "comissoes", label: "Configurar Comissão", Component: ConfigComissoesPage },
  { id: "comandas", label: "Comandas", Component: ComandasPage },
  { id: "relatorio-estoque", label: "Relatório de Estoque", Component: RelatorioEstoquePage },
  { id: "relatorio-caixa", label: "Fechamento de Caixa", Component: RelatorioCaixaPage },
  { id: "relatorio-comissao", label: "Comissão por Profissional", Component: RelatorioComissaoPage },
] as const;

function App() {
  const [autenticado, setAutenticado] = useState<boolean | null>(null);
  const [perfil, setPerfil] = useState<LeituraPerfil | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<(typeof ABAS)[number]["id"]>("dashboard");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAutenticado(!!data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAutenticado(!!session);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // O perfil e buscado junto com a sessao e guardado aqui, e nao em cada tela: sao
  // 19 acoes de escrita em 6 telas, e 6 leituras da MESMA linha. App ja e dono do
  // estado de autenticacao, entao e o lugar natural.
  //
  // So busca quando ha sessao, e zera ao sair - sem isso, o perfil do usuario
  // anterior ficaria na tela de login e no logout.
  useEffect(() => {
    if (!autenticado) {
      setPerfil(null);
      return;
    }
    let vivo = true;
    getMeuPerfil()
      .then((r) => {
        if (vivo) setPerfil(r);
      })
      .catch(() => {
        // getMeuPerfil ja resolve os tres desfechos sem lancar; isto cobre apenas
        // uma rejeicao inesperada, e o estado "erro" e a resposta correta: mostra as
        // acoes e deixa a RLS decidir. Ver os tres desfechos em lib/perfil.ts.
        if (vivo) setPerfil({ estado: "erro", mensagem: "perfil ilegível" });
      });
    return () => {
      vivo = false;
    };
  }, [autenticado]);

  if (autenticado === null) return <p style={{ padding: "2rem" }}>Carregando...</p>;
  if (!autenticado) return <LoginPage onLogin={() => setAutenticado(true)} />;

  const Aba = ABAS.find((a) => a.id === abaAtiva)!.Component;

  return (
    <ProvedorPerfil leitura={perfil}>
      <div style={{ fontFamily: "sans-serif", padding: "2rem" }}>
        {/* Sem tamanho inline de propósito: o título do sistema precisa ser maior que o
            título da página (1.5rem via FONT_SIZE_HEADING). A validação visual mediu
            32px contra 24px; ver a guarda em refinamento-interface-tipografia.spec.tsx. */}
        <h1>Sistema de Gestão — Salão de Beleza</h1>
        <nav style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
          {ABAS.map((a) => (
            <button
              key={a.id}
              onClick={() => setAbaAtiva(a.id)}
              aria-current={abaAtiva === a.id ? "page" : undefined}
              style={{
                fontWeight: abaAtiva === a.id ? "bold" : "normal",
                // A borda transparente nas abas inativas mantém a altura da barra
                // estável ao trocar de aba, sem adicionar indicador visual.
                borderBottom:
                  abaAtiva === a.id ? `2px solid ${COLOR_PRIMARY}` : "2px solid transparent",
              }}
            >
              {a.label}
            </button>
          ))}
          <button onClick={() => supabase.auth.signOut()} style={{ marginLeft: "auto" }}>
            Sair
          </button>
        </nav>
        <Aba />
      </div>
    </ProvedorPerfil>
  );
}

export default App;


