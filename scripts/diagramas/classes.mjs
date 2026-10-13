// Diagrama de classes — espelho de supabase/migrations 0001–0008 e de
// packages/motor-adaptacao/src/tipos.ts. Ao mudar uma tabela, mude aqui.
import { COR, MONO, caminho, documento, rotulo, texto, titulo } from "./svg.mjs";

const W = 380;
const GAP_X = 100;
const LINHA = 19;
const col = (c) => 40 + c * (W + GAP_X);

const CLASSES = [
  { id: "escola", nome: "Escola", col: 0, lin: 0,
    attrs: ["- id: UUID", "- nome: string {único}", "- createdAt: DateTime"] },
  { id: "membro", nome: "MembroEscola", col: 1, lin: 0,
    attrs: ["- id: UUID", "- papel: PapelEscola", "- status: StatusMembro", "- createdAt: DateTime", "- encerradoEm: DateTime [0..1]"],
    ops: ["+ encerrar(): void"],
    rest: ["{um ATIVO por pessoa, escola e papel}"] },
  { id: "usuario", nome: "Usuario", col: 2, lin: 0,
    attrs: ["- id: UUID", "- authUserId: UUID [0..1]  «Supabase Auth»", "- nome: string", "- email: string {único}",
      "- termosVersao: string [0..1]", "- termosAceitosEm: DateTime [0..1]", "- createdAt: DateTime"],
    ops: ["+ aceitarTermos(versao: string): void", "+ meuPerfil(): Perfil"],
    rest: ["{senha e 2º fator ficam no Supabase Auth}"] },
  { id: "vinculo", nome: "VinculoUsuarioEstudante", col: 3, lin: 0,
    attrs: ["- id: UUID", "- papel: PapelUsuario {≠ COORDENACAO}", "- status: StatusVinculo", "- dataVinculo: DateTime",
      "- registroConselho: string [0..1]", "- verificacaoRegistro: VerificacaoRegistro [0..1]",
      "- propostoPor: Usuario [0..1]", "- confirmadoPor: Usuario [0..1]", "- confirmadoEm: DateTime [0..1]",
      "- conferidoPor: Usuario [0..1]", "- conferidoEm: DateTime [0..1]", "- verificadoPor: Usuario [0..1]",
      "- verificadoEm: DateTime [0..1]", "- encerradoPor: Usuario [0..1]", "- encerradoEm: DateTime [0..1]"],
    ops: ["+ propor(...): UUID", "+ confirmar(aceitar: boolean): void", "+ encerrar(): void", "+ verificarRegistro(): void"],
    rest: ["{um vínculo vigente por pessoa e estudante}", "{registroConselho só e sempre p/ PROFISSIONAL_SAUDE}"] },
  { id: "notificacao", nome: "Notificacao", col: 4, lin: 0,
    attrs: ["- id: UUID", "- tipo: TipoNotificacao", "- estudante: Estudante [0..1]", "- criadaEm: DateTime", "- lidaEm: DateTime [0..1]"],
    ops: ["+ marcarLida(): void"],
    rest: ["{conteúdo tipado, sem texto livre}"] },

  { id: "convite", nome: "Convite", col: 0, lin: 1,
    attrs: ["- id: UUID", "- email: string", "- papel: PapelUsuario", "- estudante: Estudante [0..1]", "- criadoPor: Usuario [0..1]",
      "- criadoEm: DateTime", "- expiraEm: DateTime  (+7 dias)", "- aceitoEm: DateTime [0..1]", "- revogadoEm: DateTime [0..1]"],
    ops: ["+ emitir(...): void"],
    rest: ["{estudante só e sempre p/ RESPONSAVEL}", "{um pendente por e-mail, escola e papel}"] },
  { id: "consentimento", nome: "Consentimento", col: 1, lin: 1,
    attrs: ["- id: UUID", "- responsavel: Usuario", "- escopos: EscopoConsentimento [1..*]", "- versaoTermo: string",
      "- status: StatusConsentimento", "- dataConcessao: DateTime", "- dataRevogacao: DateTime [0..1]",
      "- revogadoPor: Usuario [0..1]", "- userAgent: string [0..1]"],
    ops: ["+ conceder(escopos, versaoTermo): UUID", "+ revogar(): UUID"],
    rest: ["{no máximo um ATIVO por estudante}", "{nunca apagado; só revogado}"] },
  { id: "estudante", nome: "Estudante", col: 2, lin: 1,
    attrs: ["- id: UUID", "- nome: string", "- dataNascimento: Date", "- turma: string [0..1]",
      "- laudoApresentadoEm: Date [0..1]  (só a data)", "- createdAt: DateTime"],
    ops: ["+ cadastrar(...): UUID  «estático»"],
    rest: ["{nenhum laudo ou diagnóstico armazenado}"] },
  { id: "nota", nome: "NotaClinica", col: 4, lin: 1,
    attrs: ["- id: UUID", "- profissional: Usuario", "- conteudo: string", "- dataRegistro: DateTime"],
    ops: ["+ registrar(conteudo): UUID", "+ ler(): NotaClinica[*]  «auditada»"],
    rest: ["{só PROFISSIONAL_SAUDE vinculado, com 2º fator}"] },

  { id: "observacao", nome: "Observacao", col: 0, lin: 2,
    attrs: ["- id: UUID", "- autor: Usuario", "- papelAutor: PapelUsuario", "- dimensao: DimensaoObservada",
      "- valorEscala: EscalaObservacao", "- evidencia: string [0..1]", "- dataRegistro: DateTime"],
    ops: ["+ registrar(...): void"],
    rest: ["{autor e papel definidos pelo servidor}"] },
  { id: "ciclo", nome: "CicloObservacao", col: 1, lin: 2,
    attrs: ["- id: UUID", "- numero: int", "- dataInicio: Date", "- dataFim: Date [0..1]", "- status: StatusCiclo"],
    ops: ["+ abrir(): CicloObservacao", "+ fechar(): VersaoPerfil"],
    rest: ["{no máximo um ABERTO por estudante}", "{numero único por estudante}"] },
  { id: "versao", nome: "VersaoPerfil", col: 2, lin: 2,
    attrs: ["- id: UUID", "- numeroCiclo: int", "- statusValidacao: StatusValidacao", "- origem: OrigemVersao",
      "- versaoAnterior: VersaoPerfil [0..1]", "- validador: Usuario [0..1]", "- justificativa: string [0..1]",
      "- dataVigencia: DateTime [0..1]", "- createdAt: DateTime"],
    ops: ["+ validar(decisao, justificativa?, parametros?): UUID", "+ expirarPendentes(agora): int  «estático»"],
    rest: ["{no máximo uma VIGENTE por estudante}", "{parâmetros imutáveis; ajuste = nova versão}"] },
  { id: "parametros", nome: "ParametrosAdaptacao", estereotipo: "«value object»", cor: COR.verdeAzul, col: 3, lin: 2,
    attrs: ["- maxLinhasPorBloco: int {1..20}", "- nivelVocabulario: NivelVocabulario", "- interesseAncora: string [0..1] {≤ 60}",
      "- formatoEnunciado: FormatoEnunciado", "- contrasteMinimo: decimal {4,5 | 7}", "- blocosPorMaterial: int {1..30}"] },
  { id: "auditoria", nome: "Auditoria", estereotipo: "«somente inserção»", col: 4, lin: 2,
    attrs: ["- id: UUID", "- escolaId: UUID [0..1]", "- estudanteId: UUID [0..1]", "- evento: string", "- entidade: string",
      "- entidadeId: UUID [0..1]", "- autorId: UUID [0..1]  (nulo = sistema)", "- papelAutor: string [0..1]",
      "- detalhes: JSON", "- criadoEm: DateTime"],
    ops: ["+ listar(estudante): Evento[*]"],
    rest: ["{sem chave estrangeira: sobrevive à exclusão}", "{nunca guarda conteúdo de observação ou nota}"] },

  { id: "desfecho", nome: "Desfecho", col: 1, lin: 3,
    attrs: ["- id: UUID", "- resultado: ResultadoDesfecho", "- observacaoLivre: string [0..1]", "- dataRegistro: DateTime"],
    ops: ["+ registrar(...): void"],
    rest: ["{só de material APROVADO, pelo docente autor}"] },
  { id: "material", nome: "MaterialAdaptado", col: 2, lin: 3,
    attrs: ["- id: UUID", "- docente: Usuario", "- titulo: string", "- textoOriginal: string {1..20 000}",
      "- textoRevisado: string [0..1]", "- statusAprovacao: StatusAprovacao", "- iaAplicada: boolean",
      "- hashTexto: string  (SHA-256)", "- dataGeracao: DateTime", "- decididoEm: DateTime [0..1]"],
    ops: ["+ gerar(estudante, titulo, texto): UUID  «estático»", "+ decidir(decisao, textoRevisado?): void"],
    rest: ["{nasce RASCUNHO, com a versão VIGENTE}", "{estudante = versaoPerfil.estudante}", "{rascunho visível só ao docente autor}"] },
  { id: "textoAdaptado", nome: "TextoAdaptado", estereotipo: "«value object»", cor: COR.verdeAzul, col: 3, lin: 3,
    attrs: ["- blocos: Bloco [*]", "- enunciados: Enunciado [*]", "- blocosExcedentes: Bloco [*]",
      "- parametros: ParametrosAdaptacao", "- apoios: ApoiosLeitura [0..1]", "- glossario: ItemGlossario [*]  (IA)"] },
];

