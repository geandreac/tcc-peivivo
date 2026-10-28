/**
 * Painel administrativo da demonstração (D-50): as mesmas regras das RPCs fn_admin_* da 0012.
 * Administrador Geral → todos, menos outros administradores; coordenação → quem atua na escola
 * (a demonstração tem uma só), menos coordenação e administradores. Ninguém altera o próprio acesso.
 * Nada aqui devolve dado de estudante.
 */
import { TETO, type Ferramenta, type PapelBase } from "@pei-vivo/contratos";
import type { PeiVivoApi } from "../api";
import { ErroApi } from "../erros";
import type { DetalheUsuarioAdmin, EventoAdmin, ItemCatalogo, PerfilAcesso, Usuario, UsuarioAdmin } from "../tipos";
import { situacaoDe, uuid, type AcessoMock, type ContextoMock } from "./contexto";
import { ESCOLA } from "../../mocks/dados";

const DESCRICAO: Record<string, string> = {
  "OBSERVACAO:EDITAR": "Registrar observações do ciclo",
  "GERACAO_MATERIAL:EDITAR": "Gerar material adaptado",
  "GERACAO_MATERIAL:APROVAR": "Aprovar ou descartar material",
  "VALIDACAO:APROVAR": "Validar, pedir revisão ou ajustar os parâmetros do ciclo",
  "NOTAS_CLINICAS:VER": "Ler notas clínicas reservadas",
  "NOTAS_CLINICAS:EDITAR": "Registrar notas clínicas reservadas",
  "PAINEL_ESCOLA:VER": "Abrir o painel da escola (só contagens)",
};
const motivoValido = (m: string, o: string) => {
  const t = m?.trim() ?? "";
  if (t.length < 5 || t.length > 300) throw new ErroApi("VALIDACAO", `Informe o motivo ${o} (5 a 300 caracteres).`);
  return t;
};

