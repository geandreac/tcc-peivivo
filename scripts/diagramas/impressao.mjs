// Versões dos diagramas para o artigo impresso (A4, 16 cm de largura útil).
// O diagrama completo (classes.mjs, casos-de-uso.mjs) continua sendo gerado
// para o repositório; aqui ele é repartido por domínio (classes) e por perfil
// (casos de uso), sem título interno (a identificação fica acima da figura,
// no texto) e com letra que continua legível no papel. Os painéis de tipos
// enumerados e de operações viram quadros no próprio texto do artigo.
import { COR, caminho, documento, rotulo, texto } from "./svg.mjs";
import { CLASSES, altura, associacao, desenharClasse } from "./classes.mjs";

// ───────────────────────── classes ─────────────────────────
const WC = 356; // largura de cada classe (cabe a linha mais longa, ~50 caracteres)
const GAP = 84; // vão entre as duas colunas (multiplicidades, nomes e um canal)
// margens laterais: só a Figura 1 usa canais pelas bordas
const VG = 60; // espaço vertical entre classes
const TOPO = 16;

const classe = (id) => ({ ...CLASSES.find((c) => c.id === id), w: WC });
const resumo = (id, figura) => ({ id, nome: CLASSES.find((c) => c.id === id).nome, resumo: figura, w: WC, h: 46 });

function desenharResumo(c) {
  return `<rect x="${c.x}" y="${c.y}" width="${WC}" height="${c.h}" rx="4" fill="#FFFFFF" stroke="${COR.azul}" stroke-width="1.8" stroke-dasharray="7 4"/>` +
    texto(c.x + WC / 2, c.y + 21, c.nome, { tam: 16, cor: COR.azul, peso: "bold", ancora: "middle" }) +
    texto(c.x + WC / 2, c.y + 38, `(atributos na ${c.resumo})`, { tam: 11.5, cor: COR.apagado, estilo: "italic", ancora: "middle" });
}

/** Posiciona as classes em duas colunas, de cima para baixo. */
function montar(colunas, { esq = 20, dir: margemDir = 20 } = {}) {
  const mapa = {};
  let fundo = 0;
  colunas.forEach((lista, k) => {
    let y = TOPO;
    for (const c of lista) {
      c.x = esq + k * (WC + GAP);
      c.y = y;
      c.h ??= altura(c);
      if (!c.resumo) c.h = altura(c);
      mapa[c.id] = c;
      y += c.h + VG;
    }
    fundo = Math.max(fundo, y - VG);
  });
  return { mapa, largura: esq + WC * 2 + GAP + margemDir, alturaTotal: fundo + TOPO };
}

const dir = (c) => c.x + WC;
const baixo = (c) => c.y + c.h;
const meioX = (c) => c.x + WC / 2;

/** Nome de associação: horizontal (abaixo do traço) ou vertical (ao lado de um canal). */
function nome(x, y, s, vertical = false) {
  if (!vertical) return rotulo(x, y, s);
  return `<g transform="rotate(-90 ${x} ${y})">${rotulo(x, y, s)}</g>`;
}

// associação horizontal entre colunas vizinhas
function horizontal(a, b, y, { ini, fim, rot, comp }) {
  const [p, q] = a.x < b.x ? [dir(a), b.x] : [a.x, dir(b)];
  return associacao([[p, y], [q, y]], { ini, fim, composicaoNoInicio: comp }) + nome((p + q) / 2, y + 20, rot);
}

// associação vertical entre classes vizinhas da mesma coluna
function vertical(a, b, { ini, fim, rot, comp, dx = 0 }) {
  // multiplicidades à esquerda do traço, nome à direita: nada se sobrepõe no vão curto
  const x = meioX(a) + dx;
  const m = { tam: 12, cor: COR.azul, peso: "bold", ancora: "end" };
  return associacao([[x, baixo(a)], [x, b.y]], { composicaoNoInicio: comp }) +
    texto(x - 8, baixo(a) + (comp ? 34 : 16), ini, m) + texto(x - 8, b.y - 6, fim, m) +
    rotulo(x + 12, (baixo(a) + b.y) / 2 + 5, rot, { ancora: "start" });
}

