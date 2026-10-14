// GERADO por scripts/sincronizar-funcoes.mjs a partir de packages/funcoes/src/fecharCiclo.ts — NÃO EDITE.
/**
 * Caso de uso da Edge Function `fechar-ciclo` (F6/F7, D-37, HU-D.02).
 * Ordem: valida a entrada → `dados` (como o docente; o banco decide se pode) →
 * motor (RN03) → `registrar` (service role; o banco revalida e decide RN06).
 * `calcularFechamento` é puro e também é usado pelo protótipo (mockApi).
 */
import { EntradaFecharCicloSchema, ParametrosAdaptacaoSchema, type DiffParametro, type RespostaFecharCiclo } from "../contratos/index.ts";
import {
  PARAMETROS_PADRAO,
  aplicarCiclo,
  derivarInteresseAncora,
  observacoesDoUltimoCiclo,
  type DimensaoObservada,
  type ObservacaoHistorica,
  type ParametrosAdaptacao,
} from "../motor/index.ts";
import { ErroFuncao, deErroBanco } from "./erros.ts";

export interface DadosFechamento {
  docenteId: string;
  estudanteId: string;
  cicloId: string;
  numeroCiclo: number;
  vigente: { id: string; numeroCiclo: number; parametros: ParametrosAdaptacao } | null;
  validacaoClinica: boolean;
  historico: ObservacaoHistorica[];
}

export interface PortasFecharCiclo {
  /** `fn_dados_fechamento` com o JWT do docente. */
  dados(cicloId: string): Promise<DadosFechamento>;
  /** `fn_registrar_fechamento` com service role. */
  registrar(docenteId: string, cicloId: string, parametros: ParametrosAdaptacao): Promise<{
    versaoId: string;
    statusValidacao: "PENDENTE" | "VIGENTE";
    modoPedagogico: boolean;
  }>;
}

const CAMPOS: DiffParametro["campo"][] = [
  "maxLinhasPorBloco",
  "formatoEnunciado",
  "nivelVocabulario",
  "blocosPorMaterial",
  "contrasteMinimo",
  "interesseAncora",
];

const DIMENSAO_PARA_CAMPO: Record<DimensaoObservada, DiffParametro["campo"]> = {
  ATENCAO_SUSTENTADA: "maxLinhasPorBloco",
  COMPREENSAO_ENUNCIADOS: "formatoEnunciado",
  AUTONOMIA_LEXICAL: "nivelVocabulario",
  INTERESSE_MANIFESTO: "interesseAncora",
  SENSIBILIDADE_VISUAL: "contrasteMinimo",
  FADIGA_TAREFA: "blocosPorMaterial",
};

/** Dimensões em que "ampliada" eleva o parâmetro — e por isso exige 2 ciclos (RN03). */
const ELEVA_COM_DOIS_CICLOS: DimensaoObservada[] = ["ATENCAO_SUSTENTADA", "COMPREENSAO_ENUNCIADOS", "AUTONOMIA_LEXICAL"];

const formatar = (v: unknown) => (v === null || v === undefined ? "—" : String(v));

export function calcularFechamento(
  numeroCiclo: number,
  vigente: ParametrosAdaptacao | null,
  historico: ObservacaoHistorica[],
): { proposta: ParametrosAdaptacao; diff: DiffParametro[] } {
  const base = vigente ?? PARAMETROS_PADRAO;
  const ate = historico.filter((h) => h.numeroCiclo <= numeroCiclo);
  const doCiclo = ate.some((h) => h.numeroCiclo === numeroCiclo) ? observacoesDoUltimoCiclo(ate) : [];
  const proposta = aplicarCiclo(base, doCiclo);
  proposta.interesseAncora = derivarInteresseAncora(ate, base.interesseAncora);

  const aguardando = new Set<DiffParametro["campo"]>();
  for (const o of doCiclo) {
    if (o.valorEscala === "AMPLIADA" && ELEVA_COM_DOIS_CICLOS.includes(o.dimensao) && o.ciclosConsecutivos < 2) {
      aguardando.add(DIMENSAO_PARA_CAMPO[o.dimensao]);
    }
  }
  const diff = CAMPOS.map((campo) => ({
    campo,
    antes: formatar(base[campo]),
    depois: formatar(proposta[campo]),
    mudou: base[campo] !== proposta[campo],
    aguardandoSegundoCiclo: aguardando.has(campo),
  }));
  return { proposta, diff };
}

export async function fecharCiclo(corpo: unknown, portas: PortasFecharCiclo): Promise<RespostaFecharCiclo> {
  const entrada = EntradaFecharCicloSchema.safeParse(corpo);
  if (!entrada.success) throw new ErroFuncao(400, "VALIDACAO", entrada.error.issues[0]?.message ?? "Dados inválidos.");

  let dados: DadosFechamento;
  try {
    dados = await portas.dados(entrada.data.cicloId);
  } catch (e) {
    throw deErroBanco(e);
  }

  const { proposta, diff } = calcularFechamento(dados.numeroCiclo, dados.vigente?.parametros ?? null, dados.historico);
  // Defesa em profundidade: o banco também valida (privado.parametros_validos).
  const valida = ParametrosAdaptacaoSchema.safeParse(proposta);
  if (!valida.success) throw new ErroFuncao(500, "INTERNO", "O motor produziu parâmetros fora do contrato.");

  try {
    // O docente vem do banco (auth.uid()), nunca do corpo da requisição.
    const r = await portas.registrar(dados.docenteId, dados.cicloId, valida.data);
    return { ...r, diff };
  } catch (e) {
    throw deErroBanco(e);
  }
}
