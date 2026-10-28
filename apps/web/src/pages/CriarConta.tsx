import { Link } from "react-router-dom";
import { useTitulo } from "../hooks/useTitulo";

/**
 * "Criar conta" do cartão de login (D-49). Não há cadastro aberto (D-32): a conta
 * nasce do convite da escola. Esta tela só explica o caminho.
 */
export function CriarConta() {
  useTitulo("Criar conta");
  return (
    <div className="pagina-estreita">
      <h1>Criar conta</h1>
      <p>Para proteger os dados das crianças, ninguém cria conta sozinho. A conta nasce de um convite da escola.</p>
      <ol>
        <li>A coordenação da escola cadastra o estudante e envia um convite para o seu e-mail.</li>
        <li>Abra o link do convite. Nele você cria a sua senha e aceita os termos de uso.</li>
        <li>Pronto: depois disso, entre com o seu e-mail e a senha criada.</li>
      </ol>
      <p className="texto-apoio">Não recebeu o convite ou o link expirou? Confira a caixa de spam e peça à coordenação da escola para enviar de novo.</p>
      <p>
        <Link to="/entrar">Voltar para Entrar</Link>
      </p>
    </div>
  );
}
