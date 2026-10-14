/**
 * Políticas v3 (migrations 0003–0005): cada bloco começa pelo acesso NEGADO (CLAUDE.md).
 * Os códigos S-nn são as sondas de docs/reformulacao/AUDITORIA.md §3.1. Todas as
 * que "passavam" nas policies de 0002 estão aqui com o resultado invertido.
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

function negado(r: Resultado | undefined) {
  expect(r?.ok, `esperava negação; veio ok com ${r?.rows.length} linha(s)`).toBe(false);
  expect(r?.codigo, r?.mensagem).toBe(NEGADO);
}
function conflito(r: Resultado | undefined) {
  expect(r?.ok).toBe(false);
  expect(r?.codigo, r?.mensagem).toBe("PT409");
}
function invalido(r: Resultado | undefined) {
  expect(r?.ok).toBe(false);
  expect(r?.codigo, r?.mensagem).toBe("22023");
}
function ok(r: Resultado | undefined) {
  expect(r?.ok, r?.mensagem).toBe(true);
  return r!.rows;
}

const ESCOPOS = "'{observacao_pedagogica,geracao_material}'::escopo_consentimento[]";
const PARAMS_AJUSTE = JSON.stringify({ ...PARAMETROS_OK, maxLinhasPorBloco: 3 });

// =============================================================================
describe("Base: anônimo, pessoa sem vínculo e higiene das funções", () => {
  it("anon não lê nenhuma tabela", async () => {
    negado(await db.como("anon", "select * from estudantes"));
    negado(await db.como("anon", "select * from consentimentos"));
  });
  it("S-02 pessoa sem vínculo não vê estudante, consentimento nem perfil", async () => {
    expect(ok(await db.como("estranho", "select id from estudantes"))).toHaveLength(0);
    expect(ok(await db.como("estranho", "select id from consentimentos"))).toHaveLength(0);
    expect(ok(await db.como("estranho", "select * from versoes_perfil"))).toHaveLength(0);
  });
  it("S-30 o oráculo de consentimento saiu do schema exposto", async () => {
    const r = await db.como("estranho", `select fn_tem_consentimento_ativo('${ID.e1}')`);
    expect(r.codigo).toBe("42883"); // função inexistente
  });
  it("S-29 toda função security definer tem search_path fixo", async () => {
    const r = await db.sistema(`
      select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname in ('public','privado') and p.prosecdef
         and not coalesce(array_to_string(p.proconfig, ',') like '%search_path=%', false)`);
    expect(ok(r)).toEqual([]);
  });
  it("authenticated não executa nenhuma função de public que não foi concedida", async () => {
    negado(await db.como("docente", "select fn_expirar_validacoes()"));
  });
});

// =============================================================================
describe("RN01 · consentimento só pelo responsável, só por RPC", () => {
  it("S-04 docente não insere consentimento direto", async () => {
    negado(await db.como("docente", `insert into consentimentos (estudante_id, responsavel_id, escopos, versao_termo)
      values ('${ID.e2}','${usuarioId("docente")}',${ESCOPOS},'v')`));
  });
  it("S-05 pessoa sem vínculo não insere consentimento", async () => {
    negado(await db.como("estranho", `insert into consentimentos (estudante_id, responsavel_id, escopos, versao_termo)
      values ('${ID.e2}','${usuarioId("estranho")}',${ESCOPOS},'v')`));
  });
  it("S-06 docente não concede pela RPC (e por isso não libera geração)", async () => {
    negado(await db.como("docente", `select fn_conceder_consentimento('${ID.e2}', ${ESCOPOS}, 'v')`));
  });
  it("S-07 ninguém apaga consentimento — nem o sistema, enquanto o estudante existir", async () => {
    negado(await db.como("responsavel", `delete from consentimentos where estudante_id = '${ID.e1}'`));
    negado(await db.sistema(`delete from consentimentos where estudante_id = '${ID.e1}'`));
  });
  it("S-08 responsável não altera o consentimento direto", async () => {
    negado(await db.como("responsavel", `update consentimentos set estudante_id = '${ID.e2}'`));
  });
  it("responsável não concede para estudante a que não está vinculado", async () => {
    negado(await db.como("responsavel2", `select fn_conceder_consentimento('${ID.e2}', ${ESCOPOS}, 'v')`));
  });
  it("concessão exige escopo e versão do termo; segundo consentimento ativo é conflito", async () => {
    invalido(await db.como("responsavel", `select fn_conceder_consentimento('${ID.e2}', '{}'::escopo_consentimento[], 'v')`));
    invalido(await db.como("responsavel", `select fn_conceder_consentimento('${ID.e2}', ${ESCOPOS}, ' ')`));
    conflito(await db.como("responsavel", `select fn_conceder_consentimento('${ID.e1}', ${ESCOPOS}, 'v')`));
  });
  it("PERMITIDO: responsável concede; auditoria registra escopos e versão; docente é notificado", async () => {
    const [, aud, notif] = await db.fluxo([
      { ator: "responsavel", sql: `select fn_conceder_consentimento('${ID.e2}', ${ESCOPOS}, 'v2', 'navegador fictício')` },
      { ator: "sistema", sql: `select detalhes from auditoria where estudante_id = '${ID.e2}' and evento = 'CONSENTIMENTO_CONCEDIDO'` },
      { ator: "sistema", sql: `select usuario_id from notificacoes where estudante_id = '${ID.e2}' and tipo = 'CONSENTIMENTO_CONCEDIDO'` },
    ]);
    expect(ok(aud)[0]?.detalhes).toMatchObject({ versao_termo: "v2" });
    expect(ok(notif).map((x) => x.usuario_id)).toContain(usuarioId("docente"));
  });
  it("user_agent não é legível por SELECT (minimização)", async () => {
    negado(await db.como("responsavel", `select user_agent from consentimentos`));
  });
});

// =============================================================================
describe("D1/D-21 · um papel por pessoa por estudante", () => {
  it("S-09 o banco recusa um segundo vínculo vigente da mesma pessoa no mesmo estudante", async () => {
    const r = await db.sistema(`insert into vinculos_usuario_estudante (usuario_id, estudante_id, papel, registro_conselho, verificacao_registro)
      values ('${usuarioId("docente")}','${ID.e1}','PROFISSIONAL_SAUDE','X','NAO_VERIFICADO')`);
    expect(r.codigo).toBe("23505");
  });
  it("S-10 coordenação não é mais vínculo por estudante", async () => {
    const r = await db.sistema(`insert into vinculos_usuario_estudante (usuario_id, estudante_id, papel)
      values ('${usuarioId("coordenacao")}','${ID.e2}','COORDENACAO')`);
    expect(r.codigo).toBe("23514");
  });
  it("fn_meu_papel devolve o único papel ativo", async () => {
    expect(ok(await db.como("docente", `select fn_meu_papel('${ID.e1}') as p`))[0]?.p).toBe("DOCENTE");
  });
});

// =============================================================================
describe("D3/D-24 · acesso clínico só com confirmação do responsável", () => {
  it("S-11 coordenação não propõe vínculo para si mesma", async () => {
    negado(await db.como("coordenacao", `select fn_propor_vinculo('${ID.e1}','${usuarioId("coordenacao")}','PROFISSIONAL_SAUDE','X')`));
  });
  it("S-12 ninguém escreve vínculo direto", async () => {
    negado(await db.como("coordenacao", `update vinculos_usuario_estudante set papel = 'PROFISSIONAL_SAUDE'`));
    negado(await db.como("coordenacao", `insert into vinculos_usuario_estudante (usuario_id, estudante_id, papel)
      values ('${usuarioId("estranho")}','${ID.e1}','DOCENTE')`));
  });
  it("S-13 coordenação não lê nota clínica, nem por SELECT nem pela RPC", async () => {
    negado(await db.como("coordenacao", `select * from notas_clinicas`));
    negado(await db.como("coordenacao", `select * from fn_ler_notas_clinicas('${ID.e1}')`));
  });
  it("S-14 coordenação não encerra o vínculo do responsável legal", async () => {
    const v = ok(await db.sistema(`select id from vinculos_usuario_estudante
      where usuario_id = '${usuarioId("responsavel")}' and estudante_id = '${ID.e1}'`))[0]?.id;
    negado(await db.como("coordenacao", `select fn_encerrar_vinculo('${v}')`));
  });
  it("docente não propõe profissional; proposta sem registro no conselho é inválida", async () => {
    negado(await db.como("docente", `select fn_propor_vinculo('${ID.e1}','${usuarioId("profissionalNovo")}','PROFISSIONAL_SAUDE','X')`));
    invalido(await db.como("coordenacao", `select fn_propor_vinculo('${ID.e1}','${usuarioId("profissionalNovo")}','PROFISSIONAL_SAUDE','  ')`));
  });
  it("PERMITIDO: proposta da coordenação fica pendente, sem acesso, até o responsável confirmar", async () => {
    const vinc = `(select id from vinculos_usuario_estudante where usuario_id = '${usuarioId("profissionalNovo")}')`;
    const r = await db.fluxo([
      { ator: "coordenacao", sql: `select fn_propor_vinculo('${ID.e1}','${usuarioId("profissionalNovo")}','PROFISSIONAL_SAUDE','CONSELHO-NOVO')` },
      { ator: "profissionalNovo", sql: `select * from versoes_perfil where estudante_id = '${ID.e1}'` },
      { ator: "sistema", sql: `select count(*)::int as n from notificacoes where tipo = 'PROFISSIONAL_AGUARDANDO_CONFIRMACAO'` },
      { ator: "coordenacao", sql: `select fn_confirmar_vinculo(${vinc}, true)` },
    ]);
    ok(r[0]);
    expect(ok(r[1])).toHaveLength(0); // pendente não lê nada
    expect(ok(r[2])[0]?.n).toBe(2); // os dois responsáveis do estudante
    negado(r[3]); // coordenação não confirma

    const s = await db.fluxo([
      { ator: "coordenacao", sql: `select fn_propor_vinculo('${ID.e1}','${usuarioId("profissionalNovo")}','PROFISSIONAL_SAUDE','CONSELHO-NOVO')` },
      { ator: "responsavel2", sql: `select fn_confirmar_vinculo(${vinc}, true)` },
      { ator: "profissionalNovo", sql: `select * from versoes_perfil where estudante_id = '${ID.e1}'` },
      { ator: "profissionalNovo", sql: `select * from versoes_perfil where estudante_id = '${ID.e1}'`, aal: "aal1" },
    ]);
    ok(s[1]);
    expect(ok(s[2]).length).toBeGreaterThan(0); // confirmado + aal2 → lê
    expect(ok(s[3])).toHaveLength(0); // sem segundo fator → não lê
  });
  it("PERMITIDO: profissional proposto pelo próprio responsável já nasce ativo", async () => {
    const r = await db.fluxo([
      { ator: "responsavel", sql: `select fn_propor_vinculo('${ID.e1}','${usuarioId("profissionalNovo")}','PROFISSIONAL_SAUDE','CONSELHO-NOVO')` },
      { ator: "sistema", sql: `select status from vinculos_usuario_estudante where usuario_id = '${usuarioId("profissionalNovo")}'` },
    ]);
    expect(ok(r[1])[0]?.status).toBe("ATIVO");
  });
  it("PERMITIDO: coordenação verifica o registro; docente não", async () => {
    const v = `(select id from vinculos_usuario_estudante where usuario_id = '${usuarioId("saude")}')`;
    negado(await db.como("docente", `select fn_verificar_registro(${v})`));
    ok(await db.como("coordenacao", `select fn_verificar_registro(${v})`));
  });
  it("coordenação de OUTRA escola não vê nem cadastra na escola 1", async () => {
    expect(ok(await db.como("coordOutraEscola", `select id from estudantes where escola_id = '${ID.escola1}'`))).toHaveLength(0);
    negado(await db.como("coordOutraEscola", `select fn_cadastrar_estudante('${ID.escola1}','Fictício X','2018-01-01')`));
  });
  it("vínculo de docente exige que ele seja membro da escola", async () => {
    conflito(await db.como("coordenacao", `select fn_propor_vinculo('${ID.e2}','${usuarioId("estranho")}','DOCENTE')`));
    ok(await db.como("coordenacao", `select fn_propor_vinculo('${ID.e2}','${usuarioId("docenteSemVinculo")}','DOCENTE')`));
  });
  it("vínculo de responsável exige conferência presencial declarada (D-25)", async () => {
    invalido(await db.como("coordenacao", `select fn_propor_vinculo('${ID.e2}','${usuarioId("estranho")}','RESPONSAVEL')`));
    ok(await db.como("coordenacao", `select fn_propor_vinculo('${ID.e2}','${usuarioId("estranho")}','RESPONSAVEL', null, true)`));
  });
});

// =============================================================================
describe("D2/D-23 · cadastro de estudante", () => {
  it("docente não cadastra; insert direto é negado até para a coordenação", async () => {
    negado(await db.como("docente", `select fn_cadastrar_estudante('${ID.escola1}','Fictício Y','2018-01-01')`));
    negado(await db.como("coordenacao", `insert into estudantes (escola_id, nome, data_nascimento) values ('${ID.escola1}','Z','2018-01-01')`));
  });
  it("`select *` em tabela com coluna protegida é negado (supabaseApi deve listar colunas)", async () => {
    negado(await db.como("responsavel", "select * from estudantes"));
  });
  it("D-32 coordenação sem segundo fator (aal1) não cadastra", async () => {
    negado(await db.como("coordenacao", `select fn_cadastrar_estudante('${ID.escola1}','Fictício Y','2018-01-01')`, { aal: "aal1" }));
  });
  it("S-15 PERMITIDO: coordenação com aal2 cadastra o primeiro estudante; dados inválidos são recusados", async () => {
    expect(ok(await db.como("coordenacao", `select fn_cadastrar_estudante('${ID.escola1}','Fictício Novo','2018-01-01','1º ano') as id`))[0]?.id).toBeTruthy();
    invalido(await db.como("coordenacao", `select fn_cadastrar_estudante('${ID.escola1}','Ab','2018-01-01')`));
    invalido(await db.como("coordenacao", `select fn_cadastrar_estudante('${ID.escola1}','Fictício','2999-01-01')`));
  });
});

// =============================================================================
describe("RN02 · nota clínica: só o profissional, com aal2, sempre auditada", () => {
  it("S-01 docente e responsável não leem nota clínica", async () => {
    negado(await db.como("docente", `select * from notas_clinicas`));
    negado(await db.como("docente", `select * from fn_ler_notas_clinicas('${ID.e1}')`));
    negado(await db.como("responsavel", `select * from fn_ler_notas_clinicas('${ID.e1}')`));
  });
  it("profissional sem segundo fator (aal1) não lê", async () => {
    negado(await db.como("saude", `select * from fn_ler_notas_clinicas('${ID.e1}')`, { aal: "aal1" }));
  });
  it("S-16/S-16b/S-17 sem acesso direto à tabela: ninguém altera nem apaga nota", async () => {
    negado(await db.como("saude2", `update notas_clinicas set conteudo = 'x'`));
    negado(await db.como("saude2", `delete from notas_clinicas`));
  });
  it("PERMITIDO: profissional lê; responsável vê QUE leu (sem conteúdo); coordenação não vê o evento", async () => {
    const r = await db.fluxo([
      { ator: "saude", sql: `select * from fn_ler_notas_clinicas('${ID.e1}')` },
      { ator: "responsavel", sql: `select evento, autor_nome, detalhes from fn_listar_auditoria('${ID.e1}') where evento = 'LEITURA_NOTA_CLINICA'` },
      { ator: "coordenacao", sql: `select evento from fn_listar_auditoria('${ID.e1}') where evento like '%NOTA%'` },
    ]);
    expect(ok(r[0])).toHaveLength(1);
    expect(ok(r[0])[0]?.minha).toBe(true);
    expect(ok(r[1])[0]).toMatchObject({ evento: "LEITURA_NOTA_CLINICA", autor_nome: "saude (fictício)", detalhes: {} });
    expect(ok(r[2])).toHaveLength(0);
  });
  it("PERMITIDO: profissional registra nota pela RPC; nota vazia é inválida", async () => {
    ok(await db.como("saude2", `select fn_registrar_nota_clinica('${ID.e1}', 'Nota fictícia 2')`));
    invalido(await db.como("saude2", `select fn_registrar_nota_clinica('${ID.e1}', '   ')`));
  });
});

// =============================================================================
describe("RN04/D-34 · materiais: rascunho só do autor; decisão só pelo autor", () => {
  it("S-18 responsável, profissional e coordenação não veem rascunho; veem o aprovado", async () => {
    for (const p of ["responsavel", "saude", "coordenacao"] as const) {
      expect(ok(await db.como(p, `select * from materiais_adaptados where status_aprovacao = 'RASCUNHO'`))).toHaveLength(0);
      expect(ok(await db.como(p, `select * from materiais_adaptados where status_aprovacao = 'APROVADO'`))).toHaveLength(1);
    }
  });
  it("docente não-autor não vê o rascunho do colega; o autor vê", async () => {
    expect(ok(await db.como("docente", `select * from materiais_adaptados where id = '${ID.rascunhoDocente2}'`))).toHaveLength(0);
    expect(ok(await db.como("docente2", `select * from materiais_adaptados where id = '${ID.rascunhoDocente2}'`))).toHaveLength(1);
  });
  it("S-19 docente não aprova o rascunho de outro docente", async () => {
    negado(await db.como("docente", `select fn_decidir_material('${ID.rascunhoDocente2}', 'APROVAR')`));
  });
  it("S-20 cliente não insere nem altera material direto (só a Edge Function gerar-material)", async () => {
    negado(await db.como("docente", `insert into materiais_adaptados (estudante_id, versao_perfil_id, docente_id, texto_original)
      values ('${ID.e1}','${ID.vigenteE1}','${usuarioId("docente")}','x')`));
    negado(await db.como("docente2", `update materiais_adaptados set status_aprovacao = 'APROVADO'`));
  });
  it("S-21/S-22 nem o servidor grava material com versão pendente ou de outro estudante", async () => {
    conflito(await db.sistema(`insert into materiais_adaptados (estudante_id, versao_perfil_id, docente_id, texto_original)
      values ('${ID.e1}','${ID.pendenteE1}','${usuarioId("docente")}','x')`));
    invalido(await db.sistema(`insert into materiais_adaptados (estudante_id, versao_perfil_id, docente_id, texto_original)
      values ('${ID.e1}','${ID.vigenteE2}','${usuarioId("docente")}','x')`));
  });
  it("S-23 desfecho só em material aprovado e só pelo autor", async () => {
    negado(await db.como("docente2", `insert into desfechos (material_id, resultado) values ('${ID.rascunhoDocente2}','ALCANCADO')`));
    negado(await db.como("docente2", `insert into desfechos (material_id, resultado) values ('${ID.aprovadoDocente}','ALCANCADO')`));
    ok(await db.como("docente", `insert into desfechos (material_id, resultado) values ('${ID.aprovadoDocente}','PARCIAL')`));
  });
  it("PERMITIDO: autor aprova o próprio rascunho; decidir de novo é conflito", async () => {
    const r = await db.fluxo([
      { ator: "docente2", sql: `select fn_decidir_material('${ID.rascunhoDocente2}', 'APROVAR', 'texto revisado')` },
      { ator: "responsavel", sql: `select texto_revisado from materiais_adaptados where id = '${ID.rascunhoDocente2}'` },
      { ator: "docente2", sql: `select fn_decidir_material('${ID.rascunhoDocente2}', 'DESCARTAR')` },
    ]);
    expect(ok(r[1])[0]?.texto_revisado).toBe("texto revisado"); // aprovado passa a ser visível à família
    conflito(r[2]);
  });
});

// =============================================================================
describe("RN03/RN05/RN07/D-35 · versões de perfil", () => {
  it("S-24 ninguém reescreve parâmetros — nem o profissional, nem o servidor", async () => {
    negado(await db.como("saude", `update versoes_perfil set parametros = '{}' where id = '${ID.pendenteE1}'`));
    conflito(await db.sistema(`update versoes_perfil set parametros = '${PARAMS_AJUSTE}' where id = '${ID.pendenteE1}'`));
  });
  it("S-25 o banco recusa duas versões VIGENTE no mesmo estudante", async () => {
    expect((await db.sistema(`update versoes_perfil set status_validacao = 'VIGENTE' where id = '${ID.pendenteE1}'`)).codigo).toBe("23505");
  });
  it("docente, responsável e profissional sem aal2 não validam", async () => {
    negado(await db.como("docente", `select fn_validar_versao('${ID.pendenteE1}', 'APROVAR')`));
    negado(await db.como("responsavel", `select fn_validar_versao('${ID.pendenteE1}', 'APROVAR')`));
    negado(await db.como("saude", `select fn_validar_versao('${ID.pendenteE1}', 'APROVAR')`, { aal: "aal1" }));
  });
  it("PERMITIDO: aprovar torna VIGENTE e a anterior SUBSTITUIDA (uma só vigente)", async () => {
    const r = await db.como("saude", [
      `select fn_validar_versao('${ID.pendenteE1}', 'APROVAR')`,
      `select status_validacao from versoes_perfil where estudante_id = '${ID.e1}' order by numero_ciclo`,
    ]);
    expect(ok(r).map((x) => x.status_validacao)).toEqual(["SUBSTITUIDA", "VIGENTE"]);
  });
  it("pedir revisão exige justificativa e notifica os docentes", async () => {
    invalido(await db.como("saude", `select fn_validar_versao('${ID.pendenteE1}', 'REVISAO')`));
    const r = await db.fluxo([
      { ator: "saude", sql: `select fn_validar_versao('${ID.pendenteE1}', 'REVISAO', 'Rever a fadiga.')` },
      { ator: "docente", sql: `select tipo from notificacoes` },
    ]);
    expect(ok(r[1]).map((x) => x.tipo)).toContain("REVISAO_SOLICITADA");
  });
  it("ajuste cria nova versão vigente; parâmetros inválidos são recusados", async () => {
    invalido(await db.como("saude", `select fn_validar_versao('${ID.pendenteE1}', 'AJUSTAR', 'j', '{"maxLinhasPorBloco": 99}')`));
    const r = await db.como("saude", [
      `select fn_validar_versao('${ID.pendenteE1}', 'AJUSTAR', 'Bloco menor.', '${PARAMS_AJUSTE}')`,
      `select origem, status_validacao from versoes_perfil where estudante_id = '${ID.e1}' and status_validacao = 'VIGENTE'`,
    ]);
    expect(ok(r)).toEqual([{ origem: "AJUSTE_PROFISSIONAL", status_validacao: "VIGENTE" }]);
  });
  it("RN05: o sistema expira após 7 dias, a vigente anterior permanece e a expirada não volta", async () => {
    const r = await db.fluxo([
      { ator: "sistema", sql: `select fn_expirar_validacoes(now() + interval '8 days') as n` },
      { ator: "sistema", sql: `select status_validacao from versoes_perfil where estudante_id = '${ID.e1}' order by numero_ciclo` },
      { ator: "saude", sql: `select tipo from notificacoes where tipo = 'VALIDACAO_EXPIRADA'` },
      { ator: "saude", sql: `select fn_validar_versao('${ID.pendenteE1}', 'APROVAR')` },
    ]);
    expect(ok(r[0])[0]?.n).toBe(1);
    expect(ok(r[1]).map((x) => x.status_validacao)).toEqual(["VIGENTE", "EXPIRADA"]);
    expect(ok(r[2])).toHaveLength(1);
    conflito(r[3]);
  });
  it("RN05: antes de 7 dias nada expira", async () => {
    expect(ok(await db.sistema(`select fn_expirar_validacoes(now()) as n`))[0]?.n).toBe(0);
  });
});

// =============================================================================
describe("D7/D-33 · colunas sensíveis", () => {
  it("docente não lê laudo_apresentado_em, nem por SELECT nem pela RPC", async () => {
    negado(await db.como("docente", `select laudo_apresentado_em from estudantes`));
    negado(await db.como("docente", `select fn_laudo_apresentado_em('${ID.e1}')`));
  });
  it("ninguém lê e-mail de outro usuário", async () => {
    negado(await db.como("coordenacao", `select email from usuarios`));
  });
  it("PERMITIDO: responsável, profissional e coordenação leem a data do laudo pela RPC", async () => {
    for (const p of ["responsavel", "saude", "coordenacao"] as const) {
      expect(String(ok(await db.como(p, `select fn_laudo_apresentado_em('${ID.e1}') as d`))[0]?.d)).toMatch(/2025/);
    }
  });
  it("PERMITIDO: responsável vê quem tem acesso ao filho; docente só o próprio vínculo", async () => {
    expect(ok(await db.como("responsavel", `select * from vinculos_usuario_estudante where estudante_id = '${ID.e1}'`))).toHaveLength(6);
    expect(ok(await db.como("docente", `select * from vinculos_usuario_estudante where estudante_id = '${ID.e1}'`))).toHaveLength(1);
    expect(ok(await db.como("docente", `select nome from usuarios`))).toHaveLength(1);
  });
});

// =============================================================================
describe("RF03/RF04/D-04 · observações e ciclos", () => {
  it("S-03 docente não abre ciclo nem observa em estudante sem consentimento", async () => {
    negado(await db.como("docente", `insert into ciclos_observacao (estudante_id) values ('${ID.e2}')`));
    negado(await db.como("docente", `insert into observacoes (ciclo_id, dimensao, valor_escala) values ('${ID.cicloE2}','ATENCAO_SUSTENTADA','ESTAVEL')`));
  });
  it("coordenação não observa; ninguém observa em ciclo fechado", async () => {
    negado(await db.como("coordenacao", `insert into observacoes (ciclo_id, dimensao, valor_escala) values ('${ID.cicloE1}','ATENCAO_SUSTENTADA','ESTAVEL')`));
    negado(await db.como("docente", `insert into observacoes (ciclo_id, dimensao, valor_escala) values ('${ID.cicloFechadoE1}','ATENCAO_SUSTENTADA','ESTAVEL')`));
  });
  it("cliente não escolhe a autoria (autor_id não é gravável)", async () => {
    negado(await db.como("docente", `insert into observacoes (ciclo_id, autor_id, dimensao, valor_escala)
      values ('${ID.cicloE1}','${usuarioId("docente2")}','ATENCAO_SUSTENTADA','ESTAVEL')`));
  });
  it("PERMITIDO: docente e responsável observam; autoria e papel vêm do servidor", async () => {
    const r = await db.fluxo([
      { ator: "docente", sql: `insert into observacoes (ciclo_id, dimensao, valor_escala) values ('${ID.cicloE1}','ATENCAO_SUSTENTADA','ESTAVEL') returning autor_id, papel_autor` },
      { ator: "responsavel", sql: `insert into observacoes (ciclo_id, dimensao, valor_escala) values ('${ID.cicloE1}','INTERESSE_MANIFESTO','AMPLIADA') returning papel_autor` },
    ]);
    expect(ok(r[0])[0]).toEqual({ autor_id: usuarioId("docente"), papel_autor: "DOCENTE" });
    expect(ok(r[1])[0]?.papel_autor).toBe("RESPONSAVEL");
  });
  it("PERMITIDO: docente abre ciclo com número do servidor; um segundo ciclo aberto é recusado", async () => {
    const r = await db.fluxo([
      { ator: "sistema", sql: `update ciclos_observacao set status = 'FECHADO' where id = '${ID.cicloE1}'` },
      { ator: "docente", sql: `insert into ciclos_observacao (estudante_id, numero) values ('${ID.e1}', 99)` },
      { ator: "docente", sql: `insert into ciclos_observacao (estudante_id) values ('${ID.e1}') returning numero, status` },
      { ator: "docente", sql: `insert into ciclos_observacao (estudante_id) values ('${ID.e1}')` },
    ]);
    negado(r[1]); // número não é gravável pelo cliente
    // r[1] abortou o fluxo; refaz sem o passo negado
    const s = await db.fluxo([
      { ator: "sistema", sql: `update ciclos_observacao set status = 'FECHADO' where id = '${ID.cicloE1}'` },
      { ator: "docente", sql: `insert into ciclos_observacao (estudante_id) values ('${ID.e1}') returning numero, status` },
      { ator: "docente", sql: `insert into ciclos_observacao (estudante_id) values ('${ID.e1}')` },
    ]);
    expect(ok(s[1])[0]).toEqual({ numero: 4, status: "ABERTO" });
    expect(s[2]?.codigo).toBe("23505");
  });
});

// =============================================================================
describe("D-30 · auditoria somente-inserção", () => {
  it("nenhum papel lê a tabela direto; nem o sistema altera ou apaga eventos", async () => {
    negado(await db.como("responsavel", `select * from auditoria`));
    negado(await db.como("coordenacao", `select * from auditoria`));
    negado(await db.sistema(`update auditoria set evento = 'x'`));
    negado(await db.sistema(`delete from auditoria`));
  });
  it("docente e profissional não leem a trilha pela RPC", async () => {
    negado(await db.como("docente", `select * from fn_listar_auditoria('${ID.e1}')`));
    negado(await db.como("saude", `select * from fn_listar_auditoria('${ID.e1}')`));
  });
  it("notificação é privada e só a data de leitura é alterável", async () => {
    const r = await db.fluxo([
      { ator: "responsavel", sql: `select fn_conceder_consentimento('${ID.e2}', ${ESCOPOS}, 'v')` },
      { ator: "docente", sql: `update notificacoes set lida_em = now() returning id` },
      { ator: "responsavel", sql: `select * from notificacoes where usuario_id = '${usuarioId("docente")}'` },
      { ator: "docente", sql: `update notificacoes set tipo = 'VINCULO_ATIVADO'` },
    ]);
    expect(ok(r[1]).length).toBeGreaterThan(0);
    expect(ok(r[2])).toHaveLength(0);
    negado(r[3]);
  });
});

// =============================================================================
// Por último: a revogação fica gravada na fixture e vale para os testes abaixo.
describe("RN08/D-11 · depois da revogação", () => {
  beforeAll(async () => {
    await db.fixar({ ator: "responsavel2", sql: `select fn_revogar_consentimento('${ID.e1}')` });
  });
  it("docente não revoga; revogar duas vezes é conflito", async () => {
    negado(await db.como("docente", `select fn_revogar_consentimento('${ID.e1}')`));
    conflito(await db.como("responsavel", `select fn_revogar_consentimento('${ID.e1}')`));
  });
  it("D-25: um responsável revogou sozinho; todos os demais vinculados e a coordenação foram avisados", async () => {
    const r = ok(await db.sistema(`select distinct usuario_id from notificacoes where tipo = 'CONSENTIMENTO_REVOGADO' and estudante_id = '${ID.e1}'`));
    const avisados = r.map((x) => x.usuario_id);
    for (const p of ["docente", "docente2", "responsavel", "saude", "saude2", "coordenacao"] as const) {
      expect(avisados).toContain(usuarioId(p));
    }
    expect(avisados).not.toContain(usuarioId("responsavel2")); // quem revogou
  });
  it("S-26 docente não observa", async () => {
    negado(await db.como("docente", `insert into observacoes (ciclo_id, dimensao, valor_escala) values ('${ID.cicloE1}','ATENCAO_SUSTENTADA','ESTAVEL')`));
  });
  it("S-27 docente e profissional deixam de ler perfil, observações, materiais e notas", async () => {
    for (const p of ["docente", "saude"] as const) {
      expect(ok(await db.como(p, `select * from versoes_perfil where estudante_id = '${ID.e1}'`))).toHaveLength(0);
      expect(ok(await db.como(p, `select * from observacoes`))).toHaveLength(0);
      expect(ok(await db.como(p, `select * from materiais_adaptados where estudante_id = '${ID.e1}'`))).toHaveLength(0);
    }
    negado(await db.como("saude", `select * from fn_ler_notas_clinicas('${ID.e1}')`));
    negado(await db.como("saude", `select fn_validar_versao('${ID.pendenteE1}', 'APROVAR')`));
  });
  it("S-28 docente não aprova rascunho depois da revogação (descartar continua possível)", async () => {
    negado(await db.como("docente2", `select fn_decidir_material('${ID.rascunhoDocente2}', 'APROVAR')`));
    ok(await db.como("docente2", `select fn_decidir_material('${ID.rascunhoDocente2}', 'DESCARTAR')`));
  });
  it("PERMITIDO: responsável e coordenação continuam lendo o histórico", async () => {
    expect(ok(await db.como("responsavel", `select * from versoes_perfil where estudante_id = '${ID.e1}'`))).toHaveLength(2);
    expect(ok(await db.como("coordenacao", `select * from versoes_perfil where estudante_id = '${ID.e1}'`))).toHaveLength(2);
  });
  it("PERMITIDO: reconceder reabre o acesso do docente", async () => {
    const r = await db.fluxo([
      { ator: "responsavel", sql: `select fn_conceder_consentimento('${ID.e1}', ${ESCOPOS}, 'v3')` },
      { ator: "docente", sql: `select * from versoes_perfil where estudante_id = '${ID.e1}'` },
    ]);
    expect(ok(r[1]).length).toBeGreaterThan(0);
  });
});
