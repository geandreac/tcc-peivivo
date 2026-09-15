import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useSessao } from "../hooks/useSessao";
import { useAnuncio } from "../hooks/useAnuncio";
import { Toasts } from "../components/Toasts";
import { PAPEL } from "../utils/rotulos";

function Logo() {
  return (
    <svg className="marca__logo" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <rect width="64" height="64" rx="14" fill="currentColor" />
      <path d="M18 44V20h11.5c6 0 9.5 3.4 9.5 8.3S35.5 36.5 29.5 36.5H24V44h-6zm6-12.5h5c2.7 0 4.2-1.3 4.2-3.3s-1.5-3.2-4.2-3.2h-5v6.5z" fill="#fff" />
      <circle cx="46" cy="40" r="5" fill="#8BD3C7" />
    </svg>
  );
}

/**
 * Landmarks: header > nav · main · footer. Skip link como primeiro elemento
 * focável (2.4.1). `main` recebe foco via skip link (tabIndex -1).
 * Navegação consistente em todas as telas (3.2.3) e identificação consistente (3.2.4).
 */
export function Layout() {
  const { usuario, sair } = useSessao();
  const { anunciar } = useAnuncio();
  const navigate = useNavigate();
  const location = useLocation();

  async function aoSair() {
    await sair();
    anunciar("Você saiu da sua conta.", "neutro");
    navigate("/");
  }

  const papelInstitucional = usuario?.papelInstitucional === "COORDENACAO";

  return (
    <>
      <a href="#conteudo" className="skip-link">
        Pular para o conteúdo principal
      </a>
      <header className="cabecalho">
        <div className="container cabecalho__linha">
          <NavLink to={usuario ? "/painel" : "/"} className="marca" aria-label="PEI Vivo — página inicial">
            <Logo />
            <span>PEI Vivo</span>
          </NavLink>
          <nav className="nav-principal" aria-label="Principal">
            <ul>
              {usuario ? (
                <>
                  <li>
                    <NavLink to="/painel">Meus estudantes</NavLink>
                  </li>
                  {papelInstitucional && (
                    <li>
                      <NavLink to="/coordenacao/cadastrar">Cadastrar estudante</NavLink>
                    </li>
                  )}
                  <li>
                    <NavLink to="/pendencias">Pendências</NavLink>
                  </li>
                </>
              ) : (
                <li>
                  <NavLink to="/" end>
                    Início
                  </NavLink>
                </li>
              )}
              <li>
                <NavLink to="/ajuda">Ajuda</NavLink>
              </li>
              <li>
                <NavLink to="/acessibilidade">Acessibilidade</NavLink>
              </li>
              {!usuario && (
                <li>
                  <NavLink to="/entrar" state={{ de: location.pathname }}>
                    Entrar
                  </NavLink>
                </li>
              )}
            </ul>
          </nav>
          {usuario && (
            <div className="sessao">
              <span>
                <strong>{usuario.nome}</strong>
                {usuario.papelInstitucional && <> · {PAPEL[usuario.papelInstitucional]}</>}
              </span>
              <button type="button" className="botao botao--discreto botao--pequeno" onClick={aoSair}>
                Sair
              </button>
            </div>
          )}
        </div>
      </header>

      <main id="conteudo" tabIndex={-1}>
        <div className="container">
          <Outlet />
        </div>
      </main>

      <footer className="rodape">
        <div className="container">
          <p>
            PEI Vivo — TCC de Sistemas de Informação, CEUNI FAMETRO, 2026. Protótipo com dados <strong>fictícios</strong>; a camada de IA está desligada.
          </p>
          <ul>
            <li>
              <NavLink to="/ajuda">Ajuda</NavLink>
            </li>
            <li>
              <NavLink to="/acessibilidade">Acessibilidade</NavLink>
            </li>
            <li>
              <a href="https://www.w3.org/TR/WCAG22/" rel="noopener noreferrer">
                WCAG 2.2
              </a>
            </li>
          </ul>
        </div>
      </footer>
      <Toasts />
    </>
  );
}
