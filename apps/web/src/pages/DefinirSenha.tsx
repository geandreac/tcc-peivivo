import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, mensagemAmigavel } from "../services";
import { VERSAO_TERMO } from "../services/supabaseApi";
import { useSessao } from "../hooks/useSessao";
import { useMutacao } from "../hooks/useConsulta";
import { useTitulo } from "../hooks/useTitulo";
import { Alerta, Carregando, ResumoErros } from "../components/Feedback";
import { Botao } from "../components/Botao";
import { Campo } from "../components/Campo";

const MINIMO = 10;

/**
 * Definir senha (R2.2): chega-se aqui pelo link do CONVITE (?convite=1, com
 * aceite dos termos versionado) ou pelo link de RECUPERAÇÃO. O Auth já abriu
 * a sessão a partir do link (detectSessionInUrl). Senha ≥ 10, sem regra de
 * composição; colar e gerenciador de senhas funcionam (WCAG 3.3.8).
 */
export function DefinirSenha() {
  const [busca] = useSearchParams();
  const convite = busca.get("convite") === "1";
  useTitulo(convite ? "Aceitar convite" : "Criar nova senha");
  const navigate = useNavigate();
  const { usuario, carregando, atualizar } = useSessao();
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [aceite, setAceite] = useState(false);
  const [erros, setErros] = useState<{ campo: string; mensagem: string }[]>([]);

  const salvar = useMutacao(async () => {
    const lista: { campo: string; mensagem: string }[] = [];
    if (senha.length < MINIMO) lista.push({ campo: "senha", mensagem: `A senha precisa ter pelo menos ${MINIMO} caracteres.` });
    if (senha !== confirmacao) lista.push({ campo: "confirmacao", mensagem: "As duas senhas não são iguais." });
    if (convite && !aceite) lista.push({ campo: "aceite", mensagem: "Para usar o PEI Vivo, leia e aceite os termos." });
    setErros(lista);
    if (lista.length > 0) return;
    await api.definirSenha(senha, convite ? VERSAO_TERMO : undefined);
    await atualizar();
    navigate("/painel", { replace: true });
  });

  if (carregando) return <Carregando texto="Abrindo seu convite…" />;
  if (!usuario) {
    return (
      <div className="pagina-estreita">
        <h1>{convite ? "Aceitar convite" : "Criar nova senha"}</h1>
        <Alerta tom="aviso" titulo="Link inválido ou expirado">
          O link do e-mail vale por tempo limitado e só pode ser usado uma vez. {convite ? "Peça à coordenação da escola um novo convite." : <Link to="/recuperar-senha">Peça um novo link</Link>}
        </Alerta>
      </div>
    );
  }

  const erroDe = (c: string) => erros.find((x) => x.campo === c)?.mensagem ?? null;
  return (
    <div className="pagina-estreita">
      <h1>{convite ? "Aceitar convite" : "Criar nova senha"}</h1>
      <p>{convite ? `Bem-vindo(a), ${usuario.nome}. Crie sua senha para entrar no PEI Vivo.` : "Escolha uma senha nova."}</p>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          salvar.executar();
        }}
      >
        <ResumoErros erros={erros} />
        {salvar.erro && (
          <Alerta tom="erro" vivo>
            {mensagemAmigavel(salvar.erro)}
          </Alerta>
        )}
        <Campo id="senha" rotulo="Nova senha" type="password" autoComplete="new-password" dica={`Pelo menos ${MINIMO} caracteres. Uma frase fácil de lembrar funciona bem.`} required value={senha} onChange={(e) => setSenha(e.target.value)} erro={erroDe("senha")} />
        <Campo id="confirmacao" rotulo="Repita a nova senha" type="password" autoComplete="new-password" required value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} erro={erroDe("confirmacao")} />
        {convite && (
          <div className="campo">
            <label className="opcao" htmlFor="aceite">
              <input id="aceite" type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)} aria-invalid={erroDe("aceite") ? true : undefined} aria-describedby={erroDe("aceite") ? "aceite-erro" : undefined} />
              <span className="opcao__texto">
                <span>
                  Li e aceito os <Link to="/termos">termos de uso e a política de privacidade</Link> (versão {VERSAO_TERMO})
                </span>
              </span>
            </label>
            {erroDe("aceite") && (
              <div id="aceite-erro" className="campo__erro">
                {erroDe("aceite")}
              </div>
            )}
          </div>
        )}
        <div className="grupo-botoes grupo-botoes--empilhado">
          <Botao type="submit" carregando={salvar.ocupado} textoCarregando="Salvando…">
            {convite ? "Criar senha e entrar" : "Salvar nova senha"}
          </Botao>
        </div>
      </form>
    </div>
  );
}
