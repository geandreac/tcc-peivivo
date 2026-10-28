/** Nota clínica (RN02), auditoria, exportação/exclusão LGPD e utilidades da demonstração. */
import type { PeiVivoApi } from "../api";
import { ErroApi } from "../erros";
import type { EventoAuditoria, ExportacaoEstudante, NotaClinica } from "../tipos";
import { LIMITE_NOTA_CLINICA } from "@pei-vivo/contratos";
import { uuid, estadoInicial, type ContextoMock } from "./contexto";

export function privacidade(ctx: ContextoMock) {
  return {
    // ---- nota clínica (RN02 ⭐)
    listarNotasClinicas: (estudanteId) =>
      ctx.chamada(() => {
        const p = ctx.meuPapel(estudanteId);
        if (p !== "PROFISSIONAL_SAUDE") {
          throw new ErroApi("NEGADO", "Nota clínica reservada: acesso exclusivo do profissional de saúde vinculado.");
        }
        ctx.exigirFerramenta("NOTAS_CLINICAS", "VER", "A leitura de notas clínicas não está liberada para este acesso.");
        ctx.registrarAuditoria("notas_clinicas", estudanteId, "LEITURA_NOTA_CLINICA"); // D-30: toda leitura vira evento
        ctx.salvar();
        return ctx.estado.notas.filter((n) => n.estudanteId === estudanteId).sort((a, b) => b.dataRegistro.localeCompare(a.dataRegistro));
      }),
    registrarNotaClinica: (estudanteId, conteudo) =>
      ctx.chamada(() => {
        ctx.exigirPapel(estudanteId, "PROFISSIONAL_SAUDE");
        ctx.exigirFerramenta("NOTAS_CLINICAS", "EDITAR", "O registro de notas clínicas não está liberado para este acesso.");
        if (!conteudo.trim()) throw new ErroApi("VALIDACAO", "Escreva o conteúdo da nota.");
        ctx.exigirTamanho(conteudo, LIMITE_NOTA_CLINICA, "A nota");
        const n: NotaClinica = { id: uuid(), estudanteId, profissionalId: ctx.eu().id, conteudo: conteudo.trim(), dataRegistro: ctx.agora() };
        ctx.estado.notas.push(n);
        ctx.registrarAuditoria("notas_clinicas", estudanteId, "NOTA_CLINICA_REGISTRADA");
        ctx.salvar();
        return n;
      }),

    // ---- auditoria e LGPD
    listarAuditoria: (estudanteId, pagina) =>
      ctx.chamada(() => {
        ctx.exigirPapel(estudanteId, "RESPONSAVEL", "COORDENACAO");
        const idsFilhos = new Set<string>([
          estudanteId,
          ...ctx.estado.consentimentos.filter((c) => c.estudanteId === estudanteId).map((c) => c.id),
          ...ctx.estado.versoes.filter((v) => v.estudanteId === estudanteId).map((v) => v.id),
          ...ctx.estado.materiais.filter((m) => m.estudanteId === estudanteId).map((m) => m.id),
          ...ctx.estado.vinculos.filter((v) => v.estudanteId === estudanteId).map((v) => v.id),
          ...ctx.estado.ciclos.filter((c) => c.estudanteId === estudanteId).map((c) => c.id),
        ]);
        const papel = ctx.meuPapel(estudanteId);
        const CLINICOS: EventoAuditoria[] = ["LEITURA_NOTA_CLINICA", "NOTA_CLINICA_REGISTRADA"];
        const lista = ctx.estado.auditoria
          .filter((a) => idsFilhos.has(a.entidadeId) && (papel === "RESPONSAVEL" || !CLINICOS.includes(a.evento)))
          .map((a) => ({ ...a, autorNome: ctx.estado.usuarios.find((x) => x.id === a.autorId)?.nome ?? "Sistema" }))
          .sort((a, b) => b.data.localeCompare(a.data));
        return ctx.paginar(lista, pagina);
      }),
    exportarDados: (estudanteId) =>
      ctx.chamada(() => {
        ctx.exigirPapel(estudanteId, "RESPONSAVEL", "COORDENACAO");
        const e = ctx.estudante(estudanteId);
        const ciclos = ctx.estado.ciclos.filter((c) => c.estudanteId === estudanteId);
        const idsCiclos = new Set(ciclos.map((c) => c.id));
        const materiais = ctx.estado.materiais.filter((m) => m.estudanteId === estudanteId && m.statusAprovacao === "APROVADO");
        const idsMat = new Set(materiais.map((m) => m.id));
        ctx.registrarAuditoria("estudantes", estudanteId, "EXPORTACAO");
        ctx.salvar();
        const exportacao: ExportacaoEstudante = {
          geradoEm: ctx.agora(),
          estudante: e,
          vinculos: ctx.estado.vinculos.filter((v) => v.estudanteId === estudanteId),
          consentimentos: ctx.estado.consentimentos.filter((c) => c.estudanteId === estudanteId),
          ciclos,
          observacoes: ctx.estado.observacoes.filter((o) => idsCiclos.has(o.cicloId)),
          versoesPerfil: ctx.estado.versoes.filter((v) => v.estudanteId === estudanteId),
          materiaisAprovados: materiais,
          desfechos: ctx.estado.desfechos.filter((d) => idsMat.has(d.materialId)),
          auditoria: ctx.estado.auditoria.filter((a) => a.entidadeId === estudanteId),
          // sem notas_clinicas — D-05
        };
        return exportacao;
      }),
    excluirEstudante: (estudanteId, confirmacaoNome) =>
      ctx.chamada(() => {
        ctx.exigirPapel(estudanteId, "RESPONSAVEL");
        const e = ctx.estudante(estudanteId);
        if (confirmacaoNome.trim() !== e.nome) throw new ErroApi("VALIDACAO", "Digite o nome do estudante exatamente como aparece para confirmar.");
        const idsCiclos = new Set(ctx.estado.ciclos.filter((c) => c.estudanteId === estudanteId).map((c) => c.id));
        const idsMat = new Set(ctx.estado.materiais.filter((m) => m.estudanteId === estudanteId).map((m) => m.id));
        ctx.estado.estudantes = ctx.estado.estudantes.filter((x) => x.id !== estudanteId);
        ctx.estado.vinculos = ctx.estado.vinculos.filter((x) => x.estudanteId !== estudanteId);
        ctx.estado.consentimentos = ctx.estado.consentimentos.filter((x) => x.estudanteId !== estudanteId);
        ctx.estado.ciclos = ctx.estado.ciclos.filter((x) => x.estudanteId !== estudanteId);
        ctx.estado.observacoes = ctx.estado.observacoes.filter((x) => !idsCiclos.has(x.cicloId));
        ctx.estado.versoes = ctx.estado.versoes.filter((x) => x.estudanteId !== estudanteId);
        ctx.estado.materiais = ctx.estado.materiais.filter((x) => x.estudanteId !== estudanteId);
        ctx.estado.desfechos = ctx.estado.desfechos.filter((x) => !idsMat.has(x.materialId));
        ctx.estado.notas = ctx.estado.notas.filter((x) => x.estudanteId !== estudanteId); // D-05: inclui notas clínicas
        ctx.estado.auditoria.push({
          id: uuid(),
          entidade: "estudantes",
          entidadeId: estudanteId,
          evento: "EXCLUSAO",
          autorId: ctx.sessaoId,
          data: ctx.agora(),
          detalhes: {},
        });
        ctx.salvar();
      }),

    // ---- demo
    reiniciarDados: () =>
      ctx.chamada(() => {
        ctx.estado = estadoInicial();
        ctx.salvar();
      }),
    simularFalha: (ativa) => {
      ctx.falhaAtiva = ativa;
    },
  } satisfies Partial<PeiVivoApi>;
}
