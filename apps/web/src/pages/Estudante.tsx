import { Link } from "react-router-dom";
import { api, ehErroApi, type Ciclo, type Material, type VersaoPerfil } from "../services";
import { useEstudante } from "../hooks/useEstudante";
import { useConsulta } from "../hooks/useConsulta";
import { useTitulo } from "../hooks/useTitulo";
import { Alerta, Badge, Card, Carregando, ErroCarregamento, EstadoVazio } from "../components/Feedback";
import { LinkBotao } from "../components/Botao";
import { PARAMETRO, STATUS_APROVACAO, STATUS_VALIDACAO } from "../utils/rotulos";
import { formatarData, formatarDataHora, idade } from "../utils/datas";
import type { ParametrosAdaptacao } from "@pei-vivo/motor-adaptacao";

interface Dados {
  vigente: VersaoPerfil | null;
  versoes: VersaoPerfil[];
  cicloAberto: Ciclo | null;
  materiais: Material[];
}

export function ParametrosLista({ parametros }: { parametros: ParametrosAdaptacao }) {
  const campos = Object.keys(PARAMETRO) as (keyof ParametrosAdaptacao)[];
  return (
    <dl className="dados">
      {campos.map((c) => (
        <div key={c} style={{ display: "contents" }}>
          <dt>{PARAMETRO[c].titulo}</dt>
          <dd>
            {PARAMETRO[c].valor(parametros[c])} <span className="meta">— {PARAMETRO[c].explica}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Tela de detalhes do estudante: visão geral + ações por papel (telas 4/5 da orientação). */
export function Estudante() {
  const ctx = useEstudante();
  const nome = ctx.dados?.estudante.nome ?? "Estudante";
  useTitulo(nome, !ctx.carregando);
  const id = ctx.dados?.estudante.id;
  const podeLerDados = !!ctx.dados && (ctx.dados.consentimentoAtivo || ctx.dados.papel === "RESPONSAVEL" || ctx.dados.papel === "COORDENACAO");

  const dados = useConsulta<Dados | null>(async () => {
    if (!id || !podeLerDados) return null;
    const [vigente, versoes, cicloAberto, materiais] = await Promise.all([
      api.obterVersaoVigente(id),
      api.listarVersoes(id),
      api.obterCicloAberto(id),
      api.listarMateriais(id),
    ]);
    return { vigente, versoes, cicloAberto, materiais };
  }, [id, podeLerDados]);

  if (ctx.carregando) return <Carregando texto="Carregando estudante…" />;
  if (ctx.erro || !ctx.dados) {
    const negado = ehErroApi(ctx.erro) && ctx.erro.codigo === "NEGADO";
    return (
      <>
        <h1>{negado ? "Acesso não permitido" : "Estudante não encontrado"}</h1>
        <ErroCarregamento erro={ctx.erro} tentarNovamente={negado ? undefined : ctx.recarregar} />
        <LinkBotao to="/painel" variante="secundario">
          Voltar para meus estudantes
        </LinkBotao>
      </>
    );
  }

  const { estudante, papel, consentimento, consentimentoAtivo } = ctx.dados;
  const pendente = dados.dados?.versoes.find((v) => v.statusValidacao === "PENDENTE" || v.statusValidacao === "EM_REVISAO");

  return (
    <>
      <div className="cabecalho-pagina">
        <div>
          <Link to="/painel" className="voltar">
            <span aria-hidden="true">←</span> Meus estudantes
          </Link>
          <h1>{estudante.nome}</h1>
          <div className="chips">
            <Badge tom="info">
              {idade(estudante.dataNascimento)} anos{estudante.turma ? ` · ${estudante.turma}` : ""}
            </Badge>
            <Badge tom={consentimentoAtivo ? "sucesso" : "erro"}>{consentimentoAtivo ? "Consentimento ativo" : "Sem consentimento ativo"}</Badge>
            {estudante.laudoApresentadoEm && papel !== "DOCENTE" && <Badge>Laudo apresentado em {formatarData(estudante.laudoApresentadoEm)}</Badge>}
          </div>
        </div>
      </div>

      {!consentimentoAtivo && (
        <Alerta tom={papel === "RESPONSAVEL" ? "aviso" : "erro"} titulo={papel === "RESPONSAVEL" ? "Falta o seu consentimento" : "Aguardando consentimento do responsável"}>
          <p>
            {papel === "RESPONSAVEL"
              ? "Nenhum perfil é criado e nenhum material é gerado sem a sua autorização. Leia o termo e decida."
              : consentimento?.status === "REVOGADO"
                ? `O responsável revogou o consentimento em ${formatarData(consentimento.dataRevogacao)}. Nada pode ser lido ou escrito até uma nova autorização (RN08).`
                : "Nada pode ser lido ou escrito sobre este estudante até o responsável autorizar (RN01)."}
          </p>
          {papel === "RESPONSAVEL" && (
            <div className="grupo-botoes">
              <LinkBotao to={`/estudantes/${estudante.id}/consentimento`}>Ler e decidir sobre o consentimento</LinkBotao>
            </div>
          )}
        </Alerta>
      )}

      {/* ações por papel */}
      <h2>O que você pode fazer</h2>
      <div className="grade-cards grade-cards--3">
        {papel === "RESPONSAVEL" && (
          <>
            <Card titulo="Consentimento" nivel={3} className="card--acao">
              <p>Veja o termo, o que está autorizado e a trilha de auditoria. Você pode revogar quando quiser.</p>
              <LinkBotao to={`/estudantes/${estudante.id}/consentimento`} variante="secundario" pequeno>
                Abrir consentimento
              </LinkBotao>
            </Card>
            {consentimentoAtivo && (
              <Card titulo="Observação de casa" nivel={3} className="card--acao">
                <p>Registre o que você percebe em casa: o que ajuda, o que atrapalha, o que interessa.</p>
                <LinkBotao to={`/estudantes/${estudante.id}/observar`} variante="secundario" pequeno>
                  Registrar observação
                </LinkBotao>
              </Card>
            )}
            <Card titulo="Meus dados" nivel={3} className="card--acao">
              <p>Exporte tudo que existe sobre o estudante ou exclua definitivamente (LGPD).</p>
              <LinkBotao to={`/estudantes/${estudante.id}/dados`} variante="secundario" pequeno>
                Exportar ou excluir
              </LinkBotao>
            </Card>
          </>
        )}
        {papel === "DOCENTE" && consentimentoAtivo && (
          <>
            <Card titulo="Gerar material adaptado" nivel={3} className="card--acao">
              <p>Cole um texto e receba a versão adaptada ao perfil vigente. Você revisa antes de aprovar.</p>
              <LinkBotao to={`/estudantes/${estudante.id}/gerar`} pequeno>
                Gerar material
              </LinkBotao>
            </Card>
            <Card titulo="Observação quinzenal" nivel={3} className="card--acao">
              <p>{dados.dados?.cicloAberto ? `Ciclo ${dados.dados.cicloAberto.numero} aberto desde ${formatarData(dados.dados.cicloAberto.dataInicio)}.` : "Abra o próximo ciclo e registre as seis dimensões."}</p>
              <LinkBotao to={`/estudantes/${estudante.id}/observar`} variante="secundario" pequeno>
                Registrar observação
              </LinkBotao>
            </Card>
            <Card titulo="Fechar o ciclo" nivel={3} className="card--acao">
              <p>Veja os parâmetros propostos a partir das observações e o que mudou em relação aos vigentes.</p>
              <LinkBotao to={`/estudantes/${estudante.id}/fechar-ciclo`} variante="secundario" pequeno>
                Fechar ciclo
              </LinkBotao>
            </Card>
          </>
        )}
        {papel === "PROFISSIONAL_SAUDE" && consentimentoAtivo && (
          <>
            <Card titulo="Validar parâmetros" nivel={3} className="card--acao">
              <p>{pendente ? `Há uma versão do ciclo ${pendente.numeroCiclo} aguardando você.` : "Nenhuma versão pendente no momento."}</p>
              <LinkBotao to={`/estudantes/${estudante.id}/validar`} pequeno>
                Abrir validação
              </LinkBotao>
            </Card>
            <Card titulo="Estratégia clínica validada" nivel={3} className="card--acao">
              <p>Registre como observação o que a escola precisa saber — todos os vinculados leem.</p>
              <LinkBotao to={`/estudantes/${estudante.id}/observar`} variante="secundario" pequeno>
                Registrar observação
              </LinkBotao>
            </Card>
            <Card titulo="Nota clínica reservada" nivel={3} className="card--acao">
              <p>Só profissionais de saúde vinculados leem. Nem docente, nem família, nem coordenação.</p>
              <LinkBotao to={`/estudantes/${estudante.id}/notas-clinicas`} variante="secundario" pequeno>
                Abrir notas
              </LinkBotao>
            </Card>
          </>
        )}
        {papel === "COORDENACAO" && (
          <>
            <Card titulo="Histórico do PEI" nivel={3} className="card--acao">
              <p>Linha do tempo com consentimentos, ciclos, versões, materiais aprovados e auditoria. Exportável para a reunião.</p>
              <LinkBotao to={`/estudantes/${estudante.id}/historico`} pequeno>
                Abrir histórico
              </LinkBotao>
            </Card>
            <Card titulo="Vínculos" nivel={3} className="card--acao">
              <p>Vincule docente, responsável e profissional de saúde; desative vínculos ao trocar de professor.</p>
              <LinkBotao to={`/estudantes/${estudante.id}/vinculos`} variante="secundario" pequeno>
                Gerenciar vínculos
              </LinkBotao>
            </Card>
            <Card titulo="Exportar histórico" nivel={3} className="card--acao">
              <p>Arquivo legível com tudo, exceto notas clínicas. A exclusão é exclusiva do responsável.</p>
              <LinkBotao to={`/estudantes/${estudante.id}/dados`} variante="secundario" pequeno>
                Exportar
              </LinkBotao>
            </Card>
          </>
        )}
        {papel && papel !== "COORDENACAO" && podeLerDados && (
          <Card titulo="Histórico" nivel={3} className="card--acao">
            <p>Observações de todos, versões de perfil e materiais aprovados com desfecho.</p>
            <LinkBotao to={`/estudantes/${estudante.id}/historico`} variante="secundario" pequeno>
              Ver histórico
            </LinkBotao>
          </Card>
        )}
      </div>

      {podeLerDados && (
        <>
          <h2>Perfil de aprendizagem vigente</h2>
          {dados.carregando && <Carregando />}
          {dados.erro && <ErroCarregamento erro={dados.erro} tentarNovamente={dados.recarregar} />}
          {dados.dados && !dados.dados.vigente && (
            <EstadoVazio titulo="Ainda não há perfil vigente">
              <p>O perfil nasce quando a docente fecha o primeiro ciclo de observação. Até lá, não é possível gerar material.</p>
            </EstadoVazio>
          )}
          {dados.dados?.vigente && (
            <Card>
              <div className="chips" style={{ marginBottom: "var(--esp-3)" }}>
                <Badge tom="sucesso">{STATUS_VALIDACAO.VIGENTE.texto}</Badge>
                <span className="meta">
                  Ciclo {dados.dados.vigente.numeroCiclo} · desde {formatarData(dados.dados.vigente.dataVigencia)}
                </span>
                {pendente && <Badge tom={STATUS_VALIDACAO[pendente.statusValidacao].tom === "neutro" ? "neutro" : STATUS_VALIDACAO[pendente.statusValidacao].tom}>Ciclo {pendente.numeroCiclo}: {STATUS_VALIDACAO[pendente.statusValidacao].texto}</Badge>}
              </div>
              <ParametrosLista parametros={dados.dados.vigente.parametros} />
              <p className="meta" style={{ marginTop: "var(--esp-3)" }}>
                Parâmetros não são diagnóstico: descrevem o que funciona com o estudante. Elevar um parâmetro exige 2 ciclos de melhora; reduzir é imediato (RN03).
              </p>
            </Card>
          )}

          <h2>Materiais</h2>
          {dados.dados && dados.dados.materiais.length === 0 && (
            <EstadoVazio titulo={papel === "DOCENTE" ? "Nenhum material ainda" : "Nenhum material aprovado ainda"}>
              <p>{papel === "DOCENTE" ? "Gere o primeiro a partir de um texto da sua aula." : "Materiais aparecem aqui depois que a docente os aprova."}</p>
            </EstadoVazio>
          )}
          {dados.dados && dados.dados.materiais.length > 0 && (
            <ul className="lista-simples" aria-label="Materiais">
              {dados.dados.materiais.map((m) => (
                <li key={m.id}>
                  <div>
                    <Link to={m.statusAprovacao === "RASCUNHO" ? `/materiais/${m.id}/revisar` : `/materiais/${m.id}`}>{m.titulo}</Link>
                    <div className="meta">Gerado em {formatarDataHora(m.dataGeracao)} · camada de IA {m.iaAplicada ? "aplicada" : "desligada"}</div>
                  </div>
                  <Badge tom={STATUS_APROVACAO[m.statusAprovacao].tom}>{STATUS_APROVACAO[m.statusAprovacao].texto}</Badge>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}
