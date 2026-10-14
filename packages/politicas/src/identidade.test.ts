/**
 * Identidade real (migration 0007, R2, D-32): perfil da sessão, aceite de termos
 * e portas do convite. Caminho NEGADO primeiro.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ID, NEGADO, abrirBanco, usuarioId, type Banco, type Resultado } from "./banco";

let db: Banco;
beforeAll(async () => {
  db = await abrirBanco();
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
const preparar = (email: string, papel: string, extra = "null, null, false") =>
  `select fn_preparar_convite('${ID.escola1}', '${email}', '${papel}', ${extra}) as r`;
const registrar = (autor: string, email: string, papel: string, estudante = "null", registro = "null", conferido = "false") =>
  `select fn_registrar_convite('${autor}', null, 'Pessoa fictícia', '${email}', '${ID.escola1}', '${papel}', ${estudante}, ${registro}, ${conferido}) as r`;

describe("fn_meu_perfil (sessão)", () => {
  it("anon não tem perfil; cada pessoa vê só o próprio, com a exigência de segundo fator correta", async () => {
    negado(await db.como("anon", "select fn_meu_perfil()"));
    const docente = ok(await db.como("docente", "select fn_meu_perfil() as p"))[0]?.p as Record<string, unknown>;
    expect(docente).toMatchObject({ id: usuarioId("docente"), exigeSegundoFator: false, escolaCoordenada: null });
    const coord = ok(await db.como("coordenacao", "select fn_meu_perfil() as p"))[0]?.p as Record<string, unknown>;
    expect(coord).toMatchObject({ exigeSegundoFator: true, escolaCoordenada: ID.escola1 });
    const saude = ok(await db.como("saude", "select fn_meu_perfil() as p", { aal: "aal1" }))[0]?.p as Record<string, unknown>;
    expect(saude.exigeSegundoFator).toBe(true);
  });
  it("aceite de termos registra versão e data", async () => {
    const r = await db.fluxo([
      { ator: "responsavel", sql: "select fn_aceitar_termos('termos-v1')" },
      { ator: "responsavel", sql: "select fn_meu_perfil() as p" },
    ]);
    expect((ok(r[1])[0]?.p as { termosVersao: string }).termosVersao).toBe("termos-v1");
  });
});

describe("Convites — preparar (como a coordenação)", () => {
  it("docente, responsável e coordenação sem segundo fator não convidam", async () => {
    negado(await db.como("docente", preparar("novo@example.test", "DOCENTE")));
    negado(await db.como("responsavel", preparar("novo@example.test", "DOCENTE")));
    negado(await db.como("coordenacao", preparar("novo@example.test", "DOCENTE"), { aal: "aal1" }));
  });
  it("coordenação de outra escola não convida para a escola 1", async () => {
    negado(await db.como("coordOutraEscola", preparar("novo@example.test", "DOCENTE")));
  });
  it("dados inválidos: e-mail, papel, estudante, conferência presencial, registro", async () => {
    for (const sql of [
      preparar("sem-arroba", "DOCENTE"),
      preparar("novo@example.test", "COORDENACAO"),
      preparar("novo@example.test", "RESPONSAVEL", "null, null, true"),
      preparar("novo@example.test", "RESPONSAVEL", `'${ID.e1}', null, false`),
      preparar("novo@example.test", "PROFISSIONAL_SAUDE", `'${ID.e1}', '  ', false`),
      preparar("novo@example.test", "RESPONSAVEL", `'${ID.e3}', null, true`), // estudante de outra escola
    ]) {
      const r = await db.como("coordenacao", sql);
      expect(r.codigo, sql).toBe("22023");
    }
  });
  it("ninguém convida a si mesmo", async () => {
    negado(await db.como("coordenacao", preparar("coordenacao@example.test", "DOCENTE")));
  });
  it("PERMITIDO: coordenação com aal2 prepara convite e sabe se a pessoa já tem conta", async () => {
    const r = ok(await db.como("coordenacao", preparar("  NOVO@Example.TEST ", "DOCENTE")))[0]?.r as Record<string, unknown>;
    expect(r).toEqual({ autorId: usuarioId("coordenacao"), email: "novo@example.test", jaTemConta: false });
  });
});

describe("Convites — registrar (só service role)", () => {
  it("cliente não registra convite direto", async () => {
    negado(await db.como("coordenacao", registrar(usuarioId("coordenacao"), "x@example.test", "DOCENTE")));
  });
  it("D-25: service role também recusa responsável sem conferência presencial (revalidação)", async () => {
    const r = await db.como("servico", registrar(usuarioId("coordenacao"), "resp.sem.conferencia@example.test", "RESPONSAVEL", `'${ID.e2}'`, "null", "false"));
    expect(r.codigo, r.mensagem).toBe("22023");
  });
  it("service role recusa autor que não coordena a escola", async () => {
    negado(await db.como("servico", registrar(usuarioId("docente"), "x@example.test", "DOCENTE")));
  });
  it("PERMITIDO: docente convidado vira membro; reenvio revoga o convite anterior", async () => {
    const r = await db.fluxo([
      { ator: "servico", sql: registrar(usuarioId("coordenacao"), "doc.novo@example.test", "DOCENTE") },
      { ator: "servico", sql: registrar(usuarioId("coordenacao"), "doc.novo@example.test", "DOCENTE") },
      { ator: "sistema", sql: "select count(*) filter (where revogado_em is null)::int as ativos, count(*)::int as total from convites where email = 'doc.novo@example.test'" },
      { ator: "sistema", sql: "select m.papel from membros_escola m join usuarios u on u.id = m.usuario_id where u.email = 'doc.novo@example.test'" },
    ]);
    expect(ok(r[2])[0]).toEqual({ ativos: 1, total: 2 });
    expect(ok(r[3])).toEqual([{ papel: "DOCENTE" }]);
  });
  it("PERMITIDO: profissional convidado nasce aguardando a família (D-24); responsável nasce ativo e conferido (D-25)", async () => {
    const r = await db.fluxo([
      { ator: "servico", sql: registrar(usuarioId("coordenacao"), "prof.novo@example.test", "PROFISSIONAL_SAUDE", `'${ID.e2}'`, "'CONSELHO-X'") },
      { ator: "servico", sql: registrar(usuarioId("coordenacao"), "resp.novo@example.test", "RESPONSAVEL", `'${ID.e2}'`, "null", "true") },
      { ator: "sistema", sql: `select u.email, v.status, v.conferido_por is not null as conferido from vinculos_usuario_estudante v join usuarios u on u.id = v.usuario_id where v.estudante_id = '${ID.e2}' and u.email like '%.novo@example.test' order by u.email` },
    ]);
    expect(ok(r[2])).toEqual([
      { email: "prof.novo@example.test", status: "PENDENTE_RESPONSAVEL", conferido: false },
      { email: "resp.novo@example.test", status: "ATIVO", conferido: true },
    ]);
  });
});
