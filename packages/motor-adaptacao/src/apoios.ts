/**
 * D-43 — apoios de leitura para estudantes com dificuldade de leitura
 * (dislexia, TEA, TDAH). Puros e determinísticos, como o resto do motor:
 * rodam sem IA (RN06) e sem rede.
 *
 * Nenhum parâmetro novo: os apoios DERIVAM dos parâmetros que o profissional
 * já validou (RN07), então não há nada a mais para validar.
 * - `formatoEnunciado = ETAPA_UNICA` → pictograma ao lado de cada etapa.
 * - `nivelVocabulario` → quais palavras entram no glossário (`vocabulario.ts`).
 */
import type { ItemGlossario, NivelVocabulario, ParametrosAdaptacao, Pictograma, ApoiosLeitura } from "./tipos";
import type { VERBOS_DE_COMANDO } from "./adaptador";
import { VOCABULARIO } from "./vocabulario";

/** Acima disso o glossário vira outra leitura longa — o oposto do objetivo. */
export const MAX_ITENS_GLOSSARIO = 8;

const NIVEIS: NivelVocabulario[] = ["BASICO", "INTERMEDIARIO", "ORIGINAL"];

const PICTOGRAMA_DO_VERBO: Record<(typeof VERBOS_DE_COMANDO)[number], Pictograma> = {
  leia: "LER",
  escreva: "ESCREVER",
  anote: "ESCREVER",
  circule: "CIRCULAR",
  marque: "MARCAR",
  assinale: "MARCAR",
  risque: "MARCAR",
  pinte: "PINTAR",
  responda: "RESPONDER",
  complete: "COMPLETAR",
  preencha: "COMPLETAR",
  copie: "COPIAR",
  desenhe: "DESENHAR",
  observe: "OBSERVAR",
  sublinhe: "SUBLINHAR",
  grife: "SUBLINHAR",
  destaque: "SUBLINHAR",
  ligue: "LIGAR",
  relacione: "LIGAR",
  calcule: "CALCULAR",
  conte: "CONTAR",
  numere: "CONTAR",
  recorte: "RECORTAR",
  cole: "COLAR",
  escolha: "ESCOLHER",
  explique: "EXPLICAR",
  resuma: "EXPLICAR",
  descreva: "EXPLICAR",
  justifique: "EXPLICAR",
  cite: "EXPLICAR",
  elabore: "EXPLICAR",
  indique: "EXPLICAR",
  monte: "ORGANIZAR",
  separe: "ORGANIZAR",
  organize: "ORGANIZAR",
  classifique: "ORGANIZAR",
  construa: "ORGANIZAR",
  compare: "ORGANIZAR",
  procure: "PROCURAR",
  encontre: "PROCURAR",
  identifique: "PROCURAR",
};

/** Minúsculas e sem acento — "Fração" e "fracao" contam igual. */
function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/**
 * Pictograma da etapa pelo verbo de comando inicial ("2. Circule as palavras."
 * → CIRCULAR). Aceita o plural ("leiam"). Sem verbo conhecido → null.
 */
export function pictogramaDaEtapa(etapa: string): Pictograma | null {
  const primeira = normalizar(etapa.trim().replace(/^\d+[.)]\s*/u, "")).split(/[^a-z]+/u)[0] ?? "";
  const verbo = (primeira in PICTOGRAMA_DO_VERBO ? primeira : primeira.replace(/m$/u, "")) as keyof typeof PICTOGRAMA_DO_VERBO;
  return PICTOGRAMA_DO_VERBO[verbo] ?? null;
}

/**
 * Palavras do texto que pedem explicação no nível de vocabulário do perfil,
 * na ordem em que aparecem, sem repetir, no máximo `MAX_ITENS_GLOSSARIO`.
 * Casa só palavra inteira: "solo" não acende em "consolo".
 */
export function glossarioDoTexto(texto: string, nivel: NivelVocabulario): ItemGlossario[] {
  const nivelAluno = NIVEIS.indexOf(nivel);
  const corrido = ` ${normalizar(texto).replace(/[^a-z0-9]+/gu, " ")} `;
  const achados: { posicao: number; item: ItemGlossario }[] = [];
  for (const entrada of VOCABULARIO) {
    if (NIVEIS.indexOf(entrada.dificuldade) <= nivelAluno) continue;
    const posicoes = entrada.formas.map((f) => corrido.indexOf(` ${normalizar(f)} `)).filter((i) => i >= 0);
    if (posicoes.length > 0) {
      achados.push({ posicao: Math.min(...posicoes), item: { termo: entrada.termo, explicacao: entrada.explicacao } });
    }
  }
  return achados
    .sort((a, b) => a.posicao - b.posicao)
    .slice(0, MAX_ITENS_GLOSSARIO)
    .map((a) => a.item);
}

export function apoiosDeLeitura(texto: string, parametros: ParametrosAdaptacao): ApoiosLeitura {
  return {
    pictogramas: parametros.formatoEnunciado === "ETAPA_UNICA",
    glossario: glossarioDoTexto(texto, parametros.nivelVocabulario),
  };
}

/**
 * Junta o glossário das regras com o da IA (quando houver), sem repetir termo.
 * O das regras vem primeiro: foi curado à mão; a IA só acrescenta.
 */
export function juntarGlossarios(...listas: (ItemGlossario[] | undefined)[]): ItemGlossario[] {
  const vistos = new Set<string>();
  const saida: ItemGlossario[] = [];
  for (const item of listas.flatMap((l) => l ?? [])) {
    const chave = normalizar(item.termo.trim());
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    saida.push(item);
  }
  return saida;
}