// associação por um canal vertical (margem ou vão entre colunas), com nome girado
function canal(a, ya, b, yb, xc, { ini, fim, rot, ladoA = "esq", ladoB = "esq" }) {
  const xa = ladoA === "esq" ? a.x : dir(a);
  const xb = ladoB === "esq" ? b.x : dir(b);
  return associacao([[xa, ya], [xc, ya], [xc, yb], [xb, yb]], { ini, fim }) +
    nome(xc - 9, (ya + yb) / 2, rot, true);
}

function figuraClasses(colunas, ligar, margens) {
  const { mapa, largura, alturaTotal } = montar(colunas, margens);
  const linhas = ligar(mapa);
  const caixas = Object.values(mapa).map((c) => (c.resumo ? desenharResumo(c) : desenharClasse(c, WC))).join("\n");
  return documento(largura, alturaTotal, linhas + caixas);
}

/** Figura 1 — escola, pessoas, convites e vínculos. */
export function classesPessoas() {
  return figuraClasses(
    [[classe("escola"), classe("membro"), resumo("estudante", "Figura 2"), classe("convite")],
      [classe("usuario"), classe("vinculo"), classe("notificacao")]],
    (m) => {
      const { escola: esc, membro: mem, estudante: est, convite: con, usuario: usu, vinculo: vin, notificacao: not } = m;
      return [
        vertical(esc, mem, { ini: "1", fim: "0..*", rot: "tem membros" }),
        horizontal(mem, usu, mem.y + 44, { ini: "0..*", fim: "1", rot: "é" }),
        vertical(usu, vin, { ini: "1", fim: "0..*", rot: "participa de" }),
        horizontal(vin, est, est.y + 23, { ini: "0..*", fim: "1", rot: "vincula" }),
        canal(esc, esc.y + 30, est, est.y + 23, esc.x - 40, { ini: "1", fim: "0..*", rot: "matricula" }),
        canal(esc, esc.y + 70, con, con.y + 40, esc.x - 64, { ini: "1", fim: "0..*", rot: "emite" }),
        canal(usu, usu.y + 60, not, not.y + 40, dir(usu) + 40, { ini: "1", fim: "0..*", rot: "recebe", ladoA: "dir", ladoB: "dir" }),
      ].join("\n");
    }, { esq: 82, dir: 54 });
}

/** Figura 2 — estudante, consentimento, nota clínica e auditoria. */
export function classesEstudante() {
  return figuraClasses(
    [[resumo("escola", "Figura 1"), classe("consentimento"), classe("auditoria")],
      [classe("estudante"), classe("nota")]],
    (m) => {
      const { escola: esc, consentimento: cons, estudante: est, nota } = m;
      return [
        horizontal(esc, est, esc.y + 23, { ini: "1", fim: "0..*", rot: "matricula" }),
        horizontal(cons, est, cons.y + 60, { ini: "0..*", fim: "1", rot: "autoriza" }),
        vertical(est, nota, { ini: "1", fim: "0..*", rot: "tem notas reservadas" }),
      ].join("\n");
    });
}

/** Figura 3 — ciclo de observação, versão do perfil e material. */
export function classesCiclo() {
  return figuraClasses(
    [[resumo("estudante", "Figura 2"), classe("ciclo"), classe("observacao"), classe("desfecho")],
      [classe("versao"), classe("parametros"), classe("material"), classe("textoAdaptado")]],
    (m) => {
      const { estudante: est, ciclo: cic, observacao: obs, desfecho: des, versao: ver, parametros: par, material: mat, textoAdaptado: txt } = m;
      return [
        vertical(est, cic, { ini: "1", fim: "0..*", rot: "é acompanhado em" }),
        horizontal(est, ver, est.y + 23, { ini: "1", fim: "0..*", rot: "tem versões" }),
        vertical(cic, obs, { ini: "1", fim: "0..*", rot: "contém", comp: true }),
        horizontal(cic, ver, cic.y + 60, { ini: "0..1", fim: "0..*", rot: "origina" }),
        vertical(ver, par, { ini: "1", fim: "1", rot: "define", comp: true }),
        canal(ver, baixo(ver) - 26, mat, mat.y + 26, ver.x - 30, { ini: "1", fim: "0..*", rot: "parametriza (snapshot)" }),
        horizontal(mat, des, des.y + 44, { ini: "1", fim: "0..1", rot: "resulta em", comp: true }),
        vertical(mat, txt, { ini: "1", fim: "0..1", rot: "texto adaptado", comp: true }),
      ].join("\n");
    });
}

