/** Materiais adaptados e desfechos (RN04). */
import type { PeiVivoApi } from "../api";
import { ErroApi } from "../erros";
import { exec, paginado, type Linha } from "./infra";
import { COL_MATERIAL, COL_DESFECHO, paraMaterial, paraDesfecho } from "./mapeadores";
import type { RespostaGerarMaterial } from "@pei-vivo/contratos";
import type { Contexto } from "./contexto";

export function materiais(c: Contexto) {
  const { sb } = c;
  return {
    // ---- materiais
    listarMateriais: async (estudanteId, pagina) =>
      (
        await paginado<Linha>(
          (de, ate) =>
            sb
              .from("materiais_adaptados")
              .select(COL_MATERIAL)
              .eq("estudante_id", estudanteId)
              .order("data_geracao", { ascending: false })
              .order("id")
              .range(de, ate),
          pagina,
        )
      ).map((r) => paraMaterial(r)),
    obterMaterial: async (id) => {
      const r = await exec<Linha | null>(sb.from("materiais_adaptados").select(COL_MATERIAL).eq("id", id).maybeSingle());
      if (!r) throw new ErroApi("NAO_ENCONTRADO", "Material não encontrado.");
      return paraMaterial(r);
    },
    gerarMaterial: async (estudanteId, titulo, texto) => {
      const r = await c.funcao<RespostaGerarMaterial>("gerar-material", { estudanteId, titulo, texto });
      const m = await c.api.obterMaterial(r.materialId);
      return { ...m, duracaoMs: r.duracaoMs };
    },
    aprovarMaterial: async (id, textoRevisado) => {
      await exec(sb.rpc("fn_decidir_material", { p_material: id, p_decisao: "APROVAR", p_texto_revisado: textoRevisado?.trim() || null }));
      return c.api.obterMaterial(id);
    },
    descartarMaterial: async (id) => {
      await exec(sb.rpc("fn_decidir_material", { p_material: id, p_decisao: "DESCARTAR" }));
      return c.api.obterMaterial(id);
    },
    obterDesfecho: async (materialId) => {
      const r = await exec<Linha | null>(sb.from("desfechos").select(COL_DESFECHO).eq("material_id", materialId).maybeSingle());
      return r ? paraDesfecho(r) : null;
    },
    registrarDesfecho: async (materialId, resultado, observacaoLivre) => {
      await exec(sb.from("desfechos").insert({ material_id: materialId, resultado, observacao_livre: observacaoLivre?.trim() || null }));
      const r = await c.api.obterDesfecho(materialId);
      if (!r) throw new ErroApi("NAO_ENCONTRADO", "Desfecho não encontrado.");
      return r;
    },
  } satisfies Partial<PeiVivoApi>;
}
