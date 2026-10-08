/**
 * Contratos compartilhados entre o app (apps/web) e as Edge Functions (D-31).
 * O mesmo schema valida a entrada no formulário e no servidor: uma regra só,
 * escrita uma vez. Mensagens em linguagem simples (aparecem para o usuário).
 *
 * Importável de Node/Vite (`@pei-vivo/contratos`) e de Deno (cópia gerada em
 * supabase/functions/_shared/gerado/ por scripts/sincronizar-funcoes.mjs).
 */
import { z } from "zod";

export const LIMITE_TEXTO = 20_000;
export const LIMITE_TITULO = 120;
/** RNF08: a IA nunca segura a geração; passado o limite, vale só a camada de regras. */
export const TIMEOUT_IA_MS = 30_000;

// ------------------------------------------------------------------ parâmetros
/** Espelha `ParametrosAdaptacao` do motor (6 campos, D-13) e `privado.parametros_validos` no banco. */
export const ParametrosAdaptacaoSchema = z
  .object({
    maxLinhasPorBloco: z.number().int().min(1).max(20),
    nivelVocabulario: z.enum(["BASICO", "INTERMEDIARIO", "ORIGINAL"]),
    interesseAncora: z.string().max(60).nullable(),
    formatoEnunciado: z.enum(["ETAPA_UNICA", "MULTIPLAS_ETAPAS"]),
    contrasteMinimo: z.union([z.literal(4.5), z.literal(7)]),
    blocosPorMaterial: z.number().int().min(1).max(30),
  })
  .strict();

// ------------------------------------------------------------------ gerar-material (F8)
export const EntradaGerarMaterialSchema = z
  .object({
    estudanteId: z.string().uuid("Estudante inválido."),
    titulo: z.string().trim().max(LIMITE_TITULO, `O título pode ter até ${LIMITE_TITULO} caracteres.`).default(""),
    texto: z
      .string()
      .trim()
      .min(1, "Cole um texto para adaptar.")
      .max(LIMITE_TEXTO, `O texto pode ter até ${LIMITE_TEXTO.toLocaleString("pt-BR")} caracteres.`),
  })
  .strict();
export type EntradaGerarMaterial = z.infer<typeof EntradaGerarMaterialSchema>;

export type OrigemMaterial = "REGRAS" | "REGRAS_E_IA";
export interface RespostaGerarMaterial {
  materialId: string;
  emCache: boolean;
  origem: OrigemMaterial;
  /** Avisos em linguagem simples (ex.: IA indisponível, revisão em andamento). Nunca erro. */
  avisos: string[];
  duracaoMs: number;
}

/**
 * Saída da camada de IA — tratada como NÃO CONFIÁVEL (prompt §9): só é usada
 * se passar por este schema, e o material sempre passa por revisão humana (RN04).
 */
export const SaidaIASchema = z
  .object({
    textoSimplificado: z.string().min(1).max(Math.floor(LIMITE_TEXTO * 1.5)),
    glossario: z
      .array(z.object({ termo: z.string().min(1).max(60), explicacao: z.string().min(1).max(300) }).strict())
      .max(50)
      .default([]),
  })
  .strict();
export type SaidaIA = z.infer<typeof SaidaIASchema>;

// ------------------------------------------------------------------ fechar-ciclo (F6/F7)
export const EntradaFecharCicloSchema = z.object({ cicloId: z.string().uuid("Ciclo inválido.") }).strict();
export type EntradaFecharCiclo = z.infer<typeof EntradaFecharCicloSchema>;

export interface DiffParametro {
  campo: "maxLinhasPorBloco" | "nivelVocabulario" | "interesseAncora" | "formatoEnunciado" | "contrasteMinimo" | "blocosPorMaterial";
  antes: string;
  depois: string;
  mudou: boolean;
  /** RN03: a dimensão foi "ampliada" só 1 ciclo — elevar exige o 2º. */
  aguardandoSegundoCiclo: boolean;
}

export interface RespostaFecharCiclo {
  versaoId: string;
  statusValidacao: "PENDENTE" | "VIGENTE";
  /** RN06: sem profissional de saúde ativo, a versão entra em vigor sem validação clínica. */
  modoPedagogico: boolean;
  diff: DiffParametro[];
}

// ------------------------------------------------------------------ erros
/** Códigos estáveis (os mesmos de `ErroApi` no app). */
export type CodigoErro = "NEGADO" | "CONFLITO" | "VALIDACAO" | "NAO_AUTENTICADO" | "INTERNO";
export interface CorpoErro {
  erro: { codigo: CodigoErro; mensagem: string };
}
