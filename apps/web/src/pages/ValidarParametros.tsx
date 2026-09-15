import { useState } from "react";
import { api, mensagemAmigavel, type DiffParametro, type ObservacaoRegistro, type VersaoPerfil } from "../services";
import type { ParametrosAdaptacao } from "@pei-vivo/motor-adaptacao";
import { useEstudante } from "../hooks/useEstudante";
import { useConsulta, useMutacao } from "../hooks/useConsulta";
import { useAnuncio } from "../hooks/useAnuncio";
import { useTitulo } from "../hooks/useTitulo";
import { CabecalhoEstudante } from "../components/CabecalhoEstudante";
import { Alerta, Badge, Card, Carregando, ErroCarregamento, EstadoVazio, ResumoErros } from "../components/Feedback";
import { Botao } from "../components/Botao";
import { Campo } from "../components/Campo";
import { TabelaDiff } from "./FecharCiclo";
import { DIMENSAO, ESCALA, PAPEL, STATUS_VALIDACAO } from "../utils/rotulos";
import { formatarDataHora } from "../utils/datas";

function diffEntre(base: ParametrosAdaptacao | null, nova: ParametrosAdaptacao): DiffParametro[] {
  const campos = Object.keys(nova) as (keyof ParametrosAdaptacao)[];
  return campos.map((campo) => ({
    campo,
    antes: base ? String(base[campo] ?? "—") : "—",
    depois: String(nova[campo] ?? "—"),
    mudou: !!base && base[campo] !== nova[campo],
    aguardandoSegundoCiclo: false,
  }));
}

