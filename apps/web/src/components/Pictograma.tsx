import type { ReactNode } from "react";
import type { Pictograma as Id } from "@pei-vivo/motor-adaptacao";

/**
 * D-43 — pictogramas dos comandos de enunciado. Desenho próprio (sem licença
 * de terceiros), traço em `currentColor` para herdar o contraste do perfil
 * (4,5 ou 7:1). Decorativo para leitor de tela: a etapa já começa com o verbo.
 */
const TRACOS: Record<Id, ReactNode> = {
  LER: (
    <>
      <path d="M3 5.5C5.5 4.5 8.5 4.5 12 6.5v13c-3.5-2-6.5-2-9-1z" />
      <path d="M21 5.5c-2.5-1-5.5-1-9 1v13c3.5-2 6.5-2 9-1z" />
    </>
  ),
  ESCREVER: (
    <>
      <path d="M15.5 4.5l4 4L9 19l-5 1 1-5z" />
      <path d="M13.5 6.5l4 4" />
    </>
  ),
  CIRCULAR: (
    <>
      <ellipse cx="12" cy="12" rx="9" ry="6" />
      <path d="M8 12h8" />
    </>
  ),
  MARCAR: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M8 12.5l3 3 5-6.5" />
    </>
  ),
  PINTAR: (
    <>
      <path d="M14 4l6 6-7.5 7.5-6-6z" />
      <path d="M6.5 11.5L4 17c-.5 1.5.5 3 2 3s2.5-1 3-2l3-1.5" />
    </>
  ),
  RESPONDER: (
    <>
      <path d="M4 5h16v11H10l-4 4v-4H4z" />
      <path d="M8 9h8M8 12h5" />
    </>
  ),
  COMPLETAR: (
    <>
      <path d="M3 9h5M16 9h5M3 15h18" />
      <rect x="9.5" y="6" width="5" height="6" rx="1" strokeDasharray="2 1.5" />
    </>
  ),
  COPIAR: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h3" />
    </>
  ),
  DESENHAR: (
    <>
      <path d="M3 17c3-6 5 2 8-3s5-1 7-4" />
      <path d="M17 4l3 3-2 2-3-3z" />
    </>
  ),
  OBSERVAR: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  SUBLINHAR: (
    <>
      <path d="M7 4v6a5 5 0 0010 0V4" />
      <path d="M4 20h16" strokeWidth="3" />
    </>
  ),
  LIGAR: (
    <>
      <circle cx="5" cy="7" r="2.5" />
      <circle cx="19" cy="17" r="2.5" />
      <path d="M7.5 7.5c5 0 4 9 9 9" />
    </>
  ),
  CALCULAR: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 8h8M8 13h2M14 13h2M8 17h2M14 17h2" />
    </>
  ),
  CONTAR: <path d="M6 5v14M10 5v14M14 5v14M18 5v14M4 15l16-6" />,
  RECORTAR: (
    <>
      <circle cx="6" cy="17" r="3" />
      <circle cx="18" cy="17" r="3" />
      <path d="M8 15L19 4M16 15L5 4" />
    </>
  ),
  COLAR: (
    <>
      <rect x="7" y="9" width="10" height="12" rx="2" />
      <path d="M9 9V6h6v3M11 6V3h2v3" />
    </>
  ),
  ESCOLHER: (
    <>
      <circle cx="6" cy="7" r="2" />
      <circle cx="6" cy="17" r="2" />
      <circle cx="6" cy="17" r="0.6" fill="currentColor" />
      <path d="M11 7h9M11 17h9" />
    </>
  ),
  EXPLICAR: (
    <>
      <path d="M9 17h6M10 20h4" />
      <path d="M12 3a6 6 0 00-3.5 10.9V17h7v-3.1A6 6 0 0012 3z" />
    </>
  ),
  ORGANIZAR: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1" />
      <rect x="13" y="4" width="7" height="7" rx="1" />
      <rect x="4" y="13" width="7" height="7" rx="1" />
      <rect x="13" y="13" width="7" height="7" rx="1" />
    </>
  ),
  PROCURAR: (
    <>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="M15 15l5.5 5.5" />
    </>
  ),
};

export function Pictograma({ id }: { id: Id }) {
  return (
    <svg
      className="pictograma"
      viewBox="0 0 24 24"
      width="40"
      height="40"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      data-pictograma={id}
    >
      {TRACOS[id]}
    </svg>
  );
}
