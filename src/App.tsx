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
  const [abaAtiva, setAbaAtiva] = useState<(typeof ABAS)[number]["id"]>("dashboard");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAutenticado(!!data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAutenticado(!!session);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (autenticado === null) return <p style={{ padding: "2rem" }}>Carregando...</p>;
  if (!autenticado) return <LoginPage onLogin={() => setAutenticado(true)} />;

  const Aba = ABAS.find((a) => a.id === abaAtiva)!.Component;

  return (
    <div style={{ fontFamily: "sans-serif", padding: "2rem" }}>
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
  );
}

export default App;


