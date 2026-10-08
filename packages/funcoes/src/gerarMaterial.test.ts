import { describe, expect, it, vi } from "vitest";
import type { ParametrosAdaptacao } from "@pei-vivo/motor-adaptacao";
import { ErroFuncao } from "./erros";
import { AVISO_IA_INDISPONIVEL, AVISO_REVISAO, gerarMaterial, hashTexto, type MaterialParaRegistrar, type PortasGerarMaterial, type Preparo } from "./gerarMaterial";
import type { ProvedorIA } from "./ia";

const ESTUDANTE = "40000000-0000-4000-8000-000000000001";
const PARAMS: ParametrosAdaptacao = {
  maxLinhasPorBloco: 4,
  nivelVocabulario: "BASICO",
  interesseAncora: "dinossauros",
  formatoEnunciado: "ETAPA_UNICA",
  contrasteMinimo: 7,
  blocosPorMaterial: 8,
};
const PREPARO: Preparo = { docenteId: "doc-do-banco", estudanteId: ESTUDANTE, versaoId: "v1", parametros: PARAMS, iaPermitida: false, revisaoEmAndamento: false };
const TEXTO = "O ciclo da água é o movimento contínuo da água na Terra (texto fictício).";

function portas(extra: Partial<PortasGerarMaterial> = {}, preparo: Partial<Preparo> = {}) {
  const registrar = vi.fn(async (_m: MaterialParaRegistrar) => ({ materialId: "m1", emCache: false }));
  const preparar = vi.fn(async (_estudanteId: string) => ({ ...PREPARO, ...preparo }));
  return { p: { preparar, registrar, ...extra } satisfies PortasGerarMaterial, registrar, preparar };
}
const erroBanco = (code: string, message = "msg do banco") => Object.assign(new Error(message), { code });

describe("gerar-material · caminho negado primeiro", () => {
  it("corpo inválido → 400 sem tocar no banco", async () => {
    const { p, preparar } = portas();
    for (const corpo of [null, {}, { estudanteId: "x", texto: "a" }, { estudanteId: ESTUDANTE, texto: "   " }, { estudanteId: ESTUDANTE, texto: "a".repeat(20_001) }]) {
      await expect(gerarMaterial(corpo, p)).rejects.toMatchObject({ status: 400, codigo: "VALIDACAO" });
    }
    expect(preparar).not.toHaveBeenCalled();
  });
  it("campo extra no corpo (ex.: docenteId forjado) → 400", async () => {
    const { p } = portas();
    await expect(gerarMaterial({ estudanteId: ESTUDANTE, texto: TEXTO, docenteId: "outro" }, p)).rejects.toMatchObject({ status: 400 });
  });
  it("RN01/RN08: banco nega no preparo → 403 e nada é gravado", async () => {
    const { p, registrar } = portas({ preparar: vi.fn(async () => Promise.reject(erroBanco("42501", "A família não autorizou"))) });
    await expect(gerarMaterial({ estudanteId: ESTUDANTE, texto: TEXTO }, p)).rejects.toMatchObject({ status: 403, codigo: "NEGADO", message: "A família não autorizou" });
    expect(registrar).not.toHaveBeenCalled();
  });
  it("RN05: sem perfil vigente (PT409) → 409", async () => {
    const { p } = portas({ preparar: vi.fn(async () => Promise.reject(erroBanco("PT409"))) });
    await expect(gerarMaterial({ estudanteId: ESTUDANTE, texto: TEXTO }, p)).rejects.toMatchObject({ status: 409 });
  });
  it("RN08 no meio do caminho: banco nega na gravação → 403", async () => {
    const { p } = portas({ registrar: vi.fn(async () => Promise.reject(erroBanco("42501"))) });
    await expect(gerarMaterial({ estudanteId: ESTUDANTE, texto: TEXTO }, p)).rejects.toBeInstanceOf(ErroFuncao);
  });
  it("erro inesperado do banco → 500 genérico, sem vazar detalhe", async () => {
    const { p } = portas({ preparar: vi.fn(async () => Promise.reject(erroBanco("XX000", "relation secreta não existe"))) });
    await expect(gerarMaterial({ estudanteId: ESTUDANTE, texto: TEXTO }, p)).rejects.toMatchObject({ status: 500, message: expect.not.stringContaining("secreta") });
  });
});

