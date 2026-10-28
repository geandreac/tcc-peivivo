import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { TETO } from "@pei-vivo/contratos";
import { api, mensagemAmigavel, type ConfiguracoesSistema, type Estudante, type Papel, type PerfilAcesso, type RespostaConvite } from "../services";
import { useConsulta, useMutacao } from "../hooks/useConsulta";
import { useSessao } from "../hooks/useSessao";
import { CabecalhoAdmin } from "../components/CabecalhoAdmin";
import { ErroAdmin } from "../components/Admin";
import { Alerta, Card, Esqueleto, ResumoErros, type ErroCampo } from "../components/Feedback";
import { Botao, LinkBotao } from "../components/Botao";
import { Campo } from "../components/Campo";
import { PAPEL_BASE, rotuloPermissao } from "../utils/rotulos";
import { formatarData } from "../utils/datas";

interface Contexto {
  escolas: { id: string; nome: string }[];
  perfis: PerfilAcesso[];
  configuracoes: ConfiguracoesSistema;
  /** Só a coordenação vê estudantes (o Administrador Geral nunca vê, D-50). */
  estudantes: Estudante[];
}

interface Formulario {
  nome: string;
  email: string;
  papel: Papel;
  escolaId: string;
  organizacao: string;
  estudanteId: string;
  registroConselho: string;
  conferidoPresencialmente: boolean;
  perfilId: string;
  removidas: string[];
  validade: string;
  aprovacao: "IMEDIATO" | "APROVACAO";
}

const ETAPAS = ["Pessoa e organização", "Perfil e permissões", "Validade e convite", "Revisão"] as const;
const externo = (p: Papel) => p === "RESPONSAVEL" || p === "PROFISSIONAL_SAUDE";
const emDias = (dias: number) => {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
};

/** D-50 — Criar acesso, por etapas. O convite sai por e-mail com link de uso único (7 dias). */
export function AdminCriarAcesso() {
  const { usuario } = useSessao();
  const geral = usuario?.papelPlataforma === "ADMIN_GERAL";
  const consulta = useConsulta<Contexto>(async () => {
    const [escolas, perfis, configuracoes, estudantes] = await Promise.all([
      api.adminListarEscolas(),
      api.adminListarPerfis(),
      api.adminConfiguracoes(),
      geral ? Promise.resolve([]) : api.listarEstudantes(),
    ]);
    return { escolas, perfis, configuracoes, estudantes };
  }, [geral]);

  return (
    <>
      <Link to="/admin/usuarios" className="voltar">
        <span aria-hidden="true">←</span> Usuários e acessos
      </Link>
      <CabecalhoAdmin titulo="Criar acesso" descricao="Cadastre uma pessoa e envie o convite por e-mail. A conta só existe depois que ela criar a senha." />
      {consulta.carregando && <Esqueleto texto="Preparando o formulário…" forma="cartao" />}
      {consulta.erro && <ErroAdmin erro={consulta.erro} tentarNovamente={consulta.recarregar} />}
      {consulta.dados && <Assistente contexto={consulta.dados} geral={geral} />}
    </>
  );
}

