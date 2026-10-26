import { describe, expect, it } from "vitest";
import { destinoInterno } from "./destino";

describe("destinoInterno · redirecionamento depois do login", () => {
  it.each([
    ["outra origem", "https://site-falso.example/entrar"],
    ["URL sem esquema (//host)", "//site-falso.example"],
    ["barra seguida de barra invertida e host", String.raw`/\site-falso.example`],
    ["duas barras invertidas e host", String.raw`\\site-falso.example`],
    ["javascript:", "javascript:alert(1)"],
    ["volta para a própria tela de entrada", "/entrar/verificacao"],
    ["não é texto", 42],
  ])("negado: %s → /painel", (_n, de) => {
    expect(destinoInterno({ de })).toBe("/painel");
  });

  it("sem estado usa o padrão", () => {
    expect(destinoInterno(null)).toBe("/painel");
    expect(destinoInterno(undefined, "/inicio")).toBe("/inicio");
  });

  it("permitido: caminho interno do app, com busca e âncora", () => {
    expect(destinoInterno({ de: "/estudantes/e1/historico?aba=2#trilha" })).toBe("/estudantes/e1/historico?aba=2#trilha");
  });
});
