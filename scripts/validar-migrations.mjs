// Valida as migrations e o seed num Postgres real (PGlite, WASM) sem Docker.
// Substitui `supabase db reset` na máquina local; o CI continua usando o
// Supabase de verdade. Uso: npm run db:validar
import { PGlite } from "@electric-sql/pglite";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const raiz = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const dirMigrations = join(raiz, "supabase", "migrations");

// Stub mínimo do que o Supabase provê e as migrations referenciam.
const stubSupabase = `
  create schema if not exists auth;
  create table if not exists auth.users (id uuid primary key);
  -- Mesma leitura que o Supabase faz: claim.sub legado ou request.jwt.claims (JSON).
  create or replace function auth.jwt() returns jsonb language sql stable as $$
    select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
  $$;
  create or replace function auth.uid() returns uuid language sql stable as $$
    select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''), auth.jwt() ->> 'sub')::uuid
  $$;
  create role anon nologin; create role authenticated nologin; create role service_role nologin;
  grant usage on schema auth to anon, authenticated;
  grant execute on all functions in schema auth to anon, authenticated;
  grant usage on schema public to anon, authenticated;
  -- Padrão do Supabase: tabelas novas de public expostas a anon/authenticated (a 0004 revoga).
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant execute on functions to anon, authenticated;
`;

const db = new PGlite();
const executar = async (rotulo, sql) => {
  try {
    await db.exec(sql);
    console.log(`✓ ${rotulo}`);
  } catch (erro) {
    console.error(`✗ ${rotulo}\n  ${erro.message}`);
    process.exit(1);
  }
};

await executar("stub auth/roles", stubSupabase);

const arquivos = (await readdir(dirMigrations)).filter((f) => f.endsWith(".sql")).sort();
for (const arquivo of arquivos) {
  await executar(`migration ${arquivo}`, await readFile(join(dirMigrations, arquivo), "utf8"));
}
await executar("seed.sql", await readFile(join(raiz, "supabase", "seed.sql"), "utf8"));

const { rows: [resumo] } = await db.query(`
  select
    (select count(*) from information_schema.tables where table_schema = 'public')::int as tabelas,
    (select count(*) from pg_policies where schemaname = 'public')::int as politicas,
    (select count(*) from pg_tables where schemaname = 'public' and rowsecurity)::int as tabelas_com_rls,
    (select count(*) from estudantes)::int as estudantes,
    (select count(*) from versoes_perfil where status_validacao = 'VIGENTE')::int as versoes_vigentes
`);
console.log(resumo);
if (resumo.tabelas !== resumo.tabelas_com_rls) {
  console.error("✗ há tabela pública sem RLS habilitado");
  process.exit(1);
}
console.log("OK — schema, RLS e seed válidos.");
await db.close();
