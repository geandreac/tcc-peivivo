import { describe, it, expect } from "vitest";
import {
  adaptar,
  dividirEmEtapas,
  ehEnunciadoComposto,
  quebrarEmLinhas,
  textoDoAdaptado,
  CARACTERES_POR_LINHA,
} from "./adaptador";
import { PARAMETROS_PADRAO } from "./tipos";
import type { ParametrosAdaptacao } from "./tipos";

const TEXTO_CICLO_DA_AGUA = `O ciclo da água é o movimento contínuo da água na Terra. A água dos rios, lagos e oceanos evapora com o calor do sol e sobe para o céu em forma de vapor. Lá em cima, o vapor esfria e vira pequenas gotinhas, formando as nuvens. Quando as gotinhas ficam pesadas, caem como chuva, neve ou granizo. Essa água volta para os rios, para o solo e para os oceanos, e o ciclo recomeça.

Leia o texto acima e depois responda às perguntas com suas palavras.

Circule as palavras que você não conhece, em seguida escreva uma frase com cada uma delas.

Observe a imagem e a legenda.`;

const PERFIL_MIGUEL: ParametrosAdaptacao = {
  maxLinhasPorBloco: 4,
  nivelVocabulario: "BASICO",
  interesseAncora: "dinossauros",
  formatoEnunciado: "ETAPA_UNICA",
  contrasteMinimo: 7,
  blocosPorMaterial: 8,
};

describe("P2.4 — adaptar (RF09, D-10)", () => {
  it("é determinística: mesma entrada → mesma saída", () => {
    const a = adaptar(TEXTO_CICLO_DA_AGUA, PERFIL_MIGUEL);
    const b = adaptar(TEXTO_CICLO_DA_AGUA, PERFIL_MIGUEL);
    expect(a).toEqual(b);
  });

  it("nenhum bloco excede maxLinhasPorBloco e nenhuma linha excede ~60 caracteres", () => {
    const r = adaptar(TEXTO_CICLO_DA_AGUA, PERFIL_MIGUEL);
    for (const bloco of [...r.blocos, ...r.blocosExcedentes]) {
      expect(bloco.linhas.length).toBeLessThanOrEqual(PERFIL_MIGUEL.maxLinhasPorBloco);
      for (const linha of bloco.linhas) {
        // linhas de etapa ganham prefixo "n. " — tolerância de 4 caracteres
        expect(linha.length).toBeLessThanOrEqual(CARACTERES_POR_LINHA + 4);
      }
    }
  });

  it("limita a blocosPorMaterial e preserva o excedente (nada se perde)", () => {
    const r = adaptar(TEXTO_CICLO_DA_AGUA, { ...PERFIL_MIGUEL, blocosPorMaterial: 2 });
    expect(r.blocos.length).toBe(2);
    expect(r.blocosExcedentes.length).toBeGreaterThan(0);
    const completo = adaptar(TEXTO_CICLO_DA_AGUA, PERFIL_MIGUEL);
    expect(textoDoAdaptado(r)).toBe(textoDoAdaptado(completo));
  });

  it("texto original é recuperável por concatenação das linhas (sem enunciados divididos)", () => {
    const r = adaptar(TEXTO_CICLO_DA_AGUA, { ...PARAMETROS_PADRAO, formatoEnunciado: "MULTIPLAS_ETAPAS" });
    const palavrasOriginais = TEXTO_CICLO_DA_AGUA.split(/\s+/u).filter(Boolean);
    const palavrasSaida = textoDoAdaptado(r).split(/\s+/u).filter(Boolean);
    expect(palavrasSaida).toEqual(palavrasOriginais);
    expect(r.enunciados).toEqual([]);
  });

  it("ETAPA_UNICA nunca gera enunciado com 'e depois' / 'em seguida'", () => {
    const r = adaptar(TEXTO_CICLO_DA_AGUA, PERFIL_MIGUEL);
    expect(r.enunciados.length).toBe(2);
    for (const e of r.enunciados) {
      for (const etapa of e.etapas) {
        expect(etapa.toLowerCase()).not.toMatch(/\be depois\b|\bem seguida\b/u);
      }
    }
    expect(r.enunciados[0]!.etapas).toEqual([
      "Leia o texto acima.",
      "Responda às perguntas com suas palavras.",
    ]);
    expect(r.enunciados[1]!.etapas).toEqual([
      "Circule as palavras que você não conhece.",
      "Escreva uma frase com cada uma delas.",
    ]);
  });

  it("não divide 'Observe a imagem e a legenda' (o 'e' não introduz outro comando)", () => {
    expect(ehEnunciadoComposto("Observe a imagem e a legenda.")).toBe(false);
    expect(dividirEmEtapas("Leia o texto, circule as palavras difíceis e escreva uma frase.")).toEqual([
      "Leia o texto.",
      "Circule as palavras difíceis.",
      "Escreva uma frase.",
    ]);
  });

  it("MULTIPLAS_ETAPAS mantém o enunciado composto intacto", () => {
    const r = adaptar("Leia o texto e depois responda.", { ...PARAMETROS_PADRAO, formatoEnunciado: "MULTIPLAS_ETAPAS" });
    expect(r.enunciados).toEqual([]);
    expect(r.blocos[0]!.linhas[0]).toBe("Leia o texto e depois responda.");
  });

  it("quebrarEmLinhas não corta palavras e respeita a largura", () => {
    const linhas = quebrarEmLinhas("a ".repeat(100).trim(), 10);
    for (const l of linhas) expect(l.length).toBeLessThanOrEqual(10);
    const linhasLongas = quebrarEmLinhas("palavramuitomaiorqueolimite curta", 10);
    expect(linhasLongas).toEqual(["palavramuitomaiorqueolimite", "curta"]);
  });

  it("texto vazio → sem blocos", () => {
    const r = adaptar("   \n\n  ", PERFIL_MIGUEL);
    expect(r.blocos).toEqual([]);
    expect(r.parametros).toEqual(PERFIL_MIGUEL);
  });
});
