import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, mensagemAmigavel, type Ciclo, type ObservacaoRegistro, type ResultadoFechamento } from "../services";
import { useEstudante } from "../hooks/useEstudante";
import { useConsulta, useMutacao } from "../hooks/useConsulta";
import { useAnuncio } from "../hooks/useAnuncio";
import { useTitulo } from "../hooks/useTitulo";
import { CabecalhoEstudante } from "../components/CabecalhoEstudante";
import { Alerta, Badge, Card, Carregando, ErroCarregamento, EstadoVazio } from "../components/Feedback";
import { Botao, LinkBotao } from "../components/Botao";
import { Modal } from "../components/Modal";
import { DIMENSAO, ESCALA, PAPEL, PARAMETRO } from "../utils/rotulos";
import type { DiffParametro } from "../services";

export function TabelaDiff({ diff, legenda }: { diff: DiffParametro[]; legenda: string }) {
  return (
    <div className="tabela-rolagem">
      <table className="diff">
        <caption>{legenda}</caption>
        <thead>
          <tr>
            <th scope="col">Parâmetro</th>
            <th scope="col">Vigente</th>
            <th scope="col">Proposto</th>
            <th scope="col">Situação</th>
          </tr>
        </thead>
        <tbody>
          {diff.map((d) => (
            <tr key={d.campo} className={d.mudou ? "diff__mudou" : undefined}>
              <th scope="row">{PARAMETRO[d.campo].titulo}</th>
              <td>{PARAMETRO[d.campo].valor(d.antes === "—" ? null : d.antes)}</td>
              <td>{PARAMETRO[d.campo].valor(d.depois === "—" ? null : d.depois)}</td>
              <td>{d.mudou ? "Muda" : d.aguardandoSegundoCiclo ? "Aguardando 2º ciclo para elevar (RN03)" : "Sem mudança"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** P4.9 — HU-D.02: fechar ciclo com diff vigente → proposto; RN03 e RN06 visíveis. */
export function FecharCiclo() {
  const ctx = useEstudante();
  useTitulo("Fechar ciclo", !ctx.carregando);
  const navigate = useNavigate();
  const { anunciar } = useAnuncio();
  const [modal, setModal] = useState(false);
  const [resultado, setResultado] = useState<ResultadoFechamento | null>(null);

  const id = ctx.dados?.estudante.id;
  const podeLer = !!ctx.dados && ctx.dados.consentimentoAtivo && ctx.dados.papel === "DOCENTE";

  const previa = useConsulta<{ ciclo: Ciclo | null; observacoes: ObservacaoRegistro[]; previa: ResultadoFechamento | null }>(async () => {
    if (!id || !podeLer) return { ciclo: null, observacoes: [], previa: null };
    const ciclo = await api.obterCicloAberto(id);
    if (!ciclo) return { ciclo: null, observacoes: [], previa: null };
    const [observacoes, previa] = await Promise.all([api.listarObservacoes(id), api.preverFechamento(ciclo.id)]);
    return { ciclo, observacoes: observacoes.filter((o) => o.cicloId === ciclo.id), previa };
  }, [id, podeLer]);

  const fechar = useMutacao(async () => {
    const r = await api.fecharCiclo(previa.dados!.ciclo!.id);
    setModal(false);
    setResultado(r);
    anunciar(r.modoPedagogico ? "Ciclo fechado. Nova versão já vigente (modo pedagógico)." : "Ciclo fechado. Versão enviada para validação clínica.", "sucesso");
  });

  if (ctx.carregando) return <Carregando />;
  if (ctx.erro || !ctx.dados) return <ErroCarregamento erro={ctx.erro} tentarNovamente={ctx.recarregar} />;

  if (ctx.dados.papel !== "DOCENTE") {
    return (
      <>
        <CabecalhoEstudante contexto={ctx.dados} titulo="Fechar ciclo" />
        <Alerta tom="info" titulo="Só a docente fecha o ciclo">O fechamento gera a proposta de parâmetros que o profissional de saúde valida.</Alerta>
      </>
    );
  }
  if (!ctx.dados.consentimentoAtivo) {
    return (
      <>
        <CabecalhoEstudante contexto={ctx.dados} titulo="Fechar ciclo" />
        <Alerta tom="erro" titulo="Sem consentimento ativo">Nenhum ciclo pode ser fechado até o responsável autorizar (RN01).</Alerta>
      </>
    );
  }

  if (resultado) {
    return (
      <>
        <CabecalhoEstudante contexto={ctx.dados} titulo={`Ciclo ${resultado.versao.numeroCiclo} fechado`} />
        <Alerta tom="sucesso" titulo={resultado.modoPedagogico ? "Nova versão vigente (modo pedagógico)" : "Enviado para validação clínica"} vivo>
          <p>
            {resultado.modoPedagogico
              ? "Não há profissional de saúde vinculado, então a versão entra em vigor imediatamente e só a camada determinística roda (RN06)."
              : "Enquanto o profissional não valida, os materiais continuam usando a versão vigente anterior. Sem resposta em 7 dias, ela permanece (RN05)."}
          </p>
        </Alerta>
        <Card titulo="O que mudou">
          <TabelaDiff diff={resultado.diff} legenda="Parâmetros: vigente → proposto" />
        </Card>
        <div className="grupo-botoes">
          <LinkBotao to={`/estudantes/${id}`}>Voltar para {ctx.dados.estudante.nome}</LinkBotao>
          <LinkBotao to={`/estudantes/${id}/gerar`} variante="secundario">
            Gerar material
          </LinkBotao>
        </div>
      </>
    );
  }

  return (
    <>
      <CabecalhoEstudante contexto={ctx.dados} titulo="Fechar ciclo" descricao="O sistema converte as observações do ciclo em parâmetros por regras fixas. Você vê o que mudaria antes de confirmar." />

      {previa.carregando && <Carregando texto="Calculando a proposta…" />}
      {previa.erro && <ErroCarregamento erro={previa.erro} tentarNovamente={previa.recarregar} />}

      {previa.dados && !previa.dados.ciclo && (
        <EstadoVazio titulo="Nenhum ciclo aberto" acao={<LinkBotao to={`/estudantes/${id}/observar`}>Abrir ciclo e observar</LinkBotao>}>
          <p>Abra um ciclo e registre observações antes de fechar.</p>
        </EstadoVazio>
      )}

      {previa.dados?.ciclo && previa.dados.previa && (
        <>
          <h2>Observações do ciclo {previa.dados.ciclo.numero}</h2>
          {previa.dados.observacoes.length === 0 ? (
            <Alerta tom="aviso" titulo="Nenhuma observação neste ciclo">
              <p>Fechar sem observações não muda nada no perfil. Registre pelo menos uma.</p>
              <div className="grupo-botoes">
                <LinkBotao to={`/estudantes/${id}/observar`} variante="secundario">
                  Registrar observação
                </LinkBotao>
              </div>
            </Alerta>
          ) : (
            <ul className="lista-simples" aria-label="Observações do ciclo">
              {previa.dados.observacoes.map((o) => (
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

          <h2>Proposta de parâmetros</h2>
          <Card>
            <div className="chips" style={{ marginBottom: "var(--esp-3)" }}>
              <Badge tom={previa.dados.previa.modoPedagogico ? "info" : "aviso"}>
                {previa.dados.previa.modoPedagogico ? "Modo pedagógico: entra em vigor ao fechar (RN06)" : "Vai para validação clínica ao fechar (RF06)"}
              </Badge>
            </div>
            <TabelaDiff diff={previa.dados.previa.diff} legenda="Parâmetros: vigente → proposto" />
            <p className="meta" style={{ marginTop: "var(--esp-3)" }}>
              Elevar um parâmetro exige 2 ciclos consecutivos de melhora; reduzir é imediato. O sistema erra a favor do material mais acessível (RN03).
            </p>
          </Card>

          {fechar.erro && (
            <Alerta tom="erro" vivo>
              {mensagemAmigavel(fechar.erro)}
            </Alerta>
          )}
          <div className="grupo-botoes grupo-botoes--empilhado">
            <Botao onClick={() => setModal(true)} disabled={previa.dados.observacoes.length === 0}>
              Fechar ciclo {previa.dados.ciclo.numero}
            </Botao>
            <Botao variante="secundario" onClick={() => navigate(`/estudantes/${id}`)}>
              Voltar sem fechar
            </Botao>
          </div>

          <Modal
            aberto={modal}
            titulo={`Fechar o ciclo ${previa.dados.ciclo.numero}?`}
            onFechar={() => setModal(false)}
            acoes={
              <Botao onClick={() => fechar.executar()} carregando={fechar.ocupado} textoCarregando="Fechando…">
                Fechar ciclo
              </Botao>
            }
          >
            <p>Depois de fechado, o ciclo não recebe mais observações e o próximo é aberto automaticamente. A proposta de parâmetros é gravada como nova versão.</p>
          </Modal>
        </>
      )}
    </>
  );
}
