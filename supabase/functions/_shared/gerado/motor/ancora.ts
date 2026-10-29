// GERADO por scripts/sincronizar-funcoes.mjs a partir de packages/motor-adaptacao/src/ancora.ts — NÃO EDITE.
/**
 * P2.2 / HU-S.02 / D-03 — `interesseAncora` não é calculado por `regras.ts`
 * (é texto livre). Ele vem do que alguém ESCREVEU como tema na `evidencia` de uma
 * observação `INTERESSE_MANIFESTO` com escala `AMPLIADA` — nunca é presumido.
 *
 * Regras (D-53: interesse muda; o material não insiste num tema antigo):
 * - vale o ciclo MAIS RECENTE que tem observação de interesse;
 * - nele, um tema escrito ("Dinossauros!" → "dinossauros") vira a âncora;
 * - sem tema escrito e com "menos interesse que antes" (`REDUZIDA`) → `null`
 *   (tirar a personalização é restringir: imediato, como na RN03);
 * - sem observação de interesse, ou só "igual ao ciclo anterior" → mantém o anterior.
 */
import type { ObservacaoHistorica } from "./tipos.ts";

export function normalizarAncora(evidencia: string): string | null {
  const limpa = evidencia
    .trim()
    .toLowerCase()
    .replace(/[.!?,;:…]+$/u, "")
    .replace(/\s+/gu, " ")
    .trim();
  return limpa.length > 0 ? limpa : null;
}

export function derivarInteresseAncora(observacoes: ObservacaoHistorica[], anterior: string | null): string | null {
  const deInteresse = observacoes.filter((o) => o.dimensao === "INTERESSE_MANIFESTO");
  if (deInteresse.length === 0) return anterior;
  const cicloRecente = Math.max(...deInteresse.map((o) => o.numeroCiclo));
  const doCiclo = deInteresse.filter((o) => o.numeroCiclo === cicloRecente);

  const temas = doCiclo
    .filter((o) => o.valorEscala === "AMPLIADA" && typeof o.evidencia === "string")
    .map((o) => normalizarAncora(o.evidencia as string))
    .filter((t): t is string => t !== null);
  if (temas.length > 0) return temas[temas.length - 1] ?? anterior;
  if (doCiclo.some((o) => o.valorEscala === "REDUZIDA")) return null;
  return anterior;
}
