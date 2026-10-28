/** Painel administrativo (D-50). Só RPCs fn_admin_*: quem decide escopo e permissão é o banco (0012). */
import type { PeiVivoApi } from "../api";
import type { ConfiguracoesSistema, DetalheUsuarioAdmin, EventoAdmin, ItemCatalogo, PapelBase, PerfilAcesso, ResumoAdmin, UsuarioAdmin } from "../tipos";
import { exec, type Linha } from "./infra";
import type { Contexto } from "./contexto";

const LIMITE_PADRAO = 50;
const texto = (v: unknown) => (v == null ? null : String(v));

const paraUsuarioAdmin = (l: Linha): UsuarioAdmin => ({
  id: String(l.id),
  nome: String(l.nome),
  email: String(l.email),
  organizacao: texto(l.organizacao),
  perfilId: texto(l.perfil_id),
  perfilNome: texto(l.perfil_nome),
  papeis: (l.papeis as PapelBase[] | null) ?? [],
  situacao: l.situacao as UsuarioAdmin["situacao"],
  ultimoLogin: texto(l.ultimo_login),
  acessoExpiraEm: texto(l.acesso_expira_em),
});

const paraPerfil = (l: Linha): PerfilAcesso => ({
  id: String(l.id),
  nome: String(l.nome),
  descricao: texto(l.descricao),
  papelBase: l.papel_base as PapelBase,
  permissoes: (l.permissoes as string[] | null) ?? [],
  teto: (l.teto as string[] | null) ?? [],
  sistema: Boolean(l.sistema),
  arquivadoEm: texto(l.arquivado_em),
  usuarios: Number(l.usuarios ?? 0),
});

const paraEvento = (l: Linha): EventoAdmin => ({
  criadoEm: String(l.criado_em),
  evento: String(l.evento),
  papelAutor: texto(l.papel_autor),
  autorNome: texto(l.autor_nome),
  entidade: String(l.entidade),
  alvoNome: texto(l.alvo_nome),
  detalhes: (l.detalhes as Record<string, unknown> | null) ?? {},
});

export function admin(c: Contexto) {
  const { sb } = c;
  return {
    adminResumo: async () => exec<ResumoAdmin>(sb.rpc("fn_admin_resumo")),
    adminListarUsuarios: async (filtro = {}, pagina) => {
      const linhas = await exec<Linha[]>(
        sb.rpc("fn_admin_listar_usuarios", {
          p_busca: filtro.busca?.trim() || null,
          p_situacao: filtro.situacao ?? null,
          p_limite: pagina?.limite ?? LIMITE_PADRAO,
          p_deslocamento: pagina?.deslocamento ?? 0,
        }),
      );
      return { itens: linhas.map(paraUsuarioAdmin), total: Number(linhas[0]?.total ?? 0) };
    },
    adminObterUsuario: async (id) => exec<DetalheUsuarioAdmin>(sb.rpc("fn_admin_obter_usuario", { p_usuario: id })),
    adminSuspender: async (id, motivo) => {
      await exec(sb.rpc("fn_admin_suspender", { p_usuario: id, p_motivo: motivo }));
    },
    adminReativar: async (id) => {
      await exec(sb.rpc("fn_admin_reativar", { p_usuario: id }));
    },
    adminRemoverAcesso: async (id, motivo) => {
      await exec(sb.rpc("fn_admin_remover_acesso", { p_usuario: id, p_motivo: motivo }));
    },
    adminDefinirValidade: async (id, expiraEm) => {
      await exec(sb.rpc("fn_admin_definir_validade", { p_usuario: id, p_expira_em: expiraEm }));
    },
    adminAprovarAcesso: async (id) => {
      await exec(sb.rpc("fn_admin_aprovar_acesso", { p_usuario: id }));
    },
    adminRecusarAcesso: async (id, motivo) => {
      await exec(sb.rpc("fn_admin_recusar_acesso", { p_usuario: id, p_motivo: motivo }));
    },
    adminDefinirPerfil: async (id, perfilId, permissoesRemovidas) => {
      await exec(sb.rpc("fn_admin_definir_perfil", { p_usuario: id, p_perfil: perfilId, p_permissoes_removidas: permissoesRemovidas }));
    },
    adminListarPerfis: async () => (await exec<Linha[]>(sb.rpc("fn_admin_listar_perfis"))).map(paraPerfil),
    adminSalvarPerfil: async (p) =>
      exec<string>(
        sb.rpc("fn_admin_salvar_perfil", {
          p_id: p.id ?? null,
          p_nome: p.nome,
          p_descricao: p.descricao ?? null,
          p_papel_base: p.papelBase,
          p_permissoes: p.permissoes,
        }),
      ),
    adminArquivarPerfil: async (id) => {
      await exec(sb.rpc("fn_admin_arquivar_perfil", { p_id: id }));
    },
    adminCatalogo: async () =>
      (await exec<Linha[]>(sb.rpc("fn_admin_catalogo"))).map((l): ItemCatalogo => ({
        ferramenta: l.ferramenta as ItemCatalogo["ferramenta"],
        acao: l.acao as ItemCatalogo["acao"],
        papeis: (l.papeis as PapelBase[] | null) ?? [],
        descricao: String(l.descricao),
        disponivel: Boolean(l.disponivel),
        alteradoEm: texto(l.alterado_em),
      })),
    adminDefinirFerramenta: async (ferramenta, disponivel) => {
      await exec(sb.rpc("fn_admin_definir_ferramenta", { p_ferramenta: ferramenta, p_disponivel: disponivel }));
    },
    adminConfiguracoes: async () => exec<ConfiguracoesSistema>(sb.rpc("fn_admin_configuracoes")),
    adminSalvarConfiguracoes: async (cfg) => {
      await exec(
        sb.rpc("fn_admin_salvar_configuracoes", {
          p_exigir_aprovacao_externos: cfg.exigirAprovacaoExternos,
          p_validade_padrao_dias: cfg.validadePadraoDias,
        }),
      );
    },
    adminListarAuditoria: async (busca, pagina) => {
      const linhas = await exec<Linha[]>(
        sb.rpc("fn_admin_listar_auditoria", {
          p_busca: busca?.trim() || null,
          p_limite: pagina?.limite ?? LIMITE_PADRAO,
          p_deslocamento: pagina?.deslocamento ?? 0,
        }),
      );
      return { itens: linhas.map(paraEvento), total: Number(linhas[0]?.total ?? 0) };
    },
    adminListarEscolas: async () => (await exec<Linha[]>(sb.rpc("fn_admin_listar_escolas"))).map((l) => ({ id: String(l.id), nome: String(l.nome) })),
  } satisfies Partial<PeiVivoApi>;
}
