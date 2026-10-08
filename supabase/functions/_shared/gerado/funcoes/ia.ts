// GERADO por scripts/sincronizar-funcoes.mjs a partir de packages/funcoes/src/ia.ts — NÃO EDITE.
/**
 * Camada de IA (RF10, HU-S.05, D-39). Desligada na trilha mínima.
 *
 * Regras de segurança (prompt §9, docs/seguranca-e-privacidade.md):
 * - O texto colado pelo docente é DADO, não instrução: o provedor recebe só
 *   `{ texto, parametros }` — nunca nome, idade, turma ou id do estudante.
 * - A saída é NÃO CONFIÁVEL: só é usada se passar em `SaidaIASchema`.
 * - Falha, demora ou saída inválida → só a camada de regras, com aviso (RNF08).
 * - Nada que a IA produz é publicado sem aprovação do docente (RN04).
 */
import { SaidaIASchema, type SaidaIA } from "../contratos/index.ts";
import type { ParametrosAdaptacao } from "../motor/index.ts";

export interface EntradaIA {
  texto: string;
  parametros: ParametrosAdaptacao;
}

export interface ProvedorIA {
  readonly nome: string;
  simplificar(entrada: EntradaIA, sinal: AbortSignal): Promise<unknown>;
}

/** Implementação padrão: não chama ninguém. */
export const iaDesligada: ProvedorIA = {
  nome: "desligada",
  simplificar: async () => {
    throw new Error("IA desligada");
  },
};

export type ResultadoIA = { ok: true; saida: SaidaIA } | { ok: false; motivo: "FALHA" | "TEMPO" | "SAIDA_INVALIDA" };

export async function aplicarIA(provedor: ProvedorIA, entrada: EntradaIA, timeoutMs: number): Promise<ResultadoIA> {
  const controle = new AbortController();
  let relogio: ReturnType<typeof setTimeout> | undefined;
  const tempo = new Promise<"TEMPO">((resolve) => {
    relogio = setTimeout(() => {
      controle.abort();
      resolve("TEMPO");
    }, timeoutMs);
  });
  try {
    // Só texto e parâmetros chegam ao provedor (minimização).
    const bruto = await Promise.race([provedor.simplificar({ texto: entrada.texto, parametros: entrada.parametros }, controle.signal), tempo]);
    if (bruto === "TEMPO") return { ok: false, motivo: "TEMPO" };
    const validado = SaidaIASchema.safeParse(bruto);
    return validado.success ? { ok: true, saida: validado.data } : { ok: false, motivo: "SAIDA_INVALIDA" };
  } catch {
    return { ok: false, motivo: "FALHA" };
  } finally {
    clearTimeout(relogio);
  }
}
