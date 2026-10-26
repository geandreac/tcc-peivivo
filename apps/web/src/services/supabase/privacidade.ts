/** Nota clínica (RN02, RPC auditada), auditoria, exportação LGPD e utilidades que só existem na demonstração. */
import type { PeiVivoApi } from "../api";
import { ErroApi } from "../erros";
import { exec, paginado, type Linha } from "./infra";
import { COL_CONSENT, paraConsentimento, EVENTO_DO_BANCO } from "./mapeadores";
import type { Auditoria, Desfecho, NotaClinica } from "../tipos";
import type { Contexto } from "./contexto";

export function privacidade(c: Contexto) {
  const { sb } = c;
  return {
    // ---- nota clínica (RN02: só por RPC auditada)
    listarNotasClinicas: async (estudanteId) => {
      // a RPC devolve uma tabela: o PostgREST também corta em max_rows, então vem em lotes
      const linhas = await paginado<Linha>((de, ate) => sb.rpc("fn_ler_notas_clinicas", { p_estudante: estudanteId }).range(de, ate));
      return linhas.map(
        (r): NotaClinica => ({ id: String(r.id), estudanteId, profissionalId: r.minha ? c.eu().id : String(r.profissional_nome), conteudo: String(r.conteudo), dataRegistro: String(r.data_registro) }),
      );
    },
    registrarNotaClinica: async (estudanteId, conteudo) => {
      const id = await exec<string>(sb.rpc("fn_registrar_nota_clinica", { p_estudante: estudanteId, p_conteudo: conteudo }));
      return { id, estudanteId, profissionalId: c.eu().id, conteudo: conteudo.trim(), dataRegistro: new Date().toISOString() };
    },

    // ---- auditoria e LGPD
    listarAuditoria: async (estudanteId, pagina) => {
      const linhas = await paginado<Linha>((de, ate) => sb.rpc("fn_listar_auditoria", { p_estudante: estudanteId, p_limite: ate - de + 1, p_deslocamento: de }), pagina);
      return linhas
        .filter((r) => EVENTO_DO_BANCO[String(r.evento)])
        .map(
          (r, i): Auditoria => ({
            id: `${estudanteId}-${(pagina?.deslocamento ?? 0) + i}`,
            entidade: "",
            entidadeId: estudanteId,
            evento: EVENTO_DO_BANCO[String(r.evento)]!,
            autorId: null,
            autorNome: String(r.autor_nome),
            data: String(r.criado_em),
            detalhes: (r.detalhes as Record<string, unknown>) ?? {},
          }),
        );
    },
    exportarDados: async (estudanteId) => {
      const [estudante, vinculos, consentimentos, ciclos, observacoes, versoesPerfil, materiais, auditoria] = await Promise.all([
        c.api.obterEstudante(estudanteId),
        c.api.listarVinculos(estudanteId),
        paginado<Linha>((de, ate) => sb.from("consentimentos").select(COL_CONSENT).eq("estudante_id", estudanteId).order("data_concessao").order("id").range(de, ate)),
        c.api.listarCiclos(estudanteId),
        c.api.listarObservacoes(estudanteId),
        c.api.listarVersoes(estudanteId),
        c.api.listarMateriais(estudanteId),
        c.api.listarAuditoria(estudanteId),
      ]);
      const aprovados = materiais.filter((m) => m.statusAprovacao === "APROVADO");
      const desfechos = (await Promise.all(aprovados.map((m) => c.api.obterDesfecho(m.id)))).filter((d): d is Desfecho => d !== null);
      // sem notas_clinicas — D-05 (e o banco nem as entrega a quem exporta)
      return {
        geradoEm: new Date().toISOString(),
        estudante,
        vinculos,
        consentimentos: consentimentos.map(paraConsentimento),
        ciclos,
        observacoes,
        versoesPerfil,
        materiaisAprovados: aprovados,
        desfechos,
        auditoria,
      };
    },
    excluirEstudante: async () => {
      // F11: a exclusão definitiva exige uma Edge Function com service role (fora da trilha mínima).
      throw new ErroApi("CONFLITO", "A exclusão definitiva ainda não está disponível no sistema real. Peça à coordenação; o pedido fica registrado.");
    },

    // ---- utilidades da demonstração (não existem no sistema real)
    reiniciarDados: async () => {
      throw new ErroApi("VALIDACAO", "Restaurar dados só existe na demonstração.");
    },
    simularFalha: () => undefined,
  } satisfies Partial<PeiVivoApi>;
}
