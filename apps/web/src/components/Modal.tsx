import { useEffect, useId, useRef, type ReactNode } from "react";

interface ModalProps {
  aberto: boolean;
  titulo: string;
  onFechar: () => void;
  children: ReactNode;
  acoes?: ReactNode;
}

/**
 * Modal sobre `<dialog>` nativo com `showModal()`: o navegador provê a
 * armadilha de foco (2.1.2 sem armadilha real: Esc sempre fecha), inércia do
 * fundo e `Esc`. Ao fechar, o foco volta ao elemento que o abriu (2.4.3).
 * ARIA mínima: só `aria-labelledby` (o papel `dialog` é nativo).
 */
export function Modal({ aberto, titulo, onFechar, children, acoes }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();
  const origem = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (aberto && !el.open) {
      origem.current = document.activeElement as HTMLElement | null;
      el.showModal();
      // foca o título para que o leitor de tela anuncie o diálogo
      el.querySelector<HTMLElement>("h2")?.focus();
    } else if (!aberto && el.open) {
      el.close();
    }
  }, [aberto]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const aoFechar = () => {
      onFechar();
      origem.current?.focus();
    };
    el.addEventListener("close", aoFechar);
    return () => el.removeEventListener("close", aoFechar);
  }, [onFechar]);

  return (
    <dialog ref={ref} className="modal" aria-labelledby={idTitulo} onCancel={(e) => { e.preventDefault(); ref.current?.close(); }}>
      <div className="modal__conteudo">
        <h2 id={idTitulo} tabIndex={-1}>
          {titulo}
        </h2>
        <div>{children}</div>
        <div className="modal__acoes">
          {acoes}
          <button type="button" className="botao botao--secundario" onClick={() => ref.current?.close()}>
            Cancelar
          </button>
        </div>
      </div>
    </dialog>
  );
}
