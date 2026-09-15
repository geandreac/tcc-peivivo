import { Link } from "react-router-dom";
import { api, type Auditoria, type Ciclo, type Desfecho, type Material, type ObservacaoRegistro, type VersaoPerfil } from "../services";
import { useEstudante } from "../hooks/useEstudante";
import { useConsulta } from "../hooks/useConsulta";
import { useTitulo } from "../hooks/useTitulo";
import { CabecalhoEstudante } from "../components/CabecalhoEstudante";
import { Alerta, Badge, Card, Carregando, ErroCarregamento, EstadoVazio } from "../components/Feedback";
import { LinkBotao } from "../components/Botao";
import { DESFECHO, DIMENSAO, ESCALA, EVENTO, PAPEL, STATUS_VALIDACAO } from "../utils/rotulos";
import { formatarData, formatarDataHora } from "../utils/datas";

interface Dados {
  ciclos: Ciclo[];
  observacoes: ObservacaoRegistro[];
  versoes: VersaoPerfil[];
  materiais: Material[];
  desfechos: Record<string, Desfecho | null>;
  auditoria: Auditoria[];
}

/** P4.16 / P4.18 — HU-R.04 / HU-C.04: histórico do PEI como linha do tempo, por papel. */
export function Historico() {
  const ctx = useEstudante();
  useTitulo("Histórico", !ctx.carregando);
  const id = ctx.dados?.estudante.id;
  const papel = ctx.dados?.papel;
  const podeLer = !!ctx.dados && (ctx.dados.consentimentoAtivo || papel === "RESPONSAVEL" || papel === "COORDENACAO");
  const veAuditoria = papel === "RESPONSAVEL" || papel === "COORDENACAO";

  const dados = useConsulta<Dados | null>(async () => {
    if (!id || !podeLer) return null;
    const [ciclos, observacoes, versoes, materiais, auditoria] = await Promise.all([
      api.listarCiclos(id),
      api.listarObservacoes(id),
      api.listarVersoes(id),
      api.listarMateriais(id),
      veAuditoria ? api.listarAuditoria(id) : Promise.resolve([]),
    ]);
    const desfechos: Record<string, Desfecho | null> = {};
    for (const m of materiais) desfechos[m.id] = await api.obterDesfecho(m.id);
    return { ciclos, observacoes, versoes, materiais, desfechos, auditoria };
  }, [id, podeLer, veAuditoria]);

  if (ctx.carregando) return <Carregando />;
  if (ctx.erro || !ctx.dados) return <ErroCarregamento erro={ctx.erro} tentarNovamente={ctx.recarregar} />;

  if (!podeLer) {
    return (
      <>
        <CabecalhoEstudante contexto={ctx.dados} titulo="Histórico" />
        <Alerta tom="erro" titulo="Sem consentimento ativo">O histórico só fica disponível a docente e profissional com consentimento ativo (D-11).</Alerta>
      </>
    );
  }

  return (
    <>
      <CabecalhoEstudante contexto={ctx.dados} titulo="Histórico do PEI" descricao="Tudo que aconteceu, em ordem: ciclos, observações de todos, versões do perfil, materiais aprovados e desfechos. Nunca a nota clínica." />
      {veAuditoria && (
        <div className="grupo-botoes nao-imprimir" style={{ marginTop: 0, marginBottom: "var(--esp-5)" }}>
          <LinkBotao to={`/estudantes/${id}/dados`} variante="secundario">
            Exportar para a reunião
          </LinkBotao>
        </div>
      )}

      {dados.carregando && <Carregando texto="Montando a linha do tempo…" />}
      {dados.erro && <ErroCarregamento erro={dados.erro} tentarNovamente={dados.recarregar} />}

      {dados.dados && dados.dados.ciclos.length === 0 && (
        <EstadoVazio titulo="Nenhum ciclo ainda">
          <p>O histórico começa quando a docente abre o primeiro ciclo de observação.</p>
        </EstadoVazio>
      )}

      {dados.dados &&
        [...dados.dados.ciclos].reverse().map((c) => {
          const obs = dados.dados!.observacoes.filter((o) => o.cicloId === c.id);
          const versao = dados.dados!.versoes.find((v) => v.cicloOrigemId === c.id);
          const materiais = dados.dados!.materiais.filter((m) => versao && m.versaoPerfilId === versao.id);
          return (
            <Card key={c.id} titulo={`Ciclo ${c.numero} · ${formatarData(c.dataInicio)}${c.dataFim ? ` a ${formatarData(c.dataFim)}` : " (aberto)"}`}>
              <h3>Observações ({obs.length})</h3>
              {obs.length === 0 ? (
                <p className="meta">Nenhuma observação neste ciclo.</p>
              ) : (
                <ul className="lista-simples">
                  {obs.map((o) => (
                    <li key={o.id}>
                      <div>
                        <strong>{DIMENSAO[o.dimensao].titulo}</strong>: {ESCALA[o.valorEscala]}
                        {o.evidencia && <div className="meta">“{o.evidencia}”</div>}
                      </div>
                      <Badge>{PAPEL[o.papelAutor]}</Badge>
                    </li>
                  ))}
                </ul>
              )}
              {versao && (
                <>
                  <h3>Versão do perfil</h3>
                  <div className="chips">
                    <Badge tom={STATUS_VALIDACAO[versao.statusValidacao].tom === "neutro" ? "neutro" : STATUS_VALIDACAO[versao.statusValidacao].tom}>{STATUS_VALIDACAO[versao.statusValidacao].texto}</Badge>
                    {versao.dataVigencia && <span className="meta">vigente desde {formatarDataHora(versao.dataVigencia)}</span>}
                  </div>
                </>
              )}
              {materiais.length > 0 && (
                <>
                  <h3>Materiais gerados com esta versão</h3>
                  <ul className="lista-simples">
                    {materiais.map((m) => {
                      const d = dados.dados!.desfechos[m.id];
                      return (
                        <li key={m.id}>
                          <div>
                            <Link to={`/materiais/${m.id}`}>{m.titulo}</Link>
                            {d?.observacaoLivre && <div className="meta">“{d.observacaoLivre}”</div>}
                          </div>
                          {d ? <Badge tom={DESFECHO[d.resultado].tom}>{DESFECHO[d.resultado].texto}</Badge> : <Badge>Sem desfecho</Badge>}
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </Card>
          );
        })}

      {veAuditoria && dados.dados && dados.dados.auditoria.length > 0 && (
        <>
          <h2>Trilha de auditoria</h2>
          <ol className="linha-tempo">
            {dados.dados.auditoria.map((a) => (
              <li key={a.id}>
                <time dateTime={a.data}>{formatarDataHora(a.data)}</time>
                <span>{EVENTO[a.evento]}</span>
              </li>
            ))}
          </ol>
        </>
      )}
    </>
  );
}
