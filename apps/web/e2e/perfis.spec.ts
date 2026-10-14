/**
 * E2E por perfil (R5.1) + medição do "observar em menos de 60 s" (R4.8) +
 * axe com CONTRASTE REAL (no jsdom a regra color-contrast fica desligada).
 * Caminho negado primeiro em cada bloco. Dados 100 % fictícios (mock).
 */
import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const MIGUEL = "e-0010";

/** Entra pela porta de entrada do perfil, como uma pessoa faria. */
async function entrar(page: Page, slug: "familia" | "docente" | "saude" | "coordenacao", nome: RegExp) {
  await page.addInitScript(() => {
    // estado limpo por teste (o mock persiste no localStorage do navegador)
    if (!sessionStorage.getItem("e2e:limpo")) {
      localStorage.clear();
      sessionStorage.setItem("e2e:limpo", "1");
    }
  });
  await page.goto(`/entrar/${slug}`);
  await page.getByRole("button", { name: nome }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Meus estudantes" })).toBeVisible();
}

async function semViolacoes(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
}

test.describe("Acesso indevido por URL (o banco/serviço nega; a tela só explica)", () => {
  test("docente abrindo a nota clínica do profissional", async ({ page }) => {
    await entrar(page, "docente", /Márcia/);
    await page.goto(`/estudantes/${MIGUEL}/notas-clinicas`);
    await expect(page.getByText("Acesso negado")).toBeVisible();
    await expect(page.getByText("Hipótese de trabalho")).toHaveCount(0); // conteúdo da nota fictícia nunca aparece
  });
  test("família abrindo um rascunho de material da docente", async ({ page }) => {
    await entrar(page, "familia", /Rosa/);
    await page.goto("/materiais/m-0041/revisar");
    await expect(page.getByRole("heading", { level: 1, name: "Material não encontrado" })).toBeVisible();
  });
  test("docente abrindo a página de privacidade da família", async ({ page }) => {
    await entrar(page, "docente", /Márcia/);
    await page.goto(`/estudantes/${MIGUEL}/privacidade`);
    await expect(page.getByText("Esta página é do responsável legal")).toBeVisible();
    await expect(page.getByRole("list", { name: "Pessoas com acesso" })).toHaveCount(0);
  });
  test("sem sessão, rota protegida leva para Entrar", async ({ page }) => {
    await page.goto(`/estudantes/${MIGUEL}`);
    await expect(page).toHaveURL(/\/entrar$/u);
  });
});

test.describe("Docente", () => {
  test("R4.8: observa as 6 dimensões em menos de 60 s e o registro aparece", async ({ page }) => {
    await entrar(page, "docente", /Márcia/);
    await page.goto(`/estudantes/${MIGUEL}/observar`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const inicio = Date.now();
    for (const dimensao of ["Atenção sustentada", "Compreensão de enunciados", "Autonomia com palavras", "Interesse manifesto", "Sensibilidade visual", "Cansaço na tarefa"]) {
      await page.getByRole("group", { name: dimensao }).getByRole("radio", { name: /^Estável/ }).check();
    }
    await page.getByRole("button", { name: "Registrar observações" }).click();
    await expect(page.getByRole("list", { name: "Observações deste ciclo" })).toBeVisible();
    const segundos = (Date.now() - inicio) / 1000;
    test.info().annotations.push({ type: "tempo-observar-s", description: segundos.toFixed(1) });
    expect(segundos).toBeLessThan(60); // tempo de máquina: prova que o fluxo cabe em poucos toques; o humano é medido no piloto
  });

  test("gera material, revisa lado a lado, aprova e registra desfecho; axe com contraste real", async ({ page }) => {
    await entrar(page, "docente", /Márcia/);
    await page.goto(`/estudantes/${MIGUEL}/gerar`);
    await page.getByRole("button", { name: /Usar texto de exemplo/ }).click();
    await page.getByRole("button", { name: /Adaptar para/ }).click();
    await expect(page).toHaveURL(/\/revisar$/u);
    await semViolacoes(page);
    await page.getByRole("button", { name: "Aprovar material", exact: true }).click();
    await expect(page).toHaveURL(/\/materiais\/[^/]+$/u);
    await page.goto(page.url() + "/desfecho");
    await page.getByRole("group", { name: "Resultado em sala" }).getByRole("radio").first().check();
    await page.getByRole("button", { name: "Registrar desfecho" }).click();
    await expect(page.getByRole("status").or(page.getByRole("alert")).first()).toBeVisible();
  });
});

test.describe("Família", () => {
  test("vê privacidade (quem tem acesso, matriz em texto) sem violações de acessibilidade", async ({ page }) => {
    await entrar(page, "familia", /Rosa/);
    await page.getByRole("link", { name: "Privacidade e autorização" }).first().click();
    await expect(page.getByRole("heading", { level: 1, name: "Privacidade" })).toBeVisible();
    await expect(page.getByRole("list", { name: "Pessoas com acesso" }).getByText("Márcia (fictícia)")).toBeVisible();
    await expect(page.locator("text=Não vê >> visible=true").first()).toBeVisible();
    await semViolacoes(page);
  });
});

test.describe("Profissional de saúde", () => {
  test("abre a validação e as notas reservadas", async ({ page }) => {
    await entrar(page, "saude", /Camila/);
    await page.goto(`/estudantes/${MIGUEL}/notas-clinicas`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("Acesso negado")).toHaveCount(0);
    await semViolacoes(page);
  });
});

test.describe("Coordenação", () => {
  test("vê o painel da escola só com contagens e pendências acionáveis", async ({ page }) => {
    await entrar(page, "coordenacao", /Coordenação/);
    const resumo = page.getByRole("list", { name: "Resumo da escola" });
    await expect(resumo).toBeVisible();
    await expect(page.getByRole("list", { name: "O que precisa de você" })).toBeVisible();
    await semViolacoes(page);
  });
});

test.describe("Layout responsivo (1.4.10, 2.4.11)", () => {
  test("sem rolagem lateral e navegação principal única", async ({ page }) => {
    await entrar(page, "docente", /Márcia/);
    const larguras = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, vp: window.innerWidth }));
    expect(larguras.doc).toBeLessThanOrEqual(larguras.vp);
    await expect(page.getByRole("navigation", { name: "Principal" })).toHaveCount(1);
  });
});
