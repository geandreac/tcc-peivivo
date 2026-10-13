// Captura as telas do protótipo usadas na seção 4.2 do artigo (dados 100 % fictícios do mock).
// Requer o protótipo em modo demonstração: `VITE_API=mock npx vite --port 5179` em apps/web.
//   node scripts/artigo/capturar-telas.mjs   → docs/tcc/artigo/telas/*.png
// Uma só sessão de navegador: o ciclo fechado pela docente vira a proposta que a profissional valida.
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:5179";
const MIGUEL = "e-0010";
const saida = fileURLToPath(new URL("../../docs/tcc/artigo/telas/", import.meta.url));
await mkdir(saida, { recursive: true });

const navegador = await chromium.launch(process.env.CI ? {} : { channel: "chrome", headless: false, args: ["--headless=new"] });
const contexto = await navegador.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2, locale: "pt-BR", reducedMotion: "reduce" });
const pagina = await contexto.newPage();

await pagina.goto(BASE);
await pagina.evaluate(() => localStorage.clear());

async function entrar(slug, nome) {
  await pagina.goto(`${BASE}/entrar/${slug}`);
  await pagina.getByRole("button", { name: nome }).click();
  await pagina.getByRole("heading", { level: 1, name: "Meus estudantes" }).waitFor();
}

async function foto(arquivo, ancora) {
  await pagina.waitForLoadState("networkidle");
  // avisos temporários ("Rascunho gerado em…") cobririam o conteúdo
  await pagina.addStyleTag({ content: ".toasts{display:none!important}" });
  if (ancora) await pagina.getByRole("heading", { name: ancora }).evaluate((h) => window.scrollTo(0, h.getBoundingClientRect().top + window.scrollY - 120));
  else await pagina.evaluate(() => window.scrollTo(0, 0));
  await pagina.screenshot({ path: join(saida, arquivo) });
  console.log(`✓ ${arquivo}`);
}

// Docente: observa (atenção reduzida → restrição imediata, RN03) e fecha o ciclo
await entrar("docente", /Márcia/);
await pagina.goto(`${BASE}/estudantes/${MIGUEL}/observar`);
await pagina.getByRole("heading", { level: 1 }).waitFor();
for (const [dimensao, valor] of [["Atenção sustentada", /^Reduzida/], ["Compreensão de enunciados", /^Estável/], ["Autonomia com palavras", /^Estável/], ["Interesse manifesto", /^Estável/], ["Sensibilidade visual", /^Estável/], ["Cansaço na tarefa", /^Estável/]]) {
  await pagina.getByRole("group", { name: dimensao }).getByRole("radio", { name: valor }).check();
}
await foto("01-observar.png");
await pagina.getByRole("button", { name: "Registrar observações" }).click();
await pagina.getByRole("list", { name: "Observações deste ciclo" }).waitFor();

await pagina.goto(`${BASE}/estudantes/${MIGUEL}/fechar-ciclo`);
await pagina.getByRole("button", { name: /^Fechar ciclo \d+/ }).waitFor();
await foto("02-fechar-ciclo.png", "Proposta de parâmetros");
await pagina.getByRole("button", { name: /^Fechar ciclo \d+/ }).click();
await pagina.getByRole("dialog").getByRole("button", { name: "Fechar ciclo", exact: true }).click();
await pagina.waitForTimeout(800);

// Docente: gera, revisa lado a lado e aprova; tenta abrir a nota clínica (negado)
await pagina.goto(`${BASE}/estudantes/${MIGUEL}/gerar`);
await pagina.getByRole("button", { name: /Usar texto de exemplo/ }).click();
await pagina.getByRole("button", { name: /Adaptar para/ }).click();
await pagina.waitForURL(/\/revisar$/u);
await pagina.getByRole("button", { name: "Aprovar material", exact: true }).waitFor();
await foto("04-revisar.png");
await pagina.getByRole("button", { name: "Aprovar material", exact: true }).click();
await pagina.waitForURL(/\/materiais\/[^/]+$/u);
await pagina.getByRole("heading", { level: 1 }).waitFor();
await foto("05-material.png");

await pagina.goto(`${BASE}/estudantes/${MIGUEL}/notas-clinicas`);
await pagina.getByText("Acesso negado").waitFor();
await foto("07-negado.png");

// Profissional de saúde: valida o conjunto de parâmetros proposto no fechamento
await entrar("saude", /Camila/);
await pagina.goto(`${BASE}/estudantes/${MIGUEL}/validar`);
await pagina.getByRole("heading", { level: 1 }).waitFor();
await foto("03-validar.png");

// Responsável: privacidade (quem tem acesso e o que cada um vê)
await entrar("familia", /Rosa/);
await pagina.goto(`${BASE}/estudantes/${MIGUEL}/privacidade`);
await pagina.getByRole("heading", { level: 1, name: "Privacidade" }).waitFor();
await foto("06-privacidade.png");

await navegador.close();
