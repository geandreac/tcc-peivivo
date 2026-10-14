/**
 * Caso de uso da Edge Function `convidar` (R2.1, D-32). Ordem:
 * valida o corpo → `preparar` com o JWT da coordenação (o banco decide se ela
 * pode, aal2) → se a pessoa ainda não aceitou um convite, o Auth envia o
 * e-mail (service role) → `registrar` (service role; o banco revalida e grava).
 */
import { EntradaConviteSchema, type RespostaConvite } from "@pei-vivo/contratos";
import { ErroFuncao, deErroBanco } from "./erros";

export interface DadosConvite {
  escolaId: string;
  email: string;
  papel: string;
  estudanteId: string | null;
  registroConselho: string | null;
  conferidoPresencialmente: boolean;
}

export interface PortasConvidar {
  /** `fn_preparar_convite` com o JWT de quem convida. */
  preparar(e: DadosConvite): Promise<{ autorId: string; email: string; jaTemConta: boolean }>;
  /** Auth admin: cria a conta e envia o e-mail. Devolve o id da conta, ou null se já havia convite pendente no Auth. */
  convidarNoAuth(email: string): Promise<string | null>;
  /** `fn_registrar_convite` com service role. */
  registrar(r: DadosConvite & { autorId: string; authUserId: string | null; nome: string }): Promise<unknown>;
}

export const AVISO_CONTA_NO_AUTH =
  "Esta pessoa já tinha um convite pendente. O acesso foi registrado; se ela não encontrar o e-mail, pode usar “Esqueci minha senha”.";

export async function convidar(corpo: unknown, portas: PortasConvidar): Promise<RespostaConvite> {
  const entrada = EntradaConviteSchema.safeParse(corpo);
  if (!entrada.success) throw new ErroFuncao(400, "VALIDACAO", entrada.error.issues[0]?.message ?? "Dados inválidos.");
  const e = entrada.data;
  const dados: DadosConvite = {
    escolaId: e.escolaId,
    email: e.email,
    papel: e.papel,
    estudanteId: e.estudanteId,
    registroConselho: e.registroConselho,
    conferidoPresencialmente: e.conferidoPresencialmente,
  };

  let preparo: { autorId: string; email: string; jaTemConta: boolean };
  try {
    preparo = await portas.preparar(dados);
  } catch (erro) {
    throw deErroBanco(erro);
  }

  const avisos: string[] = [];
  let authUserId: string | null = null;
  let emailEnviado = false;
  if (!preparo.jaTemConta) {
    try {
      authUserId = await portas.convidarNoAuth(preparo.email);
    } catch {
      throw new ErroFuncao(502, "INTERNO", "Não foi possível enviar o convite agora. Tente de novo em instantes.");
    }
    emailEnviado = authUserId !== null;
    if (!emailEnviado) avisos.push(AVISO_CONTA_NO_AUTH);
  }

  try {
    // o autor vem do banco (auth.uid()), nunca do corpo
    await portas.registrar({ ...dados, email: preparo.email, autorId: preparo.autorId, authUserId, nome: e.nome });
  } catch (erro) {
    throw deErroBanco(erro);
  }
  return { emailEnviado, avisos };
}
