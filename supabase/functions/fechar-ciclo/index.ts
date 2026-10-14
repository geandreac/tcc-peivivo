// Edge Function fechar-ciclo (F6/F7, RF05/RF06, D-37): dados do ciclo com o
// JWT do docente → motor (RN03) → grava a versão com service role. O banco
// decide PENDENTE (há profissional) ou VIGENTE (RN06, modo pedagógico).
import { fecharCiclo, type DadosFechamento } from "../_shared/gerado/funcoes/index.ts";
import { rpc, servir } from "../_shared/http.ts";

servir("fechar-ciclo", (corpo, { usuario, servico }) =>
  fecharCiclo(corpo, {
    dados: (cicloId) => rpc<DadosFechamento>(usuario, "fn_dados_fechamento", { p_ciclo: cicloId }),
    registrar: (docenteId, cicloId, parametros) =>
      rpc(servico, "fn_registrar_fechamento", { p_docente: docenteId, p_ciclo: cicloId, p_parametros: parametros }),
  }),
);
