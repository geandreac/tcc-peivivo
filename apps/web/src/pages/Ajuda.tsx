import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services";
import { Botao } from "../components/Botao";
import { Card } from "../components/Feedback";
import { useAnuncio } from "../hooks/useAnuncio";
import { useTitulo } from "../hooks/useTitulo";
import { useMutacao } from "../hooks/useConsulta";

/** Heurística 10 (ajuda e documentação) — tela 6 da orientação. */
export function Ajuda() {
  useTitulo("Ajuda");
  const { anunciar } = useAnuncio();
  const [falha, setFalha] = useState(false);

  const reiniciar = useMutacao(async () => {
    await api.reiniciarDados();
    anunciar("Dados da demonstração restaurados ao estado inicial.", "sucesso");
  });

  function alternarFalha() {
    const nova = !falha;
    setFalha(nova);
    api.simularFalha(nova);
    anunciar(nova ? "Falha de rede simulada ativada: as próximas ações vão falhar." : "Falha de rede simulada desativada.", "neutro");
  }

  return (
    <>
      <h1>Ajuda</h1>
      <p style={{ maxWidth: "var(--largura-leitura)" }}>
        Respostas curtas para as dúvidas mais comuns. Se preferir, comece pela <Link to="/">apresentação da solução</Link>.
      </p>

      <Card titulo="O que é o PEI Vivo?">
        <p>
          Uma plataforma que conecta professora, família e profissional de saúde em torno de um estudante com TEA, TDAH ou dislexia. As
          observações de cada um viram <strong>parâmetros de adaptação</strong>; com eles, a professora gera material didático adaptado, revisa,
          aprova e registra se funcionou.
        </p>
      </Card>

      <Card titulo="Quem faz o quê?">
        <dl className="dados">
          <dt>Responsável legal</dt>
          <dd>Concede e revoga o consentimento, registra o contexto de casa, acompanha resultados, exporta ou exclui os dados.</dd>
          <dt>Docente regente</dt>
          <dd>Registra a observação quinzenal, fecha o ciclo, gera, revisa e aprova materiais, registra o desfecho.</dd>
          <dt>Profissional de saúde</dt>
          <dd>Registra estratégias validadas, valida os parâmetros de cada ciclo, mantém notas clínicas reservadas.</dd>
          <dt>Coordenação pedagógica</dt>
          <dd>Cadastra o estudante, vincula pessoas, acompanha pendências e consolida o histórico do PEI.</dd>
        </dl>
      </Card>

      <Card titulo="O fluxo em 60 segundos">
        <ol>
          <li>A coordenação cadastra o estudante e vincula a família, a docente e o profissional.</li>
          <li>O responsável lê o termo em linguagem simples e concede o consentimento. Sem isso, nada acontece.</li>
          <li>A cada 15 dias, cada um registra observações em seis dimensões, numa escala de três pontos.</li>
          <li>A docente fecha o ciclo: o sistema propõe os novos parâmetros e mostra o que mudou.</li>
          <li>O profissional de saúde valida o conjunto (ou pede ajuste). Sem resposta em 7 dias, valem os parâmetros anteriores.</li>
          <li>A docente cola um texto, gera o material adaptado, revisa lado a lado e aprova.</li>
          <li>Depois da aula, registra o desfecho: alcançado, parcial ou não alcançado.</li>
        </ol>
      </Card>

      <Card titulo="Por que a professora não vê o laudo?">
        <p>
          Porque ela não precisa. Ela precisa saber que <em>instrução longa trava</em> — não o CID. O sistema não armazena laudo nem diagnóstico;
          só a data em que o laudo foi apresentado à escola, visível à coordenação. Menos dado circulando é menos risco de rotulação e é o
          princípio de minimização da LGPD.
        </p>
      </Card>

      <Card titulo="A IA pode inventar conteúdo?">
        <p>
          Neste protótipo a camada de IA está <strong>desligada</strong>: só a camada determinística roda (blocos, etapas, contraste). Quando ligada,
          a IA atua apenas em vocabulário e exemplos, e <strong>nada é publicado sem a aprovação da docente</strong>, que revisa com o original ao
          lado.
        </p>
      </Card>

      <Card titulo="Ferramentas da demonstração">
        <p>Use para explorar os estados da interface (carregamento, erro, vazio) sem depender de rede real.</p>
        <div className="grupo-botoes">
          <Botao variante="secundario" onClick={() => reiniciar.executar()} carregando={reiniciar.ocupado} textoCarregando="Restaurando…">
            Restaurar dados da demonstração
          </Botao>
          <Botao variante="secundario" onClick={alternarFalha} aria-pressed={falha}>
            {falha ? "Desativar falha de rede simulada" : "Simular falha de rede"}
          </Botao>
        </div>
      </Card>

      <p>
        Precisa de ajustes de contraste, fonte ou movimento? Veja a página de <Link to="/acessibilidade">acessibilidade</Link>.
      </p>
    </>
  );
}
