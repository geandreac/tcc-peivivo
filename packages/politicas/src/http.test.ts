/**
 * Integração HTTP REAL: Supabase Auth (GoTrue) + PostgREST, com JWT emitido
 * pelo Auth — a prova "403 com token válido" (RF14, Exemplo 3 da banca) e o
 * segundo fator TOTP de verdade (D-32). Caminho NEGADO primeiro.
 *
 * Só roda quando há um Supabase disponível (job `db` do CI: SUPABASE_URL,
 * SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY). Na máquina da dupla (sem
 * Docker) é pulado. Dados 100 % fictícios, com sufixo único por execução.
 */
import { createHmac } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const URL_SB = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const disponivel = Boolean(URL_SB && ANON && SERVICE);

const SUFIXO = Date.now().toString(36);
const SENHA = "senha-ficticia-de-teste-123";
const PESSOAS = ["docente", "responsavel", "saude", "coordenacao", "estranho"] as const;
type Pessoa = (typeof PESSOAS)[number];
const email = (p: Pessoa) => `${p}.${SUFIXO}@example.test`;

const opcoes = { auth: { persistSession: false, autoRefreshToken: false } };
let admin: SupabaseClient;
const ids: Partial<Record<Pessoa, { auth: string; usuario: string }>> = {};
let escolaId = "";
let estudanteId = "";

/** RFC 6238 (TOTP, SHA-1, 30 s, 6 dígitos) — gera o código como um app autenticador faria. */
function totp(segredoBase32: string, agora = Date.now()): string {
  const alfabeto = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of segredoBase32.replace(/=+$/u, "").toUpperCase()) bits += alfabeto.indexOf(c).toString(2).padStart(5, "0");
  const chave = Buffer.from(bits.match(/.{8}/gu)!.map((b) => parseInt(b, 2)));
  const contador = Buffer.alloc(8);
  contador.writeBigUInt64BE(BigInt(Math.floor(agora / 1000 / 30)));
  const h = createHmac("sha1", chave).update(contador).digest();
  const o = h[h.length - 1]! & 0xf;
  const n = ((h[o]! & 0x7f) << 24) | (h[o + 1]! << 16) | (h[o + 2]! << 8) | h[o + 3]!;
  return String(n % 1_000_000).padStart(6, "0");
}

async function entrar(p: Pessoa): Promise<SupabaseClient> {
  const c = createClient(URL_SB!, ANON!, opcoes);
  const { error } = await c.auth.signInWithPassword({ email: email(p), password: SENHA });
  if (error) throw error;
  return c;
}

/** Cadastra e verifica um fator TOTP: a sessão passa a aal2. */
async function elevarParaAal2(c: SupabaseClient) {
  const { data: fator, error: e1 } = await c.auth.mfa.enroll({ factorType: "totp", friendlyName: `teste-${SUFIXO}` });
  if (e1) throw e1;
  if (fator.type !== "totp") throw new Error("fator inesperado");
  const { data: desafio, error: e2 } = await c.auth.mfa.challenge({ factorId: fator.id });
  if (e2) throw e2;
  const { error: e3 } = await c.auth.mfa.verify({ factorId: fator.id, challengeId: desafio.id, code: totp(fator.totp.secret) });
  if (e3) throw e3;
}

async function inserir(tabela: string, linha: Record<string, unknown>) {
  const { data, error } = await admin.from(tabela).insert(linha).select("id").single();
  if (error) throw new Error(`${tabela}: ${error.message}`);
  return (data as { id: string }).id;
}

