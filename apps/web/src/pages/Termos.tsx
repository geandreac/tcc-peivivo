import { useTitulo } from "../hooks/useTitulo";
import { VERSAO_TERMO } from "../services/supabaseApi";

/**
 * Termos de uso e política de privacidade em linguagem simples (prompt §4.1),
 * com versão — a versão aceita fica registrada na conta (fn_aceitar_termos).
 * Texto-base para revisão da dupla e da orientadora; não é parecer jurídico.
 */
export function Termos() {
  useTitulo("Termos e privacidade");
  return (
    <article className="pagina-leitura">
      <h1>Termos de uso e privacidade</h1>
      <p className="meta">Versão {VERSAO_TERMO}. Protótipo acadêmico (TCC, CEUNI FAMETRO).</p>

      <h2>Para que serve o PEI Vivo</h2>
      <p>
        Ajudar a escola, a família e a equipe de saúde a adaptar o material de leitura de um estudante ao jeito como ele aprende, a cada 15
        dias, com base no que cada um observa.
      </p>

      <h2>O que guardamos</h2>
      <ul>
        <li>Nome, data de nascimento e turma do estudante.</li>
        <li>Observações da escola, da família e do profissional de saúde sobre leitura, atenção e tarefas.</li>
        <li>O perfil de aprendizagem (como adaptar o material) e os materiais aprovados pela professora.</li>
        <li>Quem acessou o quê e quando (histórico de acessos).</li>
      </ul>

      <h2>O que NÃO guardamos</h2>
      <ul>
        <li>Laudo, diagnóstico ou CID. Só a data em que um laudo foi apresentado à escola, se houver.</li>
        <li>Dados para publicidade. Não usamos ferramentas de análise que exponham dados de crianças.</li>
      </ul>

      <h2>Quem vê o quê</h2>
      <p>
        Cada pessoa vê só o que precisa. A professora nunca vê as notas do profissional de saúde. A família decide quem é o profissional de
        saúde e vê quem acessou os dados. A tela <strong>Privacidade</strong> mostra tudo isso.
      </p>

      <h2>Seus direitos (LGPD)</h2>
      <ul>
        <li>Retirar a autorização a qualquer momento, com efeito imediato.</li>
        <li>Baixar todos os dados do estudante.</li>
        <li>Pedir a exclusão. O histórico de acessos fica guardado sem nome, como prova de que o pedido foi cumprido.</li>
      </ul>

      <h2>Segurança</h2>
      <p>
        O acesso é só por convite. Quem vê dados de saúde ou administra a escola usa verificação em duas etapas. As regras de quem vê o quê
        ficam no banco de dados, não só na tela.
      </p>
    </article>
  );
}
