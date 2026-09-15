/**
 * DADOS 100 % FICTÍCIOS — cenário demonstrativo A do pré-projeto (§5 e §6.7),
 * mesmo padrão de `supabase/seed.sql`. Nomes claramente fictícios; nenhum
 * dado real de estudante (CLAUDE.md, "Dados"). Usado só pelo `mockApi`.
 */
import type {
  Auditoria,
  Ciclo,
  Consentimento,
  Desfecho,
  Estudante,
  Material,
  NotaClinica,
  ObservacaoRegistro,
  Usuario,
  VersaoPerfil,
  Vinculo,
} from "../services/tipos";
import { adaptar } from "@pei-vivo/motor-adaptacao";

const diasAtras = (n: number, hora = 20) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hora, 0, 0, 0);
  return d.toISOString();
};
const dataAtras = (n: number) => diasAtras(n).slice(0, 10);

export const ID = {
  docente: "u-0001",
  responsavel: "u-0002",
  profissional: "u-0003",
  coordenacao: "u-0004",
  docente2: "u-0005",
  fono: "u-0006",
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

export const USUARIOS: Usuario[] = [
  { id: ID.docente, nome: "Márcia (fictícia)", email: "docente.dev@example.test", papelInstitucional: null },
  { id: ID.responsavel, nome: "Rosa (fictícia)", email: "responsavel.dev@example.test", papelInstitucional: null },
  { id: ID.profissional, nome: "Camila (fictícia)", email: "profissional.dev@example.test", papelInstitucional: null },
  { id: ID.coordenacao, nome: "Coordenação (fictícia)", email: "coordenacao.dev@example.test", papelInstitucional: "COORDENACAO" },
  { id: ID.docente2, nome: "Paulo (fictício)", email: "docente2.dev@example.test", papelInstitucional: null },
  { id: ID.fono, nome: "Beatriz (fictícia)", email: "fono.dev@example.test", papelInstitucional: null },
];

export const ESTUDANTES: Estudante[] = [
  {
    id: ID.estudanteA,
    nome: "Miguel (fictício)",
    dataNascimento: "2017-03-14",
    turma: "4º ano B",
    laudoApresentadoEm: dataAtras(120),
    createdAt: diasAtras(90),
  },
  {
    id: ID.estudanteB,
    nome: "Estudante fictício B",
    dataNascimento: "2016-08-02",
    turma: "5º ano A",
    laudoApresentadoEm: null,
    createdAt: diasAtras(3),
  },
];

export const VINCULOS: Vinculo[] = [
  { id: "vin-1", usuarioId: ID.docente, estudanteId: ID.estudanteA, papel: "DOCENTE", dataVinculo: diasAtras(90), status: "ATIVO", registroConselho: null },
  { id: "vin-2", usuarioId: ID.responsavel, estudanteId: ID.estudanteA, papel: "RESPONSAVEL", dataVinculo: diasAtras(89), status: "ATIVO", registroConselho: null },
  { id: "vin-3", usuarioId: ID.profissional, estudanteId: ID.estudanteA, papel: "PROFISSIONAL_SAUDE", dataVinculo: diasAtras(85), status: "ATIVO", registroConselho: "CREFITO-DEV-000" },
  { id: "vin-4", usuarioId: ID.coordenacao, estudanteId: ID.estudanteA, papel: "COORDENACAO", dataVinculo: diasAtras(90), status: "ATIVO", registroConselho: null },
  // Estudante B: cadastrado há 3 dias; sem consentimento ainda (RN01) e sem profissional (RN06)
  { id: "vin-5", usuarioId: ID.coordenacao, estudanteId: ID.estudanteB, papel: "COORDENACAO", dataVinculo: diasAtras(3), status: "ATIVO", registroConselho: null },
  { id: "vin-6", usuarioId: ID.docente, estudanteId: ID.estudanteB, papel: "DOCENTE", dataVinculo: diasAtras(2), status: "ATIVO", registroConselho: null },
  { id: "vin-7", usuarioId: ID.responsavel, estudanteId: ID.estudanteB, papel: "RESPONSAVEL", dataVinculo: diasAtras(2), status: "ATIVO", registroConselho: null },
];

export const CONSENTIMENTOS: Consentimento[] = [
  {
    id: "con-1",
    estudanteId: ID.estudanteA,
    responsavelId: ID.responsavel,
    dataConcessao: diasAtras(88),
    escopo: ["observacao_pedagogica", "observacao_domiciliar", "geracao_material"],
    status: "ATIVO",
    dataRevogacao: null,
  },
];

export const CICLOS: Ciclo[] = [
  { id: ID.ciclo1, estudanteId: ID.estudanteA, numero: 1, dataInicio: dataAtras(56), dataFim: dataAtras(42), status: "FECHADO" },
  { id: ID.ciclo2, estudanteId: ID.estudanteA, numero: 2, dataInicio: dataAtras(42), dataFim: dataAtras(28), status: "FECHADO" },
  { id: ID.ciclo3, estudanteId: ID.estudanteA, numero: 3, dataInicio: dataAtras(28), dataFim: dataAtras(14), status: "FECHADO" },
  { id: ID.ciclo4, estudanteId: ID.estudanteA, numero: 4, dataInicio: dataAtras(14), dataFim: null, status: "ABERTO" },
];

let seq = 0;
const obs = (
  cicloId: string,
  numeroCiclo: number,
  autorId: string,
  papelAutor: ObservacaoRegistro["papelAutor"],
  dimensao: ObservacaoRegistro["dimensao"],
  valorEscala: ObservacaoRegistro["valorEscala"],
  evidencia: string | null,
  dias: number
): ObservacaoRegistro => ({
  id: `obs-${++seq}`,
  cicloId,
  numeroCiclo,
  autorId,
  papelAutor,
  dimensao,
  valorEscala,
  evidencia,
  dataRegistro: diasAtras(dias),
});

export const OBSERVACOES: ObservacaoRegistro[] = [
  // ciclo 1
  obs(ID.ciclo1, 1, ID.docente, "DOCENTE", "ATENCAO_SUSTENTADA", "REDUZIDA", "Perde o fio em blocos acima de 6 linhas.", 50),
  obs(ID.ciclo1, 1, ID.responsavel, "RESPONSAVEL", "SENSIBILIDADE_VISUAL", "AMPLIADA", "Reclama de claridade na tela e no papel branco.", 49),
  obs(ID.ciclo1, 1, ID.profissional, "PROFISSIONAL_SAUDE", "COMPREENSAO_ENUNCIADOS", "REDUZIDA", "Instrução com mais de 2 etapas trava.", 48),
  // ciclo 2
  obs(ID.ciclo2, 2, ID.docente, "DOCENTE", "ATENCAO_SUSTENTADA", "REDUZIDA", "Melhorou com blocos curtos, mas ainda perde o fio acima de 5 linhas.", 36),
  obs(ID.ciclo2, 2, ID.responsavel, "RESPONSAVEL", "INTERESSE_MANIFESTO", "AMPLIADA", "Dinossauros!", 35),
  obs(ID.ciclo2, 2, ID.profissional, "PROFISSIONAL_SAUDE", "AUTONOMIA_LEXICAL", "REDUZIDA", "Pede ajuda em palavras com mais de 3 sílabas.", 34),
  // ciclo 3 (origem da versão vigente — cenário A)
  obs(ID.ciclo3, 3, ID.docente, "DOCENTE", "ATENCAO_SUSTENTADA", "REDUZIDA", "Perde o fio em blocos de texto acima de 5 linhas.", 22),
  obs(ID.ciclo3, 3, ID.docente, "DOCENTE", "COMPREENSAO_ENUNCIADOS", "REDUZIDA", "Trava em instruções com mais de uma etapa.", 22),
  obs(ID.ciclo3, 3, ID.responsavel, "RESPONSAVEL", "INTERESSE_MANIFESTO", "AMPLIADA", "Engajamento espontâneo com dinossauros.", 21),
  obs(ID.ciclo3, 3, ID.responsavel, "RESPONSAVEL", "SENSIBILIDADE_VISUAL", "AMPLIADA", "Ruído e luz forte desorganizam.", 21),
  // ciclo 4 (aberto) — já tem 2 observações; a tela "observar" completa o resto
  obs(ID.ciclo4, 4, ID.profissional, "PROFISSIONAL_SAUDE", "AUTONOMIA_LEXICAL", "AMPLIADA", "Leu sozinho 'evaporação' na sessão — 1º ciclo de melhora.", 6),
  obs(ID.ciclo4, 4, ID.responsavel, "RESPONSAVEL", "FADIGA_TAREFA", "AMPLIADA", "Cansa depois de 10 min de tarefa em casa.", 5),
];

export const PARAMETROS_CENARIO_A = {
  maxLinhasPorBloco: 4,
  nivelVocabulario: "BASICO" as const,
  interesseAncora: "dinossauros",
  formatoEnunciado: "ETAPA_UNICA" as const,
  contrasteMinimo: 7 as const,
  blocosPorMaterial: 8,
};

export const VERSOES: VersaoPerfil[] = [
  {
    id: "v-0010",
    estudanteId: ID.estudanteA,
    cicloOrigemId: ID.ciclo1,
    numeroCiclo: 1,
    parametros: { maxLinhasPorBloco: 5, nivelVocabulario: "INTERMEDIARIO", interesseAncora: null, formatoEnunciado: "ETAPA_UNICA", contrasteMinimo: 7, blocosPorMaterial: 8 },
    statusValidacao: "VIGENTE",
    validadorId: ID.profissional,
    dataVigencia: diasAtras(41),
    justificativaRevisao: null,
    createdAt: diasAtras(42),
  },
  {
    id: "v-0020",
    estudanteId: ID.estudanteA,
    cicloOrigemId: ID.ciclo2,
    numeroCiclo: 2,
    parametros: { maxLinhasPorBloco: 4, nivelVocabulario: "BASICO", interesseAncora: "dinossauros", formatoEnunciado: "ETAPA_UNICA", contrasteMinimo: 7, blocosPorMaterial: 8 },
    statusValidacao: "VIGENTE",
    validadorId: ID.profissional,
    dataVigencia: diasAtras(27),
    justificativaRevisao: null,
    createdAt: diasAtras(28),
  },
  {
    id: ID.versao3,
    estudanteId: ID.estudanteA,
    cicloOrigemId: ID.ciclo3,
    numeroCiclo: 3,
    parametros: PARAMETROS_CENARIO_A,
    statusValidacao: "VIGENTE",
    validadorId: ID.profissional,
    dataVigencia: diasAtras(13),
    justificativaRevisao: null,
    createdAt: diasAtras(14),
  },
];

export const TEXTO_CICLO_DA_AGUA = `O ciclo da água é o movimento contínuo da água na Terra. A água dos rios, lagos e oceanos evapora com o calor do sol e sobe para o céu em forma de vapor. Lá em cima, o vapor esfria e vira pequenas gotinhas, formando as nuvens. Quando as gotinhas ficam pesadas, caem como chuva, neve ou granizo. Essa água volta para os rios, para o solo e para os oceanos, e o ciclo recomeça.

Leia o texto acima e depois responda às perguntas com suas palavras.

Circule as palavras que você não conhece, em seguida escreva uma frase com cada uma delas.`;

const TEXTO_FRACOES = `Uma fração representa uma parte de um todo. Quando dividimos uma pizza em quatro pedaços iguais e comemos um pedaço, comemos um quarto da pizza. O número de cima se chama numerador e mostra quantas partes pegamos. O número de baixo se chama denominador e mostra em quantas partes o todo foi dividido.

Desenhe um retângulo, divida em oito partes iguais e depois pinte três partes.`;

export const MATERIAIS: Material[] = [
  {
    id: ID.materialAprovado,
    estudanteId: ID.estudanteA,
    versaoPerfilId: "v-0020",
    docenteId: ID.docente,
    titulo: "Ciências — O ciclo da água",
    textoOriginal: TEXTO_CICLO_DA_AGUA,
    textoAdaptado: adaptar(TEXTO_CICLO_DA_AGUA, VERSOES[1]!.parametros),
    textoRevisado: null,
    dataGeracao: diasAtras(20, 21),
    statusAprovacao: "APROVADO",
    iaAplicada: false,
    duracaoMs: 1840,
    hashTexto: "h-agua",
  },
  {
    id: ID.materialRascunho,
    estudanteId: ID.estudanteA,
    versaoPerfilId: ID.versao3,
    docenteId: ID.docente,
    titulo: "Matemática — Frações",
    textoOriginal: TEXTO_FRACOES,
    textoAdaptado: adaptar(TEXTO_FRACOES, PARAMETROS_CENARIO_A),
    textoRevisado: null,
    dataGeracao: diasAtras(1, 21),
    statusAprovacao: "RASCUNHO",
    iaAplicada: false,
    duracaoMs: 1210,
    hashTexto: "h-fracoes",
  },
];

export const DESFECHOS: Desfecho[] = [
  {
    id: "d-1",
    materialId: ID.materialAprovado,
    resultado: "ALCANCADO",
    observacaoLivre: "Terminou sozinho. A âncora de interesse funcionou.",
    dataRegistro: diasAtras(18, 11),
  },
];

export const NOTAS_CLINICAS: NotaClinica[] = [
  {
    id: "n-1",
    estudanteId: ID.estudanteA,
    profissionalId: ID.profissional,
    conteudo:
      "[Fictício] Hipótese de trabalho: sobrecarga sensorial em ambiente ruidoso precede a recusa de tarefa. Trabalhar antecipação de transições nas próximas 4 sessões.",
    dataRegistro: diasAtras(30),
  },
];

export const AUDITORIA: Auditoria[] = [
  { id: "a-1", entidade: "estudantes", entidadeId: ID.estudanteA, evento: "CADASTRO", autorId: ID.coordenacao, data: diasAtras(90), detalhes: {} },
  { id: "a-2", entidade: "consentimentos", entidadeId: "con-1", evento: "CONCESSAO", autorId: ID.responsavel, data: diasAtras(88), detalhes: { escopo: 3 } },
  { id: "a-3", entidade: "versoes_perfil", entidadeId: "v-0010", evento: "VALIDACAO", autorId: ID.profissional, data: diasAtras(41), detalhes: { numeroCiclo: 1 } },
  { id: "a-4", entidade: "versoes_perfil", entidadeId: "v-0020", evento: "VALIDACAO", autorId: ID.profissional, data: diasAtras(27), detalhes: { numeroCiclo: 2 } },
  { id: "a-5", entidade: "materiais_adaptados", entidadeId: ID.materialAprovado, evento: "APROVACAO_MATERIAL", autorId: ID.docente, data: diasAtras(20, 21), detalhes: {} },
  { id: "a-6", entidade: "versoes_perfil", entidadeId: ID.versao3, evento: "VALIDACAO", autorId: ID.profissional, data: diasAtras(13), detalhes: { numeroCiclo: 3 } },
];
