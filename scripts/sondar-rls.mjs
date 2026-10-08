// Sondagem das políticas RLS atuais (0001 + 0002) — Fase 0 da reformulação.
// NÃO é teste de produto: é a evidência da auditoria (docs/reformulacao/AUDITORIA.md §3).
// Cada sonda tenta uma ação como usuário autenticado (role `authenticated`,
// `auth.uid()` simulado) e informa se o banco PERMITIU ou NEGOU.
// "PERMITIU" numa ação que deveria ser negada = falha confirmada.
//
// Uso: node scripts/sondar-rls.mjs        (sem Docker; PGlite = Postgres em WASM)
// Dados 100 % fictícios.
import { PGlite } from "@electric-sql/pglite";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const raiz = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const dirMigrations = join(raiz, "supabase", "migrations");

const db = new PGlite();

// Mesmo stub de scripts/validar-migrations.mjs + GRANTs equivalentes ao padrão
// do Supabase (tabelas de `public` expostas a anon/authenticated; RLS decide).
await db.exec(`
  create schema if not exists auth;
  create table if not exists auth.users (id uuid primary key);
  create or replace function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  create role anon nologin; create role authenticated nologin; create role service_role nologin;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
`);
for (const f of (await readdir(dirMigrations)).filter((f) => f.endsWith(".sql")).sort()) {
  await db.exec(await readFile(join(dirMigrations, f), "utf8"));
}
await db.exec(`
  grant usage on schema public to anon, authenticated;
  grant all on all tables in schema public to anon, authenticated;
  grant execute on all functions in schema public to anon, authenticated;
`);

// ------------------------------------------------------------ fixture fictícia
// auth uid = 'a…<n>', usuarios.id = 'u…<n>'
const A = (n) => `aaaaaaaa-0000-0000-0000-00000000000${n}`;
const U = (n) => `bbbbbbbb-0000-0000-0000-00000000000${n}`;
const E1 = "eeeeeeee-0000-0000-0000-000000000001"; // estudante com consentimento
const E2 = "eeeeeeee-0000-0000-0000-000000000002"; // estudante SEM consentimento
const pessoas = {
  docente: 1, responsavel: 2, saude: 3, coordenacao: 4, saude2: 5, docente2: 6, estranho: 7, mista: 8,
};
await db.exec(`
  insert into auth.users (id) values ${Object.values(pessoas).map((n) => `('${A(n)}')`).join(",")};
  insert into usuarios (id, auth_user_id, nome, email) values
    ${Object.entries(pessoas).map(([k, n]) => `('${U(n)}','${A(n)}','${k} (fictício)','${k}@example.test')`).join(",")};
  insert into estudantes (id, nome, data_nascimento, turma) values
    ('${E1}','Estudante fictício 1','2017-01-01','4º ano'),
    ('${E2}','Estudante fictício 2','2016-01-01','5º ano');
  insert into vinculos_usuario_estudante (usuario_id, estudante_id, papel, registro_conselho) values
    ('${U(1)}','${E1}','DOCENTE',null),
    ('${U(2)}','${E1}','RESPONSAVEL',null),
    ('${U(3)}','${E1}','PROFISSIONAL_SAUDE','CONSELHO-FICTICIO-1'),
    ('${U(4)}','${E1}','COORDENACAO',null),
    ('${U(5)}','${E1}','PROFISSIONAL_SAUDE','CONSELHO-FICTICIO-2'),
    ('${U(6)}','${E1}','DOCENTE',null),
    ('${U(1)}','${E2}','DOCENTE',null),
    ('${U(4)}','${E2}','COORDENACAO',null),
    -- pessoa "mista": coordenação E docente do mesmo estudante (permitido pela unique atual)
    ('${U(8)}','${E1}','COORDENACAO',null),
    ('${U(8)}','${E1}','DOCENTE',null);
  insert into consentimentos (id, estudante_id, responsavel_id, escopo, status) values
    ('cccccccc-0000-0000-0000-000000000001','${E1}','${U(2)}','observacao_pedagogica, geracao_material','ATIVO');
  insert into ciclos_observacao (id, estudante_id, numero, data_inicio, status) values
    ('dddddddd-0000-0000-0000-000000000001','${E1}',1,current_date,'ABERTO'),
    ('dddddddd-0000-0000-0000-000000000002','${E2}',1,current_date,'ABERTO');
  insert into versoes_perfil (id, estudante_id, numero_ciclo, parametros, status_validacao, data_vigencia) values
    ('ffffffff-0000-0000-0000-000000000001','${E1}',1,'{"maxLinhasPorBloco":4}','VIGENTE',now()),
    ('ffffffff-0000-0000-0000-000000000002','${E1}',2,'{"maxLinhasPorBloco":2}','PENDENTE',null),
    ('ffffffff-0000-0000-0000-000000000003','${E2}',1,'{"maxLinhasPorBloco":4}','VIGENTE',now());
  insert into materiais_adaptados (id, estudante_id, versao_perfil_id, docente_id, texto_original, status_aprovacao) values
    ('99999999-0000-0000-0000-000000000001','${E1}','ffffffff-0000-0000-0000-000000000001','${U(6)}','Rascunho do docente 2','RASCUNHO');
  insert into notas_clinicas (id, estudante_id, profissional_id, conteudo) values
    ('88888888-0000-0000-0000-000000000001','${E1}','${U(3)}','Nota reservada fictícia do profissional 1');
`);

