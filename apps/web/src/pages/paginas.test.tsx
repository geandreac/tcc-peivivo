/**
 * Testes de tela (fluxo principal, validação, estados, rotas inválidas,
 * caminhos negados na UI — P4.19/P4.20 em jsdom). Cada tela passa no axe.
 */
import { describe, it, expect } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderizarApp, semViolacoesAxe } from "../test/utils";
import { ID } from "../mocks/dados";
import { api } from "../services";

describe("Layout e navegação", () => {
  it("tem skip link, landmarks e um único h1 na tela inicial", async () => {
    const { container } = await renderizarApp("/");
    const skip = screen.getByRole("link", { name: "Pular para o conteúdo principal" });
    expect(skip).toHaveAttribute("href", "#conteudo");
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Principal" })).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveAttribute("id", "conteudo");
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(document.title).toBe("Início · PEI Vivo");
    await semViolacoesAxe(container);
  });

  it("rota inexistente mostra a página 404 com saídas", async () => {
    const { container } = await renderizarApp("/isto/nao/existe");
    expect(screen.getByRole("heading", { level: 1, name: "Página não encontrada" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir para o início" })).toBeInTheDocument();
    await semViolacoesAxe(container);
  });

  it("rota protegida sem sessão redireciona para /entrar", async () => {
    await renderizarApp("/painel");
    expect(await screen.findByRole("heading", { level: 1, name: "Entrar" })).toBeInTheDocument();
  });

  it("Ajuda e Acessibilidade existem e passam no axe", async () => {
    const a = await renderizarApp("/ajuda");
    expect(screen.getByRole("heading", { level: 1, name: "Ajuda" })).toBeInTheDocument();
    await semViolacoesAxe(a.container);
    a.unmount();
    const b = await renderizarApp("/acessibilidade");
    expect(screen.getByRole("heading", { level: 1, name: "Acessibilidade" })).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText(/Alto contraste/));
    expect(document.documentElement).toHaveAttribute("data-contraste", "alto");
    await semViolacoesAxe(b.container);
  });
});

describe("Entrar (D-16) e painel", () => {
  it("porta de entrada lista os 4 perfis e cada um tem a sua tela com especificação", async () => {
    const { container } = await renderizarApp("/entrar");
    const lista = screen.getByRole("list", { name: "Perfis de acesso" });
    expect(within(lista).getAllByRole("link")).toHaveLength(4);
    await semViolacoesAxe(container);
    await userEvent.click(within(lista).getByRole("link", { name: /Equipe de saúde/ }));
    expect(await screen.findByRole("heading", { level: 1, name: /Entrar como equipe de saúde/ })).toBeInTheDocument();
    expect(screen.getByText(/Nunca vê:/)).toBeInTheDocument();
    const grupo = await screen.findByRole("group", { name: /Perfis de demonstração — Equipe de saúde/ });
    expect(within(grupo).getAllByRole("button")).toHaveLength(2);
    expect(within(grupo).queryByRole("button", { name: /Márcia/ })).not.toBeInTheDocument();
    await semViolacoesAxe(container);
  });

  it("/entrar/xyz mostra página não encontrada", async () => {
    await renderizarApp("/entrar/xyz");
    expect(await screen.findByRole("heading", { level: 1, name: "Página não encontrada" })).toBeInTheDocument();
  });

  it("escolher um perfil na tela de professores leva ao painel com os estudantes do papel", async () => {
    const { container } = await renderizarApp("/entrar/docente");
    await semViolacoesAxe(container);
    await userEvent.click(await screen.findByRole("button", { name: /Márcia/ }));
    expect(await screen.findByRole("heading", { level: 1, name: "Meus estudantes" })).toBeInTheDocument();
    const lista = await screen.findByRole("list", { name: "Estudantes" });
    expect(within(lista).getAllByRole("listitem")).toHaveLength(2);
    expect(within(lista).getByText("Aguardando consentimento")).toBeInTheDocument();
    await semViolacoesAxe(container);
  });

  it("docente sem vínculo vê estado vazio", async () => {
    await renderizarApp("/painel", ID.docente2);
    expect(await screen.findByText("Nenhum estudante vinculado a você")).toBeInTheDocument();
  });
});

describe("Fluxo principal — gerar, revisar, aprovar, desfecho (HU-D.03–D.06)", () => {
  it("valida o formulário com resumo de erros focável e links para os campos", async () => {
    const { container } = await renderizarApp(`/estudantes/${ID.estudanteA}/gerar`, ID.docente);
    const botao = await screen.findByRole("button", { name: /Adaptar para/ });
    await userEvent.click(botao);
    const resumo = await screen.findByRole("alert");
    expect(resumo).toHaveTextContent("Há 2 problemas no formulário");
    expect(document.activeElement).toBe(resumo);
    await userEvent.click(within(resumo).getByRole("link", { name: /Cole o texto/ }));
    expect(document.activeElement).toBe(screen.getByLabelText(/Texto original/));
    expect(screen.getByLabelText(/Texto original/)).toHaveAttribute("aria-invalid", "true");
    await semViolacoesAxe(container);
  });

  it("gera com o texto de exemplo, revisa lado a lado, aprova e registra desfecho", async () => {
    const { container } = await renderizarApp(`/estudantes/${ID.estudanteA}/gerar`, ID.docente);
    await userEvent.click(await screen.findByRole("button", { name: /Usar texto de exemplo/ }));
    await userEvent.click(screen.getByRole("button", { name: /Adaptar para/ }));
    expect(await screen.findByRole("heading", { level: 1, name: /Revisar: Ciências/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Original" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Adaptado" })).toBeInTheDocument();
    expect(screen.getByText("Leia o texto acima.")).toBeInTheDocument(); // ETAPA_UNICA aplicada
    await semViolacoesAxe(container);

    await userEvent.click(screen.getByRole("button", { name: "Aprovar material" }));
    expect(await screen.findByText("Aprovado")).toBeInTheDocument();
    await semViolacoesAxe(container);

    await userEvent.click(screen.getByRole("link", { name: "Registrar desfecho" }));
    expect(await screen.findByRole("heading", { level: 1, name: /Como foi/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Registrar desfecho" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Escolha como foi");
    await userEvent.click(screen.getByLabelText(/Alcançado/));
    await userEvent.click(screen.getByRole("button", { name: "Registrar desfecho" }));
    expect(await screen.findByText(/Desfecho: Alcançado/)).toBeInTheDocument();
    await semViolacoesAxe(container);
  });

  it("estado vazio quando o estudante tem consentimento mas não tem perfil vigente", async () => {
    const { container } = await renderizarApp(`/estudantes/${ID.estudanteB}/gerar`, ID.docente, async () => {
      await api.entrar(ID.responsavel);
      await api.concederConsentimento(ID.estudanteB, ["geracao_material"]);
    });
    expect(await screen.findByText("Ainda não há perfil vigente")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Registrar observação" })).toBeInTheDocument();
    await semViolacoesAxe(container);
  });
});

describe("Caminhos negados na interface (P4.20)", () => {
  it("docente não vê link para nota clínica e, acessando a rota direta, recebe 'Acesso negado (RN02)'", async () => {
    const { container } = await renderizarApp(`/estudantes/${ID.estudanteA}`, ID.docente);
    await screen.findByRole("heading", { level: 1, name: "Miguel (fictício)" });
    expect(screen.queryByRole("link", { name: /Abrir notas/ })).not.toBeInTheDocument();
    await semViolacoesAxe(container);
    container.remove();
    await renderizarApp(`/estudantes/${ID.estudanteA}/notas-clinicas`, ID.docente);
    expect(await screen.findByText("Acesso negado (RN02)")).toBeInTheDocument();
  });

  it("responsável não vê rascunho: rota direta do rascunho → 'Material não encontrado'", async () => {
    await renderizarApp(`/materiais/${ID.materialRascunho}`, ID.responsavel);
    expect(await screen.findByRole("heading", { level: 1, name: "Material não encontrado" })).toBeInTheDocument();
  });

  it("sem consentimento, a tela de geração mostra bloqueio (estudante B)", async () => {
    await renderizarApp(`/estudantes/${ID.estudanteB}/gerar`, ID.docente);
    expect(await screen.findByText("Geração bloqueada")).toBeInTheDocument();
  });

  it("profissional de saúde acessa as notas clínicas", async () => {
    const { container } = await renderizarApp(`/estudantes/${ID.estudanteA}/notas-clinicas`, ID.profissional);
    expect(await screen.findByRole("heading", { level: 2, name: "Nova nota" })).toBeInTheDocument();
    expect(screen.getByText(/Hipótese de trabalho/)).toBeInTheDocument();
    await semViolacoesAxe(container);
  });
});

describe("Consentimento (HU-R.01/R.02)", () => {
  it("responsável concede para o estudante B após marcar o termo; revogação exige dupla confirmação", async () => {
    const { container } = await renderizarApp(`/estudantes/${ID.estudanteB}/consentimento`, ID.responsavel);
    const autorizo = await screen.findByRole("button", { name: "Autorizo" });
    await userEvent.click(screen.getByLabelText(/Li e entendi o termo/));
    await userEvent.click(autorizo);
    expect(await screen.findByText("Ativo")).toBeInTheDocument();
    await semViolacoesAxe(container);

    await userEvent.click(screen.getByRole("button", { name: "Revogar consentimento" }));
    const confirmar = screen.getByRole("button", { name: "Sim, revogar agora" });
    expect(confirmar).toBeDisabled();
    await userEvent.click(screen.getByLabelText(/Entendo as consequências/));
    await userEvent.click(confirmar);
    expect(await screen.findByText("Revogado")).toBeInTheDocument();
  });
});

describe("Observação e fechamento de ciclo (HU-D.01/D.02)", () => {
  it("exige ao menos uma dimensão; registra e mostra o diff com RN03 ao fechar", async () => {
    const { container } = await renderizarApp(`/estudantes/${ID.estudanteA}/observar`, ID.docente);
    await userEvent.click(await screen.findByRole("button", { name: "Registrar observações" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Escolha ao menos uma dimensão");
    const grupo = screen.getByRole("group", { name: "Atenção sustentada" });
    await userEvent.click(within(grupo).getByLabelText(/Reduzida/));
    await semViolacoesAxe(container);
    await userEvent.click(screen.getByRole("button", { name: "Registrar observações" }));
    await screen.findByRole("heading", { level: 1, name: "Miguel (fictício)" });

    container.remove();
    const fechar = await renderizarApp(`/estudantes/${ID.estudanteA}/fechar-ciclo`, ID.docente);
    const tabela = await fechar.findByRole("table", { name: "Parâmetros: vigente → proposto" });
    expect(within(tabela).getByText(/Aguardando 2º ciclo para elevar/)).toBeInTheDocument();
    await semViolacoesAxe(fechar.container);
    await userEvent.click(fechar.getByRole("button", { name: /^Fechar ciclo 4/ }));
    await userEvent.click(await fechar.findByRole("button", { name: "Fechar ciclo" }));
    await waitFor(() => expect(fechar.getByRole("heading", { level: 1, name: "Ciclo 4 fechado" })).toBeInTheDocument());
    expect(fechar.getByText("Enviado para validação clínica")).toBeInTheDocument();
  });
});
