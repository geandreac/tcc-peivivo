import { useLocation } from "react-router-dom";
import { LinkBotao } from "../components/Botao";
import { useTitulo } from "../hooks/useTitulo";
import { useSessao } from "../hooks/useSessao";

/** Rota inexistente (heurística 9): diz o que houve e oferece saídas. */
export function NaoEncontrada() {
  useTitulo("Página não encontrada");
  const { pathname } = useLocation();
  const { usuario } = useSessao();
  return (
    <div className="estado-vazio" style={{ textAlign: "left" }}>
      <h1>Página não encontrada</h1>
      <p>
        O endereço <code>{pathname}</code> não existe ou foi movido. Verifique o link ou use uma das opções abaixo.
      </p>
      <div className="grupo-botoes">
        <LinkBotao to={usuario ? "/painel" : "/"}>{usuario ? "Ir para meus estudantes" : "Ir para o início"}</LinkBotao>
        <LinkBotao to="/ajuda" variante="secundario">
          Ver a ajuda
        </LinkBotao>
      </div>
    </div>
  );
}
