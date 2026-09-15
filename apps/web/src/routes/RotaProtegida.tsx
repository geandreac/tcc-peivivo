import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSessao } from "../hooks/useSessao";

/** Sem sessão → /entrar, guardando a origem para voltar depois (heurística 3). */
export function RotaProtegida() {
  const { usuario } = useSessao();
  const location = useLocation();
  if (!usuario) return <Navigate to="/entrar" replace state={{ de: location.pathname }} />;
  return <Outlet />;
}