/** P4.10 — HU-P.01: valida o CONJUNTO de parâmetros do ciclo (RN07). Nunca mostra material. */
export function ValidarParametros() {
  const ctx = useEstudante();
  useTitulo("Validar parâmetros", !ctx.carregando);
  const { anunciar } = useAnuncio();
  const [justificativa, setJustificativa] = useState("");
  const [erros, setErros] = useState<{ campo: string; mensagem: string }[]>([]);
  const [modoAjuste, setModoAjuste] = useState(false);

  const id = ctx.dados?.estudante.id;
  const podeLer = !!ctx.dados && ctx.dados.consentimentoAtivo && ctx.dados.papel === "PROFISSIONAL_SAUDE";

  const dados = useConsulta<{ versoes: VersaoPerfil[]; vigente: VersaoPerfil | null; observacoes: ObservacaoRegistro[] }>(async () => {
    if (!id || !podeLer) return { versoes: [], vigente: null, observacoes: [] };
    const [versoes, vigente, observacoes] = await Promise.all([api.listarVersoes(id), api.obterVersaoVigente(id), api.listarObservacoes(id)]);
    return { versoes, vigente, observacoes };
  }, [id, podeLer]);

  const pendente = dados.dados?.versoes.find((v) => v.statusValidacao === "PENDENTE" || v.statusValidacao === "EM_REVISAO" || v.statusValidacao === "EXPIRADA");

  const validar = useMutacao(async (decisao: "APROVAR" | "AJUSTE") => {
    if (decisao === "AJUSTE" && !justificativa.trim()) {
      setErros([{ campo: "justificativa", mensagem: "Explique à docente o que precisa ser ajustado." }]);
      return;
    }
    setErros([]);
    await api.validarVersao(pendente!.id, decisao, justificativa);
    anunciar(decisao === "APROVAR" ? `Parâmetros do ciclo ${pendente!.numeroCiclo} validados. Já valem para os próximos materiais.` : "Ajuste solicitado. A docente verá sua justificativa; a versão anterior continua vigente.", "sucesso");
    setJustificativa("");
    setModoAjuste(false);
    dados.recarregar();
  });

  if (ctx.carregando) return <Carregando />;
  if (ctx.erro || !ctx.dados) return <ErroCarregamento erro={ctx.erro} tentarNovamente={ctx.recarregar} />;

  if (ctx.dados.papel !== "PROFISSIONAL_SAUDE") {
    return (
      <>
        <CabecalhoEstudante contexto={ctx.dados} titulo="Validar parâmetros" />
        <Alerta tom="info" titulo="Só o profissional de saúde valida">A validação clínica incide sobre o conjunto de parâmetros do ciclo (RF06, RN07).</Alerta>
      </>
    );
  }
  if (!ctx.dados.consentimentoAtivo) {
    return (
      <>
        <CabecalhoEstudante contexto={ctx.dados} titulo="Validar parâmetros" />
        <Alerta tom="erro" titulo="Sem consentimento ativo">Os dados deste estudante não estão disponíveis (RN01/RN08).</Alerta>
      </>
    );
  }

  return (
    <>
      <CabecalhoEstudante contexto={ctx.dados} titulo="Validar parâmetros do ciclo" descricao="Você valida o conjunto de parâmetros, nunca um material individual. Sem resposta em 7 dias, a versão anterior permanece vigente." />

      {dados.carregando && <Carregando />}
      {dados.erro && <ErroCarregamento erro={dados.erro} tentarNovamente={dados.recarregar} />}

      {dados.dados && !pendente && (
        <EstadoVazio titulo="Nada aguardando validação">
          <p>Quando a docente fechar o próximo ciclo, a proposta aparece aqui.</p>
        </EstadoVazio>
      )}

      {dados.dados && pendente && (
        <>
          <Card>
            <div className="chips" style={{ marginBottom: "var(--esp-3)" }}>
              <Badge tom={STATUS_VALIDACAO[pendente.statusValidacao].tom === "neutro" ? "neutro" : STATUS_VALIDACAO[pendente.statusValidacao].tom}>{STATUS_VALIDACAO[pendente.statusValidacao].texto}</Badge>
              <span className="meta">Ciclo {pendente.numeroCiclo} · proposta gerada em {formatarDataHora(pendente.createdAt)}</span>
            </div>
            {pendente.statusValidacao === "EXPIRADA" && (
              <Alerta tom="aviso" titulo="Prazo de 7 dias vencido">Os parâmetros anteriores foram mantidos (RN05). Você ainda pode validar esta versão agora.</Alerta>
            )}
            {pendente.justificativaRevisao && (
              <Alerta tom="info" titulo="Ajuste solicitado anteriormente">{pendente.justificativaRevisao}</Alerta>
            )}
            <TabelaDiff diff={diffEntre(dados.dados.vigente?.parametros ?? null, pendente.parametros)} legenda="Vigente → proposto" />
          </Card>

          <h2>Observações que geraram a proposta</h2>
          <ul className="lista-simples" aria-label="Observações do ciclo">
            {dados.dados.observacoes.filter((o) => o.cicloId === pendente.cicloOrigemId).length === 0 && <li className="meta">Sem observações vinculadas a este ciclo.</li>}
            {dados.dados.observacoes
              .filter((o) => o.cicloId === pendente.cicloOrigemId)
              .map((o) => (
                <li key={o.id}>
                  <div>
                    <strong>{DIMENSAO[o.dimensao].titulo}</strong>: {ESCALA[o.valorEscala]}
                    {o.evidencia && <div className="meta">“{o.evidencia}”</div>}
                  </div>
                  <Badge>{PAPEL[o.papelAutor]}</Badge>
                </li>
              ))}
          </ul>

          <h2>Sua decisão</h2>
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              validar.executar(modoAjuste ? "AJUSTE" : "APROVAR");
            }}
          >
            <ResumoErros erros={erros} />
            {validar.erro && (
              <Alerta tom="erro" vivo>
                {mensagemAmigavel(validar.erro)}
              </Alerta>
            )}
            {modoAjuste && (
              <Campo
                tipo="area"
                id="justificativa"
                rotulo="Justificativa do ajuste"
                dica="A docente lê este texto. Diga o que precisa mudar e por quê, em linguagem operacional."
                required
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                erro={erros.find((x) => x.campo === "justificativa")?.mensagem ?? null}
              />
            )}
            <div className="grupo-botoes grupo-botoes--empilhado">
              {!modoAjuste ? (
                <>
                  <Botao type="submit" carregando={validar.ocupado} textoCarregando="Validando…">
                    Aprovar o conjunto de parâmetros
                  </Botao>
                  <Botao variante="secundario" onClick={() => setModoAjuste(true)}>
                    Solicitar ajuste
                  </Botao>
                </>
              ) : (
                <>
                  <Botao type="submit" carregando={validar.ocupado} textoCarregando="Enviando…">
                    Enviar solicitação de ajuste
                  </Botao>
                  <Botao
                    variante="secundario"
                    onClick={() => {
                      setModoAjuste(false);
                      setErros([]);
                    }}
                  >
                    Voltar
                  </Botao>
                </>
              )}
            </div>
          </form>
        </>
      )}

      {dados.dados && dados.dados.versoes.length > 0 && (
        <>
          <h2>Histórico de versões</h2>
          <ul className="lista-simples" aria-label="Versões do perfil">
            {dados.dados.versoes.map((v) => (
              <li key={v.id}>
                <span>
                  Ciclo {v.numeroCiclo} · {formatarDataHora(v.createdAt)}
                </span>
                <Badge tom={STATUS_VALIDACAO[v.statusValidacao].tom === "neutro" ? "neutro" : STATUS_VALIDACAO[v.statusValidacao].tom}>{STATUS_VALIDACAO[v.statusValidacao].texto}</Badge>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
