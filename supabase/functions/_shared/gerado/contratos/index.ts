// GERADO por scripts/sincronizar-funcoes.mjs a partir de packages/contratos/src/index.ts — NÃO EDITE.
/**
 * Contratos compartilhados entre o app (apps/web) e as Edge Functions (D-31).
 * O mesmo schema valida a entrada no formulário e no servidor: uma regra só,
 * escrita uma vez. Mensagens em linguagem simples (aparecem para o usuário).
 *
 * Importável de Node/Vite (`@pei-vivo/contratos`) e de Deno (cópia gerada em
 * supabase/functions/_shared/gerado/ por scripts/sincronizar-funcoes.mjs).
 */
import { z } from "npm:zod@4.6.7";

// Sem compilação JIT: o zod 4 testa `Function("")` e a CSP do app (sem unsafe-eval) registra violação a cada carga.
z.config({ jitless: true });

/**
 * Identificador no formato que o tipo `uuid` do Postgres aceita (8-4-4-4-12 hex).
 * O `uuid()` do zod 4 exige a versão RFC (1–8) e recusaria os ids do seed (versão 0).
 */
const id = (mensagem?: string) => z.guid(mensagem);

export const LIMITE_TEXTO = 20_000;
export const LIMITE_TITULO = 120;
/** Textos livres curtos (D-47): o mesmo número vale no formulário, no mock e no `check` do banco (0010). */
export const LIMITE_EVIDENCIA = 1_000;
export const LIMITE_OBSERVACAO_DESFECHO = 1_000;
export const LIMITE_NOTA_CLINICA = 5_000;
/** RNF08: a IA nunca segura a geração; passado o limite, vale só a camada de regras. */
export const TIMEOUT_IA_MS = 30_000;

// ------------------------------------------------------------------ prazos e padrões compartilhados
export const MS_POR_DIA = 86_400_000;
/** RN05: proposta sem validação vira EXPIRADA depois de N dias (fn_expirar_validacoes). */
export const DIAS_EXPIRACAO_VALIDACAO = 7;
/** Painel da escola (D-48, `fn_resumo_escola` em 0011): PENDENTE há ≥ N dias conta como validação atrasada. */
export const DIAS_VALIDACAO_ATRASADA = 5;
/** Painel da escola: ciclo ABERTO há mais de N dias sem observação conta como parado. */
export const DIAS_CICLO_PARADO = 15;
/** Origem do app em desenvolvimento (CORS e link do convite) quando ORIGEM_APP não está definida. */
export const ORIGEM_PADRAO_DEV = "http://localhost:5173";

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
    estudanteId: id("Estudante inválido."),
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
    textoSimplificado: z
      .string()
      .min(1)
      .max(Math.floor(LIMITE_TEXTO * 1.5)),
    glossario: z
      .array(z.object({ termo: z.string().min(1).max(60), explicacao: z.string().min(1).max(300) }).strict())
      .max(50)
      .default([]),
  })
  .strict();
export type SaidaIA = z.infer<typeof SaidaIASchema>;

// ------------------------------------------------------------------ fechar-ciclo (F6/F7)
export const EntradaFecharCicloSchema = z.object({ cicloId: id("Ciclo inválido.") }).strict();
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

/**
 * SQLSTATE do banco → código estável. Uma tabela só, usada pelas Edge Functions
 * (`deErroBanco`) e pelo app (`traduzirErro`). Convenção de `0004`: negado 42501,
 * conflito PT409, inválido 22023; 23505/23514/22P02 vêm de restrições do Postgres.
 */
export const CODIGO_DO_SQLSTATE: Readonly<Record<string, "NEGADO" | "CONFLITO" | "VALIDACAO">> = {
  "42501": "NEGADO",
  PT409: "CONFLITO",
  "23505": "CONFLITO",
  "22023": "VALIDACAO",
  "23514": "VALIDACAO",
  "22P02": "VALIDACAO",
};
export interface CorpoErro {
  erro: { codigo: CodigoErro; mensagem: string };
}

// ------------------------------------------------------------------ convidar (F1/F2/F4/F5, D-32)
export const EntradaConviteSchema = z
  .object({
    escolaId: id("Escola inválida."),
    email: z.string().trim().toLowerCase().email("Informe um e-mail válido."),
    nome: z.string().trim().max(120).default(""),
    papel: z.enum(["DOCENTE", "RESPONSAVEL", "PROFISSIONAL_SAUDE"]),
    estudanteId: id().nullable().default(null),
    registroConselho: z.string().trim().max(60).nullable().default(null),
    conferidoPresencialmente: z.boolean().default(false),
  })
  .strict();
export type EntradaConvite = z.infer<typeof EntradaConviteSchema>;

export interface RespostaConvite {
  /** false quando a pessoa já tinha conta: o acesso novo vale sem e-mail. */
  emailEnviado: boolean;
  avisos: string[];
}
