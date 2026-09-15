import { useEffect } from "react";

/**
 * WCAG 2.4.2 (título da página) + gestão de foco em SPA: ao trocar de rota,
 * o título muda e o foco vai para o <h1>, que anuncia a nova tela ao leitor
 * de tela sem precisar de região live.
 */
export function useTitulo(titulo: string, focarH1 = true) {
  useEffect(() => {
    document.title = `${titulo} · PEI Vivo`;
    if (!focarH1) return;
    const h1 = document.querySelector<HTMLElement>("main h1");
    if (h1) {
      if (!h1.hasAttribute("tabindex")) h1.setAttribute("tabindex", "-1");
      h1.focus({ preventScroll: false });
    }
  }, [titulo, focarH1]);
}
