/**
 * Onde o supabase-js guarda a sessão (D-49). Com "Lembrar de mim", no localStorage
 * (sobrevive ao fechar o navegador); sem, no sessionStorage (some ao fechar),
 * o padrão mais seguro em aparelho compartilhado. Só o token de login fica no
 * navegador; nenhum dado de estudante (RNF05).
 */
const CHAVE_LEMBRAR = "peivivo:lembrar";

export function lembrarSessao(sim: boolean) {
  try {
    if (sim) localStorage.setItem(CHAVE_LEMBRAR, "1");
    else localStorage.removeItem(CHAVE_LEMBRAR);
  } catch {
    // armazenamento bloqueado: o supabase-js segue com a sessão só em memória
  }
}

const destino = () => (localStorage.getItem(CHAVE_LEMBRAR) ? localStorage : sessionStorage);

export const armazenamentoSessao = {
  getItem: (chave: string) => sessionStorage.getItem(chave) ?? localStorage.getItem(chave),
  setItem: (chave: string, valor: string) => {
    const alvo = destino();
    (alvo === localStorage ? sessionStorage : localStorage).removeItem(chave);
    alvo.setItem(chave, valor);
  },
  removeItem: (chave: string) => {
    localStorage.removeItem(chave);
    sessionStorage.removeItem(chave);
  },
};
