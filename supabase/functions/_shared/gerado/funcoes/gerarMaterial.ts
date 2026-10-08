// GERADO por scripts/sincronizar-funcoes.mjs a partir de packages/funcoes/src/gerarMaterial.ts — NÃO EDITE.
/**
 * Caso de uso da Edge Function `gerar-material` (F8, D-37), na ordem do
 * Diagrama de Sequência: (2) valida o corpo → (3–4) prepara com o JWT do
 * docente (o banco decide RN01/RN05/RN06/RN08) → (5–6) camada de regras →
 * (7–8) IA opcional, nunca bloqueante → (9–10) grava o rascunho com service
 * role (o banco revalida) → (11) responde. Aprovar é outro passo (RN04).
 */
import {
  EntradaGerarMaterialSchema,
  ParametrosAdaptacaoSchema,
  TIMEOUT_IA_MS,
  type OrigemMaterial,
  type RespostaGerarMaterial,
  type SaidaIA,
} from "../contratos/index.ts";
import { adaptar, type ParametrosAdaptacao, type TextoAdaptado } from "../motor/index.ts";
import { ErroFuncao, deErroBanco } from "./erros.ts";
import { aplicarIA, iaDesligada, type ProvedorIA } from "./ia.ts";

export interface Preparo {
  docenteId: string;
  estudanteId: string;
  versaoId: string;
  parametros: ParametrosAdaptacao;
  iaPermitida: boolean;
  revisaoEmAndamento: boolean;
}

export interface MaterialParaRegistrar {
  docenteId: string;
  estudanteId: string;
  versaoId: string;
  titulo: string;
  textoOriginal: string;
  textoAdaptado: TextoAdaptado & { glossario?: SaidaIA["glossario"] };
  hash: string;
  iaAplicada: boolean;
}

export interface PortasGerarMaterial {
  /** `fn_preparar_geracao` com o JWT do docente. */
  preparar(estudanteId: string): Promise<Preparo>;
  /** `fn_registrar_material` com service role. */
  registrar(material: MaterialParaRegistrar): Promise<{ materialId: string; emCache: boolean }>;
  ia?: ProvedorIA;
  /** Chave global (variável de ambiente da Edge Function). Desligada por padrão. */
  iaHabilitada?: boolean;
  timeoutIaMs?: number;
  agora?: () => number;
}

export const AVISO_IA_INDISPONIVEL = "A assistência de IA não respondeu agora; o material foi adaptado só pelas regras.";
export const AVISO_REVISAO = "Há uma revisão do perfil em andamento; usamos o perfil vigente.";

/** SHA-256 em hex (Web Crypto: existe no Node 20+ e no Deno). Chave do cache. */
export async function hashTexto(texto: string): Promise<string> {
  const bytes = new TextEncoder().encode(texto);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function gerarMaterial(corpo: unknown, portas: PortasGerarMaterial): Promise<RespostaGerarMaterial> {
  const agora = portas.agora ?? (() => Date.now());
  const inicio = agora();

  const entrada = EntradaGerarMaterialSchema.safeParse(corpo);
  if (!entrada.success) throw new ErroFuncao(400, "VALIDACAO", entrada.error.issues[0]?.message ?? "Dados inválidos.");
  const { estudanteId, titulo, texto } = entrada.data;

  let preparo: Preparo;
  try {
    preparo = await portas.preparar(estudanteId);
  } catch (e) {
    throw deErroBanco(e);
  }
  const parametros = ParametrosAdaptacaoSchema.safeParse(preparo.parametros);
  if (!parametros.success) throw new ErroFuncao(500, "INTERNO", "O perfil vigente está fora do contrato.");

  const avisos: string[] = [];
  if (preparo.revisaoEmAndamento) avisos.push(AVISO_REVISAO);

  // RN06: IA só com profissional ativo e autorizado E com a chave global ligada.
  let textoBase = texto;
  let glossario: SaidaIA["glossario"] | undefined;
  let origem: OrigemMaterial = "REGRAS";
  if (preparo.iaPermitida && portas.iaHabilitada) {
    const r = await aplicarIA(portas.ia ?? iaDesligada, { texto, parametros: parametros.data }, portas.timeoutIaMs ?? TIMEOUT_IA_MS);
    if (r.ok) {
      textoBase = r.saida.textoSimplificado;
      glossario = r.saida.glossario;
      origem = "REGRAS_E_IA";
    } else {
      avisos.push(AVISO_IA_INDISPONIVEL);
    }
  }

  const adaptado = adaptar(textoBase, parametros.data);
  try {
    const { materialId, emCache } = await portas.registrar({
      docenteId: preparo.docenteId, // do banco (auth.uid()), nunca do corpo
      estudanteId,
      versaoId: preparo.versaoId,
      titulo,
      textoOriginal: texto,
      textoAdaptado: glossario ? { ...adaptado, glossario } : adaptado,
      hash: await hashTexto(texto),
      iaAplicada: origem === "REGRAS_E_IA",
    });
    return { materialId, emCache, origem, avisos, duracaoMs: Math.round(agora() - inicio) };
  } catch (e) {
    throw deErroBanco(e);
  }
}
