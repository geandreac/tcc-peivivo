// GERADO por scripts/sincronizar-funcoes.mjs a partir de packages/funcoes/src/erros.ts — NÃO EDITE.
/**
 * Erro de caso de uso com status HTTP e código estável. O banco já decidiu
 * (RLS/RPC); aqui só traduzimos o SQLSTATE para a resposta da Edge Function.
 */
import type { CodigoErro } from "../contratos/index.ts";

export class ErroFuncao extends Error {
  constructor(
    readonly status: number,
    readonly codigo: CodigoErro,
    mensagem: string,
  ) {
    super(mensagem);
    this.name = "ErroFuncao";
  }
}

/** SQLSTATE → HTTP (mesma convenção do PostgREST e de `0004`). */
export function deErroBanco(e: unknown): ErroFuncao {
  if (e instanceof ErroFuncao) return e;
  const { code, message } = (e ?? {}) as { code?: string; message?: string };
  const msg = message ?? "";
  switch (code) {
    case "42501":
      return new ErroFuncao(403, "NEGADO", msg || "Seu perfil não tem permissão para esta ação.");
    case "PT409":
    case "23505":
      return new ErroFuncao(409, "CONFLITO", msg || "A situação mudou; recarregue e tente de novo.");
    case "22023":
    case "23514":
      return new ErroFuncao(400, "VALIDACAO", msg || "Dados inválidos.");
    default:
      // Nunca repassa detalhe interno (pode conter dado pessoal ou estrutura do banco).
      return new ErroFuncao(500, "INTERNO", "Algo deu errado do nosso lado. Tente de novo em instantes.");
  }
}
