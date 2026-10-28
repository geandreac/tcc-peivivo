import { useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { useSessao } from "../hooks/useSessao";
import { useTitulo } from "../hooks/useTitulo";

/**
 * Barra superior do painel administrativo (D-50): título da seção atual e busca geral
 * (pessoas, convites e atividades). Notificações e o menu da conta são os do cabeçalho do site.
 */
export function CabecalhoAdmin({ titulo, descricao, acao }: { titulo: string; descricao?: ReactNode; acao?: ReactNode }) {
  useTitulo(`${titulo} · Administração`);
  const { usuario } = useSessao();
  const navigate = useNavigate();
  // o termo vai no estado da navegação, não na URL: nome de pessoa não fica no histórico do navegador
  const termo = (useLocation().state as { busca?: string } | null)?.busca ?? "";
  const [busca, setBusca] = useState(termo);
  const geral = usuario?.papelPlataforma === "ADMIN_GERAL";

  return (
    <div className="cabecalho-admin">
      <div className="cabecalho-admin__linha">
        <div>
          <p className="cabecalho-admin__escopo">{geral ? "Administração geral" : "Administração da escola"}</p>
          <h1>{titulo}</h1>
        </div>
        <form
          role="search"
          className="busca-admin"
          onSubmit={(e) => {
            e.preventDefault();
            if (busca.trim()) navigate("/admin/busca", { state: { busca: busca.trim() } });
          }}
        >
          <label htmlFor="busca-geral" className="sr-only">
            Buscar pessoas, convites e atividades
          </label>
          <input
            id="busca-geral"
            type="search"
            className="campo__controle"
            placeholder="Pessoa, convite ou ação"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <button type="submit" className="botao botao--secundario">
            <Search aria-hidden="true" size={18} />
            Buscar
          </button>
        </form>
      </div>
      {descricao && <p className="texto-apoio">{descricao}</p>}
      <div className="cabecalho-admin__acoes">
        {!geral && <Link to="/painel">Voltar aos estudantes</Link>}
        {acao}
      </div>
    </div>
  );
}
