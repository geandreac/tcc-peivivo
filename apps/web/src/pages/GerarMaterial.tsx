import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, mensagemAmigavel, type VersaoPerfil } from "../services";
import { useEstudante } from "../hooks/useEstudante";
import { useConsulta, useMutacao } from "../hooks/useConsulta";
import { useAnuncio } from "../hooks/useAnuncio";
import { useTitulo } from "../hooks/useTitulo";
import { CabecalhoEstudante } from "../components/CabecalhoEstudante";
import { Alerta, Carregando, ErroCarregamento, EstadoVazio, ResumoErros } from "../components/Feedback";
import { Botao, LinkBotao } from "../components/Botao";
import { Campo } from "../components/Campo";
import { PARAMETRO } from "../utils/rotulos";
import { TEXTO_CICLO_DA_AGUA } from "../mocks/dados";

const MAX = 20_000;

/**
 * P4.12 — HU-D.03 ⭐ caso central: textarea, botão "adaptar para [nome]",
 * progresso, aviso quando a IA não foi aplicada. Domingo, 21h, no celular.
 */
export function GerarMaterial() {
  const ctx = useEstudante();
  useTitulo("Gerar material", !ctx.carregando);
  const navigate = useNavigate();
  const { anunciar } = useAnuncio();
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [erros, setErros] = useState<{ campo: string; mensagem: string }[]>([]);

  const id = ctx.dados?.estudante.id;
  const pode = !!ctx.dados && ctx.dados.consentimentoAtivo && ctx.dados.papel === "DOCENTE";
  const vigente = useConsulta<VersaoPerfil | null>(async () => (id && pode ? api.obterVersaoVigente(id) : null), [id, pode]);

  const gerar = useMutacao(async () => {
    const lista: { campo: string; mensagem: string }[] = [];
    if (!titulo.trim()) lista.push({ campo: "titulo", mensagem: "Dê um título ao material (ex.: Ciências — O ciclo da água)." });
    if (!texto.trim()) lista.push({ campo: "texto", mensagem: "Cole o texto que você quer adaptar." });
    else if (texto.length > MAX) lista.push({ campo: "texto", mensagem: `O texto tem ${texto.length} caracteres; o máximo é ${MAX}.` });
    setErros(lista);
    if (lista.length > 0) return;
    const m = await api.gerarMaterial(id!, titulo, texto);
    anunciar(`Rascunho gerado em ${(m.duracaoMs / 1000).toFixed(1).replace(".", ",")} segundos. Revise antes de aprovar.`, "sucesso");
    navigate(`/materiais/${m.id}/revisar`);
  });

  if (ctx.carregando) return <Carregando />;
  if (ctx.erro || !ctx.dados) return <ErroCarregamento erro={ctx.erro} tentarNovamente={ctx.recarregar} />;

  const { estudante, papel, consentimentoAtivo } = ctx.dados;

  if (papel !== "DOCENTE") {
    return (
      <>
        <CabecalhoEstudante contexto={ctx.dados} titulo="Gerar material" />
        <Alerta tom="info" titulo="Só a docente gera material">Profissional de saúde, família e coordenação leem os materiais aprovados (D-02).</Alerta>
      </>
    );
  }
  if (!consentimentoAtivo) {
    return (
      <>
        <CabecalhoEstudante contexto={ctx.dados} titulo="Gerar material" />
        <Alerta tom="erro" titulo="Geração bloqueada">Sem consentimento ativo do responsável, nenhum material é gerado (RN01/RN08).</Alerta>
      </>
    );
  }

  return (
    <>
      <CabecalhoEstudante contexto={ctx.dados} titulo={`Adaptar texto para ${estudante.nome}`} descricao="Cole o texto da aula. Você recebe um rascunho com blocos curtos e instruções em etapa única, conforme o perfil vigente. Nada é publicado sem a sua revisão." />

      {vigente.carregando && <Carregando texto="Verificando o perfil vigente…" />}
      {vigente.erro && <ErroCarregamento erro={vigente.erro} tentarNovamente={vigente.recarregar} />}
      {vigente.dados === null && !vigente.carregando && !vigente.erro && (
        <EstadoVazio titulo="Ainda não há perfil vigente" acao={<LinkBotao to={`/estudantes/${id}/observar`}>Registrar observação</LinkBotao>}>
          <p>Feche um ciclo de observação para gerar a primeira versão do perfil. Sem perfil, não há como adaptar.</p>
        </EstadoVazio>
      )}

      {vigente.dados && (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            gerar.executar();
          }}
          aria-labelledby="titulo-form-gerar"
        >
          <h2 id="titulo-form-gerar" className="sr-only">
            Texto para adaptar
          </h2>
          <ResumoErros erros={erros} />
          {gerar.erro && (
            <Alerta tom="erro" vivo>
              {mensagemAmigavel(gerar.erro)}
            </Alerta>
          )}
          <Alerta tom="info" titulo={`Perfil vigente (ciclo ${vigente.dados.numeroCiclo})`}>
            <p>
              {PARAMETRO.maxLinhasPorBloco.valor(vigente.dados.parametros.maxLinhasPorBloco)} por bloco · {PARAMETRO.formatoEnunciado.valor(vigente.dados.parametros.formatoEnunciado).toLowerCase()} · contraste {PARAMETRO.contrasteMinimo.valor(vigente.dados.parametros.contrasteMinimo)} · até {PARAMETRO.blocosPorMaterial.valor(vigente.dados.parametros.blocosPorMaterial)}
              {vigente.dados.parametros.interesseAncora && <> · âncora: {vigente.dados.parametros.interesseAncora}</>}
            </p>
          </Alerta>

          <Campo id="titulo" rotulo="Título do material" dica="Como você vai encontrar depois. Ex.: Ciências — O ciclo da água." required value={titulo} onChange={(e) => setTitulo(e.target.value)} erro={erros.find((x) => x.campo === "titulo")?.mensagem ?? null} />
          <Campo
            tipo="area"
            id="texto"
            rotulo="Texto original"
            dica={`Cole o texto completo, com os enunciados. Até ${MAX.toLocaleString("pt-BR")} caracteres. Parágrafos separados por linha em branco.`}
            required
            rows={10}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            erro={erros.find((x) => x.campo === "texto")?.mensagem ?? null}
          />
          <p className="meta" aria-live="polite">
            {texto.length.toLocaleString("pt-BR")} / {MAX.toLocaleString("pt-BR")} caracteres
          </p>

          {gerar.ocupado && (
            <div className="progresso" role="status">
              <span className="carregando__spinner" aria-hidden="true" />
              <span>Adaptando… segmentando em blocos e reescrevendo enunciados. Camada de IA desligada neste protótipo.</span>
            </div>
          )}

          <div className="grupo-botoes grupo-botoes--empilhado">
            <Botao type="submit" carregando={gerar.ocupado} textoCarregando="Adaptando…">
              Adaptar para {estudante.nome}
            </Botao>
            <Botao
              variante="discreto"
              onClick={() => {
                setTitulo("Ciências — O ciclo da água");
                setTexto(TEXTO_CICLO_DA_AGUA);
                anunciar("Texto de exemplo preenchido.", "neutro", { semToast: true });
              }}
            >
              Usar texto de exemplo (ciclo da água)
            </Botao>
          </div>
        </form>
      )}
    </>
  );
}
