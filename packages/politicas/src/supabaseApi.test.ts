/**
 * Contrato do `supabaseApi` (R2.3/R3.5) contra o Supabase REAL do CI:
 * Auth + PostgREST + Edge Functions (gerar-material, fechar-ciclo, convidar).
 * São os mesmos métodos que as telas chamam — se passam aqui, a troca do mock
 * pelo sistema real não muda nenhuma tela (D-17). Caminho NEGADO primeiro.
 *
 * Só roda com SUPABASE_URL/ANON/SERVICE_ROLE (job `db` do CI). Dados fictícios.
 */
import { createHmac } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { criarSupabaseApi } from "../../../apps/web/src/services/supabaseApi";
import { ErroApi } from "../../../apps/web/src/services/erros";
import type { PeiVivoApi } from "../../../apps/web/src/services/api";

const URL_SB = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const disponivel = Boolean(URL_SB && ANON && SERVICE);

const SUFIXO = `c${Date.now().toString(36)}`;
const SENHA = "senha-ficticia-de-teste-123";
const PESSOAS = ["docente", "responsavel", "saude", "coordenacao"] as const;
type Pessoa = (typeof PESSOAS)[number];
const email = (p: Pessoa | string) => `${p}.${SUFIXO}@example.test`;
const opcoes = { auth: { persistSession: false, autoRefreshToken: false } };

let admin: SupabaseClient;
const ids: Partial<Record<Pessoa, { auth: string; usuario: string }>> = {};
let escolaId = "";
let estudanteId = "";
let semConsentimentoId = "";
let cicloId = "";
const PARAMS = { maxLinhasPorBloco: 4, nivelVocabulario: "BASICO", interesseAncora: "dinossauros", formatoEnunciado: "ETAPA_UNICA", contrasteMinimo: 7, blocosPorMaterial: 8 };
const TEXTO = "O ciclo da água é o movimento contínuo da água na Terra. A água evapora com o calor do sol.\n\nLeia o texto e depois responda às perguntas com suas palavras.";

function totp(segredo: string): string {
  const alfabeto = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of segredo.replace(/=+$/u, "").toUpperCase()) bits += alfabeto.indexOf(c).toString(2).padStart(5, "0");
  const chave = Buffer.from(bits.match(/.{8}/gu)!.map((b) => parseInt(b, 2)));
  const contador = Buffer.alloc(8);
  contador.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));
  const h = createHmac("sha1", chave).update(contador).digest();
  const o = h[h.length - 1]! & 0xf;
  return String((((h[o]! & 0x7f) << 24) | (h[o + 1]! << 16) | (h[o + 2]! << 8) | h[o + 3]!) % 1_000_000).padStart(6, "0");
}

/** Uma "aba de navegador": cliente próprio + supabaseApi, sessão do Auth real. */
async function abrirApp(p: Pessoa, comSegundoFator = false): Promise<PeiVivoApi> {
  const api = criarSupabaseApi(createClient(URL_SB!, ANON!, opcoes));
  const r = await api.entrarComSenha(email(p), SENHA);
  if (comSegundoFator) {
    const cadastro = await api.iniciarCadastroSegundoFator();
    await api.verificarSegundoFator(totp(cadastro.segredo), cadastro.fatorId);
    expect((await api.nivelSessao()).atual).toBe("aal2");
  } else {
    expect(r.usuario.nome).toContain("fictício");
  }
  await api.carregarSessao();
  return api;
}

const negadoCom = (codigo: ErroApi["codigo"]) => (e: unknown) => e instanceof ErroApi && e.codigo === codigo;

async function inserir(tabela: string, linha: Record<string, unknown>) {
  const { data, error } = await admin.from(tabela).insert(linha).select("id").single();
  if (error) throw new Error(`${tabela}: ${error.message}`);
  return (data as { id: string }).id;
}

