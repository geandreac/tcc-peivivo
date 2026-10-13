// Diagrama de sequência "gerar e aprovar material" — mesma ordem de
// packages/funcoes/src/gerarMaterial.ts (Edge Function gerar-material) e de
// apps/web/src/services/supabaseApi.ts (gerarMaterial, obterMaterial, aprovarMaterial).
import { COR, MONO, documento, rotulo, texto, titulo } from "./svg.mjs";

const LARG = 2120;
const P = {
  doc: { x: 120, nome: ["Docente"], ator: true },
  app: { x: 480, nome: ["App web", "(React + supabaseApi)"] },
  ef: { x: 890, nome: ["Edge Function", "gerar-material"] },
  motor: { x: 1230, nome: ["Motor determinístico", "(motor-adaptacao)"] },
  ia: { x: 1560, nome: ["Provedor de IA", "(opcional)"] },
  db: { x: 1930, nome: ["PostgreSQL — Supabase", "(RLS + RPCs)"] },
};
const Y0 = 210; // primeira mensagem
const PASSO = 46;

// Passos: m = mensagem, r = retorno, s = auto-mensagem, ini/senao/fim = fragmento combinado
const PASSOS = [
  { m: ["doc", "app"], t: ["informa título e texto e escolhe o estudante"] },
  { m: ["app", "ef"], t: ["POST /functions/v1/gerar-material", "{estudanteId, titulo, texto} + JWT do docente"] },
  { s: "ef", t: ["valida o corpo (Zod: texto de 1 a 20 000 caracteres)", "inválido → 400 VALIDACAO"] },
  { m: ["ef", "db"], t: ["rpc fn_preparar_geracao(p_estudante) — com o JWT do docente"] },
  { s: "db", t: ["DOCENTE com vínculo ATIVO? escopo geracao_material ATIVO (RN01/RN08)?", "existe VersaoPerfil VIGENTE (RN05)?"] },
  { ini: "alt", guarda: "[negado ou sem versão vigente]", de: "doc", ate: "db" },
  { r: ["db", "ef"], t: ["erro 42501 (negado) ou PT409 (sem versão vigente)"], erro: true },
  { r: ["ef", "app"], t: ["403 NEGADO ou 409 CONFLITO"], erro: true },
  { r: ["app", "doc"], t: ["mensagem simples", "(ex.: \"A família não autorizou\")"], erro: true },
  { senao: "[permitido]" },
  { r: ["db", "ef"], t: ["{docenteId, versaoId, parametros, iaPermitida, revisaoEmAndamento}"] },
  { fim: true },
  { ini: "opt", guarda: "[iaPermitida (profissional ativo + escopo validacao_clinica, RN06) e IA_HABILITADA]", de: "app", ate: "ia" },
  { m: ["ef", "ia"], t: ["simplificar(texto, parametros) — com tempo-limite"] },
  { r: ["ia", "ef"], t: ["textoSimplificado + glossário", "(falha ou tempo esgotado → aviso; segue só com as regras)"] },
  { fim: true },
  { m: ["ef", "motor"], t: ["adaptar(textoBase, parametros)"] },
  { r: ["motor", "ef"], t: ["TextoAdaptado (blocos, enunciados, apoios de leitura)"] },
  { s: "ef", t: ["hash SHA-256 do texto original"] },
  { m: ["ef", "db"], t: ["rpc fn_registrar_material(docenteId do banco, versaoId, TextoAdaptado, hash, iaAplicada) — service role"] },
  { s: "db", t: ["revalida vínculo, escopo, versão ainda VIGENTE e IA permitida;", "mesmo texto e versão → devolve o rascunho existente; senão insere RASCUNHO"] },
  { r: ["db", "ef"], t: ["{materialId, emCache}"] },
  { r: ["ef", "app"], t: ["200 {materialId, emCache, origem, avisos, duracaoMs}"] },
  { m: ["app", "db"], t: ["select materiais_adaptados where id = materialId — RLS: rascunho só para o docente autor"] },
  { r: ["db", "app"], t: ["material (RASCUNHO)"] },
  { r: ["app", "doc"], t: ["revisão lado a lado (original × adaptado)"] },
  { m: ["doc", "app"], t: ["aprova (com texto revisado opcional) ou descarta"] },
  { m: ["app", "db"], t: ["rpc fn_decidir_material(p_material, APROVAR | DESCARTAR, p_texto_revisado) — JWT do docente"] },
  { s: "db", t: ["só o docente autor; só RASCUNHO; APROVAR exige geracao_material ATIVO (RN04/RN08);", "gatilho grava MATERIAL_APROVADO/DESCARTADO na auditoria"] },
  { ini: "alt", guarda: "[família revogou o consentimento depois da geração]", de: "doc", ate: "db" },
  { r: ["db", "app"], t: ["erro 42501"], erro: true },
  { r: ["app", "doc"], t: ["\"A família retirou a autorização;", "este rascunho não pode ser usado\""], erro: true },
  { senao: "[decisão aceita]" },
  { r: ["db", "app"], t: ["ok — status APROVADO ou DESCARTADO"] },
  { r: ["app", "doc"], t: ["material aprovado (tela e versão para impressão)"] },
  { fim: true },
];

