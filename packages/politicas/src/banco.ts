/**
 * Harness dos testes de política (D-34, docs/reformulacao/PLANO.md R1.4).
 *
 * - Sem `DATABASE_URL`: sobe um PGlite (Postgres em WASM), aplica o stub do
 *   Supabase + todas as migrations. É o caminho local (a máquina da dupla não
 *   roda Docker).
 * - Com `DATABASE_URL`: conecta no Postgres do Supabase já migrado (job `db` do CI).
 *
 * Em ambos, a fixture fictícia é criada dentro de uma transação que nunca é
 * confirmada, e cada ação de teste roda num SAVEPOINT desfeito ao final.
 * Dados 100 % fictícios.
 */
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export interface Resultado {
  ok: boolean;
  rows: Record<string, unknown>[];
  /** SQLSTATE do erro (42501 = negado, PT409 = conflito, 22023 = inválido, 23505 = único). */
  codigo?: string | undefined;
  mensagem?: string | undefined;
}

interface Conexao {
  exec(sql: string): Promise<void>;
  query(sql: string, params?: unknown[]): Promise<Record<string, unknown>[]>;
  fechar(): Promise<void>;
}

const raiz = fileURLToPath(new URL("../../..", import.meta.url));

const STUB_SUPABASE = `
  create schema if not exists auth;
  create table if not exists auth.users (id uuid primary key, aud text, role text, email text);
  create or replace function auth.jwt() returns jsonb language sql stable as $$
    select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
  $$;
  create or replace function auth.uid() returns uuid language sql stable as $$
    select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''), auth.jwt() ->> 'sub')::uuid
  $$;
  create role anon nologin; create role authenticated nologin; create role service_role nologin;
  grant usage on schema auth to anon, authenticated;
  grant execute on all functions in schema auth to anon, authenticated;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant execute on functions to anon, authenticated;
`;

async function conectarPglite(): Promise<Conexao> {
  const { PGlite } = await import("@electric-sql/pglite");
  const db = new PGlite();
  await db.exec(STUB_SUPABASE);
  const dir = join(raiz, "supabase", "migrations");
  for (const f of (await readdir(dir)).filter((x) => x.endsWith(".sql")).sort()) {
    await db.exec(await readFile(join(dir, f), "utf8"));
  }
  return {
    exec: async (sql) => {
      await db.exec(sql);
    },
    query: async (sql, params) => (await db.query<Record<string, unknown>>(sql, params as unknown[])).rows,
    fechar: () => db.close(),
  };
}

async function conectarPostgres(url: string): Promise<Conexao> {
  const { default: pg } = await import("pg");
  const cliente = new pg.Client({ connectionString: url });
  await cliente.connect();
  return {
    exec: async (sql) => {
      await cliente.query(sql);
    },
    query: async (sql, params) => (await cliente.query(sql, params)).rows,
    fechar: () => cliente.end(),
  };
}