export function admin(ctx: ContextoMock) {
  const acesso = (id: string): AcessoMock => (ctx.estado.acessos[id] ??= {});
  const ehAdmin = (u: Usuario | undefined) => u?.papelPlataforma === "ADMIN_GERAL";
  const ehCoord = (u: Usuario | undefined) => u?.papelInstitucional === "COORDENACAO";

  function papeis(u: Usuario): PapelBase[] {
    const p = new Set<PapelBase>();
    if (ehAdmin(u)) p.add("ADMIN_GERAL");
    if (ehCoord(u)) p.add("COORDENACAO");
    for (const v of ctx.estado.vinculos) {
      if (v.usuarioId === u.id && (v.status === "ATIVO" || v.status === "PENDENTE_RESPONSAVEL") && v.papel !== "COORDENACAO") p.add(v.papel);
    }
    const doConvite = ctx.estado.acessos[u.id]?.papel;
    if (doConvite && p.size === 0) p.add(doConvite);
    return [...p];
  }

  /** privado.exigir_painel_admin: admin geral ou coordenação. */
  function quemAdministra(): { eu: Usuario; geral: boolean } {
    const eu = ctx.eu();
    if (!ehAdmin(eu) && !ehCoord(eu)) {
      throw new ErroApi("NEGADO", "O painel administrativo é do Administrador Geral e da coordenação, com verificação em duas etapas.");
    }
    return { eu, geral: ehAdmin(eu) };
  }
  function exigirAdminGeral(): Usuario {
    const { eu, geral } = quemAdministra();
    if (!geral) throw new ErroApi("NEGADO", "Só o Administrador Geral, com verificação em duas etapas, faz esta alteração.");
    return eu;
  }
  function administra(alvo: Usuario, eu: Usuario, geral: boolean): boolean {
    if (alvo.id === eu.id || ehAdmin(alvo)) return false;
    return geral || !ehCoord(alvo);
  }
  /** privado.exigir_administra */
  function exigirAdministra(id: string): { alvo: Usuario; eu: Usuario; geral: boolean } {
    const { eu, geral } = quemAdministra();
    const alvo = ctx.estado.usuarios.find((u) => u.id === id);
    if (!alvo) throw new ErroApi("NEGADO", "Pessoa não encontrada.");
    if (alvo.id === eu.id) throw new ErroApi("NEGADO", "Ninguém altera o próprio acesso pelo painel.");
    if (ehAdmin(alvo)) throw new ErroApi("NEGADO", "Administradores gerais são geridos só pelo script de implantação.");
    if (!administra(alvo, eu, geral)) throw new ErroApi("NEGADO", "Você não administra o acesso desta pessoa.");
    return { alvo, eu, geral };
  }
  function auditar(geral: boolean, evento: string, entidade: string, entidadeId: string | null, detalhes: Record<string, unknown> = {}) {
    ctx.estado.eventosAdmin.push({
      id: uuid(),
      criadoEm: ctx.agora(),
      evento,
      autorId: ctx.sessaoId,
      papelAutor: geral ? "ADMIN_GERAL" : "COORDENACAO",
      entidade,
      entidadeId,
      detalhes,
    });
    ctx.salvar();
  }
  const nomeDe = (id: string | null) => (id ? (ctx.estado.usuarios.find((u) => u.id === id)?.nome ?? null) : null);

  function linha(u: Usuario): UsuarioAdmin {
    const a = ctx.estado.acessos[u.id];
    const perfil = a?.perfilId ? ctx.estado.perfis.find((p) => p.id === a.perfilId) : undefined;
    return {
      id: u.id,
      nome: u.nome,
      email: u.email,
      organizacao: a?.organizacao ?? (ehAdmin(u) ? null : ESCOLA.nome),
      perfilId: perfil?.id ?? null,
      perfilNome: perfil?.nome ?? null,
      papeis: papeis(u),
      situacao: situacaoDe(a),
      ultimoLogin: a?.ultimoLogin ?? null,
      acessoExpiraEm: a?.acessoExpiraEm ?? null,
    };
  }
  const visiveis = (eu: Usuario, geral: boolean) => ctx.estado.usuarios.filter((u) => u.id === eu.id || administra(u, eu, geral));
  const comUsuarios = (p: Omit<PerfilAcesso, "usuarios">): PerfilAcesso => ({
    ...p,
    usuarios: Object.values(ctx.estado.acessos).filter((a) => a.perfilId === p.id).length,
  });

  return {
    adminResumo: () =>
      ctx.chamada(() => {
        const { eu, geral } = quemAdministra();
        const lista = visiveis(eu, geral).map(linha);
        const conta = (s: UsuarioAdmin["situacao"][]) => lista.filter((l) => s.includes(l.situacao)).length;
        const em7 = Date.now() + 7 * 86_400_000;
        return {
          escopo: geral ? ("GERAL" as const) : ("ESCOLA" as const),
          usuariosAtivos: conta(["ATIVO"]),
          convitesPendentes: conta(["CONVITE_PENDENTE"]),
          aguardandoAprovacao: conta(["AGUARDANDO_APROVACAO"]),
          suspensos: conta(["SUSPENSO"]),
          expirados: conta(["EXPIRADO", "CONVITE_EXPIRADO"]),
          expiramEm7Dias: lista.filter((l) => l.situacao === "ATIVO" && l.acessoExpiraEm && new Date(l.acessoExpiraEm).getTime() <= em7).length,
          ferramentasDisponiveis: Object.values(ctx.estado.ferramentas).filter((f) => f.disponivel).length,
          ferramentasTotal: Object.keys(ctx.estado.ferramentas).length,
          atividadesRecentes: ctx.estado.eventosAdmin.filter((e) => Date.now() - new Date(e.criadoEm).getTime() < 7 * 86_400_000).length,
        };
      }),

    adminListarUsuarios: (filtro = {}, pagina) =>
      ctx.chamada(() => {
        const { eu, geral } = quemAdministra();
        const busca = filtro.busca?.trim().toLowerCase();
        const todos = visiveis(eu, geral)
          .map(linha)
          .filter((l) => !busca || [l.nome, l.email, l.organizacao ?? ""].some((x) => x.toLowerCase().includes(busca)))
          .filter((l) => !filtro.situacao || l.situacao === filtro.situacao)
          .sort((a, b) => a.nome.localeCompare(b.nome));
        return { itens: ctx.paginar(todos, pagina ?? { limite: 50 }), total: todos.length };
      }),

    adminObterUsuario: (id) =>
      ctx.chamada((): DetalheUsuarioAdmin => {
        const { eu, geral } = quemAdministra();
        const u = ctx.estado.usuarios.find((x) => x.id === id);
        if (!u || (u.id !== eu.id && !administra(u, eu, geral))) throw new ErroApi("NEGADO", "Você não administra o acesso desta pessoa.");
        const a = ctx.estado.acessos[u.id] ?? {};
        const { perfilNome: _p, ...base } = linha(u);
        return {
          ...base,
          escolas: ehAdmin(u) ? [] : [ESCOLA],
          permissoesRemovidas: a.permissoesRemovidas ?? [],
          suspensoEm: a.suspensoEm ?? null,
          motivoSuspensao: a.motivoSuspensao ?? null,
          removidoEm: a.removidoEm ?? null,
          editavel: administra(u, eu, geral),
          historico: ctx.estado.eventosAdmin
            .filter((e) => e.entidade === "usuarios" && e.entidadeId === u.id)
            .sort((x, y) => y.criadoEm.localeCompare(x.criadoEm))
            .slice(0, 20)
            .map((e) => ({ evento: e.evento, criadoEm: e.criadoEm, papelAutor: e.papelAutor, autorNome: nomeDe(e.autorId) })),
        };
      }),

    adminSuspender: (id, motivo) =>
      ctx.chamada(() => {
        const { geral } = exigirAdministra(id);
        const m = motivoValido(motivo, "da suspensão");
        const a = acesso(id);
        if (a.suspensoEm || a.removidoEm) throw new ErroApi("CONFLITO", "Este acesso já está suspenso ou removido.");
        a.suspensoEm = ctx.agora();
        a.motivoSuspensao = m;
        auditar(geral, "ACESSO_SUSPENSO", "usuarios", id);
      }),
    adminReativar: (id) =>
      ctx.chamada(() => {
        const { geral } = exigirAdministra(id);
        const a = acesso(id);
        if (!a.suspensoEm || a.removidoEm) throw new ErroApi("CONFLITO", "Só um acesso suspenso pode ser reativado.");
        a.suspensoEm = null;
        a.motivoSuspensao = null;
        auditar(geral, "ACESSO_REATIVADO", "usuarios", id);
      }),
    adminRemoverAcesso: (id, motivo) =>
      ctx.chamada(() => {
        const { geral } = exigirAdministra(id);
        motivoValido(motivo, "da remoção");
        const a = acesso(id);
        if (a.removidoEm) throw new ErroApi("CONFLITO", "Este acesso já foi removido.");
        // a demonstração tem uma escola só: os dois escopos encerram os vínculos; só o admin remove a conta
        for (const v of ctx.estado.vinculos) if (v.usuarioId === id && v.status !== "ENCERRADO") v.status = "ENCERRADO";
        if (geral) {
          a.removidoEm = ctx.agora();
          a.aguardandoAprovacao = false;
        }
        auditar(geral, "ACESSO_REMOVIDO", "usuarios", id, { escopo: geral ? "SISTEMA" : "ESCOLA" });
      }),
    adminDefinirValidade: (id, expiraEm) =>
      ctx.chamada(() => {
        const { geral } = exigirAdministra(id);
        if (expiraEm && new Date(expiraEm).getTime() <= Date.now()) throw new ErroApi("VALIDACAO", "A validade do acesso precisa ser uma data futura.");
        acesso(id).acessoExpiraEm = expiraEm;
        auditar(geral, "ACESSO_VALIDADE_DEFINIDA", "usuarios", id, { validade: expiraEm });
      }),
    adminAprovarAcesso: (id) =>
      ctx.chamada(() => {
        const { geral } = exigirAdministra(id);
        const a = acesso(id);
        if (!a.aguardandoAprovacao || a.removidoEm) throw new ErroApi("CONFLITO", "Este acesso não está aguardando aprovação.");
        a.aguardandoAprovacao = false;
        auditar(geral, "ACESSO_APROVADO", "usuarios", id);
      }),
    adminRecusarAcesso: (id, motivo) =>
      ctx.chamada(() => {
        const { geral } = exigirAdministra(id);
        const a = acesso(id);
        if (!a.aguardandoAprovacao || a.removidoEm) throw new ErroApi("CONFLITO", "Este acesso não está aguardando aprovação.");
        motivoValido(motivo, "da recusa");
        a.aguardandoAprovacao = false;
        a.removidoEm = ctx.agora();
        auditar(geral, "ACESSO_RECUSADO", "usuarios", id);
      }),
    adminDefinirPerfil: (id, perfilId, permissoesRemovidas) =>
      ctx.chamada(() => {
        const { alvo, geral } = exigirAdministra(id);
        if (perfilId) {
          const p = ctx.estado.perfis.find((x) => x.id === perfilId && !x.arquivadoEm);
          if (!p || !papeis(alvo).includes(p.papelBase)) {
            throw new ErroApi("VALIDACAO", "O perfil escolhido não corresponde a um papel que esta pessoa exerce.");
          }
        }
        if (permissoesRemovidas.some((x) => !DESCRICAO[x])) throw new ErroApi("VALIDACAO", "Permissão desconhecida.");
        const a = acesso(id);
        a.perfilId = perfilId;
        a.permissoesRemovidas = [...permissoesRemovidas];
        auditar(geral, "ACESSO_PERFIL_DEFINIDO", "usuarios", id, { perfil: perfilId, removidas: permissoesRemovidas });
      }),

    adminListarPerfis: () =>
      ctx.chamada(() => {
        quemAdministra();
        return [...ctx.estado.perfis]
          .sort((a, b) => Number(b.sistema) - Number(a.sistema) || a.nome.localeCompare(b.nome))
          .map((p) => comUsuarios({ ...p, teto: [...TETO[p.papelBase]] }));
      }),
    adminSalvarPerfil: (novo) =>
      ctx.chamada(() => {
        exigirAdminGeral();
        if ((novo.papelBase as PapelBase) === "ADMIN_GERAL") {
          throw new ErroApi("VALIDACAO", "O perfil de Administração geral é único e definido pelo sistema.");
        }
        const nome = novo.nome?.trim() ?? "";
        if (nome.length < 3 || nome.length > 60) throw new ErroApi("VALIDACAO", "O nome do perfil tem de 3 a 60 caracteres.");
        const fora = novo.permissoes.filter((x) => !(TETO[novo.papelBase] as readonly string[]).includes(x));
        if (fora.length) throw new ErroApi("VALIDACAO", `Permissões acima do teto do papel: ${fora.join(", ")}.`);
        const existente = novo.id ? ctx.estado.perfis.find((p) => p.id === novo.id) : undefined;
        if (existente?.sistema) throw new ErroApi("NEGADO", "Os perfis base do sistema não podem ser alterados.");
        if (ctx.estado.perfis.some((p) => p.nome.toLowerCase() === nome.toLowerCase() && p.id !== novo.id)) {
          throw new ErroApi("CONFLITO", "Já existe um perfil com esse nome.");
        }
        const permissoes = [...new Set(novo.permissoes)].sort();
        let id = novo.id;
        if (existente) {
          if (existente.arquivadoEm) throw new ErroApi("CONFLITO", "Perfil não encontrado ou arquivado.");
          Object.assign(existente, { nome, descricao: novo.descricao?.trim() || null, papelBase: novo.papelBase, permissoes });
        } else {
          if (novo.id) throw new ErroApi("CONFLITO", "Perfil não encontrado ou arquivado.");
          id = uuid();
          ctx.estado.perfis.push({
            id,
            nome,
            descricao: novo.descricao?.trim() || null,
            papelBase: novo.papelBase,
            permissoes,
            teto: [...TETO[novo.papelBase]],
            sistema: false,
            arquivadoEm: null,
          });
        }
        auditar(true, existente ? "PERFIL_ALTERADO" : "PERFIL_CRIADO", "perfis_acesso", id!, { nome, papelBase: novo.papelBase, permissoes });
        return id!;
      }),
    adminArquivarPerfil: (id) =>
      ctx.chamada(() => {
        exigirAdminGeral();
        const p = ctx.estado.perfis.find((x) => x.id === id);
        if (p?.sistema) throw new ErroApi("NEGADO", "Os perfis base do sistema não podem ser arquivados.");
        if (Object.values(ctx.estado.acessos).some((a) => a.perfilId === id && !a.removidoEm)) {
          throw new ErroApi("CONFLITO", "Há pessoas com este perfil. Troque o perfil delas antes de arquivar.");
        }
        if (!p || p.arquivadoEm) throw new ErroApi("CONFLITO", "Perfil não encontrado ou já arquivado.");
        p.arquivadoEm = ctx.agora();
        auditar(true, "PERFIL_ARQUIVADO", "perfis_acesso", id);
      }),

    adminCatalogo: () =>
      ctx.chamada(() => {
        quemAdministra();
        return Object.keys(DESCRICAO).map((chave): ItemCatalogo => {
          const [ferramenta, acao] = chave.split(":") as [Ferramenta, ItemCatalogo["acao"]];
          return {
            ferramenta,
            acao,
            papeis: (Object.keys(TETO) as PapelBase[]).filter((p) => (TETO[p] as readonly string[]).includes(chave)),
            descricao: DESCRICAO[chave]!,
            disponivel: ctx.estado.ferramentas[ferramenta].disponivel,
            alteradoEm: ctx.estado.ferramentas[ferramenta].alteradoEm,
          };
        });
      }),
    adminDefinirFerramenta: (ferramenta, disponivel) =>
      ctx.chamada(() => {
        exigirAdminGeral();
        const f = ctx.estado.ferramentas[ferramenta];
        if (!f) throw new ErroApi("VALIDACAO", "Ferramenta desconhecida.");
        if (f.disponivel === disponivel) throw new ErroApi("CONFLITO", "A ferramenta já está nesse estado.");
        f.disponivel = disponivel;
        f.alteradoEm = ctx.agora();
        auditar(true, disponivel ? "FERRAMENTA_LIGADA" : "FERRAMENTA_DESLIGADA", "ferramentas_status", null, { ferramenta });
      }),

    adminConfiguracoes: () =>
      ctx.chamada(() => {
        quemAdministra();
        return ctx.estado.configuracoes;
      }),
    adminSalvarConfiguracoes: (c) =>
      ctx.chamada(() => {
        exigirAdminGeral();
        if (!Number.isInteger(c.validadePadraoDias) || c.validadePadraoDias < 1 || c.validadePadraoDias > 730) {
          throw new ErroApi("VALIDACAO", "A validade padrão vai de 1 a 730 dias.");
        }
        ctx.estado.configuracoes = { ...c, alteradoEm: ctx.agora() };
        auditar(true, "CONFIGURACOES_ALTERADAS", "configuracoes_sistema", null, { ...c });
      }),

    adminListarAuditoria: (busca, pagina) =>
      ctx.chamada(() => {
        quemAdministra();
        const b = busca?.trim().toLowerCase();
        const perfilNome = (id: string | null) => ctx.estado.perfis.find((p) => p.id === id)?.nome ?? null;
        const todos = ctx.estado.eventosAdmin
          .map((e): EventoAdmin => ({
            criadoEm: e.criadoEm,
            evento: e.evento,
            papelAutor: e.papelAutor,
            autorNome: nomeDe(e.autorId),
            entidade: e.entidade,
            alvoNome: e.entidade === "usuarios" ? nomeDe(e.entidadeId) : e.entidade === "perfis_acesso" ? perfilNome(e.entidadeId) : null,
            detalhes: e.detalhes,
          }))
          .filter((e) => !b || [e.autorNome ?? "", e.alvoNome ?? "", e.evento].some((x) => x.toLowerCase().includes(b)))
          .sort((x, y) => y.criadoEm.localeCompare(x.criadoEm));
        return { itens: ctx.paginar(todos, pagina ?? { limite: 50 }), total: todos.length };
      }),
    adminListarEscolas: () =>
      ctx.chamada(() => {
        quemAdministra();
        return [ESCOLA];
      }),
  } satisfies Partial<PeiVivoApi>;
}
