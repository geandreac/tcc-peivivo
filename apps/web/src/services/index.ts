/**
 * Ponto único de acesso à API (D-17). A escolha é feita no build:
 * - `VITE_API=supabase` + URL + chave anon → sistema real (Supabase Auth + PostgREST + Edge Functions);
 * - qualquer outro caso → demonstração com dados fictícios (mockApi).
 * Nenhuma tela muda entre os dois: o contrato é `PeiVivoApi`.
 */
import type { PeiVivoApi } from "./api";

const URL_SB = import.meta.env.VITE_SUPABASE_URL;
const CHAVE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;
const REAL = import.meta.env.MODE !== "test" && import.meta.env.VITE_API === "supabase" && Boolean(URL_SB && CHAVE_ANON);

/**
 * D-48: import() dinâmico — o build real não carrega o mock nem a semente; a demonstração não carrega o supabase-js.
 * Sem top-level await: o chunk importado depende de módulos do chunk principal, e um await no carregamento
 * do principal travaria os dois (página em branco).
 */
async function criarApi(): Promise<PeiVivoApi> {
  if (REAL) {
    const [{ createClient }, { criarSupabaseApi }] = await Promise.all([import("@supabase/supabase-js"), import("./supabaseApi")]);
    return criarSupabaseApi(
      createClient(URL_SB!, CHAVE_ANON!, {
        // detectSessionInUrl: links de convite e de recuperação de senha trazem a sessão na URL
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      }),
    );
  }
  const { criarMockApi } = await import("./mockApi");
  // Em testes (MODE=test) sem latência nem persistência — cada teste parte da semente.
  return criarMockApi(import.meta.env.MODE === "test" ? { latenciaMs: 0, persistir: false } : {});
}

/** Preenchido por `iniciarApi()` antes da primeira renderização (main.tsx) e no setup dos testes. */
export let api: PeiVivoApi;

export async function iniciarApi(): Promise<PeiVivoApi> {
  api ??= await criarApi();
  return api;
}

export * from "./api";
export * from "./erros";
export * from "./tipos";
