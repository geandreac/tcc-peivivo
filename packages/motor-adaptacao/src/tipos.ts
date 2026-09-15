/**
 * Tipos que espelham, 1:1, o «value object» ParametrosAdaptacao do
 * Diagrama de Classes e as enumerações citadas em sua legenda.
 *
 * Convenção (CLAUDE.md): este é o único contrato de parâmetros do sistema.
 * Os tipos de P2.1–P2.4 (histórico de observações e texto adaptado) ESTENDEM
 * este arquivo — nunca criam um tipo paralelo.
 */

export type NivelVocabulario = "BASICO" | "INTERMEDIARIO" | "ORIGINAL";
export type FormatoEnunciado = "ETAPA_UNICA" | "MULTIPLAS_ETAPAS";
export type DimensaoObservada =
  | "ATENCAO_SUSTENTADA"
  | "COMPREENSAO_ENUNCIADOS"
  | "AUTONOMIA_LEXICAL"
  | "INTERESSE_MANIFESTO"
  | "SENSIBILIDADE_VISUAL"
  | "FADIGA_TAREFA";
export type EscalaObservacao = "REDUZIDA" | "ESTAVEL" | "AMPLIADA";

export const DIMENSOES: readonly DimensaoObservada[] = [
  "ATENCAO_SUSTENTADA",
  "COMPREENSAO_ENUNCIADOS",
  "AUTONOMIA_LEXICAL",
  "INTERESSE_MANIFESTO",
  "SENSIBILIDADE_VISUAL",
  "FADIGA_TAREFA",
];

export interface ParametrosAdaptacao {
  maxLinhasPorBloco: number;
  nivelVocabulario: NivelVocabulario;
  interesseAncora: string | null;
  formatoEnunciado: FormatoEnunciado;
  contrasteMinimo: 4.5 | 7;
  blocosPorMaterial: number;
}

export interface Observacao {
  dimensao: DimensaoObservada;
  valorEscala: EscalaObservacao;
  /** Nº de ciclos consecutivos que a observação já se repete nessa dimensão. */
  ciclosConsecutivos: number;
}

/**
 * Observação como está gravada em `observacoes` (sem `ciclosConsecutivos`,
 * que é derivado — ver `ciclos.ts`). `numeroCiclo` vem de `ciclos_observacao`.
 */
export interface ObservacaoHistorica {
  numeroCiclo: number;
  dimensao: DimensaoObservada;
  valorEscala: EscalaObservacao;
  evidencia?: string | null;
}

/** Saída da camada determinística de adaptação de texto (P2.3, D-10). */
export interface Bloco {
  linhas: string[];
}

export interface Enunciado {
  /** Texto original do enunciado composto, preservado para revisão. */
  original: string;
  /** Uma etapa por item quando `formatoEnunciado = ETAPA_UNICA`. */
  etapas: string[];
}

export interface TextoAdaptado {
  blocos: Bloco[];
  enunciados: Enunciado[];
  parametros: ParametrosAdaptacao;
  /** Blocos que ficaram de fora por exceder `blocosPorMaterial` — nada se perde. */
  blocosExcedentes: Bloco[];
}

export const PARAMETROS_PADRAO: ParametrosAdaptacao = {
  maxLinhasPorBloco: 6,
  nivelVocabulario: "INTERMEDIARIO",
  interesseAncora: null,
  formatoEnunciado: "MULTIPLAS_ETAPAS",
  contrasteMinimo: 4.5,
  blocosPorMaterial: 8,
};
