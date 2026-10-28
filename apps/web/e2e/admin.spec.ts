/**
 * E2E do painel administrativo (D-50), em 390 e 1280 px, com axe de contraste real.
 * Negado primeiro. Dados 100 % fictícios (mock).
 */
import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function entrar(page: Page, slug: "administracao" | "docente" | "coordenacao", nome: RegExp) {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("e2e:limpo")) {
      localStorage.clear();
      sessionStorage.setItem("e2e:limpo", "1");
    }
  });
  await page.goto(`/entrar/${slug}`);
  await page.getByRole("button", { name: nome }).click();
  await expect(page.getByRole("heading", { level: 1 })).not.toHaveText(/Entrar/);
}

async function semViolacoes(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
}

test.describe("Painel administrativo", () => {
  test("negado: docente abrindo /admin vê o motivo e nenhum indicador", async ({ page }) => {
    await entrar(page, "docente", /Márcia/);
    await page.goto("/admin");
    await expect(page.getByText("Acesso não permitido")).toBeVisible();
    await expect(page.getByRole("list", { name: "Indicadores" })).toHaveCount(0);
  });

  test("Administrador Geral: visão geral sem dado de estudante, sem violações e sem rolagem lateral", async ({ page }) => {
    await entrar(page, "administracao", /Administração Geral/);
    await expect(page.getByRole("heading", { level: 1, name: "Visão geral" })).toBeVisible();
    await expect(page.getByRole("list", { name: "Indicadores" })).toBeVisible();
    await expect(page.getByText("Miguel (fictício)")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await semViolacoes(page);
  });

  test("suspender com confirmação e motivo; a ação aparece na trilha", async ({ page }) => {
    await entrar(page, "administracao", /Administração Geral/);
    await page.getByRole("navigation", { name: "Administração" }).getByRole("link", { name: "Usuários e acessos" }).click();
    await page.getByRole("button", { name: "Suspender o acesso de Márcia (fictícia)" }).click();
    const dialogo = page.getByRole("dialog");
    await expect(dialogo.getByText(/imediatamente/)).toBeVisible();
    await semViolacoes(page);
    await dialogo.getByLabel(/Motivo/).fill("Afastamento fictício");
    await dialogo.getByRole("button", { name: "Suspender acesso" }).click();
    await expect(dialogo).toBeHidden();
    await page.getByRole("navigation", { name: "Administração" }).getByRole("link", { name: "Atividades e auditoria" }).click();
    const tabela = page.getByRole("table");
    await expect(tabela.getByRole("rowheader", { name: "Acesso suspenso" }).first()).toBeVisible();
    await expect(tabela).toContainText("Márcia (fictícia)");
    await expect(tabela).not.toContainText("Afastamento fictício");
    await semViolacoes(page);
  });

  test("criar acesso por etapas até o convite", async ({ page }) => {
    await entrar(page, "administracao", /Administração Geral/);
    await page.getByRole("link", { name: "Criar acesso" }).first().click();
    await page.getByLabel(/^E-mail/).fill("nova.coordenacao@example.test");
    await page.getByLabel("Coordenação pedagógica").check();
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByRole("heading", { name: /Etapa 4 de 4: Revisão/ })).toBeVisible();
    await semViolacoes(page);
    await page.getByRole("button", { name: "Enviar convite" }).click();
    await expect(page.getByText("Convite enviado")).toBeVisible();
  });

  test("editor de perfis: acima do teto fica desabilitado", async ({ page }) => {
    await entrar(page, "administracao", /Administração Geral/);
    await page.goto("/admin/perfis");
    await page.getByRole("button", { name: "Novo perfil" }).click();
    await expect(page.getByRole("checkbox", { name: "Notas clínicas reservadas: Ver" })).toBeDisabled();
    await semViolacoes(page);
  });

  test("coordenação: painel da própria escola, sem editar configurações", async ({ page }) => {
    await entrar(page, "coordenacao", /Coordenação/);
    await page.getByRole("link", { name: "Administrar acessos" }).click();
    await expect(page.getByText("Administração da escola")).toBeVisible();
    await page.goto("/admin/configuracoes");
    await expect(page.getByLabel(/Validade padrão/)).toBeDisabled();
    await semViolacoes(page);
  });
});
