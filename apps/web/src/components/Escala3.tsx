import { useId } from "react";
import type { DimensaoObservada, EscalaObservacao } from "../services/tipos";
import { DIMENSAO, ESCALA } from "../utils/rotulos";

interface Escala3Props {
  dimensao: DimensaoObservada;
  valor: EscalaObservacao | null;
  onChange: (v: EscalaObservacao) => void;
  erro?: string | null;
  id?: string;
}

const ORDEM: EscalaObservacao[] = ["REDUZIDA", "ESTAVEL", "AMPLIADA"];

/**
 * P4.5 — escala de 3 pontos com rótulos leigos por dimensão (HU-R.03).
 * `fieldset` + `legend` (grupo nomeado nativamente), rádios nativos (teclado e
 * leitor de tela sem ARIA), alvo de toque ≥ 44 px, seleção visível por borda
 * + fundo + marcador (não só cor).
 */
export function Escala3({ dimensao, valor, onChange, erro, id }: Escala3Props) {
  const gerado = useId();
  const base = id ?? gerado;
  const info = DIMENSAO[dimensao];
  const idErro = `${base}-erro`;
  const idPergunta = `${base}-pergunta`;

  return (
    <fieldset id={base} aria-describedby={[idPergunta, erro ? idErro : null].filter(Boolean).join(" ")} aria-invalid={erro ? true : undefined}>
      <legend>{info.titulo}</legend>
      <p id={idPergunta} className="campo__dica">
        {info.pergunta}
      </p>
      <div className="escala3">
        {ORDEM.map((opcao) => (
          <label key={opcao} className="opcao">
            <input type="radio" name={base} value={opcao} checked={valor === opcao} onChange={() => onChange(opcao)} />
            <span className="opcao__texto">
              <span>{ESCALA[opcao]}</span>
              <span className="opcao__descricao">{info.escala[opcao]}</span>
            </span>
          </label>
        ))}
      </div>
      {erro && (
        <div id={idErro} className="campo__erro">
          {erro}
        </div>
      )}
    </fieldset>
  );
}
