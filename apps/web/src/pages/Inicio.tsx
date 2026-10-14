import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BadgeCheck, BookOpenCheck, Building2, EyeOff, FileX2, HeartHandshake, KeyRound, ListChecks, ScrollText, ShieldCheck, Stethoscope } from "lucide-react";
import { adaptar } from "@pei-vivo/motor-adaptacao";
import { LinkBotao } from "../components/Botao";
import { useTitulo } from "../hooks/useTitulo";
import { useSessao } from "../hooks/useSessao";
import { PARAMETROS_CENARIO_A, TEXTO_CICLO_DA_AGUA } from "../mocks/dados";

/** Os quatro passos do ciclo — sequência real (a ordem é a informação). */
const CICLO = [
  { nome: "Observar", quem: "Escola, família e saúde", texto: "A cada 15 dias, cada um registra o que só ele vê: em sala, em casa, na terapia. Seis perguntas, três opções. Nunca diagnóstico." },
  { nome: "Validar", quem: "Profissional de saúde", texto: "Regras fixas e auditáveis convertem as observações num perfil de leitura. O profissional valida o conjunto, não cada material." },
  { nome: "Adaptar", quem: "Docente", texto: "A professora cola o texto da aula e recebe a versão do estudante: trechos curtos, uma instrução por vez, contraste reforçado." },
  { nome: "Retroalimentar", quem: "Docente", texto: "Ela revisa, aprova, aplica e registra se funcionou. O resultado refina o perfil do próximo ciclo." },
];

const PAPEIS = [
  {
    chave: "familia",
    Icone: HeartHandshake,
    titulo: "Família",
    texto: "Você decide o que é registrado, quem é o profissional de saúde e vê quem acessou os dados do seu filho. Pode retirar a autorização a qualquer momento.",
    destaque: true,
  },
  { chave: "escola", Icone: BookOpenCheck, titulo: "Docente", texto: "Observa em poucos toques e gera o material da aula em segundos. Nada chega ao estudante sem a sua aprovação." },
  { chave: "saude", Icone: Stethoscope, titulo: "Equipe de saúde", texto: "Suas estratégias viram ajustes concretos em sala, e você vê o resultado real. Suas notas ficam reservadas à equipe de saúde." },
  { chave: "coordenacao", Icone: Building2, titulo: "Coordenação", texto: "Cadastra, convida e acompanha a escola por números e pendências, sem acesso a dado clínico." },
] as const;

const CONFIANCA = [
  { Icone: FileX2, titulo: "Laudo não é armazenado", texto: "O sistema não guarda diagnóstico nem CID. O perfil descreve o que funciona, não um rótulo." },
  { Icone: KeyRound, titulo: "A família tem a chave", texto: "Sem autorização, ninguém registra nada. É a família quem confirma o profissional de saúde." },
  { Icone: EyeOff, titulo: "Cada um vê só o necessário", texto: "A professora nunca lê as notas da terapia. A coordenação vê números, não observações." },
  { Icone: ScrollText, titulo: "Todo acesso deixa rastro", texto: "A família vê quem leu as notas clínicas e quando, numa trilha que ninguém apaga." },
];