// ───────────────────────── casos de uso ─────────────────────────
const RX = 138;
const RY = 40;
const T_CASO = 15;

function borda(c, px, py) {
  const dx = px - c.x;
  const dy = py - c.y;
  const k = 1 / Math.sqrt((dx * dx) / (RX * RX) + (dy * dy) / (RY * RY));
  return [c.x + dx * k, c.y + dy * k];
}

function ator(a) {
  const { x, y } = a;
  let s = `<g stroke="${COR.azul}" stroke-width="2.6" fill="none">
    <circle cx="${x}" cy="${y - 36}" r="16" fill="#FFFFFF"/>
    <line x1="${x}" y1="${y - 20}" x2="${x}" y2="${y + 18}"/>
    <line x1="${x - 26}" y1="${y - 6}" x2="${x + 26}" y2="${y - 6}"/>
    <line x1="${x}" y1="${y + 18}" x2="${x - 20}" y2="${y + 48}"/>
    <line x1="${x}" y1="${y + 18}" x2="${x + 20}" y2="${y + 48}"/></g>`;
  a.nome.forEach((n, i) => {
    s += texto(x, y + 72 + i * 18, n, { tam: 15, peso: "bold", estilo: a.abstrato ? "italic" : "normal", ancora: "middle", cor: COR.azul });
  });
  return s;
}

function caso(c) {
  let s = `<ellipse cx="${c.x}" cy="${c.y}" rx="${RX}" ry="${RY}" fill="${c.interno ? "#FFFFFF" : "#EEF3F6"}" stroke="${COR.azul}" stroke-width="2"/>`;
  const y0 = c.y - (c.t.length - 1) * 9 + 5;
  c.t.forEach((l, i) => (s += texto(c.x, y0 + i * 18, l, { tam: T_CASO, peso: "bold", ancora: "middle" })));
  return s;
}

/** «include»/«extend»: seta da origem para o destino, rótulos ao lado (vertical) ou no meio. */
function dependencia(a, b, tipo, cond = []) {
  const p1 = borda(a, b.x, b.y);
  const p2 = borda(b, a.x, a.y);
  const cor = tipo === "include" ? COR.verdeAzul : COR.laranja;
  const seta = tipo === "include" ? "setaAbertaVerde" : "setaAbertaLaranja";
  let s = `<line x1="${p1[0]}" y1="${p1[1]}" x2="${p2[0]}" y2="${p2[1]}" stroke="${cor}" stroke-width="2" stroke-dasharray="8 5" marker-end="url(#${seta})"/>`;
  const vertical = Math.abs(p2[0] - p1[0]) < 30;
  const mx = vertical ? (p1[0] + p2[0]) / 2 + 14 : (p1[0] + p2[0]) / 2;
  const my = (p1[1] + p2[1]) / 2 - (cond.length * 15) / 2;
  const ancora = vertical ? "start" : "middle";
  s += rotulo(mx, my, `«${tipo}»`, { cor, peso: "bold", tam: 13, ancora });
  cond.forEach((l, i) => (s += rotulo(mx, my + 16 + i * 15, l, { cor: COR.apagado, tam: 12, ancora })));
  return s;
}

