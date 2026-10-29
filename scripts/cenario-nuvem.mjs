// Cenário de demonstração NA NUVEM (D-50), 100 % FICTÍCIO: uma escola, os cinco perfis
// (Administrador Geral, coordenação, docente, responsável, profissional de saúde) e um
// estudante fictício com consentimento, ciclo fechado com versão vigente e ciclo aberto.
// Nenhum dado real de estudante (CLAUDE.md, "Dados"). Mesmos nomes da demonstração local.
//
// Uso (service role só em variável de ambiente, NUNCA commitada):
//   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… SUPABASE_ANON_KEY=… node scripts/cenario-nuvem.mjs
//
// Idempotente: rodar de novo troca as senhas e o segundo fator e não duplica dados.
// As credenciais vão para `.env.demo-nuvem` (ignorado pelo git): senha de cada perfil e,
// para quem exige segundo fator, a chave TOTP para cadastrar no aplicativo autenticador.
import { createHmac, randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anon = process.env.SUPABASE_ANON_KEY;
if (!url || !chave || !anon) {
  console.error("Uso: SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… SUPABASE_ANON_KEY=… node scripts/cenario-nuvem.mjs");
  process.exit(1);
}
const VERSAO_TERMO = "v1-2026-10"; // apps/web/src/services/api.ts
const ESCOLA = "Escola Municipal Aurora (fictícia)";
const PESSOAS = {
  admin: { nome: "Administração Geral (fictícia)", email: "admin.demo@example.com", totp: true },
  coordenacao: { nome: "Coordenação (fictícia)", email: "coordenacao.demo@example.com", totp: true },
  docente: { nome: "Márcia (fictícia)", email: "docente.demo@example.com", totp: false },
  responsavel: { nome: "Rosa (fictícia)", email: "responsavel.demo@example.com", totp: false },
  saude: { nome: "Camila (fictícia)", email: "saude.demo@example.com", totp: true },
};
const PARAMETROS = {
  maxLinhasPorBloco: 4,
  nivelVocabulario: "BASICO",
  interesseAncora: "dinossauros",
  formatoEnunciado: "ETAPA_UNICA",
  contrasteMinimo: 7,
  blocosPorMaterial: 8,
};

const sb = createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });
const falhar = (passo, erro) => {
  console.error(`✗ ${passo}: ${erro?.message ?? erro}`);
  process.exit(1);
};
const exigir = async (passo, p) => {
  const r = await p;
  if (r.error) falhar(passo, r.error);
  return r.data;
};

