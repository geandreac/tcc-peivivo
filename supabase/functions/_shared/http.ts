// Camada HTTP comum das Edge Functions (Deno). Fina de propósito: a regra de
// negócio está no banco (RPCs de 0006) e nos casos de uso (gerado/funcoes).
//
// - CORS restrito à origem do app (ORIGEM_APP), nunca "*".
// - Exige JWT de usuário; o gateway do Supabase já valida a assinatura
//   (verify_jwt = true, padrão) e o banco decide o papel (D-32: papel nunca no JWT).
// - Erros saem com código estável e mensagem simples; logs sem dado pessoal.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.45.4";
import { ErroFuncao } from "./gerado/funcoes/index.ts";

const ORIGEM = Deno.env.get("ORIGEM_APP") ?? "http://localhost:5173";
const CORS = {
  "Access-Control-Allow-Origin": ORIGEM,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  Vary: "Origin",
};

export function json(status: number, corpo: unknown): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...CORS, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function variavel(nome: string): string {
  const v = Deno.env.get(nome);
  if (!v) throw new Error(`Variável de ambiente ausente: ${nome}`);
  return v;
}

/** Cliente com o JWT do usuário: RLS e RPCs decidem como se fosse ele. */
function clienteDoUsuario(autorizacao: string): SupabaseClient {
  return createClient(variavel("SUPABASE_URL"), variavel("SUPABASE_ANON_KEY"), {
    global: { headers: { Authorization: autorizacao } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Cliente service role: só para as portas `fn_registrar_*`, que revalidam tudo. */
function clienteServico(): SupabaseClient {
  return createClient(variavel("SUPABASE_URL"), variavel("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Chama uma RPC e repassa o SQLSTATE do PostgREST (42501, PT409, 22023…) ao caso de uso. */
export async function rpc<T>(cliente: SupabaseClient, nome: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await cliente.rpc(nome, args);
  if (error) throw Object.assign(new Error(error.message), { code: error.code });
  return data as T;
}

export interface Clientes {
  usuario: SupabaseClient;
  servico: SupabaseClient;
}

export function servir(nomeFuncao: string, caso: (corpo: unknown, clientes: Clientes) => Promise<unknown>) {
  Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    if (req.method !== "POST") return json(405, { erro: { codigo: "VALIDACAO", mensagem: "Use POST." } });

    const autorizacao = req.headers.get("Authorization");
    if (!autorizacao?.startsWith("Bearer ")) {
      return json(401, { erro: { codigo: "NAO_AUTENTICADO", mensagem: "Entre para continuar." } });
    }
    let corpo: unknown;
    try {
      corpo = await req.json();
    } catch {
      return json(400, { erro: { codigo: "VALIDACAO", mensagem: "Corpo da requisição inválido." } });
    }
    try {
      const resposta = await caso(corpo, { usuario: clienteDoUsuario(autorizacao), servico: clienteServico() });
      return json(200, resposta);
    } catch (e) {
      if (e instanceof ErroFuncao) {
        console.info(JSON.stringify({ funcao: nomeFuncao, status: e.status, codigo: e.codigo })); // sem corpo, sem usuário
        return json(e.status, { erro: { codigo: e.codigo, mensagem: e.message } });
      }
      console.error(JSON.stringify({ funcao: nomeFuncao, status: 500, tipo: (e as Error)?.name ?? "desconhecido" }));
      return json(500, { erro: { codigo: "INTERNO", mensagem: "Algo deu errado do nosso lado. Tente de novo em instantes." } });
    }
  });
}