function altura(c) {
  const cab = c.estereotipo ? 48 : 36;
  let h = cab + 8 + c.attrs.length * LINHA;
  if (c.ops?.length) h += 10 + c.ops.length * LINHA;
  if (c.rest?.length) h += 8 + c.rest.length * 17;
  return h + 8;
}

function desenharClasse(c) {
  const { x, y, h } = c;
  const corCab = c.cor ?? COR.azul;
  const cab = c.estereotipo ? 48 : 36;
  let s = `<rect x="${x}" y="${y}" width="${W}" height="${h}" rx="4" fill="#FFFFFF" stroke="${corCab}" stroke-width="1.8"/>`;
  s += `<path d="M${x},${y + 4} a4,4 0 0 1 4,-4 h${W - 8} a4,4 0 0 1 4,4 v${cab - 4} h-${W} Z" fill="${corCab}"/>`;
  if (c.estereotipo) s += texto(x + W / 2, y + 17, c.estereotipo, { tam: 11, cor: "#FFFFFF", estilo: "italic", ancora: "middle" });
  s += texto(x + W / 2, y + cab - 12, c.nome, { tam: 16, cor: "#FFFFFF", peso: "bold", ancora: "middle" });
  let yy = y + cab + 8;
  for (const a of c.attrs) {
    yy += LINHA;
    s += texto(x + 12, yy - 5, a, { tam: 11.5, fonte: MONO });
  }
  if (c.ops?.length) {
    yy += 5;
    s += `<line x1="${x}" y1="${yy}" x2="${x + W}" y2="${yy}" stroke="${COR.divisor}"/>`;
    yy += 5;
    for (const o of c.ops) {
      yy += LINHA;
      s += texto(x + 12, yy - 5, o, { tam: 11.5, fonte: MONO, cor: COR.verdeAzul, peso: "bold" });
    }
  }
  if (c.rest?.length) {
    yy += 8;
    for (const r of c.rest) {
      yy += 17;
      s += texto(x + 12, yy - 4, r, { tam: 11, cor: COR.apagado, estilo: "italic" });
    }
  }
  return s;
}

