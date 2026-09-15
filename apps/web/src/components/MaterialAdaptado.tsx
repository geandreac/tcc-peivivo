import type { CSSProperties } from "react";
import type { TextoAdaptado } from "@pei-vivo/motor-adaptacao";

interface Props {
  adaptado: TextoAdaptado;
  titulo?: string;
  /** Texto revisado pelo docente substitui os blocos (HU-D.04). */
  textoRevisado?: string | null;
  mostrarExcedentes?: boolean;
}

/**
 * P4.5 `Bloco` — D-10: a aplicação VISUAL dos parâmetros acontece aqui, via
 * CSS a partir de `parametros` (contraste 4,5/7, blocos, etapas). É o que
 * "roda no cliente" e o que a versão impressa (RF12) reaproveita.
 */
export function MaterialAdaptado({ adaptado, titulo, textoRevisado, mostrarExcedentes }: Props) {
  const { parametros } = adaptado;
  const estilo = { "--material-linhas": parametros.maxLinhasPorBloco } as CSSProperties;
  const blocos = textoRevisado
    ? textoRevisado.split(/\n\s*\n/u).map((b) => ({ linhas: b.split("\n") }))
    : mostrarExcedentes
      ? [...adaptado.blocos, ...adaptado.blocosExcedentes]
      : adaptado.blocos;

  return (
    <article className="material" data-contraste={String(parametros.contrasteMinimo)} style={estilo} lang="pt-BR">
      {titulo && <h2>{titulo}</h2>}
      {blocos.map((bloco, i) => {
        const ehEtapas = bloco.linhas.every((l) => /^\d+\.\s/u.test(l));
        return (
          <div className="material__bloco" key={i}>
            {ehEtapas ? (
              <ol className="material__etapas" style={{ margin: 0, paddingLeft: "1.5em" }}>
                {bloco.linhas.map((l, j) => (
                  <li key={j} className="material__etapa">
                    {l.replace(/^\d+\.\s/u, "")}
                  </li>
                ))}
              </ol>
            ) : (
              <p>{bloco.linhas.join(" ")}</p>
            )}
          </div>
        );
      })}
      {adaptado.blocosExcedentes.length > 0 && !mostrarExcedentes && !textoRevisado && (
        <p className="material__ancora">
          {adaptado.blocosExcedentes.length === 1
            ? "1 bloco ficou para a próxima página (limite do perfil)."
            : `${adaptado.blocosExcedentes.length} blocos ficaram para a próxima página (limite do perfil).`}
        </p>
      )}
      {parametros.interesseAncora && (
        <p className="material__ancora">
          Âncora de interesse do perfil: <strong>{parametros.interesseAncora}</strong> — a recontextualização de exemplos é feita pela camada de IA, desligada neste protótipo.
        </p>
      )}
    </article>
  );
}
