/**
 * Contrato do `supabaseApi` com o PostgREST e as Edge Functions, com o cliente
 * Supabase simulado (sem rede). O comportamento do Supabase de verdade é
 * provado em packages/politicas/src/supabaseApi.test.ts (job `db` do CI).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { ErroApi } from "./erros";
import { criarSupabaseApi, traduzirErro } from "./supabaseApi";

describe("traduzirErro · SQLSTATE / PostgREST / rede → código estável do app", () => {
  it.each([
    [{ code: "42501", message: "Só o docente vinculado gera material." }, "NEGADO"],
    [{ code: "PT409", message: "Este ciclo já foi fechado." }, "CONFLITO"],
    [{ code: "23505", message: "duplicate key value" }, "CONFLITO"], // desfecho duplicado
    [{ code: "22023", message: "Parâmetros inválidos." }, "VALIDACAO"],
    [{ code: "22P02", message: "invalid input syntax for type uuid" }, "VALIDACAO"],
    [{ code: "PGRST116", message: "0 rows" }, "NAO_ENCONTRADO"],
    [{ code: "PGRST301", message: "JWT expired" }, "NAO_AUTENTICADO"],
    [{ status: 401, message: "Unauthorized" }, "NAO_AUTENTICADO"],
    [new TypeError("Failed to fetch"), "REDE"],
    [{ code: "XX000", message: "erro interno" }, "REDE"],
  ])("%o → %s", (erro, codigo) => {
    expect(traduzirErro(erro).codigo).toBe(codigo);
  });

  it("usa só a primeira linha da mensagem do banco (sem DETAIL/HINT)", () => {
    expect(traduzirErro({ code: "42501", message: "Negado.\nDETAIL: tabela notas_clinicas" }).message).toBe("Negado.");
  });
});

/** Cliente mínimo: só `functions.invoke`, que é o que fecharCiclo usa antes de qualquer leitura. */
function clienteComFuncao(resposta: { data?: unknown; error?: unknown }) {
  const invoke = vi.fn(async () => ({ data: resposta.data ?? null, error: resposta.error ?? null }));
  return { sb: { functions: { invoke } } as unknown as SupabaseClient, invoke };
}
/** Erro como o functions-js devolve para status ≠ 2xx: a Response fica em `context`. */
const erroHttp = (status: number, corpo: unknown) =>
  Object.assign(new Error("Edge Function returned a non-2xx status code"), { name: "FunctionsHttpError", context: new Response(JSON.stringify(corpo), { status }) });

describe("Edge Functions pelo supabaseApi · erros padronizados", () => {
  it("envia só o contrato da função (cicloId), nunca o docente", async () => {
    const { sb, invoke } = clienteComFuncao({ error: erroHttp(409, { erro: { codigo: "CONFLITO", mensagem: "x" } }) });
    await criarSupabaseApi(sb).fecharCiclo("c1").catch(() => undefined);
    expect(invoke).toHaveBeenCalledWith("fechar-ciclo", { body: { cicloId: "c1" } });
  });

  it.each([
    [403, "NEGADO", "NEGADO"],
    [409, "CONFLITO", "CONFLITO"],
    [400, "VALIDACAO", "VALIDACAO"],
    [500, "INTERNO", "REDE"],
  ])("%i { codigo: %s } → ErroApi %s com a mensagem do servidor", async (status, codigo, esperado) => {
    const { sb } = clienteComFuncao({ error: erroHttp(status, { erro: { codigo, mensagem: "Mensagem do servidor." } }) });
    await expect(criarSupabaseApi(sb).fecharCiclo("c1")).rejects.toMatchObject({ codigo: esperado, message: "Mensagem do servidor." });
  });

  it("sessão expirada: o gateway responde 401 com corpo próprio → NAO_AUTENTICADO (não 'falha de rede')", async () => {
    const { sb } = clienteComFuncao({ error: erroHttp(401, { code: 401, message: "Invalid JWT" }) });
    await expect(criarSupabaseApi(sb).fecharCiclo("c1")).rejects.toMatchObject({ codigo: "NAO_AUTENTICADO" });
  });

  it("sem resposta (rede caiu / função fora do ar) → REDE", async () => {
    const { sb } = clienteComFuncao({ error: Object.assign(new Error("Failed to send a request"), { name: "FunctionsFetchError" }) });
    const erro = await criarSupabaseApi(sb).fecharCiclo("c1").catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ErroApi);
    expect((erro as ErroApi).codigo).toBe("REDE");
  });

  it("corpo de erro que não é JSON (ex.: página do proxy) → REDE", async () => {
    const erro = Object.assign(new Error("non-2xx"), { context: new Response("<html>502</html>", { status: 502 }) });
    const { sb } = clienteComFuncao({ error: erro });
    await expect(criarSupabaseApi(sb).fecharCiclo("c1")).rejects.toMatchObject({ codigo: "REDE" });
  });
});