function Assistente({ contexto: c, geral }: { contexto: Contexto; geral: boolean }) {
  const [etapa, setEtapa] = useState(0);
  const [erros, setErros] = useState<ErroCampo[]>([]);
  const [resposta, setResposta] = useState<RespostaConvite | null>(null);
  const titulo = useRef<HTMLHeadingElement>(null);
  const [f, setF] = useState<Formulario>({
    nome: "",
    email: "",
    papel: "DOCENTE",
    escolaId: c.escolas.length === 1 ? c.escolas[0]!.id : "",
    organizacao: "",
    estudanteId: "",
    registroConselho: "",
    conferidoPresencialmente: false,
    perfilId: "",
    removidas: [],
    validade: "",
    aprovacao: "IMEDIATO",
  });
  const muda = <K extends keyof Formulario>(k: K, v: Formulario[K]) => setF((x) => ({ ...x, [k]: v }));
  const papeis: Papel[] = geral ? ["DOCENTE", "COORDENACAO"] : ["DOCENTE", "RESPONSAVEL", "PROFISSIONAL_SAUDE"];
  const perfisDoPapel = c.perfis.filter((p) => !p.arquivadoEm && !p.sistema && p.papelBase === f.papel);
  const perfil = perfisDoPapel.find((p) => p.id === f.perfilId);
  const permissoes = perfil ? perfil.permissoes : [...TETO[f.papel]];
  const erroDe = (campo: string) => erros.find((e) => e.campo === campo)?.mensagem ?? null;

  function validar(n: number): ErroCampo[] {
    const lista: ErroCampo[] = [];
    if (n === 0) {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/u.test(f.email.trim())) lista.push({ campo: "email", mensagem: "Informe um e-mail válido." });
      if (!f.escolaId) lista.push({ campo: "escola", mensagem: "Escolha a escola." });
      if (externo(f.papel) && !f.estudanteId) lista.push({ campo: "estudante", mensagem: "Escolha o estudante." });
      if (f.papel === "PROFISSIONAL_SAUDE" && !f.registroConselho.trim())
        lista.push({ campo: "registro", mensagem: "Informe o registro no conselho profissional." });
      if (f.papel === "RESPONSAVEL" && !f.conferidoPresencialmente)
        lista.push({ campo: "conferido", mensagem: "Confirme que o vínculo legal foi conferido presencialmente." });
    }
    if (n === 2 && f.validade && new Date(`${f.validade}T23:59:59`) <= new Date()) {
      lista.push({ campo: "validade", mensagem: "Escolha uma data futura, ou deixe em branco para não ter prazo." });
    }
    return lista;
  }
  function avancar() {
    const lista = validar(etapa);
    setErros(lista);
    if (lista.length) return;
    if (etapa === 0 && externo(f.papel)) {
      // externos: padrão das configurações (validade e aprovação)
      setF((x) => ({
        ...x,
        validade: x.validade || emDias(c.configuracoes.validadePadraoDias),
        aprovacao: c.configuracoes.exigirAprovacaoExternos ? "APROVACAO" : x.aprovacao,
      }));
    }
    setEtapa((e) => e + 1);
    requestAnimationFrame(() => titulo.current?.focus());
  }

  const enviar = useMutacao(async () => {
    const r = await api.convidar({
      email: f.email.trim(),
      nome: f.nome.trim(),
      papel: f.papel,
      escolaId: f.escolaId,
      estudanteId: externo(f.papel) ? f.estudanteId : null,
      registroConselho: f.papel === "PROFISSIONAL_SAUDE" ? f.registroConselho.trim() : null,
      conferidoPresencialmente: f.conferidoPresencialmente,
      perfilId: f.perfilId || null,
      permissoesRemovidas: f.removidas.filter((x) => permissoes.includes(x)),
      organizacao: f.organizacao.trim() || null,
      acessoExpiraEm: f.validade ? new Date(`${f.validade}T23:59:59`).toISOString() : null,
      exigeAprovacao: f.aprovacao === "APROVACAO",
    });
    setResposta(r);
  });

  if (resposta) {
    return (
      <Alerta tom="sucesso" titulo="Convite enviado" vivo>
        <p>
          {resposta.emailEnviado ? `Enviamos o convite para ${f.email.trim()}.` : `${f.email.trim()} já tinha conta: o acesso novo vale no próximo login.`}{" "}
          {resposta.exigeAprovacao && "O acesso só passa a valer depois da aprovação, em Usuários e acessos."}
        </p>
        {resposta.avisos.map((a) => (
          <p key={a}>{a}</p>
        ))}
        <div className="grupo-botoes">
          <LinkBotao to="/admin/usuarios">Ver usuários e acessos</LinkBotao>
          <LinkBotao to="/admin" variante="secundario">
            Voltar à visão geral
          </LinkBotao>
        </div>
      </Alerta>
    );
  }

  return (
    <div className="formulario">
      <ol className="etapas" aria-label="Etapas do cadastro">
        {ETAPAS.map((nome, i) => (
          <li key={nome} aria-current={i === etapa ? "step" : undefined} className={i < etapa ? "etapas__feita" : undefined}>
            <span className="etapas__numero">{i + 1}</span> {nome}
          </li>
        ))}
      </ol>
      <h2 ref={titulo} tabIndex={-1}>
        Etapa {etapa + 1} de {ETAPAS.length}: {ETAPAS[etapa]}
      </h2>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (etapa < ETAPAS.length - 1) avancar();
          else enviar.executar();
        }}
      >
        <ResumoErros erros={erros} />

        {etapa === 0 && (
          <>
            <Campo id="nome" rotulo="Nome" autoComplete="off" value={f.nome} onChange={(e) => muda("nome", e.target.value)} opcional maxLength={120} />
            <Campo
              id="email"
              rotulo="E-mail"
              type="email"
              autoComplete="off"
              required
              value={f.email}
              onChange={(e) => muda("email", e.target.value)}
              erro={erroDe("email")}
            />
            <fieldset>
              <legend>Papel</legend>
              {papeis.map((p) => (
                <label key={p} className="opcao" htmlFor={`papel-${p}`}>
                  <input
                    id={`papel-${p}`}
                    type="radio"
                    name="papel"
                    checked={f.papel === p}
                    onChange={() => setF((x) => ({ ...x, papel: p, perfilId: "", removidas: [] }))}
                  />
                  <span className="opcao__texto">{PAPEL_BASE[p]}</span>
                </label>
              ))}
              {geral && (
                <p className="texto-apoio">
                  Responsável e profissional de saúde são convidados pela coordenação da escola, que conhece o estudante. A administração geral nunca vê
                  estudantes.
                </p>
              )}
            </fieldset>
            <Campo
              id="escola"
              tipo="select"
              rotulo="Escola"
              required
              value={f.escolaId}
              onChange={(e) => muda("escolaId", e.target.value)}
              erro={erroDe("escola")}
            >
              <option value="">Escolha…</option>
              {c.escolas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </Campo>
            {externo(f.papel) && (
              <>
                <Campo
                  id="estudante"
                  tipo="select"
                  rotulo="Estudante"
                  required
                  value={f.estudanteId}
                  onChange={(e) => muda("estudanteId", e.target.value)}
                  erro={erroDe("estudante")}
                >
                  <option value="">Escolha…</option>
                  {c.estudantes.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nome}
                    </option>
                  ))}
                </Campo>
                <Campo
                  id="organizacao"
                  rotulo="Organização"
                  dica="Clínica, consultório ou instituição de quem é de fora da escola."
                  value={f.organizacao}
                  onChange={(e) => muda("organizacao", e.target.value)}
                  opcional
                  maxLength={120}
                />
              </>
            )}
            {f.papel === "PROFISSIONAL_SAUDE" && (
              <Campo
                id="registro"
                rotulo="Registro no conselho profissional"
                required
                value={f.registroConselho}
                onChange={(e) => muda("registroConselho", e.target.value)}
                erro={erroDe("registro")}
                maxLength={60}
              />
            )}
            {f.papel === "RESPONSAVEL" && (
              <div className="campo">
                <label className="opcao" htmlFor="conferido">
                  <input
                    id="conferido"
                    type="checkbox"
                    checked={f.conferidoPresencialmente}
                    onChange={(e) => muda("conferidoPresencialmente", e.target.checked)}
                    aria-invalid={erroDe("conferido") ? true : undefined}
                    aria-describedby={erroDe("conferido") ? "conferido-erro" : undefined}
                  />
                  <span className="opcao__texto">Conferi presencialmente, com documento, que esta pessoa é responsável legal do estudante.</span>
                </label>
                {erroDe("conferido") && (
                  <div id="conferido-erro" className="campo__erro">
                    {erroDe("conferido")}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {etapa === 1 && (
          <>
            <Campo
              id="perfil"
              tipo="select"
              rotulo="Perfil de acesso"
              dica="Perfis derivados só restringem: nenhum vai além do que o papel permite."
              value={f.perfilId}
              onChange={(e) => setF((x) => ({ ...x, perfilId: e.target.value, removidas: [] }))}
            >
              <option value="">{PAPEL_BASE[f.papel]} (padrão do papel)</option>
              {perfisDoPapel.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </Campo>
            <fieldset>
              <legend>Ferramentas e permissões autorizadas</legend>
              {permissoes.length === 0 ? (
                <p className="texto-apoio">Este papel não usa ferramentas de estudante: administra a escola.</p>
              ) : (
                permissoes.map((chave) => (
                  <label key={chave} className="opcao" htmlFor={`acesso-${chave}`}>
                    <input
                      id={`acesso-${chave}`}
                      type="checkbox"
                      checked={!f.removidas.includes(chave)}
                      onChange={(e) => muda("removidas", e.target.checked ? f.removidas.filter((x) => x !== chave) : [...f.removidas, chave])}
                    />
                    <span className="opcao__texto">{rotuloPermissao(chave)}</span>
                  </label>
                ))
              )}
            </fieldset>
          </>
        )}

        {etapa === 2 && (
          <>
            <Campo
              id="validade"
              type="date"
              rotulo="Acesso válido até"
              dica={`Depois desta data a pessoa deixa de entrar. Em branco: sem prazo. Padrão para quem é de fora: ${c.configuracoes.validadePadraoDias} dias.`}
              value={f.validade}
              onChange={(e) => muda("validade", e.target.value)}
              erro={erroDe("validade")}
              opcional
            />
            <fieldset>
              <legend>Quando o acesso começa a valer</legend>
              <label className="opcao" htmlFor="aprovacao-imediato">
                <input
                  id="aprovacao-imediato"
                  type="radio"
                  name="aprovacao"
                  checked={f.aprovacao === "IMEDIATO"}
                  onChange={() => muda("aprovacao", "IMEDIATO")}
                />
                <span className="opcao__texto">Assim que a pessoa criar a senha</span>
              </label>
              <label className="opcao" htmlFor="aprovacao-depois">
                <input
                  id="aprovacao-depois"
                  type="radio"
                  name="aprovacao"
                  checked={f.aprovacao === "APROVACAO"}
                  onChange={() => muda("aprovacao", "APROVACAO")}
                />
                <span className="opcao__texto">Só depois de uma aprovação em Usuários e acessos</span>
              </label>
            </fieldset>
            <Alerta tom="info" titulo="Convite por e-mail">
              O convite sai por e-mail com um link de uso único, válido por 7 dias. Nele a pessoa cria a senha e aceita os termos de uso.
            </Alerta>
          </>
        )}

        {etapa === 3 && (
          <Card titulo="Confira antes de enviar" nivel={3}>
            <dl className="dados">
              <dt>Pessoa</dt>
              <dd>
                {f.nome.trim() || "(sem nome)"} · {f.email.trim()}
              </dd>
              <dt>Papel e escola</dt>
              <dd>
                {PAPEL_BASE[f.papel]} · {c.escolas.find((e) => e.id === f.escolaId)?.nome}
              </dd>
              {f.organizacao.trim() && (
                <>
                  <dt>Organização</dt>
                  <dd>{f.organizacao.trim()}</dd>
                </>
              )}
              <dt>Perfil</dt>
              <dd>{perfil?.nome ?? `${PAPEL_BASE[f.papel]} (padrão)`}</dd>
              <dt>Permissões</dt>
              <dd>
                {permissoes
                  .filter((x) => !f.removidas.includes(x))
                  .map(rotuloPermissao)
                  .join("; ") || "Nenhuma ferramenta de estudante"}
              </dd>
              <dt>Validade</dt>
              <dd>{f.validade ? formatarData(f.validade) : "Sem prazo"}</dd>
              <dt>Começa a valer</dt>
              <dd>{f.aprovacao === "APROVACAO" ? "Depois da aprovação" : "Assim que criar a senha"}</dd>
            </dl>
          </Card>
        )}

        {enviar.erro && (
          <Alerta tom="erro" vivo>
            {mensagemAmigavel(enviar.erro)}
          </Alerta>
        )}
        <div className="grupo-botoes">
          {etapa > 0 && (
            <Botao variante="secundario" onClick={() => setEtapa((e) => e - 1)} disabled={enviar.ocupado}>
              Voltar
            </Botao>
          )}
          <Botao type="submit" carregando={enviar.ocupado} textoCarregando="Enviando convite…">
            {etapa < ETAPAS.length - 1 ? "Continuar" : "Enviar convite"}
          </Botao>
        </div>
      </form>
    </div>
  );
}
