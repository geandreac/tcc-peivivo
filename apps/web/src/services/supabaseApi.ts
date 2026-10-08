/**
 * Implementação REAL de `PeiVivoApi` (R2.3/R3.5): Supabase Auth + PostgREST +
 * Edge Functions. Nenhuma tela muda (D-17): o contrato é o mesmo do mock.
 *
 * Regras desta camada:
 * - Quem decide permissão é o banco (RLS/RPC, migrations 0004–0007). Aqui só
 *   se traduz SQLSTATE → `ErroApi` com o mesmo código que o mock usa.
 * - NUNCA `select *`: estudantes, consentimentos e usuarios têm GRANT por
 *   coluna (D-33) e `*` é negado. Toda consulta lista as colunas.
 * - Gerar material e fechar ciclo passam pelas Edge Functions (D-37); o
 *   restante, por RPCs `fn_*` ou tabelas com RLS.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { calcularFechamento } from "@pei-vivo/funcoes";
import type { CorpoErro, RespostaFecharCiclo, RespostaGerarMaterial } from "@pei-vivo/contratos";
import type { ObservacaoHistorica, ParametrosAdaptacao, TextoAdaptado } from "@pei-vivo/motor-adaptacao";
import type { NovaObservacao, NovoConvite, NovoEstudante, NovoVinculo, PeiVivoApi, RespostaConvite } from "./api";
import { ErroApi, type CodigoErro } from "./erros";
import type {
  Auditoria,
  Ciclo,
  Consentimento,
  Desfecho,
  EscopoConsentimento,
  Estudante,
  EventoAuditoria,
  Material,
  NotaClinica,
  Notificacao,
  ObservacaoRegistro,
  Papel,
  Pendencia,
  ResultadoDesfecho,
  ResumoEscola,
  Usuario,
  VersaoPerfil,
  Vinculo,
} from "./tipos";

/** Versão do termo de consentimento e de uso apresentada nesta versão do app. */
export const VERSAO_TERMO = "v1-2026-10";

// ------------------------------------------------------------------ colunas (nunca *)
const COL_ESTUDANTE = "id, nome, data_nascimento, turma, escola_id, created_at";
const COL_VINCULO = "id, usuario_id, estudante_id, papel, data_vinculo, status, registro_conselho";
const COL_CONSENT = "id, estudante_id, responsavel_id, data_concessao, escopos, versao_termo, status, data_revogacao";
const COL_CICLO = "id, estudante_id, numero, data_inicio, data_fim, status";
const COL_OBS = "id, ciclo_id, autor_id, papel_autor, dimensao, valor_escala, evidencia, data_registro";
const COL_VERSAO = "id, estudante_id, ciclo_origem_id, numero_ciclo, parametros, status_validacao, validador_id, data_vigencia, justificativa, created_at";
const COL_MATERIAL = "id, estudante_id, versao_perfil_id, docente_id, titulo, texto_original, texto_adaptado, texto_revisado, data_geracao, status_aprovacao, ia_aplicada, hash_texto";
const COL_DESFECHO = "id, material_id, resultado, observacao_livre, data_registro";
const COL_NOTIF = "id, usuario_id, tipo, estudante_id, criada_em, lida_em";

// ------------------------------------------------------------------ erros
interface ErroPostgrest {
  code?: string;
  message?: string;
  status?: number;
  name?: string;
}

/** SQLSTATE / PostgREST / Auth → código estável do app (mesma tabela de `deErroBanco`). */
export function traduzirErro(e: unknown): ErroApi {
  if (e instanceof ErroApi) return e;
  const { code, message = "", status, name } = (e ?? {}) as ErroPostgrest;
  const msg = message.split("\n")[0] ?? "";
  if (name === "TypeError" || /fetch|network/iu.test(msg)) return new ErroApi("REDE", "Falha de rede.");
  if (code === "42501") return new ErroApi("NEGADO", msg || "Seu perfil não tem permissão para esta ação.");
  if (code === "PT409" || code === "23505") return new ErroApi("CONFLITO", msg || "A situação mudou; recarregue e tente de novo.");
  if (code === "22023" || code === "23514" || code === "22P02") return new ErroApi("VALIDACAO", msg || "Dados inválidos.");
  if (code === "PGRST116") return new ErroApi("NAO_ENCONTRADO", "Não encontrado.");
  if (code === "PGRST301" || code === "PGRST302" || status === 401) return new ErroApi("NAO_AUTENTICADO", "Entre para continuar.");
  return new ErroApi("REDE", "Algo deu errado do nosso lado. Tente de novo em instantes.");
}

