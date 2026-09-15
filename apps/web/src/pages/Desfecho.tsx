import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, mensagemAmigavel, type Material, type ResultadoDesfecho } from "../services";
import { useConsulta, useMutacao } from "../hooks/useConsulta";
import { useAnuncio } from "../hooks/useAnuncio";
import { useTitulo } from "../hooks/useTitulo";
import { useEstudante } from "../hooks/useEstudante";
import { CabecalhoEstudante } from "../components/CabecalhoEstudante";
import { Alerta, Carregando, ErroCarregamento, ResumoErros } from "../components/Feedback";
import { Botao, LinkBotao } from "../components/Botao";
import { Campo } from "../components/Campo";
import { DESFECHO } from "../utils/rotulos";

const OPCOES: ResultadoDesfecho[] = ["ALCANCADO", "PARCIAL", "NAO_ALCANCADO"];

/** P4.15 — HU-D.06: 3 opções + texto livre; dois toques. É a retroalimentação (RF13). */
export function Desfecho() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { anunciar } = useAnuncio();
  const material = useConsulta<Material>(() => api.obterMaterial(id!), [id]);
  const ctx = useEstudante(material.dados?.estudanteId ?? "");
  useTitulo("Registrar desfecho", !material.carregando);
  const [resultado, setResultado] = useState<ResultadoDesfecho | null>(null);
  const [observacao, setObservacao] = useState("");
  const [erros, setErros] = useState<{ campo: string; mensagem: string }[]>([]);

  const salvar = useMutacao(async () => {
    if (!resultado) {
      setErros([{ campo: "resultado", mensagem: "Escolha como foi a aplicação do material." }]);
      return;
    }
    setErros([]);
    await api.registrarDesfecho(id!, resultado, observacao);
    anunciar("Desfecho registrado. Ele alimenta o próximo ciclo de observação.", "sucesso");
    navigate(`/materiais/${id}`);
  });

  if (material.carregando || (material.dados && ctx.carregando)) return <Carregando />;
  if (material.erro || !material.dados) return <ErroCarregamento erro={material.erro} />;
  if (ctx.erro || !ctx.dados) return <ErroCarregamento erro={ctx.erro} tentarNovamente={ctx.recarregar} />;

  const m = material.dados;
  if (ctx.dados.papel !== "DOCENTE") {
    return (
      <>
        <CabecalhoEstudante contexto={ctx.dados} titulo="Registrar desfecho" />
        <Alerta tom="info" titulo="Só a docente registra o desfecho">Você vê o resultado na página do material.</Alerta>
      </>
    );
  }

  return (
    <>
      <CabecalhoEstudante contexto={ctx.dados} titulo={`Como foi: ${m.titulo}`} descricao="Dois toques: escolha o resultado e, se quiser, escreva uma linha. É isso que fecha o ciclo e refina o perfil." voltarPara={`/materiais/${m.id}`} voltarRotulo="Voltar para o material" />

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          salvar.executar();
        }}
      >
        <ResumoErros erros={erros} />
        {salvar.erro && (
          <Alerta tom="erro" vivo>
            {mensagemAmigavel(salvar.erro)}
          </Alerta>
        )}
        <fieldset id="resultado" aria-describedby={erros.length ? "resultado-erro" : undefined} aria-invalid={erros.length ? true : undefined}>
          <legend>Resultado em sala</legend>
          <div className="escala3">
            {OPCOES.map((o) => (
              <label key={o} className="opcao">
                <input type="radio" name="resultado" value={o} checked={resultado === o} onChange={() => setResultado(o)} />
                <span className="opcao__texto">
                  <span>{DESFECHO[o].texto}</span>
                  <span className="opcao__descricao">{DESFECHO[o].descricao}</span>
                </span>
              </label>
            ))}
          </div>
          {erros.length > 0 && (
            <div id="resultado-erro" className="campo__erro">
              {erros[0]!.mensagem}
            </div>
          )}
        </fieldset>
        <Campo tipo="area" id="observacao" rotulo="Observação livre" opcional rows={3} dica="Ex.: “Terminou sozinho. A âncora de interesse funcionou.”" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
        <div className="grupo-botoes grupo-botoes--empilhado">
          <Botao type="submit" carregando={salvar.ocupado} textoCarregando="Registrando…">
            Registrar desfecho
          </Botao>
          <LinkBotao to={`/materiais/${m.id}`} variante="secundario">
            Cancelar
          </LinkBotao>
        </div>
      </form>
    </>
  );
}
