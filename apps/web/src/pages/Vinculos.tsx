import { useState } from "react";
import { api, mensagemAmigavel, type Papel, type Usuario, type Vinculo } from "../services";
import { useEstudante } from "../hooks/useEstudante";
import { useConsulta, useMutacao } from "../hooks/useConsulta";
import { useAnuncio } from "../hooks/useAnuncio";
import { useTitulo } from "../hooks/useTitulo";
import { CabecalhoEstudante } from "../components/CabecalhoEstudante";
import { Alerta, Badge, Card, Carregando, ErroCarregamento, ResumoErros } from "../components/Feedback";
import { Botao } from "../components/Botao";
import { Campo } from "../components/Campo";
import { Modal } from "../components/Modal";
import { PAPEL } from "../utils/rotulos";
import { formatarData } from "../utils/datas";
import { ConvidarPessoa } from "./ConvidarPessoa";

const PAPEIS: Papel[] = ["RESPONSAVEL", "DOCENTE", "PROFISSIONAL_SAUDE"];

/** P4.17 — HU-C.02/C.03: vincular e desativar vínculos; registro no conselho obrigatório para profissional (D-13). */
export function Vinculos() {
  const ctx = useEstudante();
  useTitulo("Vínculos", !ctx.carregando);
  const { anunciar } = useAnuncio();
  const [usuarioId, setUsuarioId] = useState("");
  const [papel, setPapel] = useState<Papel>("DOCENTE");
  const [registro, setRegistro] = useState("");
  const [conferido, setConferido] = useState(false);
  const [erros, setErros] = useState<{ campo: string; mensagem: string }[]>([]);
  const [desativando, setDesativando] = useState<Vinculo | null>(null);

  const id = ctx.dados?.estudante.id;
  const ehCoord = ctx.dados?.papel === "COORDENACAO";
  const dados = useConsulta<{ vinculos: Vinculo[]; usuarios: Usuario[] }>(async () => {
    if (!id || !ehCoord) return { vinculos: [], usuarios: [] };
    const [vinculos, usuarios] = await Promise.all([api.listarVinculos(id), api.listarUsuarios()]);
    return { vinculos, usuarios };
  }, [id, ehCoord]);

  const vincular = useMutacao(async () => {
    const lista: { campo: string; mensagem: string }[] = [];
    if (!usuarioId) lista.push({ campo: "usuario", mensagem: "Escolha a pessoa a vincular." });
    if (papel === "RESPONSAVEL" && !conferido) lista.push({ campo: "conferido", mensagem: "Confirme que o vínculo legal foi conferido presencialmente, com documento." });
    if (papel === "PROFISSIONAL_SAUDE" && !registro.trim()) lista.push({ campo: "registro", mensagem: "Informe o registro no conselho profissional (obrigatório para profissional de saúde)." });
    setErros(lista);
    if (lista.length > 0) return;
    const v = await api.vincular({ usuarioId, estudanteId: id!, papel, registroConselho: registro, conferidoPresencialmente: conferido });
    anunciar(
      v.status === "PENDENTE_RESPONSAVEL"
        ? "Proposta enviada. O profissional só terá acesso depois que a família confirmar."
        : "Vínculo criado.",
      "sucesso"
    );
    setUsuarioId("");
    setRegistro("");
    setConferido(false);
    dados.recarregar();
  });

  const desativar = useMutacao(async () => {
    await api.desativarVinculo(desativando!.id);
    setDesativando(null);
    anunciar("Vínculo desativado. A pessoa perdeu o acesso imediatamente; o histórico permanece.", "sucesso");
    dados.recarregar();
  });

  if (ctx.carregando) return <Carregando />;
  if (ctx.erro || !ctx.dados) return <ErroCarregamento erro={ctx.erro} tentarNovamente={ctx.recarregar} />;
  if (!ehCoord) {
    return (
      <>
        <CabecalhoEstudante contexto={ctx.dados} titulo="Vínculos" />
        <Alerta tom="info" titulo="Só a coordenação gerencia vínculos">Você vê apenas o seu próprio vínculo com o estudante.</Alerta>
      </>
    );
  }

  const nomeDe = (uid: string) => dados.dados?.usuarios.find((u) => u.id === uid)?.nome ?? uid;
  const ativos = dados.dados?.vinculos.filter((v) => v.status === "ATIVO") ?? [];
  const pendentes = dados.dados?.vinculos.filter((v) => v.status === "PENDENTE_RESPONSAVEL") ?? [];
  const inativos = dados.dados?.vinculos.filter((v) => v.status === "ENCERRADO" || v.status === "RECUSADO") ?? [];
  const jaVinculados = new Set([...ativos, ...pendentes].map((v) => v.usuarioId));

  return (
    <>
      <CabecalhoEstudante contexto={ctx.dados} titulo="Vínculos" descricao="Quem tem acesso a este estudante e com que papel. Trocou de professor? Desative um vínculo e crie outro — o histórico fica." />

      {dados.carregando && <Carregando />}
      {dados.erro && <ErroCarregamento erro={dados.erro} tentarNovamente={dados.recarregar} />}

      {dados.dados && (
        <>
          <Card titulo="Vínculos ativos">
            {ativos.length === 0 ? (
              <p className="meta">Ninguém vinculado ainda.</p>
            ) : (
              <ul className="lista-simples" aria-label="Vínculos ativos">
                {ativos.map((v) => (
                  <li key={v.id}>
                    <div>
                      <strong>{nomeDe(v.usuarioId)}</strong>
                      <div className="meta">
                        {PAPEL[v.papel]} · desde {formatarData(v.dataVinculo)}
                        {v.registroConselho && ` · ${v.registroConselho}`}
                      </div>
                    </div>
                    {v.papel !== "COORDENACAO" && v.papel !== "RESPONSAVEL" && (
                      <Botao variante="secundario" pequeno onClick={() => setDesativando(v)}>
                        Desativar
                      </Botao>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {pendentes.length > 0 && (
            <Card titulo="Aguardando a família">
              <p className="meta">Profissionais de saúde só passam a ter acesso depois que o responsável confirma.</p>
              <ul className="lista-simples" aria-label="Aguardando a família">
                {pendentes.map((v) => (
                  <li key={v.id}>
                    <div>
                      <strong>{nomeDe(v.usuarioId)}</strong>
                      <div className="meta">
                        {PAPEL[v.papel]}
                        {v.registroConselho && ` · ${v.registroConselho}`}
                      </div>
                    </div>
                    <Badge tom="aviso">Aguardando confirmação</Badge>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <ConvidarPessoa estudanteId={id!} aoConvidar={dados.recarregar} />

          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              vincular.executar();
            }}
            aria-labelledby="titulo-novo-vinculo"
            style={{ maxWidth: "var(--largura-leitura)" }}
          >
            <h2 id="titulo-novo-vinculo">Vincular quem já tem conta</h2>
            <ResumoErros erros={erros} />
            {vincular.erro && (
              <Alerta tom="erro" vivo>
                {mensagemAmigavel(vincular.erro)}
              </Alerta>
            )}
            <Campo tipo="select" id="usuario" rotulo="Pessoa" dica="No sistema real, o responsável é convidado por e-mail (HU-C.02)." required value={usuarioId} onChange={(e) => setUsuarioId(e.target.value)} erro={erros.find((x) => x.campo === "usuario")?.mensagem ?? null}>
              <option value="">Escolha…</option>
              {dados.dados.usuarios
                .filter((u) => !jaVinculados.has(u.id) && !u.papelInstitucional)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                    {u.email ? ` — ${u.email}` : ""}
                  </option>
                ))}
            </Campo>
            <fieldset>
              <legend>Papel</legend>
              {PAPEIS.map((p) => (
                <label key={p} className="opcao">
                  <input type="radio" name="papel" value={p} checked={papel === p} onChange={() => setPapel(p)} />
                  <span className="opcao__texto">
                    <span>{PAPEL[p]}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            {papel === "RESPONSAVEL" && (
              <div className={`campo${erros.some((x) => x.campo === "conferido") ? " campo--erro" : ""}`}>
                <label className="opcao" htmlFor="conferido">
                  <input
                    id="conferido"
                    type="checkbox"
                    checked={conferido}
                    onChange={(e) => setConferido(e.target.checked)}
                    aria-describedby={erros.some((x) => x.campo === "conferido") ? "conferido-erro" : undefined}
                    aria-invalid={erros.some((x) => x.campo === "conferido") || undefined}
                  />
                  <span className="opcao__texto">
                    <span>Conferi presencialmente, com documento, que esta pessoa é responsável legal</span>
                    <span className="opcao__descricao">O sistema não guarda cópia do documento; registra só que você conferiu e quando.</span>
                  </span>
                </label>
                {erros.some((x) => x.campo === "conferido") && (
                  <div id="conferido-erro" className="campo__erro">
                    {erros.find((x) => x.campo === "conferido")!.mensagem}
                  </div>
                )}
              </div>
            )}
            {papel === "PROFISSIONAL_SAUDE" && (
              <Campo id="registro" rotulo="Registro no conselho profissional" dica="Ex.: CREFITO, CRFa, CRP. Obrigatório para profissional de saúde." required value={registro} onChange={(e) => setRegistro(e.target.value)} erro={erros.find((x) => x.campo === "registro")?.mensagem ?? null} />
            )}
            <div className="grupo-botoes">
              <Botao type="submit" carregando={vincular.ocupado} textoCarregando="Vinculando…">
                Criar vínculo
              </Botao>
            </div>
          </form>

          {inativos.length > 0 && (
            <Card titulo="Vínculos encerrados" nivel={3}>
              <ul className="lista-simples">
                {inativos.map((v) => (
                  <li key={v.id}>
                    <span>
                      {nomeDe(v.usuarioId)} · {PAPEL[v.papel]}
                    </span>
                    <Badge>{v.status === "RECUSADO" ? "Recusado pela família" : "Encerrado"}</Badge>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}

      <Modal
        aberto={!!desativando}
        titulo="Desativar vínculo?"
        onFechar={() => setDesativando(null)}
        acoes={
          <Botao variante="perigo" onClick={() => desativar.executar()} carregando={desativar.ocupado} textoCarregando="Desativando…">
            Desativar
          </Botao>
        }
      >
        <p>
          {desativando && `${nomeDe(desativando.usuarioId)} (${PAPEL[desativando.papel]})`} perde o acesso imediatamente. As observações e materiais que já registrou permanecem no histórico.
        </p>
        {desativar.erro && (
          <Alerta tom="erro" vivo>
            {mensagemAmigavel(desativar.erro)}
          </Alerta>
        )}
      </Modal>
    </>
  );
}
