/**
 * Implementação mock de `PeiVivoApi` (D-17).
 *
 * Reproduz a matriz de permissões v2 (`docs/requisitos.md` §6) e as regras
 * RN01–RN08 do lado do "servidor" simulado: o mock NEGA o que o RLS negaria
 * (403 → `ErroApi("NEGADO")`, 0 linhas → lista vazia / NAO_ENCONTRADO).
 * Isso permite testar os caminhos negados na interface (P4.20) antes das
 * Edge Functions existirem — e garante que nenhuma tela "lembra" permissão
 * que o banco não aplica.
 *
 * Estado em memória + localStorage (para sobreviver ao reload da demo),
 * latência simulada (estados de carregamento reais) e chave de falha
 * (estados de erro reais).
 */
import type { PeiVivoApi } from "./api";
import { criarContextoMock, type OpcoesMock } from "./mock/contexto";
import { sessao } from "./mock/sessao";
import { escola } from "./mock/escola";
import { consentimento } from "./mock/consentimento";
import { ciclo } from "./mock/ciclo";
import { materiais } from "./mock/materiais";
import { privacidade } from "./mock/privacidade";
import { admin } from "./mock/admin";

export type { OpcoesMock } from "./mock/contexto";
export type { NovaObservacao, NovoEstudante, NovoVinculo } from "./api";
export type { EscopoConsentimento, ResultadoDesfecho } from "./tipos";

/** Monta o PeiVivoApi da demonstração a partir dos agregados (services/mock/*). */
export function criarMockApi(opcoes: OpcoesMock = {}): PeiVivoApi {
  const ctx = criarContextoMock(opcoes);
  const api: PeiVivoApi = {
    ...sessao(ctx),
    ...escola(ctx),
    ...consentimento(ctx),
    ...ciclo(ctx),
    ...materiais(ctx),
    ...privacidade(ctx),
    ...admin(ctx),
  };
  ctx.api = api;
  return api;
}
