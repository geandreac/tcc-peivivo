// Verifica as razões de contraste do design system (docs/ux-ui.md §3.2).
// Fórmula de luminância relativa da WCAG 2.x. Uso: node scripts/contraste.mjs
// Falha (exit 1) se algum par de TEXTO ficar abaixo de 4,5:1 ou de COMPONENTE
// abaixo de 3:1. Pares decorativos (bordas de card) e desabilitados são só informativos.
//
// Os valores vêm de apps/web/src/styles/tokens.css — fonte única (docs/diagnostico-de-interface.md #16).
// Os pares citam o NOME do token; mudar uma cor em tokens.css já é verificado aqui.
// Também falha se os dois blocos do tema escuro (sistema e escolha manual) divergirem.
import { readFileSync } from "node:fs";

const CSS = readFileSync(new URL("../apps/web/src/styles/tokens.css", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

/** Declarações `--nome: valor;` do primeiro bloco cujo seletor bate exatamente. */
function bloco(seletor) {
  const i = CSS.indexOf(`${seletor} {`);
  if (i < 0) throw new Error(`tokens.css: bloco "${seletor}" não encontrado`);
  const corpo = CSS.slice(i + seletor.length + 2, CSS.indexOf("}", i));
  return Object.fromEntries([...corpo.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}

const claro = bloco(":root");
const alto = { ...claro, ...bloco(':root[data-contraste="alto"]') };
const escuroSistema = bloco(':root:not([data-tema="claro"]):not([data-contraste="alto"])');
const escuroEscolhido = bloco(':root[data-tema="escuro"]:not([data-contraste="alto"])');
const escuro = { ...claro, ...escuroSistema };
const TEMAS = { claro, alto, escuro };

const resolver = (tema, nome, visitados = new Set()) => {
  const v = tema[nome];
  if (v === undefined) throw new Error(`token --${nome} não existe`);
  const ref = v.match(/^var\(--([\w-]+)\)$/);
  if (!ref) return v;
  if (visitados.has(nome)) throw new Error(`referência circular em --${nome}`);
  return resolver(tema, ref[1], visitados.add(nome));
};

const lum = (hex) => {
  const c = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const razao = (a, b) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

// [tema, nome, token da frente, token do fundo, mínimo exigido (0 = informativo)]
const PARES = [
  ["claro", "texto / superfície", "cor-texto", "cor-superficie", 4.5],
  ["claro", "texto / fundo", "cor-texto", "cor-fundo", 4.5],
  ["claro", "texto secundário / superfície", "cor-texto-secundario", "cor-superficie", 4.5],
  ["claro", "texto secundário / fundo", "cor-texto-secundario", "cor-fundo", 4.5],
  ["claro", "branco / primária (botão)", "cor-sobre-primaria", "cor-primaria", 4.5],
  ["claro", "primária / superfície (link)", "cor-primaria", "cor-superficie", 4.5],
  ["claro", "primária / tint (info)", "cor-primaria", "cor-primaria-tint", 4.5],
  ["claro", "primária escura / superfície", "cor-primaria-escura", "cor-superficie", 4.5],
  ["claro", "secundária / superfície", "cor-secundaria", "cor-superficie", 4.5],
  ["claro", "sucesso / superfície", "cor-sucesso", "cor-superficie", 4.5],
  ["claro", "sucesso / fundo sucesso", "cor-sucesso", "cor-sucesso-fundo", 4.5],
  ["claro", "aviso / superfície", "cor-aviso", "cor-superficie", 4.5],
  ["claro", "aviso / fundo aviso", "cor-aviso", "cor-aviso-fundo", 4.5],
  ["claro", "erro / superfície", "cor-erro", "cor-superficie", 4.5],
  ["claro", "erro / fundo erro", "cor-erro", "cor-erro-fundo", 4.5],
  ["claro", "branco / erro (botão perigo)", "cor-sobre-erro", "cor-erro", 4.5],
  ["claro", "badge neutro", "cor-texto-secundario", "cor-superficie-2", 4.5],
  ["claro", "material texto / fundo creme", "material-texto", "material-fundo", 7],
  ["claro", "material: destaque / creme", "material-destaque", "material-fundo", 4.5],
  ["claro", "material: destaque / branco", "material-destaque", "material-claro", 4.5],
  ["claro", "material: branco / destaque (avatar)", "material-claro", "material-destaque", 4.5],
  ["claro", "material: destaque / tint (selos)", "material-destaque", "material-destaque-tint", 4.5],
  ["claro", "material: contorno / branco (7:1)", "material-contorno", "material-claro", 7],
  ["claro", "borda de campo / superfície", "cor-borda", "cor-superficie", 3],
  ["claro", "borda de campo / fundo", "cor-borda", "cor-fundo", 3],
  ["claro", "anel de foco / superfície", "cor-foco", "cor-superficie", 3],
  ["claro", "anel de foco / fundo", "cor-foco", "cor-fundo", 3],
  ["claro", "toast: fundo claro sobre texto", "cor-fundo", "cor-texto", 4.5],
  // D-41: cores de papel — texto/ícone sobre superfície e tint, número sobre o papel
  ["claro", "papel família / superfície", "papel-familia", "cor-superficie", 4.5],
  ["claro", "papel família / tint família", "papel-familia", "papel-familia-tint", 4.5],
  ["claro", "papel saúde / tint saúde", "papel-saude", "papel-saude-tint", 4.5],
  ["claro", "papel coordenação / tint coordenação", "papel-coordenacao", "papel-coordenacao-tint", 4.5],
  ["claro", "papel escola / tint escola", "papel-escola", "papel-escola-tint", 4.5],
  ["claro", "fundo / papel saúde (número do ciclo)", "cor-fundo", "papel-saude", 4.5],
  ["claro", "fundo / papel família (número do ciclo)", "cor-fundo", "papel-familia", 4.5],
  ["claro", "fundo / papel coordenação (número)", "cor-fundo", "papel-coordenacao", 4.5],
  ["claro", "(decorativo) borda suave / superfície", "cor-borda-suave", "cor-superficie", 0],
  ["claro", "(isento) desabilitado", "cor-desabilitado-texto", "cor-desabilitado-fundo", 0],

  ["alto", "texto / superfície", "cor-texto", "cor-superficie", 7],
  ["alto", "branco / primária", "cor-sobre-primaria", "cor-primaria", 7],
  ["alto", "primária / superfície", "cor-primaria", "cor-superficie", 7],
  ["alto", "secundário / superfície", "cor-texto-secundario", "cor-superficie", 7],
  ["alto", "sucesso / superfície", "cor-sucesso", "cor-superficie", 7],
  ["alto", "aviso / superfície", "cor-aviso", "cor-superficie", 7],
  ["alto", "erro / superfície", "cor-erro", "cor-superficie", 7],

  // tema escuro (R4.6)
  ["escuro", "texto / superfície", "cor-texto", "cor-superficie", 4.5],
  ["escuro", "texto / fundo", "cor-texto", "cor-fundo", 4.5],
  ["escuro", "texto / superfície em destaque", "cor-texto", "cor-superficie-destaque", 4.5],
  ["escuro", "texto secundário / superfície", "cor-texto-secundario", "cor-superficie", 4.5],
  ["escuro", "texto secundário / fundo", "cor-texto-secundario", "cor-fundo", 4.5],
  ["escuro", "texto secundário / sup. destaque", "cor-texto-secundario", "cor-superficie-destaque", 4.5],
  ["escuro", "botão primário (texto / fundo)", "cor-sobre-primaria", "cor-primaria", 4.5],
  ["escuro", "link / superfície", "cor-primaria", "cor-superficie", 4.5],
  ["escuro", "link / fundo", "cor-primaria", "cor-fundo", 4.5],
  ["escuro", "link / superfície em destaque", "cor-primaria", "cor-superficie-destaque", 4.5],
  ["escuro", "primária / tint (info)", "cor-primaria", "cor-primaria-tint", 4.5],
  ["escuro", "primária escura / tint (nav atual)", "cor-primaria-escura", "cor-primaria-tint", 4.5],
  ["escuro", "secundária / superfície", "cor-secundaria", "cor-superficie", 4.5],
  ["escuro", "sucesso / superfície", "cor-sucesso", "cor-superficie", 4.5],
  ["escuro", "sucesso / fundo sucesso", "cor-sucesso", "cor-sucesso-fundo", 4.5],
  ["escuro", "aviso / superfície", "cor-aviso", "cor-superficie", 4.5],
  ["escuro", "aviso / fundo aviso", "cor-aviso", "cor-aviso-fundo", 4.5],
  ["escuro", "erro / superfície", "cor-erro", "cor-superficie", 4.5],
  ["escuro", "erro / fundo erro", "cor-erro", "cor-erro-fundo", 4.5],
  ["escuro", "botão perigo (texto / fundo)", "cor-sobre-erro", "cor-erro", 4.5],
  ["escuro", "botão perigo hover", "cor-sobre-erro", "cor-erro-forte", 4.5],
  ["escuro", "badge neutro", "cor-texto-secundario", "cor-superficie-2", 4.5],
  ["escuro", "toast (fundo sobre texto)", "cor-fundo", "cor-texto", 4.5],
  ["escuro", "borda de campo / superfície", "cor-borda", "cor-superficie", 3],
  ["escuro", "borda de campo / fundo", "cor-borda", "cor-fundo", 3],
  ["escuro", "anel de foco / superfície", "cor-foco", "cor-superficie", 3],
  ["escuro", "anel de foco / fundo", "cor-foco", "cor-fundo", 3],
  ["escuro", "papel família / superfície", "papel-familia", "cor-superficie", 4.5],
  ["escuro", "papel família / tint família", "papel-familia", "papel-familia-tint", 4.5],
  ["escuro", "papel saúde / tint saúde", "papel-saude", "papel-saude-tint", 4.5],
  ["escuro", "papel coordenação / tint", "papel-coordenacao", "papel-coordenacao-tint", 4.5],
  ["escuro", "papel escola / tint escola", "papel-escola", "papel-escola-tint", 4.5], // avatar do cartão de estudante
  ["escuro", "fundo / papel saúde (número)", "cor-fundo", "papel-saude", 4.5],
];

let falhas = 0;

// Os dois blocos escuros precisam ser idênticos (o CSS não junta media query e atributo numa regra só).
const nomes = new Set([...Object.keys(escuroSistema), ...Object.keys(escuroEscolhido)]);
for (const n of nomes) {
  if (n === "color-scheme") continue;
  if (escuroSistema[n] !== escuroEscolhido[n]) {
    falhas++;
    console.log(`✗ tema escuro divergente: --${n} = ${escuroSistema[n] ?? "(ausente)"} (sistema) × ${escuroEscolhido[n] ?? "(ausente)"} (escolhido)`);
  }
}

// Cor de papel é identidade, cor de estado é significado: nunca a mesma cor (Apple HIG, Color; D-45).
const ESTADOS = ["cor-aviso", "cor-erro"]; // estados que pedem atenção; escola/info e família/sucesso compartilham tom de propósito (marca)
for (const [tema, valores] of Object.entries(TEMAS)) {
  for (const papel of Object.keys(valores).filter((n) => /^papel-[a-z]+$/.test(n))) {
    for (const estado of ESTADOS.filter((e) => e in valores)) {
      if (resolver(valores, papel).toLowerCase() === resolver(valores, estado).toLowerCase()) {
        falhas++;
        console.log(`✗ ${tema}: --${papel} igual a --${estado} (mesma cor com dois significados)`);
      }
    }
  }
}

for (const [tema, nome, frente, fundo, minimo] of PARES) {
  const a = resolver(TEMAS[tema], frente);
  const b = resolver(TEMAS[tema], fundo);
  const r = razao(a, b);
  const ok = minimo === 0 || r >= minimo;
  if (!ok) falhas++;
  const rotulo = `${tema === "claro" ? "" : `${tema}: `}${nome}`;
  console.log(
    `${ok ? "✓" : "✗"} ${rotulo.padEnd(46)} ${a.toUpperCase()} sobre ${b.toUpperCase()}  ${r.toFixed(2).replace(".", ",")}:1${minimo ? `  (mín. ${minimo})` : ""}`,
  );
}
if (falhas > 0) {
  console.error(`\n✗ ${falhas} problema(s): par abaixo do mínimo ou tema escuro divergente.`);
  process.exit(1);
}
console.log(`\nOK — ${PARES.length} pares lidos de tokens.css atendem à WCAG 2.2 AA (1.4.3 / 1.4.11); temas escuros idênticos.`);
