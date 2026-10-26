import { describe, it, expect } from "vitest";
import { apoiosDeLeitura, glossarioDoTexto, juntarGlossarios, MAX_ITENS_GLOSSARIO, pictogramaDaEtapa } from "./apoios";
import { adaptar, VERBOS_DE_COMANDO } from "./adaptador";
import { VOCABULARIO } from "./vocabulario";
import { PARAMETROS_PADRAO } from "./tipos";

const AGUA = "O ciclo da água é o movimento contínuo da água na Terra. A água evapora com o calor do sol e sobe em forma de vapor. Depois vem a precipitação.";

describe("D-43 — pictograma da etapa", () => {
  it("reconhece o verbo de comando, com numeração e no plural", () => {
    expect(pictogramaDaEtapa("1. Leia o texto acima.")).toBe("LER");
    expect(pictogramaDaEtapa("Circule as palavras.")).toBe("CIRCULAR");
    expect(pictogramaDaEtapa("2) Escrevam uma frase.")).toBe("ESCREVER");
    expect(pictogramaDaEtapa("Grife o título.")).toBe("SUBLINHAR");
  });

  it("sem verbo de comando conhecido → null (nunca inventa)", () => {
    expect(pictogramaDaEtapa("O sol é uma estrela.")).toBeNull();
    expect(pictogramaDaEtapa("")).toBeNull();
  });

  it("todo verbo que divide etapas tem pictograma", () => {
    for (const verbo of VERBOS_DE_COMANDO) expect(pictogramaDaEtapa(`${verbo} algo`), verbo).not.toBeNull();
  });
});

describe("D-43 — glossário por nível de vocabulário", () => {
  it("BÁSICO explica mais palavras que INTERMEDIÁRIO; ORIGINAL não explica nenhuma", () => {
    const basico = glossarioDoTexto(AGUA, "BASICO").map((i) => i.termo);
    const intermediario = glossarioDoTexto(AGUA, "INTERMEDIARIO").map((i) => i.termo);
    expect(basico).toEqual(["ciclo", "contínuo", "evaporar", "vapor", "precipitação"]);
    expect(intermediario).toEqual(["precipitação"]); // só as de dificuldade ORIGINAL
    expect(glossarioDoTexto(AGUA, "ORIGINAL")).toEqual([]);
  });

  it("casa palavra inteira, sem acento e no plural; não acende dentro de outra palavra", () => {
    expect(glossarioDoTexto("Some as FRACOES.", "BASICO").map((i) => i.termo)).toEqual(["fração"]);
    expect(glossarioDoTexto("Ele deu consolo ao amigo.", "BASICO")).toEqual([]);
  });

  it("não repete termo e respeita o máximo de itens", () => {
    const tudo = VOCABULARIO.map((e) => e.formas[0]).join(" e ");
    expect(glossarioDoTexto(`${AGUA} ${AGUA}`, "BASICO").filter((i) => i.termo === "ciclo")).toHaveLength(1);
    expect(glossarioDoTexto(tudo, "BASICO")).toHaveLength(MAX_ITENS_GLOSSARIO);
  });

  it("vocabulário íntegro: explicação curta (cabe no contrato da IA) e formas sem repetir entre termos", () => {
    const formas = VOCABULARIO.flatMap((e) => e.formas.map((f) => f.toLowerCase()));
    expect(new Set(formas).size).toBe(formas.length);
    for (const e of VOCABULARIO) {
      expect(e.explicacao.length, e.termo).toBeLessThanOrEqual(300);
      expect(e.formas.length, e.termo).toBeGreaterThan(0);
    }
  });
});

describe("D-43 — apoios derivam dos parâmetros validados (RN07)", () => {
  it("pictogramas só com etapa única", () => {
    expect(apoiosDeLeitura(AGUA, { ...PARAMETROS_PADRAO, formatoEnunciado: "ETAPA_UNICA" }).pictogramas).toBe(true);
    expect(apoiosDeLeitura(AGUA, PARAMETROS_PADRAO).pictogramas).toBe(false);
  });

  it("adaptar() devolve os apoios junto com os blocos", () => {
    const r = adaptar(AGUA, { ...PARAMETROS_PADRAO, nivelVocabulario: "BASICO", formatoEnunciado: "ETAPA_UNICA" });
    expect(r.apoios?.pictogramas).toBe(true);
    expect(r.apoios?.glossario[0]).toEqual({ termo: "ciclo", explicacao: expect.any(String) });
  });

  it("juntar glossários: regras primeiro, IA só acrescenta termo novo", () => {
    const regras = [{ termo: "ciclo", explicacao: "das regras" }];
    const ia = [
      { termo: "Ciclo", explicacao: "da IA" },
      { termo: "nuvem", explicacao: "da IA" },
    ];
    expect(juntarGlossarios(regras, ia, undefined)).toEqual([regras[0], ia[1]]);
  });
});