// ============================================================================
// Cliente simulado completo: registra cada consulta (tabela, colunas, filtros)
// e devolve linhas fictícias. Prova o que esta camada decide — colunas
// explícitas, filtros, snake→camel e guardas de papel —, não o banco.
type Op = [string, ...unknown[]];
interface Consulta {
  tabela: string;
  ops: Op[];
}
type Linhas = Record<string, unknown>[];

const DIA = 86_400_000;
const atras = (dias: number) => new Date(Date.now() - dias * DIA).toISOString();

function clienteSimulado(opcoes: {
  tabelas?: Record<string, Linhas | ((c: Consulta) => Linhas)>;
  rpcs?: Record<string, unknown | ((args: Record<string, unknown>) => unknown)>;
  rpcErros?: Record<string, { code: string; message: string }>;
  sessao?: boolean;
  invoke?: (nome: string, corpo: unknown) => unknown;
  auth?: Record<string, unknown>;
  mfa?: Record<string, unknown>;
}) {
  const consultas: Consulta[] = [];
  const rpcsChamadas: [string, Record<string, unknown> | undefined][] = [];
  function from(tabela: string) {
    const c: Consulta = { tabela, ops: [] };
    consultas.push(c);
    const resolver = () => {
      const fonte = opcoes.tabelas?.[tabela] ?? [];
      const linhas = typeof fonte === "function" ? fonte(c) : fonte;
      const unico = c.ops.some(([n]) => n === "single" || n === "maybeSingle");
      return { data: unico ? (linhas[0] ?? null) : linhas, error: null };
    };
    const construtor: Record<string, unknown> = new Proxy({} as Record<string, unknown>, {
      get(_alvo, nome: string) {
        if (nome === "then") return (ok: (v: unknown) => unknown, falha: (e: unknown) => unknown) => Promise.resolve(resolver()).then(ok, falha);
        return (...args: unknown[]) => {
          c.ops.push([nome, ...args]);
          return construtor;
        };
      },
    });
    return construtor;
  }
  const rpc = vi.fn(async (nome: string, args?: Record<string, unknown>) => {
    rpcsChamadas.push([nome, args]);
    const erro = opcoes.rpcErros?.[nome];
    if (erro) return { data: null, error: erro };
    const v = opcoes.rpcs?.[nome];
    return { data: typeof v === "function" ? (v as (a: Record<string, unknown>) => unknown)(args ?? {}) : (v ?? null), error: null };
  });
  const mfa = {
    getAuthenticatorAssuranceLevel: async () => ({ data: { currentLevel: "aal1" } }),
    listFactors: async () => ({ data: { totp: [] } }),
    enroll: async () => ({ data: { id: "f1", type: "totp", totp: { qr_code: "qr", secret: "SEGREDO" } }, error: null }),
    challengeAndVerify: vi.fn(async () => ({ error: null })),
    ...opcoes.mfa,
  };
  const auth = {
    getSession: async () => ({ data: { session: opcoes.sessao === false ? null : { access_token: "t" } } }),
    signInWithPassword: vi.fn(async () => ({ error: null })),
    signOut: vi.fn(async () => ({ error: null })),
    resetPasswordForEmail: vi.fn(async () => ({ error: null })),
    updateUser: vi.fn(async () => ({ error: null })),
    mfa,
    ...opcoes.auth,
  };
  const functions = { invoke: vi.fn(async (nome: string, { body }: { body: unknown }) => ({ data: opcoes.invoke?.(nome, body) ?? null, error: null })) };
  const sb = { from, rpc, auth, functions } as unknown as SupabaseClient;
  return { sb, consultas, rpcsChamadas, auth, functions, rpc };
}

const PERFIL_DOCENTE = { id: "u-doc", nome: "Docente (fictícia)", email: "docente@example.test", escolaCoordenada: null, exigeSegundoFator: false };
const PERFIL_COORD = { id: "u-coord", nome: "Coordenação (fictícia)", email: "coord@example.test", escolaCoordenada: "esc-1", exigeSegundoFator: true };

async function apiLogada(perfil: typeof PERFIL_DOCENTE | typeof PERFIL_COORD, opcoes: Parameters<typeof clienteSimulado>[0] = {}) {
  const cliente = clienteSimulado({ ...opcoes, rpcs: { fn_meu_perfil: perfil, ...opcoes.rpcs } });
  const api = criarSupabaseApi(cliente.sb);
  await api.carregarSessao();
  return { api, ...cliente };
}

