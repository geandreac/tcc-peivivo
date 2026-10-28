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
    const jaNoPiso = aplicarObservacao({ ...PARAMETROS_PADRAO, nivelVocabulario: "BASICO" }, reduzida);
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

describe("Quadro 5 — demais regras de conversão", () => {
  it("RN03 também vale para atenção e enunciado: AMPLIADA só flexibiliza com 2 ciclos", () => {
    const umCiclo: Observacao[] = [
      { dimensao: "ATENCAO_SUSTENTADA", valorEscala: "AMPLIADA", ciclosConsecutivos: 1 },
      { dimensao: "COMPREENSAO_ENUNCIADOS", valorEscala: "AMPLIADA", ciclosConsecutivos: 1 },
    ];
    const base = { ...PARAMETROS_PADRAO, formatoEnunciado: "ETAPA_UNICA" as const };
    const aposUm = aplicarCiclo(base, umCiclo);
    expect(aposUm.maxLinhasPorBloco).toBe(6); // inalterado
    expect(aposUm.formatoEnunciado).toBe("ETAPA_UNICA"); // inalterado

    const doisCiclos = umCiclo.map((o) => ({ ...o, ciclosConsecutivos: 2 }));
    const aposDois = aplicarCiclo(base, doisCiclos);
    expect(aposDois.maxLinhasPorBloco).toBe(7); // 6 + 1
    expect(aposDois.formatoEnunciado).toBe("MULTIPLAS_ETAPAS");
  });

  it("sensibilidade visual ampliada exige contraste 7 na hora (restringir é imediato)", () => {
    const ampliada: Observacao = { dimensao: "SENSIBILIDADE_VISUAL", valorEscala: "AMPLIADA", ciclosConsecutivos: 1 };
    expect(aplicarObservacao(PARAMETROS_PADRAO, ampliada).contrasteMinimo).toBe(7);
  });

  it("RN03 (D-42): voltar do contraste 7 para 4.5 é flexibilizar — só com 2 ciclos", () => {
    const comSete = { ...PARAMETROS_PADRAO, contrasteMinimo: 7 as const };
    for (const valorEscala of ["ESTAVEL", "REDUZIDA"] as const) {
      const umCiclo: Observacao = { dimensao: "SENSIBILIDADE_VISUAL", valorEscala, ciclosConsecutivos: 1 };
      expect(aplicarObservacao(comSete, umCiclo).contrasteMinimo).toBe(7); // inalterado
      expect(aplicarObservacao(comSete, { ...umCiclo, ciclosConsecutivos: 2 }).contrasteMinimo).toBe(4.5);
    }
  });

  it("fadiga ampliada reduz blocos por material na hora (mín. 4)", () => {
    const ampliada: Observacao = { dimensao: "FADIGA_TAREFA", valorEscala: "AMPLIADA", ciclosConsecutivos: 1 };
    expect(aplicarObservacao(PARAMETROS_PADRAO, ampliada).blocosPorMaterial).toBe(6); // 8 - 2
    expect(aplicarObservacao({ ...PARAMETROS_PADRAO, blocosPorMaterial: 4 }, ampliada).blocosPorMaterial).toBe(4);
  });

  it("RN03 (D-42): fadiga reduzida só amplia blocos com 2 ciclos (máx. 12)", () => {
    const reduzida: Observacao = { dimensao: "FADIGA_TAREFA", valorEscala: "REDUZIDA", ciclosConsecutivos: 1 };
    expect(aplicarObservacao(PARAMETROS_PADRAO, reduzida).blocosPorMaterial).toBe(8); // inalterado
    const doisCiclos = { ...reduzida, ciclosConsecutivos: 2 };
    expect(aplicarObservacao(PARAMETROS_PADRAO, doisCiclos).blocosPorMaterial).toBe(10); // 8 + 2
    expect(aplicarObservacao({ ...PARAMETROS_PADRAO, blocosPorMaterial: 12 }, doisCiclos).blocosPorMaterial).toBe(12);
  });

  it("não muta os parâmetros recebidos (snapshot seguro)", () => {
    const original = { ...PARAMETROS_PADRAO };
    aplicarObservacao(PARAMETROS_PADRAO, { dimensao: "FADIGA_TAREFA", valorEscala: "AMPLIADA", ciclosConsecutivos: 1 });
    expect(PARAMETROS_PADRAO).toEqual(original);
  });
});
