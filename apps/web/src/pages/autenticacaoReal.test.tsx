/**
 * Telas do login REAL (R2.2, D-32) em jsdom: o `api` é posto em modo "real" e
 * as chamadas ao Auth são simuladas. O comportamento do Auth/banco de verdade
 * é provado em packages/politicas/src/http.test.ts (CI).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderizarApp, semViolacoesAxe } from "../test/utils";
import { api, ErroApi, type Usuario } from "../services";
import { VERSAO_TERMO } from "../services/supabaseApi";

const DOCENTE: Usuario = { id: "u-real-1", nome: "Docente (fictícia)", email: "docente@example.test", papelInstitucional: null, exigeSegundoFator: false };
const SAUDE: Usuario = { id: "u-real-2", nome: "Profissional (fictícia)", email: "saude@example.test", papelInstitucional: null, exigeSegundoFator: true };

const original = api.modo;
function modoReal(sessao: Usuario | null, nivel: "aal1" | "aal2" = "aal1", temFator = false) {
  (api as { modo: string }).modo = "real";
  vi.spyOn(api, "carregarSessao").mockResolvedValue(sessao);
  vi.spyOn(api, "usuarioAtual").mockReturnValue(null);
  vi.spyOn(api, "nivelSessao").mockResolvedValue({ atual: nivel, temFatorCadastrado: temFator });
}
afterEach(() => {
  (api as { modo: string }).modo = original;
  vi.restoreAllMocks();
});

describe("Entrar com e-mail e senha (modo real)", () => {
  it("mostra só e-mail e senha (sem perfis fictícios) e passa no axe", async () => {
    modoReal(null);
    const { container } = await renderizarApp("/entrar");
    expect(await screen.findByLabelText(/E-mail/)).toHaveAttribute("autocomplete", "username");
    expect(screen.getByLabelText(/^Senha/)).toHaveAttribute("autocomplete", "current-password");
    expect(screen.queryByRole("list", { name: "Perfis de acesso" })).not.toBeInTheDocument();
    await semViolacoesAxe(container);
  });

  it("negado: credenciais erradas → mensagem genérica (não revela se o e-mail existe)", async () => {
    modoReal(null);
    vi.spyOn(api, "entrarComSenha").mockRejectedValue(new ErroApi("NAO_AUTENTICADO", "E-mail ou senha incorretos."));
    await renderizarApp("/entrar");
    await userEvent.type(await screen.findByLabelText(/E-mail/), "alguem@example.test");
    await userEvent.type(screen.getByLabelText(/^Senha/), "errada-123456");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("E-mail ou senha incorretos.");
  });

  it("WCAG 3.3.8: a senha pode ser colada e mostrada", async () => {
    modoReal(null);
    await renderizarApp("/entrar");
    const senha = (await screen.findByLabelText(/^Senha/)) as HTMLInputElement;
    await userEvent.click(senha);
    await userEvent.paste("senha-do-gerenciador-123");
    expect(senha.value).toBe("senha-do-gerenciador-123");
    await userEvent.click(screen.getByRole("button", { name: "Mostrar senha" }));
    expect(senha).toHaveAttribute("type", "text");
  });

  it("perfil que exige segundo fator vai para a verificação antes de qualquer tela", async () => {
    modoReal(null);
    vi.spyOn(api, "entrarComSenha").mockResolvedValue({ usuario: SAUDE, exigeSegundoFator: true, temFatorCadastrado: true });
    await renderizarApp("/entrar");
    await userEvent.type(await screen.findByLabelText(/E-mail/), SAUDE.email);
    await userEvent.type(screen.getByLabelText(/^Senha/), "senha-ficticia-123");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Verificação em duas etapas" })).toBeInTheDocument();
  });
});

describe("Guarda de rota no modo real", () => {
  it("negado: profissional em aal1 abrindo uma rota protegida vai para a verificação", async () => {
    modoReal(SAUDE, "aal1", true);
    await renderizarApp("/estudantes/e-0010/notas-clinicas");
    expect(await screen.findByRole("heading", { level: 1, name: "Verificação em duas etapas" })).toBeInTheDocument();
  });
  it("sem sessão → Entrar", async () => {
    modoReal(null);
    await renderizarApp("/painel");
    expect(await screen.findByRole("heading", { level: 1, name: "Entrar" })).toBeInTheDocument();
  });
});

describe("Verificação em duas etapas", () => {
  it("primeiro acesso: QR + o mesmo segredo em texto (alternativa acessível) e código de 6 dígitos", async () => {
    modoReal(SAUDE, "aal1", false);
    vi.spyOn(api, "iniciarCadastroSegundoFator").mockResolvedValue({ fatorId: "f1", qrCode: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg'/>", segredo: "JBSWY3DPEHPK3PXP" });
    const verificar = vi.spyOn(api, "verificarSegundoFator").mockResolvedValue();
    const { container } = await renderizarApp("/entrar/verificacao");
    await userEvent.click(await screen.findByRole("button", { name: "Começar" }));
    expect(await screen.findByRole("img", { name: /Código QR/ })).toBeInTheDocument();
    expect(screen.getByText("JBSWY3DPEHPK3PXP")).toBeInTheDocument();
    const campo = screen.getByLabelText(/Código de 6 dígitos/);
    expect(campo).toHaveAttribute("autocomplete", "one-time-code");
    await semViolacoesAxe(container);
    await userEvent.type(campo, "123456");
    await userEvent.click(screen.getByRole("button", { name: "Verificar" }));
    await waitFor(() => expect(verificar).toHaveBeenCalledWith("123456", "f1"));
  });
  it("negado: código errado mostra o motivo e não sai da tela", async () => {
    modoReal(SAUDE, "aal1", true);
    vi.spyOn(api, "verificarSegundoFator").mockRejectedValue(new ErroApi("VALIDACAO", "Código incorreto ou expirado."));
    await renderizarApp("/entrar/verificacao");
    await userEvent.type(await screen.findByLabelText(/Código de 6 dígitos/), "000000");
    await userEvent.click(screen.getByRole("button", { name: "Verificar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Código incorreto ou expirado.");
  });
});

describe("Aceitar convite / recuperar senha", () => {
  it("negado: convite exige senha ≥ 10, confirmação igual e aceite dos termos; depois registra a versão", async () => {
    modoReal(DOCENTE, "aal1");
    const definir = vi.spyOn(api, "definirSenha").mockResolvedValue();
    const { container } = await renderizarApp("/definir-senha?convite=1");
    expect(await screen.findByRole("heading", { level: 1, name: "Aceitar convite" })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/^Nova senha/), "curta");
    await userEvent.type(screen.getByLabelText(/Repita/), "outra");
    await userEvent.click(screen.getByRole("button", { name: "Criar senha e entrar" }));
    expect(await screen.findByText(/pelo menos 10 caracteres/, { selector: ".campo__erro" })).toBeInTheDocument();
    expect(definir).not.toHaveBeenCalled();
    await semViolacoesAxe(container);
    await userEvent.clear(screen.getByLabelText(/^Nova senha/));
    await userEvent.clear(screen.getByLabelText(/Repita/));
    await userEvent.type(screen.getByLabelText(/^Nova senha/), "uma frase longa");
    await userEvent.type(screen.getByLabelText(/Repita/), "uma frase longa");
    await userEvent.click(screen.getByRole("checkbox", { name: /Li e aceito/ }));
    await userEvent.click(screen.getByRole("button", { name: "Criar senha e entrar" }));
    await waitFor(() => expect(definir).toHaveBeenCalledWith("uma frase longa", VERSAO_TERMO));
  });
  it("link expirado (sem sessão) explica e não mostra o formulário", async () => {
    modoReal(null);
    await renderizarApp("/redefinir-senha");
    expect(await screen.findByText("Link inválido ou expirado")).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Nova senha/)).not.toBeInTheDocument();
  });
  it("recuperar senha responde igual para qualquer e-mail", async () => {
    modoReal(null);
    const pedir = vi.spyOn(api, "pedirRecuperacaoSenha").mockResolvedValue();
    const { container } = await renderizarApp("/recuperar-senha");
    await userEvent.type(await screen.findByLabelText(/E-mail/), "qualquer@example.test");
    await userEvent.click(screen.getByRole("button", { name: "Enviar link" }));
    expect(await screen.findByText(/Se houver uma conta com esse e-mail/)).toBeInTheDocument();
    expect(pedir).toHaveBeenCalledWith("qualquer@example.test");
    await semViolacoesAxe(container);
  });
});
