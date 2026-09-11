/**
 * Regras de conversão observação → parâmetro.
 * Tradução literal do Quadro 5 (pré-projeto, seção 6.4) para código.
 *
 * Cada função é pura e determinística — nenhuma delas chama rede, banco ou
 * IA. É por isso que RNF08 (confiabilidade) é verificável só com testes
 * unitários, sem precisar subir nenhum serviço.
 *
 * RN03 — assimetria conservadora — está encapsulada em `paraProximoNivel`:
 * flexibilizar (subir nível) exige 2 ciclos consecutivos de melhora;
 * restringir (descer nível) é imediato, com 1 ciclo só.
 */
import type {
  Observacao,
  ParametrosAdaptacao,
  NivelVocabulario,
} from "./tipos";
import { PARAMETROS_PADRAO } from "./tipos";

const NIVEIS: NivelVocabulario[] = ["BASICO", "INTERMEDIARIO", "ORIGINAL"];

/** RN03: sobe exige 2 ciclos; desce é imediato (1 ciclo já basta). */
function paraProximoNivel(
  atual: NivelVocabulario,
  direcao: "SUBIR" | "DESCER",
  ciclosConsecutivos: number
): NivelVocabulario {
  const idx = NIVEIS.indexOf(atual);
  if (direcao === "DESCER") {
    return NIVEIS[Math.max(0, idx - 1)] ?? atual;
  }
  // SUBIR só vale com 2+ ciclos consecutivos de observação "ampliada"
  if (ciclosConsecutivos >= 2) {
    return NIVEIS[Math.min(NIVEIS.length - 1, idx + 1)] ?? atual;
  }
  return atual;
}

/**
 * Aplica uma única observação sobre os parâmetros vigentes, retornando a
 * nova versão. Não muta o objeto recebido (facilita o snapshot em
 * `versoes_perfil.parametros`).
 */
export function aplicarObservacao(
  parametrosAtuais: ParametrosAdaptacao,
  obs: Observacao
): ParametrosAdaptacao {
  const p = { ...parametrosAtuais };

  switch (obs.dimensao) {
    case "ATENCAO_SUSTENTADA":
      if (obs.valorEscala === "REDUZIDA") {
        p.maxLinhasPorBloco = Math.max(3, p.maxLinhasPorBloco - 1);
      } else if (obs.valorEscala === "AMPLIADA" && obs.ciclosConsecutivos >= 2) {
        p.maxLinhasPorBloco = Math.min(8, p.maxLinhasPorBloco + 1);
      }
      break;

    case "COMPREENSAO_ENUNCIADOS":
      if (obs.valorEscala === "REDUZIDA") {
        p.formatoEnunciado = "ETAPA_UNICA";
      } else if (obs.valorEscala === "AMPLIADA" && obs.ciclosConsecutivos >= 2) {
        p.formatoEnunciado = "MULTIPLAS_ETAPAS";
      }
      break;

    case "AUTONOMIA_LEXICAL":
      if (obs.valorEscala === "REDUZIDA") {
        p.nivelVocabulario = paraProximoNivel(p.nivelVocabulario, "DESCER", 1);
      } else if (obs.valorEscala === "AMPLIADA") {
        p.nivelVocabulario = paraProximoNivel(
          p.nivelVocabulario,
          "SUBIR",
          obs.ciclosConsecutivos
        );
      }
      break;

    case "SENSIBILIDADE_VISUAL":
      p.contrasteMinimo = obs.valorEscala === "AMPLIADA" ? 7 : 4.5;
      break;

    case "FADIGA_TAREFA":
      if (obs.valorEscala === "AMPLIADA") {
        p.blocosPorMaterial = Math.max(4, p.blocosPorMaterial - 2);
      } else if (obs.valorEscala === "REDUZIDA") {
        p.blocosPorMaterial = Math.min(12, p.blocosPorMaterial + 2);
      }
      break;

    case "INTERESSE_MANIFESTO":
      // interesseAncora é texto livre, tratado fora do motor de regras
      // (vem diretamente do campo "evidência" registrado pelo autor).
      break;
  }

  return p;
}

/** Aplica uma lista de observações de um ciclo, em sequência. */
export function aplicarCiclo(
  parametrosVigentes: ParametrosAdaptacao,
  observacoesDoCiclo: Observacao[]
): ParametrosAdaptacao {
  return observacoesDoCiclo.reduce(aplicarObservacao, parametrosVigentes);
}

export { PARAMETROS_PADRAO };
