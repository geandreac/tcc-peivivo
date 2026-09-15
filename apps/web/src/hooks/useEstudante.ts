import { useParams } from "react-router-dom";
import { api, type Consentimento, type Estudante, type Papel } from "../services";
import { useConsulta } from "./useConsulta";

export interface ContextoEstudante {
  estudante: Estudante;
  papel: Papel | null;
  consentimento: Consentimento | null;
  consentimentoAtivo: boolean;
}

/** Carrega estudante + meu papel + consentimento — cabeçalho comum das telas por estudante. */
export function useEstudante(idExplicito?: string) {
  const params = useParams<{ id: string }>();
  const id = idExplicito ?? params.id ?? "";
  return useConsulta<ContextoEstudante>(async () => {
    const [estudante, papel, consentimento] = await Promise.all([api.obterEstudante(id), api.meuPapel(id), api.obterConsentimento(id)]);
    return { estudante, papel, consentimento, consentimentoAtivo: consentimento?.status === "ATIVO" };
  }, [id]);
}
