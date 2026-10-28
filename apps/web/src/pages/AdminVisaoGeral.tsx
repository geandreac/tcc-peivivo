import { Link } from "react-router-dom";
import { api, type EventoAdmin, type ResumoAdmin, type UsuarioAdmin } from "../services";
import { useConsulta } from "../hooks/useConsulta";
import { CabecalhoAdmin } from "../components/CabecalhoAdmin";
import { ErroAdmin, EtiquetaSituacao } from "../components/Admin";
import { Esqueleto, VazioSecao } from "../components/Feedback";
import { LinkBotao } from "../components/Botao";
import { AUTOR_ADMIN, EVENTO_ADMIN } from "../utils/rotulos";
import { formatarDataHora } from "../utils/datas";

interface Dados {
  resumo: ResumoAdmin;
  atencao: UsuarioAdmin[];
  atividades: EventoAdmin[];
}

/** D-50 — Visão geral: indicadores, o que precisa de ação e as últimas atividades. Nada de estudante. */
export function AdminVisaoGeral() {
  const consulta = useConsulta<Dados>(async () => {
    const [resumo, aguardando, convites, atividades] = await Promise.all([
      api.adminResumo(),
      api.adminListarUsuarios({ situacao: "AGUARDANDO_APROVACAO" }, { limite: 5 }),
      api.adminListarUsuarios({ situacao: "CONVITE_PENDENTE" }, { limite: 5 }),
      api.adminListarAuditoria(undefined, { limite: 5 }),
    ]);
    return { resumo, atencao: [...aguardando.itens, ...convites.itens], atividades: atividades.itens };
  }, []);

  return (
    <>
      <CabecalhoAdmin
        titulo="Visão geral"
        descricao="Contas e acessos. Este painel nunca mostra observações, materiais, perfis de estudante ou notas clínicas."
        acao={<LinkBotao to="/admin/usuarios/novo">Criar acesso</LinkBotao>}
      />
      {consulta.carregando && <Esqueleto texto="Carregando a visão geral…" forma="cartao" />}
      {consulta.erro && <ErroAdmin erro={consulta.erro} tentarNovamente={consulta.recarregar} />}
      {consulta.dados && <Conteudo {...consulta.dados} />}
    </>
  );
}

function Conteudo({ resumo: r, atencao, atividades }: Dados) {
  const blocos = [
    { rotulo: "Usuários ativos", valor: r.usuariosAtivos, nota: r.escopo === "GERAL" ? "em todo o sistema" : "na sua escola" },
    { rotulo: "Acessos pendentes", valor: r.convitesPendentes + r.aguardandoAprovacao, nota: `${r.aguardandoAprovacao} aguardando aprovação` },
    { rotulo: "Ferramentas disponíveis", valor: r.ferramentasDisponiveis, nota: `de ${r.ferramentasTotal} no sistema` },
    { rotulo: "Atividades recentes", valor: r.atividadesRecentes, nota: "mudanças de acesso nos últimos 7 dias" },
  ];
  return (
    <>
      <ul className="blocos-numero" aria-label="Indicadores">
        {blocos.map((b) => (
          <li key={b.rotulo} className="bloco-numero">
            <span className="bloco-numero__rotulo">{b.rotulo}</span>
            <span className="bloco-numero__valor">{b.valor}</span>
            <span className="bloco-numero__nota">{b.nota}</span>
          </li>
        ))}
      </ul>
      {(r.suspensos > 0 || r.expirados > 0 || r.expiramEm7Dias > 0) && (
        <p className="texto-apoio">
          {r.suspensos} suspenso{r.suspensos === 1 ? "" : "s"} · {r.expirados} expirado{r.expirados === 1 ? "" : "s"} · {r.expiramEm7Dias} vence
          {r.expiramEm7Dias === 1 ? "" : "m"} nos próximos 7 dias. <Link to="/admin/usuarios">Ver usuários e acessos</Link>
        </p>
      )}

      <section aria-labelledby="titulo-atencao">
        <h2 id="titulo-atencao">Precisa de atenção</h2>
        {atencao.length === 0 ? (
          <VazioSecao>Nenhum convite pendente e nenhum acesso aguardando aprovação.</VazioSecao>
        ) : (
          <ul className="lista-simples" aria-label="Acessos que precisam de atenção">
            {atencao.map((u) => (
              <li key={u.id}>
                <div>
                  <strong>{u.nome}</strong> <EtiquetaSituacao situacao={u.situacao} />
                  <div className="meta">
                    {u.email}
                    {u.organizacao && ` · ${u.organizacao}`}
                  </div>
                </div>
                <Link to={`/admin/usuarios/${u.id}`} aria-label={`Ver o acesso de ${u.nome}`}>
                  Ver acesso
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="titulo-atividades">
        <h2 id="titulo-atividades">Últimas atividades</h2>
        {atividades.length === 0 ? (
          <VazioSecao>Nenhuma mudança de acesso registrada ainda.</VazioSecao>
        ) : (
          <ul className="lista-simples" aria-label="Últimas atividades">
            {atividades.map((e, i) => (
              <li key={`${e.criadoEm}-${i}`}>
                <div>
                  <strong>{EVENTO_ADMIN[e.evento] ?? e.evento}</strong>
                  {e.alvoNome && ` · ${e.alvoNome}`}
                  <div className="meta">
                    {formatarDataHora(e.criadoEm)} · por {e.autorNome ?? "sistema"}
                    {e.papelAutor && ` (${AUTOR_ADMIN[e.papelAutor] ?? e.papelAutor})`}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p>
          <Link to="/admin/auditoria">Ver toda a trilha de atividades</Link>
        </p>
      </section>
    </>
  );
}