// ------------------------------------------------------------ execução das sondas
async function como(pessoa, sql) {
  const uid = A(pessoas[pessoa]);
  await db.exec("begin");
  try {
    await db.exec(`set local role authenticated; set local request.jwt.claim.sub = '${uid}';`);
    const r = await db.query(sql);
    return { ok: true, linhas: Math.max(r.affectedRows ?? 0, r.rows.length), rows: r.rows };
  } catch (e) {
    return { ok: false, erro: e.message };
  } finally {
    await db.exec("rollback");
  }
}

const resultados = [];
/**
 * @param id      código da sonda (S-nn), citado em AUDITORIA.md
 * @param deveria "NEGAR" | "PERMITIR"
 * @param avaliar (r) => boolean — true se o banco PERMITIU de fato (afetou/leu linhas)
 */
async function sonda(id, descricao, pessoa, sql, deveria, avaliar = (r) => r.ok && r.linhas > 0) {
  const r = await como(pessoa, sql);
  const permitiu = avaliar(r);
  const falha = (deveria === "NEGAR") === permitiu;
  resultados.push({ id, descricao, pessoa, deveria, obtido: permitiu ? "PERMITIU" : "NEGOU", falha, detalhe: r.ok ? `${r.linhas} linha(s)` : r.erro.split("\n")[0] });
}

// --- caminhos que DEVEM ser negados e que a política atual nega (controle)
await sonda("S-01", "Docente lê notas_clinicas (RN02, Exemplo 3)", "docente",
  `select * from notas_clinicas`, "NEGAR");
await sonda("S-02", "Pessoa sem vínculo lê estudantes", "estranho",
  `select * from estudantes`, "NEGAR");
await sonda("S-03", "Docente gera material em estudante SEM consentimento (RN01)", "docente",
  `insert into materiais_adaptados (estudante_id, versao_perfil_id, docente_id, texto_original)
   values ('${E2}','ffffffff-0000-0000-0000-000000000003','${U(1)}','x') returning id`, "NEGAR");

// --- consentimento (RN01/RN08) — falsificação
await sonda("S-04", "Docente CRIA consentimento para estudante sem consentimento, em nome próprio", "docente",
  `insert into consentimentos (estudante_id, responsavel_id, escopo) values ('${E2}','${U(1)}','tudo') returning id`, "NEGAR");
await sonda("S-05", "Pessoa SEM NENHUM vínculo cria consentimento para qualquer estudante", "estranho",
  `insert into consentimentos (estudante_id, responsavel_id, escopo) values ('${E2}','${U(7)}','tudo') returning id`, "NEGAR");
{
  // efeito encadeado: depois de S-04, o docente consegue gerar material no E2
  const uid = A(1);
  await db.exec("begin");
  let r;
  try {
    await db.exec(`set local role authenticated; set local request.jwt.claim.sub = '${uid}';`);
    await db.query(`insert into consentimentos (estudante_id, responsavel_id, escopo) values ('${E2}','${U(1)}','tudo')`);
    r = await db.query(`insert into materiais_adaptados (estudante_id, versao_perfil_id, docente_id, texto_original)
      values ('${E2}','ffffffff-0000-0000-0000-000000000003','${U(1)}','x') returning id`);
    r = { ok: true, linhas: r.rows.length };
  } catch (e) {
    r = { ok: false, erro: e.message };
  } finally {
    await db.exec("rollback");
  }
  resultados.push({ id: "S-06", descricao: "Encadeado: após S-04, docente gera material no estudante sem consentimento real (RN01 contornada)", pessoa: "docente", deveria: "NEGAR", obtido: r.ok ? "PERMITIU" : "NEGOU", falha: r.ok, detalhe: r.ok ? "material criado" : r.erro });
}
await sonda("S-07", "Responsável APAGA o registro de consentimento (destrói trilha, D-06)", "responsavel",
  `delete from consentimentos where estudante_id = '${E1}' returning id`, "NEGAR");
await sonda("S-08", "Responsável MOVE o consentimento para outro estudante (update de estudante_id)", "responsavel",
  `update consentimentos set estudante_id = '${E2}' where estudante_id = '${E1}' returning id`, "NEGAR");

