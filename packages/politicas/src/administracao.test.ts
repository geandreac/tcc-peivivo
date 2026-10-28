/**
 * Migration 0012 (D-50): painel administrativo. Caminho NEGADO primeiro.
 * Prova as três regras: (1) o Administrador Geral não lê dado de estudante;
 * (2) perfil e ferramenta só restringem, nunca passam do teto; (3) suspensão,
 * remoção, validade vencida e aprovação pendente bloqueiam o banco inteiro.
 * Dados 100 % fictícios, desfeitos no savepoint.
 */
import { TETO } from "@pei-vivo/contratos";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ID, NEGADO, PARAMETROS_OK, abrirBanco, usuarioId, type Banco, type Resultado } from "./banco";

let db: Banco;
beforeAll(async () => {
  db = await abrirBanco();
});
afterAll(async () => {
  await db?.fechar();
});

const CONFLITO = "PT409";
const INVALIDO = "22023";
const erro = (codigo: string) => (r: Resultado | undefined) => {
  expect(r?.ok, `esperava ${codigo}; veio ok`).toBe(false);
  expect(r?.codigo, r?.mensagem).toBe(codigo);
};
const negado = erro(NEGADO);
const ok = (r: Resultado | undefined) => {
  expect(r?.ok, r?.mensagem).toBe(true);
  return r!.rows;
};

const DOCENTE = usuarioId("docente");
const SAUDE = usuarioId("saude");
const ADAPTADO = JSON.stringify({ blocos: [{ linhas: ["texto fictício"] }], enunciados: [], parametros: PARAMETROS_OK, blocosExcedentes: [] });
const gerarMaterial = `select fn_registrar_material('${DOCENTE}','${ID.e1}','${ID.vigenteE1}','Título','Texto fictício','${ADAPTADO}','h-admin',false) as r`;
const observar = `insert into observacoes (ciclo_id, dimensao, valor_escala) values ('${ID.cicloE1}','FADIGA_TAREFA','REDUZIDA')`;
const validar = `select fn_validar_versao('${ID.pendenteE1}', 'APROVAR')`;
const lerNotas = `select * from fn_ler_notas_clinicas('${ID.e1}')`;
const suspender = (u: string, motivo = "Motivo fictício de teste") => `select fn_admin_suspender('${u}', '${motivo}')`;
const listar = (busca = "null", situacao = "null") => `select * from fn_admin_listar_usuarios(${busca}, ${situacao}, 200, 0)`;
const perfilDe = async (nome: string) => String((await db.sistema(`select id from perfis_acesso where nome = '${nome}'`)).rows[0]?.id);

describe("painel administrativo · negado primeiro", () => {
  const rpcs = [
    "select fn_admin_resumo()",
    listar(),
    `select fn_admin_obter_usuario('${DOCENTE}')`,
    suspender(DOCENTE),
    "select * from fn_admin_listar_perfis()",
    "select * from fn_admin_catalogo()",
    "select fn_admin_configuracoes()",
    "select * from fn_admin_listar_auditoria(null, 50, 0)",
    "select * from fn_admin_listar_escolas()",
  ];
  it("docente, responsável, profissional de saúde e anônimo não abrem nenhuma RPC do painel", async () => {
    for (const sql of rpcs) {
      for (const p of ["docente", "responsavel", "saude"] as const) negado(await db.como(p, sql));
      expect((await db.como("anon", sql)).ok).toBe(false);
    }
  });
  it("Administrador Geral sem segundo fator (aal1) é negado", async () => {
    for (const sql of rpcs) negado(await db.como("admin", sql, { aal: "aal1" }));
  });
  it("coordenação não edita perfis, ferramentas nem configurações (perfil administrativo limitado)", async () => {
    negado(await db.como("coordenacao", `select fn_admin_salvar_perfil(null, 'Perfil fictício', null, 'DOCENTE', '{}')`));
    negado(await db.como("coordenacao", `select fn_admin_definir_ferramenta('GERACAO_MATERIAL', false)`));
    negado(await db.como("coordenacao", `select fn_admin_salvar_configuracoes(false, 30)`));
  });
  it("coordenação não administra quem é de outra escola, outra coordenação nem a si mesma", async () => {
    negado(await db.como("coordOutraEscola", suspender(DOCENTE)));
    negado(await db.como("coordenacao", suspender(usuarioId("coordOutraEscola"))));
    negado(await db.como("coordenacao", suspender(usuarioId("coordenacao"))));
  });
  it("ninguém suspende um Administrador Geral pelo painel, nem ele a si mesmo", async () => {
    negado(await db.como("coordenacao", suspender(usuarioId("admin"))));
    negado(await db.como("admin", suspender(usuarioId("admin"))));
  });
});

