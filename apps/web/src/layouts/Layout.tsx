import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useSessao } from "../hooks/useSessao";
import { useAnuncio } from "../hooks/useAnuncio";
import { Toasts } from "../components/Toasts";
import { PAPEL } from "../utils/rotulos";
import { Accessibility, Bell, CircleHelp, ClipboardCheck, LogOut, UsersRound, type LucideIcon } from "lucide-react";
import { api } from "../services";
import { useConsulta } from "../hooks/useConsulta";

const ITENS_NAV: { rota: string; rotulo: string; Icone: LucideIcon }[] = [
  { rota: "/painel", rotulo: "Estudantes", Icone: UsersRound },
  { rota: "/pendencias", rotulo: "Pendências", Icone: ClipboardCheck },
  { rota: "/ajuda", rotulo: "Ajuda", Icone: CircleHelp },
  { rota: "/acessibilidade", rotulo: "Acessibilidade", Icone: Accessibility },
];

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

  // Contagem de não lidas: recarrega a cada troca de tela (sem polling, sem push).
  const naoLidas = useConsulta<number>(
    async () => (usuario ? (await api.listarNotificacoes()).filter((n) => !n.lidaEm).length : 0),
    [usuario?.id, location.pathname]
  );
  const contagem = naoLidas.dados ?? 0;

  async function aoSair() {
    await sair();
    anunciar("Você saiu da sua conta.", "neutro");
    navigate("/");
  }

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
          {usuario ? (
            <div className="sessao">
              <NavLink to="/notificacoes" className="sino" aria-label={contagem > 0 ? `Notificações, ${contagem} não lida${contagem > 1 ? "s" : ""}` : "Notificações"}>
                <Bell aria-hidden="true" size={22} />
                {contagem > 0 && (
                  <span className="sino__contagem" aria-hidden="true">
                    {contagem > 9 ? "9+" : contagem}
                  </span>
                )}
              </NavLink>
              <span className="sessao__nome">
                <strong>{usuario.nome}</strong>
                {usuario.papelInstitucional && <span className="sessao__papel">{PAPEL[usuario.papelInstitucional]}</span>}
              </span>
              <button type="button" className="botao botao--discreto botao--pequeno" onClick={aoSair}>
                <LogOut aria-hidden="true" size={18} />
                Sair
              </button>
            </div>
          ) : (
            <nav className="nav-publica" aria-label="Principal">
              <ul>
                <li>
                  <NavLink to="/" end>
                    Início
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/ajuda">Ajuda</NavLink>
                </li>
                <li>
                  <NavLink to="/acessibilidade">Acessibilidade</NavLink>
                </li>
                <li>
                  <NavLink to="/entrar" state={{ de: location.pathname }}>
                    Entrar
                  </NavLink>
                </li>
              </ul>
            </nav>
          )}
        </div>
      </header>

      <div className={usuario ? "app app--com-nav" : "app"}>
        {usuario && (
          /* Um único <nav>: lateral no desktop, barra inferior no celular (prompt §7.1). Só o CSS muda. */
          <nav className="nav-app" aria-label="Principal">
            <ul>
              {ITENS_NAV.map(({ rota, rotulo, Icone }) => (
                <li key={rota}>
                  <NavLink to={rota}>
                    <Icone aria-hidden="true" size={22} strokeWidth={2} />
                    <span>{rotulo}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        )}
        <main id="conteudo" tabIndex={-1}>
          <div className="container">
            <Outlet />
          </div>
        </main>
      </div>

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
