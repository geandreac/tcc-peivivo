import { Link, useLocation } from "react-router-dom";
import { api, type EventoAdmin, type UsuarioAdmin } from "../services";
import { useConsulta } from "../hooks/useConsulta";
import { CabecalhoAdmin } from "../components/CabecalhoAdmin";
import { ErroAdmin, EtiquetaSituacao } from "../components/Admin";
import { Esqueleto, VazioSecao } from "../components/Feedback";
import { EVENTO_ADMIN } from "../utils/rotulos";
import { formatarDataHora } from "../utils/datas";

/** D-50 — busca geral do painel: pessoas (e convites) e atividades. O termo chega pelo estado da navegação. */
export function AdminBusca() {
  const termo = (useLocation().state as { busca?: string } | null)?.busca?.trim() ?? "";
  const consulta = useConsulta<{ pessoas: UsuarioAdmin[]; atividades: EventoAdmin[] }>(async () => {
    if (!termo) return { pessoas: [], atividades: [] };
    const [pessoas, atividades] = await Promise.all([
      api.adminListarUsuarios({ busca: termo }, { limite: 20 }),
      api.adminListarAuditoria(termo, { limite: 20 }),
    ]);
    return { pessoas: pessoas.itens, atividades: atividades.itens };
  }, [termo]);

  return (
    <>
      <CabecalhoAdmin titulo="Busca" descricao={termo ? <>Resultados para “{termo}”.</> : "Digite um nome, e-mail, organização ou ação na busca acima."} />
      {consulta.carregando && <Esqueleto texto="Buscando…" />}
      {consulta.erro && <ErroAdmin erro={consulta.erro} tentarNovamente={consulta.recarregar} />}
      {consulta.dados && termo && (
        <>
          <section aria-labelledby="titulo-pessoas">
            <h2 id="titulo-pessoas">Pessoas e convites ({consulta.dados.pessoas.length})</h2>
            {consulta.dados.pessoas.length === 0 ? (
              <VazioSecao>Nenhuma pessoa encontrada.</VazioSecao>
            ) : (
              <ul className="lista-simples" aria-label="Pessoas encontradas">
                {consulta.dados.pessoas.map((u) => (
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
          <section aria-labelledby="titulo-atividades-busca">
            <h2 id="titulo-atividades-busca">Atividades ({consulta.dados.atividades.length})</h2>
            {consulta.dados.atividades.length === 0 ? (
              <VazioSecao>Nenhuma atividade encontrada.</VazioSecao>
            ) : (
              <ul className="lista-simples" aria-label="Atividades encontradas">
                {consulta.dados.atividades.map((e, i) => (
                  <li key={`${e.criadoEm}-${i}`}>
                    <div>
                      <strong>{EVENTO_ADMIN[e.evento] ?? e.evento}</strong>
                      {e.alvoNome && ` · ${e.alvoNome}`}
                      <div className="meta">
                        {formatarDataHora(e.criadoEm)} · por {e.autorNome ?? "sistema"}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </>
  );
}
