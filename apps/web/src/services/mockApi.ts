/**
 * Implementação mock de `PeiVivoApi` (D-17).
 *
 * Reproduz a matriz de permissões v2 (`docs/requisitos.md` §6) e as regras
 * RN01–RN08 do lado do "servidor" simulado: o mock NEGA o que o RLS negaria
 * (403 → `ErroApi("NEGADO")`, 0 linhas → lista vazia / NAO_ENCONTRADO).
 * Isso permite testar os caminhos negados na interface (P4.20) antes das
 * Edge Functions existirem — e garante que nenhuma tela "lembra" permissão
 * que o banco não aplica.
 *
 * Estado em memória + localStorage (para sobreviver ao reload da demo),
 * latência simulada (estados de carregamento reais) e chave de falha
 * (estados de erro reais).
 */
import {
  PARAMETROS_PADRAO,
  adaptar,
  aplicarCiclo,
  derivarInteresseAncora,
  observacoesDoUltimoCiclo,
  type DimensaoObservada,
  type ObservacaoHistorica,
  type ParametrosAdaptacao,
} from "@pei-vivo/motor-adaptacao";
import type { NovaObservacao, NovoEstudante, NovoVinculo, PeiVivoApi } from "./api";
import { ErroApi } from "./erros";
import type {
  Auditoria,
  Ciclo,
  Consentimento,
  Desfecho,
  DiffParametro,
  EscopoConsentimento,
  Estudante,
  EventoAuditoria,
  ExportacaoEstudante,
  Material,
  NotaClinica,
  ObservacaoRegistro,
  Papel,
  Pendencia,
  ResultadoDesfecho,
  ResultadoFechamento,
  Usuario,
  VersaoPerfil,
  Vinculo,
} from "./tipos";
import * as semente from "../mocks/dados";

interface Estado {
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
}

const CHAVE_ESTADO = "pei-vivo:demo:v1";
const CHAVE_SESSAO = "pei-vivo:sessao";
const DIAS_EXPIRACAO = 7; // RN05

const DIMENSAO_PARA_CAMPO: Record<DimensaoObservada, keyof ParametrosAdaptacao> = {
  ATENCAO_SUSTENTADA: "maxLinhasPorBloco",
  COMPREENSAO_ENUNCIADOS: "formatoEnunciado",
  AUTONOMIA_LEXICAL: "nivelVocabulario",
  INTERESSE_MANIFESTO: "interesseAncora",
  SENSIBILIDADE_VISUAL: "contrasteMinimo",
  FADIGA_TAREFA: "blocosPorMaterial",
};

const clonar = <T>(v: T): T => (v === undefined ? v : (JSON.parse(JSON.stringify(v)) as T));

function estadoInicial(): Estado {
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
  });
}

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function hash(texto: string): string {
  let h = 0;
  for (let i = 0; i < texto.length; i++) h = (Math.imul(31, h) + texto.charCodeAt(i)) | 0;
  return "h" + (h >>> 0).toString(16);
}

