import { useEffect, useRef } from "react";

const EVENTOS = ["pointerdown", "keydown", "scroll", "touchstart"] as const;

/**
 * D-32 / prompt §4.1: encerra a sessão após `minutos` sem interação, só para
 * quem vê dado de saúde ou administra a escola. O aviso sai por região viva
 * (anunciar) e a pessoa volta para Entrar — sem perder o motivo.
 */
export function useInatividade(ativo: boolean, minutos: number, aoExpirar: () => void) {
  const callback = useRef(aoExpirar);
  callback.current = aoExpirar;

  useEffect(() => {
    if (!ativo) return;
    let relogio: ReturnType<typeof setTimeout>;
    const reiniciar = () => {
      clearTimeout(relogio);
      relogio = setTimeout(() => callback.current(), minutos * 60_000);
    };
    reiniciar();
    for (const e of EVENTOS) window.addEventListener(e, reiniciar, { passive: true });
    return () => {
      clearTimeout(relogio);
      for (const e of EVENTOS) window.removeEventListener(e, reiniciar);
    };
  }, [ativo, minutos]);
}
