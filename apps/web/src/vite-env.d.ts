/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "supabase" liga o sistema real (Auth + PostgREST); qualquer outro valor = demonstração (mock). */
  readonly VITE_API?: string;
  readonly VITE_SUPABASE_URL?: string;
  /** Só a chave ANON (pública). A service_role nunca vai para o navegador. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
