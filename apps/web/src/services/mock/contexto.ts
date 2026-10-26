/**
 * Estado da demonstração e as regras do "servidor" simulado que mais de um
 * agregado usa (papel, consentimento, autoria, auditoria, notificações, RN05).
 * `estado`, `sessaoId` e `falhaAtiva` são reatribuíveis (reiniciar, entrar/sair,
 * simular falha), por isso ficam atrás de getters/setters.
 */
import type { ObservacaoHistorica, ParametrosAdaptacao } from "@pei-vivo/motor-adaptacao";
import { calcularFechamento } from "@pei-vivo/funcoes";
import { DIAS_EXPIRACAO_VALIDACAO, MS_POR_DIA } from "@pei-vivo/contratos";
import type { NovoEstudante, Pagina, PeiVivoApi } from "../api";
import { ErroApi } from "../erros";
import type {
  Auditoria,
  Ciclo,
  Consentimento,
  Desfecho,
  DiffParametro,
  Estudante,
  EventoAuditoria,
  Material,
  Notificacao,
  NotaClinica,
  ObservacaoRegistro,
  Papel,
  TipoNotificacao,
  Usuario,
  VersaoPerfil,
  Vinculo,
} from "../tipos";
import * as semente from "../../mocks/dados";

export interface Estado {
  usuarios: Usuario[];
  estudantes: Estudante[];
  vinculos: Vinculo[];
  consentimentos: Consentimento[];
  ciclos: Ciclo[];
  observacoes: ObservacaoRegistro[];
  versoes: VersaoPerfil[];
  materiais: Material[];
  desfechos: Desfecho[];
  notas: NotaClinica[];
  auditoria: Auditoria[];
  notificacoes: Notificacao[];
}

export const CHAVE_ESTADO = "pei-vivo:demo:v3"; // v3: âncora do ciclo 3 só com o tema (navegadores com a demo antiga recebem os dados novos)
export const CHAVE_SESSAO = "pei-vivo:sessao";

export const clonar = <T>(v: T): T => (v === undefined ? v : (JSON.parse(JSON.stringify(v)) as T));

export function estadoInicial(): Estado {
  return clonar({
    usuarios: semente.USUARIOS,
    estudantes: semente.ESTUDANTES,
    vinculos: semente.VINCULOS,
    consentimentos: semente.CONSENTIMENTOS,
    ciclos: semente.CICLOS,
    observacoes: semente.OBSERVACOES,
    versoes: semente.VERSOES,
    materiais: semente.MATERIAIS,
    desfechos: semente.DESFECHOS,
    notas: semente.NOTAS_CLINICAS,
    auditoria: semente.AUDITORIA,
    notificacoes: [],
  });
}

export function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function hash(texto: string): string {
  let h = 0;
  for (let i = 0; i < texto.length; i++) h = (Math.imul(31, h) + texto.charCodeAt(i)) | 0;
  return "h" + (h >>> 0).toString(16);
}

export function lerStorage<T>(chave: string): T | null {
  try {
    const bruto = globalThis.localStorage?.getItem(chave);
    return bruto ? (JSON.parse(bruto) as T) : null;
  } catch {
    return null;
  }
}
export function gravarStorage(chave: string, valor: unknown) {
  try {
    globalThis.localStorage?.setItem(chave, JSON.stringify(valor));
  } catch {
    /* modo privado / cota — segue só em memória */
  }
}

export interface OpcoesMock {
  latenciaMs?: number;
  persistir?: boolean;
}

export const TODOS: Papel[] = ["RESPONSAVEL", "DOCENTE", "PROFISSIONAL_SAUDE", "COORDENACAO"];