function lerStorage<T>(chave: string): T | null {
  try {
    const bruto = globalThis.localStorage?.getItem(chave);
    return bruto ? (JSON.parse(bruto) as T) : null;
  } catch {
    return null;
  }
}
function gravarStorage(chave: string, valor: unknown) {
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

export function criarMockApi(opcoes: OpcoesMock = {}): PeiVivoApi {
  const latencia = opcoes.latenciaMs ?? 350;
  const persistir = opcoes.persistir ?? true;

  let estado: Estado = (persistir && lerStorage<Estado>(CHAVE_ESTADO)) || estadoInicial();
  let sessaoId: string | null = persistir ? lerStorage<string>(CHAVE_SESSAO) : null;
  let falhaAtiva = false;

  const salvar = () => persistir && gravarStorage(CHAVE_ESTADO, estado);
  const agora = () => new Date().toISOString();

  // ---------------------------------------------------------------- infra
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
      throw new ErroApi("NEGADO", "Sem consentimento ativo do responsável, nenhuma escrita nem geração é permitida (RN01).");
    }
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
    const limite = Date.now() - DIAS_EXPIRACAO * 86_400_000;
    let mudou = false;
    for (const v of estado.versoes) {
      if (v.statusValidacao === "PENDENTE" && new Date(v.createdAt).getTime() < limite) {
        v.statusValidacao = "EXPIRADA";
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

  function formatarValor(v: unknown): string {
    if (v === null || v === undefined) return "—";
    return String(v);
  }

  function calcularProposta(ciclo: Ciclo): { proposta: ParametrosAdaptacao; diff: DiffParametro[]; base: ParametrosAdaptacao } {
    const vigente = versaoVigente(ciclo.estudanteId);
    const base = vigente?.parametros ?? PARAMETROS_PADRAO;
    const hist = historico(ciclo.estudanteId, ciclo.numero);
    const obsCiclo = observacoesDoUltimoCiclo(hist.filter((h) => h.numeroCiclo === ciclo.numero).length ? hist : []);
    const proposta = aplicarCiclo(base, obsCiclo);
    proposta.interesseAncora = derivarInteresseAncora(hist, base.interesseAncora);

    const aguardando = new Set<keyof ParametrosAdaptacao>();
    for (const o of obsCiclo) {
      const eleva = o.valorEscala === "AMPLIADA" && ["ATENCAO_SUSTENTADA", "COMPREENSAO_ENUNCIADOS", "AUTONOMIA_LEXICAL"].includes(o.dimensao);
      if (eleva && o.ciclosConsecutivos < 2) aguardando.add(DIMENSAO_PARA_CAMPO[o.dimensao]);
    }

    const campos: (keyof ParametrosAdaptacao)[] = ["maxLinhasPorBloco", "formatoEnunciado", "nivelVocabulario", "blocosPorMaterial", "contrasteMinimo", "interesseAncora"];
    const diff: DiffParametro[] = campos.map((campo) => ({
      campo,
      antes: formatarValor(base[campo]),
      depois: formatarValor(proposta[campo]),
      mudou: base[campo] !== proposta[campo],
      aguardandoSegundoCiclo: aguardando.has(campo),
    }));
    return { proposta, diff, base };
  }

  function temProfissional(estudanteId: string): boolean {
    return estado.vinculos.some((v) => v.estudanteId === estudanteId && v.papel === "PROFISSIONAL_SAUDE" && v.status === "ATIVO");
  }

  // ---------------------------------------------------------------- API
  const api: PeiVivoApi = {
    // ---- sessão
    listarPerfisDemo: () => chamada(() => estado.usuarios),
    entrar: (usuarioId) =>
      chamada(() => {
        const u = estado.usuarios.find((x) => x.id === usuarioId);
        if (!u) throw new ErroApi("NAO_ENCONTRADO", "Perfil não encontrado.");
        sessaoId = u.id;
        if (persistir) gravarStorage(CHAVE_SESSAO, sessaoId);
        return u;
      }),
    sair: () =>
      chamada(() => {
        sessaoId = null;
        try {
          globalThis.localStorage?.removeItem(CHAVE_SESSAO);
        } catch {
          /* ignora */
        }
      }),
    usuarioAtual: () => (sessaoId ? (estado.usuarios.find((x) => x.id === sessaoId) ?? null) : null),

    // ---- estudantes e vínculos
    listarEstudantes: () =>
      chamada(() => {
        const u = eu();
        const ids = new Set(estado.vinculos.filter((v) => v.usuarioId === u.id && v.status === "ATIVO").map((v) => v.estudanteId));
        return estado.estudantes.filter((e) => ids.has(e.id)).sort((a, b) => a.nome.localeCompare(b.nome));
      }),
    obterEstudante: (id) =>
      chamada(() => {
        const e = estudante(id);
        const papel = meuPapel(id);
        if (!papel) throw new ErroApi("NEGADO", "Você não está vinculado a este estudante.");
        // D-01: só R, P e C veem a data do laudo
        return papel === "DOCENTE" ? { ...e, laudoApresentadoEm: null } : e;
      }),
    meuPapel: (estudanteId) => chamada(() => meuPapel(estudanteId)),
    listarVinculos: (estudanteId) =>
      chamada(() => {
        const p = meuPapel(estudanteId);
        if (!p) throw new ErroApi("NEGADO", "Você não está vinculado a este estudante.");
        const u = eu();
        // coordenação vê todos; demais só os próprios (matriz v2)
        return estado.vinculos.filter((v) => v.estudanteId === estudanteId && (p === "COORDENACAO" || v.usuarioId === u.id));
      }),
    listarUsuarios: () =>
      chamada(() => {
        if (eu().papelInstitucional !== "COORDENACAO") throw new ErroApi("NEGADO", "Só a coordenação lista usuários.");
        return estado.usuarios;
      }),
    cadastrarEstudante: (dados) =>
      chamada(() => {
        const u = eu();
        if (u.papelInstitucional !== "COORDENACAO") throw new ErroApi("NEGADO", "Só a coordenação cadastra estudantes (D-08).");
        validarEstudante(dados);
        const novo: Estudante = {
          id: uuid(),
          nome: dados.nome.trim(),
          dataNascimento: dados.dataNascimento,
          turma: dados.turma?.trim() || null,
          laudoApresentadoEm: dados.laudoApresentadoEm || null,
          createdAt: agora(),
        };
        estado.estudantes.push(novo);
        estado.vinculos.push({ id: uuid(), usuarioId: u.id, estudanteId: novo.id, papel: "COORDENACAO", dataVinculo: agora(), status: "ATIVO", registroConselho: null });
        registrarAuditoria("estudantes", novo.id, "CADASTRO");
        salvar();
        return novo;
      }),
    vincular: (dados) =>
      chamada(() => {
        exigirPapel(dados.estudanteId, "COORDENACAO");
        if (!estado.usuarios.some((x) => x.id === dados.usuarioId)) throw new ErroApi("NAO_ENCONTRADO", "Usuário não encontrado.");
        if (dados.papel === "PROFISSIONAL_SAUDE" && !dados.registroConselho?.trim()) {
          throw new ErroApi("VALIDACAO", "Profissional de saúde precisa do registro no conselho (D-13).");
        }
        if (estado.vinculos.some((v) => v.usuarioId === dados.usuarioId && v.estudanteId === dados.estudanteId && v.status === "ATIVO")) {
          throw new ErroApi("CONFLITO", "Esta pessoa já tem um vínculo ativo com o estudante (D-14).");
        }
        const v: Vinculo = { id: uuid(), usuarioId: dados.usuarioId, estudanteId: dados.estudanteId, papel: dados.papel, dataVinculo: agora(), status: "ATIVO", registroConselho: dados.registroConselho?.trim() || null };
        estado.vinculos.push(v);
        registrarAuditoria("vinculos_usuario_estudante", v.id, "VINCULO_CRIADO", { papel: v.papel });
        salvar();
        return v;
      }),
    desativarVinculo: (vinculoId) =>
      chamada(() => {
        const v = estado.vinculos.find((x) => x.id === vinculoId);
        if (!v) throw new ErroApi("NAO_ENCONTRADO", "Vínculo não encontrado.");
        exigirPapel(v.estudanteId, "COORDENACAO");
        v.status = "INATIVO";
        registrarAuditoria("vinculos_usuario_estudante", v.id, "VINCULO_DESATIVADO", { papel: v.papel });
        salvar();
      }),

    // ---- consentimento
    obterConsentimento: (estudanteId) =>
      chamada(() => {
        if (!meuPapel(estudanteId)) throw new ErroApi("NEGADO", "Você não está vinculado a este estudante.");
        return (
          estado.consentimentos
            .filter((c) => c.estudanteId === estudanteId)
            .sort((a, b) => b.dataConcessao.localeCompare(a.dataConcessao))[0] ?? null
        );
      }),
    concederConsentimento: (estudanteId, escopo) =>
      chamada(() => {
        exigirPapel(estudanteId, "RESPONSAVEL");
        if (temConsentimento(estudanteId)) throw new ErroApi("CONFLITO", "Já existe um consentimento ativo.");
        if (escopo.length === 0) throw new ErroApi("VALIDACAO", "Escolha ao menos um escopo.");
        const c: Consentimento = { id: uuid(), estudanteId, responsavelId: eu().id, dataConcessao: agora(), escopo: [...escopo], status: "ATIVO", dataRevogacao: null };
        estado.consentimentos.push(c);
        registrarAuditoria("consentimentos", c.id, "CONCESSAO", { escopo: escopo.length });
        salvar();
        return c;
      }),
    revogarConsentimento: (estudanteId) =>
      chamada(() => {
        exigirPapel(estudanteId, "RESPONSAVEL");
        const c = estado.consentimentos.find((x) => x.estudanteId === estudanteId && x.status === "ATIVO");
        if (!c) throw new ErroApi("CONFLITO", "Não há consentimento ativo para revogar.");
        c.status = "REVOGADO";
        c.dataRevogacao = agora();
        registrarAuditoria("consentimentos", c.id, "REVOGACAO");
        salvar();
        return c;
      }),

    // ---- ciclos e observações
    listarCiclos: (estudanteId) =>
      chamada(() => {
        exigirLeitura(estudanteId);
        return estado.ciclos.filter((c) => c.estudanteId === estudanteId).sort((a, b) => a.numero - b.numero);
      }),
    obterCicloAberto: (estudanteId) =>
      chamada(() => {
        exigirLeitura(estudanteId);
        return estado.ciclos.find((c) => c.estudanteId === estudanteId && c.status === "ABERTO") ?? null;
      }),
    abrirCiclo: (estudanteId) =>
      chamada(() => {
        exigirPapel(estudanteId, "DOCENTE");
        exigirConsentimento(estudanteId);
        const aberto = estado.ciclos.find((c) => c.estudanteId === estudanteId && c.status === "ABERTO");
        if (aberto) return aberto;
        const numero = Math.max(0, ...estado.ciclos.filter((c) => c.estudanteId === estudanteId).map((c) => c.numero)) + 1;
        const novo: Ciclo = { id: uuid(), estudanteId, numero, dataInicio: agora().slice(0, 10), dataFim: null, status: "ABERTO" };
        estado.ciclos.push(novo);
        salvar();
        return novo;
      }),
    listarObservacoes: (estudanteId) =>
      chamada(() => {
        exigirLeitura(estudanteId);
        const ids = new Set(estado.ciclos.filter((c) => c.estudanteId === estudanteId).map((c) => c.id));
        return estado.observacoes.filter((o) => ids.has(o.cicloId)).sort((a, b) => b.dataRegistro.localeCompare(a.dataRegistro));
      }),
    registrarObservacao: (cicloId, dados) =>
      chamada(() => {
        const ciclo = estado.ciclos.find((c) => c.id === cicloId);
        if (!ciclo) throw new ErroApi("NAO_ENCONTRADO", "Ciclo não encontrado.");
        const papel = exigirPapel(ciclo.estudanteId, "DOCENTE", "RESPONSAVEL", "PROFISSIONAL_SAUDE");
        exigirConsentimento(ciclo.estudanteId);
        if (ciclo.status !== "ABERTO") throw new ErroApi("CONFLITO", "Este ciclo já foi fechado.");
        const o: ObservacaoRegistro = {
          id: uuid(),
          cicloId,
          numeroCiclo: ciclo.numero,
          autorId: eu().id,
          papelAutor: papel,
          dimensao: dados.dimensao,
          valorEscala: dados.valorEscala,
          evidencia: dados.evidencia?.trim() || null,
          dataRegistro: agora(),
        };
        estado.observacoes.push(o);
        salvar();
        return o;
      }),

    // ---- versões de perfil
    listarVersoes: (estudanteId) =>
      chamada(() => {
        exigirLeitura(estudanteId);
        aplicarExpiracao();
        return estado.versoes.filter((v) => v.estudanteId === estudanteId).sort((a, b) => b.numeroCiclo - a.numeroCiclo);
      }),
    obterVersaoVigente: (estudanteId) =>
      chamada(() => {
        exigirLeitura(estudanteId);
        return versaoVigente(estudanteId);
      }),
    preverFechamento: (cicloId) =>
      chamada(() => {
        const ciclo = estado.ciclos.find((c) => c.id === cicloId);
        if (!ciclo) throw new ErroApi("NAO_ENCONTRADO", "Ciclo não encontrado.");
        exigirPapel(ciclo.estudanteId, "DOCENTE");
        exigirLeitura(ciclo.estudanteId);
        const { proposta, diff } = calcularProposta(ciclo);
        const modoPedagogico = !temProfissional(ciclo.estudanteId);
        const versao: VersaoPerfil = {
          id: "previa",
          estudanteId: ciclo.estudanteId,
          cicloOrigemId: ciclo.id,
          numeroCiclo: ciclo.numero,
          parametros: proposta,
          statusValidacao: modoPedagogico ? "VIGENTE" : "PENDENTE",
          validadorId: null,
          dataVigencia: null,
          justificativaRevisao: null,
          createdAt: agora(),
        };
        return { versao, diff, modoPedagogico };
      }),
    fecharCiclo: (cicloId) =>
      chamada(() => {
        const ciclo = estado.ciclos.find((c) => c.id === cicloId);
        if (!ciclo) throw new ErroApi("NAO_ENCONTRADO", "Ciclo não encontrado.");
        exigirPapel(ciclo.estudanteId, "DOCENTE");
        exigirConsentimento(ciclo.estudanteId);
        if (ciclo.status !== "ABERTO") throw new ErroApi("CONFLITO", "Este ciclo já foi fechado.");
        if (!estado.observacoes.some((o) => o.cicloId === cicloId)) {
          throw new ErroApi("CONFLITO", "Registre ao menos uma observação antes de fechar o ciclo.");
        }
        const { proposta, diff } = calcularProposta(ciclo);
        const modoPedagogico = !temProfissional(ciclo.estudanteId); // RN06
        const versao: VersaoPerfil = {
          id: uuid(),
          estudanteId: ciclo.estudanteId,
          cicloOrigemId: ciclo.id,
          numeroCiclo: ciclo.numero,
          parametros: proposta,
          statusValidacao: modoPedagogico ? "VIGENTE" : "PENDENTE",
          validadorId: null,
          dataVigencia: modoPedagogico ? agora() : null,
          justificativaRevisao: null,
          createdAt: agora(),
        };
        estado.versoes.push(versao);
        ciclo.status = "FECHADO";
        ciclo.dataFim = agora().slice(0, 10);
        // abre o próximo ciclo (HU-D.01: "o sistema abre ao fechar o N-1")
        estado.ciclos.push({ id: uuid(), estudanteId: ciclo.estudanteId, numero: ciclo.numero + 1, dataInicio: agora().slice(0, 10), dataFim: null, status: "ABERTO" });
        registrarAuditoria("ciclos_observacao", ciclo.id, "CICLO_FECHADO", { numero: ciclo.numero, status: versao.statusValidacao });
        salvar();
        return { versao, diff, modoPedagogico };
      }),
    validarVersao: (versaoId, decisao, justificativa) =>
      chamada(() => {
        const v = estado.versoes.find((x) => x.id === versaoId);
        if (!v) throw new ErroApi("NAO_ENCONTRADO", "Versão não encontrada.");
        exigirPapel(v.estudanteId, "PROFISSIONAL_SAUDE");
        exigirConsentimento(v.estudanteId);
        if (v.statusValidacao === "VIGENTE") throw new ErroApi("CONFLITO", "Esta versão já está vigente.");
        if (decisao === "APROVAR") {
          v.statusValidacao = "VIGENTE";
          v.validadorId = eu().id;
          v.dataVigencia = agora();
          v.justificativaRevisao = null;
          registrarAuditoria("versoes_perfil", v.id, "VALIDACAO", { numeroCiclo: v.numeroCiclo });
        } else {
          if (!justificativa?.trim()) throw new ErroApi("VALIDACAO", "Explique o ajuste solicitado para o docente.");
          v.statusValidacao = "EM_REVISAO";
          v.justificativaRevisao = justificativa.trim();
          registrarAuditoria("versoes_perfil", v.id, "REVISAO_SOLICITADA", { numeroCiclo: v.numeroCiclo });
        }
        salvar();
        return v;
      }),
    listarPendencias: () =>
      chamada(() => {
        const u = eu();
        aplicarExpiracao();
        const meus = estado.vinculos.filter((v) => v.usuarioId === u.id && v.status === "ATIVO" && (v.papel === "PROFISSIONAL_SAUDE" || v.papel === "COORDENACAO"));
        const ids = new Set(meus.map((v) => v.estudanteId));
        const lista: Pendencia[] = [];
        for (const v of estado.versoes) {
          if (!ids.has(v.estudanteId) || v.statusValidacao === "VIGENTE") continue;
          lista.push({ versao: v, estudante: estudante(v.estudanteId), diasEmAberto: Math.floor((Date.now() - new Date(v.createdAt).getTime()) / 86_400_000) });
        }
        return lista.sort((a, b) => b.diasEmAberto - a.diasEmAberto);
      }),

    // ---- materiais
    listarMateriais: (estudanteId) =>
      chamada(() => {
        const p = exigirLeitura(estudanteId);
        return estado.materiais
          .filter((m) => m.estudanteId === estudanteId && (p === "DOCENTE" || m.statusAprovacao === "APROVADO")) // D-12
          .sort((a, b) => b.dataGeracao.localeCompare(a.dataGeracao));
      }),
    obterMaterial: (id) =>
      chamada(() => {
        const m = estado.materiais.find((x) => x.id === id);
        if (!m) throw new ErroApi("NAO_ENCONTRADO", "Material não encontrado.");
        const p = exigirLeitura(m.estudanteId);
        if (p !== "DOCENTE" && m.statusAprovacao !== "APROVADO") throw new ErroApi("NAO_ENCONTRADO", "Material não encontrado."); // D-12: 0 linhas
        return m;
      }),
    gerarMaterial: (estudanteId, titulo, texto) =>
      chamada(() => {
        exigirPapel(estudanteId, "DOCENTE");
        exigirConsentimento(estudanteId);
        const t = texto.trim();
        if (t.length < 1 || t.length > 20_000) throw new ErroApi("VALIDACAO", "O texto precisa ter entre 1 e 20.000 caracteres.");
        const vigente = versaoVigente(estudanteId);
        if (!vigente) throw new ErroApi("CONFLITO", "Este estudante ainda não tem um perfil vigente. Feche um ciclo de observação primeiro.");
        const h = hash(t);
        const emCache = estado.materiais.find((m) => m.estudanteId === estudanteId && m.hashTexto === h && m.versaoPerfilId === vigente.id && m.statusAprovacao !== "DESCARTADO");
        if (emCache) return emCache; // P3.5: texto idêntico + mesma versão → não regera
        const inicio = performance.now();
        const adaptado = adaptar(t, vigente.parametros);
        const m: Material = {
          id: uuid(),
          estudanteId,
          versaoPerfilId: vigente.id,
          docenteId: eu().id,
          titulo: titulo.trim() || "Material sem título",
          textoOriginal: t,
          textoAdaptado: adaptado,
          textoRevisado: null,
          dataGeracao: agora(),
          statusAprovacao: "RASCUNHO",
          iaAplicada: false, // camada de IA desligada no protótipo (RN06 / modo demo)
          duracaoMs: Math.round(performance.now() - inicio) + latencia,
          hashTexto: h,
        };
        estado.materiais.push(m);
        salvar();
        return m;
      }),
    aprovarMaterial: (id, textoRevisado) =>
      chamada(() => {
        const m = estado.materiais.find((x) => x.id === id);
        if (!m) throw new ErroApi("NAO_ENCONTRADO", "Material não encontrado.");
        exigirPapel(m.estudanteId, "DOCENTE");
        exigirConsentimento(m.estudanteId);
        if (m.statusAprovacao !== "RASCUNHO") throw new ErroApi("CONFLITO", "Só rascunhos podem ser aprovados.");
        m.statusAprovacao = "APROVADO";
        m.textoRevisado = textoRevisado?.trim() || null;
        registrarAuditoria("materiais_adaptados", m.id, "APROVACAO_MATERIAL");
        salvar();
        return m;
      }),
    descartarMaterial: (id) =>
      chamada(() => {
        const m = estado.materiais.find((x) => x.id === id);
        if (!m) throw new ErroApi("NAO_ENCONTRADO", "Material não encontrado.");
        exigirPapel(m.estudanteId, "DOCENTE");
        if (m.statusAprovacao !== "RASCUNHO") throw new ErroApi("CONFLITO", "Só rascunhos podem ser descartados.");
        m.statusAprovacao = "DESCARTADO";
        registrarAuditoria("materiais_adaptados", m.id, "DESCARTE_MATERIAL");
        salvar();
        return m;
      }),
    obterDesfecho: (materialId) =>
      chamada(() => {
        const m = estado.materiais.find((x) => x.id === materialId);
        if (!m) throw new ErroApi("NAO_ENCONTRADO", "Material não encontrado.");
        const p = exigirLeitura(m.estudanteId);
        if (p !== "DOCENTE" && m.statusAprovacao !== "APROVADO") return null;
        return estado.desfechos.find((d) => d.materialId === materialId) ?? null;
      }),
    registrarDesfecho: (materialId, resultado, observacaoLivre) =>
      chamada(() => {
        const m = estado.materiais.find((x) => x.id === materialId);
        if (!m) throw new ErroApi("NAO_ENCONTRADO", "Material não encontrado.");
        exigirPapel(m.estudanteId, "DOCENTE");
        exigirConsentimento(m.estudanteId);
        if (m.statusAprovacao !== "APROVADO") throw new ErroApi("CONFLITO", "Só materiais aprovados recebem desfecho.");
        if (estado.desfechos.some((d) => d.materialId === materialId)) throw new ErroApi("CONFLITO", "Este material já tem desfecho registrado.");
        const d: Desfecho = { id: uuid(), materialId, resultado, observacaoLivre: observacaoLivre?.trim() || null, dataRegistro: agora() };
        estado.desfechos.push(d);
        salvar();
        return d;
      }),

    // ---- nota clínica (RN02 ⭐)
    listarNotasClinicas: (estudanteId) =>
      chamada(() => {
        const p = meuPapel(estudanteId);
        if (p !== "PROFISSIONAL_SAUDE") {
          throw new ErroApi("NEGADO", "Nota clínica reservada: acesso exclusivo do profissional de saúde vinculado (RN02).");
        }
        return estado.notas.filter((n) => n.estudanteId === estudanteId).sort((a, b) => b.dataRegistro.localeCompare(a.dataRegistro));
      }),
    registrarNotaClinica: (estudanteId, conteudo) =>
      chamada(() => {
        exigirPapel(estudanteId, "PROFISSIONAL_SAUDE");
        if (!conteudo.trim()) throw new ErroApi("VALIDACAO", "Escreva o conteúdo da nota.");
        const n: NotaClinica = { id: uuid(), estudanteId, profissionalId: eu().id, conteudo: conteudo.trim(), dataRegistro: agora() };
        estado.notas.push(n);
        salvar();
        return n;
      }),

    // ---- auditoria e LGPD
    listarAuditoria: (estudanteId) =>
      chamada(() => {
        exigirPapel(estudanteId, "RESPONSAVEL", "COORDENACAO");
        const idsFilhos = new Set<string>([
          estudanteId,
          ...estado.consentimentos.filter((c) => c.estudanteId === estudanteId).map((c) => c.id),
          ...estado.versoes.filter((v) => v.estudanteId === estudanteId).map((v) => v.id),
          ...estado.materiais.filter((m) => m.estudanteId === estudanteId).map((m) => m.id),
          ...estado.vinculos.filter((v) => v.estudanteId === estudanteId).map((v) => v.id),
          ...estado.ciclos.filter((c) => c.estudanteId === estudanteId).map((c) => c.id),
        ]);
        return estado.auditoria.filter((a) => idsFilhos.has(a.entidadeId)).sort((a, b) => b.data.localeCompare(a.data));
      }),
    exportarDados: (estudanteId) =>
      chamada(() => {
        exigirPapel(estudanteId, "RESPONSAVEL", "COORDENACAO");
        const e = estudante(estudanteId);
        const ciclos = estado.ciclos.filter((c) => c.estudanteId === estudanteId);
        const idsCiclos = new Set(ciclos.map((c) => c.id));
        const materiais = estado.materiais.filter((m) => m.estudanteId === estudanteId && m.statusAprovacao === "APROVADO");
        const idsMat = new Set(materiais.map((m) => m.id));
        registrarAuditoria("estudantes", estudanteId, "EXPORTACAO");
        salvar();
        const exportacao: ExportacaoEstudante = {
          geradoEm: agora(),
          estudante: e,
          vinculos: estado.vinculos.filter((v) => v.estudanteId === estudanteId),
          consentimentos: estado.consentimentos.filter((c) => c.estudanteId === estudanteId),
          ciclos,
          observacoes: estado.observacoes.filter((o) => idsCiclos.has(o.cicloId)),
          versoesPerfil: estado.versoes.filter((v) => v.estudanteId === estudanteId),
          materiaisAprovados: materiais,
          desfechos: estado.desfechos.filter((d) => idsMat.has(d.materialId)),
          auditoria: estado.auditoria.filter((a) => a.entidadeId === estudanteId),
          // sem notas_clinicas — D-05
        };
        return exportacao;
      }),
    excluirEstudante: (estudanteId, confirmacaoNome) =>
      chamada(() => {
        exigirPapel(estudanteId, "RESPONSAVEL");
        const e = estudante(estudanteId);
        if (confirmacaoNome.trim() !== e.nome) throw new ErroApi("VALIDACAO", "Digite o nome do estudante exatamente como aparece para confirmar.");
        const idsCiclos = new Set(estado.ciclos.filter((c) => c.estudanteId === estudanteId).map((c) => c.id));
        const idsMat = new Set(estado.materiais.filter((m) => m.estudanteId === estudanteId).map((m) => m.id));
        estado.estudantes = estado.estudantes.filter((x) => x.id !== estudanteId);
        estado.vinculos = estado.vinculos.filter((x) => x.estudanteId !== estudanteId);
        estado.consentimentos = estado.consentimentos.filter((x) => x.estudanteId !== estudanteId);
        estado.ciclos = estado.ciclos.filter((x) => x.estudanteId !== estudanteId);
        estado.observacoes = estado.observacoes.filter((x) => !idsCiclos.has(x.cicloId));
        estado.versoes = estado.versoes.filter((x) => x.estudanteId !== estudanteId);
        estado.materiais = estado.materiais.filter((x) => x.estudanteId !== estudanteId);
        estado.desfechos = estado.desfechos.filter((x) => !idsMat.has(x.materialId));
        estado.notas = estado.notas.filter((x) => x.estudanteId !== estudanteId); // D-05: inclui notas clínicas
        estado.auditoria.push({ id: uuid(), entidade: "estudantes", entidadeId: estudanteId, evento: "EXCLUSAO", autorId: sessaoId, data: agora(), detalhes: {} });
        salvar();
      }),

    // ---- demo
    reiniciarDados: () =>
      chamada(() => {
        estado = estadoInicial();
        salvar();
      }),
    simularFalha: (ativa) => {
      falhaAtiva = ativa;
    },
  };

  function validarEstudante(d: NovoEstudante) {
    if (!d.nome?.trim() || d.nome.trim().length < 3) throw new ErroApi("VALIDACAO", "Informe o nome do estudante (mínimo 3 letras).");
    if (!/^\d{4}-\d{2}-\d{2}$/u.test(d.dataNascimento) || new Date(d.dataNascimento) > new Date()) {
      throw new ErroApi("VALIDACAO", "Informe uma data de nascimento válida, no passado.");
    }
  }

  return api;
}

export type { NovaObservacao, NovoEstudante, NovoVinculo, EscopoConsentimento, ResultadoDesfecho };
