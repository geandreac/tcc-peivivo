import { Eye, EyeOff, PenLine, ShieldCheck } from "lucide-react";
import { api, type Auditoria, type Vinculo } from "../services";
import { useEstudante } from "../hooks/useEstudante";
import { useConsulta } from "../hooks/useConsulta";
import { useTitulo } from "../hooks/useTitulo";
import { CabecalhoEstudante } from "../components/CabecalhoEstudante";
import { Alerta, Badge, Card, Carregando, ErroCarregamento, EstadoVazio } from "../components/Feedback";
import { LinkBotao } from "../components/Botao";
import { EVENTO, PAPEL } from "../utils/rotulos";
import { formatarData, formatarDataHora } from "../utils/datas";

type Acesso = "registra" | "ve" | "nao";

/** Matriz de permissões v3 (D-34) em linguagem de família. Coluna "Você" = responsável. */
const QUEM_VE: { info: string; acesso: [Acesso, Acesso, Acesso, Acesso] }[] = [
  { info: "Observações da escola e de casa", acesso: ["registra", "registra", "registra", "ve"] },
  { info: "Perfil de aprendizagem (como adaptar o material)", acesso: ["ve", "ve", "registra", "ve"] },
  { info: "Materiais aprovados e se funcionaram", acesso: ["ve", "registra", "ve", "ve"] },
  { info: "Rascunhos de material (antes da revisão)", acesso: ["nao", "registra", "nao", "nao"] },
  { info: "Notas reservadas do profissional de saúde", acesso: ["nao", "nao", "registra", "nao"] },
  { info: "Histórico de acessos e mudanças", acesso: ["ve", "nao", "nao", "ve"] },
];
const COLUNAS = ["Você", "Docente", "Profissional de saúde", "Coordenação"];
const ROTULO_ACESSO: Record<Acesso, { texto: string; Icone: typeof Eye }> = {
  registra: { texto: "Vê e registra", Icone: PenLine },
  ve: { texto: "Só vê", Icone: Eye },
  nao: { texto: "Não vê", Icone: EyeOff },
};

/**
 * R4.3 / UX-09 — Privacidade do responsável: quem tem acesso, o que cada um vê,
 * quem acessou o quê e quando. Responde à preocupação nº 1 da pesquisa
 * (privacidade). Os dados vêm do banco já filtrados: nada aqui decide permissão.
 */
