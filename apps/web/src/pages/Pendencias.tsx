import { Link } from "react-router-dom";
import { api, type Pendencia } from "../services";
import { useConsulta } from "../hooks/useConsulta";
import { useSessao } from "../hooks/useSessao";
import { useTitulo } from "../hooks/useTitulo";
import { Badge, Carregando, ErroCarregamento, EstadoVazio } from "../components/Feedback";
import { LinkBotao } from "../components/Botao";
import { STATUS_VALIDACAO } from "../utils/rotulos";
import { formatarDataHora } from "../utils/datas";

/** P4.18 — D-07: view `pendencias_validacao` (pull, não push). Para profissional e coordenação. */
export function Pendencias() {
  useTitulo("Pendências de validação");
  const { usuario } = useSessao();
  const pendencias = useConsulta<Pendencia[]>(() => api.listarPendencias(), [usuario?.id]);

  return (
    <>
      <div className="cabecalho-pagina">
        <div>
          <h1>Pendências de validação</h1>
          <p>Versões de perfil aguardando o profissional de saúde. Sem resposta em 7 dias, a versão anterior permanece vigente (RN05).</p>
        </div>
      </div>

      {pendencias.carregando && <Carregando />}
      {pendencias.erro && <ErroCarregamento erro={pendencias.erro} tentarNovamente={pendencias.recarregar} />}
      {pendencias.dados && pendencias.dados.length === 0 && (
        <EstadoVazio titulo="Nenhuma pendência">
          <p>Todas as versões de perfil dos seus estudantes estão vigentes — ou você não é profissional de saúde nem coordenação.</p>
        </EstadoVazio>
      )}
      {pendencias.dados && pendencias.dados.length > 0 && (
        <div className="tabela-rolagem">
          <table>
            <caption>{pendencias.dados.length === 1 ? "1 versão pendente" : `${pendencias.dados.length} versões pendentes`}</caption>
            <thead>
              <tr>
                <th scope="col">Estudante</th>
                <th scope="col">Ciclo</th>
                <th scope="col">Situação</th>
                <th scope="col">Dias em aberto</th>
                <th scope="col">Ação</th>
              </tr>
            </thead>
            <tbody>
              {pendencias.dados.map((p) => (
                <tr key={p.versao.id}>
                  <th scope="row">
                    <Link to={`/estudantes/${p.estudante.id}`}>{p.estudante.nome}</Link>
                  </th>
                  <td>
                    {p.versao.numeroCiclo} <span className="meta">({formatarDataHora(p.versao.createdAt)})</span>
                  </td>
                  <td>
                    <Badge tom={STATUS_VALIDACAO[p.versao.statusValidacao].tom === "neutro" ? "neutro" : STATUS_VALIDACAO[p.versao.statusValidacao].tom}>{STATUS_VALIDACAO[p.versao.statusValidacao].texto}</Badge>
                  </td>
                  <td>{p.diasEmAberto} {p.diasEmAberto === 1 ? "dia" : "dias"}{p.diasEmAberto >= 7 && " — prazo vencido"}</td>
                  <td>
                    <LinkBotao to={`/estudantes/${p.estudante.id}/validar`} variante="secundario" pequeno>
                      Abrir validação
                    </LinkBotao>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
