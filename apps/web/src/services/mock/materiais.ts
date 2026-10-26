/** Materiais adaptados (RN04) e desfechos. */
import type { PeiVivoApi } from "../api";
import { ErroApi } from "../erros";
import type { Desfecho, Material } from "../tipos";
import { LIMITE_OBSERVACAO_DESFECHO } from "@pei-vivo/contratos";
import { adaptar } from "@pei-vivo/motor-adaptacao";
import { uuid, hash, type ContextoMock } from "./contexto";

export function materiais(ctx: ContextoMock) {
  return {
    // ---- materiais
    listarMateriais: (estudanteId, pagina) =>
      ctx.chamada(() => {
        const p = ctx.exigirLeitura(estudanteId);
        const lista = ctx.estado.materiais
          .filter((m) => m.estudanteId === estudanteId && (m.statusAprovacao === "APROVADO" || (p === "DOCENTE" && m.docenteId === ctx.eu().id))) // D-34: rascunho só do autor
          .sort((a, b) => b.dataGeracao.localeCompare(a.dataGeracao));
        return ctx.paginar(lista, pagina);
      }),
    obterMaterial: (id) =>
      ctx.chamada(() => {
        const m = ctx.estado.materiais.find((x) => x.id === id);
        if (!m) throw new ErroApi("NAO_ENCONTRADO", "Material não encontrado.");
        const p = ctx.exigirLeitura(m.estudanteId);
        if (m.statusAprovacao !== "APROVADO" && !(p === "DOCENTE" && m.docenteId === ctx.eu().id))
          throw new ErroApi("NAO_ENCONTRADO", "Material não encontrado."); // D-34: 0 linhas
        return m;
      }),
    gerarMaterial: (estudanteId, titulo, texto) =>
      ctx.chamada(() => {
        ctx.exigirPapel(estudanteId, "DOCENTE");
        ctx.exigirConsentimento(estudanteId);
        const t = texto.trim();
        if (t.length < 1 || t.length > 20_000) throw new ErroApi("VALIDACAO", "O texto precisa ter entre 1 e 20.000 caracteres.");
        const vigente = ctx.versaoVigente(estudanteId);
        if (!vigente) throw new ErroApi("CONFLITO", "Este estudante ainda não tem um perfil vigente. Feche um ciclo de observação primeiro.");
        const h = hash(t);
        const emCache = ctx.estado.materiais.find(
          (m) => m.estudanteId === estudanteId && m.hashTexto === h && m.versaoPerfilId === vigente.id && m.statusAprovacao !== "DESCARTADO",
        );
        if (emCache) return emCache; // P3.5: texto idêntico + mesma versão → não regera
        const inicio = performance.now();
        const adaptado = adaptar(t, vigente.parametros);
        const m: Material = {
          id: uuid(),
          estudanteId,
          versaoPerfilId: vigente.id,
          docenteId: ctx.eu().id,
          titulo: titulo.trim() || "Material sem título",
          textoOriginal: t,
          textoAdaptado: adaptado,
          textoRevisado: null,
          dataGeracao: ctx.agora(),
          statusAprovacao: "RASCUNHO",
          iaAplicada: false, // camada de IA desligada no protótipo (RN06 / modo demo)
          duracaoMs: Math.round(performance.now() - inicio) + ctx.latencia,
          hashTexto: h,
        };
        ctx.estado.materiais.push(m);
        ctx.salvar();
        return m;
      }),
    aprovarMaterial: (id, textoRevisado) =>
      ctx.chamada(() => {
        const m = ctx.estado.materiais.find((x) => x.id === id);
        if (!m) throw new ErroApi("NAO_ENCONTRADO", "Material não encontrado.");
        ctx.exigirPapel(m.estudanteId, "DOCENTE");
        ctx.exigirAutor(m);
        ctx.exigirConsentimento(m.estudanteId);
        if (m.statusAprovacao !== "RASCUNHO") throw new ErroApi("CONFLITO", "Só rascunhos podem ser aprovados.");
        m.statusAprovacao = "APROVADO";
        m.textoRevisado = textoRevisado?.trim() || null;
        ctx.registrarAuditoria("materiais_adaptados", m.id, "APROVACAO_MATERIAL");
        ctx.salvar();
        return m;
      }),
    descartarMaterial: (id) =>
      ctx.chamada(() => {
        const m = ctx.estado.materiais.find((x) => x.id === id);
        if (!m) throw new ErroApi("NAO_ENCONTRADO", "Material não encontrado.");
        ctx.exigirPapel(m.estudanteId, "DOCENTE");
        ctx.exigirAutor(m);
        if (m.statusAprovacao !== "RASCUNHO") throw new ErroApi("CONFLITO", "Só rascunhos podem ser descartados.");
        m.statusAprovacao = "DESCARTADO";
        ctx.registrarAuditoria("materiais_adaptados", m.id, "DESCARTE_MATERIAL");
        ctx.salvar();
        return m;
      }),
    obterDesfecho: (materialId) =>
      ctx.chamada(() => {
        const m = ctx.estado.materiais.find((x) => x.id === materialId);
        if (!m) throw new ErroApi("NAO_ENCONTRADO", "Material não encontrado.");
        const p = ctx.exigirLeitura(m.estudanteId);
        if (p !== "DOCENTE" && m.statusAprovacao !== "APROVADO") return null;
        return ctx.estado.desfechos.find((d) => d.materialId === materialId) ?? null;
      }),
    registrarDesfecho: (materialId, resultado, observacaoLivre) =>
      ctx.chamada(() => {
        const m = ctx.estado.materiais.find((x) => x.id === materialId);
        if (!m) throw new ErroApi("NAO_ENCONTRADO", "Material não encontrado.");
        ctx.exigirPapel(m.estudanteId, "DOCENTE");
        ctx.exigirAutor(m); // S-23
        ctx.exigirConsentimento(m.estudanteId);
        if (m.statusAprovacao !== "APROVADO") throw new ErroApi("CONFLITO", "Só materiais aprovados recebem desfecho.");
        if (ctx.estado.desfechos.some((d) => d.materialId === materialId)) throw new ErroApi("CONFLITO", "Este material já tem desfecho registrado.");
        ctx.exigirTamanho(observacaoLivre, LIMITE_OBSERVACAO_DESFECHO, "A observação");
        const d: Desfecho = { id: uuid(), materialId, resultado, observacaoLivre: observacaoLivre?.trim() || null, dataRegistro: ctx.agora() };
        ctx.estado.desfechos.push(d);
        ctx.salvar();
        return d;
      }),
  } satisfies Partial<PeiVivoApi>;
}
