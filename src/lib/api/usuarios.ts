import { supabase } from "../supabaseClient";
import type { PerfilUsuario } from "../../types";

// O perfil de quem esta logado mora na tabela `usuarios`, e a interface precisa
// dele para nao oferecer escrita que a RLS vai recusar.
//
// Medido em 2026-09-30: a policy `usuarios_select_own` (auth_user_id = auth.uid())
// devolve exatamente a propria linha, e um RECEPCAO enxerga 1 linha (a dele) e 0 de
// outros. A consulta nao serve para enumerar usuarios - a RLS a escopa a uma linha.
//
// Distingue tres desfechos, e a distincao e o que decide o comportamento do gate:
//   - linha lida          -> ha perfil, e ele vale
//   - nenhuma linha       -> orfao de cadastro; a RLS ja nega toda escrita
//   - erro na consulta    -> NAO SEI o perfil; ver `deveMostrarEscrita` no modulo
//
// Por isso o retorno carrega os tres casos em vez de lancar ou devolver null: quem
// chama precisa poder distinguir "nao grava" de "nao sei".
export type LeituraPerfil =
  | { estado: "carregado"; perfil: PerfilUsuario }
  | { estado: "sem_linha" }
  | { estado: "erro"; mensagem: string };

export async function getMeuPerfil(): Promise<LeituraPerfil> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const authUserId = session?.user?.id;
  if (!authUserId) return { estado: "sem_linha" };

  const { data, error } = await supabase
    .from("usuarios")
    .select("perfil")
    .eq("auth_user_id", authUserId)
    .limit(1);

  if (error) return { estado: "erro", mensagem: error.message };

  const linha = (data ?? [])[0];
  // Sem linha e o orfao de cadastro: medido, `current_perfil()` devolve nulo, e toda
  // policy de escrita compara com ANY(...), entao ele nao grava em NADA.
  if (!linha) return { estado: "sem_linha" };

  return { estado: "carregado", perfil: linha.perfil as PerfilUsuario };
}