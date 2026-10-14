// Diagrama de casos de uso — só o que o sistema real executa (apps/web com
// supabaseApi + RPCs + Edge Functions). Fica de fora o que existe só no banco
// sem tela (fn_verificar_registro, fn_encerrar_membro) ou só na demonstração
// (excluir estudante: no sistema real responde "ainda não disponível").
import { COR, caminho, documento, rotulo, texto, titulo } from "./svg.mjs";

const LARG = 2440;
const SIS = { x: 340, y: 230, w: 1760, h: 1480 };

const ATORES = {
  usuario: { x: 1220, y: 112, nome: ["Usuário"], abstrato: true },
  resp: { x: 160, y: 690, nome: ["Responsável", "legal"] },
  doc: { x: 160, y: 1090, nome: ["Docente", "regente"] },
  coord: { x: 2280, y: 640, nome: ["Coordenação", "pedagógica"] },
  prof: { x: 2280, y: 1060, nome: ["Profissional", "de saúde"] },
  tempo: { x: 2280, y: 1540, nome: ["Tempo", "(pg_cron, diário)"] },
};

// cx, cy, texto (linhas), interno = subfluxo sem ator direto
const CASOS = {
  entrar: { x: 580, y: 310, t: ["Entrar no sistema", "(e-mail e senha)"] },
  totp: { x: 580, y: 425, t: ["Confirmar segundo", "fator (TOTP)"], interno: true },
  convite: { x: 1240, y: 310, t: ["Aceitar convite,", "definir senha e termos"] },
  recuperar: { x: 1580, y: 310, t: ["Recuperar senha"] },
  notif: { x: 1900, y: 310, t: ["Consultar", "notificações"] },

  historico: { x: 1220, y: 430, t: ["Consultar histórico e", "trilha de acesso"] },
  vincular: { x: 1220, y: 520, t: ["Vincular pessoa", "ao estudante"] },
  encerrar: { x: 1220, y: 610, t: ["Encerrar vínculo"] },
  consent: { x: 1220, y: 700, t: ["Conceder ou revogar", "consentimento (escopos)"] },
  confirmar: { x: 1220, y: 790, t: ["Confirmar ou recusar", "profissional proposto"] },
  exportar: { x: 1220, y: 880, t: ["Exportar dados", "do estudante"] },
  observar: { x: 1220, y: 970, t: ["Registrar observação", "no ciclo"] },

  abrir: { x: 1220, y: 1080, t: ["Abrir ciclo de", "observação"] },
  fechar: { x: 790, y: 1190, t: ["Fechar ciclo de", "observação"] },
  calcular: { x: 1160, y: 1200, t: ["Calcular parâmetros", "(motor, RN03)"], interno: true },
  gerar: { x: 760, y: 1300, t: ["Gerar material", "adaptado"] },
  regras: { x: 1090, y: 1310, t: ["Aplicar camada", "determinística"], interno: true },
  ia: { x: 1130, y: 1440, t: ["Aplicar camada de IA", "(simplificação)"], interno: true },
  revisar: { x: 760, y: 1420, t: ["Revisar e aprovar", "ou descartar material"] },
  usar: { x: 640, y: 1530, t: ["Usar material aprovado", "(tela e impressão)"] },
  desfecho: { x: 510, y: 1640, t: ["Registrar desfecho", "da aplicação"] },

  cadastrar: { x: 1780, y: 720, t: ["Cadastrar estudante"] },
  convidar: { x: 1860, y: 810, t: ["Convidar pessoa", "(e-mail)"] },
  painel: { x: 1930, y: 900, t: ["Acompanhar painel", "da escola (contagens)"] },

  pendencias: { x: 1780, y: 1170, t: ["Consultar pendências", "de validação"] },
  validar: { x: 1860, y: 1270, t: ["Validar parâmetros do ciclo", "(aprovar ou pedir revisão)"] },
  nota: { x: 1930, y: 1370, t: ["Registrar e ler nota", "clínica reservada"] },

  expirar: { x: 1900, y: 1540, t: ["Expirar validações", "pendentes (7 dias)"] },
};

const RX = 158;
const RY = 36;