describe.skipIf(!disponivel)("HTTP real: Supabase Auth + PostgREST (403 com token válido)", () => {
  beforeAll(async () => {
    admin = createClient(URL_SB!, SERVICE!, opcoes);
    for (const p of PESSOAS) {
      const { data, error } = await admin.auth.admin.createUser({ email: email(p), password: SENHA, email_confirm: true });
      if (error) throw error;
      const usuario = await inserir("usuarios", { auth_user_id: data.user.id, nome: `${p} (fictício)`, email: email(p) });
      ids[p] = { auth: data.user.id, usuario };
    }
    escolaId = await inserir("escolas", { nome: `Escola fictícia HTTP ${SUFIXO}` });
    await inserir("membros_escola", { usuario_id: ids.coordenacao!.usuario, escola_id: escolaId, papel: "COORDENACAO" });
    await inserir("membros_escola", { usuario_id: ids.docente!.usuario, escola_id: escolaId, papel: "DOCENTE" });
    estudanteId = await inserir("estudantes", { escola_id: escolaId, nome: "Estudante fictício HTTP", data_nascimento: "2017-01-01", turma: "4º ano" });
    await inserir("vinculos_usuario_estudante", { usuario_id: ids.docente!.usuario, estudante_id: estudanteId, papel: "DOCENTE" });
    await inserir("vinculos_usuario_estudante", { usuario_id: ids.responsavel!.usuario, estudante_id: estudanteId, papel: "RESPONSAVEL" });
    await inserir("vinculos_usuario_estudante", {
      usuario_id: ids.saude!.usuario,
      estudante_id: estudanteId,
      papel: "PROFISSIONAL_SAUDE",
      registro_conselho: "CONSELHO-FICTICIO-HTTP",
      verificacao_registro: "NAO_VERIFICADO",
    });
    await inserir("consentimentos", {
      estudante_id: estudanteId,
      responsavel_id: ids.responsavel!.usuario,
      escopos: ["observacao_pedagogica", "observacao_domiciliar", "validacao_clinica", "geracao_material"],
      versao_termo: "v-http",
      status: "ATIVO",
    });
    await inserir("notas_clinicas", { estudante_id: estudanteId, profissional_id: ids.saude!.usuario, conteudo: "Nota reservada fictícia (HTTP)" });
  }, 60_000);

  afterAll(async () => {
    if (!admin) return;
    if (estudanteId) await admin.from("estudantes").delete().eq("id", estudanteId);
    if (escolaId) await admin.from("escolas").delete().eq("id", escolaId);
    for (const p of PESSOAS) if (ids[p]) await admin.auth.admin.deleteUser(ids[p]!.auth);
  });

  it("sem login (anon), nada é legível", async () => {
    const anon = createClient(URL_SB!, ANON!, opcoes);
    const { error } = await anon.from("estudantes").select("id");
    expect(error?.code).toBe("42501");
  });

  it("⭐ Exemplo 3: docente com token VÁLIDO lendo notas_clinicas → 403 (42501), por tabela e por RPC", async () => {
    const docente = await entrar("docente");
    const { data: sessao } = await docente.auth.getSession();
    expect(sessao.session?.access_token).toBeTruthy(); // o token é válido…
    const tabela = await docente.from("notas_clinicas").select("conteudo");
    expect(tabela.error?.code).toBe("42501"); // …e mesmo assim o banco nega
    const rpc = await docente.rpc("fn_ler_notas_clinicas", { p_estudante: estudanteId });
    expect(rpc.error?.code).toBe("42501");
  });

  it("docente não forja consentimento (RN01) nem lê a coluna do laudo (D7)", async () => {
    const docente = await entrar("docente");
    const forja = await docente.rpc("fn_conceder_consentimento", { p_estudante: estudanteId, p_escopos: ["geracao_material"], p_versao_termo: "v" });
    expect(forja.error?.code).toBe("42501");
    const coluna = await docente.from("estudantes").select("laudo_apresentado_em");
    expect(coluna.error?.code).toBe("42501");
    const ok = await docente.from("estudantes").select("id, nome");
    expect(ok.data).toHaveLength(1);
  });

  it("pessoa autenticada sem vínculo não vê o estudante", async () => {
    const estranho = await entrar("estranho");
    const { data, error } = await estranho.from("estudantes").select("id");
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("D-32: profissional SEM segundo fator é negado; com TOTP verificado (aal2), lê a nota e a leitura vai para a trilha", async () => {
    const saude = await entrar("saude");
    const semMfa = await saude.rpc("fn_ler_notas_clinicas", { p_estudante: estudanteId });
    expect(semMfa.error?.code).toBe("42501");

    await elevarParaAal2(saude);
    const { data: nivel } = await saude.auth.mfa.getAuthenticatorAssuranceLevel();
    expect(nivel?.currentLevel).toBe("aal2");
    const comMfa = await saude.rpc("fn_ler_notas_clinicas", { p_estudante: estudanteId });
    expect(comMfa.error).toBeNull();
    expect(comMfa.data).toHaveLength(1);

    const familia = await entrar("responsavel");
    const trilha = await familia.rpc("fn_listar_auditoria", { p_estudante: estudanteId });
    expect(trilha.error).toBeNull();
    expect((trilha.data as { evento: string }[]).map((e) => e.evento)).toContain("LEITURA_NOTA_CLINICA");
  });

  it("D-32: coordenação sem segundo fator não cadastra; com TOTP, cadastra", async () => {
    const coord = await entrar("coordenacao");
    const sem = await coord.rpc("fn_cadastrar_estudante", { p_escola: escolaId, p_nome: "Fictício HTTP 2", p_data_nascimento: "2018-01-01" });
    expect(sem.error?.code).toBe("42501");
    await elevarParaAal2(coord);
    const com = await coord.rpc("fn_cadastrar_estudante", { p_escola: escolaId, p_nome: "Fictício HTTP 2", p_data_nascimento: "2018-01-01" });
    expect(com.error).toBeNull();
    await admin.from("estudantes").delete().eq("id", com.data as string);
  });

  it("RN08: responsável revoga pela API e o docente perde a leitura na hora", async () => {
    const familia = await entrar("responsavel");
    const docente = await entrar("docente");
    expect((await docente.from("versoes_perfil").select("id")).error).toBeNull();
    const revoga = await familia.rpc("fn_revogar_consentimento", { p_estudante: estudanteId });
    expect(revoga.error).toBeNull();
    const ciclos = await docente.from("ciclos_observacao").insert({ estudante_id: estudanteId });
    expect(ciclos.error?.code).toBe("42501");
  });
});
