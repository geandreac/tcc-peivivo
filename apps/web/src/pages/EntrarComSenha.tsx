import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { mensagemAmigavel } from "../services";
import { useSessao } from "../hooks/useSessao";
import { useMutacao } from "../hooks/useConsulta";
import { useTitulo } from "../hooks/useTitulo";
import { Alerta, ResumoErros } from "../components/Feedback";
import { Botao } from "../components/Botao";
import { Campo } from "../components/Campo";

/**
 * Entrar no sistema real (R2.2, D-32). WCAG 3.3.8 (autenticação acessível):
 * colar senha e gerenciador de senhas funcionam (autocomplete), sem teste
 * cognitivo; mostrar/ocultar senha. Mensagem de erro genérica: não revela se
 * o e-mail existe. Conta só por convite (sem "criar conta").
 */
export function EntrarComSenha() {
  useTitulo("Entrar");
  const navigate = useNavigate();
  const location = useLocation();
  const destino = (location.state as { de?: string } | null)?.de ?? "/painel";
  const { entrarComSenha } = useSessao();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [erros, setErros] = useState<{ campo: string; mensagem: string }[]>([]);

  const entrar = useMutacao(async () => {
    const lista: { campo: string; mensagem: string }[] = [];
    if (!email.trim()) lista.push({ campo: "email", mensagem: "Informe seu e-mail." });
    if (!senha) lista.push({ campo: "senha", mensagem: "Informe sua senha." });
    setErros(lista);
    if (lista.length > 0) return;
    const r = await entrarComSenha(email, senha);
    navigate(r.exigeSegundoFator ? "/entrar/verificacao" : destino, { replace: true, state: { de: destino } });
  });

  return (
    <div className="pagina-estreita">
      <h1>Entrar</h1>
      <p>Use o e-mail e a senha que você criou ao aceitar o convite da escola.</p>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          entrar.executar();
        }}
      >
        <ResumoErros erros={erros} />
        {entrar.erro && (
          <Alerta tom="erro" vivo>
            {mensagemAmigavel(entrar.erro)}
          </Alerta>
        )}
        <Campo id="email" rotulo="E-mail" type="email" autoComplete="username" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} erro={erros.find((x) => x.campo === "email")?.mensagem ?? null} />
        <Campo
          id="senha"
          rotulo="Senha"
          type={mostrar ? "text" : "password"}
          autoComplete="current-password"
          required
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          erro={erros.find((x) => x.campo === "senha")?.mensagem ?? null}
        />
        <div className="grupo-botoes">
          <Botao variante="discreto" pequeno onClick={() => setMostrar((m) => !m)} aria-pressed={mostrar} aria-controls="senha">
            {mostrar ? "Ocultar senha" : "Mostrar senha"}
          </Botao>
        </div>
        <div className="grupo-botoes grupo-botoes--empilhado">
          <Botao type="submit" carregando={entrar.ocupado} textoCarregando="Entrando…">
            Entrar
          </Botao>
        </div>
      </form>
      <p>
        <Link to="/recuperar-senha">Esqueci minha senha</Link>
      </p>
      <p className="meta">
        Não tem conta? O acesso é só por convite: a coordenação da escola convida a família, a docente e a equipe de saúde.
      </p>
    </div>
  );
}