describe("regra 1 · o Administrador Geral nunca lê dado de estudante", () => {
  it("observações, materiais, notas clínicas, versões e estudantes: nada passa", async () => {
    for (const tabela of ["observacoes", "materiais_adaptados", "versoes_perfil", "estudantes", "consentimentos"]) {
      const r = await db.como("admin", `select count(*)::int as n from ${tabela}`);
      if (r.ok) expect(r.rows[0]?.n, tabela).toBe(0);
      else expect(r.codigo).toBe(NEGADO);
    }
    negado(await db.como("admin", `select count(*) from notas_clinicas`));
    negado(await db.como("admin", lerNotas));
    negado(await db.como("admin", `select fn_resumo_escola('${ID.escola1}')`));
    negado(await db.como("admin", `select * from fn_listar_auditoria('${ID.e1}', null, 0)`));
  });
  it("a trilha administrativa não traz eventos de estudante (clínicos ou pedagógicos)", async () => {
    const r = ok(await db.como("admin", "select evento from fn_admin_listar_auditoria(null, 200, 0)"));
    expect(r.map((x) => x.evento)).not.toContain("LEITURA_NOTA_CLINICA");
  });
});

describe("regra 2 · perfis e ferramentas só restringem", () => {
  it("INVÁLIDO: perfil derivado acima do teto (docente com nota clínica)", async () => {
    erro(INVALIDO)(await db.como("admin", `select fn_admin_salvar_perfil(null, 'Docente fictício', null, 'DOCENTE', '{NOTAS_CLINICAS:VER}')`));
  });
  it("NEGADO: perfil base do sistema não é alterado nem arquivado", async () => {
    const base = await perfilDe("Docente regente");
    negado(await db.como("admin", `select fn_admin_salvar_perfil('${base}', 'Docente regente', null, 'DOCENTE', '{}')`));
    negado(await db.como("admin", `select fn_admin_arquivar_perfil('${base}')`));
  });
  it("INVÁLIDO: perfil de outro papel não é atribuído (docente com perfil de saúde)", async () => {
    const saude = await perfilDe("Profissional de saúde");
    erro(INVALIDO)(await db.como("admin", `select fn_admin_definir_perfil('${DOCENTE}', '${saude}', '{}')`));
  });
  it("NEGADO: perfil derivado sem geração tira a geração do docente; sem o perfil ela volta", async () => {
    // o admin não lê perfis_acesso direto (só por RPC): o id sai de fn_admin_salvar_perfil
    const atribuir = `select fn_admin_definir_perfil('${DOCENTE}',
      fn_admin_salvar_perfil(null, 'Docente só observa (fictício)', null, 'DOCENTE', '{OBSERVACAO:EDITAR}'), '{}')`;
    const gera = await db.fluxo([
      { ator: "admin", sql: atribuir },
      { ator: "servico", sql: gerarMaterial },
    ]);
    negado(gera[1]);
    const observa = await db.fluxo([
      { ator: "admin", sql: atribuir },
      { ator: "docente", sql: observar },
    ]);
    ok(observa[1]);
    ok(await db.como("servico", gerarMaterial));
  });
  it("NEGADO: permissão removida da pessoa (validação) bloqueia só aquela ação", async () => {
    const r = await db.fluxo([
      { ator: "admin", sql: `select fn_admin_definir_perfil('${SAUDE}', null, '{VALIDACAO:APROVAR}')` },
      { ator: "saude", sql: validar },
    ]);
    negado(r[1]);
    const leitura = await db.fluxo([
      { ator: "admin", sql: `select fn_admin_definir_perfil('${SAUDE}', null, '{VALIDACAO:APROVAR}')` },
      { ator: "saude", sql: lerNotas },
    ]);
    ok(leitura[1]);
  });
  it("NEGADO: ferramenta desligada no sistema vale para todos; ligada de novo, volta", async () => {
    const desligada = await db.fluxo([
      { ator: "admin", sql: `select fn_admin_definir_ferramenta('NOTAS_CLINICAS', false)` },
      { ator: "saude", sql: lerNotas },
    ]);
    negado(desligada[1]);
    const nota = await db.fluxo([
      { ator: "admin", sql: `select fn_admin_definir_ferramenta('NOTAS_CLINICAS', false)` },
      { ator: "saude", sql: `select fn_registrar_nota_clinica('${ID.e1}', 'Nota fictícia')` },
    ]);
    negado(nota[1]);
    erro(CONFLITO)(await db.como("admin", `select fn_admin_definir_ferramenta('NOTAS_CLINICAS', true)`));
    ok(await db.como("saude", lerNotas));
  });
  it("NEGADO: painel da escola sem a ferramenta PAINEL_ESCOLA", async () => {
    const r = await db.fluxo([
      { ator: "admin", sql: `select fn_admin_definir_ferramenta('PAINEL_ESCOLA', false)` },
      { ator: "coordenacao", sql: `select fn_resumo_escola('${ID.escola1}')` },
    ]);
    negado(r[1]);
    ok(await db.como("coordenacao", `select fn_resumo_escola('${ID.escola1}')`));
  });
});