const ASSOC = [
  ["usuario", ["entrar", "convite", "recuperar", "notif"]],
  ["resp", ["historico", "vincular", "encerrar", "consent", "confirmar", "exportar", "observar"]],
  ["doc", ["observar", "fechar", "gerar", "revisar", "usar", "desfecho"]],
  ["coord", ["historico", "vincular", "encerrar", "cadastrar", "convidar", "painel"]],
  ["prof", ["observar", "pendencias", "validar", "nota"]],
  ["tempo", ["expirar"]],
];

// [de, para, tipo, condição]
const DEP = [
  ["totp", "entrar", "extend", "[saúde ou coordenação]"],
  ["calcular", "fechar", "include"],
  ["regras", "gerar", "include"],
  ["ia", "gerar", "extend", "[profissional ativo e IA habilitada]"],
  ["abrir", "observar", "extend", "[docente, sem ciclo aberto]"],
];

/** Ponto na borda da elipse na direção de (px, py). */
function borda(c, px, py) {
  const dx = px - c.x;
  const dy = py - c.y;
  const k = 1 / Math.sqrt((dx * dx) / (RX * RX) + (dy * dy) / (RY * RY));
  return [c.x + dx * k, c.y + dy * k];
}

function ator(a) {
  const { x, y } = a;
  const cor = COR.azul;
  let s = `<g stroke="${cor}" stroke-width="2.4" fill="none">
    <circle cx="${x}" cy="${y - 34}" r="15" fill="#FFFFFF"/>
    <line x1="${x}" y1="${y - 19}" x2="${x}" y2="${y + 16}"/>
    <line x1="${x - 24}" y1="${y - 6}" x2="${x + 24}" y2="${y - 6}"/>
    <line x1="${x}" y1="${y + 16}" x2="${x - 18}" y2="${y + 44}"/>
    <line x1="${x}" y1="${y + 16}" x2="${x + 18}" y2="${y + 44}"/></g>`;
  a.nome.forEach((n, i) => {
    s += texto(x, y + 66 + i * 17, n, { tam: 14, peso: "bold", estilo: a.abstrato ? "italic" : "normal", ancora: "middle", cor: COR.azul });
  });
  return s;
}

function caso(c) {
  let s = `<ellipse cx="${c.x}" cy="${c.y}" rx="${RX}" ry="${RY}" fill="${c.interno ? "#FFFFFF" : "#EEF3F6"}" stroke="${COR.azul}" stroke-width="1.8"${c.interno ? ' stroke-dasharray="0"' : ""}/>`;
  const y0 = c.y - (c.t.length - 1) * 8 + 5;
  c.t.forEach((l, i) => (s += texto(c.x, y0 + i * 16, l, { tam: 13, peso: "bold", ancora: "middle" })));
  return s;
}

function generalizacao(tronco, filhos, alvo) {
  // árvore: cada filho → tronco vertical → ponta com triângulo vazado no Usuário
  let s = "";
  const yTopo = alvo[1];
  for (const f of filhos) {
    s += `<path d="${caminho([[f.x + (tronco < f.x ? -30 : 30), f.y - 6], [tronco, f.y - 6]])}" fill="none" stroke="${COR.linha}" stroke-width="1.6"/>`;
  }
  const yMax = Math.max(...filhos.map((f) => f.y - 6));
  s += `<path d="${caminho([[tronco, yMax], [tronco, yTopo], [alvo[0], yTopo]])}" fill="none" stroke="${COR.linha}" stroke-width="1.6" marker-end="url(#trianguloVazado)"/>`;
  return s;
}

