import { useEffect, useState } from "react";
import { Botao } from "./Botao";

/** Voz do próprio navegador (Web Speech API): sem rede, sem custo, sem enviar o texto a ninguém. */
function sintese(): SpeechSynthesis | null {
  return typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
}

/**
 * D-43 — "Ouvir este trecho": apoio para quem tem dificuldade de leitura.
 * Some quando o navegador não tem voz (nada de botão que não funciona) e na
 * impressão. Um trecho por vez; ritmo um pouco mais lento que o padrão.
 */
export function BotaoOuvir({ texto, trecho }: { texto: string; trecho: number }) {
  const [falando, setFalando] = useState(false);
  const voz = sintese();

  useEffect(() => () => {
    if (falando) sintese()?.cancel();
  }, [falando]);

  if (!voz) return null;

  const alternar = () => {
    voz.cancel();
    if (falando) {
      setFalando(false);
      return;
    }
    const fala = new SpeechSynthesisUtterance(texto);
    fala.lang = "pt-BR";
    fala.rate = 0.9;
    fala.onend = () => setFalando(false);
    fala.onerror = () => setFalando(false);
    setFalando(true);
    voz.speak(fala);
  };

  return (
    <Botao variante="discreto" pequeno className="material__ouvir nao-imprimir" onClick={alternar}>
      <span aria-hidden="true">{falando ? "■ " : "▶ "}</span>
      {falando ? "Parar" : "Ouvir"}
      <span className="sr-only"> o trecho {trecho}</span>
    </Botao>
  );
}
