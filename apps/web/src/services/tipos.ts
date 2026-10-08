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
/** D-24/D-36: profissional proposto pela coordenação aguarda a família. */
export type StatusVinculo = "PENDENTE_RESPONSAVEL" | "ATIVO" | "RECUSADO" | "ENCERRADO";
export type ResultadoDesfecho = "ALCANCADO" | "PARCIAL" | "NAO_ALCANCADO";
/** D-27: escopos com efeito real (validacao_clinica habilita profissional e IA, RN06). */
export type EscopoConsentimento = "observacao_pedagogica" | "observacao_domiciliar" | "validacao_clinica" | "geracao_material";

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  /** D-08/D-23: COORDENACAO quando a pessoa coordena alguma escola. */
  papelInstitucional: Papel | null;
  /** D-23: escola que a pessoa coordena (usada no cadastro de estudante). */
  escolaId?: string | null;
  /** D-32: profissional de saúde e coordenação só operam com segundo fator (aal2). */
  exigeSegundoFator?: boolean;
}

/** D-32: nível de garantia da sessão (Supabase Auth). */
export type NivelSessao = "aal1" | "aal2";

export interface ResultadoEntrada {
  usuario: Usuario;
  /** Precisa do código do aplicativo autenticador antes de continuar. */
  exigeSegundoFator: boolean;
  /** Já tem um fator cadastrado (só verificar) ou precisa cadastrar o primeiro. */
  temFatorCadastrado: boolean;
}

export interface CadastroSegundoFator {
  fatorId: string;
  /** Imagem do QR code (data URL SVG) para o aplicativo autenticador. */
  qrCode: string;
  /** Mesmo segredo em texto, para quem não consegue usar a câmera (alternativa acessível). */
  segredo: string;
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
  | "NOTA_CLINICA_REGISTRADA"
  | "VINCULO_PROPOSTO"
  | "VINCULO_CONFIRMADO"
  | "VINCULO_RECUSADO"
  | "VERSAO_PROPOSTA"
  | "VERSAO_AJUSTADA"
  | "VERSAO_VIGENTE_SEM_VALIDACAO"
  | "VERSAO_EXPIRADA"
  | "REGISTRO_VERIFICADO";

/**
 * R4.5 — painel da escola (coordenação): só contagens e motivos de pendência.
 * Nenhum conteúdo de observação, nota, perfil ou material (prompt §6.5).
 */
export type MotivoPendenciaEscola = "SEM_CONSENTIMENTO" | "SEM_PROFISSIONAL" | "VALIDACAO_ATRASADA" | "CICLO_PARADO";
export interface ResumoEscola {
  totalEstudantes: number;
  comConsentimento: number;
  semConsentimento: number;
  semProfissional: number;
  validacoesAtrasadas: number;
  ciclosParados: number;
  pendencias: { estudanteId: string; nome: string; motivo: MotivoPendenciaEscola; desde: string | null }[];
}

/** D-28: conteúdo tipado — a frase é montada pelo app (utils/rotulos), sem texto livre. */
export type TipoNotificacao =
  | "CONSENTIMENTO_CONCEDIDO"
  | "CONSENTIMENTO_REVOGADO"
  | "PROFISSIONAL_AGUARDANDO_CONFIRMACAO"
  | "VINCULO_ATIVADO"
  | "VALIDACAO_PENDENTE"
  | "REVISAO_SOLICITADA"
  | "VALIDACAO_EXPIRADA";

export interface Notificacao {
  id: string;
  usuarioId: string;
  tipo: TipoNotificacao;
  estudanteId: string | null;
  criadaEm: string;
  lidaEm: string | null;
}

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
