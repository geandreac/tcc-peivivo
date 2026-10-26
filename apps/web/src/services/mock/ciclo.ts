/** Ciclos, observações, versões do perfil (RN03/RN05/RN06), pendências e painel da escola. */
import type { PeiVivoApi } from "../api";
import { ErroApi } from "../erros";
import type { Ciclo, ObservacaoRegistro, Pendencia, ResumoEscola, VersaoPerfil } from "../tipos";
import { STATUS_PENDENTES } from "../tipos";
import { DIAS_CICLO_PARADO, DIAS_VALIDACAO_ATRASADA, LIMITE_EVIDENCIA, MS_POR_DIA } from "@pei-vivo/contratos";
import { uuid, type ContextoMock } from "./contexto";

export function ciclo(ctx: ContextoMock) {
  return {
    // ---- ciclos e observações
    listarCiclos: (estudanteId) =>
      ctx.chamada(() => {
        ctx.exigirLeitura(estudanteId);
        return ctx.estado.ciclos.filter((c) => c.estudanteId === estudanteId).sort((a, b) => a.numero - b.numero);
      }),
    obterCicloAberto: (estudanteId) =>
      ctx.chamada(() => {
        ctx.exigirLeitura(estudanteId);
        return ctx.estado.ciclos.find((c) => c.estudanteId === estudanteId && c.status === "ABERTO") ?? null;
      }),
    abrirCiclo: (estudanteId) =>
      ctx.chamada(() => {
        ctx.exigirPapel(estudanteId, "DOCENTE");
        ctx.exigirConsentimento(estudanteId);
        const aberto = ctx.estado.ciclos.find((c) => c.estudanteId === estudanteId && c.status === "ABERTO");
        if (aberto) return aberto;
        const numero = Math.max(0, ...ctx.estado.ciclos.filter((c) => c.estudanteId === estudanteId).map((c) => c.numero)) + 1;
        const novo: Ciclo = { id: uuid(), estudanteId, numero, dataInicio: ctx.agora().slice(0, 10), dataFim: null, status: "ABERTO" };
        ctx.estado.ciclos.push(novo);
        ctx.salvar();
        return novo;
      }),
    listarObservacoes: (estudanteId, pagina) =>
      ctx.chamada(() => {
        ctx.exigirLeitura(estudanteId);
        const ids = new Set(ctx.estado.ciclos.filter((c) => c.estudanteId === estudanteId).map((c) => c.id));
        return ctx.paginar(ctx.estado.observacoes.filter((o) => ids.has(o.cicloId)).sort((a, b) => b.dataRegistro.localeCompare(a.dataRegistro)), pagina);
      }),
    registrarObservacao: (cicloId, dados) =>
      ctx.chamada(() => {
        const ciclo = ctx.estado.ciclos.find((c) => c.id === cicloId);
        if (!ciclo) throw new ErroApi("NAO_ENCONTRADO", "Ciclo não encontrado.");
        const papel = ctx.exigirPapel(ciclo.estudanteId, "DOCENTE", "RESPONSAVEL", "PROFISSIONAL_SAUDE");
        ctx.exigirConsentimento(ciclo.estudanteId);
        if (ciclo.status !== "ABERTO") throw new ErroApi("CONFLITO", "Este ciclo já foi fechado.");
        ctx.exigirTamanho(dados.evidencia, LIMITE_EVIDENCIA, "A evidência");
        const o: ObservacaoRegistro = {
          id: uuid(),
          cicloId,
          numeroCiclo: ciclo.numero,
          autorId: ctx.eu().id,
          papelAutor: papel,
          dimensao: dados.dimensao,
          valorEscala: dados.valorEscala,
          evidencia: dados.evidencia?.trim() || null,
          dataRegistro: ctx.agora(),
        };
        ctx.estado.observacoes.push(o);
        ctx.salvar();
        return o;
      }),

    // ---- versões de perfil
    listarVersoes: (estudanteId) =>
      ctx.chamada(() => {
        ctx.exigirLeitura(estudanteId);
        ctx.aplicarExpiracao();
        return ctx.estado.versoes.filter((v) => v.estudanteId === estudanteId).sort((a, b) => b.numeroCiclo - a.numeroCiclo);
      }),
    obterVersaoVigente: (estudanteId) =>
      ctx.chamada(() => {
        ctx.exigirLeitura(estudanteId);
        return ctx.versaoVigente(estudanteId);
      }),
    preverFechamento: (cicloId) =>
      ctx.chamada(() => {
        const ciclo = ctx.estado.ciclos.find((c) => c.id === cicloId);
        if (!ciclo) throw new ErroApi("NAO_ENCONTRADO", "Ciclo não encontrado.");
        ctx.exigirPapel(ciclo.estudanteId, "DOCENTE");
        ctx.exigirLeitura(ciclo.estudanteId);
        const { proposta, diff } = ctx.calcularProposta(ciclo);
        const modoPedagogico = !ctx.temProfissional(ciclo.estudanteId);
        const versao: VersaoPerfil = {
          id: "previa",
          estudanteId: ciclo.estudanteId,
          cicloOrigemId: ciclo.id,
          numeroCiclo: ciclo.numero,
          parametros: proposta,
          statusValidacao: modoPedagogico ? "VIGENTE" : "PENDENTE",
          validadorId: null,
          dataVigencia: null,
          justificativaRevisao: null,
          createdAt: ctx.agora(),
        };
        return { versao, diff, modoPedagogico };
      }),
    fecharCiclo: (cicloId) =>
      ctx.chamada(() => {
        const ciclo = ctx.estado.ciclos.find((c) => c.id === cicloId);
        if (!ciclo) throw new ErroApi("NAO_ENCONTRADO", "Ciclo não encontrado.");
        ctx.exigirPapel(ciclo.estudanteId, "DOCENTE");
        ctx.exigirConsentimento(ciclo.estudanteId);
        if (ciclo.status !== "ABERTO") throw new ErroApi("CONFLITO", "Este ciclo já foi fechado.");
        if (!ctx.estado.observacoes.some((o) => o.cicloId === cicloId)) {
          throw new ErroApi("CONFLITO", "Registre ao menos uma observação antes de fechar o ciclo.");
        }
        const { proposta, diff } = ctx.calcularProposta(ciclo);
        const modoPedagogico = !ctx.temProfissional(ciclo.estudanteId); // RN06
        const versao: VersaoPerfil = {
          id: uuid(),
          estudanteId: ciclo.estudanteId,
          cicloOrigemId: ciclo.id,
          numeroCiclo: ciclo.numero,
          parametros: proposta,
          statusValidacao: "PENDENTE",
          validadorId: null,
          dataVigencia: null,
          justificativaRevisao: null,
          createdAt: ctx.agora(),
        };
        if (modoPedagogico) ctx.tornarVigente(versao); // RN06
        ctx.estado.versoes.push(versao);
        ciclo.status = "FECHADO";
        ciclo.dataFim = ctx.agora().slice(0, 10);
        // abre o próximo ciclo (HU-D.01: "o sistema abre ao fechar o N-1")
        ctx.estado.ciclos.push({ id: uuid(), estudanteId: ciclo.estudanteId, numero: ciclo.numero + 1, dataInicio: ctx.agora().slice(0, 10), dataFim: null, status: "ABERTO" });
        ctx.registrarAuditoria("ciclos_observacao", ciclo.id, "CICLO_FECHADO", { numero: ciclo.numero, status: versao.statusValidacao });
        if (versao.statusValidacao === "PENDENTE") ctx.notificar(ciclo.estudanteId, "VALIDACAO_PENDENTE", ["PROFISSIONAL_SAUDE"]);
        ctx.salvar();
        return { versao, diff, modoPedagogico };
      }),
    validarVersao: (versaoId, decisao, justificativa) =>
      ctx.chamada(() => {
        const v = ctx.estado.versoes.find((x) => x.id === versaoId);
        if (!v) throw new ErroApi("NAO_ENCONTRADO", "Versão não encontrada.");
        ctx.exigirPapel(v.estudanteId, "PROFISSIONAL_SAUDE");
        ctx.exigirConsentimento(v.estudanteId);
        // D-35: só PENDENTE é decidida; expirada não volta (RN05); nunca por cima de vigente mais nova.
        if (v.statusValidacao !== "PENDENTE") throw new ErroApi("CONFLITO", "Só propostas pendentes podem ser decididas.");
        const vigente = ctx.versaoVigente(v.estudanteId);
        if (vigente && vigente.numeroCiclo >= v.numeroCiclo) throw new ErroApi("CONFLITO", "Já há uma versão vigente de ciclo igual ou mais recente.");
        if (decisao === "APROVAR") {
          ctx.tornarVigente(v);
          v.validadorId = ctx.eu().id;
          v.justificativaRevisao = null;
          ctx.registrarAuditoria("versoes_perfil", v.id, "VALIDACAO", { numeroCiclo: v.numeroCiclo });
        } else {
          if (!justificativa?.trim()) throw new ErroApi("VALIDACAO", "Explique o ajuste solicitado para o docente.");
          v.statusValidacao = "EM_REVISAO";
          v.justificativaRevisao = justificativa.trim();
          ctx.registrarAuditoria("versoes_perfil", v.id, "REVISAO_SOLICITADA", { numeroCiclo: v.numeroCiclo });
          ctx.notificar(v.estudanteId, "REVISAO_SOLICITADA", ["DOCENTE"]);
        }
        ctx.salvar();
        return v;
      }),
    listarPendencias: () =>
      ctx.chamada(() => {
        const u = ctx.eu();
        ctx.aplicarExpiracao();
        const meus = ctx.estado.vinculos.filter((v) => v.usuarioId === u.id && v.status === "ATIVO" && (v.papel === "PROFISSIONAL_SAUDE" || v.papel === "COORDENACAO"));
        const ids = new Set(meus.map((v) => v.estudanteId));
        const lista: Pendencia[] = [];
        for (const v of ctx.estado.versoes) {
          // Só o que ainda pode ser decidido: substituída e expirada não voltam (RN05, D-35).
          if (!ids.has(v.estudanteId) || !STATUS_PENDENTES.includes(v.statusValidacao)) continue;
          lista.push({ versao: v, estudante: ctx.estudante(v.estudanteId), diasEmAberto: Math.floor((Date.now() - new Date(v.createdAt).getTime()) / MS_POR_DIA) });
        }
        return lista.sort((a, b) => b.diasEmAberto - a.diasEmAberto);
      }),

    resumoEscola: () =>
      ctx.chamada(() => {
        const u = ctx.eu();
        ctx.aplicarExpiracao();
        const ids = ctx.estado.vinculos.filter((v) => v.usuarioId === u.id && v.status === "ATIVO" && v.papel === "COORDENACAO").map((v) => v.estudanteId);
        if (u.papelInstitucional !== "COORDENACAO") throw new ErroApi("NEGADO", "O painel da escola é da coordenação pedagógica.");
        const resumo: ResumoEscola = { totalEstudantes: ids.length, comConsentimento: 0, semConsentimento: 0, semProfissional: 0, validacoesAtrasadas: 0, ciclosParados: 0, pendencias: [] };
        for (const id of ids) {
          const e = ctx.estudante(id);
          const add = (motivo: ResumoEscola["pendencias"][number]["motivo"], desde: string | null) => resumo.pendencias.push({ estudanteId: id, nome: e.nome, motivo, desde });
          if (ctx.temConsentimento(id)) resumo.comConsentimento++;
          else {
            resumo.semConsentimento++;
            add("SEM_CONSENTIMENTO", e.createdAt);
            continue; // sem autorização, o resto não se aplica
          }
          if (!ctx.temProfissional(id)) {
            resumo.semProfissional++;
            add("SEM_PROFISSIONAL", null);
          }
          const atrasada = ctx.estado.versoes.find(
            (v) => v.estudanteId === id && (v.statusValidacao === "EXPIRADA" || (v.statusValidacao === "PENDENTE" && Date.now() - new Date(v.createdAt).getTime() >= DIAS_VALIDACAO_ATRASADA * MS_POR_DIA))
          );
          if (atrasada) {
            resumo.validacoesAtrasadas++;
            add("VALIDACAO_ATRASADA", atrasada.createdAt);
          }
          const aberto = ctx.estado.ciclos.find((c) => c.estudanteId === id && c.status === "ABERTO");
          if (aberto && Date.now() - new Date(aberto.dataInicio).getTime() > DIAS_CICLO_PARADO * MS_POR_DIA && !ctx.estado.observacoes.some((o) => o.cicloId === aberto.id)) {
            resumo.ciclosParados++;
            add("CICLO_PARADO", aberto.dataInicio);
          }
        }
        return resumo;
      }),
  } satisfies Partial<PeiVivoApi>;
}
