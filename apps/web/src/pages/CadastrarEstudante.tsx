import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, mensagemAmigavel } from "../services";
import { useMutacao } from "../hooks/useConsulta";
import { useAnuncio } from "../hooks/useAnuncio";
import { useSessao } from "../hooks/useSessao";
import { useTitulo } from "../hooks/useTitulo";
import { Alerta, ResumoErros } from "../components/Feedback";
import { Botao, LinkBotao } from "../components/Botao";
import { Campo } from "../components/Campo";

/** P4.17 — HU-C.01: cadastro via RPC atômica (D-08). Só coordenação institucional. */
export function CadastrarEstudante() {
  useTitulo("Cadastrar estudante");
  const navigate = useNavigate();
  const { usuario } = useSessao();
  const { anunciar } = useAnuncio();
  const [nome, setNome] = useState("");
  const [nascimento, setNascimento] = useState("");
  const [turma, setTurma] = useState("");
  const [laudo, setLaudo] = useState("");
  const [erros, setErros] = useState<{ campo: string; mensagem: string }[]>([]);

  const cadastrar = useMutacao(async () => {
    const lista: { campo: string; mensagem: string }[] = [];
    if (nome.trim().length < 3) lista.push({ campo: "nome", mensagem: "Informe o nome do estudante (mínimo 3 letras)." });
    if (!nascimento) lista.push({ campo: "nascimento", mensagem: "Informe a data de nascimento." });
    else if (new Date(nascimento) > new Date()) lista.push({ campo: "nascimento", mensagem: "A data de nascimento precisa estar no passado." });
    if (laudo && new Date(laudo) > new Date()) lista.push({ campo: "laudo", mensagem: "A data do laudo precisa estar no passado." });
    setErros(lista);
    if (lista.length > 0) return;
    const e = await api.cadastrarEstudante({ nome, dataNascimento: nascimento, turma, laudoApresentadoEm: laudo || null });
    anunciar(`${e.nome} cadastrado(a). Agora vincule o responsável, a docente e o profissional.`, "sucesso");
    navigate(`/estudantes/${e.id}/vinculos`);
  });

  if (usuario?.papelInstitucional !== "COORDENACAO") {
    return (
      <>
        <h1>Cadastrar estudante</h1>
        <Alerta tom="erro" titulo="Só a coordenação pedagógica cadastra estudantes">
          <p>O cadastro é a única porta de entrada de um estudante e exige o papel institucional de coordenação (D-08).</p>
          <div className="grupo-botoes">
            <LinkBotao to="/painel" variante="secundario">
              Voltar
            </LinkBotao>
          </div>
        </Alerta>
      </>
    );
  }

  return (
    <>
      <div className="cabecalho-pagina">
        <div>
          <h1>Cadastrar estudante</h1>
          <p>Só o essencial. O sistema não guarda laudo, diagnóstico nem CID — apenas a data em que o laudo foi apresentado, se houver.</p>
        </div>
      </div>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          cadastrar.executar();
        }}
        style={{ maxWidth: "var(--largura-leitura)" }}
      >
        <ResumoErros erros={erros} />
        {cadastrar.erro && (
          <Alerta tom="erro" vivo>
            {mensagemAmigavel(cadastrar.erro)}
          </Alerta>
        )}
        <Campo id="nome" rotulo="Nome do estudante" dica="Use dados fictícios neste protótipo." required autoComplete="off" value={nome} onChange={(e) => setNome(e.target.value)} erro={erros.find((x) => x.campo === "nome")?.mensagem ?? null} />
        <Campo id="nascimento" type="date" rotulo="Data de nascimento" dica="Formato: dia/mês/ano." required value={nascimento} onChange={(e) => setNascimento(e.target.value)} erro={erros.find((x) => x.campo === "nascimento")?.mensagem ?? null} max={new Date().toISOString().slice(0, 10)} />
        <Campo id="turma" rotulo="Turma" opcional dica="Ex.: 4º ano B." value={turma} onChange={(e) => setTurma(e.target.value)} />
        <Campo id="laudo" type="date" rotulo="Data em que o laudo foi apresentado à escola" opcional dica="Só a data (D-01). Visível à coordenação, ao responsável e ao profissional — nunca à docente." value={laudo} onChange={(e) => setLaudo(e.target.value)} erro={erros.find((x) => x.campo === "laudo")?.mensagem ?? null} max={new Date().toISOString().slice(0, 10)} />
        <div className="grupo-botoes grupo-botoes--empilhado">
          <Botao type="submit" carregando={cadastrar.ocupado} textoCarregando="Cadastrando…">
            Cadastrar e vincular pessoas
          </Botao>
          <LinkBotao to="/painel" variante="secundario">
            Cancelar
          </LinkBotao>
        </div>
      </form>
    </>
  );
}
