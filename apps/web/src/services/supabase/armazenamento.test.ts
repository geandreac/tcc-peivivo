import { afterEach, describe, expect, it } from "vitest";
import { armazenamentoSessao, lembrarSessao } from "./armazenamento";

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe("Lembrar de mim (onde a sessão fica)", () => {
  it("sem lembrar: sessão só no sessionStorage (some ao fechar o navegador)", () => {
    lembrarSessao(false);
    armazenamentoSessao.setItem("sb-token", "t1");
    expect(sessionStorage.getItem("sb-token")).toBe("t1");
    expect(localStorage.getItem("sb-token")).toBeNull();
  });

  it("com lembrar: sessão no localStorage e a cópia da aba é apagada", () => {
    sessionStorage.setItem("sb-token", "velho");
    lembrarSessao(true);
    armazenamentoSessao.setItem("sb-token", "t2");
    expect(localStorage.getItem("sb-token")).toBe("t2");
    expect(sessionStorage.getItem("sb-token")).toBeNull();
    expect(armazenamentoSessao.getItem("sb-token")).toBe("t2");
  });

  it("sair apaga a sessão dos dois lugares", () => {
    localStorage.setItem("sb-token", "a");
    sessionStorage.setItem("sb-token", "b");
    armazenamentoSessao.removeItem("sb-token");
    expect(armazenamentoSessao.getItem("sb-token")).toBeNull();
  });
});
