/**
 * Tipos que espelham, 1:1, o «value object» ParametrosAdaptacao do
 * Diagrama de Classes e as enumerações citadas em sua legenda.
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

export const PARAMETROS_PADRAO: ParametrosAdaptacao = {
  maxLinhasPorBloco: 6,
  nivelVocabulario: "INTERMEDIARIO",
  interesseAncora: null,
  formatoEnunciado: "MULTIPLAS_ETAPAS",
  contrasteMinimo: 4.5,
  blocosPorMaterial: 8,
};