// --- D1: papel arbitrário com dois vínculos
await sonda("S-09", "fn_meu_papel com 2 papéis (COORDENACAO + DOCENTE) devolve um só — qual?", "mista",
  `select fn_meu_papel('${E1}') as papel`, "PERMITIR", (r) => r.ok);
await sonda("S-10", "Pessoa 'mista' (coord + docente) tenta gerar material — depende do papel arbitrário", "mista",
  `insert into materiais_adaptados (estudante_id, versao_perfil_id, docente_id, texto_original)
   values ('${E1}','ffffffff-0000-0000-0000-000000000001','${U(8)}','x') returning id`, "PERMITIR");

// --- D3: coordenação dá a si mesma acesso clínico / de responsável
await sonda("S-11", "Coordenação cria vínculo PROFISSIONAL_SAUDE para SI MESMA", "coordenacao",
  `insert into vinculos_usuario_estudante (usuario_id, estudante_id, papel, registro_conselho)
   values ('${U(4)}','${E1}','PROFISSIONAL_SAUDE','qualquer texto') returning id`, "NEGAR");
await sonda("S-12", "Coordenação muda o PRÓPRIO vínculo para PROFISSIONAL_SAUDE e lê notas_clinicas", "coordenacao",
  `with up as (update vinculos_usuario_estudante set papel = 'PROFISSIONAL_SAUDE'
     where usuario_id = '${U(4)}' and estudante_id = '${E1}' returning 1)
   select (select count(*) from up) as alterou`, "NEGAR", (r) => r.ok && Number(r.rows[0]?.alterou) > 0);
{
  const uid = A(4);
  await db.exec("begin");
  let r;
  try {
    await db.exec(`set local role authenticated; set local request.jwt.claim.sub = '${uid}';`);
    await db.query(`update vinculos_usuario_estudante set papel = 'PROFISSIONAL_SAUDE' where usuario_id = '${U(4)}' and estudante_id = '${E1}'`);
    const q = await db.query(`select conteudo from notas_clinicas`);
    r = { ok: q.rows.length > 0, linhas: q.rows.length };
  } catch (e) {
    r = { ok: false, erro: e.message };
  } finally {
    await db.exec("rollback");
  }
  resultados.push({ id: "S-13", descricao: "Encadeado: após S-12, coordenação LÊ a nota clínica reservada (RN02 quebrada)", pessoa: "coordenacao", deveria: "NEGAR", obtido: r.ok ? "PERMITIU" : "NEGOU", falha: r.ok, detalhe: r.ok ? `${r.linhas} nota(s) lida(s)` : (r.erro ?? "0 linhas") });
}
await sonda("S-14", "Coordenação desativa o vínculo do RESPONSÁVEL legal", "coordenacao",
  `update vinculos_usuario_estudante set status = 'INATIVO' where usuario_id = '${U(2)}' returning id`, "NEGAR");
await sonda("S-15", "Coordenação cria o 1º vínculo de um estudante novo (bootstrap, D2)", "coordenacao",
  `with e as (insert into estudantes (nome, data_nascimento) values ('Novo fictício', '2018-01-01') returning id)
   select id from e`, "PERMITIR", (r) => r.ok && r.linhas > 0);

// --- notas clínicas entre profissionais
await sonda("S-16", "Profissional 2 ALTERA a nota do profissional 1", "saude2",
  `update notas_clinicas set conteudo = 'adulterada' where profissional_id = '${U(3)}' returning id`, "NEGAR");
await sonda("S-16b", "Profissional 2 ASSUME a autoria e reescreve a nota do profissional 1", "saude2",
  `update notas_clinicas set conteudo = 'adulterada', profissional_id = '${U(5)}' where profissional_id = '${U(3)}' returning id`, "NEGAR");
await sonda("S-17", "Profissional 2 APAGA a nota do profissional 1", "saude2",
  `delete from notas_clinicas where profissional_id = '${U(3)}' returning id`, "NEGAR");

// --- materiais (RN04, D-12)
await sonda("S-18", "Responsável lê RASCUNHO de material (D-12)", "responsavel",
  `select * from materiais_adaptados where status_aprovacao = 'RASCUNHO'`, "NEGAR");
await sonda("S-19", "Docente 1 APROVA o rascunho do docente 2", "docente",
  `update materiais_adaptados set status_aprovacao = 'APROVADO' where docente_id = '${U(6)}' returning id`, "NEGAR");
await sonda("S-20", "Docente insere material atribuindo autoria a OUTRO docente", "docente",
  `insert into materiais_adaptados (estudante_id, versao_perfil_id, docente_id, texto_original)
   values ('${E1}','ffffffff-0000-0000-0000-000000000001','${U(6)}','x') returning id`, "NEGAR");
