/** Peças do painel administrativo (D-50) usadas por mais de uma tela. */
import { useState, type ReactNode } from "react";
import { ehErroApi, mensagemAmigavel, type SituacaoAcesso } from "../services";
import { SITUACAO } from "../utils/rotulos";
import { Alerta, Badge, ErroCarregamento } from "./Feedback";
import { Botao } from "./Botao";
import { Campo } from "./Campo";
import { Modal } from "./Modal";

/** Situação sempre em texto (WCAG 1.4.1); a cor só reforça. */
export function EtiquetaSituacao({ situacao }: { situacao: SituacaoAcesso }) {
  const s = SITUACAO[situacao];
  return <Badge tom={s.tom}>{s.texto}</Badge>;
}

/** Erro de carregamento; NEGADO explica quem pode abrir o painel (o banco decide, a tela só explica). */
export function ErroAdmin({ erro, tentarNovamente }: { erro: unknown; tentarNovamente?: () => void }) {
  if (ehErroApi(erro) && erro.codigo === "NEGADO") {
    return (
      <Alerta tom="erro" titulo="Acesso não permitido" vivo>
        <p>{mensagemAmigavel(erro)}</p>
        <p>O painel administrativo é do Administrador Geral e da coordenação pedagógica, com verificação em duas etapas.</p>
      </Alerta>
    );
  }
  return <ErroCarregamento erro={erro} tentarNovamente={tentarNovamente} />;
}

export interface AcaoCritica {
  titulo: string;
  /** O que acontece, em linguagem simples (heurística 5 de Nielsen: prevenir erros). */
  efeito: ReactNode;
  confirmar: string;
  perigo?: boolean;
  /** Pede um motivo de 5 a 300 caracteres (vai para o cadastro da pessoa, não para a trilha). */
  pedeMotivo?: boolean;
  executar: (motivo: string) => Promise<unknown>;
}

/** Alerta antes de toda ação crítica: diz o efeito, pede motivo quando exigido e mostra o erro do banco. */
export function ConfirmarAcao({ acao, onFechar, onConcluir }: { acao: AcaoCritica | null; onFechar: () => void; onConcluir: () => void }) {
  const [motivo, setMotivo] = useState("");
  const [erroMotivo, setErroMotivo] = useState<string | null>(null);
  const [erro, setErro] = useState<unknown>(null);
  const [ocupado, setOcupado] = useState(false);

  const fechar = () => {
    setMotivo("");
    setErroMotivo(null);
    setErro(null);
    onFechar();
  };

  async function confirmar() {
    if (!acao) return;
    if (acao.pedeMotivo && (motivo.trim().length < 5 || motivo.trim().length > 300)) {
      setErroMotivo("Escreva o motivo, de 5 a 300 caracteres.");
      return;
    }
    setErroMotivo(null);
    setOcupado(true);
    setErro(null);
    try {
      await acao.executar(motivo.trim());
      setMotivo("");
      onConcluir();
    } catch (e) {
      setErro(e);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Modal
      aberto={acao !== null}
      titulo={acao?.titulo ?? ""}
      onFechar={fechar}
      acoes={
        <>
          <Botao variante="secundario" onClick={fechar} disabled={ocupado}>
            Cancelar
          </Botao>
          <Botao variante={acao?.perigo ? "perigo" : "primario"} onClick={confirmar} carregando={ocupado} textoCarregando="Salvando…">
            {acao?.confirmar ?? "Confirmar"}
          </Botao>
        </>
      }
    >
      {acao && (
        <>
          <div>{acao.efeito}</div>
          {acao.pedeMotivo && (
            <Campo
              id="motivo-acao"
              tipo="area"
              rotulo="Motivo"
              dica="Fica registrado no cadastro da pessoa. Não aparece na trilha de atividades."
              required
              maxLength={300}
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              erro={erroMotivo}
            />
          )}
          {erro != null && (
            <Alerta tom="erro" vivo>
              {mensagemAmigavel(erro)}
            </Alerta>
          )}
        </>
      )}
    </Modal>
  );
}
