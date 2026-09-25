import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Button } from "../ui/components/Button";
import { SPACING_MD } from "../ui/tokens/spacing";
import { FONT_HEADING, FONT_SIZE_HEADING } from "../ui/tokens/typography";

export function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setCarregando(false);

    if (error) {
      setErro(error.message);
      return;
    }
    onLogin();
  }

  return (
    <main style={{ fontFamily: "sans-serif", padding: "2rem", maxWidth: 320 }}>
      <h1 style={{ fontFamily: FONT_HEADING, fontSize: FONT_SIZE_HEADING }}>Login</h1>
      <section aria-label="Orientação de primeiro acesso" style={{ marginBottom: SPACING_MD }}>
        <p style={{ fontSize: 13, color: "#666" }}>
          Crie o primeiro usuário manualmente no dashboard do Supabase (Authentication → Users) e defina{" "}
          <code>app_metadata.salon_id</code> apontando para uma linha em <code>saloes</code> — não existe
          tela de cadastro de usuário/salão ainda, isso é passo manual só nesta fase inicial.
        </p>
      </section>
      <div role="group" aria-label="Formulário de login">
        <form onSubmit={handleLogin} style={{ display: "grid", gap: 8 }}>
          <label htmlFor="login-email">E-mail</label>
          <input
            id="login-email"
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <label htmlFor="login-senha">Senha</label>
          <input
            id="login-senha"
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
          <Button type="submit" variant="primary" disabled={carregando}>
            {carregando ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </div>
      {erro && <p style={{ color: "crimson" }}>{erro}</p>}
    </main>
  );
}
