import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSessao } from "../hooks/useSessao";
import { Carregando } from "../components/Feedback";

/**
 * Sem sessão → /entrar, guardando a origem para voltar depois (heurística 3).
 * D-32: profissional de saúde e coordenação sem segundo fator → verificação.
 * A interface só orienta: o banco nega qualquer dado sensível em aal1.
 */
export function RotaProtegida() {
  const { usuario, carregando, precisaSegundoFator } = useSessao();
  const location = useLocation();
  if (carregando) return <Carregando texto="Verificando sua sessão…" />;
  if (!usuario) return <Navigate to="/entrar" replace state={{ de: location.pathname }} />;
  if (precisaSegundoFator) return <Navigate to="/entrar/verificacao" replace state={{ de: location.pathname }} />;
  return <Outlet />;
}
