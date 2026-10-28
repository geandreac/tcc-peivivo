/**
 * Telas do painel administrativo (D-50) sobre o mock, com axe em todas.
 * Negado primeiro: quem não administra vê "Acesso não permitido" (o mock nega como o banco).
 */
import { describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderizarApp, semViolacoesAxe } from "../test/utils";
import { api } from "../services";
import { ID } from "../mocks/dados";

describe("painel administrativo · negado primeiro", () => {
  it("docente abrindo /admin vê o motivo e nenhum dado", async () => {
    const { container } = await renderizarApp("/admin", ID.docente);
    expect(await screen.findByText("Acesso não permitido")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Indicadores" })).not.toBeInTheDocument();
    await semViolacoesAxe(container);
  });
  it("coordenação vê configurações e perfis só para leitura", async () => {
    await renderizarApp("/admin/configuracoes", ID.coordenacao);
    expect(await screen.findByLabelText(/Validade padrão/)).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Salvar configurações" })).not.toBeInTheDocument();
  });
});

describe("painel administrativo · telas (Administrador Geral)", () => {
  it.each([
    ["/admin", "Visão geral"],
    ["/admin/usuarios", "Usuários e acessos"],
    ["/admin/usuarios/novo", "Criar acesso"],
    ["/admin/perfis", "Perfis e permissões"],
    ["/admin/ferramentas", "Ferramentas"],
    ["/admin/auditoria", "Atividades e auditoria"],
    ["/admin/configuracoes", "Configurações"],
  ])("%s abre com h1, navegação de administração e sem violações de acessibilidade", async (rota, titulo) => {
    const { container } = await renderizarApp(rota, ID.admin);
    expect(await screen.findByRole("heading", { level: 1, name: titulo })).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Administração" });
    expect(within(nav).getAllByRole("link")).toHaveLength(6);
    await waitFor(() => expect(screen.queryByText(/Carregando/)).not.toBeInTheDocument());
    await semViolacoesAxe(container);
  });

  it("visão geral: indicadores e o que precisa de atenção, sem nenhum dado de estudante", async () => {
    await renderizarApp("/admin", ID.admin);
    const indicadores = await screen.findByRole("list", { name: "Indicadores" });
    expect(within(indicadores).getByText("Usuários ativos")).toBeInTheDocument();
    expect(await screen.findByRole("list", { name: "Acessos que precisam de atenção" })).toHaveTextContent("Henrique (fictício)");
    expect(document.body).not.toHaveTextContent("Miguel (fictício)");
  });

  it("usuários: tabela com situação em texto; suspender pede confirmação e motivo, e vai para a trilha", async () => {
    await renderizarApp("/admin/usuarios", ID.admin);
    const tabela = await screen.findByRole("table");
    expect(within(tabela).getByRole("columnheader", { name: "Último login" })).toBeInTheDocument();
    expect(within(tabela).getAllByText("Suspenso").length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole("button", { name: "Suspender o acesso de Márcia (fictícia)" }));
    const dialogo = await screen.findByRole("dialog");
    expect(within(dialogo).getByText(/imediatamente/)).toBeInTheDocument();
    await userEvent.click(within(dialogo).getByRole("button", { name: "Suspender acesso" }));
    expect(await within(dialogo).findByText(/Escreva o motivo/)).toBeInTheDocument();
    await userEvent.type(within(dialogo).getByLabelText(/Motivo/), "Afastamento fictício");
    await userEvent.click(within(dialogo).getByRole("button", { name: "Suspender acesso" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const trilha = await api.adminListarAuditoria();
    expect(trilha.itens[0]).toMatchObject({ evento: "ACESSO_SUSPENSO", alvoNome: "Márcia (fictícia)" });
  });

  it("criar acesso: valida por etapa, mostra a revisão e envia o convite", async () => {
    await renderizarApp("/admin/usuarios/novo", ID.admin);
    await userEvent.click(await screen.findByRole("button", { name: "Continuar" }));
    expect(await screen.findByText("Informe um e-mail válido.", { selector: ".campo__erro" })).toBeInTheDocument();
    expect(screen.getByText(/A administração geral nunca vê estudantes/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/^E-mail/), "nova.docente@example.test");
    await userEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(await screen.findByRole("heading", { name: /Etapa 2 de 4/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("checkbox", { name: "Material adaptado · Aprovar" }));
    await userEvent.click(screen.getByRole("button", { name: "Continuar" }));
    await userEvent.click(await screen.findByRole("button", { name: "Continuar" }));
    expect(await screen.findByRole("heading", { name: /Etapa 4 de 4: Revisão/ })).toBeInTheDocument();
    expect(screen.getByText(/Observação do ciclo · Registrar; Material adaptado · Registrar/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Enviar convite" }));
    expect(await screen.findByText("Convite enviado")).toBeInTheDocument();
    const [nova] = (await api.adminListarUsuarios({ busca: "nova.docente" })).itens;
    expect(nova).toMatchObject({ situacao: "CONVITE_PENDENTE" });
  });

  it("perfis: Administrador Geral destacado; no editor, o que passa do teto fica desabilitado", async () => {
    await renderizarApp("/admin/perfis", ID.admin);
    expect(await screen.findByText(/Nunca abre dados de estudante/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Novo perfil" }));
    expect(screen.getByRole("checkbox", { name: "Notas clínicas reservadas: Ver" })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "Material adaptado: Aprovar" })).toBeEnabled();
    await userEvent.type(screen.getByLabelText(/^Nome do perfil/), "Docente sem aprovação (fictício)");
    await userEvent.click(screen.getByRole("checkbox", { name: "Material adaptado: Aprovar" }));
    await userEvent.click(screen.getByRole("button", { name: "Salvar perfil" }));
    expect(await screen.findByRole("rowheader", { name: /Docente sem aprovação \(fictício\)/ })).toBeInTheDocument();
  });

  it("ferramentas: desligar pede confirmação e bloqueia a ação na hora", async () => {
    await renderizarApp("/admin/ferramentas", ID.admin);
    const cartao = (await screen.findByRole("heading", { name: "Notas clínicas reservadas" })).closest("section")!;
    await userEvent.click(within(cartao).getByRole("button", { name: "Desligar" }));
    const dialogo = await screen.findByRole("dialog");
    await userEvent.click(within(dialogo).getByRole("button", { name: "Desligar ferramenta" }));
    expect(await within(cartao).findByText("Desligada")).toBeInTheDocument();
  });

  it("busca geral: pessoas e atividades a partir da barra superior", async () => {
    await renderizarApp("/admin", ID.admin);
    await userEvent.type(await screen.findByRole("searchbox", { name: /Buscar pessoas/ }), "Henrique");
    await userEvent.click(screen.getByRole("button", { name: "Buscar" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Busca" })).toBeInTheDocument();
    expect(await screen.findByRole("list", { name: "Pessoas encontradas" })).toHaveTextContent("Henrique (fictício)");
    expect(screen.getByText(/Resultados para “Henrique”/)).toBeInTheDocument();
  });

  it("o Administrador Geral que abre /painel vai para o painel administrativo", async () => {
    await renderizarApp("/painel", ID.admin);
    expect(await screen.findByRole("heading", { level: 1, name: "Visão geral" })).toBeInTheDocument();
  });
});
