import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, type NivelSessao, type ResultadoEntrada, type Usuario } from "../services";

interface Sessao {
  usuario: Usuario | null;
  /** Modo real: restaurando a sessão salva pelo Auth (ao abrir o app ou voltar de um link de e-mail). */
  carregando: boolean;
  /** D-32: nível de garantia da sessão. Na demonstração é sempre "aal2". */
  nivel: NivelSessao;
  /** Precisa passar pela verificação em duas etapas antes de usar o sistema. */
  precisaSegundoFator: boolean;
  /** Demonstração (D-16): entra escolhendo um perfil fictício. */
  entrar: (usuarioId: string) => Promise<Usuario>;
  /** Sistema real (D-32): e-mail + senha. */
  entrarComSenha: (email: string, senha: string) => Promise<ResultadoEntrada>;
  /** Relê usuário e nível (depois de verificar o código ou definir a senha). */
  atualizar: () => Promise<void>;
  sair: () => Promise<void>;
  sairDeTodos: () => Promise<void>;
}

const SessaoContext = createContext<Sessao | null>(null);

export function SessaoProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(() => api.usuarioAtual());
  const [nivel, setNivel] = useState<NivelSessao>(api.modo === "real" ? "aal1" : "aal2");
  const [carregando, setCarregando] = useState(api.modo === "real");

  const atualizar = useCallback(async () => {
    const u = await api.carregarSessao();
    setUsuario(u);
    setNivel(u ? (await api.nivelSessao()).atual : "aal1");
  }, []);

  useEffect(() => {
    if (api.modo !== "real") return;
    let ativo = true;
    atualizar().finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, [atualizar]);

  const entrar = useCallback(async (usuarioId: string) => {
    const u = await api.entrar(usuarioId);
    setUsuario(u);
    return u;
  }, []);

  const entrarComSenha = useCallback(async (email: string, senha: string) => {
    const r = await api.entrarComSenha(email, senha);
    setUsuario(r.usuario);
    setNivel(r.exigeSegundoFator ? "aal1" : (await api.nivelSessao()).atual);
    return r;
  }, []);

  const sair = useCallback(async () => {
    await api.sair();
    setUsuario(null);
  }, []);

  const sairDeTodos = useCallback(async () => {
    await api.sairDeTodos();
    setUsuario(null);
  }, []);

  const precisaSegundoFator = api.modo === "real" && Boolean(usuario?.exigeSegundoFator) && nivel !== "aal2";

  const valor = useMemo(
    () => ({ usuario, carregando, nivel, precisaSegundoFator, entrar, entrarComSenha, atualizar, sair, sairDeTodos }),
    [usuario, carregando, nivel, precisaSegundoFator, entrar, entrarComSenha, atualizar, sair, sairDeTodos],
  );
  return <SessaoContext.Provider value={valor}>{children}</SessaoContext.Provider>;
}

export function useSessao(): Sessao {
  const ctx = useContext(SessaoContext);
  if (!ctx) throw new Error("useSessao precisa de <SessaoProvider>.");
  return ctx;
}
