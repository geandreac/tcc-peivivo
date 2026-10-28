import { useState } from "react";
import { Link } from "react-router-dom";
import { api, type ListaPaginada, type SituacaoAcesso, type UsuarioAdmin } from "../services";
import { useConsulta } from "../hooks/useConsulta";
import { useSessao } from "../hooks/useSessao";
import { useAnuncio } from "../hooks/useAnuncio";
import { CabecalhoAdmin } from "../components/CabecalhoAdmin";
import { ConfirmarAcao, ErroAdmin, EtiquetaSituacao, type AcaoCritica } from "../components/Admin";
import { Esqueleto, EstadoVazio } from "../components/Feedback";
import { Botao, LinkBotao } from "../components/Botao";
import { Campo } from "../components/Campo";
import { PAPEL_BASE, SITUACAO } from "../utils/rotulos";
import { formatarData, formatarDataHora } from "../utils/datas";

const POR_PAGINA = 20;

/** D-50 — Usuários e acessos: tabela fácil de consultar, com ações e alerta antes de toda ação crítica. */
export function AdminUsuarios() {
  const { usuario } = useSessao();
  const { anunciar } = useAnuncio();
  const [filtro, setFiltro] = useState("");
  const [situacao, setSituacao] = useState<SituacaoAcesso | "">("");
  const [aplicado, setAplicado] = useState<{ busca: string; situacao: SituacaoAcesso | "" }>({ busca: "", situacao: "" });
  const [limite, setLimite] = useState(POR_PAGINA);
  const [acao, setAcao] = useState<AcaoCritica | null>(null);

  const consulta = useConsulta<ListaPaginada<UsuarioAdmin>>(
    () => api.adminListarUsuarios({ busca: aplicado.busca || undefined, situacao: aplicado.situacao || undefined }, { limite }),
    [aplicado.busca, aplicado.situacao, limite],
  );

  // ninguém altera o próprio acesso nem o de um Administrador Geral (o banco também nega)
  const editavel = (u: UsuarioAdmin) => u.id !== usuario?.id && !u.papeis.includes("ADMIN_GERAL");

  function acoesDe(u: UsuarioAdmin): AcaoCritica[] {
    const lista: AcaoCritica[] = [];
    if (u.situacao === "AGUARDANDO_APROVACAO") {
      lista.push({
        titulo: `Aprovar o acesso de ${u.nome}?`,
        efeito: <p>A pessoa passa a entrar e a usar o que o perfil dela permite.</p>,
        confirmar: "Aprovar acesso",
        executar: () => api.adminAprovarAcesso(u.id),
      });
      lista.push({
        titulo: `Recusar o acesso de ${u.nome}?`,
        efeito: <p>O convite é cancelado e a pessoa não entra. O histórico continua guardado.</p>,
        confirmar: "Recusar acesso",
        perigo: true,
        pedeMotivo: true,
        executar: (m) => api.adminRecusarAcesso(u.id, m),
      });
    }
    if (u.situacao === "SUSPENSO") {
      lista.push({
        titulo: `Reativar o acesso de ${u.nome}?`,
        efeito: <p>A pessoa volta a entrar com o mesmo perfil e as mesmas permissões de antes.</p>,
        confirmar: "Reativar acesso",
        executar: () => api.adminReativar(u.id),
      });
    } else if (u.situacao !== "REMOVIDO") {
      lista.push({
        titulo: `Suspender o acesso de ${u.nome}?`,
        efeito: (
          <p>
            A pessoa deixa de entrar <strong>imediatamente</strong> e nada do que ela fazia funciona até a reativação. Os vínculos e o histórico continuam.
          </p>
        ),
        confirmar: "Suspender acesso",
        perigo: true,
        pedeMotivo: true,
        executar: (m) => api.adminSuspender(u.id, m),
      });
    }
    if (u.situacao !== "REMOVIDO") {
      lista.push({
        titulo: `Remover o acesso de ${u.nome}?`,
        efeito: (
          <p>
            {usuario?.papelPlataforma === "ADMIN_GERAL"
              ? "Encerra o acesso em todo o sistema: vínculos, convites e entrada. "
              : "Encerra o acesso desta pessoa na sua escola: vínculos e convites. "}
            <strong>Não dá para desfazer pelo painel.</strong> O histórico continua guardado.
          </p>
        ),
        confirmar: "Remover acesso",
        perigo: true,
        pedeMotivo: true,
        executar: (m) => api.adminRemoverAcesso(u.id, m),
      });
    }
    return lista;
  }

  const dados = consulta.dados;
  return (
    <>
      <CabecalhoAdmin
        titulo="Usuários e acessos"
        descricao="Quem entra no sistema, com qual perfil e até quando."
        acao={<LinkBotao to="/admin/usuarios/novo">Criar acesso</LinkBotao>}
      />

      <form
        className="filtros-admin"
        aria-label="Filtrar usuários"
        onSubmit={(e) => {
          e.preventDefault();
          setLimite(POR_PAGINA);
          setAplicado({ busca: filtro.trim(), situacao });
        }}
      >
        <Campo id="filtro-usuarios" type="search" rotulo="Nome, e-mail ou organização" value={filtro} onChange={(e) => setFiltro(e.target.value)} opcional />
        <Campo
          id="filtro-situacao"
          tipo="select"
          rotulo="Situação"
          value={situacao}
          onChange={(e) => setSituacao(e.target.value as SituacaoAcesso | "")}
          opcional
        >
          <option value="">Todas</option>
          {(Object.keys(SITUACAO) as SituacaoAcesso[]).map((s) => (
            <option key={s} value={s}>
              {SITUACAO[s].texto}
            </option>
          ))}
        </Campo>
        <Botao type="submit" variante="secundario">
          Filtrar
        </Botao>
      </form>

      {consulta.carregando && !dados && <Esqueleto texto="Carregando usuários…" />}
      {consulta.erro && <ErroAdmin erro={consulta.erro} tentarNovamente={consulta.recarregar} />}
      {dados && dados.itens.length === 0 && (
        <EstadoVazio titulo="Nenhum usuário encontrado" acao={<LinkBotao to="/admin/usuarios/novo">Criar acesso</LinkBotao>}>
          <p>Ajuste o filtro ou crie um acesso novo.</p>
        </EstadoVazio>
      )}
      {dados && dados.itens.length > 0 && (
        <>
          <div className="tabela-rolagem" role="region" aria-label="Usuários" tabIndex={0}>
            <table className="tabela-cartoes">
              <caption>
                {dados.total === 1 ? "1 usuário" : `${dados.total} usuários`}
                {dados.itens.length < dados.total && ` (mostrando ${dados.itens.length})`}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Nome</th>
                  <th scope="col">E-mail</th>
                  <th scope="col">Organização</th>
                  <th scope="col">Perfil de acesso</th>
                  <th scope="col">Situação</th>
                  <th scope="col">Último login</th>
                  <th scope="col">Ações</th>
                </tr>
              </thead>
              <tbody>
                {dados.itens.map((u) => (
                  <tr key={u.id}>
                    <th scope="row" data-rotulo="Nome">
                      {u.nome}
                      {u.id === usuario?.id && <span className="meta"> (você)</span>}
                    </th>
                    <td data-rotulo="E-mail">{u.email}</td>
                    <td data-rotulo="Organização">{u.organizacao ?? "—"}</td>
                    <td data-rotulo="Perfil de acesso">
                      {u.perfilNome ?? (u.papeis.map((p) => PAPEL_BASE[p]).join(", ") || "Sem papel ativo")}
                      {u.acessoExpiraEm && <div className="meta">até {formatarData(u.acessoExpiraEm)}</div>}
                    </td>
                    <td data-rotulo="Situação">
                      <EtiquetaSituacao situacao={u.situacao} />
                    </td>
                    <td data-rotulo="Último login">{u.ultimoLogin ? formatarDataHora(u.ultimoLogin) : "Nunca entrou"}</td>
                    <td data-rotulo="Ações">
                      <div className="acoes-linha">
                        <Link to={`/admin/usuarios/${u.id}`} aria-label={`Visualizar ${u.nome}`}>
                          Visualizar
                        </Link>
                        {editavel(u) && (
                          <>
                            <Link to={`/admin/usuarios/${u.id}`} state={{ editar: true }} aria-label={`Editar o acesso de ${u.nome}`}>
                              Editar
                            </Link>
                            {acoesDe(u).map((a) => (
                              <Botao
                                key={a.confirmar}
                                // na tabela, discreto; o vermelho fica na confirmação, que diz o efeito
                                variante={a.perigo ? "discreto" : "secundario"}
                                pequeno
                                onClick={() => setAcao(a)}
                                aria-label={a.titulo.replace("?", "")}
                              >
                                {a.confirmar.replace(" acesso", "")}
                              </Botao>
                            ))}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {dados.itens.length < dados.total && (
            <div className="grupo-botoes">
              <Botao variante="secundario" onClick={() => setLimite((l) => l + POR_PAGINA)} carregando={consulta.carregando} textoCarregando="Carregando…">
                Carregar mais
              </Botao>
            </div>
          )}
        </>
      )}

      <ConfirmarAcao
        acao={acao}
        onFechar={() => setAcao(null)}
        onConcluir={() => {
          anunciar(`${acao?.confirmar ?? "Alteração"}: feito.`, "sucesso");
          setAcao(null);
          consulta.recarregar();
        }}
      />
    </>
  );
}
