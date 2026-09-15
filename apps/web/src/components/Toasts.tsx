import { useAnuncio } from "../hooks/useAnuncio";

/**
 * Regiões live globais (sempre no DOM, para que os leitores de tela as
 * registrem antes da primeira mensagem) + lista visual de toasts.
 */
export function Toasts() {
  const { toasts, fechar, polite, assertive } = useAnuncio();
  return (
    <>
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {polite}
      </div>
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {assertive}
      </div>
      {toasts.length > 0 && (
        <div className="toasts">
          {toasts.map((t) => (
            <div key={t.id} className={`toast${t.tom !== "neutro" ? ` toast--${t.tom}` : ""}`}>
              <span>{t.texto}</span>
              <button type="button" className="botao botao--pequeno" onClick={() => fechar(t.id)} aria-label={`Fechar aviso: ${t.texto}`}>
                Fechar
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
