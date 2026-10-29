/**
 * D-53 — roteiro da atividade: previsibilidade contada do próprio material, sem repetir
 * comandos e sem inventar passo, prazo ou recompensa.
 */
import { describe, expect, it } from "vitest";
import { adaptar } from "./adaptador";
import { PARAMETROS_PADRAO } from "./tipos";

const TEXTO = [
  "Uma fração representa uma parte de um todo. Quando dividimos uma pizza em quatro pedaços, cada pedaço é um quarto.",
  "1. Leia o texto acima e depois circule a palavra fração.",
  "2. Desenhe um retângulo dividido em quatro partes.",
].join("\n\n");

describe("roteiro da atividade (D-53)", () => {
  it("conta trechos e tarefas; com ETAPA_UNICA, cada etapa é uma tarefa", () => {
    expect(adaptar(TEXTO, { ...PARAMETROS_PADRAO, formatoEnunciado: "ETAPA_UNICA" }).roteiro).toEqual(["Leia o texto: 1 trecho.", "Faça 3 tarefas."]);
  });

  it("com MULTIPLAS_ETAPAS, o comando composto conta como uma tarefa (não muda o que foi validado)", () => {
    expect(adaptar(TEXTO, PARAMETROS_PADRAO).roteiro).toEqual(["Leia o texto: 1 trecho.", "Faça 2 tarefas."]);
  });

  it("não repete os comandos (eles já estão no texto) nem acrescenta prazo ou recompensa", () => {
    const passos = adaptar(TEXTO, PARAMETROS_PADRAO).roteiro!.join(" ").toLowerCase();
    expect(passos).not.toContain("circule");
    expect(passos).not.toMatch(/minuto|prêmio|recompensa|parabéns/u);
  });

  it("texto sem comando não tem roteiro (um passo só não é sequência)", () => {
    expect(adaptar("A água evapora com o calor do sol. Depois vira nuvem.", PARAMETROS_PADRAO).roteiro).toEqual([]);
  });

  it("só conta o que entra no material: trechos e tarefas excedentes ficam fora", () => {
    const longo = Array.from({ length: 6 }, (_, i) => `Parágrafo ${i + 1} do texto fictício.`).join("\n\n") + "\n\nResponda à pergunta.";
    expect(adaptar(longo, { ...PARAMETROS_PADRAO, blocosPorMaterial: 4 }).roteiro).toEqual([]);
    expect(adaptar(longo, PARAMETROS_PADRAO).roteiro).toEqual(["Leia o texto: 6 trechos.", "Faça 1 tarefa."]);
  });
});

describe("roteiro com perguntas (D-53)", () => {
  it("as perguntas da IA são o último passo; sem perguntas, nenhum passo de pergunta", () => {
    expect(adaptar(TEXTO, PARAMETROS_PADRAO, 3).roteiro).toEqual(["Leia o texto: 1 trecho.", "Faça 2 tarefas.", "Responda às 3 perguntas sobre o texto."]);
    expect(adaptar("A água evapora. Depois vira nuvem.", PARAMETROS_PADRAO, 1).roteiro).toEqual([
      "Leia o texto: 1 trecho.",
      "Responda a 1 pergunta sobre o texto.",
    ]);
  });
});
