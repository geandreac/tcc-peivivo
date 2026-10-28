/** Estudantes, vínculos, convites e notificações (D-28). */
import { TETO } from "@pei-vivo/contratos";
import type { NovoConvite, PeiVivoApi } from "../api";
import { ErroApi } from "../erros";
import type { Estudante, Vinculo } from "../tipos";
import { uuid, type ContextoMock } from "./contexto";

export function escola(ctx: ContextoMock) {
  return {
    // ---- estudantes e vínculos
    listarEstudantes: () =>
      ctx.chamada(() => {
        const u = ctx.eu();
        const ids = new Set(ctx.estado.vinculos.filter((v) => v.usuarioId === u.id && v.status === "ATIVO").map((v) => v.estudanteId));
        return ctx.estado.estudantes.filter((e) => ids.has(e.id)).sort((a, b) => a.nome.localeCompare(b.nome));
      }),
    obterEstudante: (id) =>
      ctx.chamada(() => {
        const e = ctx.estudante(id);
        const papel = ctx.meuPapel(id);
        if (!papel) throw new ErroApi("NEGADO", "Você não está vinculado a este estudante.");
        // D-01: só R, P e C veem a data do laudo
        return papel === "DOCENTE" ? { ...e, laudoApresentadoEm: null } : e;
      }),
    meuPapel: (estudanteId) => ctx.chamada(() => ctx.meuPapel(estudanteId)),
    listarVinculos: (estudanteId) =>
      ctx.chamada(() => {
        const p = ctx.meuPapel(estudanteId);
        if (!p) throw new ErroApi("NEGADO", "Você não está vinculado a este estudante.");
        const u = ctx.eu();
        // D-34: coordenação e responsável veem todos (quem tem acesso); demais só o próprio
        const nome = (id: string) => ctx.estado.usuarios.find((x) => x.id === id)?.nome ?? "Pessoa vinculada";
        return ctx.estado.vinculos
          .filter((v) => v.estudanteId === estudanteId && (p === "COORDENACAO" || p === "RESPONSAVEL" || v.usuarioId === u.id))
          .map((v) => ({ ...v, nomeUsuario: nome(v.usuarioId) }));
      }),
    listarUsuarios: () =>
      ctx.chamada(() => {
        if (ctx.eu().papelInstitucional !== "COORDENACAO") throw new ErroApi("NEGADO", "Só a coordenação lista usuários.");
        return ctx.estado.usuarios;
      }),
    cadastrarEstudante: (dados) =>
      ctx.chamada(() => {
        const u = ctx.eu();
        if (u.papelInstitucional !== "COORDENACAO") throw new ErroApi("NEGADO", "Só a coordenação cadastra estudantes.");
        ctx.validarEstudante(dados);
        const novo: Estudante = {
          id: uuid(),
          nome: dados.nome.trim(),
          dataNascimento: dados.dataNascimento,
          turma: dados.turma?.trim() || null,
          laudoApresentadoEm: dados.laudoApresentadoEm || null,
          createdAt: ctx.agora(),
        };
        ctx.estado.estudantes.push(novo);
        ctx.estado.vinculos.push({
          id: uuid(),
          usuarioId: u.id,
          estudanteId: novo.id,
          papel: "COORDENACAO",
          dataVinculo: ctx.agora(),
          status: "ATIVO",
          registroConselho: null,
        });
        ctx.registrarAuditoria("estudantes", novo.id, "CADASTRO");
        ctx.salvar();
        return novo;
      }),
    vincular: (dados) =>
      ctx.chamada(() => {
        // D-24: coordenação vincula; o responsável só propõe profissional de saúde (e já confirma).
        const meu = ctx.exigirPapel(dados.estudanteId, "COORDENACAO", "RESPONSAVEL");
        if (meu === "RESPONSAVEL" && dados.papel !== "PROFISSIONAL_SAUDE") throw new ErroApi("NEGADO", "A família só propõe profissionais de saúde.");
        if (dados.usuarioId === ctx.eu().id) throw new ErroApi("NEGADO", "Ninguém pode criar vínculo para si mesmo.");
        if (!ctx.estado.usuarios.some((x) => x.id === dados.usuarioId)) throw new ErroApi("NAO_ENCONTRADO", "Usuário não encontrado.");
        if (dados.papel === "RESPONSAVEL" && !dados.conferidoPresencialmente) {
          throw new ErroApi("VALIDACAO", "Confirme que o vínculo legal foi conferido presencialmente, com documento.");
        }
        if (dados.papel === "PROFISSIONAL_SAUDE" && !dados.registroConselho?.trim()) {
          throw new ErroApi("VALIDACAO", "Profissional de saúde precisa do registro no conselho.");
        }
        if (
          ctx.estado.vinculos.some(
            (v) => v.usuarioId === dados.usuarioId && v.estudanteId === dados.estudanteId && (v.status === "ATIVO" || v.status === "PENDENTE_RESPONSAVEL"),
          )
        ) {
          throw new ErroApi("CONFLITO", "Esta pessoa já tem um vínculo ativo com o estudante.");
        }
        const pendente = dados.papel === "PROFISSIONAL_SAUDE" && meu === "COORDENACAO";
        const v: Vinculo = {
          id: uuid(),
          usuarioId: dados.usuarioId,
          estudanteId: dados.estudanteId,
          papel: dados.papel,
          dataVinculo: ctx.agora(),
          status: pendente ? "PENDENTE_RESPONSAVEL" : "ATIVO",
          registroConselho: dados.registroConselho?.trim() || null,
        };
        ctx.estado.vinculos.push(v);
        ctx.registrarAuditoria("vinculos_usuario_estudante", v.id, pendente ? "VINCULO_PROPOSTO" : "VINCULO_CRIADO", { papel: v.papel });
        if (pendente) ctx.notificar(v.estudanteId, "PROFISSIONAL_AGUARDANDO_CONFIRMACAO", ["RESPONSAVEL"]);
        else ctx.notificarUsuario(v.usuarioId, "VINCULO_ATIVADO", v.estudanteId);
        ctx.salvar();
        return v;
      }),
    desativarVinculo: (vinculoId) =>
      ctx.chamada(() => {
        const v = ctx.estado.vinculos.find((x) => x.id === vinculoId);
        if (!v) throw new ErroApi("NAO_ENCONTRADO", "Vínculo não encontrado.");
        const meu = ctx.exigirPapel(v.estudanteId, "COORDENACAO", "RESPONSAVEL");
        // S-14: a coordenação nunca encerra o responsável; a família só remove profissional de saúde.
        if (v.papel === "RESPONSAVEL" || (meu === "RESPONSAVEL" && v.papel !== "PROFISSIONAL_SAUDE")) {
          throw new ErroApi("NEGADO", "Seu papel não permite encerrar este vínculo.");
        }
        if (v.status === "ENCERRADO" || v.status === "RECUSADO") throw new ErroApi("CONFLITO", "Este vínculo já está encerrado.");
        v.status = "ENCERRADO";
        ctx.registrarAuditoria("vinculos_usuario_estudante", v.id, "VINCULO_DESATIVADO", { papel: v.papel });
        ctx.salvar();
      }),

    confirmarVinculo: (vinculoId, aceitar) =>
      ctx.chamada(() => {
        const v = ctx.estado.vinculos.find((x) => x.id === vinculoId);
        if (!v) throw new ErroApi("NAO_ENCONTRADO", "Vínculo não encontrado.");
        ctx.exigirPapel(v.estudanteId, "RESPONSAVEL");
        if (v.status !== "PENDENTE_RESPONSAVEL") throw new ErroApi("CONFLITO", "Este vínculo não está aguardando confirmação.");
        v.status = aceitar ? "ATIVO" : "RECUSADO";
        ctx.registrarAuditoria("vinculos_usuario_estudante", v.id, aceitar ? "VINCULO_CONFIRMADO" : "VINCULO_RECUSADO", { papel: v.papel });
        if (aceitar) ctx.notificarUsuario(v.usuarioId, "VINCULO_ATIVADO", v.estudanteId);
        // 0009: decidida a última proposta, o aviso "aguardando confirmação" deixa de ser novo.
        if (!ctx.estado.vinculos.some((x) => x.estudanteId === v.estudanteId && x.status === "PENDENTE_RESPONSAVEL")) {
          for (const n of ctx.estado.notificacoes) {
            if (n.estudanteId === v.estudanteId && n.tipo === "PROFISSIONAL_AGUARDANDO_CONFIRMACAO" && !n.lidaEm) n.lidaEm = ctx.agora();
          }
        }
        ctx.salvar();
        return v;
      }),

    convidar: (dados: NovoConvite) =>
      ctx.chamada(() => {
        const u = ctx.eu();
        const admin = u.papelPlataforma === "ADMIN_GERAL";
        if (u.papelInstitucional !== "COORDENACAO" && !admin) {
          throw new ErroApi("NEGADO", "Só a coordenação da escola ou o Administrador Geral, com verificação em duas etapas, convida pessoas.");
        }
        // D-50: COORDENACAO só pelo Administrador Geral (para a coordenação continua papel inválido, como no banco)
        if (!["DOCENTE", "RESPONSAVEL", "PROFISSIONAL_SAUDE"].includes(dados.papel) && !(admin && dados.papel === "COORDENACAO")) {
          throw new ErroApi("VALIDACAO", "Papel inválido para convite.");
        }
        if (dados.perfilId) {
          const perfil = ctx.estado.perfis.find((p) => p.id === dados.perfilId && !p.arquivadoEm);
          if (perfil?.papelBase !== dados.papel) throw new ErroApi("VALIDACAO", "O perfil escolhido não é deste papel.");
        }
        if ((dados.permissoesRemovidas ?? []).some((x) => !(TETO[dados.papel] as readonly string[]).includes(x))) {
          throw new ErroApi("VALIDACAO", "Permissão desconhecida para este papel.");
        }
        if (dados.acessoExpiraEm && new Date(dados.acessoExpiraEm).getTime() <= Date.now()) {
          throw new ErroApi("VALIDACAO", "A validade do acesso precisa ser uma data futura.");
        }
        if ((dados.organizacao?.trim().length ?? 0) > 120) throw new ErroApi("VALIDACAO", "Organização com no máximo 120 caracteres.");
        const email = dados.email.trim().toLowerCase();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/u.test(email)) throw new ErroApi("VALIDACAO", "Informe um e-mail válido.");
        if (email === u.email) throw new ErroApi("NEGADO", "Ninguém pode convidar a si mesmo.");
        if (dados.papel === "RESPONSAVEL" || dados.papel === "PROFISSIONAL_SAUDE") {
          if (!dados.estudanteId) throw new ErroApi("VALIDACAO", "Escolha um estudante.");
          ctx.exigirPapel(dados.estudanteId, "COORDENACAO");
        }
        if (dados.papel === "RESPONSAVEL" && !dados.conferidoPresencialmente) {
          throw new ErroApi("VALIDACAO", "Confirme que o vínculo legal foi conferido presencialmente, com documento.");
        }
        if (dados.papel === "PROFISSIONAL_SAUDE" && !dados.registroConselho?.trim())
          throw new ErroApi("VALIDACAO", "Informe o registro no conselho profissional.");
        const externo = dados.papel === "RESPONSAVEL" || dados.papel === "PROFISSIONAL_SAUDE";
        const exigeAprovacao = dados.exigeAprovacao ?? (externo && ctx.estado.configuracoes.exigirAprovacaoExternos);
        let pessoa = ctx.estado.usuarios.find((x) => x.email === email);
        if (!pessoa) {
          pessoa = {
            id: uuid(),
            nome: dados.nome?.trim() || email.split("@")[0]!,
            email,
            papelInstitucional: dados.papel === "COORDENACAO" ? "COORDENACAO" : null,
          };
          ctx.estado.usuarios.push(pessoa);
          // D-50: só quem é novo recebe perfil, validade e aprovação (quem já tem conta não perde outros papéis)
          ctx.estado.acessos[pessoa.id] = {
            papel: dados.papel,
            perfilId: dados.perfilId ?? null,
            permissoesRemovidas: dados.permissoesRemovidas ?? [],
            organizacao: dados.organizacao?.trim() || null,
            acessoExpiraEm: dados.acessoExpiraEm ?? null,
            aguardandoAprovacao: exigeAprovacao,
            convitePendente: true,
          };
        }
        ctx.estado.eventosAdmin.push({
          id: uuid(),
          criadoEm: ctx.agora(),
          evento: "CONVITE_EMITIDO",
          autorId: u.id,
          papelAutor: admin ? "ADMIN_GERAL" : "COORDENACAO",
          entidade: "usuarios",
          entidadeId: pessoa.id,
          detalhes: { papel: dados.papel, exigeAprovacao },
        });
        if (externo && dados.estudanteId) {
          const ja = ctx.estado.vinculos.some(
            (v) => v.usuarioId === pessoa!.id && v.estudanteId === dados.estudanteId && (v.status === "ATIVO" || v.status === "PENDENTE_RESPONSAVEL"),
          );
          if (!ja) {
            const pendente = dados.papel === "PROFISSIONAL_SAUDE";
            const v: Vinculo = {
              id: uuid(),
              usuarioId: pessoa.id,
              estudanteId: dados.estudanteId,
              papel: dados.papel,
              dataVinculo: ctx.agora(),
              status: pendente ? "PENDENTE_RESPONSAVEL" : "ATIVO",
              registroConselho: pendente ? dados.registroConselho!.trim() : null,
            };
            ctx.estado.vinculos.push(v);
            ctx.registrarAuditoria("vinculos_usuario_estudante", v.id, pendente ? "VINCULO_PROPOSTO" : "VINCULO_CRIADO", { papel: v.papel });
            if (pendente) ctx.notificar(v.estudanteId, "PROFISSIONAL_AGUARDANDO_CONFIRMACAO", ["RESPONSAVEL"]);
          }
        }
        ctx.salvar();
        return { emailEnviado: true, exigeAprovacao, avisos: ["Demonstração: nenhum e-mail é enviado de verdade."] };
      }),

    // ---- notificações (D-28)
    listarNotificacoes: () =>
      ctx.chamada(() => {
        const u = ctx.eu();
        return ctx.estado.notificacoes.filter((n) => n.usuarioId === u.id).sort((a, b) => b.criadaEm.localeCompare(a.criadaEm));
      }),
    marcarNotificacoesLidas: (ids) =>
      ctx.chamada(() => {
        const u = ctx.eu();
        for (const n of ctx.estado.notificacoes) {
          if (n.usuarioId === u.id && !n.lidaEm && (!ids || ids.includes(n.id))) n.lidaEm = ctx.agora();
        }
        ctx.salvar();
      }),
  } satisfies Partial<PeiVivoApi>;
}