// ------------------------------------------------------------------ fixture
const u = (n: number) => `10000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const a = (n: number) => `20000000-0000-0000-0000-${String(n).padStart(12, "0")}`;

export const PESSOAS = {
  docente: 1,
  docente2: 2,
  responsavel: 3,
  responsavel2: 4,
  saude: 5,
  saude2: 6,
  coordenacao: 7,
  coordOutraEscola: 8,
  estranho: 9,
  docenteSemVinculo: 10,
  profissionalNovo: 11,
} as const;
export type Pessoa = keyof typeof PESSOAS;
export const usuarioId = (p: Pessoa) => u(PESSOAS[p]);

export const ID = {
  escola1: "30000000-0000-0000-0000-000000000001",
  escola2: "30000000-0000-0000-0000-000000000002",
  e1: "40000000-0000-0000-0000-000000000001", // escola 1, consentimento ATIVO com todos os escopos
  e2: "40000000-0000-0000-0000-000000000002", // escola 1, SEM consentimento
  e3: "40000000-0000-0000-0000-000000000003", // escola 2
  cicloE1: "50000000-0000-0000-0000-000000000001",
  cicloE2: "50000000-0000-0000-0000-000000000002",
  cicloFechadoE1: "50000000-0000-0000-0000-000000000003",
  vigenteE1: "60000000-0000-0000-0000-000000000001",
  pendenteE1: "60000000-0000-0000-0000-000000000002",
  vigenteE2: "60000000-0000-0000-0000-000000000003",
  rascunhoDocente2: "70000000-0000-0000-0000-000000000001",
  aprovadoDocente: "70000000-0000-0000-0000-000000000002",
  notaSaude: "80000000-0000-0000-0000-000000000001",
} as const;

export const PARAMETROS_OK = {
  maxLinhasPorBloco: 4,
  nivelVocabulario: "BASICO",
  interesseAncora: "dinossauros",
  formatoEnunciado: "ETAPA_UNICA",
  contrasteMinimo: 7,
  blocosPorMaterial: 8,
};
const P = JSON.stringify(PARAMETROS_OK);

const FIXTURE = `
  insert into auth.users (id, aud, role, email) values
    ${Object.entries(PESSOAS).map(([k, n]) => `('${a(n)}','authenticated','authenticated','${k.toLowerCase()}.auth@example.test')`).join(",")};
  insert into usuarios (id, auth_user_id, nome, email) values
    ${Object.entries(PESSOAS).map(([k, n]) => `('${u(n)}','${a(n)}','${k} (fictício)','${k.toLowerCase()}@example.test')`).join(",")};
  insert into escolas (id, nome) values ('${ID.escola1}','Escola fictícia 1 (teste)'), ('${ID.escola2}','Escola fictícia 2 (teste)');
  insert into membros_escola (usuario_id, escola_id, papel) values
    ('${u(7)}','${ID.escola1}','COORDENACAO'), ('${u(8)}','${ID.escola2}','COORDENACAO'),
    ('${u(1)}','${ID.escola1}','DOCENTE'), ('${u(2)}','${ID.escola1}','DOCENTE'), ('${u(10)}','${ID.escola1}','DOCENTE');
  insert into estudantes (id, escola_id, nome, data_nascimento, turma, laudo_apresentado_em) values
    ('${ID.e1}','${ID.escola1}','Estudante fictício 1','2017-01-01','4º ano','2025-02-10'),
    ('${ID.e2}','${ID.escola1}','Estudante fictício 2','2016-01-01','5º ano', null),
    ('${ID.e3}','${ID.escola2}','Estudante fictício 3','2016-06-01','5º ano', null);
  insert into vinculos_usuario_estudante (usuario_id, estudante_id, papel, registro_conselho, verificacao_registro) values
    ('${u(1)}','${ID.e1}','DOCENTE',null,null), ('${u(1)}','${ID.e2}','DOCENTE',null,null),
    ('${u(2)}','${ID.e1}','DOCENTE',null,null),
    ('${u(3)}','${ID.e1}','RESPONSAVEL',null,null), ('${u(4)}','${ID.e1}','RESPONSAVEL',null,null),
    ('${u(3)}','${ID.e2}','RESPONSAVEL',null,null),
    ('${u(5)}','${ID.e1}','PROFISSIONAL_SAUDE','CONSELHO-FICTICIO-1','NAO_VERIFICADO'),
    ('${u(6)}','${ID.e1}','PROFISSIONAL_SAUDE','CONSELHO-FICTICIO-2','NAO_VERIFICADO');
  insert into consentimentos (estudante_id, responsavel_id, escopos, versao_termo, status) values
    ('${ID.e1}','${u(3)}','{observacao_pedagogica,observacao_domiciliar,validacao_clinica,geracao_material}','v-teste','ATIVO');
  insert into ciclos_observacao (id, estudante_id, numero, data_inicio, status) values
    ('${ID.cicloFechadoE1}','${ID.e1}',1,current_date - 30,'FECHADO'),
    ('${ID.cicloE1}','${ID.e1}',3,current_date,'ABERTO'),
    ('${ID.cicloE2}','${ID.e2}',1,current_date,'ABERTO');
  insert into versoes_perfil (id, estudante_id, numero_ciclo, parametros, status_validacao, data_vigencia, created_at) values
    ('${ID.vigenteE1}','${ID.e1}',1,'${P}','VIGENTE',now(), now() - interval '20 days'),
    ('${ID.pendenteE1}','${ID.e1}',2,'${P}','PENDENTE',null, now() - interval '2 days'),
    ('${ID.vigenteE2}','${ID.e2}',1,'${P}','VIGENTE',now(), now() - interval '20 days');
  insert into materiais_adaptados (id, estudante_id, versao_perfil_id, docente_id, texto_original) values
    ('${ID.rascunhoDocente2}','${ID.e1}','${ID.vigenteE1}','${u(2)}','Rascunho fictício do docente 2'),
    ('${ID.aprovadoDocente}','${ID.e1}','${ID.vigenteE1}','${u(1)}','Material fictício aprovado do docente 1');
  update materiais_adaptados set status_aprovacao = 'APROVADO' where id = '${ID.aprovadoDocente}';
  insert into notas_clinicas (id, estudante_id, profissional_id, conteudo) values
    ('${ID.notaSaude}','${ID.e1}','${u(5)}','Nota reservada fictícia');
