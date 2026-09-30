import { createContext, createElement, useContext } from "react";
import type { ReactNode } from "react";
import type { PerfilUsuario } from "../types";
import type { LeituraPerfil } from "./api/usuarios";

// ---------------------------------------------------------------------------
// A MATRIZ DE ESCRITA - espelho das policies do banco
// ---------------------------------------------------------------------------
// Medida em 2026-09-30, direto de pg_policies. A chave e o NOME DA TABELA de
// proposito: e o vocabulario da propria RLS, para que quem leia `clientes_write`
// no banco leia `clientes` aqui. Correspondencia nome a nome e o que torna a
// divergencia visivel na revisao.
//
// policy no banco                        tabela aqui
// ------------------------------------    ----------------------------------
// clientes_write                         clientes
// produtos_write                         produtos
// profissionais_write                    profissionais
// servicos_write                         servicos
// config_comissoes_write                 config_comissoes
// comandas_write / comanda_itens_write   comandas, comanda_itens
// pagamentos_write                       pagamentos
// movimentacoes_estoque_write            movimentacoes_estoque
// usuarios_write_admin                   usuarios
//
// As tabelas que nao aparecem nao tem policy de escrita medida, ou nao tem tela:
// ajustes_comissao, config_taxas, despesas, fechamentos_comissao, motivos_desconto.
// Nenhuma delas tem acao de escrita na interface, entao nao ha o que esconder.
//
// supabase/tests/019_gate_perfil_compate_com_rls.sql le pg_policies e compara com
// esta tabela. O BANCO e a autoridade; o teste e o que trava a copia. Sem ele, esta
// matriz pode divergir em silencio - que e o modo de falha classico de gate de
// permissao, e silencioso, que e o pior tipo.
// ---------------------------------------------------------------------------
export const MATRIZ_ESCRITA: Record<string, readonly PerfilUsuario[]> = {
  clientes: ["ADMIN", "GERENTE"],
  produtos: ["ADMIN", "GERENTE"],
  profissionais: ["ADMIN", "GERENTE"],
  servicos: ["ADMIN", "GERENTE"],
  config_comissoes: ["ADMIN", "GERENTE"],
  comandas: ["ADMIN", "GERENTE", "RECEPCAO"],
  comanda_itens: ["ADMIN", "GERENTE", "RECEPCAO"],
  pagamentos: ["ADMIN", "GERENTE", "RECEPCAO"],
  movimentacoes_estoque: ["ADMIN", "GERENTE", "RECEPCAO"],
  usuarios: ["ADMIN"],
};

// ---------------------------------------------------------------------------
// OS TRES DESFECHOS (D-3)
// ---------------------------------------------------------------------------
// O caso contra-intuitivo e o terceiro, e vale a pena ler antes de "corrigir":
//
//   carregado   -> o gate vale para aquele perfil
//   sem_linha   -> nenhuma escrita. Medido: e o que a RLS ja faz, nao uma escolha
//                  mais dura. Um autenticado sem linha em `usuarios` tem
//                  current_perfil() nulo, e toda policy de escrita compara com
//                  ANY(...). Ele nao grava em nada.
//   erro        -> MOSTRA as acoes. Falhar fechado aqui criaria um modo de falha
//                  novo: uma falha de rede esconderia a "Abrir comanda" de quem
//                  pode abrir, e a pessoa ficaria sem trabalho por causa de um
//                  timeout. Nao e buraco de seguranca - a autoridade continua
//                  sendo a RLS, e a recusa agora chega como mensagem de dominio
//                  em vez de sumir.
//
// Falhar fechado parece mais seguro e e pior aqui: aqui a RLS ja segura, o gate e
// so para nao oferecer um clique que vai falhar.
// ---------------------------------------------------------------------------
export function deveMostrarEscrita(leitura: LeituraPerfil | null): boolean {
  if (leitura === null) return true; // ainda carregando
  return leitura.estado !== "sem_linha";
}

export interface PerfilContextoValor {
  leitura: LeituraPerfil | null;
  /** Grava naquela tabela, conforme a matriz acima. */
  pode: (tabela: string) => boolean;
}

const PADRAO: PerfilContextoValor = {
  leitura: null,
  // Enquanto o perfil nao chegou, mostra. Veja os tres desfechos acima.
  pode: () => true,
};

export const ContextoPerfil = createContext<PerfilContextoValor>(PADRAO);

export function ProvedorPerfil({
  leitura,
  children,
}: {
  leitura: LeituraPerfil | null;
  children: ReactNode;
}) {
  return createElement(
    ContextoPerfil.Provider,
    { value: { leitura, pode: montaPode(leitura) } },
    children
  );
}

function montaPode(leitura: LeituraPerfil | null): (tabela: string) => boolean {
  // Os tres desfechos sao resolvidos AQUI, uma vez, e nao a cada chamada: estreitar
  // o tipo da union dentro de um closure nao e estavel para o TypeScript, e alem disso
  // a decisao nao muda enquanto o perfil nao muda.
  if (leitura === null || leitura.estado === "erro") return () => true;
  if (leitura.estado === "sem_linha") return () => false;

  const { perfil } = leitura;
  return (tabela: string) => {
    const permitidos = MATRIZ_ESCRITA[tabela];
    // Tabela fora da matriz nao tem escrita medida; tratar como negada faz a
    // ausencia de um cadastro aparecer como bug de interface.
    if (!permitidos) return true;
    return permitidos.includes(perfil);
  };
}

export function usePerfil(): PerfilContextoValor {
  return useContext(ContextoPerfil);
}