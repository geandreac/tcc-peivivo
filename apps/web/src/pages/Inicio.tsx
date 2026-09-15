import { LinkBotao } from "../components/Botao";
import { Card } from "../components/Feedback";
import { useTitulo } from "../hooks/useTitulo";
import { useSessao } from "../hooks/useSessao";

/** Tela inicial + apresentação da solução (orientação: telas 1 e 2). */
export function Inicio() {
  useTitulo("Início");
  const { usuario } = useSessao();

  return (
    <>
      <section className="hero" aria-labelledby="titulo-inicio">
        <img src="/logo-pei-vivo.png" alt="" width="140" height="183" className="hero__logo" />
        <h1 id="titulo-inicio">O PEI que executa a si mesmo</h1>
        <p>
          O Plano Educacional Individualizado é garantido por lei, mas costuma virar um PDF na gaveta. O <strong>PEI Vivo</strong> liga escola,
          família e equipe de saúde num ciclo contínuo — e transforma o que cada um sabe sobre o estudante em material didático adaptado
          <em> para aquele estudante</em>.
        </p>
        <div className="grupo-botoes">
          <LinkBotao to={usuario ? "/painel" : "/entrar"}>{usuario ? "Ir para meus estudantes" : "Entrar na demonstração"}</LinkBotao>
          <LinkBotao to="/ajuda" variante="secundario">
            Como funciona
          </LinkBotao>
        </div>
      </section>

      <section aria-labelledby="titulo-ciclo">
        <h2 id="titulo-ciclo">Um ciclo fechado em quatro passos</h2>
        <ol className="ciclo">
          <li>
            <strong>Observar</strong>
            Professora, família e profissional de saúde registram, a cada 15 dias, o que só cada um vê. Nunca diagnóstico — só o que funciona.
          </li>
          <li>
            <strong>Validar</strong>
            O sistema converte as observações em parâmetros de adaptação por regras claras, e o profissional de saúde valida o conjunto.
          </li>
          <li>
            <strong>Adaptar</strong>
            A professora cola um texto no celular e recebe, em segundos, a versão com blocos curtos, instruções em etapa única e contraste reforçado.
          </li>
          <li>
            <strong>Retroalimentar</strong>
            Ela revisa, aprova, aplica e registra se funcionou. O resultado refina o perfil para o próximo ciclo.
          </li>
        </ol>
      </section>

      <section aria-labelledby="titulo-para-quem" className="grade-cards grade-cards--3">
        <h2 id="titulo-para-quem" className="sr-only">
          Para quem é
        </h2>
        <Card titulo="Para a escola" nivel={3}>
          <p>Adaptar um texto levava 40 minutos. Agora leva alguns toques — com revisão humana obrigatória antes de chegar ao estudante.</p>
        </Card>
        <Card titulo="Para a família" nivel={3}>
          <p>Você autoriza com clareza o que é coletado, registra o que percebe em casa, acompanha o que deu certo e pode revogar quando quiser.</p>
        </Card>
        <Card titulo="Para a equipe de saúde" nivel={3}>
          <p>Suas estratégias chegam à sala de aula de forma operacional, e você vê o resultado real — não só o relato. A nota clínica fica reservada.</p>
        </Card>
      </section>

      <section aria-labelledby="titulo-principios">
        <h2 id="titulo-principios">O que o PEI Vivo não faz</h2>
        <ul>
          <li>Não diagnostica nem sugere hipótese diagnóstica — e não armazena laudo.</li>
          <li>Não substitui o atendimento educacional especializado nem a terapia.</li>
          <li>Não publica material sem a aprovação da professora.</li>
          <li>Não mostra ao docente a nota clínica do profissional de saúde.</li>
        </ul>
      </section>
    </>
  );
}