describe("regra 3 · suspenso, removido, expirado ou aguardando aprovação = bloqueado em tudo", () => {
  it("INVÁLIDO: suspender exige motivo", async () => {
    erro(INVALIDO)(await db.como("coordenacao", suspender(DOCENTE, "x")));
  });
  it("NEGADO: docente suspenso não lê, não observa e não gera; reativado, volta", async () => {
    const lendo = await db.fluxo([
      { ator: "coordenacao", sql: suspender(DOCENTE) },
      { ator: "docente", sql: `select count(*)::int as n from observacoes` },
    ]);
    expect(ok(lendo[1])[0]?.n).toBe(0);
    const obs = await db.fluxo([
      { ator: "coordenacao", sql: suspender(DOCENTE) },
      { ator: "docente", sql: observar },
    ]);
    negado(obs[1]);
    const gera = await db.fluxo([
      { ator: "coordenacao", sql: suspender(DOCENTE) },
      { ator: "servico", sql: gerarMaterial },
    ]);
    negado(gera[1]);
    const volta = await db.fluxo([
      { ator: "coordenacao", sql: suspender(DOCENTE) },
      { ator: "coordenacao", sql: `select fn_admin_reativar('${DOCENTE}')` },
      { ator: "docente", sql: observar },
    ]);
    ok(volta[2]);
  });
  it("CONFLITO: suspender duas vezes; reativar quem não está suspenso", async () => {
    const r = await db.fluxo([
      { ator: "coordenacao", sql: suspender(DOCENTE) },
      { ator: "coordenacao", sql: suspender(DOCENTE) },
    ]);
    erro(CONFLITO)(r[1]);
    erro(CONFLITO)(await db.como("coordenacao", `select fn_admin_reativar('${DOCENTE}')`));
  });
  it("NEGADO: profissional com acesso vencido não lê notas clínicas", async () => {
    const r = await db.fluxo([
      { ator: "sistema", sql: `update usuarios set acesso_expira_em = now() - interval '1 minute' where id = '${SAUDE}'` },
      { ator: "saude", sql: lerNotas },
    ]);
    negado(r[1]);
  });
  it("INVÁLIDO: validade no passado", async () => {
    erro(INVALIDO)(await db.como("admin", `select fn_admin_definir_validade('${SAUDE}', now() - interval '1 day')`));
  });
  it("NEGADO: aguardando aprovação não entra; aprovado, entra", async () => {
    const r = await db.fluxo([
      { ator: "sistema", sql: `update usuarios set aguardando_aprovacao = true where id = '${SAUDE}'` },
      { ator: "saude", sql: lerNotas },
    ]);
    negado(r[1]);
    const aprovado = await db.fluxo([
      { ator: "sistema", sql: `update usuarios set aguardando_aprovacao = true where id = '${SAUDE}'` },
      { ator: "coordenacao", sql: `select fn_admin_aprovar_acesso('${SAUDE}')` },
      { ator: "saude", sql: lerNotas },
    ]);
    ok(aprovado[2]);
    erro(CONFLITO)(await db.como("coordenacao", `select fn_admin_aprovar_acesso('${SAUDE}')`));
  });
  it("remover pela coordenação encerra só o que é da escola dela; pelo admin, o acesso inteiro", async () => {
    const coord = await db.fluxo([
      { ator: "coordenacao", sql: `select fn_admin_remover_acesso('${DOCENTE}', 'Saiu da escola (fictício)')` },
      {
        ator: "sistema",
        sql: `select removido_em, (select count(*)::int from membros_escola where usuario_id = '${DOCENTE}' and status = 'ATIVO') as membros from usuarios where id = '${DOCENTE}'`,
      },
    ]);
    expect(ok(coord[1])[0]).toMatchObject({ removido_em: null, membros: 0 });
    const admin = await db.fluxo([
      { ator: "admin", sql: `select fn_admin_remover_acesso('${DOCENTE}', 'Encerrado pelo administrador (fictício)')` },
      { ator: "docente", sql: `select count(*)::int as n from estudantes` },
    ]);
    expect(ok(admin[1])[0]?.n).toBe(0);
  });
});

