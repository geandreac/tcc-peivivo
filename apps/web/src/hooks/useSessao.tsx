import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { api, type Usuario } from "../services";

interface Sessao {
  usuario: Usuario | null;
  entrar: (usuarioId: string) => Promise<Usuario>;
  sair: () => Promise<void>;
}

const SessaoContext = createContext<Sessao | null>(null);

export function SessaoProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(() => api.usuarioAtual());

  const entrar = useCallback(async (usuarioId: string) => {
    const u = await api.entrar(usuarioId);
    setUsuario(u);
    return u;
  }, []);

  const sair = useCallback(async () => {
    await api.sair();
    setUsuario(null);
  }, []);

  const valor = useMemo(() => ({ usuario, entrar, sair }), [usuario, entrar, sair]);
  return <SessaoContext.Provider value={valor}>{children}</SessaoContext.Provider>;
}

export function useSessao(): Sessao {
  const ctx = useContext(SessaoContext);
  if (!ctx) throw new Error("useSessao precisa de <SessaoProvider>.");
  return ctx;
}