`;

// ------------------------------------------------------------------ API dos testes
export type Ator = Pessoa | "anon" | "sistema" | "servico";
export interface Passo {
  ator: Ator;
  /** Uma instrução, ou várias: o resultado é o da última. */
  sql: string | string[];
  aal?: "aal1" | "aal2";
}

export interface Banco {
  /** Executa como `pessoa` autenticada (role authenticated). Profissional e coordenação usam aal2 por padrão. */
  como(ator: Ator, sql: string | string[], opcoes?: { aal?: "aal1" | "aal2" }): Promise<Resultado>;
  /** Executa como dono do banco (equivale ao service role / Edge Function / tarefa agendada). */
  sistema(sql: string | string[]): Promise<Resultado>;
  /** Vários atores em sequência, no mesmo savepoint (desfeito ao final). Para no primeiro erro. */
  fluxo(passos: Passo[]): Promise<Resultado[]>;
  /** Persiste uma ação na fixture para os testes seguintes do arquivo (ex.: a revogação). */
  fixar(passo: Passo): Promise<void>;
  fechar(): Promise<void>;
}

const AAL2_PADRAO: Pessoa[] = ["saude", "saude2", "coordenacao", "coordOutraEscola", "profissionalNovo"];

function preparo(ator: Ator, aal?: "aal1" | "aal2"): string {
  if (ator === "sistema") return "reset role; select set_config('request.jwt.claims', '', true);";
  if (ator === "anon") return "set local role anon; select set_config('request.jwt.claims', '', true);";
  // Edge Function com service role: JWT sem `sub` (auth.uid() nulo).
  if (ator === "servico") return "reset role; select set_config('request.jwt.claims', '{\"role\":\"service_role\"}', true); set local role service_role;";
  const nivel = aal ?? (AAL2_PADRAO.includes(ator) ? "aal2" : "aal1");
  const claims = JSON.stringify({ sub: a(PESSOAS[ator]), role: "authenticated", aal: nivel });
  return `reset role; select set_config('request.jwt.claims', '${claims}', true); set local role authenticated;`;
}

export async function abrirBanco(): Promise<Banco> {
  const url = process.env.DATABASE_URL;
  const c = url ? await conectarPostgres(url) : await conectarPglite();
  const [versao] = await c.query("select version() as v");
  console.info(`[politicas] banco: ${String(versao?.v).split(",")[0]}`);
  await c.exec("begin");
  await c.exec(FIXTURE);
  let n = 0;

  async function executar(passo: Passo): Promise<Resultado> {
    const lista = Array.isArray(passo.sql) ? passo.sql : [passo.sql];
    try {
      await c.exec(preparo(passo.ator, passo.aal));
      let rows: Record<string, unknown>[] = [];
      for (const sql of lista) rows = await c.query(sql);
      return { ok: true, rows };
    } catch (e) {
      const err = e as { code?: string; message?: string };
      return { ok: false, rows: [], codigo: err.code, mensagem: err.message };
    }
  }

  async function emSavepoint<T>(fn: () => Promise<T>): Promise<T> {
    const sp = `sp_${++n}`;
    await c.exec(`savepoint ${sp}`);
    try {
      return await fn();
    } finally {
      await c.exec(`rollback to savepoint ${sp}; release savepoint ${sp}; reset role;`);
      await c.exec("select set_config('request.jwt.claims', '', true)");
    }
  }

  return {
    como: (ator, sql, opcoes = {}) => emSavepoint(() => executar({ ator, sql, ...(opcoes.aal ? { aal: opcoes.aal } : {}) })),
    sistema: (sql) => emSavepoint(() => executar({ ator: "sistema", sql })),
    fluxo: (passos) =>
      emSavepoint(async () => {
        const res: Resultado[] = [];
        for (const p of passos) {
          const r = await executar(p);
          res.push(r);
          if (!r.ok) break;
        }
        return res;
      }),
    fixar: async (passo) => {
      const r = await executar(passo);
      await c.exec("reset role; select set_config('request.jwt.claims', '', true);");
      if (!r.ok) throw new Error(`fixar falhou: ${r.mensagem}`);
    },
    fechar: async () => {
      await c.exec("rollback");
      await c.fechar();
    },
  };
}

/** Negado pelo banco: erro de privilégio/RLS (42501). */
export const NEGADO = "42501";
