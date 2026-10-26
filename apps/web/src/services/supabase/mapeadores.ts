/** Colunas explícitas (nunca `select *`, D-33) e conversão das linhas do banco (snake_case) para os tipos do app. */
import type { ParametrosAdaptacao, TextoAdaptado } from "@pei-vivo/motor-adaptacao";
import type { Linha } from "./infra";
import type { Consentimento, Ciclo, Desfecho, EscopoConsentimento, Estudante, EventoAuditoria, Material, Notificacao, ObservacaoRegistro, Papel, ResultadoDesfecho, VersaoPerfil, Vinculo } from "../tipos";

export const COL_ESTUDANTE = "id, nome, data_nascimento, turma, escola_id, created_at";
export const COL_VINCULO = "id, usuario_id, estudante_id, papel, data_vinculo, status, registro_conselho";
export const COL_CONSENT = "id, estudante_id, responsavel_id, data_concessao, escopos, versao_termo, status, data_revogacao";
export const COL_CICLO = "id, estudante_id, numero, data_inicio, data_fim, status";
export const COL_OBS = "id, ciclo_id, autor_id, papel_autor, dimensao, valor_escala, evidencia, data_registro";
export const COL_VERSAO = "id, estudante_id, ciclo_origem_id, numero_ciclo, parametros, status_validacao, validador_id, data_vigencia, justificativa, created_at";
export const COL_MATERIAL = "id, estudante_id, versao_perfil_id, docente_id, titulo, texto_original, texto_adaptado, texto_revisado, data_geracao, status_aprovacao, ia_aplicada, hash_texto";
export const COL_DESFECHO = "id, material_id, resultado, observacao_livre, data_registro";
export const COL_NOTIF = "id, usuario_id, tipo, estudante_id, criada_em, lida_em";

const s = (v: unknown) => (v === null || v === undefined ? null : String(v));

export const paraEstudante = (r: Linha, laudo: string | null = null): Estudante => ({
  id: String(r.id),
  nome: String(r.nome),
  dataNascimento: String(r.data_nascimento),
  turma: s(r.turma),
  laudoApresentadoEm: laudo,
  createdAt: String(r.created_at),
});
export const paraVinculo = (r: Linha): Vinculo => ({
  id: String(r.id),
  usuarioId: String(r.usuario_id),
  estudanteId: String(r.estudante_id),
  papel: r.papel as Papel,
  dataVinculo: String(r.data_vinculo),
  status: r.status as Vinculo["status"],
  registroConselho: s(r.registro_conselho),
  ...(r.usuarios ? { nomeUsuario: String((r.usuarios as Linha).nome) } : {}),
});
export const paraConsentimento = (r: Linha): Consentimento => ({
  id: String(r.id),
  estudanteId: String(r.estudante_id),
  responsavelId: String(r.responsavel_id),
  dataConcessao: String(r.data_concessao),
  escopo: (r.escopos as EscopoConsentimento[]) ?? [],
  status: r.status as Consentimento["status"],
  dataRevogacao: s(r.data_revogacao),
});
export const paraCiclo = (r: Linha): Ciclo => ({
  id: String(r.id),
  estudanteId: String(r.estudante_id),
  numero: Number(r.numero),
  dataInicio: String(r.data_inicio),
  dataFim: s(r.data_fim),
  status: r.status as Ciclo["status"],
});
export const paraObservacao = (r: Linha): ObservacaoRegistro => ({
  id: String(r.id),
  cicloId: String(r.ciclo_id),
  numeroCiclo: Number((r.ciclos_observacao as Linha | undefined)?.numero ?? 0),
  autorId: String(r.autor_id),
  papelAutor: r.papel_autor as Papel,
  dimensao: r.dimensao as ObservacaoRegistro["dimensao"],
  valorEscala: r.valor_escala as ObservacaoRegistro["valorEscala"],
  evidencia: s(r.evidencia),
  dataRegistro: String(r.data_registro),
});
export const paraVersao = (r: Linha): VersaoPerfil => ({
  id: String(r.id),
  estudanteId: String(r.estudante_id),
  cicloOrigemId: s(r.ciclo_origem_id),
  numeroCiclo: Number(r.numero_ciclo),
  parametros: r.parametros as ParametrosAdaptacao,
  statusValidacao: r.status_validacao as VersaoPerfil["statusValidacao"],
  validadorId: s(r.validador_id),
  dataVigencia: s(r.data_vigencia),
  justificativaRevisao: s(r.justificativa),
  createdAt: String(r.created_at),
});
export const paraMaterial = (r: Linha, duracaoMs = 0): Material => ({
  id: String(r.id),
  estudanteId: String(r.estudante_id),
  versaoPerfilId: String(r.versao_perfil_id),
  docenteId: String(r.docente_id),
  titulo: String(r.titulo),
  textoOriginal: String(r.texto_original),
  textoAdaptado: (r.texto_adaptado as TextoAdaptado | null) ?? null,
  textoRevisado: s(r.texto_revisado),
  dataGeracao: String(r.data_geracao),
  statusAprovacao: r.status_aprovacao as Material["statusAprovacao"],
  iaAplicada: Boolean(r.ia_aplicada),
  duracaoMs,
  hashTexto: String(r.hash_texto ?? ""),
});
export const paraDesfecho = (r: Linha): Desfecho => ({
  id: String(r.id),
  materialId: String(r.material_id),
  resultado: r.resultado as ResultadoDesfecho,
  observacaoLivre: s(r.observacao_livre),
  dataRegistro: String(r.data_registro),
});
export const paraNotificacao = (r: Linha): Notificacao => ({
  id: String(r.id),
  usuarioId: String(r.usuario_id),
  tipo: r.tipo as Notificacao["tipo"],
  estudanteId: s(r.estudante_id),
  criadaEm: String(r.criada_em),
  lidaEm: s(r.lida_em),
});

/** Eventos do banco (0005–0007) → vocabulário de eventos do app. */
export const EVENTO_DO_BANCO: Record<string, EventoAuditoria> = {
  ESTUDANTE_CADASTRADO: "CADASTRO",
  CONSENTIMENTO_CONCEDIDO: "CONCESSAO",
  CONSENTIMENTO_REVOGADO: "REVOGACAO",
  VERSAO_VALIDADA: "VALIDACAO",
  VERSAO_REVISAO_SOLICITADA: "REVISAO_SOLICITADA",
  MATERIAL_APROVADO: "APROVACAO_MATERIAL",
  MATERIAL_DESCARTADO: "DESCARTE_MATERIAL",
  VINCULO_CRIADO: "VINCULO_CRIADO",
  VINCULO_PROPOSTO: "VINCULO_PROPOSTO",
  VINCULO_CONFIRMADO: "VINCULO_CONFIRMADO",
  VINCULO_RECUSADO: "VINCULO_RECUSADO",
  VINCULO_ENCERRADO: "VINCULO_DESATIVADO",
  CICLO_FECHADO: "CICLO_FECHADO",
  LEITURA_NOTA_CLINICA: "LEITURA_NOTA_CLINICA",
  NOTA_CLINICA_REGISTRADA: "NOTA_CLINICA_REGISTRADA",
  VERSAO_PROPOSTA: "VERSAO_PROPOSTA",
  VERSAO_AJUSTADA: "VERSAO_AJUSTADA",
  VERSAO_VIGENTE_SEM_VALIDACAO: "VERSAO_VIGENTE_SEM_VALIDACAO",
  VERSAO_EXPIRADA: "VERSAO_EXPIRADA",
  REGISTRO_VERIFICADO: "REGISTRO_VERIFICADO",
};
