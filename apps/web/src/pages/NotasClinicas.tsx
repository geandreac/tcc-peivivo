import { useState } from "react";
import { api, ehErroApi, mensagemAmigavel, type NotaClinica } from "../services";
import { useEstudante } from "../hooks/useEstudante";
import { useConsulta, useMutacao } from "../hooks/useConsulta";
import { useAnuncio } from "../hooks/useAnuncio";
import { useTitulo } from "../hooks/useTitulo";
import { CabecalhoEstudante } from "../components/CabecalhoEstudante";
import { Alerta, Card, Carregando, ErroCarregamento, EstadoVazio, ResumoErros } from "../components/Feedback";
import { Botao, LinkBotao } from "../components/Botao";
import { Campo } from "../components/Campo";
import { formatarDataHora } from "../utils/datas";

/**
 * P4.11 — HU-P.03: nota clínica reservada (RN02 ⭐). Visualmente separada
 * ("só profissionais de saúde veem"). Qualquer outro papel recebe NEGADO da
 * camada de serviços — a tela não decide a permissão, só mostra o resultado.
 */
export function NotasClinicas() {
  const ctx = useEstudante();
  useTitulo("Notas clínicas reservadas", !ctx.carregando);
  const { anunciar } = useAnuncio();
  const [conteudo, setConteudo] = useState("");
  const [erros, setErros] = useState<{ campo: string; mensagem: string }[]>([]);
  const id = ctx.dados?.estudante.id;

  const notas = useConsulta<NotaClinica[]>(async () => (id ? api.listarNotasClinicas(id) : []), [id]);

  const salvar = useMutacao(async () => {
    if (!conteudo.trim()) {
      setErros([{ campo: "conteudo", mensagem: "Escreva o conteúdo da nota." }]);
      return;
    }
    setErros([]);
    await api.registrarNotaClinica(id!, conteudo);
    setConteudo("");
    anunciar("Nota clínica registrada. Só profissionais de saúde vinculados a leem.", "sucesso");
    notas.recarregar();
  });

  if (ctx.carregando) return <Carregando />;
  if (ctx.erro || !ctx.dados) return <ErroCarregamento erro={ctx.erro} tentarNovamente={ctx.recarregar} />;

  const negado = ehErroApi(notas.erro) && notas.erro.codigo === "NEGADO";

  return (
    <>
      <CabecalhoEstudante contexto={ctx.dados} titulo="Notas clínicas reservadas" descricao="Espaço do profissional de saúde. Docente, família e coordenação não têm acesso — nem por chamada direta à API." />

      <Alerta tom="aviso" titulo="Só profissionais de saúde veem este conteúdo">
        <p>
          O que a escola precisa saber vai como <strong>observação</strong> (todos os vinculados leem). O raciocínio clínico fica aqui. Se o
          responsável excluir os dados do estudante, estas notas também são apagadas — mantenha seu prontuário fora do sistema (D-05).
        </p>
      </Alerta>

      {notas.carregando && <Carregando />}
      {negado && (
        <Alerta tom="erro" titulo="Acesso negado (RN02)" vivo>
          <p>{mensagemAmigavel(notas.erro)}</p>
          <div className="grupo-botoes">
            <LinkBotao to={`/estudantes/${id}`} variante="secundario">
              Voltar
            </LinkBotao>
          </div>
        </Alerta>
      )}
      {notas.erro && !negado && <ErroCarregamento erro={notas.erro} tentarNovamente={notas.recarregar} />}

      {notas.dados && (
        <>
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              salvar.executar();
            }}
            aria-labelledby="titulo-nova-nota"
          >
            <h2 id="titulo-nova-nota">Nova nota</h2>
            <ResumoErros erros={erros} />
            {salvar.erro && (
              <Alerta tom="erro" vivo>
                {mensagemAmigavel(salvar.erro)}
              </Alerta>
            )}
            <Campo
              tipo="area"
              id="conteudo"
              rotulo="Conteúdo da nota"
              dica="Reservado. Outros profissionais de saúde vinculados ao mesmo estudante também leem (equipe multiprofissional)."
              required
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              erro={erros.find((x) => x.campo === "conteudo")?.mensagem ?? null}
            />
            <div className="grupo-botoes">
              <Botao type="submit" carregando={salvar.ocupado} textoCarregando="Salvando…">
                Registrar nota reservada
              </Botao>
              <LinkBotao to={`/estudantes/${id}/observar`} variante="secundario">
                Registrar como observação (todos veem)
              </LinkBotao>
            </div>
          </form>

          <h2>Notas anteriores</h2>
          {notas.dados.length === 0 && (
            <EstadoVazio titulo="Nenhuma nota ainda">
              <p>Tudo que você escrever aqui fica visível só para profissionais de saúde vinculados.</p>
            </EstadoVazio>
          )}
          {notas.dados.map((n) => (
            <Card key={n.id} nivel={3}>
              <p className="meta">{formatarDataHora(n.dataRegistro)}</p>
              <p>{n.conteudo}</p>
            </Card>
          ))}
        </>
      )}
    </>
  );
}
