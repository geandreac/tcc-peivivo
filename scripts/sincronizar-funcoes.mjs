// Gera supabase/functions/_shared/gerado/ a partir do código TS puro do
// monorepo (motor, contratos, casos de uso), reescrevendo os imports para Deno:
//   "./x"                        → "./x.ts"
//   "zod"                        → "npm:zod@3.23.8"
//   "@pei-vivo/motor-adaptacao"  → "../motor/index.ts"   (idem contratos/funcoes)
// Motivo: o bundler das Edge Functions só empacota o que está sob
// supabase/functions/ (packages/motor-adaptacao/README.md, P3.1).
//
// Uso:  node scripts/sincronizar-funcoes.mjs             (gera)
//       node scripts/sincronizar-funcoes.mjs --verificar (CI: falha se a cópia divergir)
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

const raiz = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const destino = join(raiz, "supabase", "functions", "_shared", "gerado");
const pacotes = [
  { de: "packages/motor-adaptacao/src", para: "motor", nome: "@pei-vivo/motor-adaptacao" },
  { de: "packages/contratos/src", para: "contratos", nome: "@pei-vivo/contratos" },
  { de: "packages/funcoes/src", para: "funcoes", nome: "@pei-vivo/funcoes" },
];
const ZOD = "npm:zod@3.23.8";
const CABECALHO = (origem) =>
  `// GERADO por scripts/sincronizar-funcoes.mjs a partir de ${origem} — NÃO EDITE.\n`;

function reescrever(codigo) {
  return codigo.replace(/(from\s+|import\s*\(\s*)(["'])([^"']+)\2/gu, (todo, prefixo, aspas, alvo) => {
    let novo = alvo;
    if (alvo === "zod") novo = ZOD;
    else {
      const pacote = pacotes.find((p) => p.nome === alvo);
      if (pacote) novo = `../${pacote.para}/index.ts`;
      else if (alvo.startsWith(".") && !alvo.endsWith(".ts")) novo = `${alvo}.ts`;
    }
    return `${prefixo}${aspas}${novo}${aspas}`;
  });
}

async function gerarArquivos() {
  const saida = new Map();
  for (const p of pacotes) {
    const dir = join(raiz, p.de);
    for (const f of (await readdir(dir)).filter((x) => x.endsWith(".ts") && !x.endsWith(".test.ts")).sort()) {
      const codigo = await readFile(join(dir, f), "utf8");
      saida.set(join(p.para, f), CABECALHO(`${p.de}/${f}`) + reescrever(codigo.replace(/\r\n/gu, "\n")));
    }
  }
  return saida;
}

const arquivos = await gerarArquivos();
if (process.argv.includes("--verificar")) {
  const divergentes = [];
  for (const [rel, conteudo] of arquivos) {
    let atual = null;
    try {
      atual = (await readFile(join(destino, rel), "utf8")).replace(/\r\n/gu, "\n");
    } catch {
      /* ausente */
    }
    if (atual !== conteudo) divergentes.push(rel);
  }
  if (divergentes.length) {
    console.error(`✗ Cópia Deno desatualizada: ${divergentes.join(", ")}\n  Rode: node scripts/sincronizar-funcoes.mjs`);
    process.exit(1);
  }
  console.log(`✓ supabase/functions/_shared/gerado em dia (${arquivos.size} arquivos)`);
} else {
  await rm(destino, { recursive: true, force: true });
  for (const [rel, conteudo] of arquivos) {
    await mkdir(join(destino, rel, ".."), { recursive: true });
    await writeFile(join(destino, rel), conteudo);
  }
  console.log(`✓ ${arquivos.size} arquivos gerados em ${relative(raiz, destino)}`);
}
