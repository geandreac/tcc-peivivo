/**
 * Contrato do `supabaseApi` com o PostgREST e as Edge Functions, com o cliente
 * Supabase simulado (sem rede). O comportamento do Supabase de verdade é
 * provado em packages/politicas/src/supabaseApi.test.ts (job `db` do CI).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { ErroApi } from "./erros";
import { criarSupabaseApi, traduzirErro } from "./supabaseApi";

describe("traduzirErro · SQLSTATE / PostgREST / rede → código estável do app", () => {
  it.each([
    [{ code: "42501", message: "Só o docente vinculado gera material." }, "NEGADO"],
    [{ code: "PT409", message: "Este ciclo já foi fechado." }, "CONFLITO"],
    [{ code: "23505", message: "duplicate key value" }, "CONFLITO"], // desfecho duplicado
    [{ code: "22023", message: "Parâmetros inválidos." }, "VALIDACAO"],
    [{ code: "22P02", message: "invalid input syntax for type uuid" }, "VALIDACAO"],
    [{ code: "PGRST116", message: "0 rows" }, "NAO_ENCONTRADO"],
    [{ code: "PGRST301", message: "JWT expired" }, "NAO_AUTENTICADO"],
    [{ status: 401, message: "Unauthorized" }, "NAO_AUTENTICADO"],
    [new TypeError("Failed to fetch"), "REDE"],
    [{ code: "XX000", message: "erro interno" }, "REDE"],
  ])("%o → %s", (erro, codigo) => {
    expect(traduzirErro(erro).codigo).toBe(codigo);
  });

  it("usa só a primeira linha da mensagem do banco (sem DETAIL/HINT)", () => {
    expect(traduzirErro({ code: "42501", message: "Negado.\nDETAIL: tabela notas_clinicas" }).message).toBe("Negado.");
  });
});

/** Cliente mínimo: só `functions.invoke`, que é o que fecharCiclo usa antes de qualquer leitura. */
function clienteComFuncao(resposta: { data?: unknown; error?: unknown }) {
  const invoke = vi.fn(async () => ({ data: resposta.data ?? null, error: resposta.error ?? null }));
  return { sb: { functions: { invoke } } as unknown as SupabaseClient, invoke };
}
/** Erro como o functions-js devolve para status ≠ 2xx: a Response fica em `context`. */
const erroHttp = (status: number, corpo: unknown) =>
  Object.assign(new Error("Edge Function returned a non-2xx status code"), { name: "FunctionsHttpError", context: new Response(JSON.stringify(corpo), { status }) });

describe("Edge Functions pelo supabaseApi · erros padronizados", () => {
  it("envia só o contrato da função (cicloId), nunca o docente", async () => {
    const { sb, invoke } = clienteComFuncao({ error: erroHttp(409, { erro: { codigo: "CONFLITO", mensagem: "x" } }) });
    await criarSupabaseApi(sb).fecharCiclo("c1").catch(() => undefined);
    expect(invoke).toHaveBeenCalledWith("fechar-ciclo", { body: { cicloId: "c1" } });
  });

  it.each([
    [403, "NEGADO", "NEGADO"],
    [409, "CONFLITO", "CONFLITO"],
    [400, "VALIDACAO", "VALIDACAO"],
    [500, "INTERNO", "REDE"],
  ])("%i { codigo: %s } → ErroApi %s com a mensagem do servidor", async (status, codigo, esperado) => {
    const { sb } = clienteComFuncao({ error: erroHttp(status, { erro: { codigo, mensagem: "Mensagem do servidor." } }) });
    await expect(criarSupabaseApi(sb).fecharCiclo("c1")).rejects.toMatchObject({ codigo: esperado, message: "Mensagem do servidor." });
  });

  it("sessão expirada: o gateway responde 401 com corpo próprio → NAO_AUTENTICADO (não 'falha de rede')", async () => {
    const { sb } = clienteComFuncao({ error: erroHttp(401, { code: 401, message: "Invalid JWT" }) });
    await expect(criarSupabaseApi(sb).fecharCiclo("c1")).rejects.toMatchObject({ codigo: "NAO_AUTENTICADO" });
  });

  it("sem resposta (rede caiu / função fora do ar) → REDE", async () => {
    const { sb } = clienteComFuncao({ error: Object.assign(new Error("Failed to send a request"), { name: "FunctionsFetchError" }) });
    const erro = await criarSupabaseApi(sb).fecharCiclo("c1").catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ErroApi);
    expect((erro as ErroApi).codigo).toBe("REDE");
  });

  it("corpo de erro que não é JSON (ex.: página do proxy) → REDE", async () => {
    const erro = Object.assign(new Error("non-2xx"), { context: new Response("<html>502</html>", { status: 502 }) });
    const { sb } = clienteComFuncao({ error: erro });
    await expect(criarSupabaseApi(sb).fecharCiclo("c1")).rejects.toMatchObject({ codigo: "REDE" });
  });
});
