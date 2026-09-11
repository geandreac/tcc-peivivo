import { describe, it, expect } from "vitest";
import { aplicarObservacao, aplicarCiclo, PARAMETROS_PADRAO } from "./regras";
import type { Observacao } from "./tipos";

describe("RN03 — assimetria conservadora", () => {
  it("NÃO eleva o vocabulário com apenas 1 ciclo de observação ampliada", () => {
    const obs: Observacao = {
      dimensao: "AUTONOMIA_LEXICAL",
      valorEscala: "AMPLIADA",
      ciclosConsecutivos: 1,
    };
    const resultado = aplicarObservacao(PARAMETROS_PADRAO, obs);
    expect(resultado.nivelVocabulario).toBe("INTERMEDIARIO"); // inalterado
  });

  it("ELEVA o vocabulário com 2 ciclos consecutivos de observação ampliada", () => {
    const obs: Observacao = {
      dimensao: "AUTONOMIA_LEXICAL",
      valorEscala: "AMPLIADA",
      ciclosConsecutivos: 2,
    };
    const resultado = aplicarObservacao(PARAMETROS_PADRAO, obs);
    expect(resultado.nivelVocabulario).toBe("ORIGINAL");
  });

  it("REDUZ o vocabulário imediatamente, com apenas 1 ciclo (assimetria)", () => {
    const obs: Observacao = {
      dimensao: "AUTONOMIA_LEXICAL",
      valorEscala: "REDUZIDA",
      ciclosConsecutivos: 1,
    };
    const resultado = aplicarObservacao(PARAMETROS_PADRAO, obs);
    expect(resultado.nivelVocabulario).toBe("BASICO");
  });

  it("nunca desce abaixo de BASICO nem sobe acima de ORIGINAL", () => {
    const reduzida: Observacao = {
      dimensao: "AUTONOMIA_LEXICAL",
      valorEscala: "REDUZIDA",
      ciclosConsecutivos: 1,
    };
    const jaNoPiso = aplicarObservacao(
      { ...PARAMETROS_PADRAO, nivelVocabulario: "BASICO" },
      reduzida
    );
    expect(jaNoPiso.nivelVocabulario).toBe("BASICO");
  });
});

describe("Segmentação e formato de enunciado", () => {
  it("reduz linhas por bloco quando atenção sustentada está reduzida", () => {
    const obs: Observacao = {
      dimensao: "ATENCAO_SUSTENTADA",
      valorEscala: "REDUZIDA",
      ciclosConsecutivos: 1,
    };
    const resultado = aplicarObservacao(PARAMETROS_PADRAO, obs);
    expect(resultado.maxLinhasPorBloco).toBe(5); // 6 - 1
  });

  it("força etapa única quando compreensão de enunciados está reduzida", () => {
    const obs: Observacao = {
      dimensao: "COMPREENSAO_ENUNCIADOS",
      valorEscala: "REDUZIDA",
      ciclosConsecutivos: 1,
    };
    const resultado = aplicarObservacao(PARAMETROS_PADRAO, obs);
    expect(resultado.formatoEnunciado).toBe("ETAPA_UNICA");
  });
});

describe("Cenário demonstrativo A (pré-projeto, seção 6.7)", () => {
  it("reproduz os parâmetros do estudante fictício após o ciclo 3", () => {
    const observacoesDoCiclo: Observacao[] = [
      { dimensao: "ATENCAO_SUSTENTADA", valorEscala: "REDUZIDA", ciclosConsecutivos: 1 },
      { dimensao: "COMPREENSAO_ENUNCIADOS", valorEscala: "REDUZIDA", ciclosConsecutivos: 1 },
      { dimensao: "SENSIBILIDADE_VISUAL", valorEscala: "AMPLIADA", ciclosConsecutivos: 1 },
    ];

    const resultado = aplicarCiclo(PARAMETROS_PADRAO, observacoesDoCiclo);

    expect(resultado.maxLinhasPorBloco).toBeLessThanOrEqual(5);
    expect(resultado.formatoEnunciado).toBe("ETAPA_UNICA");
    expect(resultado.contrasteMinimo).toBe(7);
  });
});
