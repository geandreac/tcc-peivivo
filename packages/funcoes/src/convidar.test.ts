import { describe, expect, it, vi } from "vitest";
import { AVISO_CONTA_NO_AUTH, convidar, type DadosConvite, type PortasConvidar } from "./convidar";

const ESCOLA = "30000000-0000-4000-8000-000000000001";
const ESTUDANTE = "40000000-0000-4000-8000-000000000001";
const base = { escolaId: ESCOLA, email: " Nova.Docente@Example.TEST ", papel: "DOCENTE" };

function portas(extra: Partial<PortasConvidar> = {}, jaTemConta = false) {
  const p = {
    preparar: vi.fn(async (e: DadosConvite) => ({ autorId: "coord-do-banco", email: e.email, jaTemConta })),
    convidarNoAuth: vi.fn(async (_email: string): Promise<string | null> => "auth-novo"),
    registrar: vi.fn(async (_r: unknown) => ({})),
    ...extra,
  };
  return p;
}
const erroBanco = (code: string) => Object.assign(new Error("negado pelo banco"), { code });

describe("convidar · caminho negado primeiro", () => {
  it("corpo inválido ou com campo extra → 400, sem tocar no banco nem no Auth", async () => {
    const p = portas();
    for (const corpo of [{}, { ...base, email: "x" }, { ...base, papel: "COORDENACAO" }, { ...base, autorId: "forjado" }]) {
      await expect(convidar(corpo, p)).rejects.toMatchObject({ status: 400 });
    }
    expect(p.preparar).not.toHaveBeenCalled();
    expect(p.convidarNoAuth).not.toHaveBeenCalled();
  });
  it("banco nega o preparo (não é coordenação / sem aal2) → 403 e NENHUM e-mail é enviado", async () => {
    const p = portas({ preparar: vi.fn(async () => Promise.reject(erroBanco("42501"))) });
    await expect(convidar(base, p)).rejects.toMatchObject({ status: 403, codigo: "NEGADO" });
    expect(p.convidarNoAuth).not.toHaveBeenCalled();
  });
  it("falha do Auth ao enviar → 502, nada é registrado", async () => {
    const p = portas({ convidarNoAuth: vi.fn(async () => Promise.reject(new Error("smtp"))) });
    await expect(convidar(base, p)).rejects.toMatchObject({ status: 502 });
    expect(p.registrar).not.toHaveBeenCalled();
  });
  it.each([
    ["e-mail inválido", { ...base, email: "sem-arroba" }],
    ["papel não convidável", { ...base, papel: "COORDENACAO" }],
    ["responsável sem estudante é recusado pelo banco", null],
  ])("%s → 400", async (_n, corpo) => {
    const p = corpo ? portas() : portas({ preparar: vi.fn(async () => Promise.reject(erroBanco("22023"))) });
    await expect(convidar(corpo ?? { ...base, papel: "RESPONSAVEL" }, p)).rejects.toMatchObject({ status: 400 });
    expect(p.convidarNoAuth).not.toHaveBeenCalled();
  });
  it("registro falha depois do e-mail → a conta recém-criada é apagada e o erro do banco sobe", async () => {
    const desfazerNoAuth = vi.fn(async (_id: string) => undefined);
    const p = portas({ registrar: vi.fn(async () => Promise.reject(erroBanco("42501"))), desfazerNoAuth });
    await expect(convidar(base, p)).rejects.toMatchObject({ status: 403 });
    expect(desfazerNoAuth).toHaveBeenCalledWith("auth-novo");
  });
  it("compensação que também falha não esconde o erro original", async () => {
    const p = portas({
      registrar: vi.fn(async () => Promise.reject(erroBanco("23505"))),
      desfazerNoAuth: vi.fn(async () => Promise.reject(new Error("auth fora"))),
    });
    await expect(convidar(base, p)).rejects.toMatchObject({ status: 409 });
  });
  it("sem conta criada nesta chamada (já tinha conta ou convite pendente), nada é apagado", async () => {
    const desfazerNoAuth = vi.fn(async (_id: string) => undefined);
    const falha = vi.fn(async () => Promise.reject(erroBanco("42501")));
    await expect(convidar(base, portas({ registrar: falha, desfazerNoAuth }, true))).rejects.toMatchObject({ status: 403 });
    await expect(convidar(base, portas({ registrar: falha, desfazerNoAuth, convidarNoAuth: vi.fn(async () => null) }))).rejects.toMatchObject({ status: 403 });
    expect(desfazerNoAuth).not.toHaveBeenCalled();
  });
  it("convite duplicado (uq_convite_pendente, 23505) → 409", async () => {
    const p = portas({ registrar: vi.fn(async () => Promise.reject(erroBanco("23505"))) });
    await expect(convidar(base, p)).rejects.toMatchObject({ status: 409, codigo: "CONFLITO" });
  });
});

describe("convidar · caminho permitido", () => {
  it("normaliza o e-mail, envia o convite e registra com o autor vindo do banco", async () => {
    const p = portas();
    expect(await convidar(base, p)).toEqual({ emailEnviado: true, avisos: [] });
    expect(p.convidarNoAuth).toHaveBeenCalledWith("nova.docente@example.test");
    expect(p.registrar).toHaveBeenCalledWith(
      expect.objectContaining({ autorId: "coord-do-banco", authUserId: "auth-novo", email: "nova.docente@example.test" }),
    );
  });
  it("quem já aceitou convite antes não recebe e-mail; o acesso novo é registrado", async () => {
    const p = portas({}, true);
    expect(await convidar({ ...base, papel: "RESPONSAVEL", estudanteId: ESTUDANTE, conferidoPresencialmente: true }, p)).toEqual({
      emailEnviado: false,
      avisos: [],
    });
    expect(p.convidarNoAuth).not.toHaveBeenCalled();
    expect(p.registrar).toHaveBeenCalled();
  });
  it("convite pendente no Auth → registra e avisa como a pessoa entra", async () => {
    const p = portas({ convidarNoAuth: vi.fn(async () => null) });
    expect(await convidar(base, p)).toEqual({ emailEnviado: false, avisos: [AVISO_CONTA_NO_AUTH] });
  });
});
