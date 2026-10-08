// Implantação de uma escola (F1, D-23): cria a escola e convida o PRIMEIRO
// coordenador. É a única operação feita "de fora" do app — não há painel de
// super-administrador (prompt §13). Usa a service role: rode só na máquina da
// dupla, com a chave em variável de ambiente, NUNCA commitada.
//
// Uso:
//   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=... \
//   node scripts/implantar-escola.mjs --escola "Escola Municipal X" \
//        --email coordenacao@escola.exemplo --nome "Nome da coordenadora" \
//        --site https://endereco-do-app
//
// O e-mail leva ao link /definir-senha?convite=1 (senha + termos). No primeiro
// acesso, a coordenação cadastra o aplicativo autenticador (TOTP obrigatório).
import { createClient } from "@supabase/supabase-js";

function argumento(nome) {
  const i = process.argv.indexOf(`--${nome}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}

const url = process.env.SUPABASE_URL;
const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
const escola = argumento("escola")?.trim();
const email = argumento("email")?.trim().toLowerCase();
const nome = argumento("nome")?.trim() ?? "";
const site = (argumento("site") ?? "http://localhost:5173").replace(/\/$/u, "");

if (!url || !chave || !escola || !email) {
  console.error("Uso: SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/implantar-escola.mjs --escola \"Nome\" --email coord@… [--nome \"…\"] [--site https://…]");
  process.exit(1);
}

const sb = createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });
const falhar = (passo, erro) => {
  console.error(`✗ ${passo}: ${erro?.message ?? erro}`);
  process.exit(1);
};

// 1. escola (nome único)
let { data: e } = await sb.from("escolas").select("id").eq("nome", escola).maybeSingle();
if (!e) {
  const r = await sb.from("escolas").insert({ nome: escola }).select("id").single();
  if (r.error) falhar("criar escola", r.error);
  e = r.data;
  console.log(`✓ escola criada: ${escola}`);
} else {
  console.log(`• escola já existia: ${escola}`);
}

// 2. conta + convite por e-mail
let authId = null;
const convite = await sb.auth.admin.inviteUserByEmail(email, { redirectTo: `${site}/definir-senha?convite=1` });
if (convite.error) {
  if (!/already/iu.test(convite.error.message)) falhar("enviar convite", convite.error);
  console.log("• a conta já existia no Auth; o acesso de coordenação será registrado sem novo e-mail");
} else {
  authId = convite.data.user.id;
  console.log(`✓ convite enviado para ${email}`);
}

// 3. usuário + membro COORDENACAO + registro do convite (criado_por = null: implantação)
let { data: u } = await sb.from("usuarios").select("id").eq("email", email).maybeSingle();
if (!u) {
  const r = await sb.from("usuarios").insert({ auth_user_id: authId, nome: nome || email.split("@")[0], email }).select("id").single();
  if (r.error) falhar("criar usuário", r.error);
  u = r.data;
}
const membro = await sb.from("membros_escola").insert({ usuario_id: u.id, escola_id: e.id, papel: "COORDENACAO" });
if (membro.error && membro.error.code !== "23505") falhar("registrar coordenação", membro.error);
const registro = await sb.from("convites").insert({ escola_id: e.id, email, papel: "COORDENACAO", criado_por: null });
if (registro.error && registro.error.code !== "23505") falhar("registrar convite", registro.error);

console.log(`✓ ${email} é coordenação de "${escola}". Próximo passo: aceitar o convite e cadastrar o TOTP.`);
