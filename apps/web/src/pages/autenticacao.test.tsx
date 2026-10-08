/**
 * Autenticação e rotas por perfil (D-16, RF14) — auditoria de 21/09/2026.
 * Cobre o que `paginas.test.tsx` deixava só para o docente: login de cada
 * porta (família, equipe de saúde, coordenação), redirecionamento de volta à
 * rota de origem, logout, falha de autenticação e navegação condicionada ao
 * papel institucional. Cada tela passa no axe.
 */
import { describe, it, expect } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderizarApp, semViolacoesAxe } from "../test/utils";
import { ID } from "../mocks/dados";
import { api } from "../services";

describe("Login por perfil (TF-41…TF-43)", () => {
  it("família: entra por /entrar/familia e o painel oferece 'Ver consentimento'", async () => {
    const { container } = await renderizarApp("/entrar/familia");
    expect(await screen.findByRole("heading", { level: 1, name: /Entrar como família/ })).toBeInTheDocument();
    await semViolacoesAxe(container);
    await userEvent.click(await screen.findByRole("button", { name: /Rosa/ }));
    expect(await screen.findByRole("heading", { level: 1, name: "Meus estudantes" })).toBeInTheDocument();
    const lista = await screen.findByRole("list", { name: "Estudantes" });
    expect(within(lista).getAllByRole("link", { name: "Ver consentimento" }).length).toBeGreaterThan(0);
    expect(within(lista).queryByRole("link", { name: "Gerar material" })).not.toBeInTheDocument();
    expect(api.usuarioAtual()?.id).toBe(ID.responsavel);
    await semViolacoesAxe(container);
  });

  it("equipe de saúde: entra por /entrar/saude e o painel oferece 'Validar parâmetros'", async () => {
    const { container } = await renderizarApp("/entrar/saude");
    await userEvent.click(await screen.findByRole("button", { name: /Camila/ }));
    expect(await screen.findByRole("heading", { level: 1, name: "Meus estudantes" })).toBeInTheDocument();
    const lista = await screen.findByRole("list", { name: "Estudantes" });
    expect(within(lista).getByRole("link", { name: "Validar parâmetros" })).toBeInTheDocument();
    await semViolacoesAxe(container);
  });

  it("coordenação: entra por /entrar/coordenacao; só ela vê 'Cadastrar estudante' no menu", async () => {
    const { container } = await renderizarApp("/entrar/coordenacao");
    await userEvent.click(await screen.findByRole("button", { name: /Coordenação/ }));
    expect(await screen.findByRole("heading", { level: 1, name: "Meus estudantes" })).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Principal" });
    expect(within(nav).getByRole("link", { name: "Cadastrar estudante" })).toBeInTheDocument();
    await semViolacoesAxe(container);
  });

  it("docente não vê 'Cadastrar estudante' no menu e, pela URL direta, recebe o motivo da negação", async () => {
    await renderizarApp("/coordenacao/cadastrar", ID.docente);
    const nav = screen.getByRole("navigation", { name: "Principal" });
    expect(within(nav).queryByRole("link", { name: "Cadastrar estudante" })).not.toBeInTheDocument();
    expect(await screen.findByText("Só a coordenação pedagógica cadastra estudantes")).toBeInTheDocument();
  });
});

describe("Redirecionamento e sessão (TF-02, TF-37, TF-44)", () => {
  it("rota protegida sem sessão → Entrar → após o login volta à rota de origem", async () => {
    await renderizarApp(`/estudantes/${ID.estudanteA}/consentimento`);
    expect(await screen.findByRole("heading", { level: 1, name: "Entrar" })).toBeInTheDocument();
    const portas = screen.getByRole("list", { name: "Perfis de acesso" });
    await userEvent.click(within(portas).getByRole("link", { name: /Família/ }));
    await userEvent.click(await screen.findByRole("button", { name: /Rosa/ }));
    expect(await screen.findByRole("heading", { level: 1, name: "Consentimento" })).toBeInTheDocument();
  });

  it("sair encerra a sessão, volta ao início e as rotas protegidas voltam a redirecionar", async () => {
    await renderizarApp("/painel", ID.docente);
    await screen.findByRole("heading", { level: 1, name: "Meus estudantes" });
    await userEvent.click(screen.getByRole("button", { name: "Sair" }));
    expect(await screen.findByRole("heading", { level: 1, name: "O PEI que executa a si mesmo" })).toBeInTheDocument();
    expect(api.usuarioAtual()).toBeNull();
    const nav = screen.getByRole("navigation", { name: "Principal" });
    expect(within(nav).getByRole("link", { name: "Entrar" })).toBeInTheDocument();
    expect(within(nav).queryByRole("link", { name: "Meus estudantes" })).not.toBeInTheDocument();
  });

  it("falha na autenticação mostra erro acessível e mantém o usuário na tela de login", async () => {
    const { container } = await renderizarApp("/entrar/docente");
    const botao = await screen.findByRole("button", { name: /Márcia/ });
    api.simularFalha(true);
    try {
      await userEvent.click(botao);
      expect(await screen.findByText("Não foi possível entrar. Tente novamente.")).toBeInTheDocument();
      expect(screen.getByRole("heading", { level: 1, name: /Entrar como professores/ })).toBeInTheDocument();
      expect(api.usuarioAtual()).toBeNull();
      await semViolacoesAxe(container);
    } finally {
      api.simularFalha(false);
    }
  });
});
