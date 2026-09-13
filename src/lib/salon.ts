import { supabase } from "./supabaseClient";

// O salon_id do usuário logado fica em app_metadata do JWT (Seção 19 do
// plano) — não é editável pelo próprio usuário, só por uma função
// administrativa no backend. Aqui só lemos o valor já presente na sessão.
//
// Necessário em todo INSERT: RLS decide o que o usuário PODE gravar
// (via WITH CHECK), mas não preenche o campo salon_id sozinho — isso
// precisa vir explícito na chamada.
export async function getCurrentSalonId(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const salonId = session?.user?.app_metadata?.salon_id as string | undefined;

  if (!salonId) {
    throw new Error(
      "Usuário sem salon_id em app_metadata — verifique o cadastro do usuário/salão antes de continuar."
    );
  }

  return salonId;
}
