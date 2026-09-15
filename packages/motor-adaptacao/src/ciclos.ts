/**
 * P2.1 / HU-S.01 — `ciclosConsecutivos` é entrada do motor (`tipos.ts`),
 * mas ninguém a produzia. Esta função deriva o valor a partir do histórico
 * de observações do estudante, por dimensão, contando do ciclo mais recente
 * para trás quantos ciclos consecutivos repetem a mesma escala.
 *
 * Pura e determinística: recebe linhas de `observacoes` já unidas a
 * `ciclos_observacao.numero`, devolve um Map. Sem banco, sem rede.
 */
import type { DimensaoObservada, Observacao, ObservacaoHistorica } from "./tipos";

/**
 * Conta, por dimensão, quantos ciclos consecutivos (do mais recente para
 * trás) têm a mesma escala do ciclo mais recente em que a dimensão aparece.
 *
 * - Dimensão ausente no último ciclo → 0 (a série foi interrompida).
 * - AMPLIADA, AMPLIADA, AMPLIADA → 3.
 * - AMPLIADA, ESTAVEL, AMPLIADA (mais recente por último) → 1.
 */
export function calcularCiclosConsecutivos(
  historico: ObservacaoHistorica[]
): Map<DimensaoObservada, number> {
  const resultado = new Map<DimensaoObservada, number>();
  if (historico.length === 0) return resultado;

  const ultimoCiclo = Math.max(...historico.map((o) => o.numeroCiclo));
  const dimensoes = new Set(historico.map((o) => o.dimensao));

  for (const dimensao of dimensoes) {
    // Uma observação por ciclo por dimensão; se houver mais de uma, vale a última gravada.
    const porCiclo = new Map<number, ObservacaoHistorica>();
    for (const o of historico) if (o.dimensao === dimensao) porCiclo.set(o.numeroCiclo, o);

    const atual = porCiclo.get(ultimoCiclo);
    if (!atual) {
      resultado.set(dimensao, 0);
      continue;
    }

    let consecutivos = 0;
    for (let n = ultimoCiclo; n >= 1; n--) {
      const o = porCiclo.get(n);
      if (!o || o.valorEscala !== atual.valorEscala) break;
      consecutivos++;
    }
    resultado.set(dimensao, consecutivos);
  }
  return resultado;
}

/**
 * Conveniência para a Edge Function `fechar-ciclo` (D-09) e para o protótipo:
 * transforma as observações do ciclo mais recente em `Observacao[]` prontas
 * para `aplicarCiclo`, com `ciclosConsecutivos` já derivado do histórico.
 */
export function observacoesDoUltimoCiclo(historico: ObservacaoHistorica[]): Observacao[] {
  if (historico.length === 0) return [];
  const ultimoCiclo = Math.max(...historico.map((o) => o.numeroCiclo));
  const consecutivos = calcularCiclosConsecutivos(historico);
  const vistas = new Set<DimensaoObservada>();
  const saida: Observacao[] = [];
  // percorre de trás para frente para que "vale a última gravada" bata com calcularCiclosConsecutivos
  for (let i = historico.length - 1; i >= 0; i--) {
    const o = historico[i]!;
    if (o.numeroCiclo !== ultimoCiclo || vistas.has(o.dimensao)) continue;
    vistas.add(o.dimensao);
    saida.unshift({
      dimensao: o.dimensao,
      valorEscala: o.valorEscala,
      ciclosConsecutivos: consecutivos.get(o.dimensao) ?? 1,
    });
  }
  return saida;
}
