import { useEffect, useRef, type ReactNode } from "react";
import { mensagemAmigavel } from "../services/erros";
import { Botao } from "./Botao";

/* ------------------------------------------------------------------ Alerta */
type Tom = "info" | "sucesso" | "aviso" | "erro";
const ICONE: Record<Tom, string> = { info: "i", sucesso: "✓", aviso: "!", erro: "✕" };
const NOME: Record<Tom, string> = { info: "Informação", sucesso: "Sucesso", aviso: "Atenção", erro: "Erro" };

interface AlertaProps {
  tom?: Tom;
  titulo?: string;
  children: ReactNode;
  /** `role="alert"` para erros críticos (assertivo); `status` para o resto. */
  vivo?: boolean;
  className?: string;
}

/**
 * Cor + ícone + texto: nunca só cor (WCAG 1.4.1). O ícone é decorativo
 * (aria-hidden) porque o tom já está no texto do título.
 */
export function Alerta({ tom = "info", titulo, children, vivo, className }: AlertaProps) {
  const role = vivo ? (tom === "erro" ? "alert" : "status") : undefined;
  return (
    <div className={`alerta alerta--${tom} ${className ?? ""}`} role={role}>
      <span className="alerta__icone" aria-hidden="true">
        {ICONE[tom]}
      </span>
      <div className="alerta__corpo">
        <strong className="alerta__titulo">{titulo ?? NOME[tom]}</strong>
        {typeof children === "string" ? <p>{children}</p> : children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Resumo de erros */
export interface ErroCampo {
  campo: string; // id do campo
  mensagem: string;
}

/**
 * WCAG 3.3.1: erros identificados em texto, no topo do formulário, com link
 * para cada campo. Recebe foco ao aparecer para que leitores de tela leiam.
 */
export function ResumoErros({ erros }: { erros: ErroCampo[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (erros.length > 0) ref.current?.focus();
  }, [erros]);
  if (erros.length === 0) return null;
  return (
    <div className="resumo-erros" ref={ref} tabIndex={-1} role="alert" aria-labelledby="resumo-erros-titulo">
      <h2 id="resumo-erros-titulo">
        {erros.length === 1 ? "Há 1 problema no formulário" : `Há ${erros.length} problemas no formulário`}
      </h2>
      <ul>
        {erros.map((e) => (
          <li key={e.campo}>
            <a href={`#${e.campo}`} onClick={(ev) => { ev.preventDefault(); document.getElementById(e.campo)?.focus(); }}>
              {e.mensagem}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ Estados */
export function Carregando({ texto = "Carregando…" }: { texto?: string }) {
  return (
    <div className="carregando" role="status" aria-live="polite">
      <span className="carregando__spinner" aria-hidden="true" />
      <span>{texto}</span>
    </div>
  );
}

export function EstadoVazio({ titulo, children, acao }: { titulo: string; children?: ReactNode; acao?: ReactNode }) {
  return (
    <div className="estado-vazio">
      <h2>{titulo}</h2>
      {children && <div>{children}</div>}
      {acao && <div className="grupo-botoes" style={{ justifyContent: "center" }}>{acao}</div>}
    </div>
  );
}

export function ErroCarregamento({ erro, tentarNovamente }: { erro: unknown; tentarNovamente?: (() => void) | undefined }) {
  return (
    <Alerta tom="erro" titulo="Não foi possível carregar" vivo>
      <p>{mensagemAmigavel(erro)}</p>
      {tentarNovamente && (
        <div className="grupo-botoes">
          <Botao variante="secundario" onClick={tentarNovamente}>
            Tentar novamente
          </Botao>
        </div>
      )}
    </Alerta>
  );
}

/* ------------------------------------------------------------------ Badge */
export function Badge({ tom = "neutro", children }: { tom?: "neutro" | "sucesso" | "aviso" | "erro" | "info"; children: ReactNode }) {
  return <span className={`badge${tom !== "neutro" ? ` badge--${tom}` : ""}`}>{children}</span>;
}

/* ------------------------------------------------------------------ Card */
export function Card({ titulo, children, className, nivel = 2 }: { titulo?: string; children: ReactNode; className?: string; nivel?: 2 | 3 }) {
  const Titulo = nivel === 2 ? "h2" : "h3";
  return (
    <section className={`card ${className ?? ""}`}>
      {titulo && <Titulo className="card__titulo">{titulo}</Titulo>}
      {children}
    </section>
  );
}