const colunas = (c: Consulta) => c.ops.filter(([n]) => n === "select").map(([, cols]) => String(cols));

describe("supabaseApi · sessão e segundo fator", () => {
  it("sem sessão no Auth, ninguém está logado e as ações por perfil são negadas", async () => {
    const { sb } = clienteSimulado({ sessao: false });
    const api = criarSupabaseApi(sb);
    expect(await api.carregarSessao()).toBeNull();
    expect(api.usuarioAtual()).toBeNull();
    await expect(api.listarUsuarios()).rejects.toMatchObject({ codigo: "NAO_AUTENTICADO" });
  });

  it("senha errada → mensagem genérica (não revela se o e-mail existe)", async () => {
    const { sb } = clienteSimulado({ auth: { signInWithPassword: async () => ({ error: { message: "Invalid login credentials" } }) } });
    await expect(criarSupabaseApi(sb).entrarComSenha("x@example.test", "errada")).rejects.toMatchObject({ codigo: "NAO_AUTENTICADO", message: "E-mail ou senha incorretos." });
  });

  it("conta sem perfil no banco (não liberada) → NEGADO e a sessão local é encerrada", async () => {
    const c = clienteSimulado({ rpcs: { fn_meu_perfil: null } });
    await expect(criarSupabaseApi(c.sb).entrarComSenha("x@example.test", "senha-ficticia-123")).rejects.toMatchObject({ codigo: "NEGADO" });
    expect(c.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("coordenação entra: perfil vem do banco e exige segundo fator enquanto a sessão é aal1", async () => {
    const c = clienteSimulado({ rpcs: { fn_meu_perfil: PERFIL_COORD } });
    const r = await criarSupabaseApi(c.sb).entrarComSenha("  coord@example.test ", "senha-ficticia-123");
    expect(c.auth.signInWithPassword).toHaveBeenCalledWith({ email: "coord@example.test", password: "senha-ficticia-123" });
    expect(r).toMatchObject({ usuario: { papelInstitucional: "COORDENACAO", escolaId: "esc-1" }, exigeSegundoFator: true, temFatorCadastrado: false });
  });

  it("sessão aal2 com fator verificado dispensa o segundo fator", async () => {
    const c = clienteSimulado({
      rpcs: { fn_meu_perfil: PERFIL_COORD },
      mfa: { getAuthenticatorAssuranceLevel: async () => ({ data: { currentLevel: "aal2" } }), listFactors: async () => ({ data: { totp: [{ id: "f1", status: "verified" }] } }) },
    });
    const api = criarSupabaseApi(c.sb);
    expect(await api.entrarComSenha("coord@example.test", "senha-ficticia-123")).toMatchObject({ exigeSegundoFator: false, temFatorCadastrado: true });
    expect(await api.nivelSessao()).toEqual({ atual: "aal2", temFatorCadastrado: true });
  });

  it("cadastro do TOTP devolve QR e segredo; código é limpo antes de verificar", async () => {
    const c = clienteSimulado({});
    const api = criarSupabaseApi(c.sb);
    expect(await api.iniciarCadastroSegundoFator()).toEqual({ fatorId: "f1", qrCode: "qr", segredo: "SEGREDO" });
    await api.verificarSegundoFator("123 456", "f1");
    expect((c.auth.mfa as { challengeAndVerify: ReturnType<typeof vi.fn> }).challengeAndVerify).toHaveBeenCalledWith({ factorId: "f1", code: "123456" });
  });

  it("verificar sem fator cadastrado → CONFLITO; código errado → VALIDACAO; falha no cadastro → REDE", async () => {
    await expect(criarSupabaseApi(clienteSimulado({}).sb).verificarSegundoFator("123456")).rejects.toMatchObject({ codigo: "CONFLITO" });
    const errado = clienteSimulado({ mfa: { challengeAndVerify: async () => ({ error: { message: "invalid" } }) } });
    await expect(criarSupabaseApi(errado.sb).verificarSegundoFator("000000", "f1")).rejects.toMatchObject({ codigo: "VALIDACAO" });
    const semCadastro = clienteSimulado({ mfa: { enroll: async () => ({ data: null, error: { message: "x" } }) } });
    await expect(criarSupabaseApi(semCadastro.sb).iniciarCadastroSegundoFator()).rejects.toMatchObject({ codigo: "REDE" });
  });

  it("definir senha: aceita os termos e recarrega o perfil; senha curta tem mensagem própria", async () => {
    const c = clienteSimulado({ rpcs: { fn_meu_perfil: PERFIL_DOCENTE } });
    const api = criarSupabaseApi(c.sb);
    await api.definirSenha("senha-ficticia-123", "v1-2026-10");
    expect(c.rpcsChamadas).toContainEqual(["fn_aceitar_termos", { p_versao: "v1-2026-10" }]);
    expect(api.usuarioAtual()?.id).toBe("u-doc");
    const curta = clienteSimulado({ auth: { updateUser: async () => ({ error: { message: "Password should be at least 10 characters" } }) } });
    await expect(criarSupabaseApi(curta.sb).definirSenha("curta")).rejects.toMatchObject({ message: "A senha precisa ter pelo menos 10 caracteres." });
  });

  it("recuperar senha sempre 'funciona'; sair e sair de todos encerram com o escopo certo", async () => {
    const { api, auth } = await apiLogada(PERFIL_DOCENTE);
    await api.pedirRecuperacaoSenha("  alguem@example.test ");
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith("alguem@example.test", expect.anything());
    await api.sairDeTodos();
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "global" });
    await api.sair();
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(api.usuarioAtual()).toBeNull();
  });

  it("utilidades da demonstração não existem no modo real", async () => {
    const api = criarSupabaseApi(clienteSimulado({}).sb);
    expect(await api.listarPerfisDemo()).toEqual([]);
    await expect(api.entrar("u")).rejects.toMatchObject({ codigo: "VALIDACAO" });
    await expect(api.reiniciarDados()).rejects.toMatchObject({ codigo: "VALIDACAO" });
    await expect(api.excluirEstudante("e1", "Estudante Fictício")).rejects.toMatchObject({ codigo: "CONFLITO" });
  });
});

describe("supabaseApi · consultas (colunas explícitas e mapeamento)", () => {
  const ESTUDANTE = { id: "e1", nome: "Estudante Fictício", data_nascimento: "2017-03-01", turma: "4º A", escola_id: "esc-1", created_at: "2026-10-01T00:00:00Z" };

  it("nenhuma consulta usa select * (GRANT por coluna, D-33)", async () => {
    const { api, consultas } = await apiLogada(PERFIL_COORD, { tabelas: { estudantes: [ESTUDANTE] }, rpcs: { fn_laudo_apresentado_em: null } });
    await Promise.all([api.listarEstudantes(), api.obterEstudante("e1"), api.listarVinculos("e1"), api.listarCiclos("e1"), api.listarMateriais("e1"), api.listarVersoes("e1"), api.listarNotificacoes()]);
    const selects = consultas.flatMap(colunas);
    expect(selects.length).toBeGreaterThan(5);
    for (const s of selects) expect(s).not.toMatch(/(^|,\s*)\*/u);
  });

  it("estudante: snake→camel; docente sem acesso à data do laudo vê null (D-01)", async () => {
    const { api } = await apiLogada(PERFIL_DOCENTE, { tabelas: { estudantes: [ESTUDANTE] }, rpcErros: { fn_laudo_apresentado_em: { code: "42501", message: "negado" } } });
    expect(await api.obterEstudante("e1")).toEqual({ id: "e1", nome: "Estudante Fictício", dataNascimento: "2017-03-01", turma: "4º A", laudoApresentadoEm: null, createdAt: "2026-10-01T00:00:00Z" });
  });

  it("estudante fora do alcance (RLS não devolve linha) → NEGADO; outro erro do laudo propaga", async () => {
    const { api } = await apiLogada(PERFIL_DOCENTE);
    await expect(api.obterEstudante("e9")).rejects.toMatchObject({ codigo: "NEGADO" });
    const outro = await apiLogada(PERFIL_DOCENTE, { tabelas: { estudantes: [ESTUDANTE] }, rpcErros: { fn_laudo_apresentado_em: { code: "XX000", message: "x" } } });
    await expect(outro.api.obterEstudante("e1")).rejects.toMatchObject({ codigo: "REDE" });
  });

  it("vínculos trazem o nome da pessoa; consentimento, ciclo, versão, material, desfecho e notificação são convertidos", async () => {
    const { api } = await apiLogada(PERFIL_DOCENTE, {
      tabelas: {
        vinculos_usuario_estudante: [{ id: "v1", usuario_id: "u2", estudante_id: "e1", papel: "PROFISSIONAL_SAUDE", data_vinculo: "d", status: "ATIVO", registro_conselho: "CRP 06/0000", usuarios: { nome: "Profissional (fictícia)" } }],
        consentimentos: [{ id: "c1", estudante_id: "e1", responsavel_id: "u3", data_concessao: "d", escopos: ["geracao_material"], status: "ATIVO", data_revogacao: null }],
        ciclos_observacao: [{ id: "ci1", estudante_id: "e1", numero: 3, data_inicio: "2026-10-01", data_fim: null, status: "ABERTO" }],
        versoes_perfil: [{ id: "vp1", estudante_id: "e1", ciclo_origem_id: null, numero_ciclo: 2, parametros: {}, status_validacao: "VIGENTE", validador_id: null, data_vigencia: null, justificativa: null, created_at: "d" }],
        materiais_adaptados: [{ id: "m1", estudante_id: "e1", versao_perfil_id: "vp1", docente_id: "u-doc", titulo: "T", texto_original: "x", texto_adaptado: null, texto_revisado: null, data_geracao: "d", status_aprovacao: "APROVADO", ia_aplicada: 0, hash_texto: null }],
        desfechos: [{ id: "d1", material_id: "m1", resultado: "ALCANCADO", observacao_livre: null, data_registro: "d" }],
        notificacoes: [{ id: "n1", usuario_id: "u-doc", tipo: "VALIDACAO_PENDENTE", estudante_id: null, criada_em: "d", lida_em: null }],
      },
    });
    expect((await api.listarVinculos("e1"))[0]).toMatchObject({ papel: "PROFISSIONAL_SAUDE", registroConselho: "CRP 06/0000", nomeUsuario: "Profissional (fictícia)" });
    expect(await api.obterConsentimento("e1")).toMatchObject({ escopo: ["geracao_material"], status: "ATIVO", dataRevogacao: null });
    expect(await api.obterCicloAberto("e1")).toMatchObject({ numero: 3, dataFim: null });
    expect(await api.abrirCiclo("e1")).toMatchObject({ id: "ci1" }); // já havia ciclo aberto: não cria outro
    expect(await api.obterVersaoVigente("e1")).toMatchObject({ numeroCiclo: 2, statusValidacao: "VIGENTE" });
    expect(await api.obterMaterial("m1")).toMatchObject({ iaAplicada: false, hashTexto: "", duracaoMs: 0 });
    expect(await api.obterDesfecho("m1")).toMatchObject({ resultado: "ALCANCADO", observacaoLivre: null });
    expect((await api.listarNotificacoes())[0]).toMatchObject({ tipo: "VALIDACAO_PENDENTE", lidaEm: null });
  });

  it("sem linha → null ou NAO_ENCONTRADO, conforme o contrato", async () => {
    const { api } = await apiLogada(PERFIL_DOCENTE);
    expect(await api.obterConsentimento("e1")).toBeNull();
    expect(await api.obterVersaoVigente("e1")).toBeNull();
    expect(await api.obterDesfecho("m1")).toBeNull();
    await expect(api.obterMaterial("m9")).rejects.toMatchObject({ codigo: "NAO_ENCONTRADO" });
  });

  it("observação: evidência vazia vira null; o número do ciclo vem do embed", async () => {
    const { api, consultas } = await apiLogada(PERFIL_DOCENTE, {
      tabelas: { observacoes: [{ id: "o1", ciclo_id: "ci1", autor_id: "u-doc", papel_autor: "DOCENTE", dimensao: "FADIGA_TAREFA", valor_escala: "REDUZIDA", evidencia: null, data_registro: "d", ciclos_observacao: { numero: 3 } }] },
    });
    const o = await api.registrarObservacao("ci1", { dimensao: "FADIGA_TAREFA", valorEscala: "REDUZIDA", evidencia: "   " });
    expect(o).toMatchObject({ numeroCiclo: 3, evidencia: null });
    expect(consultas.at(-1)!.ops.find(([n]) => n === "insert")![1]).toEqual({ ciclo_id: "ci1", dimensao: "FADIGA_TAREFA", valor_escala: "REDUZIDA", evidencia: null });
    await api.listarObservacoes("e1");
    expect(consultas.at(-1)!.ops).toContainEqual(["eq", "ciclos_observacao.estudante_id", "e1"]);
  });

  it("marcar notificações: só as não lidas; com ids, filtra por eles", async () => {
    const { api, consultas } = await apiLogada(PERFIL_DOCENTE);
    await api.marcarNotificacoesLidas(["n1", "n2"]);
    const ops = consultas.at(-1)!.ops;
    expect(ops).toContainEqual(["is", "lida_em", null]);
    expect(ops).toContainEqual(["in", "id", ["n1", "n2"]]);
  });

  it("pendências: só as com estudante visível, da mais antiga para a mais nova", async () => {
    const versao = (id: string, dias: number, estudantes: unknown) => ({ id, estudante_id: "e1", numero_ciclo: 1, parametros: {}, status_validacao: "PENDENTE", created_at: atras(dias), estudantes });
    const { api } = await apiLogada(PERFIL_DOCENTE, { tabelas: { versoes_perfil: [versao("a", 1, ESTUDANTE), versao("b", 6, ESTUDANTE), versao("c", 9, null)] } });
    const p = await api.listarPendencias();
    expect(p.map((x) => [x.versao.id, x.diasEmAberto])).toEqual([["b", 6], ["a", 1]]);
  });

  it("auditoria: eventos do banco viram o vocabulário do app; evento desconhecido é omitido", async () => {
    const { api } = await apiLogada(PERFIL_COORD, {
      rpcs: { fn_listar_auditoria: [{ evento: "CONSENTIMENTO_REVOGADO", autor_nome: "Responsável", criado_em: "d", detalhes: null }, { evento: "EVENTO_INTERNO", autor_nome: "x", criado_em: "d" }] },
    });
    expect(await api.listarAuditoria("e1")).toEqual([{ id: "e1-0", entidade: "", entidadeId: "e1", evento: "REVOGACAO", autorId: null, autorNome: "Responsável", data: "d", detalhes: {} }]);
  });

  it("notas clínicas só por RPC auditada; a minha aparece com o meu id", async () => {
    const { api, consultas, rpcsChamadas } = await apiLogada(PERFIL_DOCENTE, {
      rpcs: { fn_ler_notas_clinicas: [{ id: "nc1", conteudo: "texto fictício", data_registro: "d", profissional_nome: "Outra", minha: true }], fn_registrar_nota_clinica: "nc2" },
    });
    expect((await api.listarNotasClinicas("e1"))[0]).toMatchObject({ profissionalId: "u-doc", conteudo: "texto fictício" });
    expect(await api.registrarNotaClinica("e1", "  nova nota  ")).toMatchObject({ id: "nc2", conteudo: "nova nota" });
    expect(consultas.some((c) => c.tabela === "notas_clinicas")).toBe(false);
    expect(rpcsChamadas.map(([n]) => n)).toContain("fn_ler_notas_clinicas");
  });

  it("exportar dados: reúne tudo, só materiais aprovados com seus desfechos e nunca notas clínicas", async () => {
    const material = (id: string, status: string) => ({ id, estudante_id: "e1", versao_perfil_id: "v", docente_id: "u", titulo: "T", texto_original: "x", data_geracao: "d", status_aprovacao: status });
    const { api, rpcsChamadas } = await apiLogada(PERFIL_COORD, {
      tabelas: {
        estudantes: [ESTUDANTE],
        materiais_adaptados: [material("m1", "APROVADO"), material("m2", "RASCUNHO")],
        desfechos: (c) => (c.ops.some(([n, , v]) => n === "eq" && v === "m1") ? [{ id: "d1", material_id: "m1", resultado: "PARCIAL", data_registro: "d" }] : []),
      },
      rpcs: { fn_laudo_apresentado_em: "2026-01-10", fn_listar_auditoria: [] },
    });
    const dados = await api.exportarDados("e1");
    expect(dados.estudante.laudoApresentadoEm).toBe("2026-01-10");
    expect(dados.materiaisAprovados.map((m) => m.id)).toEqual(["m1"]);
    expect(dados.desfechos.map((d) => d.materialId)).toEqual(["m1"]);
    expect(Object.keys(dados)).not.toContain("notasClinicas");
    expect(rpcsChamadas.map(([n]) => n)).not.toContain("fn_ler_notas_clinicas");
  });
});

describe("supabaseApi · escritas e guardas de papel", () => {
  it("docente não lista usuários, não cadastra, não convida nem abre o painel (sem chamar o banco)", async () => {
    const { api, rpcsChamadas, functions } = await apiLogada(PERFIL_DOCENTE);
    const antes = rpcsChamadas.length;
    await expect(api.listarUsuarios()).rejects.toMatchObject({ codigo: "NEGADO" });
    await expect(api.cadastrarEstudante({ nome: "X", dataNascimento: "2017-01-01" })).rejects.toMatchObject({ codigo: "NEGADO" });
    await expect(api.convidar({ email: "a@example.test", papel: "DOCENTE" })).rejects.toMatchObject({ codigo: "NEGADO" });
    await expect(api.resumoEscola()).rejects.toMatchObject({ codigo: "NEGADO" });
    expect(rpcsChamadas.length).toBe(antes);
    expect(functions.invoke).not.toHaveBeenCalled();
  });

  it("coordenação: lista usuários sem ela mesma, cadastra pela RPC e convida pela Edge Function com a escola do perfil", async () => {
    const { api, rpcsChamadas, functions } = await apiLogada(PERFIL_COORD, {
      tabelas: { usuarios: [{ id: "u-coord", nome: "Eu" }, { id: "u2", nome: "Outra pessoa" }], estudantes: [{ id: "e2", nome: "Novo", data_nascimento: "2017-01-01", created_at: "d" }] },
      rpcs: { fn_cadastrar_estudante: "e2", fn_laudo_apresentado_em: null },
      invoke: () => ({ emailEnviado: true, avisos: [] }),
    });
    expect((await api.listarUsuarios()).map((u) => u.id)).toEqual(["u2"]);
    await api.cadastrarEstudante({ nome: "Novo", dataNascimento: "2017-01-01", laudoApresentadoEm: "" });
    expect(rpcsChamadas).toContainEqual(["fn_cadastrar_estudante", { p_escola: "esc-1", p_nome: "Novo", p_data_nascimento: "2017-01-01", p_turma: null, p_laudo_apresentado_em: null }]);
    expect(await api.convidar({ email: "nova@example.test", papel: "DOCENTE", registroConselho: "  " })).toEqual({ emailEnviado: true, avisos: [] });
    expect(functions.invoke).toHaveBeenCalledWith("convidar", { body: expect.objectContaining({ escolaId: "esc-1", registroConselho: null, conferidoPresencialmente: false, estudanteId: null }) });
  });

  it("vínculos e consentimento: argumentos das RPCs e releitura do registro", async () => {
    const { api, rpcsChamadas } = await apiLogada(PERFIL_COORD, {
      tabelas: { vinculos_usuario_estudante: [{ id: "v9", status: "PENDENTE_RESPONSAVEL" }], consentimentos: [{ id: "c9", status: "REVOGADO", escopos: null }] },
      rpcs: { fn_propor_vinculo: "v9", fn_conceder_consentimento: "c9", fn_revogar_consentimento: "c9" },
    });
    expect(await api.vincular({ estudanteId: "e1", usuarioId: "u2", papel: "PROFISSIONAL_SAUDE", registroConselho: " CRP 1 " })).toMatchObject({ id: "v9" });
    expect(rpcsChamadas).toContainEqual(["fn_propor_vinculo", { p_estudante: "e1", p_usuario: "u2", p_papel: "PROFISSIONAL_SAUDE", p_registro_conselho: "CRP 1", p_conferido_presencialmente: false }]);
    await api.confirmarVinculo("v9", false);
    await api.desativarVinculo("v9");
    expect(rpcsChamadas.map(([n]) => n)).toEqual(expect.arrayContaining(["fn_confirmar_vinculo", "fn_encerrar_vinculo"]));
    expect(await api.concederConsentimento("e1", ["geracao_material"])).toMatchObject({ id: "c9", escopo: [] });
    expect(rpcsChamadas.find(([n]) => n === "fn_conceder_consentimento")![1]).toMatchObject({ p_escopos: ["geracao_material"], p_versao_termo: "v1-2026-10" });
    expect(await api.revogarConsentimento("e1")).toMatchObject({ status: "REVOGADO" });
  });

  it("ciclo: abre quando não há aberto; prévia do fechamento usa o motor sem gravar", async () => {
    const vigente = { maxLinhasPorBloco: 4, nivelVocabulario: "BASICO", interesseAncora: null, formatoEnunciado: "ETAPA_UNICA", contrasteMinimo: 7, blocosPorMaterial: 8 };
    const { api, consultas } = await apiLogada(PERFIL_DOCENTE, {
      tabelas: { ciclos_observacao: (c) => (c.ops.some(([n]) => n === "insert") ? [{ id: "novo", estudante_id: "e1", numero: 1, data_inicio: "d", status: "ABERTO" }] : []) },
      rpcs: { fn_dados_fechamento: { estudanteId: "e1", numeroCiclo: 2, vigente: { parametros: vigente }, validacaoClinica: false, historico: [{ numeroCiclo: 2, dimensao: "FADIGA_TAREFA", valorEscala: "AMPLIADA", evidencia: null }] } },
    });
    expect(await api.abrirCiclo("e1")).toMatchObject({ id: "novo" });
    expect(consultas.at(-1)!.ops.find(([n]) => n === "insert")![1]).toEqual({ estudante_id: "e1" });
    const previa = await api.preverFechamento("ci1");
    expect(previa).toMatchObject({ modoPedagogico: true, versao: { id: "previa", statusValidacao: "VIGENTE" } });
    expect(previa.diff.find((d) => d.campo === "blocosPorMaterial")).toMatchObject({ mudou: true });
  });

  it("fechar ciclo, validar versão, gerar e decidir material, registrar desfecho", async () => {
    const versao = { id: "v2", estudante_id: "e1", numero_ciclo: 2, parametros: {}, status_validacao: "PENDENTE", created_at: "d" };
    const material = { id: "m1", estudante_id: "e1", versao_perfil_id: "v2", docente_id: "u-doc", titulo: "T", texto_original: "x", data_geracao: "d", status_aprovacao: "APROVADO" };
    const { api, rpcsChamadas } = await apiLogada(PERFIL_DOCENTE, {
      tabelas: { versoes_perfil: [versao], materiais_adaptados: [material], desfechos: [{ id: "d1", material_id: "m1", resultado: "ALCANCADO", data_registro: "d" }] },
      rpcs: { fn_validar_versao: "v2" },
      invoke: (nome) => (nome === "fechar-ciclo" ? { versaoId: "v2", diff: [], modoPedagogico: false } : { materialId: "m1", duracaoMs: 42, emCache: false, origem: "REGRAS", avisos: [] }),
    });
    expect(await api.fecharCiclo("ci1")).toMatchObject({ versao: { id: "v2" }, modoPedagogico: false });
    await api.validarVersao("v2", "AJUSTE", "  ajustar  ");
    expect(rpcsChamadas).toContainEqual(["fn_validar_versao", { p_versao: "v2", p_decisao: "REVISAO", p_justificativa: "ajustar" }]);
    expect(await api.gerarMaterial("e1", "T", "texto")).toMatchObject({ id: "m1", duracaoMs: 42 });
    await api.aprovarMaterial("m1", "  revisado  ");
    await api.descartarMaterial("m1");
    expect(rpcsChamadas.filter(([n]) => n === "fn_decidir_material").map(([, a]) => a)).toEqual([
      { p_material: "m1", p_decisao: "APROVAR", p_texto_revisado: "revisado" },
      { p_material: "m1", p_decisao: "DESCARTAR" },
    ]);
    expect(await api.registrarDesfecho("m1", "ALCANCADO", " ")).toMatchObject({ id: "d1" });
  });

  it("meu papel: o banco responde; sem papel, a coordenação da escola do estudante é reconhecida", async () => {
    const docente = await apiLogada(PERFIL_DOCENTE, { rpcs: { fn_meu_papel: "DOCENTE" } });
    expect(await docente.api.meuPapel("e1")).toBe("DOCENTE");
    const coord = await apiLogada(PERFIL_COORD, { tabelas: { estudantes: (c) => (c.ops.some(([, , v]) => v === "e1") ? [{ escola_id: "esc-1" }] : [{ escola_id: "outra" }]) } });
    expect(await coord.api.meuPapel("e1")).toBe("COORDENACAO");
    expect(await coord.api.meuPapel("e2")).toBeNull();
    const semEscola = await apiLogada(PERFIL_DOCENTE);
    expect(await semEscola.api.meuPapel("e1")).toBeNull();
  });
});

describe("supabaseApi · painel da escola (só contagens)", () => {
  it("conta consentimento, profissional, validação atrasada (≥ 5 dias) e ciclo parado (> 15 dias sem observação)", async () => {
    const { api, consultas } = await apiLogada(PERFIL_COORD, {
      tabelas: {
        estudantes: [
          { id: "a", nome: "A (fictício)", created_at: atras(30) },
          { id: "b", nome: "B (fictício)", created_at: atras(30) },
          { id: "c", nome: "C (fictício)", created_at: atras(2) },
        ],
        consentimentos: [{ estudante_id: "a", status: "ATIVO" }, { estudante_id: "b", status: "ATIVO" }, { estudante_id: "c", status: "REVOGADO" }],
        vinculos_usuario_estudante: [{ estudante_id: "a", papel: "PROFISSIONAL_SAUDE", status: "ATIVO" }],
        versoes_perfil: [{ estudante_id: "a", status_validacao: "PENDENTE", created_at: atras(6) }, { estudante_id: "b", status_validacao: "PENDENTE", created_at: atras(1) }],
        ciclos_observacao: [{ id: "x", estudante_id: "b", status: "ABERTO", data_inicio: atras(20), observacoes: [] }],
      },
    });
    const r = await api.resumoEscola();
    expect(r).toMatchObject({ totalEstudantes: 3, comConsentimento: 2, semConsentimento: 1, semProfissional: 1, validacoesAtrasadas: 1, ciclosParados: 1 });
    expect(r.pendencias.map((p) => [p.estudanteId, p.motivo])).toEqual([
      ["a", "VALIDACAO_ATRASADA"],
      ["b", "SEM_PROFISSIONAL"],
      ["b", "CICLO_PARADO"],
      ["c", "SEM_CONSENTIMENTO"],
    ]);
    expect(consultas.find((c) => c.tabela === "estudantes")!.ops).toContainEqual(["eq", "escola_id", "esc-1"]);
  });
});