/** Tela inicial — o produto como herói (D-41): o material é gerado ao vivo pelo motor real. */
export function Inicio() {
  useTitulo("Início");
  const { usuario } = useSessao();
  const adaptado = useMemo(() => adaptar(TEXTO_CICLO_DA_AGUA, PARAMETROS_CENARIO_A), []);
  const paragrafos = TEXTO_CICLO_DA_AGUA.split(/\n\s*\n/u);
  const entrar = usuario ? "/painel" : "/entrar";

  return (
    <div className="inicio">
      {/* ------------------------------------------------------------ herói */}
      <section className="inicio-heroi" aria-labelledby="titulo-inicio">
        <div className="inicio-heroi__texto">
          <p className="inicio-sobretitulo">Plano Educacional Individualizado</p>
          <h1 id="titulo-inicio">
            Cada estudante lê <span className="inicio-destaque">do seu jeito.</span>
          </h1>
          <p className="inicio-lead">
            O PEI Vivo une escola, família e equipe de saúde num ciclo que aprende a cada quinze dias, e transforma o texto da aula no material
            certo para cada estudante com TEA, TDAH ou dislexia.
          </p>
          <div className="inicio-acoes">
            <LinkBotao to={entrar}>{usuario ? "Ir para meus estudantes" : "Entrar"}</LinkBotao>
            <a href="#como-funciona" className="inicio-link">
              Ver como funciona <ArrowRight aria-hidden="true" size={18} />
            </a>
          </div>
        </div>

        {/* A demonstração: mesmo texto, antes e depois, adaptado agora pelo motor (packages/motor-adaptacao). */}
        <figure className="inicio-demo" aria-labelledby="legenda-demo">
          <div className="inicio-demo__antes" aria-hidden="true">
            <p className="inicio-demo__rotulo">Texto da aula</p>
            {paragrafos.map((p) => (
              <p key={p.slice(0, 24)}>{p}</p>
            ))}
          </div>
          <div className="inicio-demo__depois">
            <p className="inicio-demo__rotulo inicio-demo__rotulo--forte">
              <span className="inicio-demo__avatar" aria-hidden="true">
                M
              </span>
              Para o Miguel
            </p>
            <ol className="inicio-demo__blocos" aria-label="Material adaptado para o Miguel (exemplo fictício)">
              {adaptado.blocos.map((b, i) => (
                <li key={i} className="inicio-demo__bloco" style={{ animationDelay: `${300 + i * 160}ms` }}>
                  {b.linhas.join(" ")}
                </li>
              ))}
            </ol>
            <ul className="inicio-demo__selos" aria-label="Ajustes aplicados">
              <li>
                <ListChecks aria-hidden="true" size={16} /> Uma instrução por vez
              </li>
              <li>Trechos de até {adaptado.parametros.maxLinhasPorBloco} linhas</li>
              <li>Contraste reforçado</li>
            </ul>
          </div>
          <p className="inicio-demo__aprovado" aria-hidden="true">
            <BadgeCheck size={18} /> Revisado pela professora
          </p>
          <figcaption id="legenda-demo" className="sr-only">
            Exemplo fictício: o mesmo texto de ciências, antes e depois da adaptação ao perfil do Miguel. A versão adaptada é gerada agora pelo
            motor de regras do PEI Vivo.
          </figcaption>
        </figure>
      </section>

      {/* ------------------------------------------------------------ contraste de tempo */}
      <section className="inicio-faixa" aria-labelledby="titulo-tempo">
        <h2 id="titulo-tempo" className="sr-only">
          Tempo para adaptar um texto
        </h2>
        <div className="inicio-numero">
          <span className="inicio-numero__valor inicio-numero__valor--antes">~40 min</span>
          <span className="inicio-numero__rotulo">para adaptar um texto à mão. Com 30 alunos, não acontece.</span>
        </div>
        <ArrowRight className="inicio-faixa__seta" aria-hidden="true" size={32} />
        <div className="inicio-numero">
          <span className="inicio-numero__valor">segundos</span>
          <span className="inicio-numero__rotulo">no PEI Vivo, e a professora revisa tudo antes de usar.</span>
        </div>
      </section>

      {/* ------------------------------------------------------------ ciclo */}
      <section className="inicio-ciclo" id="como-funciona" aria-labelledby="titulo-ciclo">
        <div className="inicio-cabecalho-secao">
          <p className="inicio-sobretitulo">Como funciona</p>
          <h2 id="titulo-ciclo">Um ciclo que não termina num PDF na gaveta.</h2>
        </div>
        <div className="inicio-ciclo__corpo">
          <svg className="inicio-anel" viewBox="0 0 240 240" aria-hidden="true" focusable="false">
            <circle cx="120" cy="120" r="88" className="inicio-anel__trilho" />
            {[0, 1, 2, 3].map((i) => {
              const a = (i * Math.PI) / 2 - Math.PI / 2;
              return (
                <g key={i} transform={`translate(${120 + 88 * Math.cos(a)} ${120 + 88 * Math.sin(a)})`}>
                  <circle r="18" className={`inicio-anel__no inicio-anel__no--${i}`} />
                  <text textAnchor="middle" dominantBaseline="central" className="inicio-anel__num">
                    {i + 1}
                  </text>
                </g>
              );
            })}
            <text x="120" y="112" textAnchor="middle" className="inicio-anel__centro">
              15 dias
            </text>
            <text x="120" y="134" textAnchor="middle" className="inicio-anel__centro-sub">
              por ciclo
            </text>
          </svg>
          <ol className="inicio-passos">
            {CICLO.map((p, i) => (
              <li key={p.nome}>
                <span className={`inicio-passos__num inicio-anel__no--${i}`} aria-hidden="true">
                  {i + 1}
                </span>
                <div>
                  <h3>{p.nome}</h3>
                  <p className="inicio-passos__quem">{p.quem}</p>
                  <p>{p.texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ------------------------------------------------------------ papéis (bento) */}
      <section className="inicio-papeis" aria-labelledby="titulo-papeis">
        <div className="inicio-cabecalho-secao">
          <p className="inicio-sobretitulo">Para quem cuida</p>
          <h2 id="titulo-papeis">Quatro olhares sobre o mesmo estudante.</h2>
        </div>
        <ul className="inicio-bento">
          {PAPEIS.map(({ chave, Icone, titulo, texto, ...resto }) => (
            <li key={chave} className={`inicio-bento__item inicio-bento__item--${chave}${"destaque" in resto ? " inicio-bento__item--destaque" : ""}`}>
              <span className="inicio-bento__icone" aria-hidden="true">
                <Icone size={26} strokeWidth={1.75} />
              </span>
              <h3>{titulo}</h3>
              <p>{texto}</p>
              {"destaque" in resto && (
                <dl className="inicio-bento__matriz" aria-label="Exemplo do que a família vê na tela de Privacidade">
                  <div>
                    <dt>Notas da terapia</dt>
                    <dd>Só a equipe de saúde</dd>
                  </div>
                  <div>
                    <dt>Rascunhos de material</dt>
                    <dd>Só a professora</dd>
                  </div>
                  <div>
                    <dt>Quem leu as notas</dt>
                    <dd>Você vê, com data e hora</dd>
                  </div>
                </dl>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* ------------------------------------------------------------ confiança (faixa invertida) */}
      <section className="inicio-confianca" aria-labelledby="titulo-confianca">
        <div className="inicio-confianca__interno">
          <ShieldCheck className="inicio-confianca__selo" aria-hidden="true" size={40} strokeWidth={1.5} />
          <h2 id="titulo-confianca">Privacidade não é uma opção nas configurações. É a base.</h2>
          <p className="inicio-lead">
            Quem decide o que cada pessoa vê é o banco de dados, não a tela. E cada regra é testada automaticamente a cada mudança no código.
          </p>
          <ul className="inicio-confianca__grade">
            {CONFIANCA.map(({ Icone, titulo, texto }) => (
              <li key={titulo}>
                <Icone aria-hidden="true" size={24} strokeWidth={1.75} />
                <h3>{titulo}</h3>
                <p>{texto}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------------------ limites + chamada final */}
      <section className="inicio-limites" aria-labelledby="titulo-limites">
        <h2 id="titulo-limites">O que o PEI Vivo não faz.</h2>
        <ul>
          <li>Não diagnostica nem sugere hipótese diagnóstica.</li>
          <li>Não substitui o atendimento especializado nem a terapia.</li>
          <li>Não publica material sem a aprovação da professora.</li>
          <li>Não decide sozinho: a IA, quando ligada, só sugere, e uma pessoa revisa.</li>
        </ul>
      </section>

      <section className="inicio-final" aria-labelledby="titulo-final">
        <h2 id="titulo-final">Pronto para ver na prática?</h2>
        <p>Entre com um perfil de demonstração. Todos os dados são fictícios.</p>
        <div className="inicio-acoes inicio-acoes--centro">
          <LinkBotao to={entrar}>{usuario ? "Ir para meus estudantes" : "Entrar na demonstração"}</LinkBotao>
          <Link to="/ajuda" className="inicio-link">
            Ler a ajuda <ArrowRight aria-hidden="true" size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}