export function Privacidade() {
  const ctx = useEstudante();
  useTitulo("Privacidade", !ctx.carregando);
  const id = ctx.dados?.estudante.id;
  const ehResponsavel = ctx.dados?.papel === "RESPONSAVEL";

  const dados = useConsulta<{ vinculos: Vinculo[]; eventos: Auditoria[] } | null>(async () => {
    if (!id || !ehResponsavel) return null;
    const [vinculos, eventos] = await Promise.all([api.listarVinculos(id), api.listarAuditoria(id)]);
    return { vinculos, eventos };
  }, [id, ehResponsavel]);

  if (ctx.carregando) return <Carregando texto="Carregando…" />;
  if (ctx.erro || !ctx.dados) return <ErroCarregamento erro={ctx.erro} tentarNovamente={ctx.recarregar} />;

  if (!ehResponsavel) {
    return (
      <>
        <CabecalhoEstudante contexto={ctx.dados} titulo="Privacidade" />
        <Alerta tom="info" titulo="Esta página é do responsável legal">
          Aqui a família vê quem tem acesso aos dados do estudante e o histórico de acessos.
        </Alerta>
      </>
    );
  }

  const ativos = dados.dados?.vinculos.filter((v) => v.status === "ATIVO") ?? [];
  const leiturasClinicas = dados.dados?.eventos.filter((e) => e.evento === "LEITURA_NOTA_CLINICA") ?? [];

  return (
    <>
      <CabecalhoEstudante
        contexto={ctx.dados}
        titulo="Privacidade"
        descricao="Quem pode ver os dados, o que cada pessoa vê e o histórico de acessos. Você controla isso."
      />
      <p className="selo-privado">
        <ShieldCheck aria-hidden="true" size={18} /> Só você e outros responsáveis do estudante veem esta página.
      </p>

      {dados.carregando && <Carregando />}
      {dados.erro && <ErroCarregamento erro={dados.erro} tentarNovamente={dados.recarregar} />}

      {dados.dados && (
        <>
          <h2>Quem tem acesso agora</h2>
          {ativos.length === 0 ? (
            <EstadoVazio titulo="Ninguém além de você">
              <p>Quando a escola vincular um docente ou um profissional, ele aparece aqui.</p>
            </EstadoVazio>
          ) : (
            <ul className="lista-simples" aria-label="Pessoas com acesso">
              {ativos.map((v) => (
                <li key={v.id}>
                  <div>
                    <strong>{v.nomeUsuario ?? "Pessoa vinculada"}</strong>
                    <div className="meta">
                      {PAPEL[v.papel]} · desde {formatarData(v.dataVinculo)}
                      {v.registroConselho && ` · registro profissional ${v.registroConselho}`}
                    </div>
                  </div>
                  <Badge>{PAPEL[v.papel]}</Badge>
                </li>
              ))}
            </ul>
          )}

          <h2>O que cada pessoa vê</h2>
          {/* Celular: um bloco por informação (sem rolagem lateral). Desktop: a tabela. Só um fica visível. */}
          <div className="acessos-lista">
            {QUEM_VE.map((linha) => (
              <section key={linha.info} className="acessos-lista__item" aria-label={linha.info}>
                <h3>{linha.info}</h3>
                <ul>
                  {linha.acesso.map((a, i) => {
                    const { texto, Icone } = ROTULO_ACESSO[a];
                    return (
                      <li key={COLUNAS[i]} className={`acesso acesso--${a}`}>
                        <span>{COLUNAS[i]}</span>
                        <span>
                          <Icone aria-hidden="true" size={16} /> {texto}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
          <div className="tabela-rolagem acessos-tabela" role="region" aria-label="O que cada pessoa vê" tabIndex={0}>
            <table className="tabela-acessos">
              <caption className="sr-only">Quem vê e quem registra cada tipo de informação</caption>
              <thead>
                <tr>
                  <th scope="col">Informação</th>
                  {COLUNAS.map((c) => (
                    <th scope="col" key={c}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {QUEM_VE.map((linha) => (
                  <tr key={linha.info}>
                    <th scope="row">{linha.info}</th>
                    {linha.acesso.map((a, i) => {
                      const { texto, Icone } = ROTULO_ACESSO[a];
                      return (
                        <td key={COLUNAS[i]} className={`acesso acesso--${a}`}>
                          <Icone aria-hidden="true" size={16} /> {texto}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="meta">O sistema não guarda laudo nem diagnóstico. Sem a sua autorização, docente e profissional não veem nada.</p>

          <h2>Quem leu as notas do profissional de saúde</h2>
          {leiturasClinicas.length === 0 ? (
            <p className="meta">Ninguém leu as notas reservadas até agora.</p>
          ) : (
            <ul className="lista-simples" aria-label="Leituras de notas clínicas">
              {leiturasClinicas.slice(0, 10).map((e) => (
                <li key={e.id}>
                  <span>
                    <strong>{e.autorNome}</strong> leu em {formatarDataHora(e.data)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <h2>Histórico de acessos e mudanças</h2>
          {dados.dados.eventos.length === 0 ? (
            <p className="meta">Nenhum evento registrado ainda.</p>
          ) : (
            <ol className="linha-tempo" aria-label="Histórico">
              {dados.dados.eventos.slice(0, 30).map((e) => (
                <li key={e.id}>
                  <time dateTime={e.data}>{formatarDataHora(e.data)}</time>
                  <span>
                    {EVENTO[e.evento]} {e.autorNome && <span className="meta">— {e.autorNome}</span>}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </>
      )}

      <h2>Suas escolhas</h2>
      <div className="grade-cards grade-cards--3">
        <Card titulo="Autorização" nivel={3} className="card--acao">
          <p>Veja o que está autorizado. Você pode retirar a autorização quando quiser, com efeito imediato.</p>
          <LinkBotao to={`/estudantes/${ctx.dados.estudante.id}/consentimento`} variante="secundario" pequeno>
            Ver ou retirar autorização
          </LinkBotao>
        </Card>
        <Card titulo="Seus dados" nivel={3} className="card--acao">
          <p>Baixe tudo o que existe sobre o estudante ou peça a exclusão.</p>
          <LinkBotao to={`/estudantes/${ctx.dados.estudante.id}/dados`} variante="secundario" pequeno>
            Baixar ou excluir
          </LinkBotao>
        </Card>
      </div>
    </>
  );
}