function posicionar() {
  const porLinha = [0, 1, 2, 3].map((l) => CLASSES.filter((c) => c.lin === l));
  let y = 120;
  const linhasY = [];
  for (const grupo of porLinha) {
    linhasY.push(y);
    let maxH = 0;
    for (const c of grupo) {
      c.x = col(c.col);
      c.y = y;
      c.h = altura(c);
      maxH = Math.max(maxH, c.h);
    }
    y += maxH + 110;
  }
  return { linhasY, fim: y - 110 };
}

const B = (id) => CLASSES.find((c) => c.id === id);
const dir = (c) => c.x + W;
const baixo = (c) => c.y + c.h;

/** Associação: pontos, multiplicidades nas pontas, nome no ponto `meio`. */
function associacao(pts, { ini, fim, nome, meio, composicaoNoInicio = false }) {
  let s = `<path d="${caminho(pts)}" fill="none" stroke="${COR.linha}" stroke-width="1.6"${composicaoNoInicio ? ' marker-start="url(#losangoCheio)"' : ""}/>`;
  const mult = (p, q, m, comp) => {
    const dx = Math.sign(q[0] - p[0]);
    const dy = Math.sign(q[1] - p[1]);
    const ao = comp ? 28 : 8;
    const o = { tam: 12, cor: COR.azul, peso: "bold" };
    if (dy === 0) return texto(p[0] + dx * ao, p[1] - 6, m, { ...o, ancora: dx > 0 ? "start" : "end" });
    return texto(p[0] + 7, p[1] + dy * ao + (dy > 0 ? 12 : -2), m, { ...o, ancora: "start" });
  };
  if (ini) s += mult(pts[0], pts[1], ini, composicaoNoInicio);
  if (fim) s += mult(pts[pts.length - 1], pts[pts.length - 2], fim, false);
  if (nome) s += rotulo(meio[0], meio[1], nome);
  return s;
}

