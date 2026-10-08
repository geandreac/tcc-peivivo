import { Link } from "react-router-dom";
import { api, mensagemAmigavel, type Estudante, type Notificacao, type TipoNotificacao } from "../services";
import { useConsulta, useMutacao } from "../hooks/useConsulta";
import { useTitulo } from "../hooks/useTitulo";
import { useAnuncio } from "../hooks/useAnuncio";
import { Alerta, Badge, Carregando, ErroCarregamento, EstadoVazio } from "../components/Feedback";
import { Botao } from "../components/Botao";
import { textoNotificacao } from "../utils/rotulos";
import { formatarDataHora } from "../utils/datas";

/** Para onde cada aviso leva: direto à tela onde a ação acontece. */
const DESTINO: Record<TipoNotificacao, (id: string) => string> = {
  PROFISSIONAL_AGUARDANDO_CONFIRMACAO: (id) => `/estudantes/${id}/privacidade`,
  VALIDACAO_PENDENTE: (id) => `/estudantes/${id}/validar`,
  VALIDACAO_EXPIRADA: (id) => `/estudantes/${id}`,
  REVISAO_SOLICITADA: (id) => `/estudantes/${id}/fechar-ciclo`,
  CONSENTIMENTO_CONCEDIDO: (id) => `/estudantes/${id}`,
  CONSENTIMENTO_REVOGADO: (id) => `/estudantes/${id}`,
  VINCULO_ATIVADO: (id) => `/estudantes/${id}`,
};

/** R4.7 — central de notificações (D-28): avisos tipados, sem texto livre nem motivo de revogação. */
export function Notificacoes() {
  useTitulo("Notificações");
  const { anunciar } = useAnuncio();
  const dados = useConsulta<{ lista: Notificacao[]; estudantes: Estudante[] }>(async () => {
    const [lista, estudantes] = await Promise.all([api.listarNotificacoes(), api.listarEstudantes()]);
    return { lista, estudantes };
  }, []);
  const marcar = useMutacao(async () => {
    await api.marcarNotificacoesLidas();
    anunciar("Todas as notificações foram marcadas como lidas.", "sucesso");
    dados.recarregar();
  });

  const nome = (id: string | null) => dados.dados?.estudantes.find((e) => e.id === id)?.nome ?? "um estudante";
  const naoLidas = dados.dados?.lista.filter((n) => !n.lidaEm).length ?? 0;

  return (
    <>
      <div className="cabecalho-pagina">
        <div>
          <h1>Notificações</h1>
          <p>Avisos sobre os estudantes que você acompanha. Nada aqui exige resposta imediata.</p>
        </div>
        {naoLidas > 0 && (
          <Botao variante="secundario" onClick={() => marcar.executar()} carregando={marcar.ocupado} textoCarregando="Marcando…">
            Marcar todas como lidas
          </Botao>
        )}
      </div>
      {marcar.erro && (
        <Alerta tom="erro" vivo>
          {mensagemAmigavel(marcar.erro)}
        </Alerta>
      )}
      {dados.carregando && <Carregando />}
      {dados.erro && <ErroCarregamento erro={dados.erro} tentarNovamente={dados.recarregar} />}
      {dados.dados && dados.dados.lista.length === 0 && (
        <EstadoVazio titulo="Nenhuma notificação">
          <p>Quando algo precisar da sua atenção — uma validação, uma autorização —, o aviso aparece aqui.</p>
        </EstadoVazio>
      )}
      {dados.dados && dados.dados.lista.length > 0 && (
        <ul className="lista-simples" aria-label="Notificações">
          {dados.dados.lista.map((n) => (
            <li key={n.id} className={n.lidaEm ? undefined : "notificacao--nova"}>
              <div>
                {n.estudanteId ? <Link to={DESTINO[n.tipo](n.estudanteId)}>{textoNotificacao(n.tipo, nome(n.estudanteId))}</Link> : textoNotificacao(n.tipo, "—")}
                <div className="meta">{formatarDataHora(n.criadaEm)}</div>
              </div>
              {!n.lidaEm && <Badge tom="info">Nova</Badge>}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