describe("painel · permitido", () => {
  it("admin geral vê todos (menos o que é de estudante) com situação, papéis e organização", async () => {
    const linhas = ok(await db.como("admin", listar()));
    expect(linhas.length).toBeGreaterThanOrEqual(12);
    const docente = linhas.find((l) => l.id === DOCENTE)!;
    expect(docente).toMatchObject({ situacao: "ATIVO", organizacao: "Escola fictícia 1 (teste)" });
    expect(docente.papeis).toEqual(["DOCENTE"]);
    expect(linhas.find((l) => l.id === usuarioId("admin"))?.papeis).toEqual(["ADMIN_GERAL"]);
  });
  it("coordenação vê só quem é da escola dela", async () => {
    const ids = ok(await db.como("coordenacao", listar())).map((l) => l.id);
    expect(ids).toContain(DOCENTE);
    expect(ids).not.toContain(usuarioId("coordOutraEscola"));
    expect(ids).not.toContain(usuarioId("admin"));
  });
  it("busca e filtro por situação", async () => {
    const r = await db.fluxo([
      { ator: "coordenacao", sql: suspender(DOCENTE) },
      { ator: "coordenacao", sql: listar("null", "'SUSPENSO'") },
    ]);
    expect(ok(r[1]).map((l) => l.id)).toEqual([DOCENTE]);
    expect(ok(await db.como("admin", listar("'docente2'"))).map((l) => l.id)).toEqual([usuarioId("docente2")]);
  });
  it("escolas: o admin vê todas; a coordenação, só a dela (só id e nome)", async () => {
    expect(ok(await db.como("admin", "select * from fn_admin_listar_escolas()")).map((e) => e.nome)).toEqual([
      "Escola fictícia 1 (teste)",
      "Escola fictícia 2 (teste)",
    ]);
    expect(ok(await db.como("coordenacao", "select * from fn_admin_listar_escolas()"))).toEqual([{ id: ID.escola1, nome: "Escola fictícia 1 (teste)" }]);
  });
  it("resumo: escopo, contagens e ferramentas disponíveis", async () => {
    const r = ok(await db.como("admin", "select fn_admin_resumo() as r"))[0]!.r as Record<string, unknown>;
    expect(r).toMatchObject({ escopo: "GERAL", ferramentasDisponiveis: 5, ferramentasTotal: 5, suspensos: 0 });
    const c = ok(await db.como("coordenacao", "select fn_admin_resumo() as r"))[0]!.r as Record<string, unknown>;
    expect(c.escopo).toBe("ESCOLA");
  });
  it("toda ação vira linha na trilha, com responsável, ação e data", async () => {
    const r = await db.fluxo([
      { ator: "coordenacao", sql: suspender(DOCENTE) },
      { ator: "coordenacao", sql: `select fn_admin_reativar('${DOCENTE}')` },
      { ator: "admin", sql: "select evento, autor_nome, papel_autor, alvo_nome, criado_em from fn_admin_listar_auditoria(null, 10, 0)" },
    ]);
    // mesma transação = mesmo now(): confere o conjunto, não a ordem
    const eventos = ok(r[2]);
    expect(eventos.map((e) => e.evento)).toEqual(expect.arrayContaining(["ACESSO_REATIVADO", "ACESSO_SUSPENSO"]));
    const suspenso = eventos.find((e) => e.evento === "ACESSO_SUSPENSO");
    expect(suspenso).toMatchObject({ autor_nome: "coordenacao (fictício)", papel_autor: "COORDENACAO", alvo_nome: "docente (fictício)" });
    expect(suspenso?.criado_em).toBeTruthy();
  });
  it("o motivo da suspensão não vai para a trilha administrativa (fica só no cadastro da pessoa)", async () => {
    const r = await db.fluxo([
      { ator: "coordenacao", sql: suspender(DOCENTE, "Motivo sensível fictício") },
      { ator: "admin", sql: "select detalhes from fn_admin_listar_auditoria(null, 1, 0)" },
    ]);
    expect(JSON.stringify(ok(r[1]))).not.toContain("Motivo sensível");
  });
  it("perfil derivado é criado, aparece na lista com o teto, e não arquiva enquanto estiver em uso", async () => {
    const r = await db.fluxo([
      {
        ator: "admin",
        sql: `select set_config('teste.perfil', fn_admin_salvar_perfil(null, 'Saúde sem notas (fictício)', null, 'PROFISSIONAL_SAUDE', '{VALIDACAO:APROVAR}')::text, true)`,
      },
      { ator: "admin", sql: `select fn_admin_definir_perfil('${SAUDE}', current_setting('teste.perfil')::uuid, '{}')` },
      { ator: "admin", sql: `select fn_admin_arquivar_perfil(current_setting('teste.perfil')::uuid)` },
    ]);
    erro(CONFLITO)(r[2]);
    const lista = await db.fluxo([
      { ator: "admin", sql: `select fn_admin_salvar_perfil(null, 'Saúde sem notas (fictício)', null, 'PROFISSIONAL_SAUDE', '{VALIDACAO:APROVAR}')` },
      { ator: "admin", sql: `select nome, permissoes, teto, sistema from fn_admin_listar_perfis() where nome = 'Saúde sem notas (fictício)'` },
    ]);
    expect(ok(lista[1])[0]).toMatchObject({
      permissoes: ["VALIDACAO:APROVAR"],
      teto: ["OBSERVACAO:EDITAR", "VALIDACAO:APROVAR", "NOTAS_CLINICAS:VER", "NOTAS_CLINICAS:EDITAR"],
      sistema: false,
    });
  });
});

