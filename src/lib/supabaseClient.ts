import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY precisam estar definidas (.env)."
  );
}

// Cliente único, reaproveitado em toda a aplicação. Nunca instancie um
// segundo client com service_role aqui — isso pertenceria a um ambiente
// de servidor, que este projeto não tem (Seção 22 do plano).
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
