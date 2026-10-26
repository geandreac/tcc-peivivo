/**
 * Migration 0010 (D-47): limites de texto livre no banco e cache de material
 * sem corrida. Caminho NEGADO primeiro (texto acima do limite), depois o
 * permitido (exatamente no limite). A corrida real entre duas conexões só
 * roda com DATABASE_URL (Postgres do job `db` do CI), porque o PGlite tem uma
 * conexão só; ali os dados vêm do seed confirmado e são apagados no final.
 */
import { LIMITE_EVIDENCIA, LIMITE_NOTA_CLINICA, LIMITE_OBSERVACAO_DESFECHO } from "@pei-vivo/contratos";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ID, abrirBanco, usuarioId, type Banco, type Resultado } from "./banco";

let db: Banco;
beforeAll(async () => {
  db = await abrirBanco();
});
afterAll(async () => {
  await db?.fechar();
});

const VIOLA_CHECK = "23514";
const recusado = (r: Resultado) => {
  expect(r.ok, "esperava recusa; veio ok").toBe(false);
  expect(r.codigo, r.mensagem).toBe(VIOLA_CHECK);
};
const aceito = (r: Resultado) => expect(r.ok, r.mensagem).toBe(true);
const observacao = (n: number) => `insert into observacoes (ciclo_id, dimensao, valor_escala, evidencia) values ('${ID.cicloE1}','FADIGA_TAREFA','REDUZIDA', repeat('x', ${n}))`;
const desfecho = (n: number) => `insert into desfechos (material_id, resultado, observacao_livre) values ('${ID.aprovadoDocente}','PARCIAL', repeat('x', ${n}))`;
const nota = (n: number) => `select fn_registrar_nota_clinica('${ID.e1}', repeat('x', ${n}))`;

describe("0010 · texto livre acima do limite é recusado pelo banco (negado primeiro)", () => {
  it("evidência da observação", async () => {
    recusado(await db.como("docente", observacao(LIMITE_EVIDENCIA + 1)));
    recusado(await db.como("docente", observacao(1_000_000))); // a sonda da auditoria: 1 MB
  });
  it("observação livre do desfecho", async () => {
    recusado(await db.como("docente", desfecho(LIMITE_OBSERVACAO_DESFECHO + 1)));
  });
  it("nota clínica, mesmo pela RPC auditada do profissional (aal2)", async () => {
    recusado(await db.como("saude", nota(LIMITE_NOTA_CLINICA + 1)));
  });
  it("nem o service role contorna o limite", async () => {
    const comAutor = `insert into observacoes (autor_id, papel_autor, ciclo_id, dimensao, valor_escala, evidencia)
      values ('${usuarioId("docente")}','DOCENTE','${ID.cicloE1}','FADIGA_TAREFA','REDUZIDA', repeat('x', ${LIMITE_EVIDENCIA + 1}))`;
    recusado(await db.sistema(comAutor));
  });
});

describe("0010 · exatamente no limite continua permitido", () => {
  it("evidência, desfecho e nota clínica com o tamanho máximo", async () => {
    aceito(await db.como("docente", observacao(LIMITE_EVIDENCIA)));
    aceito(await db.como("docente", desfecho(LIMITE_OBSERVACAO_DESFECHO)));
    aceito(await db.como("saude", nota(LIMITE_NOTA_CLINICA)));
  });
  it("os números do banco são os de @pei-vivo/contratos", async () => {
    const r = await db.sistema(
      "select conname, pg_get_constraintdef(oid) as def from pg_constraint where conname in ('ck_observacao_evidencia_tamanho','ck_desfecho_observacao_tamanho','ck_nota_clinica_tamanho') order by conname",
    );
    const defs = Object.fromEntries(r.rows.map((x) => [String(x.conname), String(x.def)]));
    expect(defs.ck_observacao_evidencia_tamanho).toContain(`<= ${LIMITE_EVIDENCIA}`);
    expect(defs.ck_desfecho_observacao_tamanho).toContain(`<= ${LIMITE_OBSERVACAO_DESFECHO}`);
    expect(defs.ck_nota_clinica_tamanho).toContain(`<= ${LIMITE_NOTA_CLINICA}`);
  });
});

describe("0010 · cache de material sem rascunho duplicado", () => {
  it("fn_registrar_material serializa a chave do cache antes de consultar", async () => {
    const r = await db.sistema("select pg_get_functiondef('public.fn_registrar_material(uuid,uuid,uuid,text,text,jsonb,text,boolean)'::regprocedure) as def");
    const def = String(r.rows[0]?.def);
    expect(def.indexOf("pg_advisory_xact_lock")).toBeGreaterThan(-1);
    expect(def.indexOf("pg_advisory_xact_lock")).toBeLessThan(def.indexOf("from public.materiais_adaptados"));
  });

  const url = process.env.DATABASE_URL;
  it.skipIf(!url)("duas conexões simultâneas com o mesmo texto geram um único rascunho (Postgres real)", async () => {
    const { default: pg } = await import("pg");
    const [a, b] = [new pg.Client({ connectionString: url }), new pg.Client({ connectionString: url })];
    await Promise.all([a.connect(), b.connect()]);
    const hash = `corrida-${Date.now()}`;
    // seed.sql (confirmado pelo `supabase db reset` do CI): docente 01, estudante 10, versão vigente 30
    const chamada = `select public.fn_registrar_material('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000010',
      '00000000-0000-0000-0000-000000000030','Corrida (fictício)','Texto fictício','{"blocos":[]}'::jsonb,'${hash}',false) as r`;
    try {
      await a.query("begin");
      await b.query("begin");
      const r1 = await a.query(chamada); // A grava e segura a trava até o commit
      const pendenteB = b.query(chamada); // B espera a trava de A
      await new Promise((ok) => setTimeout(ok, 300));
      await a.query("commit");
      const r2 = await pendenteB;
      await b.query("commit");
      expect(r1.rows[0].r.emCache).toBe(false);
      expect(r2.rows[0].r).toEqual({ materialId: r1.rows[0].r.materialId, emCache: true });
      const { rows } = await a.query("select count(*)::int as n from public.materiais_adaptados where hash_texto = $1", [hash]);
      expect(rows[0].n).toBe(1);
    } finally {
      await a.query("rollback").catch(() => undefined);
      await b.query("rollback").catch(() => undefined);
      await a.query("delete from public.materiais_adaptados where hash_texto = $1", [hash]);
      await Promise.all([a.end(), b.end()]);
    }
  });
});