async function exec<T>(p: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  let r: { data: T | null; error: unknown };
  try {
    r = await p;
  } catch (e) {
    throw traduzirErro(e);
  }
  if (r.error) throw traduzirErro(r.error);
  return r.data as T;
}

// ------------------------------------------------------------------ mapeamentos (snake → camel)
type Linha = Record<string, unknown>;
const s = (v: unknown) => (v === null || v === undefined ? null : String(v));

const paraEstudante = (r: Linha, laudo: string | null = null): Estudante => ({
  id: String(r.id),
  nome: String(r.nome),
  dataNascimento: String(r.data_nascimento),
  turma: s(r.turma),
  laudoApresentadoEm: laudo,
  createdAt: String(r.created_at),
});
const paraVinculo = (r: Linha): Vinculo => ({
  id: String(r.id),
  usuarioId: String(r.usuario_id),
  estudanteId: String(r.estudante_id),
  papel: r.papel as Papel,
  dataVinculo: String(r.data_vinculo),
  status: r.status as Vinculo["status"],
  registroConselho: s(r.registro_conselho),
  ...(r.usuarios ? { nomeUsuario: String((r.usuarios as Linha).nome) } : {}),
});
const paraConsentimento = (r: Linha): Consentimento => ({
  id: String(r.id),
  estudanteId: String(r.estudante_id),
  responsavelId: String(r.responsavel_id),
  dataConcessao: String(r.data_concessao),
  escopo: (r.escopos as EscopoConsentimento[]) ?? [],
  status: r.status as Consentimento["status"],
  dataRevogacao: s(r.data_revogacao),
});
const paraCiclo = (r: Linha): Ciclo => ({
  id: String(r.id),
  estudanteId: String(r.estudante_id),
  numero: Number(r.numero),
  dataInicio: String(r.data_inicio),
  dataFim: s(r.data_fim),
  status: r.status as Ciclo["status"],
});
const paraObservacao = (r: Linha): ObservacaoRegistro => ({
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
const paraVersao = (r: Linha): VersaoPerfil => ({
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
const paraMaterial = (r: Linha, duracaoMs = 0): Material => ({
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
const paraDesfecho = (r: Linha): Desfecho => ({
  id: String(r.id),
  materialId: String(r.material_id),
  resultado: r.resultado as ResultadoDesfecho,
  observacaoLivre: s(r.observacao_livre),
  dataRegistro: String(r.data_registro),
});
const paraNotificacao = (r: Linha): Notificacao => ({
  id: String(r.id),
  usuarioId: String(r.usuario_id),
  tipo: r.tipo as Notificacao["tipo"],
  estudanteId: s(r.estudante_id),
  criadaEm: String(r.criada_em),
  lidaEm: s(r.lida_em),
});

/** Eventos do banco (0005–0007) → vocabulário de eventos do app. */
const EVENTO_DO_BANCO: Record<string, EventoAuditoria> = {
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

interface PerfilSessao {
  id: string;
  nome: string;
  email: string;
  escolaCoordenada: string | null;
  exigeSegundoFator: boolean;
}

// ------------------------------------------------------------------ fábrica
export function criarSupabaseApi(sb: SupabaseClient): PeiVivoApi {
  let perfil: PerfilSessao | null = null;

  const paraUsuario = (p: PerfilSessao): Usuario => ({
    id: p.id,
    nome: p.nome,
    email: p.email,
    papelInstitucional: p.escolaCoordenada ? "COORDENACAO" : null,
    escolaId: p.escolaCoordenada,
    exigeSegundoFator: p.exigeSegundoFator,
  });

  async function carregarPerfil(): Promise<PerfilSessao | null> {
    const { data } = await sb.auth.getSession();
    if (!data.session) {
      perfil = null;
      return null;
    }
    perfil = await exec(sb.rpc("fn_meu_perfil"));
    return perfil;
  }

  function eu(): PerfilSessao {
    if (!perfil) throw new ErroApi("NAO_AUTENTICADO", "Entre para continuar.");
    return perfil;
  }

  async function nivel(): Promise<{ atual: "aal1" | "aal2"; temFatorCadastrado: boolean }> {
    const [{ data: aal }, { data: fatores }] = await Promise.all([sb.auth.mfa.getAuthenticatorAssuranceLevel(), sb.auth.mfa.listFactors()]);
    return { atual: aal?.currentLevel === "aal2" ? "aal2" : "aal1", temFatorCadastrado: (fatores?.totp ?? []).some((f) => f.status === "verified") };
  }

  /** Chama uma Edge Function e traduz o corpo de erro padronizado ({ erro: { codigo, mensagem } }). */
  async function funcao<T>(nome: string, corpo: Record<string, unknown>): Promise<T> {
    const { data, error } = await sb.functions.invoke<T>(nome, { body: corpo });
    if (!error) return data as T;
    const resposta = (error as { context?: Response }).context;
    if (resposta && typeof resposta.json === "function") {
      try {
        const { erro } = (await resposta.json()) as CorpoErro;
        const mapa: Record<string, CodigoErro> = { NEGADO: "NEGADO", CONFLITO: "CONFLITO", VALIDACAO: "VALIDACAO", NAO_AUTENTICADO: "NAO_AUTENTICADO", INTERNO: "REDE" };
        throw new ErroApi(mapa[erro.codigo] ?? "REDE", erro.mensagem);
      } catch (e) {
        if (e instanceof ErroApi) throw e;
      }
    }
    throw new ErroApi("REDE", "Não foi possível falar com o servidor.");
  }

  async function meuPapel(estudanteId: string): Promise<Papel | null> {
    const papel = await exec<Papel | null>(sb.rpc("fn_meu_papel", { p_estudante: estudanteId }));
    if (papel) return papel;
    const p = perfil;
    if (!p?.escolaCoordenada) return null;
    const e = await exec<Linha | null>(sb.from("estudantes").select("escola_id").eq("id", estudanteId).maybeSingle());
    return e && e.escola_id === p.escolaCoordenada ? "COORDENACAO" : null;
  }

  async function obterVersao(id: string): Promise<VersaoPerfil> {
    return paraVersao(await exec<Linha>(sb.from("versoes_perfil").select(COL_VERSAO).eq("id", id).single()));
  }
  async function obterVinculo(id: string): Promise<Vinculo> {
    return paraVinculo(await exec<Linha>(sb.from("vinculos_usuario_estudante").select(COL_VINCULO).eq("id", id).single()));
  }

  const api: PeiVivoApi = {
    modo: "real",

    // ---- sessão (modo demonstração não existe aqui)
    listarPerfisDemo: async () => [],
    entrar: async () => {
      throw new ErroApi("VALIDACAO", "No sistema real, entre com e-mail e senha.");
    },
    sair: async () => {
      perfil = null;
      await sb.auth.signOut({ scope: "local" });
    },
    sairDeTodos: async () => {
      perfil = null;
      await sb.auth.signOut({ scope: "global" });
    },
    usuarioAtual: () => (perfil ? paraUsuario(perfil) : null),
    carregarSessao: async () => {
      const p = await carregarPerfil();
      return p ? paraUsuario(p) : null;
    },
    entrarComSenha: async (email, senha) => {
      const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password: senha });
      // mensagem genérica: não revela se o e-mail existe (prompt §4.1)
      if (error) throw new ErroApi("NAO_AUTENTICADO", "E-mail ou senha incorretos.");
      const p = await carregarPerfil();
      if (!p) {
        await sb.auth.signOut({ scope: "local" });
        throw new ErroApi("NEGADO", "Sua conta ainda não foi liberada pela escola.");
      }
      const n = await nivel();
      return { usuario: paraUsuario(p), exigeSegundoFator: p.exigeSegundoFator && n.atual !== "aal2", temFatorCadastrado: n.temFatorCadastrado };
    },
    nivelSessao: () => nivel(),
    iniciarCadastroSegundoFator: async () => {
      const { data, error } = await sb.auth.mfa.enroll({ factorType: "totp", friendlyName: `PEI Vivo ${new Date().toISOString().slice(0, 10)}` });
      if (error || !data || data.type !== "totp") throw new ErroApi("REDE", "Não foi possível iniciar o cadastro do código. Tente de novo.");
      return { fatorId: data.id, qrCode: data.totp.qr_code, segredo: data.totp.secret };
    },
    verificarSegundoFator: async (codigo, fatorId) => {
      let id = fatorId;
      if (!id) {
        const { data } = await sb.auth.mfa.listFactors();
        id = (data?.totp ?? []).find((f) => f.status === "verified")?.id;
      }
      if (!id) throw new ErroApi("CONFLITO", "Cadastre o aplicativo autenticador primeiro.");
      const { error } = await sb.auth.mfa.challengeAndVerify({ factorId: id, code: codigo.replace(/\D/gu, "") });
      if (error) throw new ErroApi("VALIDACAO", "Código incorreto ou expirado. Confira o código mais recente no aplicativo.");
    },
    pedirRecuperacaoSenha: async (email) => {
      // sempre "ok": não revela se o e-mail existe
      await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${globalThis.location?.origin ?? ""}/redefinir-senha` });
    },
    definirSenha: async (novaSenha, versaoTermosAceita) => {
      const { error } = await sb.auth.updateUser({ password: novaSenha });
      if (error) throw new ErroApi("VALIDACAO", error.message.includes("characters") ? "A senha precisa ter pelo menos 10 caracteres." : "Não foi possível definir a senha.");
      if (versaoTermosAceita) await exec(sb.rpc("fn_aceitar_termos", { p_versao: versaoTermosAceita }));
      await carregarPerfil();
    },

    // ---- estudantes e vínculos
    listarEstudantes: async () => {
      const linhas = await exec<Linha[]>(sb.from("estudantes").select(COL_ESTUDANTE).order("nome"));
      return linhas.map((r) => paraEstudante(r));
    },
    obterEstudante: async (id) => {
      const r = await exec<Linha | null>(sb.from("estudantes").select(COL_ESTUDANTE).eq("id", id).maybeSingle());
      if (!r) throw new ErroApi("NEGADO", "Você não está vinculado a este estudante.");
      let laudo: string | null = null;
      try {
        laudo = await exec<string | null>(sb.rpc("fn_laudo_apresentado_em", { p_estudante: id }));
      } catch (e) {
        if (!(e instanceof ErroApi && e.codigo === "NEGADO")) throw e; // docente: a data não existe para ele (D-01)
      }
      return paraEstudante(r, laudo);
    },
    meuPapel,
    listarVinculos: async (estudanteId) => {
      const linhas = await exec<Linha[]>(
        sb.from("vinculos_usuario_estudante").select(`${COL_VINCULO}, usuarios!vinculos_usuario_estudante_usuario_id_fkey(nome)`).eq("estudante_id", estudanteId).order("data_vinculo"),
      );
      return linhas.map(paraVinculo);
    },
    listarUsuarios: async () => {
      if (!eu().escolaCoordenada) throw new ErroApi("NEGADO", "Só a coordenação lista usuários.");
      const linhas = await exec<Linha[]>(sb.from("usuarios").select("id, nome").order("nome"));
      return linhas.filter((u) => u.id !== eu().id).map((u) => ({ id: String(u.id), nome: String(u.nome), email: "", papelInstitucional: null }));
    },
    cadastrarEstudante: async (dados: NovoEstudante) => {
      const escola = eu().escolaCoordenada;
      if (!escola) throw new ErroApi("NEGADO", "Só a coordenação cadastra estudantes.");
      const id = await exec<string>(
        sb.rpc("fn_cadastrar_estudante", {
          p_escola: escola,
          p_nome: dados.nome,
          p_data_nascimento: dados.dataNascimento,
          p_turma: dados.turma ?? null,
          p_laudo_apresentado_em: dados.laudoApresentadoEm || null,
        }),
      );
      return api.obterEstudante(id);
    },
    vincular: async (dados: NovoVinculo) => {
      const id = await exec<string>(
        sb.rpc("fn_propor_vinculo", {
          p_estudante: dados.estudanteId,
          p_usuario: dados.usuarioId,
          p_papel: dados.papel,
          p_registro_conselho: dados.registroConselho?.trim() || null,
          p_conferido_presencialmente: Boolean(dados.conferidoPresencialmente),
        }),
      );
      return obterVinculo(id);
    },
    desativarVinculo: async (vinculoId) => {
      await exec(sb.rpc("fn_encerrar_vinculo", { p_vinculo: vinculoId }));
    },
    confirmarVinculo: async (vinculoId, aceitar) => {
      await exec(sb.rpc("fn_confirmar_vinculo", { p_vinculo: vinculoId, p_aceitar: aceitar }));
      return obterVinculo(vinculoId);
    },

    convidar: async (dados: NovoConvite) => {
      const escola = eu().escolaCoordenada;
      if (!escola) throw new ErroApi("NEGADO", "Só a coordenação da escola convida pessoas.");
      return funcao<RespostaConvite>("convidar", {
        escolaId: escola,
        email: dados.email,
        nome: dados.nome ?? "",
        papel: dados.papel,
        estudanteId: dados.estudanteId ?? null,
        registroConselho: dados.registroConselho?.trim() || null,
        conferidoPresencialmente: Boolean(dados.conferidoPresencialmente),
      });
    },

    // ---- notificações
    listarNotificacoes: async () => (await exec<Linha[]>(sb.from("notificacoes").select(COL_NOTIF).order("criada_em", { ascending: false }))).map(paraNotificacao),
    marcarNotificacoesLidas: async (ids) => {
      let q = sb.from("notificacoes").update({ lida_em: new Date().toISOString() }).is("lida_em", null);
      if (ids) q = q.in("id", ids);
      await exec(q);
    },

    // ---- consentimento
    obterConsentimento: async (estudanteId) => {
      const r = await exec<Linha | null>(
        sb.from("consentimentos").select(COL_CONSENT).eq("estudante_id", estudanteId).order("data_concessao", { ascending: false }).limit(1).maybeSingle(),
      );
      return r ? paraConsentimento(r) : null;
    },
    concederConsentimento: async (estudanteId, escopo) => {
      const id = await exec<string>(
        sb.rpc("fn_conceder_consentimento", { p_estudante: estudanteId, p_escopos: escopo, p_versao_termo: VERSAO_TERMO, p_user_agent: globalThis.navigator?.userAgent ?? null }),
      );
      return paraConsentimento(await exec<Linha>(sb.from("consentimentos").select(COL_CONSENT).eq("id", id).single()));
    },
    revogarConsentimento: async (estudanteId) => {
      const id = await exec<string>(sb.rpc("fn_revogar_consentimento", { p_estudante: estudanteId }));
      return paraConsentimento(await exec<Linha>(sb.from("consentimentos").select(COL_CONSENT).eq("id", id).single()));
    },

    // ---- ciclos e observações
    listarCiclos: async (estudanteId) => (await exec<Linha[]>(sb.from("ciclos_observacao").select(COL_CICLO).eq("estudante_id", estudanteId).order("numero"))).map(paraCiclo),
    obterCicloAberto: async (estudanteId) => {
      const r = await exec<Linha | null>(sb.from("ciclos_observacao").select(COL_CICLO).eq("estudante_id", estudanteId).eq("status", "ABERTO").maybeSingle());
      return r ? paraCiclo(r) : null;
    },
    abrirCiclo: async (estudanteId) => {
      const aberto = await api.obterCicloAberto(estudanteId);
      if (aberto) return aberto;
      return paraCiclo(await exec<Linha>(sb.from("ciclos_observacao").insert({ estudante_id: estudanteId }).select(COL_CICLO).single()));
    },
    listarObservacoes: async (estudanteId) => {
      const linhas = await exec<Linha[]>(
        sb.from("observacoes").select(`${COL_OBS}, ciclos_observacao!inner(numero, estudante_id)`).eq("ciclos_observacao.estudante_id", estudanteId).order("data_registro", { ascending: false }),
      );
      return linhas.map(paraObservacao);
    },
    registrarObservacao: async (cicloId, dados: NovaObservacao) => {
      const r = await exec<Linha>(
        sb
          .from("observacoes")
          .insert({ ciclo_id: cicloId, dimensao: dados.dimensao, valor_escala: dados.valorEscala, evidencia: dados.evidencia?.trim() || null })
          .select(`${COL_OBS}, ciclos_observacao(numero)`)
          .single(),
      );
      return paraObservacao(r);
    },

    // ---- versões de perfil
    listarVersoes: async (estudanteId) =>
      (await exec<Linha[]>(sb.from("versoes_perfil").select(COL_VERSAO).eq("estudante_id", estudanteId).order("numero_ciclo", { ascending: false }).order("created_at", { ascending: false }))).map(paraVersao),
    obterVersaoVigente: async (estudanteId) => {
      const r = await exec<Linha | null>(sb.from("versoes_perfil").select(COL_VERSAO).eq("estudante_id", estudanteId).eq("status_validacao", "VIGENTE").maybeSingle());
      return r ? paraVersao(r) : null;
    },
    preverFechamento: async (cicloId) => {
      // Mesmo cálculo da Edge Function (packages/funcoes), sem gravar nada.
      const d = await exec<{ estudanteId: string; numeroCiclo: number; vigente: { parametros: ParametrosAdaptacao } | null; validacaoClinica: boolean; historico: ObservacaoHistorica[] }>(
        sb.rpc("fn_dados_fechamento", { p_ciclo: cicloId }),
      );
      const { proposta, diff } = calcularFechamento(d.numeroCiclo, d.vigente?.parametros ?? null, d.historico);
      const versao: VersaoPerfil = {
        id: "previa",
        estudanteId: d.estudanteId,
        cicloOrigemId: cicloId,
        numeroCiclo: d.numeroCiclo,
        parametros: proposta,
        statusValidacao: d.validacaoClinica ? "PENDENTE" : "VIGENTE",
        validadorId: null,
        dataVigencia: null,
        justificativaRevisao: null,
        createdAt: new Date().toISOString(),
      };
      return { versao, diff, modoPedagogico: !d.validacaoClinica };
    },
    fecharCiclo: async (cicloId) => {
      const r = await funcao<RespostaFecharCiclo>("fechar-ciclo", { cicloId });
      return { versao: await obterVersao(r.versaoId), diff: r.diff, modoPedagogico: r.modoPedagogico };
    },
    validarVersao: async (versaoId, decisao, justificativa) => {
      const id = await exec<string>(
        sb.rpc("fn_validar_versao", { p_versao: versaoId, p_decisao: decisao === "APROVAR" ? "APROVAR" : "REVISAO", p_justificativa: justificativa?.trim() || null }),
      );
      return obterVersao(id);
    },
    listarPendencias: async () => {
      const linhas = await exec<Linha[]>(
        sb.from("versoes_perfil").select(`${COL_VERSAO}, estudantes(${COL_ESTUDANTE})`).in("status_validacao", ["PENDENTE", "EM_REVISAO", "EXPIRADA"]).order("created_at"),
      );
      const agora = Date.now();
      return linhas
        .filter((r) => r.estudantes)
        .map(
          (r): Pendencia => ({
            versao: paraVersao(r),
            estudante: paraEstudante(r.estudantes as Linha),
            diasEmAberto: Math.floor((agora - new Date(String(r.created_at)).getTime()) / 86_400_000),
          }),
        )
        .sort((a, b) => b.diasEmAberto - a.diasEmAberto);
    },
    resumoEscola: async () => {
      const escola = eu().escolaCoordenada;
      if (!escola) throw new ErroApi("NEGADO", "O painel da escola é da coordenação pedagógica.");
      const [estudantes, consents, vinculos, versoes, ciclos] = await Promise.all([
        exec<Linha[]>(sb.from("estudantes").select("id, nome, created_at").eq("escola_id", escola)),
        exec<Linha[]>(sb.from("consentimentos").select("estudante_id, status")),
        exec<Linha[]>(sb.from("vinculos_usuario_estudante").select("estudante_id, papel, status")),
        exec<Linha[]>(sb.from("versoes_perfil").select("estudante_id, status_validacao, created_at")),
        exec<Linha[]>(sb.from("ciclos_observacao").select("id, estudante_id, status, data_inicio, observacoes(id)").eq("status", "ABERTO")),
      ]);
      const dia = 86_400_000;
      const r: ResumoEscola = { totalEstudantes: estudantes.length, comConsentimento: 0, semConsentimento: 0, semProfissional: 0, validacoesAtrasadas: 0, ciclosParados: 0, pendencias: [] };
      for (const e of estudantes) {
        const id = String(e.id);
        const add = (motivo: ResumoEscola["pendencias"][number]["motivo"], desde: string | null) => r.pendencias.push({ estudanteId: id, nome: String(e.nome), motivo, desde });
        if (!consents.some((c) => c.estudante_id === id && c.status === "ATIVO")) {
          r.semConsentimento++;
          add("SEM_CONSENTIMENTO", String(e.created_at));
          continue;
        }
        r.comConsentimento++;
        if (!vinculos.some((v) => v.estudante_id === id && v.papel === "PROFISSIONAL_SAUDE" && v.status === "ATIVO")) {
          r.semProfissional++;
          add("SEM_PROFISSIONAL", null);
        }
        const atrasada = versoes.find(
          (v) => v.estudante_id === id && (v.status_validacao === "EXPIRADA" || (v.status_validacao === "PENDENTE" && Date.now() - new Date(String(v.created_at)).getTime() >= 5 * dia)),
        );
        if (atrasada) {
          r.validacoesAtrasadas++;
          add("VALIDACAO_ATRASADA", String(atrasada.created_at));
        }
        const aberto = ciclos.find((c) => c.estudante_id === id);
        if (aberto && Date.now() - new Date(String(aberto.data_inicio)).getTime() > 15 * dia && ((aberto.observacoes as unknown[]) ?? []).length === 0) {
          r.ciclosParados++;
          add("CICLO_PARADO", String(aberto.data_inicio));
        }
      }
      return r;
    },

    // ---- materiais
    listarMateriais: async (estudanteId) =>
      (await exec<Linha[]>(sb.from("materiais_adaptados").select(COL_MATERIAL).eq("estudante_id", estudanteId).order("data_geracao", { ascending: false }))).map((r) => paraMaterial(r)),
    obterMaterial: async (id) => {
      const r = await exec<Linha | null>(sb.from("materiais_adaptados").select(COL_MATERIAL).eq("id", id).maybeSingle());
      if (!r) throw new ErroApi("NAO_ENCONTRADO", "Material não encontrado.");
      return paraMaterial(r);
    },
    gerarMaterial: async (estudanteId, titulo, texto) => {
      const r = await funcao<RespostaGerarMaterial>("gerar-material", { estudanteId, titulo, texto });
      const m = await api.obterMaterial(r.materialId);
      return { ...m, duracaoMs: r.duracaoMs };
    },
    aprovarMaterial: async (id, textoRevisado) => {
      await exec(sb.rpc("fn_decidir_material", { p_material: id, p_decisao: "APROVAR", p_texto_revisado: textoRevisado?.trim() || null }));
      return api.obterMaterial(id);
    },
    descartarMaterial: async (id) => {
      await exec(sb.rpc("fn_decidir_material", { p_material: id, p_decisao: "DESCARTAR" }));
      return api.obterMaterial(id);
    },
    obterDesfecho: async (materialId) => {
      const r = await exec<Linha | null>(sb.from("desfechos").select(COL_DESFECHO).eq("material_id", materialId).maybeSingle());
      return r ? paraDesfecho(r) : null;
    },
    registrarDesfecho: async (materialId, resultado, observacaoLivre) => {
      await exec(sb.from("desfechos").insert({ material_id: materialId, resultado, observacao_livre: observacaoLivre?.trim() || null }));
      const r = await api.obterDesfecho(materialId);
      if (!r) throw new ErroApi("NAO_ENCONTRADO", "Desfecho não encontrado.");
      return r;
    },

    // ---- nota clínica (RN02: só por RPC auditada)
    listarNotasClinicas: async (estudanteId) => {
      const linhas = await exec<Linha[]>(sb.rpc("fn_ler_notas_clinicas", { p_estudante: estudanteId }));
      return linhas.map(
        (r): NotaClinica => ({ id: String(r.id), estudanteId, profissionalId: r.minha ? eu().id : String(r.profissional_nome), conteudo: String(r.conteudo), dataRegistro: String(r.data_registro) }),
      );
    },
    registrarNotaClinica: async (estudanteId, conteudo) => {
      const id = await exec<string>(sb.rpc("fn_registrar_nota_clinica", { p_estudante: estudanteId, p_conteudo: conteudo }));
      return { id, estudanteId, profissionalId: eu().id, conteudo: conteudo.trim(), dataRegistro: new Date().toISOString() };
    },

    // ---- auditoria e LGPD
    listarAuditoria: async (estudanteId) => {
      const linhas = await exec<Linha[]>(sb.rpc("fn_listar_auditoria", { p_estudante: estudanteId }));
      return linhas
        .filter((r) => EVENTO_DO_BANCO[String(r.evento)])
        .map(
          (r, i): Auditoria => ({
            id: `${estudanteId}-${i}`,
            entidade: "",
            entidadeId: estudanteId,
            evento: EVENTO_DO_BANCO[String(r.evento)]!,
            autorId: null,
            autorNome: String(r.autor_nome),
            data: String(r.criado_em),
            detalhes: (r.detalhes as Record<string, unknown>) ?? {},
          }),
        );
    },
    exportarDados: async (estudanteId) => {
      const [estudante, vinculos, consentimentos, ciclos, observacoes, versoesPerfil, materiais, auditoria] = await Promise.all([
        api.obterEstudante(estudanteId),
        api.listarVinculos(estudanteId),
        exec<Linha[]>(sb.from("consentimentos").select(COL_CONSENT).eq("estudante_id", estudanteId)),
        api.listarCiclos(estudanteId),
        api.listarObservacoes(estudanteId),
        api.listarVersoes(estudanteId),
        api.listarMateriais(estudanteId),
        api.listarAuditoria(estudanteId),
      ]);
      const aprovados = materiais.filter((m) => m.statusAprovacao === "APROVADO");
      const desfechos = (await Promise.all(aprovados.map((m) => api.obterDesfecho(m.id)))).filter((d): d is Desfecho => d !== null);
      // sem notas_clinicas — D-05 (e o banco nem as entrega a quem exporta)
      return {
        geradoEm: new Date().toISOString(),
        estudante,
        vinculos,
        consentimentos: consentimentos.map(paraConsentimento),
        ciclos,
        observacoes,
        versoesPerfil,
        materiaisAprovados: aprovados,
        desfechos,
        auditoria,
      };
    },
    excluirEstudante: async () => {
      // F11: a exclusão definitiva exige uma Edge Function com service role (fora da trilha mínima).
      throw new ErroApi("CONFLITO", "A exclusão definitiva ainda não está disponível no sistema real. Peça à coordenação; o pedido fica registrado.");
    },

    // ---- utilidades da demonstração (não existem no sistema real)
    reiniciarDados: async () => {
      throw new ErroApi("VALIDACAO", "Restaurar dados só existe na demonstração.");
    },
    simularFalha: () => undefined,
  };

  return api;
}
