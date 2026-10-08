import { Link, useNavigate } from "react-router-dom";
import { api, mensagemAmigavel } from "../services";
import { useSessao } from "../hooks/useSessao";
import { useConsulta, useMutacao } from "../hooks/useConsulta";
import { useAnuncio } from "../hooks/useAnuncio";
import { useTitulo } from "../hooks/useTitulo";
import { Alerta, Badge, Card, Carregando } from "../components/Feedback";
import { Botao, LinkBotao } from "../components/Botao";

/** F13 — Conta e segurança: verificação em duas etapas, senha, sair de todos os dispositivos. */
export function Conta() {
  useTitulo("Conta e segurança");
  const navigate = useNavigate();
  const { anunciar } = useAnuncio();
  const { usuario, sairDeTodos } = useSessao();
  const nivel = useConsulta(() => api.nivelSessao(), [usuario?.id]);
  const sairTodos = useMutacao(async () => {
    await sairDeTodos();
    anunciar("Você saiu de todos os dispositivos.", "neutro");
    navigate("/");
  });

  if (!usuario) return null;
  const real = api.modo === "real";
  return (
    <>
      <h1>Conta e segurança</h1>
      <p>
        <strong>{usuario.nome}</strong>
        {usuario.email && <> · {usuario.email}</>}
      </p>
      {!real && (
        <Alerta tom="info" titulo="Demonstração">
          Nesta demonstração não há senha nem verificação em duas etapas. No sistema real, esta tela permite trocar a senha, cadastrar o
          aplicativo autenticador e sair de todos os dispositivos.
        </Alerta>
      )}
      <div className="grade-cards grade-cards--3">
        <Card titulo="Verificação em duas etapas" nivel={2} className="card--acao">
          {nivel.carregando ? (
            <Carregando />
          ) : (
            <>
              <p>
                {nivel.dados?.temFatorCadastrado ? <Badge tom="sucesso">Ativa</Badge> : <Badge tom="aviso">Não cadastrada</Badge>}{" "}
                {usuario.exigeSegundoFator ? "Obrigatória para o seu papel." : "Opcional para o seu papel, mas recomendada."}
              </p>
              {real && !nivel.dados?.temFatorCadastrado && (
                <LinkBotao to="/entrar/verificacao" variante="secundario" pequeno>
                  Cadastrar agora
                </LinkBotao>
              )}
            </>
          )}
        </Card>
        <Card titulo="Senha" nivel={2} className="card--acao">
          <p>Para trocar a senha, enviaremos um link para o seu e-mail.</p>
          {real && (
            <LinkBotao to="/recuperar-senha" variante="secundario" pequeno>
              Trocar senha
            </LinkBotao>
          )}
        </Card>
        <Card titulo="Dispositivos" nivel={2} className="card--acao">
          <p>Perdeu o celular ou usou um computador compartilhado? Encerre a sessão em todos os lugares.</p>
          {sairTodos.erro && (
            <Alerta tom="erro" vivo>
              {mensagemAmigavel(sairTodos.erro)}
            </Alerta>
          )}
          <Botao variante="secundario" pequeno onClick={() => sairTodos.executar()} carregando={sairTodos.ocupado} textoCarregando="Saindo…">
            Sair de todos os dispositivos
          </Botao>
        </Card>
      </div>
      <p className="meta">
        <Link to="/termos">Termos de uso e privacidade</Link>
      </p>
    </>
  );
}