function painelEnums(x, y, w) {
  const enums = [
    ["PapelUsuario", "RESPONSAVEL | DOCENTE | PROFISSIONAL_SAUDE | COORDENACAO"],
    ["PapelEscola", "COORDENACAO | DOCENTE"],
    ["StatusMembro", "ATIVO | ENCERRADO"],
    ["StatusVinculo", "PENDENTE_RESPONSAVEL | ATIVO | RECUSADO | ENCERRADO"],
    ["VerificacaoRegistro", "NAO_VERIFICADO | VERIFICADO"],
    ["EscopoConsentimento", "observacao_pedagogica | observacao_domiciliar | validacao_clinica | geracao_material"],
    ["StatusConsentimento", "ATIVO | REVOGADO | EXPIRADO"],
    ["StatusCiclo", "ABERTO | FECHADO"],
    ["DimensaoObservada", "ATENCAO_SUSTENTADA | COMPREENSAO_ENUNCIADOS | AUTONOMIA_LEXICAL | INTERESSE_MANIFESTO | SENSIBILIDADE_VISUAL | FADIGA_TAREFA"],
    ["EscalaObservacao", "REDUZIDA | ESTAVEL | AMPLIADA"],
    ["StatusValidacao", "PENDENTE | VIGENTE | EM_REVISAO | EXPIRADA | SUBSTITUIDA"],
    ["OrigemVersao", "FECHAMENTO_CICLO | AJUSTE_PROFISSIONAL"],
    ["NivelVocabulario", "BASICO | INTERMEDIARIO | ORIGINAL"],
    ["FormatoEnunciado", "ETAPA_UNICA | MULTIPLAS_ETAPAS"],
    ["StatusAprovacao", "RASCUNHO | APROVADO | DESCARTADO"],
    ["ResultadoDesfecho", "ALCANCADO | PARCIAL | NAO_ALCANCADO"],
    ["TipoNotificacao", "CONSENTIMENTO_CONCEDIDO | CONSENTIMENTO_REVOGADO | PROFISSIONAL_AGUARDANDO_CONFIRMACAO | VINCULO_ATIVADO | VALIDACAO_PENDENTE | REVISAO_SOLICITADA | VALIDACAO_EXPIRADA"],
  ];
  const h = 44 + enums.length * 19 + 10;
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${COR.fundoLegenda}" stroke="${COR.divisor}"/>`;
  s += texto(x + 18, y + 26, "«enumeration» — ENUMERAÇÕES (tipos do PostgreSQL)", { tam: 13, cor: COR.verdeAzul, peso: "bold" });
  enums.forEach(([n, v], i) => {
    const yy = y + 52 + i * 19;
    s += texto(x + 18, yy, n, { tam: 11.5, fonte: MONO, cor: COR.azul, peso: "bold" });
    s += texto(x + 210, yy, v, { tam: 11.5, fonte: MONO });
  });
  return { s, h };
}

