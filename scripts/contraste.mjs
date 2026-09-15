// Verifica as razões de contraste do design system (docs/ux-ui.md §3.2).
// Fórmula de luminância relativa da WCAG 2.x. Uso: node scripts/contraste.mjs
// Falha (exit 1) se algum par de TEXTO ficar abaixo de 4,5:1 ou de COMPONENTE
// abaixo de 3:1. Pares decorativos (bordas de card) e desabilitados são só informativos.
const lum = (hex) => {
  const c = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4]
    .map((i) => parseInt(c.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const razao = (a, b) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

// [nome, frente, fundo, mínimo exigido (0 = informativo)]
const PARES = [
  ["texto / superfície", "#1B1B1B", "#FFFFFF", 4.5],
  ["texto / fundo", "#1B1B1B", "#F6F8FB", 4.5],
  ["texto secundário / superfície", "#4D4D4D", "#FFFFFF", 4.5],
  ["texto secundário / fundo", "#4D4D4D", "#F6F8FB", 4.5],
  ["branco / primária (botão)", "#FFFFFF", "#1D4E89", 4.5],
  ["primária / superfície (link)", "#1D4E89", "#FFFFFF", 4.5],
  ["primária / tint (info)", "#1D4E89", "#E8EFF8", 4.5],
  ["primária escura / superfície", "#163B68", "#FFFFFF", 4.5],
  ["secundária / superfície", "#0F6E56", "#FFFFFF", 4.5],
  ["sucesso / superfície", "#1E6B3A", "#FFFFFF", 4.5],
  ["sucesso / fundo sucesso", "#1E6B3A", "#E3F3E8", 4.5],
  ["aviso / superfície", "#8A5300", "#FFFFFF", 4.5],
  ["aviso / fundo aviso", "#8A5300", "#FFF3D6", 4.5],
  ["erro / superfície", "#B42318", "#FFFFFF", 4.5],
  ["erro / fundo erro", "#B42318", "#FDE8E6", 4.5],
  ["branco / erro (botão perigo)", "#FFFFFF", "#B42318", 4.5],
  ["badge neutro", "#4D4D4D", "#EDEFF2", 4.5],
  ["material texto / fundo creme", "#1B1B1B", "#FFFDF5", 7],
  ["borda de campo / superfície", "#767676", "#FFFFFF", 3],
  ["borda de campo / fundo", "#767676", "#F6F8FB", 3],
  ["anel de foco / superfície", "#1D4E89", "#FFFFFF", 3],
  ["anel de foco / fundo", "#1D4E89", "#F6F8FB", 3],
  ["alto contraste: texto", "#000000", "#FFFFFF", 7],
  ["alto contraste: branco / primária", "#FFFFFF", "#0B2A50", 7],
  ["alto contraste: primária / branco", "#0B2A50", "#FFFFFF", 7],
  ["alto contraste: secundário", "#333333", "#FFFFFF", 7],
  ["alto contraste: sucesso", "#0F4A24", "#FFFFFF", 7],
  ["alto contraste: aviso", "#5C3600", "#FFFFFF", 7],
  ["alto contraste: erro", "#8B1A10", "#FFFFFF", 7],
  ["(decorativo) borda suave / superfície", "#D5D9E0", "#FFFFFF", 0],
  ["(isento) desabilitado", "#6B6B6B", "#E9E9E9", 0],
];

let falhas = 0;
for (const [nome, a, b, minimo] of PARES) {
  const r = razao(a, b);
  const ok = minimo === 0 || r >= minimo;
  if (!ok) falhas++;
  console.log(`${ok ? "✓" : "✗"} ${nome.padEnd(40)} ${a} sobre ${b}  ${r.toFixed(2).replace(".", ",")}:1${minimo ? `  (mín. ${minimo})` : ""}`);
}
if (falhas > 0) {
  console.error(`\n✗ ${falhas} par(es) abaixo do mínimo.`);
  process.exit(1);
}
console.log("\nOK — todos os pares atendem à WCAG 2.2 AA (1.4.3 / 1.4.11).");
