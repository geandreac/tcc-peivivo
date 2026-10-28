/**
 * Implementação REAL de `PeiVivoApi` (R2.3/R3.5): Supabase Auth + PostgREST +
 * Edge Functions. Nenhuma tela muda (D-17): o contrato é o mesmo do mock.
 *
 * Regras desta camada:
 * - Quem decide permissão é o banco (RLS/RPC, migrations 0004–0007). Aqui só
 *   se traduz SQLSTATE → `ErroApi` com o mesmo código que o mock usa.
 * - NUNCA `select *`: estudantes, consentimentos e usuarios têm GRANT por
 *   coluna (D-33) e `*` é negado. Toda consulta lista as colunas.
 * - Gerar material e fechar ciclo passam pelas Edge Functions (D-37); o
 *   restante, por RPCs `fn_*` ou tabelas com RLS.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PeiVivoApi } from "./api";
import { criarContexto } from "./supabase/contexto";
import { sessao } from "./supabase/sessao";
import { escola } from "./supabase/escola";
import { consentimento } from "./supabase/consentimento";
import { ciclo } from "./supabase/ciclo";
import { materiais } from "./supabase/materiais";
import { privacidade } from "./supabase/privacidade";
import { admin } from "./supabase/admin";

export { VERSAO_TERMO } from "./api";
export { traduzirErro } from "./supabase/infra";

/** Monta o PeiVivoApi real a partir dos agregados (services/supabase/*). */
export function criarSupabaseApi(sb: SupabaseClient): PeiVivoApi {
  const c = criarContexto(sb);
  const api: PeiVivoApi = {
    modo: "real",
    ...sessao(c),
    ...escola(c),
    ...consentimento(c),
    ...ciclo(c),
    ...materiais(c),
    ...privacidade(c),
    ...admin(c),
  };
  c.api = api;
  return api;
}