describe("contrato = banco", () => {
  it("o TETO de @pei-vivo/contratos (mock e telas) é o mesmo da semente de catalogo_permissoes", async () => {
    for (const papel of Object.keys(TETO) as (keyof typeof TETO)[]) {
      const r = ok(await db.sistema(`select privado.teto('${papel}') as t`));
      expect([...(r[0]!.t as string[])].sort(), papel).toEqual([...TETO[papel]].sort());
    }
  });
});

describe("convite pelo painel (D-50)", () => {
  const preparar = (extra = "") =>
    `select fn_preparar_convite('${ID.escola1}', 'externo.novo@example.test', 'PROFISSIONAL_SAUDE', '${ID.e1}', 'CONSELHO-FICTICIO-9', false${extra}) as r`;
  it("NEGADO: coordenação não convida coordenação; admin geral convida", async () => {
    erro(INVALIDO)(await db.como("coordenacao", `select fn_preparar_convite('${ID.escola1}', 'coord.nova@example.test', 'COORDENACAO') as r`));
    ok(await db.como("admin", `select fn_preparar_convite('${ID.escola1}', 'coord.nova@example.test', 'COORDENACAO') as r`));
  });
  it("INVÁLIDO: perfil de outro papel, permissão fora do teto e validade no passado", async () => {
    const docente = await perfilDe("Docente regente");
    erro(INVALIDO)(await db.como("admin", preparar(`, '${docente}'`)));
    erro(INVALIDO)(await db.como("admin", preparar(`, null, null, null, null, '{GERACAO_MATERIAL:EDITAR}'`)));
    erro(INVALIDO)(await db.como("admin", preparar(`, null, now() - interval '1 day'`)));
  });
  it("externo exige aprovação por padrão (configuração); o registro bloqueia até aprovar", async () => {
    const p = ok(await db.como("admin", preparar()))[0]!.r as { exigeAprovacao: boolean };
    expect(p.exigeAprovacao).toBe(true);
    const r = await db.fluxo([
      {
        ator: "servico",
        sql: `select fn_registrar_convite('${usuarioId("admin")}', null, 'Externo fictício', 'externo.novo@example.test', '${ID.escola1}',
               'PROFISSIONAL_SAUDE', '${ID.e1}', 'CONSELHO-FICTICIO-9', false, null, now() + interval '30 days', true, 'Clínica fictícia', '{}') as r`,
      },
      { ator: "admin", sql: listar("'externo.novo'") },
    ]);
    expect(ok(r[1])[0]).toMatchObject({ situacao: "AGUARDANDO_APROVACAO", organizacao: "Clínica fictícia" });
  });
});
