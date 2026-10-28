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
  /** D-50: campos do painel administrativo (o banco valida perfil, teto e validade). */
  perfilId: string | null;
  permissoesRemovidas: string[];
  organizacao: string | null;
  acessoExpiraEm: string | null;
  exigeAprovacao: boolean | null;
}

export interface PreparoConvite {
  autorId: string;
  email: string;
  jaTemConta: boolean;
  /** Resolvido pelo banco (configuração do sistema quando o corpo não diz). */
  exigeAprovacao?: boolean;
}

export interface PortasConvidar {
  /** `fn_preparar_convite` com o JWT de quem convida. */
  preparar(e: DadosConvite): Promise<PreparoConvite>;
  /** Auth admin: cria a conta e envia o e-mail. Devolve o id da conta, ou null se já havia convite pendente no Auth. */
  convidarNoAuth(email: string): Promise<string | null>;
  /** `fn_registrar_convite` com service role. */
  registrar(r: Omit<DadosConvite, "exigeAprovacao"> & { autorId: string; authUserId: string | null; nome: string; exigeAprovacao: boolean }): Promise<unknown>;
  /** Auth admin: apaga a conta criada por `convidarNoAuth` quando o registro falha (o link do e-mail deixa de valer). */
  desfazerNoAuth?(authUserId: string): Promise<void>;
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
    perfilId: e.perfilId,
    permissoesRemovidas: e.permissoesRemovidas,
    organizacao: e.organizacao,
    acessoExpiraEm: e.acessoExpiraEm,
    exigeAprovacao: e.exigeAprovacao,
  };

  let preparo: PreparoConvite;
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
    // o autor e a exigência de aprovação vêm do banco, nunca do corpo
    const exigeAprovacao = preparo.exigeAprovacao ?? false;
    await portas.registrar({ ...dados, email: preparo.email, autorId: preparo.autorId, authUserId, nome: e.nome, exigeAprovacao });
  } catch (erro) {
    // Compensação: conta criada agora, sem acesso registrado → apaga, senão o e-mail leva a uma conta vazia.
    if (authUserId) await portas.desfazerNoAuth?.(authUserId).catch(() => undefined);
    throw deErroBanco(erro);
  }
  return { emailEnviado, exigeAprovacao: preparo.exigeAprovacao ?? false, avisos };
}
