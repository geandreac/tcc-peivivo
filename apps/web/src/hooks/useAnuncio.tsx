import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

/**
 * Região `aria-live` global (WCAG 4.1.3 — mensagens de status) + toasts visuais.
 * `anunciar(texto)` é lido por leitores de tela sem mover o foco; o toast
 * visual dura 6 s e pode ser fechado (2.2.1: não é essencial, é redundante ao
 * texto que também aparece na própria tela).
 */
export interface Toast {
  id: number;
  texto: string;
  tom: "neutro" | "sucesso" | "erro";
}

interface Anuncio {
  anunciar: (texto: string, tom?: Toast["tom"], opcoes?: { assertivo?: boolean; semToast?: boolean }) => void;
  toasts: Toast[];
  fechar: (id: number) => void;
  polite: string;
  assertive: string;
}

const AnuncioContext = createContext<Anuncio | null>(null);

export function AnuncioProvider({ children }: { children: ReactNode }) {
  const [polite, setPolite] = useState("");
  const [assertive, setAssertive] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const fechar = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const anunciar = useCallback<Anuncio["anunciar"]>(
    (texto, tom = "neutro", opcoes = {}) => {
      // limpa e repõe para que textos iguais sejam relidos
      if (opcoes.assertivo) {
        setAssertive("");
        setTimeout(() => setAssertive(texto), 30);
      } else {
        setPolite("");
        setTimeout(() => setPolite(texto), 30);
      }
      if (!opcoes.semToast) {
        const id = ++seq.current;
        setToasts((t) => [...t, { id, texto, tom }]);
        setTimeout(() => fechar(id), 6000);
      }
    },
    [fechar]
  );

  const valor = useMemo(() => ({ anunciar, toasts, fechar, polite, assertive }), [anunciar, toasts, fechar, polite, assertive]);
  return <AnuncioContext.Provider value={valor}>{children}</AnuncioContext.Provider>;
}

export function useAnuncio(): Anuncio {
  const ctx = useContext(AnuncioContext);
  if (!ctx) throw new Error("useAnuncio precisa de <AnuncioProvider>.");
  return ctx;
}
