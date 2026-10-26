/** Estado da sessão e operações que mais de um agregado usa. `api` é ligada depois que o objeto final existe. */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CorpoErro } from "@pei-vivo/contratos";
import type { PeiVivoApi } from "../api";
import { ErroApi, type CodigoErro } from "../erros";
import type { Papel, Usuario, VersaoPerfil, Vinculo } from "../tipos";
import { exec, type Linha } from "./infra";
import { COL_VERSAO, COL_VINCULO, paraVersao, paraVinculo } from "./mapeadores";

export interface PerfilSessao {
  id: string;
  nome: string;
  email: string;
  escolaCoordenada: string | null;
  exigeSegundoFator: boolean;
}

export const paraUsuario = (p: PerfilSessao): Usuario => ({
  id: p.id,
  nome: p.nome,
  email: p.email,
  papelInstitucional: p.escolaCoordenada ? "COORDENACAO" : null,
  escolaId: p.escolaCoordenada,
  exigeSegundoFator: p.exigeSegundoFator,
});

export interface Contexto {
  sb: SupabaseClient;
  /** O objeto PeiVivoApi completo (para um agregado chamar outro, ex.: exportar dados). */
  api: PeiVivoApi;
  usuarioAtual(): Usuario | null;
  definirPerfil(p: PerfilSessao | null): void;
  carregarPerfil(): Promise<PerfilSessao | null>;
  eu(): PerfilSessao;
  nivel(): Promise<{ atual: "aal1" | "aal2"; temFatorCadastrado: boolean }>;
  funcao<T>(nome: string, corpo: Record<string, unknown>): Promise<T>;
  meuPapel(estudanteId: string): Promise<Papel | null>;
  obterVersao(id: string): Promise<VersaoPerfil>;
  obterVinculo(id: string): Promise<Vinculo>;
}

export function criarContexto(sb: SupabaseClient): Contexto {
  let perfil: PerfilSessao | null = null;
  async function carregarPerfil(): Promise<PerfilSessao | null> {
    const { data } = await sb.auth.getSession();
    if (!data.session) {
      perfil = null;
      return null;
    }
    perfil = await exec(sb.rpc("fn_meu_perfil"));
    return perfil;
  }

  function eu(): PerfilSessao {
    if (!perfil) throw new ErroApi("NAO_AUTENTICADO", "Entre para continuar.");
    return perfil;
  }

  async function nivel(): Promise<{ atual: "aal1" | "aal2"; temFatorCadastrado: boolean }> {
    const [{ data: aal }, { data: fatores }] = await Promise.all([sb.auth.mfa.getAuthenticatorAssuranceLevel(), sb.auth.mfa.listFactors()]);
    return { atual: aal?.currentLevel === "aal2" ? "aal2" : "aal1", temFatorCadastrado: (fatores?.totp ?? []).some((f) => f.status === "verified") };
  }

  /** Chama uma Edge Function e traduz o corpo de erro padronizado ({ erro: { codigo, mensagem } }). */
  async function funcao<T>(nome: string, corpo: Record<string, unknown>): Promise<T> {
    const { data, error } = await sb.functions.invoke<T>(nome, { body: corpo });
    if (!error) return data as T;
    const resposta = (error as { context?: Response }).context;
    if (resposta && typeof resposta.json === "function") {
      // 401 vem do gateway (JWT expirado), com corpo próprio, sem { erro }
      if (resposta.status === 401) throw new ErroApi("NAO_AUTENTICADO", "Sua sessão expirou. Entre novamente.");
      try {
        const { erro } = (await resposta.json()) as CorpoErro;
        const mapa: Record<string, CodigoErro> = { NEGADO: "NEGADO", CONFLITO: "CONFLITO", VALIDACAO: "VALIDACAO", NAO_AUTENTICADO: "NAO_AUTENTICADO", INTERNO: "REDE" };
        throw new ErroApi(mapa[erro.codigo] ?? "REDE", erro.mensagem);
      } catch (e) {
        if (e instanceof ErroApi) throw e;
      }
    }
    throw new ErroApi("REDE", "Não foi possível falar com o servidor.");
  }

  async function meuPapel(estudanteId: string): Promise<Papel | null> {
    const papel = await exec<Papel | null>(sb.rpc("fn_meu_papel", { p_estudante: estudanteId }));
    if (papel) return papel;
    const p = perfil;
    if (!p?.escolaCoordenada) return null;
    const e = await exec<Linha | null>(sb.from("estudantes").select("escola_id").eq("id", estudanteId).maybeSingle());
    return e && e.escola_id === p.escolaCoordenada ? "COORDENACAO" : null;
  }

  async function obterVersao(id: string): Promise<VersaoPerfil> {
    return paraVersao(await exec<Linha>(sb.from("versoes_perfil").select(COL_VERSAO).eq("id", id).single()));
  }
  async function obterVinculo(id: string): Promise<Vinculo> {
    return paraVinculo(await exec<Linha>(sb.from("vinculos_usuario_estudante").select(COL_VINCULO).eq("id", id).single()));
  }

  const c: Contexto = {
    sb,
    api: undefined as unknown as PeiVivoApi, // ligado por criarSupabaseApi
    usuarioAtual: () => (perfil ? paraUsuario(perfil) : null),
    definirPerfil: (p) => {
      perfil = p;
    },
    carregarPerfil,
    eu,
    nivel,
    funcao,
    meuPapel,
    obterVersao,
    obterVinculo,
  };
  return c;
}
