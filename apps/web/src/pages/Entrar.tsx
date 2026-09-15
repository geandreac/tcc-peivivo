import { Link, useLocation } from "react-router-dom";
import { useTitulo } from "../hooks/useTitulo";
import { PERFIS_LOGIN } from "../utils/perfisLogin";

/**
 * D-16 (revisão 14/09/2026) — porta de entrada: cada perfil tem a sua tela de
 * login (/entrar/<slug>) com a própria especificação. Aqui só a escolha.
 */
export function Entrar() {
  useTitulo("Entrar");
  const location = useLocation();
  const estado = location.state as { de?: string } | null;

  return (
    <>
      <div className="entrar-capa">
        <img src="/logo-pei-vivo.png" alt="" width="160" height="209" className="entrar-capa__logo" />
        <div>
          <h1>Entrar</h1>
          <p>
            Cada perfil tem a sua própria porta de entrada, com o que pode fazer e o que nunca vê. Escolha quem você é. Nesta demonstração os
            perfis são <strong>fictícios</strong> e não há senha.
          </p>
        </div>
      </div>

      <ul className="perfis" aria-label="Perfis de acesso">
        {PERFIS_LOGIN.map((p) => (
          <li key={p.slug}>
            <Link to={`/entrar/${p.slug}`} state={estado} className="perfil perfil--link">
              <span className="perfil__glifo" aria-hidden="true">
                {p.glifo}
              </span>
              <strong>{p.titulo}</strong>
              <span>{p.publico}</span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="meta">
        Ainda não tem acesso? A coordenação da escola cadastra o estudante e convida a família, a docente e a equipe de saúde. Veja a{" "}
        <Link to="/ajuda">ajuda</Link>.
      </p>
    </>
  );
}
