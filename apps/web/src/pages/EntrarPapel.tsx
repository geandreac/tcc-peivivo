import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { api, type Usuario } from "../services";
import { useConsulta, useMutacao } from "../hooks/useConsulta";
import { useSessao } from "../hooks/useSessao";
import { useAnuncio } from "../hooks/useAnuncio";
import { useTitulo } from "../hooks/useTitulo";
import { Alerta, Card, Carregando, ErroCarregamento } from "../components/Feedback";
import { Botao } from "../components/Botao";
import { PAPEL } from "../utils/rotulos";
import { perfilPorSlug } from "../utils/perfisLogin";
import { NaoEncontrada } from "./NaoEncontrada";

/**
 * Tela de login de UM perfil (família, professores, equipe de saúde,
 * coordenação): especificação do papel + perfis de demonstração desse papel.
 * Rota inexistente (/entrar/xyz) → 404.
 */
export function EntrarPapel() {
  const { slug } = useParams<{ slug: string }>();
  const espec = perfilPorSlug(slug);
  useTitulo(espec ? `Entrar — ${espec.titulo}` : "Entrar");
  const navigate = useNavigate();
  const location = useLocation();
  const { entrar } = useSessao();
  const { anunciar } = useAnuncio();
  const destino = (location.state as { de?: string } | null)?.de;

  const usuarios = useConsulta<Usuario[]>(() => api.listarPerfisDemo(), []);
  const mutacao = useMutacao(async (u: Usuario) => {
    await entrar(u.id);
    anunciar(`Você entrou como ${u.nome} (${espec ? espec.titulo : ""}).`, "sucesso");
    navigate(destino && !destino.startsWith("/entrar") ? destino : "/painel");
  });

  if (!espec) return <NaoEncontrada />;

  const demo = espec.demo
    .map((d) => ({ ...d, usuario: usuarios.dados?.find((u) => u.id === d.usuarioId) }))
    .filter((d) => d.usuario);

  return (
    <>
      <Link to="/entrar" className="voltar">
        <span aria-hidden="true">←</span> Todos os perfis
      </Link>
      <div className="cabecalho-pagina">
        <div>
          <h1>
            <span className="perfil__glifo" aria-hidden="true">
              {espec.glifo}
            </span>{" "}
            Entrar como {espec.titulo.toLowerCase()}
          </h1>
          <p>
            <strong>{espec.publico}</strong> {espec.contexto}
          </p>
        </div>
      </div>

      <div className="grade-cards">
        <Card titulo="O que você faz aqui">
          <ul>
            {espec.faz.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </Card>
        <Card titulo="O que você vê — e o que nunca vê">
          <p>
            <strong>Vê:</strong>
          </p>
          <ul>
            {espec.ve.map((v) => (
              <li key={v}>{v}</li>
            ))}
          </ul>
          <p>
            <strong>Nunca vê:</strong>
          </p>
          <ul>
            {espec.nuncaVe.map((v) => (
              <li key={v}>{v}</li>
            ))}
          </ul>
        </Card>
      </div>

      <section aria-labelledby="titulo-demo">
        <h2 id="titulo-demo">Escolha um perfil de demonstração</h2>
        <p className="meta">
          Papel no sistema: {PAPEL[espec.papel]}. Sem senha nesta demonstração; os dados são fictícios.
        </p>
        {mutacao.erro && (
          <Alerta tom="erro" vivo>
            Não foi possível entrar. Tente novamente.
          </Alerta>
        )}
        {usuarios.carregando && <Carregando texto="Carregando perfis…" />}
        {usuarios.erro && <ErroCarregamento erro={usuarios.erro} tentarNovamente={usuarios.recarregar} />}
        {usuarios.dados && (
          <div className="perfis" role="group" aria-label={`Perfis de demonstração — ${espec.titulo}`}>
            {demo.map((d) => (
              <button key={d.usuarioId} type="button" className="perfil" onClick={() => mutacao.executar(d.usuario!)} disabled={mutacao.ocupado}>
                <strong>{d.usuario!.nome}</strong>
                <span>{d.usuario!.email}</span>
                <span>{d.mostra}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <Card titulo="Como será o acesso real">
        <ul>
          {espec.acessoReal.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
        <p className="meta">A autenticação por e-mail e senha (Supabase Auth) substitui esta tela sem alterar o restante do sistema (D-16).</p>
      </Card>

      <div className="grupo-botoes">
        <Botao variante="discreto" onClick={() => navigate("/entrar")}>
          Escolher outro perfil
        </Botao>
      </div>
    </>
  );
}
