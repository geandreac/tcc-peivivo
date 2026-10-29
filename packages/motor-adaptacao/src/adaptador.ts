/**
 * P2.4 / HU-S.03 / RF09 / D-10 — Camada determinística de adaptação de texto.
 *
 * `adaptar(texto, parametros)` é pura: mesma entrada → mesma saída, sem rede,
 * sem IA. É o que roda quando a camada de IA está desligada (RN06) e é a
 * entrada da camada de IA quando ela está ligada.
 *
 * Garantias verificadas em `adaptador.test.ts`:
 * - nenhum bloco excede `maxLinhasPorBloco`;
 * - blocos de texto terminam em fim de frase sempre que a frase cabe no limite;
 * - no máximo `blocosPorMaterial` blocos entram no material; o restante vai
 *   para `blocosExcedentes` — o texto original é recuperável por concatenação;
 * - com `formatoEnunciado = ETAPA_UNICA`, nenhum enunciado composto sobrevive
 *   com conectores como "e depois" / "em seguida".
 *
 * O que NÃO está aqui (de propósito): simplificação lexical e
 * recontextualização por `interesseAncora` — isso é IA (RF10, Fase 5).
 * Tipografia e contraste são CSS no cliente (D-10).
 */
import type { Bloco, Enunciado, ParametrosAdaptacao, TextoAdaptado } from "./tipos";
import { apoiosDeLeitura } from "./apoios";

/** Uma "linha" de leitura ≈ 60 caracteres (P2.4). */
export const CARACTERES_POR_LINHA = 60;

/** Conectores de sequência, do mais longo para o mais curto (ordem importa no regex). */
const CONECTORES = [
  "e, depois,",
  "e depois disso",
  "e em seguida",
  "e finalmente",
  "e por fim",
  "e então",
  "e depois",
  "depois disso",
  "em seguida",
  "logo após",
  "por fim",
  "depois",
  "então",
];

/** Verbos de comando reconhecidos (imperativo, 3ª pessoa). Cada um tem pictograma (`apoios.ts`). */
export const VERBOS_DE_COMANDO = [
  "leia",
  "escreva",
  "circule",
  "marque",
  "pinte",
  "responda",
  "complete",
  "copie",
  "desenhe",
  "observe",
  "sublinhe",
  "ligue",
  "calcule",
  "escolha",
  "anote",
  "recorte",
  "cole",
  "conte",
  "explique",
  "resuma",
  "procure",
  "compare",
  "identifique",
  "descreva",
  "monte",
  "separe",
  "organize",
  "assinale",
  "numere",
  "risque",
  "encontre",
  "preencha",
  "grife",
  "destaque",
  "relacione",
  "indique",
  "justifique",
  "cite",
  "elabore",
  "construa",
  "classifique",
] as const;

const VERBOS = VERBOS_DE_COMANDO.join("|");

const VERBO_INICIAL = new RegExp(`^(?:${VERBOS})m?\\b`, "iu");

/** Divide antes de um verbo imperativo precedido por conector, "e" ou vírgula. */
const DIVISOR_ETAPAS = new RegExp(`\\s*,?\\s*(?:\\b(?:${CONECTORES.join("|")})\\b|\\be\\b|,)\\s*(?=(?:${VERBOS})m?\\b)`, "giu");

/** Quebra um parágrafo em linhas de até `largura` caracteres, sem cortar palavras. */
export function quebrarEmLinhas(paragrafo: string, largura = CARACTERES_POR_LINHA): string[] {
  const palavras = paragrafo.split(/\s+/u).filter(Boolean);
  const linhas: string[] = [];
  let atual = "";
  for (const palavra of palavras) {
    if (atual.length === 0) {
      atual = palavra;
    } else if (atual.length + 1 + palavra.length <= largura) {
      atual += " " + palavra;
    } else {
      linhas.push(atual);
      atual = palavra;
    }
  }
  if (atual) linhas.push(atual);
  return linhas;
}

/** Detecta enunciado imperativo (começa com verbo de comando) — heurística. */
export function ehEnunciado(paragrafo: string): boolean {
  return VERBO_INICIAL.test(paragrafo.trim().replace(/^\d+[.)]\s*/u, ""));
}

function partesDoEnunciado(paragrafo: string): string[] {
  const semNumeracao = paragrafo.trim().replace(/^\d+[.)]\s*/u, "");
  return semNumeracao
    .split(DIVISOR_ETAPAS)
    .map((p) =>
      p
        .trim()
        .replace(/[.;]+$/u, "")
        .trim(),
    )
    .filter(Boolean);
}

/** Enunciado composto = imperativo com dois ou mais comandos encadeados. */
export function ehEnunciadoComposto(paragrafo: string): boolean {
  return ehEnunciado(paragrafo) && partesDoEnunciado(paragrafo).length >= 2;
}

/**
 * Divide um enunciado composto em etapas únicas. Cada etapa começa com verbo
 * imperativo, sem conector, com inicial maiúscula e ponto final.
 */
export function dividirEmEtapas(paragrafo: string): string[] {
  return partesDoEnunciado(paragrafo).map((e) => e.charAt(0).toUpperCase() + e.slice(1) + ".");
}

