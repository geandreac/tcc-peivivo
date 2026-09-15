import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DIMENSOES, type DimensaoObservada, type EscalaObservacao } from "@pei-vivo/motor-adaptacao";
import { api, mensagemAmigavel, type Ciclo, type ObservacaoRegistro } from "../services";
import { useEstudante } from "../hooks/useEstudante";
import { useConsulta, useMutacao } from "../hooks/useConsulta";
import { useAnuncio } from "../hooks/useAnuncio";
import { useTitulo } from "../hooks/useTitulo";
import { CabecalhoEstudante } from "../components/CabecalhoEstudante";
import { Escala3 } from "../components/Escala3";
import { Campo } from "../components/Campo";
import { Alerta, Badge, Card, Carregando, ErroCarregamento, EstadoVazio, ResumoErros } from "../components/Feedback";
import { Botao, LinkBotao } from "../components/Botao";
import { DIMENSAO, ESCALA, PAPEL } from "../utils/rotulos";
import { formatarData, formatarDataHora } from "../utils/datas";

type Respostas = Partial<Record<DimensaoObservada, { escala: EscalaObservacao | null; evidencia: string }>>;

/**
 * P4.8 — observação quinzenal (HU-D.01, HU-R.03, HU-P.02). Mesma tela para os
 * três papéis; só o rótulo muda. Seis dimensões, escala de 3 pontos, evidência
 * opcional. Completável em < 60 s: 6 toques + texto opcional.
 */
