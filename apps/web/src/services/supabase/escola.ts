/** Estudantes, vínculos, convites e notificações. */
import type { NovoConvite, NovoEstudante, NovoVinculo, PeiVivoApi, RespostaConvite } from "../api";
import { ErroApi } from "../erros";
import { exec, type Linha } from "./infra";
import { COL_ESTUDANTE, COL_VINCULO, COL_NOTIF, paraEstudante, paraVinculo, paraNotificacao } from "./mapeadores";
import type { Contexto } from "./contexto";

export function escola(c: Contexto) {
  const { sb } = c;
  return {
    // ---- estudantes e vínculos
    listarEstudantes: async () => {
      const linhas = await exec<Linha[]>(sb.from("estudantes").select(COL_ESTUDANTE).order("nome"));
      return linhas.map((r) => paraEstudante(r));
    },
    obterEstudante: async (id) => {
      const r = await exec<Linha | null>(sb.from("estudantes").select(COL_ESTUDANTE).eq("id", id).maybeSingle());
      if (!r) throw new ErroApi("NEGADO", "Você não está vinculado a este estudante.");
      let laudo: string | null = null;
      try {
        laudo = await exec<string | null>(sb.rpc("fn_laudo_apresentado_em", { p_estudante: id }));
      } catch (e) {
        if (!(e instanceof ErroApi && e.codigo === "NEGADO")) throw e; // docente: a data não existe para ele (D-01)
      }
      return paraEstudante(r, laudo);
    },
    meuPapel: (estudanteId) => c.meuPapel(estudanteId),
    listarVinculos: async (estudanteId) => {
      const linhas = await exec<Linha[]>(
        sb.from("vinculos_usuario_estudante").select(`${COL_VINCULO}, usuarios!vinculos_usuario_estudante_usuario_id_fkey(nome)`).eq("estudante_id", estudanteId).order("data_vinculo"),
      );
      return linhas.map(paraVinculo);
    },
    listarUsuarios: async () => {
      if (!c.eu().escolaCoordenada) throw new ErroApi("NEGADO", "Só a coordenação lista usuários.");
      const linhas = await exec<Linha[]>(sb.from("usuarios").select("id, nome").order("nome"));
      return linhas.filter((u) => u.id !== c.eu().id).map((u) => ({ id: String(u.id), nome: String(u.nome), email: "", papelInstitucional: null }));
    },
    cadastrarEstudante: async (dados: NovoEstudante) => {
      const escola = c.eu().escolaCoordenada;
      if (!escola) throw new ErroApi("NEGADO", "Só a coordenação cadastra estudantes.");
      const id = await exec<string>(
        sb.rpc("fn_cadastrar_estudante", {
          p_escola: escola,
          p_nome: dados.nome,
          p_data_nascimento: dados.dataNascimento,
          p_turma: dados.turma ?? null,
          p_laudo_apresentado_em: dados.laudoApresentadoEm || null,
        }),
      );
      return c.api.obterEstudante(id);
    },
    vincular: async (dados: NovoVinculo) => {
      const id = await exec<string>(
        sb.rpc("fn_propor_vinculo", {
          p_estudante: dados.estudanteId,
          p_usuario: dados.usuarioId,
          p_papel: dados.papel,
          p_registro_conselho: dados.registroConselho?.trim() || null,
          p_conferido_presencialmente: Boolean(dados.conferidoPresencialmente),
        }),
      );
      return c.obterVinculo(id);
    },
    desativarVinculo: async (vinculoId) => {
      await exec(sb.rpc("fn_encerrar_vinculo", { p_vinculo: vinculoId }));
    },
    confirmarVinculo: async (vinculoId, aceitar) => {
      await exec(sb.rpc("fn_confirmar_vinculo", { p_vinculo: vinculoId, p_aceitar: aceitar }));
      return c.obterVinculo(vinculoId);
    },

    convidar: async (dados: NovoConvite) => {
      const escola = c.eu().escolaCoordenada;
      if (!escola) throw new ErroApi("NEGADO", "Só a coordenação da escola convida pessoas.");
      return c.funcao<RespostaConvite>("convidar", {
        escolaId: escola,
        email: dados.email,
        nome: dados.nome ?? "",
        papel: dados.papel,
        estudanteId: dados.estudanteId ?? null,
        registroConselho: dados.registroConselho?.trim() || null,
        conferidoPresencialmente: Boolean(dados.conferidoPresencialmente),
      });
    },

    // ---- notificações
    listarNotificacoes: async () => (await exec<Linha[]>(sb.from("notificacoes").select(COL_NOTIF).order("criada_em", { ascending: false }))).map(paraNotificacao),
    marcarNotificacoesLidas: async (ids) => {
      let q = sb.from("notificacoes").update({ lida_em: new Date().toISOString() }).is("lida_em", null);
      if (ids) q = q.in("id", ids);
      await exec(q);
    },
  } satisfies Partial<PeiVivoApi>;
}
