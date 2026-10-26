import { describe, expect, it, vi } from "vitest";
import { PARAMETROS_PADRAO, type ObservacaoHistorica, type ParametrosAdaptacao } from "@pei-vivo/motor-adaptacao";
import { calcularFechamento, fecharCiclo, type DadosFechamento, type PortasFecharCiclo } from "./fecharCiclo";

const CICLO = "50000000-0000-4000-8000-000000000001";
const VIGENTE: ParametrosAdaptacao = { ...PARAMETROS_PADRAO, maxLinhasPorBloco: 5, nivelVocabulario: "INTERMEDIARIO" };
const obs = (
  numeroCiclo: number,
  dimensao: ObservacaoHistorica["dimensao"],
  valorEscala: ObservacaoHistorica["valorEscala"],
  evidencia: string | null = null,
): ObservacaoHistorica => ({
  numeroCiclo,
  dimensao,
  valorEscala,
  evidencia,
});
const campo = (diff: ReturnType<typeof calcularFechamento>["diff"], c: string) => diff.find((d) => d.campo === c)!;

describe("calcularFechamento · RN03 (assimetria)", () => {
  it("reduzir é imediato: uma observação 'reduzida' já baixa o bloco", () => {
    const { proposta, diff } = calcularFechamento(3, VIGENTE, [obs(3, "ATENCAO_SUSTENTADA", "REDUZIDA")]);
    expect(proposta.maxLinhasPorBloco).toBe(4);
    expect(campo(diff, "maxLinhasPorBloco")).toMatchObject({ antes: "5", depois: "4", mudou: true, aguardandoSegundoCiclo: false });
  });
  it("elevar exige 2 ciclos: 'ampliada' uma vez não sobe e o diff mostra 'aguardando 2º ciclo'", () => {
    const { proposta, diff } = calcularFechamento(3, VIGENTE, [obs(2, "AUTONOMIA_LEXICAL", "ESTAVEL"), obs(3, "AUTONOMIA_LEXICAL", "AMPLIADA")]);
    expect(proposta.nivelVocabulario).toBe("INTERMEDIARIO");
    expect(campo(diff, "nivelVocabulario")).toMatchObject({ mudou: false, aguardandoSegundoCiclo: true });
  });
  it("elevar com 2 ciclos consecutivos 'ampliada' sobe um nível", () => {
    const { proposta } = calcularFechamento(3, VIGENTE, [obs(2, "AUTONOMIA_LEXICAL", "AMPLIADA"), obs(3, "AUTONOMIA_LEXICAL", "AMPLIADA")]);
    expect(proposta.nivelVocabulario).toBe("ORIGINAL");
  });
  it("sem vigente, parte dos parâmetros padrão; âncora vem da evidência de interesse", () => {
    const { proposta } = calcularFechamento(1, null, [obs(1, "INTERESSE_MANIFESTO", "AMPLIADA", "  Dinossauros ")]);
    expect(proposta.interesseAncora).toBe("dinossauros");
    expect(proposta.blocosPorMaterial).toBe(PARAMETROS_PADRAO.blocosPorMaterial);
  });
  it("observações de ciclos futuros são ignoradas", () => {
    const { proposta } = calcularFechamento(2, VIGENTE, [obs(3, "ATENCAO_SUSTENTADA", "REDUZIDA")]);
    expect(proposta).toEqual(VIGENTE);
  });
});

describe("fecharCiclo · caso de uso", () => {
  const dados: DadosFechamento = {
    docenteId: "doc-do-banco",
    estudanteId: "e1",
    cicloId: CICLO,
    numeroCiclo: 3,
    vigente: { id: "v1", numeroCiclo: 2, parametros: VIGENTE },
    validacaoClinica: true,
    historico: [obs(3, "FADIGA_TAREFA", "AMPLIADA")],
  };
  const portas = (extra: Partial<PortasFecharCiclo> = {}) => {
    const registrar = vi.fn(async () => ({ versaoId: "v2", statusValidacao: "PENDENTE" as const, modoPedagogico: false }));
    return { p: { dados: vi.fn(async () => dados), registrar, ...extra } satisfies PortasFecharCiclo, registrar };
  };

  it("aceita qualquer uuid que o Postgres aceita, inclusive os do seed (versão 0)", async () => {
    const { p } = portas();
    await expect(fecharCiclo({ cicloId: "00000000-0000-0000-0000-000000000020" }, p)).resolves.toMatchObject({ versaoId: "v2" });
  });
  it("corpo inválido → 400", async () => {
    await expect(fecharCiclo({ cicloId: "nao-uuid" }, portas().p)).rejects.toMatchObject({ status: 400 });
  });
  it("banco nega os dados (ex.: responsável) → 403, nada é registrado", async () => {
    const { p, registrar } = portas({ dados: vi.fn(async () => Promise.reject(Object.assign(new Error("negado"), { code: "42501" }))) });
    await expect(fecharCiclo({ cicloId: CICLO }, p)).rejects.toMatchObject({ status: 403 });
    expect(registrar).not.toHaveBeenCalled();
  });
  it("ciclo sem observação (PT409) → 409", async () => {
    const { p } = portas({ dados: vi.fn(async () => Promise.reject(Object.assign(new Error("sem obs"), { code: "PT409" }))) });
    await expect(fecharCiclo({ cicloId: CICLO }, p)).rejects.toMatchObject({ status: 409 });
  });
  it("fechar duas vezes (o banco trava o ciclo e responde PT409 na segunda) → 409", async () => {
    const { p } = portas({ registrar: vi.fn(async () => Promise.reject(Object.assign(new Error("Este ciclo já foi fechado."), { code: "PT409" }))) });
    await expect(fecharCiclo({ cicloId: CICLO }, p)).rejects.toMatchObject({ status: 409, message: "Este ciclo já foi fechado." });
  });
  it("duas versões vigentes ao mesmo tempo (uq_versao_vigente, 23505) → 409", async () => {
    const { p } = portas({ registrar: vi.fn(async () => Promise.reject(Object.assign(new Error("duplicate key"), { code: "23505" }))) });
    await expect(fecharCiclo({ cicloId: CICLO }, p)).rejects.toMatchObject({ status: 409 });
  });
  it("falha de rede ao gravar → 500 genérico", async () => {
    const { p } = portas({ registrar: vi.fn(async () => Promise.reject(new TypeError("fetch failed"))) });
    await expect(fecharCiclo({ cicloId: CICLO }, p)).rejects.toMatchObject({ status: 500, codigo: "INTERNO" });
  });
  it("campo extra no corpo (ex.: docenteId forjado) → 400, sem consultar o banco", async () => {
    const { p } = portas();
    await expect(fecharCiclo({ cicloId: CICLO, docenteId: "outro" }, p)).rejects.toMatchObject({ status: 400 });
    expect(p.dados).not.toHaveBeenCalled();
  });
  it("PERMITIDO: registra com o docente do banco e os parâmetros do motor; devolve o diff", async () => {
    const { p, registrar } = portas();
    const r = await fecharCiclo({ cicloId: CICLO }, p);
    expect(registrar).toHaveBeenCalledWith("doc-do-banco", CICLO, expect.objectContaining({ blocosPorMaterial: 6 }));
    expect(r).toMatchObject({ versaoId: "v2", statusValidacao: "PENDENTE", modoPedagogico: false });
    expect(r.diff.find((d) => d.campo === "blocosPorMaterial")).toMatchObject({ antes: "8", depois: "6", mudou: true });
  });
});
