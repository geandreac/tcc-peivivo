/**
 * P2.2 / HU-S.02 / D-03 — `interesseAncora` não é calculado por `regras.ts`
 * (é texto livre). Ele é derivado da `evidencia` da última observação
 * `INTERESSE_MANIFESTO` com escala `AMPLIADA`.
 *
 * Regras:
 * - "Dinossauros!" → "dinossauros" (trim, minúsculas, sem pontuação final).
 * - Sem observação elegível → mantém o valor anterior.
 * - Nunca volta a `null` se já houve um valor.
 */
import type { ObservacaoHistorica } from "./tipos";

export function normalizarAncora(evidencia: string): string | null {
  const limpa = evidencia
    .trim()
    .toLowerCase()
    .replace(/[.!?,;:…]+$/u, "")
    .replace(/\s+/gu, " ")
    .trim();
  return limpa.length > 0 ? limpa : null;
}

export function derivarInteresseAncora(
  observacoes: ObservacaoHistorica[],
  anterior: string | null
): string | null {
  const elegiveis = observacoes
    .filter(
      (o) =>
        o.dimensao === "INTERESSE_MANIFESTO" &&
        o.valorEscala === "AMPLIADA" &&
        typeof o.evidencia === "string" &&
        o.evidencia.trim().length > 0
    )
    .sort((a, b) => a.numeroCiclo - b.numeroCiclo);

  const ultima = elegiveis[elegiveis.length - 1];
  if (!ultima) return anterior;
  return normalizarAncora(ultima.evidencia as string) ?? anterior;
}
