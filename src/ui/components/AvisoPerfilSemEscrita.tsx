// A mensagem que substitui a acao de escrita quando o perfil nao pode gravar.
//
// Um componente, nas seis telas: a frase e a mesma, e seis copias divergentes e como
// a inconsistencia comeca. Nao ha aqui nada de especifico de tabela, e por isso nao
// recebe tabela nenhuma - quem decide se a acao some e o gate, nao este texto.
//
// D-5: nomeia o perfil. Ausencia sem explicacao e indistinguivel de "isto nao existe",
// e a leitura que sobra e "esta quebrado". Dizer qual e o perfil tira essa leitura.
//
// Enquanto o perfil ainda carrega, NAO aparece nada: mostrava, a mensagem piscaria a
// cada troca de aba e pareceria aviso de erro. E quando a leitura falhou (D-3, terceiro
// desfecho), tambem nao aparece - neste caso as acoes continuam visiveis, porque a RLS
// e a autoridade e falhar fechado esconderia trabalho de quem pode.

import type { PerfilUsuario } from "../../types";

export function AvisoPerfilSemEscrita({
  perfil,
  oQue,
}: {
  perfil: PerfilUsuario;
  oQue: string;
}) {
  return (
    <p role="status">
      Seu perfil ({perfil}) não grava {oQue}. Você continua vendo os dados, mas as ações
      de escrita estão reservadas a outros perfis do salão.
    </p>
  );
}