function painelOperacoes(x, y, w) {
  const ops = [
    ["Usuario.aceitarTermos / meuPerfil", "fn_aceitar_termos · fn_meu_perfil"],
    ["Convite.emitir", "Edge Function convidar (fn_preparar_convite + fn_registrar_convite)"],
    ["MembroEscola.encerrar", "fn_encerrar_membro — encerra os vínculos DOCENTE na escola"],
    ["Estudante.cadastrar", "fn_cadastrar_estudante"],
    ["Vinculo.propor / confirmar / encerrar", "fn_propor_vinculo · fn_confirmar_vinculo · fn_encerrar_vinculo"],
    ["Vinculo.verificarRegistro", "fn_verificar_registro"],
    ["Consentimento.conceder / revogar", "fn_conceder_consentimento · fn_revogar_consentimento"],
    ["CicloObservacao.abrir", "INSERT protegido por RLS (gatilho numera o ciclo)"],
    ["CicloObservacao.fechar", "Edge Function fechar-ciclo (fn_dados_fechamento + fn_registrar_fechamento)"],
    ["Observacao.registrar", "INSERT protegido por RLS (gatilho define autor e papel)"],
    ["VersaoPerfil.validar", "fn_validar_versao (APROVAR | REVISAO | AJUSTAR)"],
    ["VersaoPerfil.expirarPendentes", "fn_expirar_validacoes — pg_cron, diário (RN05)"],
    ["MaterialAdaptado.gerar", "Edge Function gerar-material (fn_preparar_geracao + fn_registrar_material)"],
    ["MaterialAdaptado.decidir", "fn_decidir_material (APROVAR | DESCARTAR)"],
    ["Desfecho.registrar", "INSERT protegido por RLS"],
    ["NotaClinica.registrar / ler", "fn_registrar_nota_clinica · fn_ler_notas_clinicas (grava LEITURA na auditoria)"],
    ["Notificacao.marcarLida", "UPDATE de lida_em protegido por RLS"],
    ["Auditoria.listar", "fn_listar_auditoria (a escrita é só por gatilhos)"],
  ];
  const h = 44 + ops.length * 19 + 10;
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${COR.fundoLegenda}" stroke="${COR.divisor}"/>`;
  s += texto(x + 18, y + 26, "OPERAÇÕES → IMPLEMENTAÇÃO NO SERVIDOR (supabase/migrations 0004–0008, supabase/functions)", { tam: 13, cor: COR.verdeAzul, peso: "bold" });
  ops.forEach(([o, impl], i) => {
    const yy = y + 52 + i * 19;
    s += texto(x + 18, yy, o, { tam: 11.5, fonte: MONO, cor: COR.azul, peso: "bold" });
    s += texto(x + 360, yy, impl, { tam: 11.5 });
  });
  return { s, h };
}

