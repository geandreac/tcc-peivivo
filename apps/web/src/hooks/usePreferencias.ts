import { useCallback, useEffect, useState } from "react";

/**
 * Preferências de acessibilidade do usuário, aplicadas como atributos em
 * <html> (ver tokens.css): contraste, tamanho de fonte, movimento.
 * Persistem em localStorage — só conveniência por dispositivo.
 */
export interface Preferencias {
  contraste: "padrao" | "alto";
  fonte: "padrao" | "grande" | "maior";
  movimento: "padrao" | "reduzido";
}

const CHAVE = "pei-vivo:preferencias";
const PADRAO: Preferencias = { contraste: "padrao", fonte: "padrao", movimento: "padrao" };

function ler(): Preferencias {
  try {
    const bruto = localStorage.getItem(CHAVE);
    return bruto ? { ...PADRAO, ...(JSON.parse(bruto) as Partial<Preferencias>) } : PADRAO;
  } catch {
    return PADRAO;
  }
}

export function aplicarPreferencias(p: Preferencias) {
  const raiz = document.documentElement;
  if (p.contraste === "alto") raiz.setAttribute("data-contraste", "alto");
  else raiz.removeAttribute("data-contraste");
  if (p.fonte !== "padrao") raiz.setAttribute("data-fonte", p.fonte);
  else raiz.removeAttribute("data-fonte");
  if (p.movimento === "reduzido") raiz.setAttribute("data-movimento", "reduzido");
  else raiz.removeAttribute("data-movimento");
}

export function usePreferencias() {
  const [prefs, setPrefs] = useState<Preferencias>(ler);

  useEffect(() => {
    aplicarPreferencias(prefs);
    try {
      localStorage.setItem(CHAVE, JSON.stringify(prefs));
    } catch {
      /* ignora */
    }
  }, [prefs]);

  const definir = useCallback(<K extends keyof Preferencias>(chave: K, valor: Preferencias[K]) => {
    setPrefs((p) => ({ ...p, [chave]: valor }));
  }, []);

  const redefinir = useCallback(() => setPrefs(PADRAO), []);

  return { prefs, definir, redefinir };
}