describe.skipIf(!disponivel)("supabaseApi × Supabase real (Auth + PostgREST + Edge Functions)", () => {
  beforeAll(async () => {
    admin = createClient(URL_SB!, SERVICE!, opcoes);
    for (const p of PESSOAS) {
      const { data, error } = await admin.auth.admin.createUser({ email: email(p), password: SENHA, email_confirm: true });
      if (error) throw error;
      ids[p] = { auth: data.user.id, usuario: await inserir("usuarios", { auth_user_id: data.user.id, nome: `${p} (fictício)`, email: email(p), termos_versao: "v-teste", termos_aceitos_em: new Date().toISOString() }) };
    }
    escolaId = await inserir("escolas", { nome: `Escola fictícia contrato ${SUFIXO}` });
    await inserir("membros_escola", { usuario_id: ids.coordenacao!.usuario, escola_id: escolaId, papel: "COORDENACAO" });
    await inserir("membros_escola", { usuario_id: ids.docente!.usuario, escola_id: escolaId, papel: "DOCENTE" });
    estudanteId = await inserir("estudantes", { escola_id: escolaId, nome: "Estudante fictício contrato", data_nascimento: "2017-01-01", turma: "4º ano", laudo_apresentado_em: "2025-02-10" });
    semConsentimentoId = await inserir("estudantes", { escola_id: escolaId, nome: "Estudante fictício sem autorização", data_nascimento: "2016-01-01" });
    for (const [p, e] of [["docente", estudanteId], ["docente", semConsentimentoId], ["responsavel", estudanteId]] as const) {
      await inserir("vinculos_usuario_estudante", { usuario_id: ids[p]!.usuario, estudante_id: e, papel: p === "docente" ? "DOCENTE" : "RESPONSAVEL" });
    }
    await inserir("vinculos_usuario_estudante", { usuario_id: ids.saude!.usuario, estudante_id: estudanteId, papel: "PROFISSIONAL_SAUDE", registro_conselho: "CONSELHO-CONTRATO", verificacao_registro: "NAO_VERIFICADO" });
    await inserir("consentimentos", { estudante_id: estudanteId, responsavel_id: ids.responsavel!.usuario, escopos: ["observacao_pedagogica", "observacao_domiciliar", "validacao_clinica", "geracao_material"], versao_termo: "v-contrato", status: "ATIVO" });
    await inserir("versoes_perfil", { estudante_id: estudanteId, numero_ciclo: 1, parametros: PARAMS, status_validacao: "VIGENTE", data_vigencia: new Date().toISOString() });
    cicloId = await inserir("ciclos_observacao", { estudante_id: estudanteId, numero: 2, data_inicio: new Date().toISOString().slice(0, 10), status: "ABERTO" });
    await inserir("notas_clinicas", { estudante_id: estudanteId, profissional_id: ids.saude!.usuario, conteudo: "Nota reservada fictícia (contrato)" });
  }, 90_000);

  afterAll(async () => {
    if (!admin) return;
    for (const e of [estudanteId, semConsentimentoId]) if (e) await admin.from("estudantes").delete().eq("id", e);
    const { data: extras } = await admin.from("estudantes").select("id").eq("escola_id", escolaId);
    for (const x of extras ?? []) await admin.from("estudantes").delete().eq("id", (x as { id: string }).id);
    if (escolaId) await admin.from("escolas").delete().eq("id", escolaId);
    for (const p of PESSOAS) if (ids[p]) await admin.auth.admin.deleteUser(ids[p]!.auth);
  });

  it("login: senha errada é genérica; perfil e exigência de segundo fator vêm do banco", async () => {
    const api = criarSupabaseApi(createClient(URL_SB!, ANON!, opcoes));
    await expect(api.entrarComSenha(email("docente"), "errada-123456")).rejects.toSatisfy(negadoCom("NAO_AUTENTICADO"));
    await expect(api.entrarComSenha("ninguem@example.test", "errada-123456")).rejects.toSatisfy(negadoCom("NAO_AUTENTICADO"));
    const r = await api.entrarComSenha(email("saude"), SENHA);
    expect(r).toMatchObject({ exigeSegundoFator: true, temFatorCadastrado: false });
  });

  it("docente: só o permitido — laudo oculto, nota clínica negada, sem consentimento negado", async () => {
    const docente = await abrirApp("docente");
    expect((await docente.listarEstudantes()).map((e) => e.id).sort()).toEqual([estudanteId, semConsentimentoId].sort());
    expect((await docente.obterEstudante(estudanteId)).laudoApresentadoEm).toBeNull();
    expect(await docente.meuPapel(estudanteId)).toBe("DOCENTE");
    await expect(docente.listarNotasClinicas(estudanteId)).rejects.toSatisfy(negadoCom("NEGADO"));
    await expect(docente.abrirCiclo(semConsentimentoId)).rejects.toSatisfy(negadoCom("NEGADO"));
    await expect(docente.gerarMaterial(semConsentimentoId, "t", TEXTO)).rejects.toSatisfy(negadoCom("NEGADO")); // pela Edge Function
  });

  it("ciclo completo pelas Edge Functions: observar → fechar (PENDENTE) → validar (aal2) → gerar → aprovar → desfecho", async () => {
    const docente = await abrirApp("docente");
    await docente.registrarObservacao(cicloId, { dimensao: "FADIGA_TAREFA", valorEscala: "AMPLIADA", evidencia: "Cansa no meio da atividade (fictício)." });
    const previa = await docente.preverFechamento(cicloId);
    expect(previa.modoPedagogico).toBe(false);
    const fechado = await docente.fecharCiclo(cicloId); // EF fechar-ciclo
    expect(fechado.versao.statusValidacao).toBe("PENDENTE");
    expect(fechado.diff.find((d) => d.campo === "blocosPorMaterial")).toMatchObject({ antes: "8", depois: "6" });
    expect((await docente.obterCicloAberto(estudanteId))?.numero).toBe(3);

    const saudeSemMfa = await abrirApp("saude");
    await expect(saudeSemMfa.validarVersao(fechado.versao.id, "APROVAR")).rejects.toSatisfy(negadoCom("NEGADO"));
    const saude = await abrirApp("saude", true);
    expect((await saude.validarVersao(fechado.versao.id, "APROVAR")).statusValidacao).toBe("VIGENTE");
    expect(await saude.listarNotasClinicas(estudanteId)).toHaveLength(1);

    const material = await docente.gerarMaterial(estudanteId, "Ciências (fictício)", TEXTO); // EF gerar-material
    expect(material).toMatchObject({ statusAprovacao: "RASCUNHO", versaoPerfilId: fechado.versao.id, iaAplicada: false });
    expect(material.textoAdaptado?.parametros.blocosPorMaterial).toBe(6);
    const familia = await abrirApp("responsavel");
    expect((await familia.listarMateriais(estudanteId)).some((m) => m.id === material.id)).toBe(false); // rascunho invisível (RN04)
    await docente.aprovarMaterial(material.id, "texto revisado (fictício)");
    expect((await familia.listarMateriais(estudanteId)).some((m) => m.id === material.id)).toBe(true);
    expect((await docente.registrarDesfecho(material.id, "PARCIAL")).resultado).toBe("PARCIAL");

    const trilha = (await familia.listarAuditoria(estudanteId)).map((a) => a.evento);
    expect(trilha).toEqual(expect.arrayContaining(["CONCESSAO", "CICLO_FECHADO", "VALIDACAO", "APROVACAO_MATERIAL", "LEITURA_NOTA_CLINICA"]));
  });

  it("família: vê quem tem acesso, confirma profissional proposto, exporta sem notas e revoga (RN08)", async () => {
    const familia = await abrirApp("responsavel");
    const vinculos = await familia.listarVinculos(estudanteId);
    expect(vinculos.map((v) => v.nomeUsuario)).toEqual(expect.arrayContaining(["docente (fictício)", "saude (fictício)"]));
    const exportacao = await familia.exportarDados(estudanteId);
    expect(JSON.stringify(exportacao)).not.toContain("Nota reservada fictícia");
    expect((await familia.obterConsentimento(estudanteId))?.status).toBe("ATIVO");

    const docente = await abrirApp("docente");
    await familia.revogarConsentimento(estudanteId);
    await expect(docente.listarVersoes(estudanteId)).resolves.toEqual([]); // perde leitura (D-11)
    await expect(docente.abrirCiclo(estudanteId)).rejects.toSatisfy(negadoCom("NEGADO"));
    expect((await docente.listarNotificacoes()).map((n) => n.tipo)).toContain("CONSENTIMENTO_REVOGADO");
    await familia.concederConsentimento(estudanteId, ["observacao_pedagogica", "observacao_domiciliar", "validacao_clinica", "geracao_material"]);
  });

  it("coordenação: sem aal2 nada; com aal2 vê o painel, cadastra, convida (Edge Function) e o profissional fica aguardando a família", async () => {
    const semMfa = await abrirApp("coordenacao");
    await expect(semMfa.cadastrarEstudante({ nome: "Fictício Novo", dataNascimento: "2018-01-01" })).rejects.toSatisfy(negadoCom("NEGADO"));
    const coord = await abrirApp("coordenacao", true);
    const resumo = await coord.resumoEscola();
    expect(resumo.totalEstudantes).toBe(2);
    expect(JSON.stringify(resumo)).not.toMatch(/evidencia|conteudo|parametros/u);
    const novo = await coord.cadastrarEstudante({ nome: "Fictício Novo", dataNascimento: "2018-01-01", turma: "1º ano" });
    expect(novo.nome).toBe("Fictício Novo");

    // convite pela Edge Function `convidar` — mesma chamada da tela de vínculos, com a sessão aal2
    const convite = await coord.convidar({ email: email("prof-convidada"), nome: "Profissional convidada (fictícia)", papel: "PROFISSIONAL_SAUDE", estudanteId, registroConselho: "CONSELHO-CONVITE" });
    expect(convite.emailEnviado).toBe(true);
    const familia = await abrirApp("responsavel");
    const pendente = (await familia.listarVinculos(estudanteId)).find((v) => v.status === "PENDENTE_RESPONSAVEL");
    expect(pendente?.nomeUsuario).toBe("Profissional convidada (fictícia)");
    expect((await familia.confirmarVinculo(pendente!.id, false)).status).toBe("RECUSADO");

    // docente não convida (403 vindo do banco, através da Edge Function)
    const docente = await abrirApp("docente");
    await expect(docente.convidar({ email: email("x"), papel: "DOCENTE" })).rejects.toSatisfy(negadoCom("NEGADO"));
  });
});
