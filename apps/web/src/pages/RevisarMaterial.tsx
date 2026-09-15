import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { textoDoAdaptado } from "@pei-vivo/motor-adaptacao";
import { api, mensagemAmigavel, type Material } from "../services";
import { useConsulta, useMutacao } from "../hooks/useConsulta";
import { useAnuncio } from "../hooks/useAnuncio";
import { useTitulo } from "../hooks/useTitulo";
import { useEstudante } from "../hooks/useEstudante";
import { CabecalhoEstudante } from "../components/CabecalhoEstudante";
import { MaterialAdaptado } from "../components/MaterialAdaptado";
import { Alerta, Badge, Carregando, ErroCarregamento } from "../components/Feedback";
import { Botao, LinkBotao } from "../components/Botao";
import { Campo } from "../components/Campo";
import { Modal } from "../components/Modal";
import { STATUS_APROVACAO } from "../utils/rotulos";
import { segundos } from "../utils/datas";

/** P4.13 — HU-D.04: original × adaptado (empilhado no celular), edição inline, aprovar/descartar. A IA nunca aprova. */
export function RevisarMaterial() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { anunciar } = useAnuncio();
  const material = useConsulta<Material>(() => api.obterMaterial(id!), [id]);
  const ctx = useEstudante(material.dados?.estudanteId ?? "");
  useTitulo(material.dados ? `Revisar: ${material.dados.titulo}` : "Revisar material", !material.carregando);

  const [editando, setEditando] = useState(false);
  const [textoEditado, setTextoEditado] = useState("");
  const [modalDescartar, setModalDescartar] = useState(false);

  useEffect(() => {
    if (material.dados?.textoAdaptado) setTextoEditado(material.dados.textoRevisado ?? textoDoAdaptado(material.dados.textoAdaptado));
  }, [material.dados]);

  const aprovar = useMutacao(async () => {
    const m = await api.aprovarMaterial(id!, editando ? textoEditado : undefined);
    anunciar("Material aprovado. Agora família, profissional e coordenação também o veem.", "sucesso");
    navigate(`/materiais/${m.id}`);
  });
  const descartar = useMutacao(async () => {
    await api.descartarMaterial(id!);
    setModalDescartar(false);
    anunciar("Rascunho descartado.", "neutro");
    navigate(`/estudantes/${material.dados!.estudanteId}`);
  });

  if (material.carregando || (material.dados && ctx.carregando)) return <Carregando texto="Carregando o rascunho…" />;
  if (material.erro || !material.dados) {
    return (
      <>
        <h1>Material não encontrado</h1>
        <ErroCarregamento erro={material.erro} />
        <LinkBotao to="/painel" variante="secundario">
          Voltar
        </LinkBotao>
      </>
    );
  }
  if (ctx.erro || !ctx.dados) return <ErroCarregamento erro={ctx.erro} tentarNovamente={ctx.recarregar} />;

  const m = material.dados;
  if (m.statusAprovacao !== "RASCUNHO") {
    return (
      <>
        <CabecalhoEstudante contexto={ctx.dados} titulo={m.titulo} />
        <Alerta tom="info" titulo={STATUS_APROVACAO[m.statusAprovacao].texto}>
          <p>Este material já foi revisado.</p>
          <div className="grupo-botoes">
            <LinkBotao to={`/materiais/${m.id}`} variante="secundario">
              Ver versão final
            </LinkBotao>
          </div>
        </Alerta>
      </>
    );
  }

  return (
    <>
      <CabecalhoEstudante contexto={ctx.dados} titulo={`Revisar: ${m.titulo}`} descricao="Compare o original com a versão adaptada. Edite se quiser. Nada chega ao estudante sem o seu toque em Aprovar (RN04)." />

      <div className="chips" style={{ marginBottom: "var(--esp-4)" }}>
        <Badge tom="aviso">{STATUS_APROVACAO.RASCUNHO.texto}</Badge>
        <Badge>Gerado em {segundos(m.duracaoMs)}</Badge>
        <Badge tom={m.iaAplicada ? "info" : "neutro"}>{m.iaAplicada ? "Camada de IA aplicada" : "Só camada determinística"}</Badge>
      </div>

      {!m.iaAplicada && (
        <Alerta tom="info" titulo="A camada de IA não foi aplicada">
          Você recebeu blocos, etapas e contraste conforme o perfil. Vocabulário e exemplos (âncora de interesse) só mudam com a IA ligada — que, ainda assim, nunca aprova nada.
        </Alerta>
      )}

      {aprovar.erro && (
        <Alerta tom="erro" vivo>
          {mensagemAmigavel(aprovar.erro)}
        </Alerta>
      )}

      <div className="comparacao">
        <section className="comparacao__painel" aria-labelledby="titulo-original">
          <h2 id="titulo-original">Original</h2>
          <pre>{m.textoOriginal}</pre>
        </section>
        <section className="comparacao__painel" aria-labelledby="titulo-adaptado">
          <h2 id="titulo-adaptado">Adaptado</h2>
          {editando ? (
            <Campo tipo="area" id="texto-editado" rotulo="Texto adaptado (editável)" dica="Separe blocos com uma linha em branco. Etapas numeradas viram lista." rows={16} value={textoEditado} onChange={(e) => setTextoEditado(e.target.value)} />
          ) : (
            m.textoAdaptado && <MaterialAdaptado adaptado={m.textoAdaptado} mostrarExcedentes />
          )}
          <div className="grupo-botoes">
            <Botao variante="secundario" onClick={() => setEditando((v) => !v)} aria-pressed={editando}>
              {editando ? "Ver como ficará" : "Editar o texto adaptado"}
            </Botao>
          </div>
        </section>
      </div>

      <div className="grupo-botoes grupo-botoes--empilhado nao-imprimir">
        <Botao onClick={() => aprovar.executar()} carregando={aprovar.ocupado} textoCarregando="Aprovando…">
          Aprovar material
        </Botao>
        <Botao variante="perigo" onClick={() => setModalDescartar(true)}>
          Descartar rascunho
        </Botao>
        <LinkBotao to={`/estudantes/${m.estudanteId}`} variante="discreto">
          Decidir depois
        </LinkBotao>
      </div>

      <Modal
        aberto={modalDescartar}
        titulo="Descartar este rascunho?"
        onFechar={() => setModalDescartar(false)}
        acoes={
          <Botao variante="perigo" onClick={() => descartar.executar()} carregando={descartar.ocupado} textoCarregando="Descartando…">
            Sim, descartar
          </Botao>
        }
      >
        <p>O rascunho some da sua lista. O texto original não é apagado — você pode gerar de novo quando quiser.</p>
        {descartar.erro && (
          <Alerta tom="erro" vivo>
            {mensagemAmigavel(descartar.erro)}
          </Alerta>
        )}
      </Modal>
    </>
  );
}
