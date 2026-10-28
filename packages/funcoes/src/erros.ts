/**
 * Erro de caso de uso com status HTTP e código estável. O banco já decidiu
 * (RLS/RPC); aqui só traduzimos o SQLSTATE para a resposta da Edge Function.
 */
import { CODIGO_DO_SQLSTATE, type CodigoErro } from "@pei-vivo/contratos";

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
  const codigo = code ? CODIGO_DO_SQLSTATE[code] : undefined;
  if (!codigo) {
    // Nunca repassa detalhe interno (pode conter dado pessoal ou estrutura do banco).
    return new ErroFuncao(500, "INTERNO", "Algo deu errado do nosso lado. Tente de novo em instantes.");
  }
  const { status, padrao } = HTTP_DO_CODIGO[codigo];
  return new ErroFuncao(status, codigo, message || padrao);
}

const HTTP_DO_CODIGO = {
  NEGADO: { status: 403, padrao: "Seu perfil não tem permissão para esta ação." },
  CONFLITO: { status: 409, padrao: "A situação mudou; recarregue e tente de novo." },
  VALIDACAO: { status: 400, padrao: "Dados inválidos." },
} as const;