await sonda("S-21", "Docente gera material usando versão PENDENTE (não validada; RN05)", "docente",
  `insert into materiais_adaptados (estudante_id, versao_perfil_id, docente_id, texto_original)
   values ('${E1}','ffffffff-0000-0000-0000-000000000002','${U(1)}','x') returning id`, "NEGAR");
await sonda("S-22", "Docente gera material no E1 usando a versão de perfil do E2", "docente",
  `insert into materiais_adaptados (estudante_id, versao_perfil_id, docente_id, texto_original)
   values ('${E1}','ffffffff-0000-0000-0000-000000000003','${U(1)}','x') returning id`, "NEGAR");
await sonda("S-23", "Desfecho registrado em material RASCUNHO (não aprovado)", "docente2",
  `insert into desfechos (material_id, resultado) values ('99999999-0000-0000-0000-000000000001','ALCANCADO') returning id`, "NEGAR");

// --- versões de perfil (RN07, D-09)
await sonda("S-24", "Profissional reescreve os PARÂMETROS (não só o status) de uma versão", "saude",
  `update versoes_perfil set parametros = '{"maxLinhasPorBloco":99}' where id = 'ffffffff-0000-0000-0000-000000000002' returning id`, "NEGAR");
await sonda("S-25", "Profissional deixa DUAS versões VIGENTE no mesmo estudante", "saude",
  `update versoes_perfil set status_validacao = 'VIGENTE' where id = 'ffffffff-0000-0000-0000-000000000002' returning id`, "NEGAR");

// --- RN08 / D-11 depois da revogação
{
  await db.exec(`update consentimentos set status = 'REVOGADO', data_revogacao = now() where estudante_id = '${E1}'`);
  await sonda("S-26", "Após REVOGAÇÃO: docente registra observação (RN08)", "docente",
    `insert into observacoes (ciclo_id, autor_id, dimensao, valor_escala)
     values ('dddddddd-0000-0000-0000-000000000001','${U(1)}','ATENCAO_SUSTENTADA','ESTAVEL') returning id`, "NEGAR");
  await sonda("S-27", "Após REVOGAÇÃO: docente continua lendo versões de perfil (D-11)", "docente",
    `select * from versoes_perfil where estudante_id = '${E1}'`, "NEGAR");
  await sonda("S-28", "Após REVOGAÇÃO: docente aprova material (RN08)", "docente2",
    `update materiais_adaptados set status_aprovacao = 'APROVADO' where id = '99999999-0000-0000-0000-000000000001' returning id`, "NEGAR");
  await db.exec(`update consentimentos set status = 'ATIVO', data_revogacao = null where estudante_id = '${E1}'`);
}

// --- funções security definer
{
  const { rows } = await db.query(`
    select p.proname, p.prosecdef, coalesce(array_to_string(p.proconfig, ','), '') as config
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef`);
  const semPath = rows.filter((r) => !r.config.includes("search_path"));
  resultados.push({ id: "S-29", descricao: `Funções SECURITY DEFINER sem search_path fixo: ${semPath.map((r) => r.proname).join(", ") || "nenhuma"}`, pessoa: "—", deveria: "NEGAR", obtido: semPath.length ? "PERMITIU" : "NEGOU", falha: semPath.length > 0, detalhe: "linter Supabase 0011_function_search_path_mutable" });
}
await sonda("S-30", "Pessoa sem vínculo consulta se um estudante qualquer tem consentimento (oráculo)", "estranho",
  `select fn_tem_consentimento_ativo('${E1}') as tem`, "NEGAR", (r) => r.ok && r.rows[0]?.tem === true);

// ------------------------------------------------------------ relatório
const pad = (s, n) => String(s).padEnd(n);
console.log(`\n${pad("Sonda", 6)} ${pad("Deveria", 9)} ${pad("Obtido", 9)} Resultado  Descrição`);
for (const r of resultados) {
  console.log(`${pad(r.id, 6)} ${pad(r.deveria, 9)} ${pad(r.obtido, 9)} ${r.falha ? "FALHA    " : "ok       "}  ${r.descricao} [${r.pessoa}; ${r.detalhe}]`);
}
const falhas = resultados.filter((r) => r.falha).length;
console.log(`\n${resultados.length} sondas · ${falhas} falhas confirmadas · ${resultados.length - falhas} ok`);
console.log("Obs.: S-09 mostra o papel que fn_meu_papel escolheu; S-10 depende dessa escolha (D1).");
const s09 = await como("mista", `select fn_meu_papel('${E1}') as papel`);
console.log(`S-09 → fn_meu_papel devolveu: ${s09.rows?.[0]?.papel}`);
await db.close();
