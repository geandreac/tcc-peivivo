/** Sessão, senha e segundo fator (Supabase Auth). O perfil vem sempre do banco (fn_meu_perfil, D-32). */
import type { PeiVivoApi } from "../api";
import { ErroApi } from "../erros";
import { exec } from "./infra";
import { SITUACAO_BLOQUEADA, paraUsuario, type Contexto } from "./contexto";
import { lembrarSessao } from "./armazenamento";

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
      await c.carregarPerfil();
      // usuarioAtual() já descarta a situação bloqueada (suspenso, expirado…)
      return c.usuarioAtual();
    },
    entrarComSenha: async (email, senha, lembrar = false) => {
      lembrarSessao(lembrar); // antes do login: o token já é gravado no lugar escolhido
      const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password: senha });
      // mensagem genérica: não revela se o e-mail existe (prompt §4.1)
      if (error) throw new ErroApi("NAO_AUTENTICADO", "E-mail ou senha incorretos.");
      const p = await c.carregarPerfil();
      const bloqueio = p?.situacao ? SITUACAO_BLOQUEADA[p.situacao] : undefined;
      if (!p || bloqueio) {
        await sb.auth.signOut({ scope: "local" });
        c.definirPerfil(null);
        throw new ErroApi("NEGADO", bloqueio ?? "Sua conta ainda não foi liberada pela escola.");
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
      const p = await c.carregarPerfil();
      // D-50: a senha foi criada, mas o acesso só vale depois da aprovação no painel
      if (p?.situacao === "AGUARDANDO_APROVACAO") {
        await sb.auth.signOut({ scope: "local" });
        c.definirPerfil(null);
        throw new ErroApi("NEGADO", "Senha criada. Seu acesso ainda aguarda a aprovação da escola; você poderá entrar assim que for aprovado.");
      }
    },
  } satisfies Partial<PeiVivoApi>;
}