function cabeca(p, y) {
  if (p.ator) {
    return `<g stroke="${COR.azul}" stroke-width="2.4" fill="none">
      <circle cx="${p.x}" cy="${y + 14}" r="14" fill="#FFFFFF"/>
      <line x1="${p.x}" y1="${y + 28}" x2="${p.x}" y2="${y + 62}"/>
      <line x1="${p.x - 22}" y1="${y + 40}" x2="${p.x + 22}" y2="${y + 40}"/>
      <line x1="${p.x}" y1="${y + 62}" x2="${p.x - 17}" y2="${y + 88}"/>
      <line x1="${p.x}" y1="${y + 62}" x2="${p.x + 17}" y2="${y + 88}"/></g>` +
      texto(p.x, y + 110, p.nome[0], { tam: 14, peso: "bold", cor: COR.azul, ancora: "middle" });
  }
  const w = 250;
  let s = `<rect x="${p.x - w / 2}" y="${y + 20}" width="${w}" height="64" rx="5" fill="${COR.azul}"/>`;
  p.nome.forEach((n, i) => (s += texto(p.x, y + 46 + i * 19, n, { tam: i ? 12.5 : 14, cor: "#FFFFFF", peso: i ? "normal" : "bold", ancora: "middle" })));
  return s;
}