// ------------------------------------------------------------------ TOTP (RFC 6238, SHA-1, 6 dígitos, 30 s)
function base32(texto) {
  const alfabeto = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of texto.replace(/=+$/u, "").toUpperCase()) bits += alfabeto.indexOf(c).toString(2).padStart(5, "0");
  return Buffer.from(bits.match(/.{8}/gu).map((b) => parseInt(b, 2)));
}
export function codigoTotp(segredo, agora = Date.now()) {
  const contador = Buffer.alloc(8);
  contador.writeBigUInt64BE(BigInt(Math.floor(agora / 30_000)));
  const h = createHmac("sha1", base32(segredo)).update(contador).digest();
  const o = h[h.length - 1] & 0xf;
  return String((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}
// autoteste com o vetor do RFC 6238 (segredo "12345678901234567890", T = 59 s → 287082)
if (codigoTotp("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", 59_000) !== "287082") falhar("autoteste TOTP", "código não confere com o RFC 6238");

const senha = () => randomBytes(12).toString("base64url"); // 16 caracteres (Auth exige ≥ 10)

// ------------------------------------------------------------------ 1. contas no Auth + usuarios
const { data: lista } = await sb.auth.admin.listUsers({ perPage: 1000 });
const ids = {};
const credenciais = {};
for (const [chaveP, p] of Object.entries(PESSOAS)) {
  const s = senha();
  credenciais[chaveP] = { ...p, senha: s };
  let authId = lista?.users?.find((u) => u.email === p.email)?.id;
  if (authId) {
    await exigir(`trocar senha de ${p.email}`, sb.auth.admin.updateUserById(authId, { password: s }));
    // segundo fator antigo sai: o novo é cadastrado abaixo
    const fatores = await sb.auth.admin.mfa.listFactors({ userId: authId });
    for (const f of fatores.data?.factors ?? []) await sb.auth.admin.mfa.deleteFactor({ userId: authId, id: f.id });
  } else {
    const r = await exigir(`criar conta ${p.email}`, sb.auth.admin.createUser({ email: p.email, password: s, email_confirm: true }));
    authId = r.user.id;
  }
  const existente = await exigir("ler usuário", sb.from("usuarios").select("id").eq("email", p.email).maybeSingle());
  const dados = { auth_user_id: authId, nome: p.nome, email: p.email, termos_versao: VERSAO_TERMO, termos_aceitos_em: new Date().toISOString() };
  const u = existente
    ? await exigir("atualizar usuário", sb.from("usuarios").update(dados).eq("id", existente.id).select("id").single())
    : await exigir("criar usuário", sb.from("usuarios").insert(dados).select("id").single());
  ids[chaveP] = u.id;
}
console.log("✓ 5 contas fictícias (Auth + usuarios)");

// ------------------------------------------------------------------ 2. escola, papéis e estudante
let escola = await exigir("ler escola", sb.from("escolas").select("id").eq("nome", ESCOLA).maybeSingle());
escola ??= await exigir("criar escola", sb.from("escolas").insert({ nome: ESCOLA }).select("id").single());
const r1 = await sb.from("administradores").insert({ usuario_id: ids.admin });
if (r1.error && r1.error.code !== "23505") falhar("registrar Administrador Geral", r1.error);
for (const [quem, papel] of [
  ["coordenacao", "COORDENACAO"],
  ["docente", "DOCENTE"],
]) {
  const r = await sb.from("membros_escola").insert({ usuario_id: ids[quem], escola_id: escola.id, papel });
  if (r.error && r.error.code !== "23505") falhar(`membro ${papel}`, r.error);
}

let estudante = await exigir("ler estudante", sb.from("estudantes").select("id").eq("escola_id", escola.id).eq("nome", "Miguel (fictício)").maybeSingle());
if (!estudante) {
  estudante = await exigir(
    "criar estudante",
    sb.from("estudantes").insert({ escola_id: escola.id, nome: "Miguel (fictício)", data_nascimento: "2017-03-14", turma: "4º ano B" }).select("id").single(),
  );
  await exigir(
    "vínculos",
    sb.from("vinculos_usuario_estudante").insert([
      { usuario_id: ids.docente, estudante_id: estudante.id, papel: "DOCENTE" },
      { usuario_id: ids.responsavel, estudante_id: estudante.id, papel: "RESPONSAVEL", conferido_por: ids.coordenacao, conferido_em: new Date().toISOString() },
      {
        usuario_id: ids.saude,
        estudante_id: estudante.id,
        papel: "PROFISSIONAL_SAUDE",
        registro_conselho: "CONSELHO-FICTICIO-001",
        verificacao_registro: "NAO_VERIFICADO",
      },
    ]),
  );
  await exigir(
    "consentimento",
    sb.from("consentimentos").insert({
      estudante_id: estudante.id,
      responsavel_id: ids.responsavel,
      escopos: ["observacao_pedagogica", "observacao_domiciliar", "validacao_clinica", "geracao_material"],
      versao_termo: VERSAO_TERMO,
      status: "ATIVO",
    }),
  );
  const hoje = new Date();
  const dias = (n) => new Date(hoje.getTime() - n * 86_400_000).toISOString().slice(0, 10);
  const fechado = await exigir(
    "ciclo fechado",
    sb
      .from("ciclos_observacao")
      .insert({ estudante_id: estudante.id, numero: 1, data_inicio: dias(15), status: "FECHADO" })
      .select("id")
      .single(),
  );
  await exigir(
    "observações do ciclo 1",
    sb.from("observacoes").insert([
      {
        ciclo_id: fechado.id,
        autor_id: ids.docente,
        papel_autor: "DOCENTE",
        dimensao: "ATENCAO_SUSTENTADA",
        valor_escala: "REDUZIDA",
        evidencia: "Perde o fio em blocos de texto acima de 5 linhas (fictício).",
      },
      {
        ciclo_id: fechado.id,
        autor_id: ids.docente,
        papel_autor: "DOCENTE",
        dimensao: "COMPREENSAO_ENUNCIADOS",
        valor_escala: "REDUZIDA",
        evidencia: "Trava em instruções com mais de uma etapa (fictício).",
      },
      {
        ciclo_id: fechado.id,
        autor_id: ids.responsavel,
        papel_autor: "RESPONSAVEL",
        dimensao: "INTERESSE_MANIFESTO",
        valor_escala: "AMPLIADA",
        evidencia: "Dinossauros (fictício).",
      },
    ]),
  );
  await exigir(
    "versão vigente",
    sb.from("versoes_perfil").insert({
      estudante_id: estudante.id,
      ciclo_origem_id: fechado.id,
      numero_ciclo: 1,
      parametros: PARAMETROS,
      status_validacao: "VIGENTE",
      validador_id: ids.saude,
      data_vigencia: new Date().toISOString(),
    }),
  );
  await exigir("ciclo aberto", sb.from("ciclos_observacao").insert({ estudante_id: estudante.id, numero: 2, data_inicio: dias(0), status: "ABERTO" }));
  console.log("✓ escola, estudante fictício, vínculos, consentimento, ciclo 1 fechado (versão vigente) e ciclo 2 aberto");
} else {
  console.log("• estudante fictício já existia (dados mantidos)");
}

// ------------------------------------------------------------------ 3. segundo fator de quem exige (admin, coordenação, saúde)
for (const [chaveP, p] of Object.entries(credenciais)) {
  if (!p.totp) continue;
  const cli = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  await exigir(`entrar como ${p.email}`, cli.auth.signInWithPassword({ email: p.email, password: p.senha }));
  const fator = await exigir(`cadastrar TOTP de ${p.email}`, cli.auth.mfa.enroll({ factorType: "totp", friendlyName: `PEI Vivo demo ${chaveP}` }));
  await exigir(`confirmar TOTP de ${p.email}`, cli.auth.mfa.challengeAndVerify({ factorId: fator.id, code: codigoTotp(fator.totp.secret) }));
  p.segredoTotp = fator.totp.secret;
  p.uriTotp = fator.totp.uri;
  await cli.auth.signOut();
}
console.log("✓ segundo fator cadastrado para administração, coordenação e saúde");

// ------------------------------------------------------------------ 4. credenciais (arquivo ignorado pelo git)
const linhas = [
  "# Contas FICTÍCIAS de demonstração na nuvem (scripts/cenario-nuvem.mjs). NÃO commitar.",
  `# Gerado em ${new Date().toISOString()}. Site: https://tcc-peivivo.vercel.app/entrar`,
  "# Segundo fator: no app autenticador, 'inserir chave' e colar DEMO_*_TOTP (ou abrir a URI otpauth).",
];
for (const [chaveP, p] of Object.entries(credenciais)) {
  const k = chaveP.toUpperCase();
  linhas.push("", `# ${p.nome}`, `DEMO_${k}_EMAIL=${p.email}`, `DEMO_${k}_SENHA=${p.senha}`);
  if (p.segredoTotp) linhas.push(`DEMO_${k}_TOTP=${p.segredoTotp}`, `DEMO_${k}_TOTP_URI=${p.uriTotp}`);
}
writeFileSync(".env.demo-nuvem", linhas.join("\n") + "\n", { mode: 0o600 });
console.log("✓ credenciais em .env.demo-nuvem (ignorado pelo git)");
