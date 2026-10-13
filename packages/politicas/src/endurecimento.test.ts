/**
 * Endurecimento (migration 0008, D-46): `anon` sem nenhuma RPC, índice em toda
 * chave estrangeira e saída do docente da escola encerrando os vínculos.
 * Caminho NEGADO primeiro. Dados 100 % fictícios (fixture de banco.ts).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ID, NEGADO, abrirBanco, usuarioId, type Banco, type Resultado } from "./banco";

let db: Banco;
let membroDocente: string;
let membroCoordenacao: string;
beforeAll(async () => {
  db = await abrirBanco();
  const membro = async (pessoa: "docente" | "coordenacao", papel: string) => {
    const r = await db.sistema(
      `select id from membros_escola where usuario_id = '${usuarioId(pessoa)}' and papel = '${papel}' and status = 'ATIVO'`,
    );
    return String(r.rows[0]?.id);
  };
  membroDocente = await membro("docente", "DOCENTE");
  membroCoordenacao = await membro("coordenacao", "COORDENACAO");
});
afterAll(async () => {
  await db?.fechar();
});

const negado = (r: Resultado | undefined) => {
  expect(r?.ok, "esperava negação").toBe(false);
  expect(r?.codigo, r?.mensagem).toBe(NEGADO);
};
const ok = (r: Resultado | undefined) => {
  expect(r?.ok, r?.mensagem).toBe(true);
  return r!.rows;
};
const encerrar = (membro: string) => `select fn_encerrar_membro('${membro}')`;

describe("anon não executa RPC", () => {
  it("nenhuma função do schema public é executável por anon", async () => {
    const rows = ok(
      await db.sistema(`select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                         where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute')`),
    );
    expect(rows.map((r) => r.proname)).toEqual([]);
  });
  it("chamada direta como anon é negada por privilégio, antes de qualquer regra", async () => {
    for (const sql of [
      `select * from fn_ler_notas_clinicas('${ID.e1}')`,
      `select * from fn_listar_auditoria('${ID.e1}')`,
      `select fn_cadastrar_estudante('${ID.escola1}', 'Estudante fictício', '2017-01-01')`,
      `select fn_meu_papel('${ID.e1}')`,
      encerrar("00000000-0000-0000-0000-000000000000"),
    ]) {
      const r = await db.como("anon", sql);
      negado(r);
      expect(r.mensagem, sql).toMatch(/permission denied/);
    }
  });
  it("função criada por migration futura também nasce fechada para anon e authenticated", async () => {
    const r = ok(
      await db.sistema([
        "create function public.fn_futura_teste() returns int language sql as 'select 1'",
        `select has_function_privilege('anon', 'public.fn_futura_teste()', 'execute') as anon,
                has_function_privilege('authenticated', 'public.fn_futura_teste()', 'execute') as autenticado`,
      ]),
    );
    expect(r[0]).toEqual({ anon: false, autenticado: false });
  });
  it("authenticated continua executando as RPCs que o app usa", async () => {
    expect(ok(await db.como("docente", `select fn_meu_papel('${ID.e1}') as p`))[0]?.p).toBe("DOCENTE");
  });
});

describe("Índices", () => {
  it("toda chave estrangeira do schema public tem índice começando por ela", async () => {
    const rows = ok(
      await db.sistema(`select c.conrelid::regclass || '.' || a.attname as fk
                          from pg_constraint c
                          join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
                         where c.contype = 'f' and c.connamespace = 'public'::regnamespace
                           and not exists (select 1 from pg_index i
                                            where i.indrelid = c.conrelid and i.indkey[0] = c.conkey[1])`),
    );
    expect(rows.map((r) => r.fk)).toEqual([]);
  });
});

describe("Saída do docente da escola (fn_encerrar_membro)", () => {
  it("docente, responsável e profissional não encerram membros", async () => {
    negado(await db.como("docente2", encerrar(membroDocente)));
    negado(await db.como("responsavel", encerrar(membroDocente)));
    negado(await db.como("saude", encerrar(membroDocente)));
  });
  it("coordenação sem segundo fator e coordenação de outra escola são negadas", async () => {
    negado(await db.como("coordenacao", encerrar(membroDocente), { aal: "aal1" }));
    negado(await db.como("coordOutraEscola", encerrar(membroDocente)));
  });
  it("coordenação não encerra coordenação (nem a si mesma) e não edita membros_escola direto", async () => {
    negado(await db.como("coordenacao", encerrar(membroCoordenacao)));
    negado(await db.como("coordenacao", `update membros_escola set status = 'ENCERRADO' where id = '${membroDocente}'`));
  });
  it("membro inexistente é negado sem revelar se existe", async () => {
    negado(await db.como("coordenacao", encerrar("00000000-0000-0000-0000-000000000000")));
  });
  it("encerrar duas vezes é conflito", async () => {
    const r = await db.fluxo([
      { ator: "coordenacao", sql: encerrar(membroDocente) },
      { ator: "coordenacao", sql: encerrar(membroDocente) },
    ]);
    expect(r[0]?.ok, r[0]?.mensagem).toBe(true);
    expect(r[1]?.codigo).toBe("PT409");
  });
  it("encerrar o docente encerra os vínculos dele na escola, corta o acesso e audita; o colega não é afetado", async () => {
    const r = await db.fluxo([
      { ator: "docente", sql: "select count(*)::int as n from estudantes" },
      { ator: "coordenacao", sql: encerrar(membroDocente) },
      {
        ator: "sistema",
        sql: `select status, encerrado_por from vinculos_usuario_estudante
               where usuario_id = '${usuarioId("docente")}' and papel = 'DOCENTE'`,
      },
      { ator: "docente", sql: "select count(*)::int as n from estudantes" },
      { ator: "docente", sql: `select count(*)::int as n from ciclos_observacao where estudante_id = '${ID.e1}'` },
      { ator: "docente2", sql: `select fn_meu_papel('${ID.e1}') as p` },
      { ator: "coordenacao", sql: `select evento from fn_listar_auditoria('${ID.e1}')` },
      { ator: "sistema", sql: "select evento, papel_autor from auditoria where evento = 'MEMBRO_ENCERRADO'" },
    ]);
    expect(ok(r[0])[0]?.n).toBe(2);
    expect(ok(r[2])).toEqual([
      { status: "ENCERRADO", encerrado_por: usuarioId("coordenacao") },
      { status: "ENCERRADO", encerrado_por: usuarioId("coordenacao") },
    ]);
    expect(ok(r[3])[0]?.n).toBe(0);
    expect(ok(r[4])[0]?.n).toBe(0);
    expect(ok(r[5])[0]?.p).toBe("DOCENTE");
    expect(ok(r[6]).map((x) => x.evento)).toContain("VINCULO_ENCERRADO");
    expect(ok(r[7])).toEqual([{ evento: "MEMBRO_ENCERRADO", papel_autor: "COORDENACAO" }]);
  });
  it("depois de sair, o docente não pode ser revinculado sem novo convite", async () => {
    const r = await db.fluxo([
      { ator: "coordenacao", sql: encerrar(membroDocente) },
      { ator: "coordenacao", sql: `select fn_propor_vinculo('${ID.e1}', '${usuarioId("docente")}', 'DOCENTE')` },
    ]);
    expect(r[1]?.codigo).toBe("PT409");
  });
  it("o script de implantação (service role) também dispara o encerramento dos vínculos", async () => {
    const r = await db.fluxo([
      { ator: "sistema", sql: `update membros_escola set status = 'ENCERRADO', encerrado_em = now() where id = '${membroDocente}'` },
      {
        ator: "sistema",
        sql: `select count(*)::int as n from vinculos_usuario_estudante
               where usuario_id = '${usuarioId("docente")}' and status = 'ATIVO'`,
      },
      { ator: "sistema", sql: "select papel_autor from auditoria where evento = 'MEMBRO_ENCERRADO'" },
    ]);
    expect(ok(r[1])[0]?.n).toBe(0);
    expect(ok(r[2])[0]?.papel_autor).toBe("SISTEMA");
  });
});
