import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { TETO } from "@pei-vivo/contratos";
import { api, mensagemAmigavel, type DetalheUsuarioAdmin, type PerfilAcesso } from "../services";
import { useConsulta, useMutacao } from "../hooks/useConsulta";
import { useAnuncio } from "../hooks/useAnuncio";
import { CabecalhoAdmin } from "../components/CabecalhoAdmin";
import { ConfirmarAcao, ErroAdmin, EtiquetaSituacao, type AcaoCritica } from "../components/Admin";
import { Alerta, Card, Esqueleto, VazioSecao } from "../components/Feedback";
import { Botao } from "../components/Botao";
import { Campo } from "../components/Campo";
import { AUTOR_ADMIN, EVENTO_ADMIN, PAPEL_BASE, SITUACAO, rotuloPermissao } from "../utils/rotulos";
import { formatarData, formatarDataHora } from "../utils/datas";

interface Dados {
  pessoa: DetalheUsuarioAdmin;
  perfis: PerfilAcesso[];
}

/** D-50 — visualizar e editar o acesso de uma pessoa. Quem decide o que pode é o banco. */
export function AdminUsuario() {
  const { id = "" } = useParams<{ id: string }>();
  const consulta = useConsulta<Dados>(async () => {
    const [pessoa, perfis] = await Promise.all([api.adminObterUsuario(id), api.adminListarPerfis()]);
    return { pessoa, perfis };
  }, [id]);

  return (
    <>
      <Link to="/admin/usuarios" className="voltar">
        <span aria-hidden="true">←</span> Usuários e acessos
      </Link>
      <CabecalhoAdmin titulo={consulta.dados?.pessoa.nome ?? "Acesso"} />
      {consulta.carregando && !consulta.dados && <Esqueleto texto="Carregando o acesso…" forma="cartao" />}
      {consulta.erro && <ErroAdmin erro={consulta.erro} tentarNovamente={consulta.recarregar} />}
      {consulta.dados && <Detalhe {...consulta.dados} recarregar={consulta.recarregar} />}
    </>
  );
}

