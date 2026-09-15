import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";

type Variante = "primario" | "secundario" | "perigo" | "discreto";

interface BaseProps {
  variante?: Variante;
  largo?: boolean;
  pequeno?: boolean;
  children: ReactNode;
}

interface BotaoProps extends BaseProps, Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** Estado de carregamento: desabilita e mostra spinner + texto acessível. */
  carregando?: boolean;
  textoCarregando?: string;
}

function classes(variante: Variante, largo?: boolean, pequeno?: boolean, extra?: string) {
  return ["botao", variante !== "primario" && `botao--${variante}`, largo && "botao--largo", pequeno && "botao--pequeno", extra]
    .filter(Boolean)
    .join(" ");
}

/**
 * `<button>` para ações. Nunca `<div>` ou `<span>` (regra 8.2).
 * Alvo mínimo 44×44 px via CSS. Loading usa `aria-busy` + texto vivo.
 */
export function Botao({ variante = "primario", largo, pequeno, carregando, textoCarregando = "Aguarde…", children, className, disabled, type = "button", ...rest }: BotaoProps) {
  return (
    <button type={type} className={classes(variante, largo, pequeno, className)} disabled={disabled || carregando} aria-busy={carregando || undefined} {...rest}>
      {carregando && <span className="botao__spinner" aria-hidden="true" />}
      <span>{carregando ? textoCarregando : children}</span>
    </button>
  );
}

interface LinkBotaoProps extends BaseProps, Omit<LinkProps, "children"> {}

/** `<a>` para navegação com aparência de botão (regra 8.2: `a` navega, `button` age). */
export function LinkBotao({ variante = "primario", largo, pequeno, children, className, ...rest }: LinkBotaoProps) {
  return (
    <Link className={classes(variante, largo, pequeno, className)} {...rest}>
      {children}
    </Link>
  );
}
