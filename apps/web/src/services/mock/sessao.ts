/** Sessão da demonstração: entrar escolhendo um perfil fictício; o que exige Supabase responde que só existe no modo real. */
import type { PeiVivoApi } from "../api";
import { ErroApi } from "../erros";
import { gravarStorage, CHAVE_SESSAO, type ContextoMock } from "./contexto";

export function sessao(ctx: ContextoMock) {
  return {
    modo: "demonstracao",
    carregarSessao: () => ctx.chamada(() => (ctx.sessaoId ? (ctx.estado.usuarios.find((x) => x.id === ctx.sessaoId) ?? null) : null)),
    entrarComSenha: () => ctx.soNoModoReal(),
    nivelSessao: () => ctx.chamada(() => ({ atual: "aal2" as const, temFatorCadastrado: true })),
    iniciarCadastroSegundoFator: () => ctx.soNoModoReal(),
    verificarSegundoFator: () => ctx.soNoModoReal(),
    pedirRecuperacaoSenha: () => ctx.soNoModoReal(),
    definirSenha: () => ctx.soNoModoReal(),
    sairDeTodos: () => ctx.api.sair(),

    // ---- sessão
    listarPerfisDemo: () => ctx.chamada(() => ctx.estado.usuarios),
    entrar: (usuarioId) =>
      ctx.chamada(() => {
        const u = ctx.estado.usuarios.find((x) => x.id === usuarioId);
        if (!u) throw new ErroApi("NAO_ENCONTRADO", "Perfil não encontrado.");
        ctx.sessaoId = u.id;
        if (ctx.persistir) gravarStorage(CHAVE_SESSAO, ctx.sessaoId);
        return u;
      }),
    sair: () =>
      ctx.chamada(() => {
        ctx.sessaoId = null;
        try {
          globalThis.localStorage?.removeItem(CHAVE_SESSAO);
        } catch {
          /* ignora */
        }
      }),
    usuarioAtual: () => (ctx.sessaoId ? (ctx.estado.usuarios.find((x) => x.id === ctx.sessaoId) ?? null) : null),
  } satisfies Partial<PeiVivoApi>;
}
