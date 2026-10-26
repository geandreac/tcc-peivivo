/** Consentimento do responsável (RN01/RN08). */
import type { PeiVivoApi } from "../api";
import { ErroApi } from "../erros";
import type { Consentimento } from "../tipos";
import { uuid, TODOS, type ContextoMock } from "./contexto";

export function consentimento(ctx: ContextoMock) {
  return {
    // ---- consentimento
    obterConsentimento: (estudanteId) =>
      ctx.chamada(() => {
        if (!ctx.meuPapel(estudanteId)) throw new ErroApi("NEGADO", "Você não está vinculado a este estudante.");
        return ctx.estado.consentimentos.filter((c) => c.estudanteId === estudanteId).sort((a, b) => b.dataConcessao.localeCompare(a.dataConcessao))[0] ?? null;
      }),
    concederConsentimento: (estudanteId, escopo) =>
      ctx.chamada(() => {
        ctx.exigirPapel(estudanteId, "RESPONSAVEL");
        if (ctx.temConsentimento(estudanteId)) throw new ErroApi("CONFLITO", "Já existe um consentimento ativo.");
        if (escopo.length === 0) throw new ErroApi("VALIDACAO", "Escolha ao menos um escopo.");
        const c: Consentimento = {
          id: uuid(),
          estudanteId,
          responsavelId: ctx.eu().id,
          dataConcessao: ctx.agora(),
          escopo: [...escopo],
          status: "ATIVO",
          dataRevogacao: null,
        };
        ctx.estado.consentimentos.push(c);
        ctx.registrarAuditoria("consentimentos", c.id, "CONCESSAO", { escopo: escopo.length });
        ctx.notificar(estudanteId, "CONSENTIMENTO_CONCEDIDO", TODOS);
        ctx.salvar();
        return c;
      }),
    revogarConsentimento: (estudanteId) =>
      ctx.chamada(() => {
        ctx.exigirPapel(estudanteId, "RESPONSAVEL");
        const c = ctx.estado.consentimentos.find((x) => x.estudanteId === estudanteId && x.status === "ATIVO");
        if (!c) throw new ErroApi("CONFLITO", "Não há consentimento ativo para revogar.");
        c.status = "REVOGADO";
        c.dataRevogacao = ctx.agora();
        ctx.registrarAuditoria("consentimentos", c.id, "REVOGACAO");
        ctx.notificar(estudanteId, "CONSENTIMENTO_REVOGADO", TODOS); // F10: sem motivo
        ctx.salvar();
        return c;
      }),
  } satisfies Partial<PeiVivoApi>;
}