export function diagramaCasosDeUso() {
  let s = titulo("DIAGRAMA DE CASOS DE USO — PEI VIVO",
    "Funcionalidades do sistema implementado (apps/web + supabaseApi, RPCs e Edge Functions), por perfil. Atores concretos especializam o ator abstrato Usuário.");
  s += `<rect x="${SIS.x}" y="${SIS.y}" width="${SIS.w}" height="${SIS.h}" rx="10" fill="${COR.fundoSistema}" stroke="${COR.azul}" stroke-width="2.4"/>`;
  s += texto(SIS.x + 22, SIS.y + 30, "PEI Vivo", { tam: 17, peso: "bold", cor: COR.azul, ancora: "start", fonte: "Cambria, Georgia, serif" });

  // generalizações (ator concreto → Usuário)
  const u = ATORES.usuario;
  s += generalizacao(70, [ATORES.resp, ATORES.doc], [u.x - 28, u.y - 8]);
  s += generalizacao(LARG - 70, [ATORES.coord, ATORES.prof], [u.x + 28, u.y - 8]);

  // associações ator — caso
  for (const [a, lista] of ASSOC) {
    const at = ATORES[a];
    for (const id of lista) {
      const c = CASOS[id];
      const ori = a === "usuario" ? [at.x, at.y + 46] : [at.x + (c.x > at.x ? 28 : -28), at.y - 4];
      const p = borda(c, ori[0], ori[1]);
      s += `<line x1="${ori[0]}" y1="${ori[1]}" x2="${p[0]}" y2="${p[1]}" stroke="${COR.linha}" stroke-width="1.5"/>`;
    }
  }

  // include / extend: seta do caso de origem para o caso de destino
  for (const [de, para, tipo, cond] of DEP) {
    const a = CASOS[de];
    const b = CASOS[para];
    const p1 = borda(a, b.x, b.y);
    const p2 = borda(b, a.x, a.y);
    const cor = tipo === "include" ? COR.verdeAzul : COR.laranja;
    const seta = tipo === "include" ? "setaAbertaVerde" : "setaAbertaLaranja";
    s += `<line x1="${p1[0]}" y1="${p1[1]}" x2="${p2[0]}" y2="${p2[1]}" stroke="${cor}" stroke-width="1.8" stroke-dasharray="7 5" marker-end="url(#${seta})"/>`;
    const mx = (p1[0] + p2[0]) / 2;
    const my = (p1[1] + p2[1]) / 2;
    const vertical = Math.abs(p2[0] - p1[0]) < 30;
    const lx = vertical ? mx + 12 : mx;
    const ancora = vertical ? "start" : "middle";
    s += rotulo(lx, my - (cond ? 4 : -4), `«${tipo}»`, { cor, peso: "bold", ancora });
    if (cond) s += rotulo(lx, my + 13, cond, { cor: COR.apagado, tam: 10.5, ancora });
  }

  s += Object.values(CASOS).map(caso).join("\n");
  s += Object.values(ATORES).map(ator).join("\n");

  // legenda
  const yL = SIS.y + SIS.h + 40;
  let leg = `<rect x="40" y="${yL}" width="${LARG - 80}" height="112" rx="6" fill="${COR.fundoLegenda}" stroke="${COR.divisor}"/>`;
  leg += texto(58, yL + 26, "LEGENDA", { tam: 13, cor: COR.verdeAzul, peso: "bold" });
  leg += `<line x1="58" y1="${yL + 52}" x2="128" y2="${yL + 52}" stroke="${COR.linha}" stroke-width="1.6"/>` + texto(140, yL + 56, "Associação ator — caso de uso", { tam: 12 });
  leg += `<line x1="400" y1="${yL + 52}" x2="470" y2="${yL + 52}" stroke="${COR.linha}" stroke-width="1.6" marker-end="url(#trianguloVazado)"/>` + texto(482, yL + 56, "Generalização (o ator concreto é um Usuário)", { tam: 12 });
  leg += `<line x1="820" y1="${yL + 52}" x2="890" y2="${yL + 52}" stroke="${COR.verdeAzul}" stroke-width="1.8" stroke-dasharray="7 5" marker-end="url(#setaAbertaVerde)"/>` + texto(902, yL + 56, "«include» — sempre executado pelo caso de origem", { tam: 12 });
  leg += `<line x1="1250" y1="${yL + 52}" x2="1320" y2="${yL + 52}" stroke="${COR.laranja}" stroke-width="1.8" stroke-dasharray="7 5" marker-end="url(#setaAbertaLaranja)"/>` + texto(1332, yL + 56, "«extend» — a seta sai da extensão e aponta para o caso base [condição]", { tam: 12 });
  leg += texto(58, yL + 84, "Elipse branca = subfluxo interno, não iniciado diretamente por um ator. Toda permissão é decidida no banco (RLS e RPCs): o diagrama mostra quem PODE iniciar cada caso; o consentimento ativo (RN01/RN08) é pré-condição dos casos de observação, ciclo e material.", { tam: 11.5, cor: COR.apagado, estilo: "italic" });
  leg += texto(58, yL + 101, "Fora do diagrama por não existirem no sistema real: excluir dados do estudante (pendente de Edge Function), verificar registro no conselho e encerrar membro da escola (só no banco, sem tela).", { tam: 11.5, cor: COR.apagado, estilo: "italic" });

  return documento(LARG, yL + 112 + 40, s + leg);
}
