import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

interface Base {
  rotulo: string;
  /** Instrução de preenchimento (WCAG 3.3.2) — ligada por aria-describedby. */
  dica?: ReactNode;
  /** Mensagem de erro (WCAG 3.3.1/3.3.3) — ligada por aria-describedby + aria-invalid. */
  erro?: string | null;
  opcional?: boolean;
  /** Id fixo para que o Resumo de erros consiga linkar o campo. */
  id?: string;
}

type CampoTextoProps = Base & { tipo?: "texto" } & Omit<InputHTMLAttributes<HTMLInputElement>, "id">;
type CampoAreaProps = Base & { tipo: "area" } & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id">;
type CampoSelectProps = Base & { tipo: "select"; children: ReactNode } & Omit<SelectHTMLAttributes<HTMLSelectElement>, "id">;

type CampoProps = CampoTextoProps | CampoAreaProps | CampoSelectProps;

/**
 * Campo de formulário com `<label for>`, dica e erro associados via
 * `aria-describedby`, `aria-invalid` quando há erro, `required` nativo
 * sinalizado no rótulo. Sem placeholder como único rótulo.
 */
export function Campo(props: CampoProps) {
  const gerado = useId();
  const id = props.id ?? gerado;
  const idDica = `${id}-dica`;
  const idErro = `${id}-erro`;
  const { rotulo, dica, erro, opcional } = props;
  const describedBy = [dica ? idDica : null, erro ? idErro : null].filter(Boolean).join(" ") || undefined;

  const comuns = {
    id,
    className: "campo__controle",
    "aria-describedby": describedBy,
    "aria-invalid": erro ? true : undefined,
    "aria-required": !opcional && props.required ? true : undefined,
  } as const;

  let controle: ReactNode;
  if (props.tipo === "area") {
    const { rotulo: _r, dica: _d, erro: _e, opcional: _o, tipo: _t, id: _i, ...rest } = props;
    controle = <textarea {...comuns} {...rest} />;
  } else if (props.tipo === "select") {
    const { rotulo: _r, dica: _d, erro: _e, opcional: _o, tipo: _t, id: _i, children, ...rest } = props;
    controle = (
      <select {...comuns} {...rest}>
        {children}
      </select>
    );
  } else {
    const { rotulo: _r, dica: _d, erro: _e, opcional: _o, tipo: _t, id: _i, ...rest } = props;
    controle = <input type="text" {...comuns} {...rest} />;
  }

  return (
    <div className="campo">
      <label htmlFor={id} className="campo__rotulo">
        {rotulo} {opcional && <span className="campo__opcional">(opcional)</span>}
      </label>
      {dica && (
        <div id={idDica} className="campo__dica">
          {dica}
        </div>
      )}
      {controle}
      {erro && (
        <div id={idErro} className="campo__erro">
          {erro}
        </div>
      )}
    </div>
  );
}
