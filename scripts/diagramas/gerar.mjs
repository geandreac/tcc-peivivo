// Gera os diagramas UML do artigo a partir do que o sistema implementa
// e os converte em PNG com o Chrome do Playwright.
//   node scripts/diagramas/gerar.mjs            → docs/tcc/*_diagram.{svg,png} (completos)
//                                                 docs/tcc/artigo/figuras/*.{svg,png} (impressão)
//   node scripts/diagramas/gerar.mjs --so-svg   → só os SVGs
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { diagramaClasses } from "./classes.mjs";
import { diagramaCasosDeUso } from "./casos-de-uso.mjs";
import { diagramaSequencia } from "./sequencia.mjs";
import { FIGURAS_IMPRESSAS } from "./impressao.mjs";

const raiz = fileURLToPath(new URL("../../docs/tcc/", import.meta.url));
const figuras = join(raiz, "artigo", "figuras");
await mkdir(figuras, { recursive: true });

// [pasta, nome, svg, escala do PNG]
const saidas = [
  [raiz, "class_diagram", diagramaClasses(), 2],
  [raiz, "usecase_diagram", diagramaCasosDeUso(), 2],
  [raiz, "sequence_diagram", diagramaSequencia(), 2],
  ...Object.entries(FIGURAS_IMPRESSAS).map(([nome, f]) => [figuras, nome, f(), 3]),
];

for (const [pasta, nome, svg] of saidas) {
  await writeFile(join(pasta, `${nome}.svg`), svg, "utf8");
  console.log(`✓ ${nome}.svg`);
}

if (!process.argv.includes("--so-svg")) {
  const { chromium } = await import("playwright");
  const navegador = await chromium.launch(process.env.CI ? {} : { channel: "chrome", headless: false, args: ["--headless=new"] });
  for (const escala of [2, 3]) {
    const pagina = await navegador.newPage({ deviceScaleFactor: escala });
    for (const [pasta, nome, svg] of saidas.filter((s) => s[3] === escala)) {
      const [, w, h] = svg.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/);
      await pagina.setViewportSize({ width: Math.ceil(+w), height: Math.ceil(+h) });
      await pagina.setContent(`<html><body style="margin:0">${svg}</body></html>`);
      await pagina.screenshot({ path: join(pasta, `${nome}.png`), clip: { x: 0, y: 0, width: +w, height: +h } });
      console.log(`✓ ${nome}.png`);
    }
    await pagina.close();
  }
  await navegador.close();
}
