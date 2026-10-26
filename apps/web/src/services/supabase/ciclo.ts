/** Ciclos, observações, versões do perfil, pendências e painel da escola. */
import type { NovaObservacao, PeiVivoApi } from "../api";
import { ErroApi } from "../erros";
import { exec, paginado, type Linha } from "./infra";
import { COL_ESTUDANTE, COL_CICLO, COL_OBS, COL_VERSAO, paraEstudante, paraCiclo, paraObservacao, paraVersao } from "./mapeadores";
import { calcularFechamento } from "@pei-vivo/funcoes";
import { MS_POR_DIA, type RespostaFecharCiclo } from "@pei-vivo/contratos";
import type { ObservacaoHistorica, ParametrosAdaptacao } from "@pei-vivo/motor-adaptacao";
import { STATUS_PENDENTES } from "../tipos";
import type { Pendencia, ResumoEscola, VersaoPerfil } from "../tipos";
import type { Contexto } from "./contexto";

export function ciclo(c: Contexto) {
  const { sb } = c;
  return {
    // ---- ciclos e observações
    listarCiclos: async (estudanteId) => (await exec<Linha[]>(sb.from("ciclos_observacao").select(COL_CICLO).eq("estudante_id", estudanteId).order("numero"))).map(paraCiclo),
    obterCicloAberto: async (estudanteId) => {
      const r = await exec<Linha | null>(sb.from("ciclos_observacao").select(COL_CICLO).eq("estudante_id", estudanteId).eq("status", "ABERTO").maybeSingle());
      return r ? paraCiclo(r) : null;
    },
    abrirCiclo: async (estudanteId) => {
      const aberto = await c.api.obterCicloAberto(estudanteId);
      if (aberto) return aberto;
      return paraCiclo(await exec<Linha>(sb.from("ciclos_observacao").insert({ estudante_id: estudanteId }).select(COL_CICLO).single()));
    },
    listarObservacoes: async (estudanteId, pagina) => {
      const linhas = await paginado<Linha>(
        (de, ate) =>
          sb
            .from("observacoes")
            .select(`${COL_OBS}, ciclos_observacao!inner(numero, estudante_id)`)
            .eq("ciclos_observacao.estudante_id", estudanteId)
            .order("data_registro", { ascending: false })
            .order("id")
            .range(de, ate),
        pagina,
      );
      return linhas.map(paraObservacao);
    },
    registrarObservacao: async (cicloId, dados: NovaObservacao) => {
      const r = await exec<Linha>(
        sb
          .from("observacoes")
          .insert({ ciclo_id: cicloId, dimensao: dados.dimensao, valor_escala: dados.valorEscala, evidencia: dados.evidencia?.trim() || null })
          .select(`${COL_OBS}, ciclos_observacao(numero)`)
          .single(),
      );
      return paraObservacao(r);
    },

    // ---- versões de perfil
    listarVersoes: async (estudanteId) =>
      (await exec<Linha[]>(sb.from("versoes_perfil").select(COL_VERSAO).eq("estudante_id", estudanteId).order("numero_ciclo", { ascending: false }).order("created_at", { ascending: false }))).map(paraVersao),
    obterVersaoVigente: async (estudanteId) => {
      const r = await exec<Linha | null>(sb.from("versoes_perfil").select(COL_VERSAO).eq("estudante_id", estudanteId).eq("status_validacao", "VIGENTE").maybeSingle());
      return r ? paraVersao(r) : null;
    },
    preverFechamento: async (cicloId) => {
      // Mesmo cálculo da Edge Function (packages/funcoes), sem gravar nada.
      const d = await exec<{ estudanteId: string; numeroCiclo: number; vigente: { parametros: ParametrosAdaptacao } | null; validacaoClinica: boolean; historico: ObservacaoHistorica[] }>(
        sb.rpc("fn_dados_fechamento", { p_ciclo: cicloId }),
      );
      const { proposta, diff } = calcularFechamento(d.numeroCiclo, d.vigente?.parametros ?? null, d.historico);
      const versao: VersaoPerfil = {
        id: "previa",
        estudanteId: d.estudanteId,
        cicloOrigemId: cicloId,
        numeroCiclo: d.numeroCiclo,
        parametros: proposta,
        statusValidacao: d.validacaoClinica ? "PENDENTE" : "VIGENTE",
        validadorId: null,
        dataVigencia: null,
        justificativaRevisao: null,
        createdAt: new Date().toISOString(),
      };
      return { versao, diff, modoPedagogico: !d.validacaoClinica };
    },
    fecharCiclo: async (cicloId) => {
      const r = await c.funcao<RespostaFecharCiclo>("fechar-ciclo", { cicloId });
      return { versao: await c.obterVersao(r.versaoId), diff: r.diff, modoPedagogico: r.modoPedagogico };
    },
    validarVersao: async (versaoId, decisao, justificativa) => {
      const id = await exec<string>(
        sb.rpc("fn_validar_versao", { p_versao: versaoId, p_decisao: decisao === "APROVAR" ? "APROVAR" : "REVISAO", p_justificativa: justificativa?.trim() || null }),
      );
      return c.obterVersao(id);
    },
    listarPendencias: async () => {
      const linhas = await exec<Linha[]>(
        sb.from("versoes_perfil").select(`${COL_VERSAO}, estudantes(${COL_ESTUDANTE})`).in("status_validacao", [...STATUS_PENDENTES]).order("created_at"),
      );
      const agora = Date.now();
      return linhas
        .filter((r) => r.estudantes)
        .map(
          (r): Pendencia => ({
            versao: paraVersao(r),
            estudante: paraEstudante(r.estudantes as Linha),
            diasEmAberto: Math.floor((agora - new Date(String(r.created_at)).getTime()) / MS_POR_DIA),
          }),
        )
        .sort((a, b) => b.diasEmAberto - a.diasEmAberto);
    },
    resumoEscola: async () => {
      const escola = c.eu().escolaCoordenada;
      if (!escola) throw new ErroApi("NEGADO", "O painel da escola é da coordenação pedagógica.");
      // D-48: o banco agrega (fn_resumo_escola, 0011); antes eram 5 tabelas inteiras contadas aqui.
      return exec<ResumoEscola>(sb.rpc("fn_resumo_escola", { p_escola: escola }));
    },
  } satisfies Partial<PeiVivoApi>;
}
