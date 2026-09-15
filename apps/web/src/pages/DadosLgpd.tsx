import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, mensagemAmigavel, type ExportacaoEstudante } from "../services";
import { useEstudante } from "../hooks/useEstudante";
import { useMutacao } from "../hooks/useConsulta";
import { useAnuncio } from "../hooks/useAnuncio";
import { useTitulo } from "../hooks/useTitulo";
import { CabecalhoEstudante } from "../components/CabecalhoEstudante";
import { Alerta, Card, Carregando, ErroCarregamento } from "../components/Feedback";
import { Botao } from "../components/Botao";
import { Campo } from "../components/Campo";
import { Modal } from "../components/Modal";

/** HU-R.05 / HU-R.06 — RF15 (LGPD art. 18): exportar (R e C) e excluir (só R, dupla confirmação). */
export function DadosLgpd() {
  const ctx = useEstudante();
  useTitulo("Meus dados", !ctx.carregando);
  const navigate = useNavigate();
  const { anunciar } = useAnuncio();
  const [exportacao, setExportacao] = useState<ExportacaoEstudante | null>(null);
  const [modalExcluir, setModalExcluir] = useState(false);
  const [confirmacao, setConfirmacao] = useState("");
  const [erroConfirmacao, setErroConfirmacao] = useState<string | null>(null);

  const id = ctx.dados?.estudante.id;
  const exportar = useMutacao(async () => {
    const e = await api.exportarDados(id!);
    setExportacao(e);
    anunciar("Exportação pronta. O conteúdo está exibido abaixo em formato legível.", "sucesso");
  });
  const excluir = useMutacao(async () => {
    if (confirmacao.trim() !== ctx.dados!.estudante.nome) {
      setErroConfirmacao("Digite o nome do estudante exatamente como aparece para confirmar.");
      return;
    }
    setErroConfirmacao(null);
    await api.excluirEstudante(id!, confirmacao);
    setModalExcluir(false);
    anunciar("Todos os dados do estudante foram excluídos definitivamente.", "sucesso", { assertivo: true });
    navigate("/painel");
  });

  if (ctx.carregando) return <Carregando />;
  if (ctx.erro || !ctx.dados) return <ErroCarregamento erro={ctx.erro} tentarNovamente={ctx.recarregar} />;

  const { estudante, papel } = ctx.dados;
  if (papel !== "RESPONSAVEL" && papel !== "COORDENACAO") {
    return (
      <>
        <CabecalhoEstudante contexto={ctx.dados} titulo="Dados do estudante" />
        <Alerta tom="info" titulo="Exportação e exclusão são do responsável legal">A coordenação pode exportar o histórico; docente e profissional não têm esta função.</Alerta>
      </>
    );
  }

  return (
    <>
      <CabecalhoEstudante contexto={ctx.dados} titulo="Dados do estudante" descricao="Seus direitos pela LGPD: ver tudo em formato legível e, se for o responsável, apagar tudo." />

      <Card titulo="Exportar">
        <p>
          Gera um arquivo com estudante, vínculos, consentimentos, ciclos, observações, versões de perfil, materiais aprovados, desfechos e
          auditoria. <strong>Não inclui</strong> notas clínicas — elas não pertencem ao responsável (D-05).
        </p>
        {exportar.erro && (
          <Alerta tom="erro" vivo>
            {mensagemAmigavel(exportar.erro)}
          </Alerta>
        )}
        <div className="grupo-botoes">
          <Botao onClick={() => exportar.executar()} carregando={exportar.ocupado} textoCarregando="Preparando…">
            Exportar dados
          </Botao>
        </div>
        {exportacao && (
          <details open style={{ marginTop: "var(--esp-4)" }}>
            <summary>Conteúdo exportado ({new Date(exportacao.geradoEm).toLocaleString("pt-BR")})</summary>
            <pre aria-label="Dados exportados em JSON" tabIndex={0} style={{ maxHeight: "24rem", overflow: "auto" }}>
              {JSON.stringify(exportacao, null, 2)}
            </pre>
          </details>
        )}
      </Card>

      {papel === "RESPONSAVEL" && (
        <Card titulo="Excluir definitivamente">
          <p>
            Apaga o estudante e tudo ligado a ele — inclusive as anotações do profissional de saúde. Fica apenas um registro de que a exclusão
            aconteceu, sem dados pessoais. <strong>Não dá para desfazer.</strong>
          </p>
          <div className="grupo-botoes">
            <Botao variante="perigo" onClick={() => setModalExcluir(true)}>
              Excluir todos os dados
            </Botao>
          </div>
        </Card>
      )}

      <Modal
        aberto={modalExcluir}
        titulo="Excluir todos os dados?"
        onFechar={() => {
          setModalExcluir(false);
          setConfirmacao("");
          setErroConfirmacao(null);
        }}
        acoes={
          <Botao variante="perigo" onClick={() => excluir.executar()} carregando={excluir.ocupado} textoCarregando="Excluindo…">
            Excluir definitivamente
          </Botao>
        }
      >
        <p>Para confirmar, digite o nome do estudante exatamente como aparece:</p>
        <p>
          <strong>{estudante.nome}</strong>
        </p>
        {excluir.erro && (
          <Alerta tom="erro" vivo>
            {mensagemAmigavel(excluir.erro)}
          </Alerta>
        )}
        <Campo id="confirmacao" rotulo="Nome do estudante" required autoComplete="off" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} erro={erroConfirmacao} />
      </Modal>
    </>
  );
}
