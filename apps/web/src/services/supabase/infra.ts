/** Infraestrutura do modo real: SQLSTATE/PostgREST → ErroApi, execução e paginação em lotes. */
import { CODIGO_DO_SQLSTATE } from "@pei-vivo/contratos";
import type { Pagina } from "../api";
import { ErroApi } from "../erros";

export type Linha = Record<string, unknown>;

interface ErroPostgrest {
  code?: string;
  message?: string;
  status?: number;
  name?: string;
}

/** SQLSTATE / PostgREST / Auth → código estável do app (mesma tabela de `deErroBanco`). */
export function traduzirErro(e: unknown): ErroApi {
  if (e instanceof ErroApi) return e;
  const { code, message = "", status, name } = (e ?? {}) as ErroPostgrest;
  const msg = message.split("\n")[0] ?? "";
  if (name === "TypeError" || /fetch|network/iu.test(msg)) return new ErroApi("REDE", "Falha de rede.");
  const codigo = code ? CODIGO_DO_SQLSTATE[code] : undefined;
  if (codigo) return new ErroApi(codigo, msg || MENSAGEM_PADRAO[codigo]);
  if (code === "PGRST116") return new ErroApi("NAO_ENCONTRADO", "Não encontrado.");
  if (code === "PGRST301" || code === "PGRST302" || status === 401) return new ErroApi("NAO_AUTENTICADO", "Entre para continuar.");
  return new ErroApi("REDE", "Algo deu errado do nosso lado. Tente de novo em instantes.");
}

const MENSAGEM_PADRAO = {
  NEGADO: "Seu perfil não tem permissão para esta ação.",
  CONFLITO: "A situação mudou; recarregue e tente de novo.",
  VALIDACAO: "Dados inválidos.",
} as const;

export async function exec<T>(p: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  let r: { data: T | null; error: unknown };
  try {
    r = await p;
  } catch (e) {
    throw traduzirErro(e);
  }
  if (r.error) throw traduzirErro(r.error);
  return r.data as T;
}

/** `max_rows` do PostgREST (supabase/config.toml): acima disso a resposta é cortada sem erro. */
const LOTE = 1000;

/**
 * D-48: com página, um `range`; sem página, busca em lotes de `LOTE` até vir
 * menos que um lote — a lista inteira nunca é cortada em silêncio.
 * `montar` cria uma consulta nova a cada lote (o construtor do PostgREST é de uso único).
 */
export async function paginado<T>(montar: (de: number, ate: number) => PromiseLike<{ data: T[] | null; error: unknown }>, pagina?: Pagina): Promise<T[]> {
  if (pagina) {
    const de = pagina.deslocamento ?? 0;
    return exec(montar(de, de + pagina.limite - 1));
  }
  const tudo: T[] = [];
  for (let de = 0; ; de += LOTE) {
    const lote = await exec(montar(de, de + LOTE - 1));
    tudo.push(...lote);
    if (lote.length < LOTE) return tudo;
  }
}