export function Observar() {
  const ctx = useEstudante();
  useTitulo("Registrar observação", !ctx.carregando);
  const navigate = useNavigate();
  const { anunciar } = useAnuncio();
  const [respostas, setRespostas] = useState<Respostas>({});
  const [erros, setErros] = useState<{ campo: string; mensagem: string }[]>([]);

  const id = ctx.dados?.estudante.id;
  const papel = ctx.dados?.papel;
  const podeLer = !!ctx.dados && (ctx.dados.consentimentoAtivo || papel === "RESPONSAVEL" || papel === "COORDENACAO");

  const ciclo = useConsulta<{ aberto: Ciclo | null; observacoes: ObservacaoRegistro[] }>(async () => {
    if (!id || !podeLer) return { aberto: null, observacoes: [] };
    const [aberto, observacoes] = await Promise.all([api.obterCicloAberto(id), api.listarObservacoes(id)]);
    return { aberto, observacoes };
  }, [id, podeLer]);

  const abrir = useMutacao(async () => {
    await api.abrirCiclo(id!);
    anunciar("Novo ciclo aberto.", "sucesso");
    ciclo.recarregar();
  });

  const salvar = useMutacao(async () => {
    const preenchidas = DIMENSOES.filter((d) => respostas[d]?.escala);
    if (preenchidas.length === 0) {
      setErros([{ campo: `dim-${DIMENSOES[0]}`, mensagem: "Escolha ao menos uma dimensão para registrar." }]);
      return;
    }
    const lista: { campo: string; mensagem: string }[] = [];
    for (const d of DIMENSOES) {
      const r = respostas[d];
      if (r?.evidencia?.trim() && !r.escala) lista.push({ campo: `dim-${d}`, mensagem: `${DIMENSAO[d].titulo}: escolha a escala para a evidência que você escreveu.` });
    }
    setErros(lista);
    if (lista.length > 0) return;
    for (const d of preenchidas) {
      const r = respostas[d]!;
      await api.registrarObservacao(ciclo.dados!.aberto!.id, { dimensao: d, valorEscala: r.escala!, evidencia: r.evidencia });
    }
    anunciar(`${preenchidas.length === 1 ? "1 observação registrada" : `${preenchidas.length} observações registradas`} no ciclo ${ciclo.dados!.aberto!.numero}.`, "sucesso");
    navigate(`/estudantes/${id}`);
  });

  if (ctx.carregando) return <Carregando />;
  if (ctx.erro || !ctx.dados) return <ErroCarregamento erro={ctx.erro} tentarNovamente={ctx.recarregar} />;

  const { estudante, consentimentoAtivo } = ctx.dados;
  const descricaoPapel =
    papel === "DOCENTE"
      ? "Registre o que você viu em sala nas últimas duas semanas. Compare com o ciclo anterior."
      : papel === "RESPONSAVEL"
        ? "Registre o que você percebe em casa. Não precisa preencher tudo — só o que você notou."
        : "Registre estratégias validadas de forma operacional: é isto que a escola vai ler. O raciocínio clínico vai na nota reservada.";

  if (!consentimentoAtivo) {
    return (
      <>
        <CabecalhoEstudante contexto={ctx.dados} titulo="Registrar observação" />
        <Alerta tom="erro" titulo="Sem consentimento ativo">Nenhuma observação pode ser registrada até o responsável autorizar (RN01).</Alerta>
      </>
    );
  }
  if (papel === "COORDENACAO") {
    return (
      <>
        <CabecalhoEstudante contexto={ctx.dados} titulo="Registrar observação" />
        <Alerta tom="info" titulo="A coordenação não registra observações">Quem alimenta o perfil são docente, família e profissional de saúde. Você lê tudo no histórico.</Alerta>
      </>
    );
  }

  return (
    <>
      <CabecalhoEstudante contexto={ctx.dados} titulo="Registrar observação" descricao={descricaoPapel} />

      {ciclo.carregando && <Carregando texto="Carregando o ciclo…" />}
      {ciclo.erro && <ErroCarregamento erro={ciclo.erro} tentarNovamente={ciclo.recarregar} />}

      {ciclo.dados && !ciclo.dados.aberto && (
        <EstadoVazio titulo="Nenhum ciclo aberto">
          <p>{papel === "DOCENTE" ? "Abra o próximo ciclo quinzenal para começar a registrar." : "Só a docente abre um ciclo. Peça a ela para abrir o próximo."}</p>
          {papel === "DOCENTE" && (
            <div className="grupo-botoes" style={{ justifyContent: "center" }}>
              <Botao onClick={() => abrir.executar()} carregando={abrir.ocupado} textoCarregando="Abrindo…">
                Abrir novo ciclo
              </Botao>
            </div>
          )}
          {abrir.erro && (
            <Alerta tom="erro" vivo>
              {mensagemAmigavel(abrir.erro)}
            </Alerta>
          )}
        </EstadoVazio>
      )}

      {ciclo.dados?.aberto && (
        <>
          <p className="meta">
            Ciclo <strong>{ciclo.dados.aberto.numero}</strong>, aberto em {formatarData(ciclo.dados.aberto.dataInicio)}. Suas respostas ficam registradas com seu nome e papel ({PAPEL[papel!]}).
          </p>
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              salvar.executar();
            }}
            aria-labelledby="titulo-form-obs"
          >
            <h2 id="titulo-form-obs" className="sr-only">
              Formulário de observação
            </h2>
            <ResumoErros erros={erros} />
            {salvar.erro && (
              <Alerta tom="erro" vivo>
                {mensagemAmigavel(salvar.erro)}
              </Alerta>
            )}
            {DIMENSOES.map((d) => (
              <Card key={d} nivel={3}>
                <Escala3
                  id={`dim-${d}`}
                  dimensao={d}
                  valor={respostas[d]?.escala ?? null}
                  onChange={(v) => setRespostas((r) => ({ ...r, [d]: { escala: v, evidencia: r[d]?.evidencia ?? "" } }))}
                  erro={erros.find((e) => e.campo === `dim-${d}`)?.mensagem ?? null}
                />
                <Campo
                  tipo="area"
                  id={`evid-${d}`}
                  rotulo="Evidência"
                  opcional
                  rows={2}
                  dica={d === "INTERESSE_MANIFESTO" ? "Escreva o tema (ex.: dinossauros). Ele vira a âncora de interesse do perfil." : "Um exemplo concreto do que você viu. Texto livre, nunca diagnóstico."}
                  value={respostas[d]?.evidencia ?? ""}
                  onChange={(e) => setRespostas((r) => ({ ...r, [d]: { escala: r[d]?.escala ?? null, evidencia: e.target.value } }))}
                />
              </Card>
            ))}
            <div className="grupo-botoes grupo-botoes--empilhado">
              <Botao type="submit" carregando={salvar.ocupado} textoCarregando="Salvando…">
                Registrar observações
              </Botao>
              <LinkBotao to={`/estudantes/${estudante.id}`} variante="secundario">
                Cancelar
              </LinkBotao>
            </div>
          </form>

          <h2>Já registrado neste ciclo</h2>
          {ciclo.dados.observacoes.filter((o) => o.cicloId === ciclo.dados!.aberto!.id).length === 0 ? (
            <p className="meta">Ninguém registrou nada neste ciclo ainda.</p>
          ) : (
            <ul className="lista-simples" aria-label="Observações deste ciclo">
              {ciclo.dados.observacoes
                .filter((o) => o.cicloId === ciclo.dados!.aberto!.id)
                .map((o) => (
                  <li key={o.id}>
                    <div>
                      <strong>{DIMENSAO[o.dimensao].titulo}</strong>: {ESCALA[o.valorEscala]} — {DIMENSAO[o.dimensao].escala[o.valorEscala]}
                      {o.evidencia && <div className="meta">“{o.evidencia}”</div>}
                      <div className="meta">{formatarDataHora(o.dataRegistro)}</div>
                    </div>
                    <Badge>{PAPEL[o.papelAutor]}</Badge>
                  </li>
                ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}