/** Monta a figura; a fronteira do sistema e o tamanho saem das posições dos casos. */
function figuraCasos({ atores, casos, assoc = [], deps = [], extra = "", fundoExtra = 0 }) {
  const cs = Object.values(casos);
  const as = Object.values(atores);
  const sistema = { x: Math.min(...cs.map((c) => c.x)) - RX - 24, y: Math.min(...cs.map((c) => c.y)) - RY - 44 };
  sistema.w = Math.max(...cs.map((c) => c.x)) + RX + 22 - sistema.x;
  sistema.h = Math.max(...cs.map((c) => c.y)) + RY + 24 - sistema.y;
  const largura = Math.ceil(sistema.x + sistema.w + 16);
  const topo = Math.min(sistema.y, ...as.map((a) => a.y - 56)) - 16; // desloca tudo para caber a partir de y = 0
  const alturaTotal = Math.ceil(Math.max(sistema.y + sistema.h, ...as.map((a) => a.y + 72 + a.nome.length * 18), fundoExtra) + 16 - topo);
  let s = `<rect x="${sistema.x}" y="${sistema.y}" width="${sistema.w}" height="${sistema.h}" rx="10" fill="${COR.fundoSistema}" stroke="${COR.azul}" stroke-width="2.4"/>`;
  s += texto(sistema.x + 16, sistema.y + 26, "PEI Vivo", { tam: 17, peso: "bold", cor: COR.azul, fonte: "Cambria, Georgia, serif" });
  s += extra;
  for (const [a, id] of assoc) {
    const at = atores[a];
    const c = casos[id];
    const ori = [at.x + 30, at.y - 4];
    const p = borda(c, ori[0], ori[1]);
    s += `<line x1="${ori[0]}" y1="${ori[1]}" x2="${p[0]}" y2="${p[1]}" stroke="${COR.linha}" stroke-width="1.7"/>`;
  }
  for (const [de, para, tipo, cond] of deps) s += dependencia(casos[de], casos[para], tipo, cond);
  s += Object.values(casos).map(caso).join("\n");
  s += Object.values(atores).map(ator).join("\n");
  return documento(largura, alturaTotal, `<g transform="translate(0 ${-topo})">${s}</g>`);
}

/** Casos em arco ao redor do ator: nenhuma linha de associação atravessa outra elipse. */
function arco(at, raio, passo, ids) {
  const meio = (ids.length - 1) / 2;
  return Object.fromEntries(ids.map((id, i) => {
    const dy = (i - meio) * passo;
    return [id, { x: at.x + Math.sqrt(raio * raio - dy * dy), y: at.y + dy, t: T[id] }];
  }));
}

const T = {
  entrar: ["Entrar no sistema", "(e-mail e senha)"],
  totp: ["Confirmar segundo", "fator (TOTP)"],
  convite: ["Aceitar convite,", "definir senha e termos"],
  recuperar: ["Recuperar senha"],
  notif: ["Consultar", "notificações"],
  historico: ["Consultar histórico", "e trilha de acesso"],
  vincular: ["Vincular pessoa", "ao estudante"],
  encerrar: ["Encerrar vínculo"],
  consent: ["Conceder ou revogar", "consentimento"],
  confirmar: ["Confirmar ou recusar", "profissional proposto"],
  exportar: ["Exportar dados", "do estudante"],
  observar: ["Registrar observação", "no ciclo"],
  abrir: ["Abrir ciclo de", "observação"],
  fechar: ["Fechar ciclo de", "observação"],
  calcular: ["Calcular parâmetros", "(motor, RN03)"],
  gerar: ["Gerar material", "adaptado"],
  regras: ["Aplicar camada", "determinística"],
  ia: ["Aplicar camada de IA", "(simplificação)"],
  revisar: ["Revisar e aprovar", "ou descartar material"],
  usar: ["Usar material aprovado", "(tela e impressão)"],
  desfecho: ["Registrar desfecho", "da aplicação"],
  cadastrar: ["Cadastrar estudante"],
  convidar: ["Convidar pessoa", "(e-mail)"],
  painel: ["Acompanhar painel", "da escola (contagens)"],
  pendencias: ["Consultar pendências", "de validação"],
  validar: ["Validar parâmetros", "do ciclo"],
  nota: ["Registrar e ler nota", "clínica reservada"],
  expirar: ["Expirar validações", "pendentes (7 dias)"],
};

