/**
 * Ponto único de acesso à API. Trocar `criarMockApi` por `criarSupabaseApi`
 * (Fase 4, P4.4) é a única mudança necessária quando o backend existir.
 */
import { criarMockApi } from "./mockApi";
import type { PeiVivoApi } from "./api";

// Em testes (MODE=test) sem latência nem persistência — cada teste parte da semente.
export const api: PeiVivoApi = criarMockApi(import.meta.env.MODE === "test" ? { latenciaMs: 0, persistir: false } : {});

export * from "./api";
export * from "./erros";
export * from "./tipos";
