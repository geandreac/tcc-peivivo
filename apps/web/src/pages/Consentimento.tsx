import { useState } from "react";
import { api, mensagemAmigavel, type Auditoria, type EscopoConsentimento } from "../services";
import { useEstudante } from "../hooks/useEstudante";
import { useConsulta, useMutacao } from "../hooks/useConsulta";
import { useAnuncio } from "../hooks/useAnuncio";
import { useTitulo } from "../hooks/useTitulo";
import { CabecalhoEstudante } from "../components/CabecalhoEstudante";
import { Alerta, Badge, Card, Carregando, ErroCarregamento, ResumoErros } from "../components/Feedback";
import { Botao } from "../components/Botao";
import { Modal } from "../components/Modal";
import { ESCOPO, EVENTO, PAPEL } from "../utils/rotulos";
import { formatarDataHora } from "../utils/datas";

const TODOS: EscopoConsentimento[] = ["observacao_pedagogica", "observacao_domiciliar", "geracao_material"];

/** HU-R.01 / HU-R.02 — termo em linguagem simples, escopos, um botão; revogação com dupla confirmação; trilha de auditoria. */
export function Consentimento() {
  const ctx = useEstudante();
  useTitulo("Consentimento", !ctx.carregando);
  const { anunciar } = useAnuncio();
  const [escopos, setEscopos] = useState<EscopoConsentimento[]>(TODOS);
  const [liTermo, setLiTermo] = useState(false);
  const [erros, setErros] = useState<{ campo: string; mensagem: string }[]>([]);
  const [modalRevogar, setModalRevogar] = useState(false);
  const [confirmoRevogacao, setConfirmoRevogacao] = useState(false);

  const id = ctx.dados?.estudante.id;
  const ehResponsavel = ctx.dados?.papel === "RESPONSAVEL";
  const podeVerAuditoria = ehResponsavel || ctx.dados?.papel === "COORDENACAO";
  const auditoria = useConsulta<Auditoria[]>(async () => (id && podeVerAuditoria ? api.listarAuditoria(id) : []), [id, podeVerAuditoria]);

  const conceder = useMutacao(async () => {
    const lista: { campo: string; mensagem: string }[] = [];
    if (escopos.length === 0) lista.push({ campo: "escopo-observacao_pedagogica", mensagem: "Escolha ao menos um item para autorizar." });
    if (!liTermo) lista.push({ campo: "li-termo", mensagem: "Confirme que leu o termo antes de autorizar." });
    setErros(lista);
    if (lista.length > 0) return;
    await api.concederConsentimento(id!, escopos);
    anunciar("Consentimento registrado. O perfil do estudante já pode ser construído.", "sucesso");
    ctx.recarregar();
    auditoria.recarregar();
  });

  const revogar = useMutacao(async () => {
    await api.revogarConsentimento(id!);
    setModalRevogar(false);
    setConfirmoRevogacao(false);
    anunciar("Consentimento revogado. Geração e escrita bloqueadas imediatamente.", "sucesso");
    ctx.recarregar();
    auditoria.recarregar();
  });

  if (ctx.carregando) return <Carregando />;
  if (ctx.erro || !ctx.dados) return <ErroCarregamento erro={ctx.erro} tentarNovamente={ctx.recarregar} />;

  const { estudante, consentimento, consentimentoAtivo } = ctx.dados;

  return (
    <>
      <CabecalhoEstudante contexto={ctx.dados} titulo="Consentimento" descricao="Sem a autorização do responsável legal, nenhum dado é registrado e nenhum material é gerado." />

      <Card titulo="O que este termo autoriza — em linguagem simples">
        <p>
          <strong>O que será registrado.</strong> Observações sobre como {estudante.nome} lida com leitura, instruções e tarefas — pela escola, por
          você e pelo profissional de saúde. Numa escala de três pontos, com um comentário livre opcional.
        </p>
        <p>
          <strong>O que NÃO será registrado.</strong> Laudo, diagnóstico ou CID. O sistema não guarda nada disso. A professora nunca vê a nota
          clínica do profissional de saúde.
        </p>
        <p>
          <strong>Quem vê o quê.</strong> Todos os vinculados leem as observações. Só a professora vê rascunhos de material; você vê o que foi
          aprovado e se funcionou. Só profissionais de saúde leem a nota clínica.
        </p>
        <p>
          <strong>Por quanto tempo.</strong> Enquanto o consentimento estiver ativo. Você pode revogar a qualquer momento: a geração de material
          para imediatamente e a professora e o profissional deixam de acessar os dados. Você e a coordenação continuam vendo o histórico.
        </p>
        <p>
          <strong>Seus direitos.</strong> Exportar todos os dados em formato legível e excluir tudo definitivamente — inclusive as anotações do
          profissional de saúde, que mantém o registro dele fora do sistema (LGPD, art. 18).
        </p>
      </Card>

      {consentimento && (
        <Card titulo="Situação atual">
          <div className="chips" style={{ marginBottom: "var(--esp-3)" }}>
            <Badge tom={consentimentoAtivo ? "sucesso" : "erro"}>{consentimentoAtivo ? "Ativo" : consentimento.status === "REVOGADO" ? "Revogado" : "Expirado"}</Badge>
            <span className="meta">Concedido em {formatarDataHora(consentimento.dataConcessao)}</span>
            {consentimento.dataRevogacao && <span className="meta">· revogado em {formatarDataHora(consentimento.dataRevogacao)}</span>}
          </div>
          <ul>
            {consentimento.escopo.map((e) => (
              <li key={e}>{ESCOPO[e].titulo}</li>
            ))}
          </ul>
          {ehResponsavel && consentimentoAtivo && (
            <div className="grupo-botoes">
              <Botao variante="perigo" onClick={() => setModalRevogar(true)}>
                Revogar consentimento
              </Botao>
            </div>
          )}
        </Card>
      )}

      {ehResponsavel && !consentimentoAtivo && (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            conceder.executar();
          }}
          aria-labelledby="titulo-autorizar"
        >
          <h2 id="titulo-autorizar">Autorizar</h2>
          <ResumoErros erros={erros} />
          {conceder.erro && (
            <Alerta tom="erro" vivo>
              {mensagemAmigavel(conceder.erro)}
            </Alerta>
          )}
          <fieldset aria-describedby="dica-escopo">
            <legend>O que você autoriza</legend>
            <p id="dica-escopo" className="campo__dica">
              Marque pelo menos um. Você pode autorizar tudo ou só parte.
            </p>
            {TODOS.map((esc) => (
              <label key={esc} className="opcao">
                <input
                  type="checkbox"
                  id={`escopo-${esc}`}
                  checked={escopos.includes(esc)}
                  onChange={(e) => setEscopos((atual) => (e.target.checked ? [...atual, esc] : atual.filter((x) => x !== esc)))}
                />
                <span className="opcao__texto">
                  <span>{ESCOPO[esc].titulo}</span>
                  <span className="opcao__descricao">{ESCOPO[esc].descricao}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <label className="opcao">
            <input type="checkbox" id="li-termo" checked={liTermo} onChange={(e) => setLiTermo(e.target.checked)} aria-invalid={erros.some((x) => x.campo === "li-termo") || undefined} />
            <span className="opcao__texto">
              <span>Li e entendi o termo acima.</span>
              <span className="opcao__descricao">Você pode voltar aqui e revogar quando quiser.</span>
            </span>
          </label>
          <div className="grupo-botoes">
            <Botao type="submit" largo carregando={conceder.ocupado} textoCarregando="Registrando…">
              Autorizo
            </Botao>
          </div>
        </form>
      )}

      {!ehResponsavel && (
        <Alerta tom="info" titulo="Somente leitura">
          Conceder e revogar o consentimento é exclusivo do responsável legal. Você vê esta tela para saber se pode operar.
        </Alerta>
      )}

      {podeVerAuditoria && (
        <>
          <h2>Trilha de auditoria</h2>
          {auditoria.carregando && <Carregando />}
          {auditoria.erro && <ErroCarregamento erro={auditoria.erro} tentarNovamente={auditoria.recarregar} />}
          {auditoria.dados && auditoria.dados.length === 0 && <p className="meta">Nenhum evento registrado ainda.</p>}
          {auditoria.dados && auditoria.dados.length > 0 && (
            <ol className="linha-tempo">
              {auditoria.dados.map((a) => (
                <li key={a.id}>
                  <time dateTime={a.data}>{formatarDataHora(a.data)}</time>
                  <span>{EVENTO[a.evento]}</span>
                </li>
              ))}
            </ol>
          )}
        </>
      )}

      <Modal
        aberto={modalRevogar}
        titulo="Revogar o consentimento?"
        onFechar={() => {
          setModalRevogar(false);
          setConfirmoRevogacao(false);
        }}
        acoes={
          <Botao variante="perigo" onClick={() => revogar.executar()} disabled={!confirmoRevogacao} carregando={revogar.ocupado} textoCarregando="Revogando…">
            Sim, revogar agora
          </Botao>
        }
      >
        <p>
          A partir de agora, ninguém gera material nem registra observações sobre {estudante.nome}. A professora e o profissional de saúde deixam de
          ver os dados. Você e a coordenação continuam vendo o histórico. Uma nova autorização reabre tudo.
        </p>
        {revogar.erro && (
          <Alerta tom="erro" vivo>
            {mensagemAmigavel(revogar.erro)}
          </Alerta>
        )}
        <label className="opcao">
          <input type="checkbox" checked={confirmoRevogacao} onChange={(e) => setConfirmoRevogacao(e.target.checked)} />
          <span className="opcao__texto">
            <span>Entendo as consequências e quero revogar.</span>
          </span>
        </label>
      </Modal>

      <p className="meta">
        Quem escreve aqui: {PAPEL.RESPONSAVEL}. Quem lê: todos os vinculados (para saber se podem operar).
      </p>
    </>
  );
}