/** Figura 4 — ator abstrato Usuário: casos comuns e generalização dos quatro perfis. */
export function casosUsuario() {
  const usuario = { x: 130, y: 250, nome: ["Usuário"], abstrato: true };
  const casos = arco(usuario, 350, 132, ["entrar", "convite", "recuperar", "notif"]);
  casos.totp = { x: casos.entrar.x + 2 * RX + 70, y: casos.entrar.y + 70, t: T.totp, interno: true };
  // perfis concretos numa fileira abaixo; generalização em árvore até o Usuário
  const yPerfis = 720;
  const perfis = {
    resp: { x: 130, y: yPerfis, nome: ["Responsável", "legal"] },
    doc: { x: 330, y: yPerfis, nome: ["Docente", "regente"] },
    coord: { x: 530, y: yPerfis, nome: ["Coordenação", "pedagógica"] },
    prof: { x: 730, y: yPerfis, nome: ["Profissional", "de saúde"] },
  };
  const yBarra = yPerfis - 90;
  const linha = (pts, fim = "") => `<path d="${caminho(pts)}" fill="none" stroke="${COR.linha}" stroke-width="1.7"${fim}/>`;
  let ger = Object.values(perfis).map((p) => linha([[p.x, p.y - 54], [p.x, yBarra]])).join("");
  ger += linha([[perfis.resp.x, yBarra], [perfis.prof.x, yBarra]]);
  ger += linha([[usuario.x, yBarra], [usuario.x, usuario.y + 108]], ' marker-end="url(#trianguloVazado)"');
  return figuraCasos({
    atores: { usuario, ...perfis }, casos, extra: ger,
    assoc: ["entrar", "convite", "recuperar", "notif"].map((c) => ["usuario", c]),
    deps: [["totp", "entrar", "extend", ["[saúde ou", "coordenação]"]]],
  });
}

/** Figura 5 — responsável legal. */
export function casosResponsavel() {
  const resp = { x: 110, y: 380, nome: ["Responsável", "legal"] };
  const ids = ["historico", "vincular", "encerrar", "consent", "confirmar", "exportar", "observar"];
  return figuraCasos({ atores: { resp }, casos: arco(resp, 410, 100, ids), assoc: ids.map((c) => ["resp", c]) });
}

/** Figura 6 — docente regente, com os subfluxos internos do ciclo e da geração (página deitada). */
export function casosDocente() {
  const doc = { x: 100, y: 360, nome: ["Docente", "regente"] };
  const ids = ["observar", "fechar", "gerar", "revisar", "usar", "desfecho"];
  const casos = arco(doc, 410, 112, ids);
  const aDireita = (id, dy = 0) => ({ x: casos[id].x + 2 * RX + 190, y: casos[id].y + dy, interno: true });
  Object.assign(casos, {
    abrir: { ...aDireita("observar"), t: T.abrir },
    calcular: { ...aDireita("fechar"), t: T.calcular },
    regras: { ...aDireita("gerar", -20), t: T.regras },
    ia: { ...aDireita("gerar", 100), t: T.ia },
  });
  casos.ia.x = casos.regras.x;
  return figuraCasos({
    atores: { doc }, casos,
    assoc: ids.map((c) => ["doc", c]),
    deps: [
      ["abrir", "observar", "extend", ["[docente, sem", "ciclo aberto]"]],
      ["fechar", "calcular", "include"],
      ["gerar", "regras", "include"],
      ["ia", "gerar", "extend", ["[profissional ativo", "e IA habilitada]"]],
    ],
  });
}

/** Figura 7 — coordenação pedagógica. */
export function casosCoordenacao() {
  const coord = { x: 110, y: 330, nome: ["Coordenação", "pedagógica"] };
  const ids = ["historico", "vincular", "encerrar", "cadastrar", "convidar", "painel"];
  return figuraCasos({ atores: { coord }, casos: arco(coord, 400, 104, ids), assoc: ids.map((c) => ["coord", c]) });
}

/** Figura 8 — profissional de saúde e ator Tempo (expiração diária, RN05). */
export function casosSaude() {
  const prof = { x: 110, y: 220, nome: ["Profissional", "de saúde"] };
  const tempo = { x: 110, y: 560, nome: ["Tempo", "(pg_cron, diário)"] };
  const ids = ["observar", "pendencias", "validar", "nota"];
  const casos = arco(prof, 380, 104, ids);
  casos.expirar = { x: casos.pendencias.x, y: tempo.y, t: T.expirar };
  return figuraCasos({
    atores: { prof, tempo }, casos,
    assoc: [...ids.map((c) => ["prof", c]), ["tempo", "expirar"]],
  });
}

export const FIGURAS_IMPRESSAS = {
  "classes-1-pessoas": classesPessoas,
  "classes-2-estudante": classesEstudante,
  "classes-3-ciclo": classesCiclo,
  "casos-1-usuario": casosUsuario,
  "casos-2-responsavel": casosResponsavel,
  "casos-3-docente": casosDocente,
  "casos-4-coordenacao": casosCoordenacao,
  "casos-5-saude": casosSaude,
};
