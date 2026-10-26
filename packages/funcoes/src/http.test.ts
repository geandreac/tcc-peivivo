/**
 * Camada HTTP comum das Edge Functions (supabase/functions/_shared/http.ts),
 * executada em Node com `Deno.serve`/`Deno.env` simulados e o caso de uso
 * trocado por um dublê. Prova o contrato das três funções (gerar-material,
 * fechar-ciclo, convidar): método, autenticação, corpo inválido, erro estável,
 * 500 sem vazar detalhe e CORS restrito. O runtime Deno de verdade roda no job
 * `db` do CI (`supabase functions serve`).
 */
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

type Tratador = (req: Request) => Promise<Response>;
type Caso = (corpo: unknown, clientes: { usuario: { rpc: unknown }; servico: { rpc: unknown } }) => Promise<unknown>;

const ENV: Record<string, string | undefined> = {
  SUPABASE_URL: "http://supabase.test",
  SUPABASE_ANON_KEY: "anon-ficticia",
  SUPABASE_SERVICE_ROLE_KEY: "service-ficticia",
  ORIGEM_APP: "https://app.test",
};

let tratar: Tratador;
let servir: (nome: string, caso: Caso) => void;
let rpc: (cliente: unknown, nome: string, args: Record<string, unknown>) => Promise<unknown>;
let ErroFuncaoDeno: new (status: number, codigo: string, mensagem: string) => Error;

beforeAll(async () => {
  vi.stubGlobal("Deno", { env: { get: (k: string) => ENV[k] }, serve: (t: Tratador) => void (tratar = t) });
  // caminho em variável: o tsc deste pacote não deve seguir o código Deno (npm:, Deno.*)
  // URL absoluta a partir deste arquivo (o vitest 4 resolve caminho relativo variável a partir da raiz)
  const caminho = (rel: string) => new URL(`../../../supabase/functions/_shared/${rel}`, import.meta.url).href;
  ({ servir, rpc } = await import(/* @vite-ignore */ caminho("http.ts")));
  ({ ErroFuncao: ErroFuncaoDeno } = await import(/* @vite-ignore */ caminho("gerado/funcoes/erros.ts")));
});
afterEach(() => vi.restoreAllMocks());

function montar(caso: Caso = async () => ({ ok: true })) {
  const espiao = vi.fn(caso);
  servir("teste", espiao);
  return { tratar, espiao };
}
const post = (corpo: string | null, headers: Record<string, string> = { Authorization: "Bearer jwt-ficticio" }) =>
  new Request("http://edge.test/funcao", { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: corpo });

