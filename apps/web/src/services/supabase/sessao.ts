/** Sessão, senha e segundo fator (Supabase Auth). O perfil vem sempre do banco (fn_meu_perfil, D-32). */
import type { PeiVivoApi } from "../api";
import { ErroApi } from "../erros";
import { exec } from "./infra";
import { paraUsuario, type Contexto } from "./contexto";

export function sessao(c: Contexto) {
  const { sb } = c;
  return {
    // ---- sessão (modo demonstração não existe aqui)
    listarPerfisDemo: async () => [],
    entrar: async () => {
      throw new ErroApi("VALIDACAO", "No sistema real, entre com e-mail e senha.");
    },
    sair: async () => {
      c.definirPerfil(null);
      await sb.auth.signOut({ scope: "local" });
    },
    sairDeTodos: async () => {
      c.definirPerfil(null);
      await sb.auth.signOut({ scope: "global" });
    },
    usuarioAtual: () => c.usuarioAtual(),
    carregarSessao: async () => {
      const p = await c.carregarPerfil();
      return p ? paraUsuario(p) : null;
    },
    entrarComSenha: async (email, senha) => {
      const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password: senha });
      // mensagem genérica: não revela se o e-mail existe (prompt §4.1)
      if (error) throw new ErroApi("NAO_AUTENTICADO", "E-mail ou senha incorretos.");
      const p = await c.carregarPerfil();
      if (!p) {
        await sb.auth.signOut({ scope: "local" });
        throw new ErroApi("NEGADO", "Sua conta ainda não foi liberada pela escola.");
      }
      const n = await c.nivel();
      return { usuario: paraUsuario(p), exigeSegundoFator: p.exigeSegundoFator && n.atual !== "aal2", temFatorCadastrado: n.temFatorCadastrado };
    },
    nivelSessao: () => c.nivel(),
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
      if (error)
        throw new ErroApi(
          "VALIDACAO",
          error.message.includes("characters") ? "A senha precisa ter pelo menos 10 caracteres." : "Não foi possível definir a senha.",
        );
      if (versaoTermosAceita) await exec(sb.rpc("fn_aceitar_termos", { p_versao: versaoTermosAceita }));
      await c.carregarPerfil();
    },
  } satisfies Partial<PeiVivoApi>;
}
