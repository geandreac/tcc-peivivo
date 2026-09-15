/**
 * Erros da camada de serviços. O front trata sempre por `codigo`, nunca por
 * mensagem — assim a troca do mock pelo supabase-js (PostgREST devolve
 * 401/403/409/42501) não muda nenhuma tela.
 */
export type CodigoErro =
  | "NAO_AUTENTICADO" // 401
  | "NEGADO" // 403 / 42501 — RLS
  | "NAO_ENCONTRADO" // 404
  | "CONFLITO" // 409 (ciclo já fechado, sem versão vigente, desfecho duplicado)
  | "VALIDACAO" // 400 (Zod)
  | "REDE"; // falha de rede / timeout

export class ErroApi extends Error {
  readonly codigo: CodigoErro;
  readonly status: number;

  constructor(codigo: CodigoErro, mensagem: string) {
    super(mensagem);
    this.name = "ErroApi";
    this.codigo = codigo;
    this.status = STATUS[codigo];
  }
}

const STATUS: Record<CodigoErro, number> = {
  NAO_AUTENTICADO: 401,
  NEGADO: 403,
  NAO_ENCONTRADO: 404,
  CONFLITO: 409,
  VALIDACAO: 400,
  REDE: 0,
};

export function ehErroApi(e: unknown): e is ErroApi {
  return e instanceof ErroApi;
}

/** Mensagem em linguagem simples para o usuário (3.3.1, 3.3.3). */
export function mensagemAmigavel(e: unknown): string {
  if (ehErroApi(e)) {
    switch (e.codigo) {
      case "NEGADO":
        return e.message || "Você não tem permissão para esta ação.";
      case "NAO_AUTENTICADO":
        return "Sua sessão expirou. Entre novamente.";
      case "NAO_ENCONTRADO":
        return "Não encontramos o que você procurava.";
      case "CONFLITO":
        return e.message;
      case "VALIDACAO":
        return e.message;
      case "REDE":
        return "Não foi possível conectar. Verifique sua internet e tente de novo.";
    }
  }
  return "Algo deu errado. Tente novamente em instantes.";
}
