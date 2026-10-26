/** Consentimento do responsável (RN01/RN08), só por RPC. */
import { VERSAO_TERMO, type PeiVivoApi } from "../api";
import { exec, type Linha } from "./infra";
import { COL_CONSENT, paraConsentimento } from "./mapeadores";
import type { Contexto } from "./contexto";

export function consentimento(c: Contexto) {
  const { sb } = c;
  return {
    // ---- consentimento
    obterConsentimento: async (estudanteId) => {
      const r = await exec<Linha | null>(
        sb.from("consentimentos").select(COL_CONSENT).eq("estudante_id", estudanteId).order("data_concessao", { ascending: false }).limit(1).maybeSingle(),
      );
      return r ? paraConsentimento(r) : null;
    },
    concederConsentimento: async (estudanteId, escopo) => {
      const id = await exec<string>(
        sb.rpc("fn_conceder_consentimento", { p_estudante: estudanteId, p_escopos: escopo, p_versao_termo: VERSAO_TERMO, p_user_agent: globalThis.navigator?.userAgent ?? null }),
      );
      return paraConsentimento(await exec<Linha>(sb.from("consentimentos").select(COL_CONSENT).eq("id", id).single()));
    },
    revogarConsentimento: async (estudanteId) => {
      const id = await exec<string>(sb.rpc("fn_revogar_consentimento", { p_estudante: estudanteId }));
      return paraConsentimento(await exec<Linha>(sb.from("consentimentos").select(COL_CONSENT).eq("id", id).single()));
    },
  } satisfies Partial<PeiVivoApi>;
}
