/**
 * Migration 0011 (D-48): painel da escola agregado no banco e trilha de
 * auditoria paginada. Caminho NEGADO primeiro. Os testes com mais de 1000
 * linhas provam que a contagem e a paginação não dependem do corte do
 * PostgREST (`max_rows = 1000`). Dados 100 % fictícios, desfeitos no savepoint.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ID, NEGADO, abrirBanco, type Banco, type Resultado } from "./banco";

let db: Banco;
beforeAll(async () => {
  db = await abrirBanco();
});
afterAll(async () => {
  await db?.fechar();
});

const negado = (r: Resultado | undefined) => {
  expect(r?.ok, "esperava negação; veio ok").toBe(false);
  expect(r?.codigo, r?.mensagem).toBe(NEGADO);
};
const ok = (r: Resultado | undefined) => {
  expect(r?.ok, r?.mensagem).toBe(true);
  return r!.rows;
};
const resumo = `select fn_resumo_escola('${ID.escola1}') as r`;
const auditoria = (limite = "null", deslocamento = "0") => `select * from fn_listar_auditoria('${ID.e1}', ${limite}, ${deslocamento})`;
/** 1100 estudantes fictícios a mais na escola 1, todos sem consentimento. */
const MUITOS_ESTUDANTES = `insert into estudantes (escola_id, nome, data_nascimento)
  select '${ID.escola1}', 'Estudante fictício em massa ' || g, '2017-01-01' from generate_series(1, 1100) g`;
/** 1100 eventos fictícios na trilha do estudante 1. */
const MUITOS_EVENTOS = `insert into auditoria (escola_id, estudante_id, evento, entidade, entidade_id, papel_autor, criado_em)
  select '${ID.escola1}', '${ID.e1}', 'CONSENTIMENTO_CONCEDIDO', 'consentimentos', '${ID.e1}', 'SISTEMA', now() - g * interval '1 minute'
    from generate_series(1, 1100) g`;

describe("fn_resumo_escola · negado primeiro", () => {
  it("docente, responsável, profissional e anônimo não abrem o painel", async () => {
    for (const p of ["docente", "responsavel", "saude"] as const) negado(await db.como(p, resumo));
    const anon = await db.como("anon", resumo);
    expect(anon.ok).toBe(false);
  });
  it("coordenação sem segundo fator (aal1) é negada", async () => {
    negado(await db.como("coordenacao", resumo, { aal: "aal1" }));
  });
  it("coordenação de outra escola é negada", async () => {
    negado(await db.como("coordOutraEscola", resumo));
  });
});

describe("fn_resumo_escola · permitido", () => {
  it("coordenação da escola (aal2) recebe só contagens e pendências acionáveis", async () => {
    const r = ok(await db.como("coordenacao", resumo))[0]!.r as Record<string, unknown>;
    expect(r).toMatchObject({ totalEstudantes: 2, comConsentimento: 1, semConsentimento: 1, semProfissional: 0, validacoesAtrasadas: 0, ciclosParados: 0 });
    expect(r.pendencias).toEqual([expect.objectContaining({ estudanteId: ID.e2, motivo: "SEM_CONSENTIMENTO" })]);
  });
  it("validação pendente há 5 dias e ciclo aberto há 16 dias sem observação viram pendência", async () => {
    const [, , , r] = await db.fluxo([
      { ator: "sistema", sql: `update versoes_perfil set created_at = now() - interval '5 days' where id = '${ID.pendenteE1}'` },
      { ator: "sistema", sql: `update ciclos_observacao set data_inicio = current_date - 16 where id = '${ID.cicloE1}'` },
      { ator: "sistema", sql: `delete from observacoes where ciclo_id = '${ID.cicloE1}'` },
      { ator: "coordenacao", sql: resumo },
    ]);
    const v = ok(r)[0]!.r as { validacoesAtrasadas: number; ciclosParados: number; pendencias: { motivo: string }[] };
    expect([v.validacoesAtrasadas, v.ciclosParados]).toEqual([1, 1]);
    expect(v.pendencias.map((p) => p.motivo)).toEqual(expect.arrayContaining(["VALIDACAO_ATRASADA", "CICLO_PARADO"]));
  });
  it("mais de 1000 estudantes: a contagem é exata (não depende do corte do PostgREST)", async () => {
    const [, r] = await db.fluxo([
      { ator: "sistema", sql: MUITOS_ESTUDANTES },
      { ator: "coordenacao", sql: resumo },
    ]);
    const v = ok(r)[0]!.r as { totalEstudantes: number; semConsentimento: number; pendencias: unknown[] };
    expect([v.totalEstudantes, v.semConsentimento, v.pendencias.length]).toEqual([1102, 1101, 1101]);
  });
});

describe("fn_listar_auditoria paginada · negado primeiro", () => {
  it("docente e profissional continuam sem acesso à trilha, com ou sem paginação", async () => {
    negado(await db.como("docente", auditoria("20")));
    negado(await db.como("saude", auditoria()));
  });
  it("limite zero ou deslocamento negativo são recusados (22023)", async () => {
    expect((await db.como("responsavel", auditoria("0"))).codigo).toBe("22023");
    expect((await db.como("responsavel", auditoria("10", "-1"))).codigo).toBe("22023");
  });
});

describe("fn_listar_auditoria paginada · permitido", () => {
  it("com mais de 1000 eventos: página de 20, a seguinte não repete, e sem limite vem tudo", async () => {
    const r = await db.fluxo([
      { ator: "sistema", sql: MUITOS_EVENTOS },
      { ator: "responsavel", sql: auditoria("20") },
      { ator: "responsavel", sql: auditoria("20", "20") },
      { ator: "responsavel", sql: auditoria() },
    ]);
    const [, p1, p2, tudo] = r.map((x) => ok(x));
    expect(p1!.length).toBe(20);
    expect(p2!.length).toBe(20);
    // ordem decrescente: o primeiro da página 2 é mais antigo que o último da página 1
    expect(new Date(String(p2![0]!.criado_em)).getTime()).toBeLessThan(new Date(String(p1![19]!.criado_em)).getTime());
    expect(tudo!.length).toBeGreaterThanOrEqual(1100);
  });
  it("a chamada antiga, só com o estudante, continua funcionando (padrão: tudo)", async () => {
    ok(await db.como("coordenacao", `select * from fn_listar_auditoria('${ID.e1}')`));
  });
});
