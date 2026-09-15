/**
 * Testes da matriz de permissões v2 no mock (P4.20 antecipado). Cada bloco
 * começa pelo caminho NEGADO (CLAUDE.md, "Testes"). Quando o supabaseApi
 * existir, estes mesmos cenários viram os testes de RLS (P1.11–P1.19).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { criarMockApi } from "./mockApi";
import { ErroApi } from "./erros";
import { ID } from "../mocks/dados";

const api = criarMockApi({ latenciaMs: 0, persistir: false });

async function esperaNegado(p: Promise<unknown>, codigo: "NEGADO" | "NAO_ENCONTRADO" | "CONFLITO" | "VALIDACAO" | "NAO_AUTENTICADO" = "NEGADO") {
  await expect(p).rejects.toSatisfy((e: unknown) => e instanceof ErroApi && e.codigo === codigo);
}

beforeEach(async () => {
  await api.reiniciarDados();
  await api.sair();
});

describe("RN02 ⭐ — nota clínica reservada", () => {
  it("docente lendo notas_clinicas → NEGADO (Exemplo 3 da rastreabilidade)", async () => {
    await api.entrar(ID.docente);
    await esperaNegado(api.listarNotasClinicas(ID.estudanteA));
    await esperaNegado(api.registrarNotaClinica(ID.estudanteA, "tentativa"));
  });
  it("responsável e coordenação → NEGADO", async () => {
    await api.entrar(ID.responsavel);
    await esperaNegado(api.listarNotasClinicas(ID.estudanteA));
    await api.entrar(ID.coordenacao);
    await esperaNegado(api.listarNotasClinicas(ID.estudanteA));
  });
  it("profissional de saúde vinculado lê e escreve", async () => {
    await api.entrar(ID.profissional);
    const antes = await api.listarNotasClinicas(ID.estudanteA);
    await api.registrarNotaClinica(ID.estudanteA, "nova nota fictícia");
    expect((await api.listarNotasClinicas(ID.estudanteA)).length).toBe(antes.length + 1);
  });
});

describe("RN01 / RN08 — consentimento", () => {
  it("sem consentimento (estudante B): docente não abre ciclo, não observa, não gera", async () => {
    await api.entrar(ID.docente);
    await esperaNegado(api.abrirCiclo(ID.estudanteB));
    await esperaNegado(api.gerarMaterial(ID.estudanteB, "t", "texto"));
    await esperaNegado(api.listarObservacoes(ID.estudanteB)); // D-11: docente perde leitura
  });
  it("responsável e coordenação continuam lendo sem consentimento (D-11)", async () => {
    await api.entrar(ID.responsavel);
    expect(await api.listarCiclos(ID.estudanteB)).toEqual([]);
    await api.entrar(ID.coordenacao);
    expect(await api.listarVersoes(ID.estudanteB)).toEqual([]);
  });
  it("revogar bloqueia geração imediatamente e gera evento de auditoria", async () => {
    await api.entrar(ID.responsavel);
    await api.revogarConsentimento(ID.estudanteA);
    const auditoria = await api.listarAuditoria(ID.estudanteA);
    expect(auditoria[0]?.evento).toBe("REVOGACAO");
    await api.entrar(ID.docente);
    await esperaNegado(api.gerarMaterial(ID.estudanteA, "t", "texto"));
    await esperaNegado(api.obterVersaoVigente(ID.estudanteA));
  });
  it("só o responsável concede/revoga; docente → NEGADO", async () => {
    await api.entrar(ID.docente);
    await esperaNegado(api.revogarConsentimento(ID.estudanteA));
    await esperaNegado(api.concederConsentimento(ID.estudanteB, ["geracao_material"]));
  });
  it("nova concessão reabre tudo", async () => {
    await api.entrar(ID.responsavel);
    await api.concederConsentimento(ID.estudanteB, ["observacao_pedagogica", "geracao_material"]);
    await api.entrar(ID.docente);
    const ciclo = await api.abrirCiclo(ID.estudanteB);
    expect(ciclo.numero).toBe(1);
  });
});

describe("D-12 / RN04 — rascunho é privado do docente", () => {
  it("responsável não vê rascunho; vê só APROVADO", async () => {
    await api.entrar(ID.responsavel);
    const lista = await api.listarMateriais(ID.estudanteA);
    expect(lista.every((m) => m.statusAprovacao === "APROVADO")).toBe(true);
    await esperaNegado(api.obterMaterial(ID.materialRascunho), "NAO_ENCONTRADO");
  });
  it("docente vê rascunho e aprova; depois o responsável passa a ver", async () => {
    await api.entrar(ID.docente);
    await api.aprovarMaterial(ID.materialRascunho);
    await api.entrar(ID.responsavel);
    expect((await api.obterMaterial(ID.materialRascunho)).statusAprovacao).toBe("APROVADO");
  });
  it("RN07: profissional não aprova material; só o docente", async () => {
    await api.entrar(ID.profissional);
    await esperaNegado(api.aprovarMaterial(ID.materialRascunho));
  });
});

describe("RF08/RF09 — gerar material (camada determinística, IA desligada)", () => {
  it("responsável não gera (D-02)", async () => {
    await api.entrar(ID.responsavel);
    await esperaNegado(api.gerarMaterial(ID.estudanteA, "t", "texto"));
  });
  it("docente gera rascunho com snapshot da versão vigente e iaAplicada=false", async () => {
    await api.entrar(ID.docente);
    const m = await api.gerarMaterial(ID.estudanteA, "Teste", "Leia o texto e depois responda.\n\nParágrafo dois.");
    expect(m.statusAprovacao).toBe("RASCUNHO");
    expect(m.versaoPerfilId).toBe(ID.versao3);
    expect(m.iaAplicada).toBe(false);
    expect(m.textoAdaptado?.enunciados[0]?.etapas).toEqual(["Leia o texto.", "Responda."]);
  });
  it("cache: mesmo texto + mesma versão → mesmo material (P3.5)", async () => {
    await api.entrar(ID.docente);
    const a = await api.gerarMaterial(ID.estudanteA, "A", "Texto idêntico.");
    const b = await api.gerarMaterial(ID.estudanteA, "B", "Texto idêntico.");
    expect(b.id).toBe(a.id);
  });
  it("sem versão vigente → CONFLITO", async () => {
    await api.entrar(ID.responsavel);
    await api.concederConsentimento(ID.estudanteB, ["geracao_material"]);
    await api.entrar(ID.docente);
    await esperaNegado(api.gerarMaterial(ID.estudanteB, "t", "texto"), "CONFLITO");
  });
  it("texto vazio → VALIDACAO", async () => {
    await api.entrar(ID.docente);
    await esperaNegado(api.gerarMaterial(ID.estudanteA, "t", "   "), "VALIDACAO");
  });
});

describe("RF05–RF07 — fechar ciclo e validar (RN03, RN05, RN06)", () => {
  it("responsável não fecha ciclo", async () => {
    await api.entrar(ID.responsavel);
    await esperaNegado(api.fecharCiclo(ID.ciclo4));
  });
  it("com profissional vinculado a versão nasce PENDENTE; o vigente anterior continua", async () => {
    await api.entrar(ID.docente);
    const r = await api.fecharCiclo(ID.ciclo4);
    expect(r.modoPedagogico).toBe(false);
    expect(r.versao.statusValidacao).toBe("PENDENTE");
    expect((await api.obterVersaoVigente(ID.estudanteA))?.id).toBe(ID.versao3);
    // RN03: AUTONOMIA_LEXICAL AMPLIADA há 1 ciclo só → aguarda 2º ciclo
    const nivel = r.diff.find((d) => d.campo === "nivelVocabulario");
    expect(nivel?.mudou).toBe(false);
    expect(nivel?.aguardandoSegundoCiclo).toBe(true);
    // FADIGA AMPLIADA → reduz blocos imediatamente
    expect(r.versao.parametros.blocosPorMaterial).toBe(6);
    // próximo ciclo aberto automaticamente
    expect((await api.obterCicloAberto(ID.estudanteA))?.numero).toBe(5);
  });
  it("ciclo já fechado → CONFLITO", async () => {
    await api.entrar(ID.docente);
    await esperaNegado(api.fecharCiclo(ID.ciclo3), "CONFLITO");
  });
  it("RN06: sem profissional vinculado a versão nasce VIGENTE (modo pedagógico)", async () => {
    await api.entrar(ID.responsavel);
    await api.concederConsentimento(ID.estudanteB, ["observacao_pedagogica"]);
    await api.entrar(ID.docente);
    const ciclo = await api.abrirCiclo(ID.estudanteB);
    await api.registrarObservacao(ciclo.id, { dimensao: "ATENCAO_SUSTENTADA", valorEscala: "REDUZIDA" });
    const r = await api.fecharCiclo(ciclo.id);
    expect(r.modoPedagogico).toBe(true);
    expect(r.versao.statusValidacao).toBe("VIGENTE");
    expect(r.versao.parametros.maxLinhasPorBloco).toBe(5);
  });
  it("docente não valida; profissional aprova → VIGENTE com validador", async () => {
    await api.entrar(ID.docente);
    const { versao } = await api.fecharCiclo(ID.ciclo4);
    await esperaNegado(api.validarVersao(versao.id, "APROVAR"));
    await api.entrar(ID.profissional);
    const v = await api.validarVersao(versao.id, "APROVAR");
    expect(v.statusValidacao).toBe("VIGENTE");
    expect(v.validadorId).toBe(ID.profissional);
    expect((await api.obterVersaoVigente(ID.estudanteA))?.id).toBe(versao.id);
  });
  it("solicitar ajuste exige justificativa e mantém a vigente", async () => {
    await api.entrar(ID.docente);
    const { versao } = await api.fecharCiclo(ID.ciclo4);
    await api.entrar(ID.profissional);
    await esperaNegado(api.validarVersao(versao.id, "AJUSTE", ""), "VALIDACAO");
    const v = await api.validarVersao(versao.id, "AJUSTE", "Reduzir ainda mais o bloco.");
    expect(v.statusValidacao).toBe("EM_REVISAO");
    expect((await api.obterVersaoVigente(ID.estudanteA))?.id).toBe(ID.versao3);
    const pend = await api.listarPendencias();
    expect(pend.some((p) => p.versao.id === versao.id)).toBe(true);
  });
});

describe("RF03/RF04 — observações (D-04)", () => {
  it("coordenação não registra observação", async () => {
    await api.entrar(ID.coordenacao);
    await esperaNegado(api.registrarObservacao(ID.ciclo4, { dimensao: "FADIGA_TAREFA", valorEscala: "ESTAVEL" }));
  });
  it("papel_autor é preenchido pelo vínculo, autor é o usuário atual", async () => {
    await api.entrar(ID.responsavel);
    const o = await api.registrarObservacao(ID.ciclo4, { dimensao: "INTERESSE_MANIFESTO", valorEscala: "AMPLIADA", evidencia: "Vulcões!" });
    expect(o.papelAutor).toBe("RESPONSAVEL");
    expect(o.autorId).toBe(ID.responsavel);
  });
  it("ciclo fechado não aceita observação", async () => {
    await api.entrar(ID.docente);
    await esperaNegado(api.registrarObservacao(ID.ciclo3, { dimensao: "FADIGA_TAREFA", valorEscala: "ESTAVEL" }), "CONFLITO");
  });
});

describe("RF13 — desfecho", () => {
  it("segundo desfecho no mesmo material → CONFLITO; responsável → NEGADO", async () => {
    await api.entrar(ID.responsavel);
    await esperaNegado(api.registrarDesfecho(ID.materialAprovado, "PARCIAL"));
    await api.entrar(ID.docente);
    await esperaNegado(api.registrarDesfecho(ID.materialAprovado, "PARCIAL"), "CONFLITO");
    await esperaNegado(api.registrarDesfecho(ID.materialRascunho, "PARCIAL"), "CONFLITO");
  });
});

describe("D-08 / D-13 / D-14 — cadastro e vínculos", () => {
  it("docente não cadastra estudante nem cria vínculo", async () => {
    await api.entrar(ID.docente);
    await esperaNegado(api.cadastrarEstudante({ nome: "Fictício C", dataNascimento: "2016-01-01" }));
    await esperaNegado(api.vincular({ usuarioId: ID.docente2, estudanteId: ID.estudanteA, papel: "DOCENTE" }));
  });
  it("coordenação cadastra (estudante + vínculo atômico) e vincula", async () => {
    await api.entrar(ID.coordenacao);
    const e = await api.cadastrarEstudante({ nome: "Fictício C", dataNascimento: "2016-01-01", turma: "3º ano" });
    expect((await api.listarVinculos(e.id)).map((v) => v.papel)).toEqual(["COORDENACAO"]);
    await esperaNegado(api.vincular({ usuarioId: ID.fono, estudanteId: e.id, papel: "PROFISSIONAL_SAUDE" }), "VALIDACAO"); // D-13
    await api.vincular({ usuarioId: ID.fono, estudanteId: e.id, papel: "PROFISSIONAL_SAUDE", registroConselho: "CRFa-DEV-1" });
    await esperaNegado(api.vincular({ usuarioId: ID.fono, estudanteId: e.id, papel: "DOCENTE" }), "CONFLITO"); // D-14
  });
  it("desativar vínculo remove o acesso imediatamente", async () => {
    await api.entrar(ID.coordenacao);
    const vin = (await api.listarVinculos(ID.estudanteA)).find((v) => v.papel === "DOCENTE")!;
    await api.desativarVinculo(vin.id);
    await api.entrar(ID.docente);
    expect((await api.listarEstudantes()).some((e) => e.id === ID.estudanteA)).toBe(false);
    await esperaNegado(api.obterEstudante(ID.estudanteA));
  });
  it("D-01: docente não vê a data do laudo", async () => {
    await api.entrar(ID.docente);
    expect((await api.obterEstudante(ID.estudanteA)).laudoApresentadoEm).toBeNull();
    await api.entrar(ID.coordenacao);
    expect((await api.obterEstudante(ID.estudanteA)).laudoApresentadoEm).not.toBeNull();
  });
});

describe("RF15 / D-05 / D-06 — LGPD e auditoria", () => {
  it("docente não exporta, não exclui, não lê auditoria", async () => {
    await api.entrar(ID.docente);
    await esperaNegado(api.exportarDados(ID.estudanteA));
    await esperaNegado(api.excluirEstudante(ID.estudanteA, "Miguel (fictício)"));
    await esperaNegado(api.listarAuditoria(ID.estudanteA));
  });
  it("exportação não inclui notas clínicas", async () => {
    await api.entrar(ID.responsavel);
    const e = await api.exportarDados(ID.estudanteA);
    expect(JSON.stringify(e)).not.toContain("Hipótese de trabalho");
    expect(e.materiaisAprovados.every((m) => m.statusAprovacao === "APROVADO")).toBe(true);
  });
  it("exclusão exige o nome exato, apaga em cascata (inclusive notas) e deixa só o evento", async () => {
    await api.entrar(ID.responsavel);
    await esperaNegado(api.excluirEstudante(ID.estudanteA, "outro nome"), "VALIDACAO");
    await api.excluirEstudante(ID.estudanteA, "Miguel (fictício)");
    await esperaNegado(api.obterEstudante(ID.estudanteA), "NAO_ENCONTRADO");
    await api.entrar(ID.profissional);
    await esperaNegado(api.listarNotasClinicas(ID.estudanteA)); // sem vínculo → negado
  });
  it("sem sessão → NAO_AUTENTICADO", async () => {
    await esperaNegado(api.listarEstudantes(), "NAO_AUTENTICADO");
  });
});