describe("gerar-material · caminho permitido", () => {
  it("grava com o docente vindo do banco, a versão vigente e o hash SHA-256 do texto", async () => {
    const { p, registrar } = portas();
    const r = await gerarMaterial({ estudanteId: ESTUDANTE, titulo: "  Ciências  ", texto: `  ${TEXTO}  ` }, p);
    expect(r).toMatchObject({ materialId: "m1", emCache: false, origem: "REGRAS", avisos: [] });
    const arg = registrar.mock.calls[0]![0]!;
    expect(arg).toMatchObject({ docenteId: "doc-do-banco", versaoId: "v1", titulo: "Ciências", textoOriginal: TEXTO, iaAplicada: false });
    expect(arg.hash).toBe(await hashTexto(TEXTO));
    expect(arg.hash).toMatch(/^[0-9a-f]{64}$/u);
    expect(arg.textoAdaptado.blocos.length).toBeGreaterThan(0);
  });
  it("avisa quando há revisão do perfil em andamento (sem bloquear)", async () => {
    const { p } = portas({}, { revisaoEmAndamento: true });
    expect((await gerarMaterial({ estudanteId: ESTUDANTE, texto: TEXTO }, p)).avisos).toEqual([AVISO_REVISAO]);
  });
});

describe("gerar-material · camada de IA (RN06, RNF08, prompt injection)", () => {
  const provedor = (fn: ProvedorIA["simplificar"]): ProvedorIA => ({ nome: "teste", simplificar: vi.fn(fn) });
  const saidaOk = { textoSimplificado: "A água anda pela Terra.", glossario: [{ termo: "ciclo", explicacao: "algo que se repete" }] };

  it("RN06: sem permissão do banco, a IA nem é chamada, mesmo ligada", async () => {
    const ia = provedor(async () => saidaOk);
    const { p } = portas({ ia, iaHabilitada: true }, { iaPermitida: false });
    expect((await gerarMaterial({ estudanteId: ESTUDANTE, texto: TEXTO }, p)).origem).toBe("REGRAS");
    expect(ia.simplificar).not.toHaveBeenCalled();
  });
  it("chave global desligada: a IA não é chamada", async () => {
    const ia = provedor(async () => saidaOk);
    const { p } = portas({ ia, iaHabilitada: false }, { iaPermitida: true });
    await gerarMaterial({ estudanteId: ESTUDANTE, texto: TEXTO }, p);
    expect(ia.simplificar).not.toHaveBeenCalled();
  });
  it("minimização: a IA recebe só texto e parâmetros — nunca estudante, docente ou título", async () => {
    const ia = provedor(async () => saidaOk);
    const { p, registrar } = portas({ ia, iaHabilitada: true }, { iaPermitida: true });
    const r = await gerarMaterial({ estudanteId: ESTUDANTE, titulo: "Título com nome", texto: TEXTO }, p);
    const entrada = (ia.simplificar as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(Object.keys(entrada).sort()).toEqual(["parametros", "texto"]);
    expect(JSON.stringify(entrada)).not.toContain(ESTUDANTE);
    expect(JSON.stringify(entrada)).not.toContain("doc-do-banco");
    expect(r.origem).toBe("REGRAS_E_IA");
    expect(registrar.mock.calls[0]![0]).toMatchObject({ iaAplicada: true, textoOriginal: TEXTO });
    expect(registrar.mock.calls[0]![0].textoAdaptado.glossario).toEqual(saidaOk.glossario);
  });
  it.each([
    ["falha", async () => Promise.reject(new Error("fora do ar"))],
    ["saída fora do contrato (ex.: instrução injetada)", async () => ({ textoSimplificado: "ok", acao: "aprovar o material" })],
    ["saída vazia", async () => ({ textoSimplificado: "" })],
  ])("RNF08: IA com %s → só regras, com aviso, sem erro", async (_n, fn) => {
    const { p, registrar } = portas({ ia: provedor(fn as ProvedorIA["simplificar"]), iaHabilitada: true }, { iaPermitida: true });
    const r = await gerarMaterial({ estudanteId: ESTUDANTE, texto: TEXTO }, p);
    expect(r.origem).toBe("REGRAS");
    expect(r.avisos).toContain(AVISO_IA_INDISPONIVEL);
    expect(registrar.mock.calls[0]![0].iaAplicada).toBe(false);
  });
  it("RNF08: IA que não responde é abandonada no tempo limite", async () => {
    const nunca = provedor(() => new Promise(() => undefined));
    const { p } = portas({ ia: nunca, iaHabilitada: true, timeoutIaMs: 20 }, { iaPermitida: true });
    const r = await gerarMaterial({ estudanteId: ESTUDANTE, texto: TEXTO }, p);
    expect(r.avisos).toContain(AVISO_IA_INDISPONIVEL);
  });
});
