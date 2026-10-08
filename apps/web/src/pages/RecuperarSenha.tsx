import { useState } from "react";
import { Link } from "react-router-dom";
import { api, mensagemAmigavel } from "../services";
import { useMutacao } from "../hooks/useConsulta";
import { useTitulo } from "../hooks/useTitulo";
import { Alerta } from "../components/Feedback";
import { Botao } from "../components/Botao";
import { Campo } from "../components/Campo";

/** Recuperar senha (R2.2). A resposta é sempre a mesma: não revela se o e-mail tem conta. */
export function RecuperarSenha() {
  useTitulo("Recuperar senha");
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const pedir = useMutacao(async () => {
    if (!email.trim()) {
      setErro("Informe seu e-mail.");
      return;
    }
    setErro(null);
    await api.pedirRecuperacaoSenha(email);
    setEnviado(true);
  });

  return (
    <div className="pagina-estreita">
      <h1>Recuperar senha</h1>
      {enviado ? (
        <Alerta tom="sucesso" titulo="Pedido recebido" vivo>
          Se houver uma conta com esse e-mail, enviamos um link para criar uma nova senha. O link vale por 1 hora. Confira também a caixa de
          spam.
        </Alerta>
      ) : (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            pedir.executar();
          }}
        >
          <p>Informe o e-mail da sua conta. Enviaremos um link para você criar uma nova senha.</p>
          {pedir.erro && (
            <Alerta tom="erro" vivo>
              {mensagemAmigavel(pedir.erro)}
            </Alerta>
          )}
          <Campo id="email" rotulo="E-mail" type="email" autoComplete="username" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} erro={erro} />
          <div className="grupo-botoes grupo-botoes--empilhado">
            <Botao type="submit" carregando={pedir.ocupado} textoCarregando="Enviando…">
              Enviar link
            </Botao>
          </div>
        </form>
      )}
      <p>
        <Link to="/entrar">Voltar para Entrar</Link>
      </p>
    </div>
  );
}
