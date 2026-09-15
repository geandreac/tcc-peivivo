import { useParams } from "react-router-dom";
import { api, type Desfecho, type Material } from "../services";
import { useConsulta } from "../hooks/useConsulta";
import { useTitulo } from "../hooks/useTitulo";
import { useEstudante } from "../hooks/useEstudante";
import { CabecalhoEstudante } from "../components/CabecalhoEstudante";
import { MaterialAdaptado } from "../components/MaterialAdaptado";
import { Alerta, Badge, Card, Carregando, ErroCarregamento } from "../components/Feedback";
import { Botao, LinkBotao } from "../components/Botao";
import { DESFECHO, STATUS_APROVACAO } from "../utils/rotulos";
import { formatarDataHora } from "../utils/datas";

/** P4.14 — HU-D.05 / HU-R.04: versão web acessível + impressão (RF12). */
export function MaterialFinal() {
  const { id } = useParams<{ id: string }>();
  const dados = useConsulta<{ material: Material; desfecho: Desfecho | null }>(async () => {
    const material = await api.obterMaterial(id!);
    const desfecho = await api.obterDesfecho(id!);
    return { material, desfecho };
  }, [id]);
  const ctx = useEstudante(dados.dados?.material.estudanteId ?? "");
  useTitulo(dados.dados?.material.titulo ?? "Material", !dados.carregando);

  if (dados.carregando || (dados.dados && ctx.carregando)) return <Carregando texto="Carregando o material…" />;
  if (dados.erro || !dados.dados) {
    return (
      <>
        <h1>Material não encontrado</h1>
        <ErroCarregamento erro={dados.erro} />
        <p className="meta">Rascunhos só aparecem para a docente que os criou (D-12).</p>
        <LinkBotao to="/painel" variante="secundario">
          Voltar
        </LinkBotao>
      </>
    );
  }
  if (ctx.erro || !ctx.dados) return <ErroCarregamento erro={ctx.erro} tentarNovamente={ctx.recarregar} />;

  const { material: m, desfecho } = dados.dados;
  const papel = ctx.dados.papel;

  return (
    <>
      <div className="nao-imprimir">
        <CabecalhoEstudante contexto={ctx.dados} titulo={m.titulo} />
        <div className="chips" style={{ marginBottom: "var(--esp-4)" }}>
          <Badge tom={STATUS_APROVACAO[m.statusAprovacao].tom}>{STATUS_APROVACAO[m.statusAprovacao].texto}</Badge>
          <span className="meta">Gerado em {formatarDataHora(m.dataGeracao)}</span>
          {desfecho && <Badge tom={DESFECHO[desfecho.resultado].tom}>Desfecho: {DESFECHO[desfecho.resultado].texto}</Badge>}
        </div>
        {m.statusAprovacao === "RASCUNHO" && (
          <Alerta tom="aviso" titulo="Este é um rascunho">
            <p>Só você vê. Revise e aprove para que a família e a equipe também vejam.</p>
            <div className="grupo-botoes">
              <LinkBotao to={`/materiais/${m.id}/revisar`}>Revisar e aprovar</LinkBotao>
            </div>
          </Alerta>
        )}
      </div>

      {m.textoAdaptado && <MaterialAdaptado adaptado={m.textoAdaptado} titulo={m.titulo} textoRevisado={m.textoRevisado} mostrarExcedentes />}

      <div className="grupo-botoes nao-imprimir">
        <Botao variante="secundario" onClick={() => window.print()}>
          Imprimir ou salvar em PDF
        </Botao>
        {papel === "DOCENTE" && m.statusAprovacao === "APROVADO" && !desfecho && <LinkBotao to={`/materiais/${m.id}/desfecho`}>Registrar desfecho</LinkBotao>}
      </div>

      {desfecho && (
        <Card titulo="Desfecho em sala" className="nao-imprimir">
          <p>
            <strong>{DESFECHO[desfecho.resultado].texto}</strong> — {DESFECHO[desfecho.resultado].descricao}
          </p>
          {desfecho.observacaoLivre && <p>“{desfecho.observacaoLivre}”</p>}
          <p className="meta">Registrado em {formatarDataHora(desfecho.dataRegistro)}</p>
        </Card>
      )}

      <details className="nao-imprimir" style={{ marginTop: "var(--esp-5)" }}>
        <summary>Ver texto original</summary>
        <pre style={{ whiteSpace: "pre-wrap" }}>{m.textoOriginal}</pre>
      </details>
    </>
  );
}