describe("Edge Functions · caminho negado primeiro", () => {
  it("método diferente de POST → 405, sem chamar o caso de uso", async () => {
    const { tratar, espiao } = montar();
    const r = await tratar(new Request("http://edge.test/funcao", { method: "GET" }));
    expect(r.status).toBe(405);
    expect(espiao).not.toHaveBeenCalled();
  });

  it.each([
    ["sem Authorization", {}],
    ["Authorization que não é Bearer", { Authorization: "Basic dXNlcjpzZW5oYQ==" }],
  ])("%s → 401 NAO_AUTENTICADO", async (_n, headers) => {
    const { tratar, espiao } = montar();
    const r = await tratar(post("{}", headers));
    expect(r.status).toBe(401);
    expect((await r.json()).erro.codigo).toBe("NAO_AUTENTICADO");
    expect(espiao).not.toHaveBeenCalled();
  });

  it("corpo que não é JSON → 400 VALIDACAO", async () => {
    const { tratar, espiao } = montar();
    const r = await tratar(post("{ isso não é json"));
    expect(r.status).toBe(400);
    expect((await r.json()).erro.codigo).toBe("VALIDACAO");
    expect(espiao).not.toHaveBeenCalled();
  });

  it.each([
    [403, "NEGADO"],
    [409, "CONFLITO"], // ex.: ciclo já fechado / dado duplicado
    [400, "VALIDACAO"],
    [502, "INTERNO"], // ex.: Auth não enviou o convite
  ])("erro do caso de uso %i → mesmo status e corpo { erro: { codigo, mensagem } }", async (status, codigo) => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const { tratar } = montar(async () => {
      throw new ErroFuncaoDeno(status, codigo, "Mensagem simples.");
    });
    const r = await tratar(post("{}"));
    expect(r.status).toBe(status);
    expect(await r.json()).toEqual({ erro: { codigo, mensagem: "Mensagem simples." } });
    expect(info.mock.calls[0]![0]).not.toContain("Mensagem simples."); // log só com status e código
    const log = JSON.parse(String(info.mock.calls[0]![0]));
    expect(log.requestId).toBe(r.headers.get("x-request-id"));
    expect(log.requestId).toMatch(/^[0-9a-f-]{36}$/u);
  });

  it("erro inesperado → 500 genérico; nem a resposta nem o log repassam o detalhe", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { tratar } = montar(async () => {
      throw new Error("timeout ao ler notas_clinicas de fulano@example.test");
    });
    const r = await tratar(post("{}"));
    const texto = await r.text();
    expect(r.status).toBe(500);
    expect(texto).toContain("INTERNO");
    expect(texto).not.toMatch(/notas_clinicas|example\.test/u);
    expect(String(erro.mock.calls[0]![0])).not.toMatch(/notas_clinicas|example\.test/u);
  });

  it("500: o log traz requestId, tipo e código do erro (ex.: timeout do banco), nunca a mensagem", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { tratar } = montar(async () => {
      throw Object.assign(new Error("canceling statement due to statement timeout para fulano@example.test"), { name: "PostgrestError", code: "57014" });
    });
    const r = await tratar(post("{}"));
    const log = JSON.parse(String(erro.mock.calls[0]![0]));
    expect(log).toMatchObject({ funcao: "teste", status: 500, tipo: "PostgrestError", code: "57014", requestId: r.headers.get("x-request-id") });
    expect(JSON.stringify(log)).not.toContain("example.test");
  });

  it("chamadas ao banco têm tempo limite de 10 s: o sinal do fetch aborta quando o tempo expira", async () => {
    const relogio = new AbortController(); // faz o papel do AbortSignal.timeout (timer interno, fora dos fake timers)
    const timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValue(relogio.signal);
    const fetchOriginal = globalThis.fetch;
    let sinal: AbortSignal | undefined;
    globalThis.fetch = vi.fn((_u: unknown, init?: RequestInit) => {
      sinal = init?.signal ?? undefined;
      return new Promise<Response>(() => undefined); // banco que nunca responde
    }) as typeof fetch;
    try {
      const { tratar } = montar(async (_c, { usuario }) => {
        // o PostgREST só dispara a requisição quando a promise é consumida
        (usuario as unknown as { rpc: (n: string) => PromiseLike<unknown> }).rpc("fn_lenta").then(undefined, () => undefined);
        return { ok: true };
      });
      await tratar(post("{}"));
      await vi.waitFor(() => expect(sinal).toBeDefined());
      expect(timeout).toHaveBeenCalledWith(10_000);
      expect(sinal!.aborted).toBe(false);
      relogio.abort(new DOMException("tempo esgotado", "TimeoutError"));
      expect(sinal!.aborted).toBe(true);
    } finally {
      globalThis.fetch = fetchOriginal;
    }
  });

  it("variável de ambiente ausente (service role) → 500, sem expor o nome da chave", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const guardada = ENV.SUPABASE_SERVICE_ROLE_KEY;
    ENV.SUPABASE_SERVICE_ROLE_KEY = undefined;
    try {
      const { tratar, espiao } = montar();
      const r = await tratar(post("{}"));
      expect(r.status).toBe(500);
      expect(await r.text()).not.toContain("SERVICE_ROLE");
      expect(espiao).not.toHaveBeenCalled();
    } finally {
      ENV.SUPABASE_SERVICE_ROLE_KEY = guardada;
    }
  });
});

describe("Edge Functions · caminho permitido", () => {
  it("preflight OPTIONS → 204 com CORS só para a origem do app (nunca *)", async () => {
    const { tratar } = montar();
    const r = await tratar(new Request("http://edge.test/funcao", { method: "OPTIONS" }));
    expect(r.status).toBe(204);
    expect(r.headers.get("Access-Control-Allow-Origin")).toBe("https://app.test");
  });

  it("POST com JWT → 200, corpo do caso de uso, sem cache e com os dois clientes", async () => {
    const { tratar, espiao } = montar(async (corpo) => ({ recebido: corpo }));
    const r = await tratar(post(JSON.stringify({ cicloId: "c1" })));
    expect(r.status).toBe(200);
    expect(r.headers.get("Cache-Control")).toBe("no-store");
    expect(r.headers.get("Access-Control-Allow-Origin")).toBe("https://app.test");
    expect(await r.json()).toEqual({ recebido: { cicloId: "c1" } });
    const clientes = espiao.mock.calls[0]![1];
    expect(typeof clientes.usuario.rpc).toBe("function");
    expect(typeof clientes.servico.rpc).toBe("function");
  });
});

describe("rpc() · repassa o SQLSTATE do PostgREST ao caso de uso", () => {
  it("erro do banco vira exceção com o mesmo code (42501, PT409, 23505…)", async () => {
    const cliente = { rpc: async () => ({ data: null, error: { message: "duplicado", code: "23505" } }) };
    await expect(rpc(cliente, "fn_x", {})).rejects.toMatchObject({ message: "duplicado", code: "23505" });
  });
  it("sucesso devolve data e envia os argumentos nomeados", async () => {
    const cliente = { rpc: vi.fn(async () => ({ data: { versaoId: "v1" }, error: null })) };
    expect(await rpc(cliente, "fn_registrar_fechamento", { p_ciclo: "c1" })).toEqual({ versaoId: "v1" });
    expect(cliente.rpc).toHaveBeenCalledWith("fn_registrar_fechamento", { p_ciclo: "c1" });
  });
});
