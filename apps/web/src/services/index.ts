/**
 * Ponto único de acesso à API (D-17). A escolha é feita no build:
 * - `VITE_API=supabase` + URL + chave anon → sistema real (Supabase Auth + PostgREST + Edge Functions);
 * - qualquer outro caso → demonstração com dados fictícios (mockApi).
 * Nenhuma tela muda entre os dois: o contrato é `PeiVivoApi`.
 */
import { createClient } from "@supabase/supabase-js";
import { criarMockApi } from "./mockApi";
import { criarSupabaseApi } from "./supabaseApi";
import type { PeiVivoApi } from "./api";

const URL_SB = import.meta.env.VITE_SUPABASE_URL;
const CHAVE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;
const REAL = import.meta.env.MODE !== "test" && import.meta.env.VITE_API === "supabase" && Boolean(URL_SB && CHAVE_ANON);

export const api: PeiVivoApi = REAL
  ? criarSupabaseApi(
      createClient(URL_SB!, CHAVE_ANON!, {
        // detectSessionInUrl: links de convite e de recuperação de senha trazem a sessão na URL
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      }),
    )
  : // Em testes (MODE=test) sem latência nem persistência — cada teste parte da semente.
    criarMockApi(import.meta.env.MODE === "test" ? { latenciaMs: 0, persistir: false } : {});

export * from "./api";
export * from "./erros";
export * from "./tipos";
