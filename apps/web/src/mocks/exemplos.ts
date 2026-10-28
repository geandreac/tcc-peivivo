/**
 * Constantes pequenas do cenário fictício usadas pelas telas (exemplo de texto,
 * parâmetros de demonstração, ids dos perfis de entrada). Ficam fora de
 * dados.ts para que a semente completa só entre no bundle com o mockApi (D-48).
 */
export const ID = {
  docente: "u-0001",
  responsavel: "u-0002",
  profissional: "u-0003",
  coordenacao: "u-0004",
  docente2: "u-0005",
  fono: "u-0006",
  // D-50: painel administrativo (todos fictícios)
  admin: "u-0007",
  docenteSuspensa: "u-0008",
  profissionalExpirado: "u-0009",
  externoAguardando: "u-0010",
  docenteConvidada: "u-0011",
  escola: "s-0001",
  estudanteA: "e-0010",
  estudanteB: "e-0011",
  ciclo1: "c-0021",
  ciclo2: "c-0022",
  ciclo3: "c-0023",
  ciclo4: "c-0024",
  cicloB1: "c-0031",
  versao3: "v-0030",
  materialAprovado: "m-0040",
  materialRascunho: "m-0041",
} as const;

export const PARAMETROS_CENARIO_A = {
  maxLinhasPorBloco: 4,
  nivelVocabulario: "BASICO" as const,
  interesseAncora: "dinossauros",
  formatoEnunciado: "ETAPA_UNICA" as const,
  contrasteMinimo: 7 as const,
  blocosPorMaterial: 8,
};

export const TEXTO_CICLO_DA_AGUA = `O ciclo da água é o movimento contínuo da água na Terra. A água dos rios, lagos e oceanos evapora com o calor do sol e sobe para o céu em forma de vapor. Lá em cima, o vapor esfria e vira pequenas gotinhas, formando as nuvens. Quando as gotinhas ficam pesadas, caem como chuva, neve ou granizo. Essa água volta para os rios, para o solo e para os oceanos, e o ciclo recomeça.

Leia o texto acima e depois responda às perguntas com suas palavras.

Circule as palavras que você não conhece, em seguida escreva uma frase com cada uma delas.`;