export function criarContextoMock(opcoes: OpcoesMock = {}) {
  const latencia = opcoes.latenciaMs ?? 350;
  const persistir = opcoes.persistir ?? true;

  let estado: Estado = (persistir && lerStorage<Estado>(CHAVE_ESTADO)) || estadoInicial();
  estado.notificacoes ??= [];
  let sessaoId: string | null = persistir ? lerStorage<string>(CHAVE_SESSAO) : null;
  let falhaAtiva = false;

  const salvar = () => persistir && gravarStorage(CHAVE_ESTADO, estado);
  const agora = () => new Date().toISOString();

  async function chamada<T>(fn: () => T): Promise<T> {
    if (latencia > 0) await new Promise((r) => setTimeout(r, latencia));
    if (falhaAtiva) throw new ErroApi("REDE", "Falha de rede simulada.");
    return clonar(fn());
  }

  function eu(): Usuario {
    const u = sessaoId ? estado.usuarios.find((x) => x.id === sessaoId) : undefined;
    if (!u) throw new ErroApi("NAO_AUTENTICADO", "Entre para continuar.");
    return u;
  }

  /** `fn_meu_papel` — vínculo ATIVO do usuário atual com o estudante (D-14: um só). */
  function meuPapel(estudanteId: string): Papel | null {
    const u = eu();
    return estado.vinculos.find((v) => v.usuarioId === u.id && v.estudanteId === estudanteId && v.status === "ATIVO")?.papel ?? null;
  }

  /** `fn_tem_consentimento_ativo` */
  function temConsentimento(estudanteId: string): boolean {
    return estado.consentimentos.some((c) => c.estudanteId === estudanteId && c.status === "ATIVO");
  }

  function exigirPapel(estudanteId: string, ...papeis: Papel[]): Papel {
    const p = meuPapel(estudanteId);
    if (!p || !papeis.includes(p)) {
      throw new ErroApi("NEGADO", "Seu perfil não tem permissão para esta ação neste estudante.");
    }
    return p;
  }

  /** D-11: escrita exige consentimento ATIVO (RN01/RN08). */
  function exigirConsentimento(estudanteId: string) {
    if (!temConsentimento(estudanteId)) {
      throw new ErroApi("NEGADO", "Sem consentimento ativo do responsável, nenhuma escrita nem geração é permitida.");
    }
  }

  /** D-48: mesma semântica do `range` do modo real. */
  function paginar<T>(lista: T[], pagina?: Pagina): T[] {
    if (!pagina) return lista;
    const inicio = pagina.deslocamento ?? 0;
    return lista.slice(inicio, inicio + pagina.limite);
  }

  /** D-47: mesmo limite do `check` da migration 0010. */
  function exigirTamanho(texto: string | null | undefined, limite: number, nome: string) {
    if ((texto?.trim().length ?? 0) > limite) throw new ErroApi("VALIDACAO", `${nome} pode ter até ${limite.toLocaleString("pt-BR")} caracteres.`);
  }

  /** D-11: leitura de dados filhos — R e C sempre; D e P só com consentimento. */
  function exigirLeitura(estudanteId: string): Papel {
    const p = meuPapel(estudanteId);
    if (!p) throw new ErroApi("NEGADO", "Você não está vinculado a este estudante.");
    if (!temConsentimento(estudanteId) && (p === "DOCENTE" || p === "PROFISSIONAL_SAUDE")) {
      throw new ErroApi("NEGADO", "Os dados deste estudante só ficam disponíveis com consentimento ativo do responsável.");
    }
    return p;
  }

  /** D-28: espelha privado.notificar — vínculos ATIVOS com os papéis dados, menos quem causou. */
  function notificar(estudanteId: string, tipo: TipoNotificacao, papeis: Papel[]) {
    const destinatarios = new Set(
      estado.vinculos.filter((v) => v.estudanteId === estudanteId && v.status === "ATIVO" && papeis.includes(v.papel)).map((v) => v.usuarioId)
    );
    destinatarios.delete(sessaoId ?? "");
    for (const usuarioId of destinatarios) notificarUsuario(usuarioId, tipo, estudanteId);
  }
  function notificarUsuario(usuarioId: string, tipo: TipoNotificacao, estudanteId: string) {
    estado.notificacoes.push({ id: uuid(), usuarioId, tipo, estudanteId, criadaEm: agora(), lidaEm: null });
  }

  /** D-34 / S-19: só o docente que gerou decide sobre o material. */
  function exigirAutor(m: Material) {
    if (m.docenteId !== eu().id) throw new ErroApi("NEGADO", "Só o docente que gerou o material decide sobre ele.");
  }

  function registrarAuditoria(entidade: string, entidadeId: string, evento: EventoAuditoria, detalhes: Record<string, unknown> = {}) {
    estado.auditoria.push({ id: uuid(), entidade, entidadeId, evento, autorId: sessaoId, data: agora(), detalhes });
  }

  function estudante(id: string): Estudante {
    const e = estado.estudantes.find((x) => x.id === id);
    if (!e) throw new ErroApi("NAO_ENCONTRADO", "Estudante não encontrado.");
    return e;
  }

  function versaoVigente(estudanteId: string): VersaoPerfil | null {
    return (
      estado.versoes
        .filter((v) => v.estudanteId === estudanteId && v.statusValidacao === "VIGENTE")
        .sort((a, b) => (b.dataVigencia ?? "").localeCompare(a.dataVigencia ?? ""))[0] ?? null
    );
  }

  /** RN05 — simula o job diário: PENDENTE há mais de 7 dias vira EXPIRADA. */
  function aplicarExpiracao() {
    const limite = Date.now() - DIAS_EXPIRACAO_VALIDACAO * MS_POR_DIA;
    let mudou = false;
    for (const v of estado.versoes) {
      if (v.statusValidacao === "PENDENTE" && new Date(v.createdAt).getTime() < limite) {
        v.statusValidacao = "EXPIRADA";
        notificar(v.estudanteId, "VALIDACAO_EXPIRADA", ["PROFISSIONAL_SAUDE", "COORDENACAO"]);
        mudou = true;
      }
    }
    if (mudou) salvar();
  }

  function historico(estudanteId: string, ateCiclo: number): ObservacaoHistorica[] {
    return estado.observacoes
      .filter((o) => estado.ciclos.find((c) => c.id === o.cicloId)?.estudanteId === estudanteId && o.numeroCiclo <= ateCiclo)
      .sort((a, b) => a.numeroCiclo - b.numeroCiclo || a.dataRegistro.localeCompare(b.dataRegistro))
      .map((o) => ({ numeroCiclo: o.numeroCiclo, dimensao: o.dimensao, valorEscala: o.valorEscala, evidencia: o.evidencia }));
  }

  /** Mesmo cálculo da Edge Function fechar-ciclo (packages/funcoes): RN03, âncora, diff. */
  function calcularProposta(ciclo: Ciclo): { proposta: ParametrosAdaptacao; diff: DiffParametro[] } {
    const vigente = versaoVigente(ciclo.estudanteId);
    return calcularFechamento(ciclo.numero, vigente?.parametros ?? null, historico(ciclo.estudanteId, ciclo.numero));
  }

  /** D-35: uma única VIGENTE por estudante — a anterior vira SUBSTITUIDA (corrige M-01). */
  function tornarVigente(v: VersaoPerfil) {
    const atual = versaoVigente(v.estudanteId);
    if (atual && atual.id !== v.id) atual.statusValidacao = "SUBSTITUIDA";
    v.statusValidacao = "VIGENTE";
    v.dataVigencia = agora();
  }

  function temProfissional(estudanteId: string): boolean {
    return estado.vinculos.some((v) => v.estudanteId === estudanteId && v.papel === "PROFISSIONAL_SAUDE" && v.status === "ATIVO");
  }

  const soNoModoReal = () =>
    chamada<never>(() => {
      throw new ErroApi("VALIDACAO", "Disponível só com o Supabase (modo real). Na demonstração, entre escolhendo um perfil fictício.");
    });

  function validarEstudante(d: NovoEstudante) {
    if (!d.nome?.trim() || d.nome.trim().length < 3) throw new ErroApi("VALIDACAO", "Informe o nome do estudante (mínimo 3 letras).");
    if (!/^\d{4}-\d{2}-\d{2}$/u.test(d.dataNascimento) || new Date(d.dataNascimento) > new Date()) {
      throw new ErroApi("VALIDACAO", "Informe uma data de nascimento válida, no passado.");
    }
  }

  return {
    /** O objeto PeiVivoApi completo (para um agregado chamar outro). Ligado por criarMockApi. */
    api: undefined as unknown as PeiVivoApi,
    get estado() {
      return estado;
    },
    set estado(e: Estado) {
      estado = e;
    },
    get sessaoId() {
      return sessaoId;
    },
    set sessaoId(id: string | null) {
      sessaoId = id;
    },
    get falhaAtiva() {
      return falhaAtiva;
    },
    set falhaAtiva(v: boolean) {
      falhaAtiva = v;
    },
    persistir,
    latencia,
    chamada,
    eu,
    meuPapel,
    temConsentimento,
    exigirPapel,
    exigirConsentimento,
    paginar,
    exigirTamanho,
    exigirLeitura,
    notificar,
    notificarUsuario,
    exigirAutor,
    registrarAuditoria,
    estudante,
    versaoVigente,
    aplicarExpiracao,
    historico,
    calcularProposta,
    tornarVigente,
    temProfissional,
    soNoModoReal,
    validarEstudante,
    salvar,
    agora,
  };
}

export type ContextoMock = ReturnType<typeof criarContextoMock>;
