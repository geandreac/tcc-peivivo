/**
 * Tipos de domínio do app — espelham 1:1 as tabelas de
 * `supabase/migrations/0001_core_schema.sql` (+ revisões de `0004`, D-01…D-13),
 * em camelCase. `ParametrosAdaptacao` vem do motor (contrato único, CLAUDE.md).
 */
import type {
  DimensaoObservada,
  EscalaObservacao,
  ParametrosAdaptacao,
  TextoAdaptado,
} from "@pei-vivo/motor-adaptacao";

export type { DimensaoObservada, EscalaObservacao, ParametrosAdaptacao, TextoAdaptado };

export type Papel = "RESPONSAVEL" | "DOCENTE" | "PROFISSIONAL_SAUDE" | "COORDENACAO";
export type StatusConsentimento = "ATIVO" | "REVOGADO" | "EXPIRADO";
export type StatusValidacao = "PENDENTE" | "VIGENTE" | "EM_REVISAO" | "EXPIRADA" | "SUBSTITUIDA";
export type StatusAprovacao = "RASCUNHO" | "APROVADO" | "DESCARTADO";
export type StatusCiclo = "ABERTO" | "FECHADO";
export type StatusVinculo = "ATIVO" | "INATIVO";
export type ResultadoDesfecho = "ALCANCADO" | "PARCIAL" | "NAO_ALCANCADO";
export type EscopoConsentimento = "observacao_pedagogica" | "observacao_domiciliar" | "geracao_material";

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  /** D-08: só COORDENACAO usa. */
  papelInstitucional: Papel | null;
}

export interface Estudante {
  id: string;
  nome: string;
  dataNascimento: string; // ISO date
  turma: string | null;
  /** D-01: só a data; sem CID, sem descrição, sem arquivo. */
  laudoApresentadoEm: string | null;
  createdAt: string;
}

export interface Vinculo {
  id: string;
  usuarioId: string;
  estudanteId: string;
  papel: Papel;
  dataVinculo: string;
  status: StatusVinculo;
  registroConselho: string | null;
  /** Nome da pessoa vinculada (D-34: o responsável vê quem tem acesso ao filho). */
  nomeUsuario?: string;
}

export interface Consentimento {
  id: string;
  estudanteId: string;
  responsavelId: string;
  dataConcessao: string;
  escopo: EscopoConsentimento[];
  status: StatusConsentimento;
  dataRevogacao: string | null;
}

export interface Ciclo {
  id: string;
  estudanteId: string;
  numero: number;
  dataInicio: string;
  dataFim: string | null;
  status: StatusCiclo;
}

export interface ObservacaoRegistro {
  id: string;
  cicloId: string;
  numeroCiclo: number;
  autorId: string;
  /** D-04: origem = papel do autor no momento do insert. */
  papelAutor: Papel;
  dimensao: DimensaoObservada;
  valorEscala: EscalaObservacao;
  evidencia: string | null;
  dataRegistro: string;
}

export interface VersaoPerfil {
  id: string;
  estudanteId: string;
  cicloOrigemId: string | null;
  numeroCiclo: number;
  parametros: ParametrosAdaptacao;
  statusValidacao: StatusValidacao;
  validadorId: string | null;
  dataVigencia: string | null;
  justificativaRevisao: string | null;
  createdAt: string;
}

export interface Material {
  id: string;
  estudanteId: string;
  versaoPerfilId: string;
  docenteId: string;
  titulo: string;
  textoOriginal: string;
  /** Saída da camada determinística (serializada em `texto_adaptado`). */
  textoAdaptado: TextoAdaptado | null;
  /** Texto editado pelo docente na revisão (HU-D.04). */
  textoRevisado: string | null;
  dataGeracao: string;
  statusAprovacao: StatusAprovacao;
  iaAplicada: boolean;
  duracaoMs: number;
  hashTexto: string;
}

export interface Desfecho {
  id: string;
  materialId: string;
  resultado: ResultadoDesfecho;
  observacaoLivre: string | null;
  dataRegistro: string;
}

export interface NotaClinica {
  id: string;
  estudanteId: string;
  profissionalId: string;
  conteudo: string;
  dataRegistro: string;
}

export type EventoAuditoria =
  | "CONCESSAO"
  | "REVOGACAO"
  | "VALIDACAO"
  | "REVISAO_SOLICITADA"
  | "APROVACAO_MATERIAL"
  | "DESCARTE_MATERIAL"
  | "VINCULO_CRIADO"
  | "VINCULO_DESATIVADO"
  | "CICLO_FECHADO"
  | "EXPORTACAO"
  | "EXCLUSAO"
  | "CADASTRO"
  | "LEITURA_NOTA_CLINICA"
  | "NOTA_CLINICA_REGISTRADA";

export interface Auditoria {
  id: string;
  entidade: string;
  entidadeId: string;
  evento: EventoAuditoria;
  autorId: string | null;
  /** Nome de quem fez (a RPC fn_listar_auditoria já devolve; "Sistema" quando automático). */
  autorNome?: string;
  data: string;
  detalhes: Record<string, unknown>;
}

/** Diferença vigente → proposta, mostrada ao fechar o ciclo (HU-D.02). */
/** Contrato único com a Edge Function fechar-ciclo (D-31). */
export type { DiffParametro } from "@pei-vivo/contratos";
import type { DiffParametro } from "@pei-vivo/contratos";

export interface ResultadoFechamento {
  versao: VersaoPerfil;
  diff: DiffParametro[];
  modoPedagogico: boolean; // RN06
}

export interface Pendencia {
  versao: VersaoPerfil;
  estudante: Estudante;
  diasEmAberto: number;
}

export interface ExportacaoEstudante {
  geradoEm: string;
  estudante: Estudante;
  vinculos: Vinculo[];
  consentimentos: Consentimento[];
  ciclos: Ciclo[];
  observacoes: ObservacaoRegistro[];
  versoesPerfil: VersaoPerfil[];
  materiaisAprovados: Material[];
  desfechos: Desfecho[];
  auditoria: Auditoria[];
}
