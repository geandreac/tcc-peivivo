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
  /** R4.6: "sistema" segue prefers-color-scheme. */
  tema: "sistema" | "claro" | "escuro";
  /** R4.6: fonte de alta legibilidade e mais espaçamento (preferência, nunca rótulo). */
  leitura: "padrao" | "facilitada";
}

const CHAVE = "pei-vivo:preferencias";
const PADRAO: Preferencias = { contraste: "padrao", fonte: "padrao", movimento: "padrao", tema: "sistema", leitura: "padrao" };

export function lerPreferencias(): Preferencias {
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
  if (p.tema !== "sistema") raiz.setAttribute("data-tema", p.tema);
  else raiz.removeAttribute("data-tema");
  if (p.leitura === "facilitada") raiz.setAttribute("data-leitura", "facilitada");
  else raiz.removeAttribute("data-leitura");
}

export function usePreferencias() {
  const [prefs, setPrefs] = useState<Preferencias>(lerPreferencias);

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
