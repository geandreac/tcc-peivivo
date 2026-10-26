import { describe, expect, it } from "vitest";
import { ErroFuncao, deErroBanco } from "./erros";

const erroBanco = (code: string | undefined, message = "msg do banco") => Object.assign(new Error(message), { code });

describe("deErroBanco · SQLSTATE → HTTP (mesma tabela do app)", () => {
  it.each([
    ["42501", 403, "NEGADO"],
    ["PT409", 409, "CONFLITO"],
    ["23505", 409, "CONFLITO"], // duplicado (unique) vira conflito, não erro interno
    ["22023", 400, "VALIDACAO"],
    ["23514", 400, "VALIDACAO"],
    ["22P02", 400, "VALIDACAO"], // texto que não é uuid: agora igual ao app (antes caía em 500)
  ])("%s → %i %s, com a mensagem do banco", (code, status, codigo) => {
    const e = deErroBanco(erroBanco(code));
    expect(e).toBeInstanceOf(ErroFuncao);
    expect([e.status, e.codigo, e.message]).toEqual([status, codigo, "msg do banco"]);
  });

  it("sem mensagem do banco, usa a mensagem simples padrão", () => {
    expect(deErroBanco(erroBanco("42501", "")).message).toMatch(/permissão/u);
  });

  it.each([
    ["código desconhecido", erroBanco("XX000", "relation \"notas_clinicas\" — e-mail fulano@example.test")],
    ["falha de rede (sem código)", Object.assign(new TypeError("fetch failed"), {})],
    ["valor não-erro", null],
  ])("%s → 500 genérico, sem repassar o detalhe interno", (_n, e) => {
    const r = deErroBanco(e);
    expect([r.status, r.codigo]).toEqual([500, "INTERNO"]);
    expect(r.message).not.toMatch(/notas_clinicas|example\.test|fetch/u);
  });

  it("ErroFuncao já traduzido passa intacto", () => {
    const original = new ErroFuncao(502, "INTERNO", "Auth fora do ar");
    expect(deErroBanco(original)).toBe(original);
  });
});