export function diagramaClasses() {
  const { linhasY, fim } = posicionar();
  const largura = col(4) + W + 40;
  const [esc, mem, usu, vin, not] = ["escola", "membro", "usuario", "vinculo", "notificacao"].map(B);
  const [con, cons, est, nota] = ["convite", "consentimento", "estudante", "nota"].map(B);
  const [obs, cic, ver, par] = ["observacao", "ciclo", "versao", "parametros"].map(B);
  const [des, mat, txt] = ["desfecho", "material", "textoAdaptado"].map(B);
  const yA = linhasY[0] + 62;
  const canalAB = linhasY[1] - 50;
  const canalBC = linhasY[2] - 50;
  const yC = linhasY[2] + 62;
  const yD = linhasY[3] + 62;

  let s = titulo("DIAGRAMA DE CLASSES — PEI VIVO",
    "Modelo de domínio implementado (supabase/migrations 0001–0008 e packages/motor-adaptacao/src/tipos.ts). 15 classes persistentes + 2 objetos de valor.");
  const linhas = [
    associacao([[dir(esc), yA], [mem.x, yA]], { ini: "1", fim: "0..*", nome: "tem membros", meio: [(dir(esc) + mem.x) / 2, yA + 20] }),
    associacao([[dir(mem), yA], [usu.x, yA]], { ini: "0..*", fim: "1", nome: "é", meio: [(dir(mem) + usu.x) / 2, yA + 20] }),
    associacao([[dir(usu), yA], [vin.x, yA]], { ini: "1", fim: "0..*", nome: "participa de", meio: [(dir(usu) + vin.x) / 2, yA + 20] }),
    associacao([[usu.x + W * 0.75, usu.y], [usu.x + W * 0.75, 96], [not.x + W / 2, 96], [not.x + W / 2, not.y]],
      { ini: "1", fim: "0..*", nome: "recebe", meio: [vin.x + W / 2, 100] }),
    associacao([[vin.x + 70, baixo(vin)], [vin.x + 70, est.y + 50], [dir(est), est.y + 50]],
      { ini: "0..*", fim: "1", nome: "vincula", meio: [vin.x + 70, (baixo(vin) + est.y + 50) / 2] }),
    associacao([[esc.x + W / 2, baixo(esc)], [esc.x + W / 2, con.y]], { ini: "1", fim: "0..*", nome: "emite", meio: [esc.x + W / 2, (baixo(esc) + con.y) / 2] }),
    associacao([[esc.x + W - 60, baixo(esc)], [esc.x + W - 60, canalAB], [est.x + 60, canalAB], [est.x + 60, est.y]],
      { ini: "1", fim: "0..*", nome: "matricula", meio: [(est.x + esc.x + W) / 2, canalAB + 4] }),
    associacao([[dir(cons), est.y + 90], [est.x, est.y + 90]], { ini: "0..*", fim: "1", nome: "autoriza", meio: [(dir(cons) + est.x) / 2, est.y + 110] }),
    associacao([[dir(est), est.y + 130], [nota.x, est.y + 130]], { ini: "1", fim: "0..*", nome: "tem notas reservadas", meio: [vin.x + W / 2, est.y + 150] }),
    associacao([[est.x + 60, baixo(est)], [est.x + 60, canalBC], [cic.x + W / 2, canalBC], [cic.x + W / 2, cic.y]],
      { ini: "1", fim: "0..*", nome: "é acompanhado em", meio: [(cic.x + W / 2 + est.x + 60) / 2, canalBC + 4] }),
    associacao([[cic.x, yC], [dir(obs), yC]], { ini: "1", fim: "0..*", nome: "contém", meio: [(dir(obs) + cic.x) / 2, yC + 20], composicaoNoInicio: true }),
    associacao([[est.x + W - 80, baixo(est)], [est.x + W - 80, ver.y]], { ini: "1", fim: "0..*", nome: "tem versões", meio: [est.x + W - 80, (baixo(est) + ver.y) / 2] }),
    associacao([[dir(cic), yC], [ver.x, yC]], { ini: "0..1", fim: "0..*", nome: "origina", meio: [(dir(cic) + ver.x) / 2, yC + 20] }),
    associacao([[dir(ver), yC], [par.x, yC]], { ini: "1", fim: "1", nome: "define", meio: [(dir(ver) + par.x) / 2, yC + 20], composicaoNoInicio: true }),
    associacao([[ver.x + W / 2, baixo(ver)], [ver.x + W / 2, mat.y]], { ini: "1", fim: "0..*", nome: "parametriza (snapshot)", meio: [ver.x + W / 2, (baixo(ver) + mat.y) / 2] }),
    associacao([[mat.x, yD], [dir(des), yD]], { ini: "1", fim: "0..1", nome: "resulta em", meio: [(dir(des) + mat.x) / 2, yD + 20], composicaoNoInicio: true }),
    associacao([[dir(mat), yD], [txt.x, yD]], { ini: "1", fim: "0..1", nome: "texto adaptado", meio: [(dir(mat) + txt.x) / 2, yD + 20], composicaoNoInicio: true }),
  ];
  s += linhas.join("\n");
  s += CLASSES.map(desenharClasse).join("\n");

  // painéis
  const yPain = fim + 60;
  const enums = painelEnums(40, yPain, largura - 80);
  const ops = painelOperacoes(40, yPain + enums.h + 30, largura - 80);
  const yLeg = yPain + enums.h + 30 + ops.h + 30;
  let leg = `<rect x="40" y="${yLeg}" width="${largura - 80}" height="96" rx="6" fill="${COR.fundoLegenda}" stroke="${COR.divisor}"/>`;
  leg += texto(58, yLeg + 26, "LEGENDA", { tam: 13, cor: COR.verdeAzul, peso: "bold" });
  leg += `<line x1="58" y1="${yLeg + 52}" x2="128" y2="${yLeg + 52}" stroke="${COR.linha}" stroke-width="1.6"/>` + texto(140, yLeg + 56, "Associação (multiplicidade nas pontas)", { tam: 12 });
  leg += `<path d="M430,${yLeg + 52} L500,${yLeg + 52}" stroke="${COR.linha}" stroke-width="1.6" marker-start="url(#losangoCheio)"/>` + texto(512, yLeg + 56, "Composição (a parte não existe sem o todo)", { tam: 12 });
  leg += `<rect x="830" y="${yLeg + 42}" width="22" height="18" fill="${COR.azul}"/>` + texto(860, yLeg + 56, "Entidade persistente (tabela)", { tam: 12 });
  leg += `<rect x="1090" y="${yLeg + 42}" width="22" height="18" fill="${COR.verdeAzul}"/>` + texto(1120, yLeg + 56, "Objeto de valor (coluna jsonb)", { tam: 12 });
  leg += texto(58, yLeg + 82, "Atributos tipados por outra classe (ex.: autor: Usuario) são associações com Usuario/Estudante desenhadas como atributo para legibilidade. {…} = restrição garantida no banco (índice, CHECK ou gatilho). Excluir um Estudante apaga em cascata os dados dele, exceto a Auditoria.", { tam: 11.5, cor: COR.apagado, estilo: "italic" });

  const altura = yLeg + 96 + 40;
  return documento(largura, altura, s + enums.s + ops.s + leg);
}
