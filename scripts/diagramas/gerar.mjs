// Gera os diagramas UML do artigo a partir do que o sistema implementa
// e os converte em PNG (2×) com o Chrome do Playwright.
//   node scripts/diagramas/gerar.mjs            → docs/tcc/*_diagram.{svg,png}
//   node scripts/diagramas/gerar.mjs --so-svg   → só os SVGs
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { diagramaClasses } from "./classes.mjs";
import { diagramaCasosDeUso } from "./casos-de-uso.mjs";
import { diagramaSequencia } from "./sequencia.mjs";

const saida = fileURLToPath(new URL("../../docs/tcc/", import.meta.url));
const diagramas = {
  class_diagram: diagramaClasses(),
  usecase_diagram: diagramaCasosDeUso(),
  sequence_diagram: diagramaSequencia(),
};

for (const [nome, svg] of Object.entries(diagramas)) {
  await writeFile(join(saida, `${nome}.svg`), svg, "utf8");
  console.log(`✓ ${nome}.svg`);
}

if (!process.argv.includes("--so-svg")) {
  const { chromium } = await import("playwright");
  const navegador = await chromium.launch(process.env.CI ? {} : { channel: "chrome", headless: false, args: ["--headless=new"] });
  const pagina = await navegador.newPage({ deviceScaleFactor: 2 });
  for (const [nome, svg] of Object.entries(diagramas)) {
    const [, w, h] = svg.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/);
    await pagina.setViewportSize({ width: Math.ceil(+w), height: Math.ceil(+h) });
    await pagina.setContent(`<html><body style="margin:0">${svg}</body></html>`);
    await pagina.screenshot({ path: join(saida, `${nome}.png`), clip: { x: 0, y: 0, width: +w, height: +h } });
    console.log(`✓ ${nome}.png`);
  }
  await navegador.close();
}
