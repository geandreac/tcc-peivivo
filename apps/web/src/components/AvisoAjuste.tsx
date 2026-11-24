import type { VersaoPerfil } from "../services";
import { Alerta } from "./Feedback";

/**
 * Justificativa do ajuste pedido pela saúde, para a docente. Só enquanto a versão devolvida é a mais
 * recente: uma proposta nova já responde ao ajuste. `versoes` vem da mais nova para a mais antiga.
 */
export function AvisoAjuste({ versoes }: { versoes: VersaoPerfil[] }) {
  const ultima = versoes[0];
  if (ultima?.statusValidacao !== "EM_REVISAO" || !ultima.justificativaRevisao) return null;
  return (
    <Alerta tom="aviso" titulo={`O profissional de saúde pediu ajuste na proposta do ciclo ${ultima.numeroCiclo}`}>
      <p>{ultima.justificativaRevisao}</p>
    </Alerta>
  );
}