export function diagramaSequencia() {
  let corpo = "";
  let frag = "";
  let fragTopo = "";
  const ys = [];
  const autos = [];
  const pilha = [];
  let y = Y0;


  let n = 0;
  for (const p of PASSOS) {
    if (p.ini) {
      y += 14;
      const x1 = P[p.de].x - 70;
      const x2 = P[p.ate].x + 150;
      pilha.push({ tipo: p.ini, guarda: p.guarda, x1, x2, y0: y, senoes: [] });
      y += 40;
      continue;
    }
    if (p.senao) {
      const f = pilha[pilha.length - 1];
      y += 4;
      f.senoes.push({ y, guarda: p.senao });
      y += 34;
      continue;
    }
    if (p.fim) {
      const f = pilha.pop();
      y += 2;
      frag += `<rect x="${f.x1}" y="${f.y0}" width="${f.x2 - f.x1}" height="${y - f.y0}" rx="3" fill="none" stroke="${COR.verdeAzul}" stroke-width="1.8"/>`;
      fragTopo += `<path d="M${f.x1},${f.y0} h52 v16 l-8,8 h-44 Z" fill="${COR.verdeAzul}"/>`;
      fragTopo += texto(f.x1 + 8, f.y0 + 17, f.tipo, { tam: 13, peso: "bold", cor: "#FFFFFF", fonte: MONO });
      fragTopo += rotulo(f.x1 + 62, f.y0 + 17, f.guarda, { tam: 12, cor: COR.verdeAzul, estilo: "italic", peso: "bold", ancora: "start" });
      for (const sn of f.senoes) {
        frag += `<line x1="${f.x1}" y1="${sn.y}" x2="${f.x2}" y2="${sn.y}" stroke="${COR.verdeAzul}" stroke-width="1.4" stroke-dasharray="8 5"/>`;
        fragTopo += rotulo(f.x1 + 12, sn.y + 18, sn.guarda, { tam: 12, cor: COR.verdeAzul, estilo: "italic", peso: "bold", ancora: "start" });
      }
      y += 34;
      continue;
    }

    n += 1;
    const extra = (p.t.length - 1) * 16;
    if (p.s) {
      const x = P[p.s].x;
      const yy = y + extra;
      const esq = x > LARG - 420;
      const d = esq ? -1 : 1;
      corpo += `<path d="M${x + d * 7},${yy - 10} h${d * 42} v22 h${-d * 38}" fill="none" stroke="${COR.azul}" stroke-width="1.6" marker-end="url(#setaCheia)"/>`;
      p.t.forEach((l, i) => {
        corpo += rotulo(x + d * 58, yy - 4 - extra + i * 16, i === 0 ? `${n}. ${l}` : l, { tam: 12.5, cor: COR.texto, estilo: "normal", peso: i === 0 ? "bold" : "normal", ancora: esq ? "end" : "start" });
      });
      autos.push([p.s, yy - 14, yy + 16]);
      ys[n] = yy;
      y += PASSO + extra;
      continue;
    }
    const [a, b] = p.m ?? p.r;
    const xa = P[a].x;
    const xb = P[b].x;
    const yy = y + extra;
    const ret = Boolean(p.r);
    const cor = p.erro ? COR.vermelho : COR.azul;
    const dir = Math.sign(xb - xa);
    const x1 = xa + dir * 7;
    const x2 = xb - dir * 7;
    corpo += `<line x1="${x1}" y1="${yy}" x2="${x2}" y2="${yy}" stroke="${cor}" stroke-width="1.6"${ret ? ' stroke-dasharray="7 5"' : ""} marker-end="url(#${ret ? "setaAberta" : p.erro ? "setaCheiaVermelha" : "setaCheia"})"/>`;
    const mx = (xa + xb) / 2;
    p.t.forEach((l, i) => {
      const linha = i === 0 ? `${n}. ${l}` : l;
      corpo += rotulo(mx, yy - 8 - (p.t.length - 1 - i) * 16, linha, { tam: 12.5, cor: p.erro ? COR.vermelho : COR.texto, estilo: "normal", peso: i === 0 ? "bold" : "normal" });
    });
    ys[n] = yy;
    y += PASSO + extra;
  }
  const yFim = y + 20;

  // ativações (nº da mensagem que abre → nº da que fecha)
  const ATIVACOES = { app: [[1, 28]], ef: [[2, 18]], db: [[4, 9], [15, 17], [19, 20], [23, 27]], motor: [[12, 13]], ia: [[10, 11]] };
  let ativs = "";
  for (const [id, lista] of Object.entries(ATIVACOES)) {
    for (const [a1, a2] of lista) {
      ativs += `<rect x="${P[id].x - 7}" y="${ys[a1] - 4}" width="14" height="${ys[a2] - ys[a1] + 8}" fill="#DCE8F0" stroke="${COR.azul}" stroke-width="1.2"/>`;
    }
  }
  for (const [id, a1, a2] of autos) {
    ativs += `<rect x="${P[id].x - 1}" y="${a1}" width="14" height="${a2 - a1}" fill="#C4D7E4" stroke="${COR.azul}" stroke-width="1.2"/>`;
  }
  const vidas = Object.values(P)
    .map((p) => `<line x1="${p.x}" y1="${Y0 - 60}" x2="${p.x}" y2="${yFim}" stroke="${COR.linha}" stroke-width="1.3" stroke-dasharray="6 6"/>`)
    .join("");

  let s = titulo("DIAGRAMA DE SEQUÊNCIA — GERAR E APROVAR MATERIAL ADAPTADO",
    "Fluxo implementado: packages/funcoes/src/gerarMaterial.ts (Edge Function gerar-material) e apps/web/src/services/supabaseApi.ts. As regras de negócio são decididas no banco.");
  s += Object.values(P).map((p) => cabeca(p, 80)).join("");
  s += vidas + frag + corpo + ativs + fragTopo;

  const yL = yFim + 24;
  let leg = `<rect x="40" y="${yL}" width="${LARG - 80}" height="96" rx="6" fill="${COR.fundoLegenda}" stroke="${COR.divisor}"/>`;
  leg += texto(58, yL + 26, "LEGENDA", { tam: 13, cor: COR.verdeAzul, peso: "bold" });
  leg += `<line x1="58" y1="${yL + 52}" x2="128" y2="${yL + 52}" stroke="${COR.azul}" stroke-width="1.6" marker-end="url(#setaCheia)"/>` + texto(140, yL + 56, "Chamada", { tam: 12 });
  leg += `<line x1="250" y1="${yL + 52}" x2="320" y2="${yL + 52}" stroke="${COR.azul}" stroke-width="1.6" stroke-dasharray="7 5" marker-end="url(#setaAberta)"/>` + texto(332, yL + 56, "Retorno", { tam: 12 });
  leg += `<line x1="440" y1="${yL + 52}" x2="510" y2="${yL + 52}" stroke="${COR.vermelho}" stroke-width="1.6" stroke-dasharray="7 5" marker-end="url(#setaAberta)"/>` + texto(522, yL + 56, "Retorno de erro (negação pelo banco)", { tam: 12 });
  leg += texto(830, yL + 56, "alt = caminhos alternativos · opt = trecho opcional · numeração = ordem de execução", { tam: 12 });
  leg += texto(58, yL + 82, "service role = a Edge Function grava com a chave de serviço, mas fn_registrar_material confere tudo de novo; o docenteId vem do banco (auth.uid()), nunca do corpo da requisição. Aprovar é um passo separado, direto ao banco (RN04).", { tam: 11.5, cor: COR.apagado, estilo: "italic" });

  return documento(LARG, yL + 96 + 30, s + leg);
}
