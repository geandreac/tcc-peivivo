/**
 * Portas de banco das Edge Functions (migration 0006, R3, D-37): o cliente só
 * alcança "preparar" (como ele mesmo); "registrar" é exclusivo do service role
 * e revalida tudo. Caminho NEGADO primeiro.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ID, NEGADO, PARAMETROS_OK, abrirBanco, usuarioId, type Banco, type Resultado } from "./banco";

let db: Banco;
beforeAll(async () => {
  db = await abrirBanco();
});
afterAll(async () => {
  await db?.fechar();
});

const negado = (r: Resultado | undefined) => {
  expect(r?.ok, `esperava negação; veio ok`).toBe(false);
  expect(r?.codigo, r?.mensagem).toBe(NEGADO);
};
const conflito = (r: Resultado | undefined) => {
  expect(r?.ok).toBe(false);
  expect(r?.codigo, r?.mensagem).toBe("PT409");
};
const ok = (r: Resultado | undefined) => {
  expect(r?.ok, r?.mensagem).toBe(true);
  return r!.rows;
};

const P = JSON.stringify(PARAMETROS_OK);
const ADAPTADO = JSON.stringify({ blocos: [{ linhas: ["texto fictício"] }], enunciados: [], parametros: PARAMETROS_OK, blocosExcedentes: [] });
const registrarMaterial = (docente: string, versao: string = ID.vigenteE1, ia = false, hash = "h1") =>
  `select fn_registrar_material('${docente}','${ID.e1}','${versao}','Título','Texto fictício','${ADAPTADO}','${hash}',${ia}) as r`;
const observar = { ator: "docente" as const, sql: `insert into observacoes (ciclo_id, dimensao, valor_escala) values ('${ID.cicloE1}','FADIGA_TAREFA','REDUZIDA')` };

// =============================================================================
describe("gerar-material · fn_preparar_geracao (como o usuário)", () => {
  it("responsável, profissional e coordenação não preparam geração (D-02)", async () => {
    for (const p of ["responsavel", "saude", "coordenacao"] as const) negado(await db.como(p, `select fn_preparar_geracao('${ID.e1}')`));
  });
  it("RN01: docente sem consentimento de geração é negado", async () => {
    negado(await db.como("docente", `select fn_preparar_geracao('${ID.e2}')`));
  });
  it("PERMITIDO: docente recebe a versão VIGENTE, seus parâmetros e se a IA é permitida (RN06)", async () => {
    const r = ok(await db.como("docente", `select fn_preparar_geracao('${ID.e1}') as p`))[0]?.p as Record<string, unknown>;
    expect(r).toMatchObject({ docenteId: usuarioId("docente"), versaoId: ID.vigenteE1, iaPermitida: true, revisaoEmAndamento: true });
    expect(r.parametros).toEqual(PARAMETROS_OK);
  });
  it("RN06: sem profissional ativo, IA não é permitida", async () => {
    const r = await db.fluxo([
      { ator: "sistema", sql: `update vinculos_usuario_estudante set status = 'ENCERRADO' where papel = 'PROFISSIONAL_SAUDE' and estudante_id = '${ID.e1}'` },
      { ator: "docente", sql: `select fn_preparar_geracao('${ID.e1}') as p` },
    ]);
    expect((ok(r[1])[0]?.p as { iaPermitida: boolean }).iaPermitida).toBe(false);
  });
});

describe("gerar-material · fn_registrar_material (só service role)", () => {
  it("docente não chama a porta de gravação direto (não forja texto adaptado)", async () => {
    negado(await db.como("docente", registrarMaterial(usuarioId("docente"))));
  });
  it("service role não grava para quem não é docente ativo do estudante", async () => {
    negado(await db.como("servico", registrarMaterial(usuarioId("responsavel"))));
    negado(await db.como("servico", registrarMaterial(usuarioId("estranho"))));
  });
  it("RN05: não grava com versão que não é a vigente", async () => {
    conflito(await db.como("servico", registrarMaterial(usuarioId("docente"), ID.pendenteE1)));
  });
  it("RN06: não grava 'IA aplicada' sem profissional ativo", async () => {
    const r = await db.fluxo([
      { ator: "sistema", sql: `update vinculos_usuario_estudante set status = 'ENCERRADO' where papel = 'PROFISSIONAL_SAUDE' and estudante_id = '${ID.e1}'` },
      { ator: "servico", sql: registrarMaterial(usuarioId("docente"), ID.vigenteE1, true) },
    ]);
    negado(r[1]);
  });
  it("PERMITIDO: grava rascunho do docente; mesmo texto e versão devolve o mesmo material (cache)", async () => {
    const r = await db.fluxo([
      { ator: "servico", sql: registrarMaterial(usuarioId("docente")) },
      { ator: "servico", sql: registrarMaterial(usuarioId("docente")) },
      { ator: "docente", sql: `select status_aprovacao, docente_id, texto_adaptado from materiais_adaptados where hash_texto = 'h1'` },
      { ator: "responsavel", sql: `select id from materiais_adaptados where hash_texto = 'h1'` },
    ]);
    const a = ok(r[0])[0]?.r as { materialId: string; emCache: boolean };
    const b = ok(r[1])[0]?.r as { materialId: string; emCache: boolean };
    expect(a.emCache).toBe(false);
    expect(b).toEqual({ materialId: a.materialId, emCache: true });
    expect(ok(r[2])[0]).toMatchObject({ status_aprovacao: "RASCUNHO", docente_id: usuarioId("docente") });
    expect(ok(r[3])).toHaveLength(0); // rascunho invisível à família (RN04)
  });
  it("RN08: depois da revogação, nem o service role grava", async () => {
    const r = await db.fluxo([
      { ator: "responsavel", sql: `select fn_revogar_consentimento('${ID.e1}')` },
      { ator: "servico", sql: registrarMaterial(usuarioId("docente")) },
    ]);
    negado(r[1]);
  });
});

// =============================================================================
describe("fechar-ciclo · fn_dados_fechamento (como o usuário)", () => {
  it("responsável e profissional não fecham ciclo", async () => {
    negado(await db.como("responsavel", `select fn_dados_fechamento('${ID.cicloE1}')`));
    negado(await db.como("saude", `select fn_dados_fechamento('${ID.cicloE1}')`));
  });
  it("ciclo sem observação ou já fechado é conflito", async () => {
    conflito(await db.como("docente", `select fn_dados_fechamento('${ID.cicloE1}')`));
    conflito(await db.como("docente", `select fn_dados_fechamento('${ID.cicloFechadoE1}')`));
  });
  it("PERMITIDO: devolve histórico, vigente e se haverá validação clínica", async () => {
    const r = await db.fluxo([observar, { ator: "docente", sql: `select fn_dados_fechamento('${ID.cicloE1}') as d` }]);
    const d = ok(r[1])[0]?.d as { numeroCiclo: number; vigente: { id: string }; validacaoClinica: boolean; historico: unknown[] };
    expect(d.numeroCiclo).toBe(3);
    expect(d.vigente.id).toBe(ID.vigenteE1);
    expect(d.validacaoClinica).toBe(true);
    expect(d.historico).toContainEqual({ numeroCiclo: 3, dimensao: "FADIGA_TAREFA", valorEscala: "REDUZIDA", evidencia: null });
  });
});

describe("fechar-ciclo · fn_registrar_fechamento (só service role)", () => {
  const registrar = (docente: string, params = P) => `select fn_registrar_fechamento('${docente}','${ID.cicloE1}','${params}') as r`;
  it("docente não chama a porta de gravação direto (não inventa versão de perfil)", async () => {
    negado(await db.como("docente", registrar(usuarioId("docente"))));
  });
  it("service role não fecha em nome de quem não é docente; parâmetros inválidos são recusados", async () => {
    const r = await db.fluxo([observar, { ator: "servico", sql: registrar(usuarioId("responsavel")) }]);
    negado(r[1]);
    const s = await db.fluxo([observar, { ator: "servico", sql: registrar(usuarioId("docente"), '{"maxLinhasPorBloco": 99}') }]);
    expect(s[1]?.codigo).toBe("22023");
  });
  it("PERMITIDO com profissional: nova versão PENDENTE, a vigente continua, ciclo fecha e o próximo abre", async () => {
    const r = await db.fluxo([
      observar,
      { ator: "servico", sql: registrar(usuarioId("docente")) },
      { ator: "sistema", sql: `select numero_ciclo, status_validacao from versoes_perfil where estudante_id = '${ID.e1}' order by created_at` },
      { ator: "sistema", sql: `select numero, status from ciclos_observacao where estudante_id = '${ID.e1}' order by numero` },
      { ator: "saude", sql: `select tipo from notificacoes where tipo = 'VALIDACAO_PENDENTE'` },
    ]);
    expect(ok(r[1])[0]?.r).toMatchObject({ statusValidacao: "PENDENTE", modoPedagogico: false });
    // a pendente anterior (ciclo 2) foi substituída pela nova proposta
    expect(ok(r[2]).map((x) => `${x.numero_ciclo}:${x.status_validacao}`)).toEqual(["1:VIGENTE", "2:SUBSTITUIDA", "3:PENDENTE"]);
    expect(ok(r[3]).map((x) => `${x.numero}:${x.status}`)).toEqual(["1:FECHADO", "3:FECHADO", "4:ABERTO"]);
    expect(ok(r[4])).toHaveLength(2); // 1 da proposta da fixture (ciclo 2) + 1 do fechamento
  });
  it("PERMITIDO sem profissional (RN06): nova versão já VIGENTE; a anterior vira SUBSTITUIDA", async () => {
    const r = await db.fluxo([
      { ator: "sistema", sql: `update vinculos_usuario_estudante set status = 'ENCERRADO' where papel = 'PROFISSIONAL_SAUDE' and estudante_id = '${ID.e1}'` },
      observar,
      { ator: "servico", sql: registrar(usuarioId("docente")) },
      { ator: "sistema", sql: `select count(*)::int as n from versoes_perfil where estudante_id = '${ID.e1}' and status_validacao = 'VIGENTE'` },
    ]);
    expect(ok(r[2])[0]?.r).toMatchObject({ statusValidacao: "VIGENTE", modoPedagogico: true });
    expect(ok(r[3])[0]?.n).toBe(1);
  });
});