function Detalhe({ pessoa: p, perfis, recarregar }: Dados & { recarregar: () => void }) {
  const { anunciar } = useAnuncio();
  const editar = Boolean((useLocation().state as { editar?: boolean } | null)?.editar);
  const refEdicao = useRef<HTMLHeadingElement>(null);
  const [acao, setAcao] = useState<AcaoCritica | null>(null);
  useEffect(() => {
    if (editar) refEdicao.current?.focus();
  }, [editar]);

  return (
    <>
      <div className="grade-cards">
        <Card titulo="Dados do acesso">
          <dl className="dados">
            <dt>E-mail</dt>
            <dd>{p.email}</dd>
            <dt>Situação</dt>
            <dd>
              <EtiquetaSituacao situacao={p.situacao} /> <span className="meta">{SITUACAO[p.situacao].explica}</span>
            </dd>
            <dt>Papéis</dt>
            <dd>{p.papeis.map((x) => PAPEL_BASE[x]).join(", ") || "Nenhum papel ativo"}</dd>
            <dt>Organização</dt>
            <dd>{p.organizacao ?? (p.escolas.map((e) => e.nome).join(", ") || "—")}</dd>
            <dt>Validade</dt>
            <dd>{p.acessoExpiraEm ? formatarData(p.acessoExpiraEm) : "Sem prazo"}</dd>
            <dt>Último login</dt>
            <dd>{p.ultimoLogin ? formatarDataHora(p.ultimoLogin) : "Nunca entrou"}</dd>
            {p.suspensoEm && (
              <>
                <dt>Suspenso em</dt>
                <dd>
                  {formatarDataHora(p.suspensoEm)}
                  {p.motivoSuspensao && ` · ${p.motivoSuspensao}`}
                </dd>
              </>
            )}
          </dl>
        </Card>
        {p.editavel ? (
          <AcoesDaPessoa pessoa={p} onAcao={setAcao} />
        ) : (
          <Card titulo="Ações">
            <p>Ninguém altera o próprio acesso, e Administradores Gerais são geridos só pelo script de implantação.</p>
          </Card>
        )}
      </div>

      {p.editavel && p.situacao !== "REMOVIDO" && (
        <section aria-labelledby="titulo-edicao">
          <h2 id="titulo-edicao" ref={refEdicao} tabIndex={-1}>
            Editar acesso
          </h2>
          <div className="grade-cards">
            <EditarPerfil pessoa={p} perfis={perfis} onSalvo={recarregar} />
            <EditarValidade pessoa={p} onSalvo={recarregar} />
          </div>
        </section>
      )}

      <section aria-labelledby="titulo-historico">
        <h2 id="titulo-historico">Histórico de alterações</h2>
        {p.historico.length === 0 ? (
          <VazioSecao>Nenhuma alteração de acesso registrada para esta pessoa.</VazioSecao>
        ) : (
          <div className="tabela-rolagem" role="region" aria-label="Histórico de alterações" tabIndex={0}>
            <table className="tabela-cartoes">
              <caption>Últimas {p.historico.length} alterações</caption>
              <thead>
                <tr>
                  <th scope="col">Data</th>
                  <th scope="col">Ação</th>
                  <th scope="col">Responsável</th>
                </tr>
              </thead>
              <tbody>
                {p.historico.map((h, i) => (
                  <tr key={`${h.criadoEm}-${i}`}>
                    <td data-rotulo="Data">{formatarDataHora(h.criadoEm)}</td>
                    <td data-rotulo="Ação">{EVENTO_ADMIN[h.evento] ?? h.evento}</td>
                    <td data-rotulo="Responsável">
                      {h.autorNome ?? "Sistema"}
                      {h.papelAutor && <span className="meta"> ({AUTOR_ADMIN[h.papelAutor] ?? h.papelAutor})</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ConfirmarAcao
        acao={acao}
        onFechar={() => setAcao(null)}
        onConcluir={() => {
          anunciar(`${acao?.confirmar ?? "Alteração"}: feito.`, "sucesso");
          setAcao(null);
          recarregar();
        }}
      />
    </>
  );
}

function AcoesDaPessoa({ pessoa: p, onAcao }: { pessoa: DetalheUsuarioAdmin; onAcao: (a: AcaoCritica) => void }) {
  return (
    <Card titulo="Ações">
      <div className="grupo-botoes grupo-botoes--empilhado">
        {p.situacao === "AGUARDANDO_APROVACAO" && (
          <>
            <Botao
              onClick={() =>
                onAcao({
                  titulo: `Aprovar o acesso de ${p.nome}?`,
                  efeito: <p>A pessoa passa a entrar e a usar o que o perfil dela permite.</p>,
                  confirmar: "Aprovar acesso",
                  executar: () => api.adminAprovarAcesso(p.id),
                })
              }
            >
              Aprovar acesso
            </Botao>
            <Botao
              variante="perigo"
              onClick={() =>
                onAcao({
                  titulo: `Recusar o acesso de ${p.nome}?`,
                  efeito: <p>O convite é cancelado e a pessoa não entra.</p>,
                  confirmar: "Recusar acesso",
                  perigo: true,
                  pedeMotivo: true,
                  executar: (m) => api.adminRecusarAcesso(p.id, m),
                })
              }
            >
              Recusar acesso
            </Botao>
          </>
        )}
        {p.situacao === "SUSPENSO" ? (
          <Botao
            onClick={() =>
              onAcao({
                titulo: `Reativar o acesso de ${p.nome}?`,
                efeito: <p>A pessoa volta a entrar com o mesmo perfil e as mesmas permissões.</p>,
                confirmar: "Reativar acesso",
                executar: () => api.adminReativar(p.id),
              })
            }
          >
            Reativar acesso
          </Botao>
        ) : (
          p.situacao !== "REMOVIDO" && (
            <Botao
              variante="secundario"
              onClick={() =>
                onAcao({
                  titulo: `Suspender o acesso de ${p.nome}?`,
                  efeito: (
                    <p>
                      A pessoa deixa de entrar <strong>imediatamente</strong>. Vínculos e histórico continuam.
                    </p>
                  ),
                  confirmar: "Suspender acesso",
                  perigo: true,
                  pedeMotivo: true,
                  executar: (m) => api.adminSuspender(p.id, m),
                })
              }
            >
              Suspender acesso
            </Botao>
          )
        )}
        {p.situacao !== "REMOVIDO" && (
          <Botao
            variante="perigo"
            onClick={() =>
              onAcao({
                titulo: `Remover o acesso de ${p.nome}?`,
                efeito: (
                  <p>
                    Encerra vínculos e convites. <strong>Não dá para desfazer pelo painel.</strong> O histórico continua guardado.
                  </p>
                ),
                confirmar: "Remover acesso",
                perigo: true,
                pedeMotivo: true,
                executar: (m) => api.adminRemoverAcesso(p.id, m),
              })
            }
          >
            Remover acesso
          </Botao>
        )}
      </div>
    </Card>
  );
}

function EditarPerfil({ pessoa: p, perfis, onSalvo }: { pessoa: DetalheUsuarioAdmin; perfis: PerfilAcesso[]; onSalvo: () => void }) {
  const { anunciar } = useAnuncio();
  const possiveis = perfis.filter((x) => !x.arquivadoEm && p.papeis.includes(x.papelBase));
  const [perfilId, setPerfilId] = useState(p.perfilId ?? "");
  const [removidas, setRemovidas] = useState<string[]>(p.permissoesRemovidas);
  const perfil = possiveis.find((x) => x.id === perfilId);
  // sem perfil derivado vale o teto dos papéis da pessoa
  const disponiveis = perfil ? perfil.permissoes : [...new Set(p.papeis.flatMap((x) => TETO[x]))];
  const salvar = useMutacao(async () => {
    await api.adminDefinirPerfil(
      p.id,
      perfilId || null,
      removidas.filter((r) => disponiveis.includes(r)),
    );
    anunciar("Perfil de acesso atualizado.", "sucesso");
    onSalvo();
  });

  return (
    <Card titulo="Perfil e permissões" nivel={3}>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          salvar.executar();
        }}
      >
        <Campo id="perfil-pessoa" tipo="select" rotulo="Perfil de acesso" value={perfilId} onChange={(e) => setPerfilId(e.target.value)}>
          <option value="">Padrão do papel (tudo o que o papel permite)</option>
          {possiveis
            .filter((x) => !x.sistema)
            .map((x) => (
              <option key={x.id} value={x.id}>
                {x.nome}
              </option>
            ))}
        </Campo>
        <fieldset>
          <legend>Permissões desta pessoa</legend>
          {disponiveis.length === 0 ? (
            <p className="texto-apoio">Este papel não usa ferramentas de estudante.</p>
          ) : (
            disponiveis.map((chave) => (
              <label key={chave} className="opcao" htmlFor={`perm-${chave}`}>
                <input
                  id={`perm-${chave}`}
                  type="checkbox"
                  checked={!removidas.includes(chave)}
                  onChange={(e) => setRemovidas((r) => (e.target.checked ? r.filter((x) => x !== chave) : [...r, chave]))}
                />
                <span className="opcao__texto">{rotuloPermissao(chave)}</span>
              </label>
            ))
          )}
        </fieldset>
        {salvar.erro && (
          <Alerta tom="erro" vivo>
            {mensagemAmigavel(salvar.erro)}
          </Alerta>
        )}
        <Botao type="submit" carregando={salvar.ocupado} textoCarregando="Salvando…">
          Salvar perfil
        </Botao>
      </form>
    </Card>
  );
}

function EditarValidade({ pessoa: p, onSalvo }: { pessoa: DetalheUsuarioAdmin; onSalvo: () => void }) {
  const { anunciar } = useAnuncio();
  const [data, setData] = useState(p.acessoExpiraEm?.slice(0, 10) ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const salvar = useMutacao(async () => {
    if (data && new Date(`${data}T23:59:59`) <= new Date()) {
      setErro("Escolha uma data futura, ou deixe em branco para não ter prazo.");
      return;
    }
    setErro(null);
    await api.adminDefinirValidade(p.id, data ? new Date(`${data}T23:59:59`).toISOString() : null);
    anunciar(data ? `Acesso válido até ${formatarData(data)}.` : "Acesso sem prazo.", "sucesso");
    onSalvo();
  });
  return (
    <Card titulo="Validade do acesso" nivel={3}>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          salvar.executar();
        }}
      >
        <Campo
          id="validade-pessoa"
          type="date"
          rotulo="Acesso válido até"
          dica="Depois desta data a pessoa deixa de entrar. Em branco: sem prazo."
          value={data}
          onChange={(e) => setData(e.target.value)}
          erro={erro}
          opcional
        />
        {salvar.erro && (
          <Alerta tom="erro" vivo>
            {mensagemAmigavel(salvar.erro)}
          </Alerta>
        )}
        <Botao type="submit" carregando={salvar.ocupado} textoCarregando="Salvando…">
          Salvar validade
        </Botao>
      </form>
    </Card>
  );
}
