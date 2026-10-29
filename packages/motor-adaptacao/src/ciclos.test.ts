import { describe, it, expect } from "vitest";
import { calcularCiclosConsecutivos, observacoesDoUltimoCiclo } from "./ciclos";
import { derivarInteresseAncora, normalizarAncora } from "./ancora";
import type { ObservacaoHistorica } from "./tipos";

const obs = (
  numeroCiclo: number,
  dimensao: ObservacaoHistorica["dimensao"],
  valorEscala: ObservacaoHistorica["valorEscala"],
  evidencia?: string,
): ObservacaoHistorica => ({ numeroCiclo, dimensao, valorEscala, evidencia: evidencia ?? null });

describe("P2.1 — calcularCiclosConsecutivos (HU-S.01)", () => {
  it("AMPLIADA × 3 ciclos → 3", () => {
    const h = [obs(1, "AUTONOMIA_LEXICAL", "AMPLIADA"), obs(2, "AUTONOMIA_LEXICAL", "AMPLIADA"), obs(3, "AUTONOMIA_LEXICAL", "AMPLIADA")];
    expect(calcularCiclosConsecutivos(h).get("AUTONOMIA_LEXICAL")).toBe(3);
  });

  it("AMPLIADA, ESTAVEL, AMPLIADA → 1 (a série foi interrompida)", () => {
    const h = [obs(1, "AUTONOMIA_LEXICAL", "AMPLIADA"), obs(2, "AUTONOMIA_LEXICAL", "ESTAVEL"), obs(3, "AUTONOMIA_LEXICAL", "AMPLIADA")];
    expect(calcularCiclosConsecutivos(h).get("AUTONOMIA_LEXICAL")).toBe(1);
  });

  it("dimensão ausente no último ciclo → 0", () => {
    const h = [obs(1, "FADIGA_TAREFA", "AMPLIADA"), obs(2, "FADIGA_TAREFA", "AMPLIADA"), obs(3, "ATENCAO_SUSTENTADA", "REDUZIDA")];
    const r = calcularCiclosConsecutivos(h);
    expect(r.get("FADIGA_TAREFA")).toBe(0);
    expect(r.get("ATENCAO_SUSTENTADA")).toBe(1);
  });

  it("histórico vazio → mapa vazio", () => {
    expect(calcularCiclosConsecutivos([]).size).toBe(0);
  });

  it("observacoesDoUltimoCiclo entrega Observacao[] pronta para aplicarCiclo", () => {
    const h = [obs(2, "AUTONOMIA_LEXICAL", "AMPLIADA"), obs(3, "AUTONOMIA_LEXICAL", "AMPLIADA"), obs(3, "SENSIBILIDADE_VISUAL", "AMPLIADA")];
    const saida = observacoesDoUltimoCiclo(h);
    expect(saida).toEqual([
      { dimensao: "AUTONOMIA_LEXICAL", valorEscala: "AMPLIADA", ciclosConsecutivos: 2 },
      { dimensao: "SENSIBILIDADE_VISUAL", valorEscala: "AMPLIADA", ciclosConsecutivos: 1 },
    ]);
    expect(observacoesDoUltimoCiclo([])).toEqual([]);
  });
});

describe("P2.2 — derivarInteresseAncora (HU-S.02, D-03)", () => {
  it('"Dinossauros!" → "dinossauros"', () => {
    const h = [obs(3, "INTERESSE_MANIFESTO", "AMPLIADA", "  Dinossauros!  ")];
    expect(derivarInteresseAncora(h, null)).toBe("dinossauros");
  });

  it("sem observação elegível → mantém o anterior", () => {
    const h = [obs(3, "INTERESSE_MANIFESTO", "ESTAVEL", "nada de novo")];
    expect(derivarInteresseAncora(h, "dinossauros")).toBe("dinossauros");
    expect(derivarInteresseAncora([], "dinossauros")).toBe("dinossauros");
  });

  it("evidência vazia não vira tema nem apaga o anterior", () => {
    const h = [obs(4, "INTERESSE_MANIFESTO", "AMPLIADA", "   ")];
    expect(derivarInteresseAncora(h, "dinossauros")).toBe("dinossauros");
  });

  it("usa a observação do ciclo mais recente", () => {
    const h = [obs(2, "INTERESSE_MANIFESTO", "AMPLIADA", "Carros"), obs(4, "INTERESSE_MANIFESTO", "AMPLIADA", "Espaço e planetas.")];
    expect(derivarInteresseAncora(h, null)).toBe("espaço e planetas");
  });

  // D-53: interesse muda; o material não insiste num tema que ninguém observa mais
  it("menos interesse no ciclo mais recente, sem tema escrito → sem âncora", () => {
    const h = [obs(2, "INTERESSE_MANIFESTO", "AMPLIADA", "Dinossauros"), obs(3, "INTERESSE_MANIFESTO", "REDUZIDA")];
    expect(derivarInteresseAncora(h, "dinossauros")).toBeNull();
  });

  it("um tema novo escrito depois de 'menos interesse' volta a valer", () => {
    const h = [obs(3, "INTERESSE_MANIFESTO", "REDUZIDA"), obs(4, "INTERESSE_MANIFESTO", "AMPLIADA", "Trens")];
    expect(derivarInteresseAncora(h, null)).toBe("trens");
  });

  it("no mesmo ciclo, o tema escrito por alguém vale mais que 'menos interesse' sem tema", () => {
    const h = [obs(4, "INTERESSE_MANIFESTO", "REDUZIDA"), obs(4, "INTERESSE_MANIFESTO", "AMPLIADA", "Música")];
    expect(derivarInteresseAncora(h, "dinossauros")).toBe("música");
  });

  it("nunca presume tema: sem nada escrito, nada vira âncora", () => {
    const h = [obs(1, "INTERESSE_MANIFESTO", "AMPLIADA"), obs(1, "ATENCAO_SUSTENTADA", "AMPLIADA", "Gosta de futebol")];
    expect(derivarInteresseAncora(h, null)).toBeNull();
  });

  it("normalizarAncora devolve null para string só de pontuação", () => {
    expect(normalizarAncora("!!!")).toBeNull();
  });
});
