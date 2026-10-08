// Edge Function gerar-material (F8, RF08–RF10, D-37) — segue o Diagrama de
// Sequência: valida → prepara (JWT do docente) → regras → IA opcional →
// grava rascunho (service role) → responde. Aprovar é outro passo (RN04).
// IA desligada por padrão (D-39): ligar com IA_HABILITADA=true + provedor real.
import { gerarMaterial, iaDesligada, type MaterialParaRegistrar, type Preparo } from "../_shared/gerado/funcoes/index.ts";
import { rpc, servir } from "../_shared/http.ts";

servir("gerar-material", (corpo, { usuario, servico }) =>
  gerarMaterial(corpo, {
    preparar: (estudanteId) => rpc<Preparo>(usuario, "fn_preparar_geracao", { p_estudante: estudanteId }),
    registrar: (m: MaterialParaRegistrar) =>
      rpc<{ materialId: string; emCache: boolean }>(servico, "fn_registrar_material", {
        p_docente: m.docenteId,
        p_estudante: m.estudanteId,
        p_versao: m.versaoId,
        p_titulo: m.titulo,
        p_texto_original: m.textoOriginal,
        p_texto_adaptado: m.textoAdaptado,
        p_hash: m.hash,
        p_ia_aplicada: m.iaAplicada,
      }),
    ia: iaDesligada,
    iaHabilitada: Deno.env.get("IA_HABILITADA") === "true",
  }),
);