/** Divide um parágrafo em frases (fim em . ! ? … seguido de espaço e nova frase). */
export function dividirEmFrases(paragrafo: string): string[] {
  return paragrafo
    .split(/(?<=[.!?…]["”)]?)\s+(?=["“(]?[A-ZÀ-Ý0-9])/u)
    .map((f) => f.trim())
    .filter(Boolean);
}

/**
 * Agrupa frases inteiras em blocos de até `maxLinhas` linhas, para o trecho
 * não terminar no meio de uma frase (dislexia/TEA). Só uma frase que sozinha
 * passa do limite é cortada por linhas — e o resto dela segue no bloco seguinte.
 */
function blocosDoParagrafo(paragrafo: string, maxLinhas: number): string[][] {
  const blocos: string[][] = [];
  let atual = "";
  const fechar = () => {
    if (atual) blocos.push(quebrarEmLinhas(atual));
    atual = "";
  };
  for (const frase of dividirEmFrases(paragrafo)) {
    const junto = atual ? `${atual} ${frase}` : frase;
    if (quebrarEmLinhas(junto).length <= maxLinhas) {
      atual = junto;
      continue;
    }
    fechar();
    const linhas = quebrarEmLinhas(frase);
    let i = 0;
    for (; linhas.length - i > maxLinhas; i += maxLinhas) blocos.push(linhas.slice(i, i + maxLinhas));
    atual = linhas.slice(i).join(" ");
  }
  fechar();
  return blocos;
}

function paragrafos(texto: string): string[] {
  return texto
    .replace(/\r\n?/gu, "\n")
    .split(/\n\s*\n|\n(?=\s*(?:[-•*]|\d+[.)])\s)/u)
    .map((p) => p.replace(/\s*\n\s*/gu, " ").trim())
    .filter(Boolean);
}

/** `perguntas`: quantas perguntas de compreensão a IA trouxe (D-53) — viram o último passo do roteiro. */
export function adaptar(texto: string, parametros: ParametrosAdaptacao, perguntas = 0): TextoAdaptado {
  const p = { ...parametros };
  const maxLinhas = Math.max(1, Math.floor(p.maxLinhasPorBloco));
  const maxBlocos = Math.max(1, Math.floor(p.blocosPorMaterial));

  const blocos: Bloco[] = [];
  const enunciados: Enunciado[] = [];
  // D-53: o que o roteiro conta — se o bloco é leitura e quantas tarefas ele traz
  const deLeitura: boolean[] = [];
  const tarefas: number[] = [];

  for (const paragrafo of paragrafos(texto)) {
    if (p.formatoEnunciado === "ETAPA_UNICA" && ehEnunciadoComposto(paragrafo)) {
      const etapas = dividirEmEtapas(paragrafo);
      enunciados.push({ original: paragrafo, etapas });
      // Cada etapa vira uma linha própria; agrupa respeitando o limite.
      for (let i = 0; i < etapas.length; i += maxLinhas) {
        blocos.push({
          linhas: etapas.slice(i, i + maxLinhas).map((e, j) => `${i + j + 1}. ${e}`),
        });
        deLeitura.push(false);
        tarefas.push(i === 0 ? etapas.length : 0);
      }
      continue;
    }
    const comando = ehEnunciado(paragrafo);
    blocosDoParagrafo(paragrafo, maxLinhas).forEach((linhas, i) => {
      blocos.push({ linhas });
      deLeitura.push(!comando);
      tarefas.push(comando && i === 0 ? 1 : 0);
    });
  }

  return {
    blocos: blocos.slice(0, maxBlocos),
    blocosExcedentes: blocos.slice(maxBlocos),
    enunciados,
    parametros: p,
    apoios: apoiosDeLeitura(texto, p),
    roteiro: roteiroDaAtividade(deLeitura.slice(0, maxBlocos), tarefas.slice(0, maxBlocos), perguntas),
  };
}

/**
 * D-53 — previsibilidade: o que vem pela frente, contado do próprio material (quantos
 * trechos de leitura, quantas tarefas). Resume, não repete os comandos, que já estão no
 * texto — repetir dobraria a leitura. Menos de dois passos não é roteiro: devolve vazio.
 * Não inventa passo, prazo nem recompensa. As perguntas (só com IA) são o último passo.
 */
export function roteiroDaAtividade(deLeitura: boolean[], tarefasPorBloco: number[], perguntas = 0): string[] {
  const trechos = deLeitura.filter(Boolean).length;
  const tarefas = tarefasPorBloco.reduce((a, b) => a + b, 0);
  const passos = [
    ...(trechos > 0 ? [`Leia o texto: ${trechos === 1 ? "1 trecho" : `${trechos} trechos`}.`] : []),
    ...(tarefas > 0 ? [`Faça ${tarefas === 1 ? "1 tarefa" : `${tarefas} tarefas`}.`] : []),
    ...(perguntas > 0 ? [`Responda ${perguntas === 1 ? "a 1 pergunta" : `às ${perguntas} perguntas`} sobre o texto.`] : []),
  ];
  return passos.length >= 2 ? passos : [];
}

/** Reconstrói o texto (útil para o teste "nada se perde" e para impressão). */
export function textoDoAdaptado(adaptado: TextoAdaptado): string {
  return [...adaptado.blocos, ...adaptado.blocosExcedentes].map((b) => b.linhas.join("\n")).join("\n\n");
}
