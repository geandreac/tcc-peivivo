// Primitivas SVG dos diagramas UML (mesma paleta dos diagramas originais do artigo).
export const COR = {
  azul: "#0B3D63",
  verdeAzul: "#1C7293",
  texto: "#16222B",
  apagado: "#5B6B79",
  linha: "#4A6478",
  divisor: "#C7D4DC",
  fundoLegenda: "#EEF3F6",
  fundoSistema: "#F9FBFD",
  laranja: "#E8A33D",
  vermelho: "#B23A3A",
};
export const FONTE = "Calibri, Arial, sans-serif";
export const MONO = "Consolas, 'Courier New', monospace";
export const SERIFA = "Cambria, Georgia, serif";

export const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function texto(x, y, s, o = {}) {
  const { tam = 12, cor = COR.texto, peso = "normal", estilo = "normal", ancora = "start", fonte = FONTE } = o;
  return `<text x="${x}" y="${y}" font-size="${tam}" fill="${cor}" font-weight="${peso}" font-style="${estilo}" text-anchor="${ancora}" font-family="${fonte}">${esc(s)}</text>`;
}

/** Texto com fundo branco (rótulo sobre linha). Largura estimada pelo nº de caracteres. */
export function rotulo(x, y, s, o = {}) {
  const tam = o.tam ?? 11;
  const w = s.length * tam * 0.5 + 8;
  const ancora = o.ancora ?? "middle";
  const x0 = ancora === "middle" ? x - w / 2 : ancora === "end" ? x - w : x - 4;
  return `<rect x="${x0}" y="${y - tam}" width="${w}" height="${tam + 5}" fill="#FFFFFF"/>` +
    texto(x, y, s, { tam, cor: o.cor ?? COR.apagado, estilo: o.estilo ?? "italic", ancora, peso: o.peso ?? "normal" });
}

export const DEFS = `<defs>
  <marker id="setaAberta" markerWidth="12" markerHeight="10" refX="10" refY="5" orient="auto" markerUnits="userSpaceOnUse">
    <path d="M1,1 L10,5 L1,9" fill="none" stroke="${COR.linha}" stroke-width="1.6"/></marker>
  <marker id="setaAbertaVerde" markerWidth="12" markerHeight="10" refX="10" refY="5" orient="auto" markerUnits="userSpaceOnUse">
    <path d="M1,1 L10,5 L1,9" fill="none" stroke="${COR.verdeAzul}" stroke-width="1.8"/></marker>
  <marker id="setaAbertaLaranja" markerWidth="12" markerHeight="10" refX="10" refY="5" orient="auto" markerUnits="userSpaceOnUse">
    <path d="M1,1 L10,5 L1,9" fill="none" stroke="${COR.laranja}" stroke-width="1.8"/></marker>
  <marker id="setaCheia" markerWidth="14" markerHeight="12" refX="11" refY="6" orient="auto" markerUnits="userSpaceOnUse">
    <path d="M1,1 L12,6 L1,11 Z" fill="${COR.azul}"/></marker>
  <marker id="setaCheiaVermelha" markerWidth="14" markerHeight="12" refX="11" refY="6" orient="auto" markerUnits="userSpaceOnUse">
    <path d="M1,1 L12,6 L1,11 Z" fill="${COR.vermelho}"/></marker>
  <marker id="trianguloVazado" markerWidth="18" markerHeight="16" refX="16" refY="8" orient="auto" markerUnits="userSpaceOnUse">
    <path d="M1,1 L16,8 L1,15 Z" fill="#FFFFFF" stroke="${COR.linha}" stroke-width="1.6"/></marker>
  <marker id="losangoCheio" markerWidth="20" markerHeight="12" refX="1" refY="6" orient="auto" markerUnits="userSpaceOnUse">
    <path d="M1,6 L10,1 L19,6 L10,11 Z" fill="${COR.azul}"/></marker>
</defs>`;

export function documento(w, h, corpo) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" font-family="${FONTE}">
<rect x="0" y="0" width="${w}" height="${h}" fill="#FFFFFF"/>
${DEFS}
${corpo}
</svg>
`;
}

export function titulo(t, sub) {
  return texto(40, 44, t, { tam: 22, cor: COR.azul, peso: "bold", fonte: SERIFA }) +
    texto(40, 68, sub, { tam: 13, cor: COR.apagado, estilo: "italic" });
}

export const caminho = (pts) => pts.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ");
