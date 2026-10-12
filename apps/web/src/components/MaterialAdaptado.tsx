import { useId, type CSSProperties } from "react";
import { pictogramaDaEtapa, type TextoAdaptado } from "@pei-vivo/motor-adaptacao";
import { Pictograma } from "./Pictograma";
import { BotaoOuvir } from "./BotaoOuvir";

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
 * D-43: apoios de leitura — pictograma por etapa, "Ouvir" por trecho e
 * "Palavras para saber" (só aparecem se o material os trouxer).
 */
export function MaterialAdaptado({ adaptado, titulo, textoRevisado, mostrarExcedentes }: Props) {
  const { parametros, apoios } = adaptado;
  const idGlossario = useId();
  const estilo = { "--material-linhas": parametros.maxLinhasPorBloco } as CSSProperties;
  const blocos = textoRevisado
    ? textoRevisado.split(/\n\s*\n/u).map((b) => ({ linhas: b.split("\n") }))
    : mostrarExcedentes
      ? [...adaptado.blocos, ...adaptado.blocosExcedentes]
      : adaptado.blocos;
  const NivelTitulo = titulo ? "h3" : "h2";

  return (
    <article className="material" data-contraste={String(parametros.contrasteMinimo)} style={estilo} lang="pt-BR">
      {titulo && <h2>{titulo}</h2>}
      {blocos.map((bloco, i) => {
        const ehEtapas = bloco.linhas.every((l) => /^\d+\.\s/u.test(l));
        const etapas = bloco.linhas.map((l) => l.replace(/^\d+\.\s/u, ""));
        return (
          <div className="material__bloco" key={i}>
            {ehEtapas ? (
              <ol className="material__etapas">
                {etapas.map((etapa, j) => {
                  const picto = apoios?.pictogramas ? pictogramaDaEtapa(etapa) : null;
                  return (
                    <li key={j} className={picto ? "material__etapa material__etapa--picto" : "material__etapa"}>
                      {picto && <Pictograma id={picto} />}
                      <span>{etapa}</span>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p>{bloco.linhas.join(" ")}</p>
            )}
            {apoios && <BotaoOuvir texto={ehEtapas ? etapas.join(" ") : bloco.linhas.join(" ")} trecho={i + 1} />}
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
      {apoios && apoios.glossario.length > 0 && (
        <section className="material__glossario" aria-labelledby={idGlossario}>
          <NivelTitulo id={idGlossario}>Palavras para saber</NivelTitulo>
          <dl>
            {apoios.glossario.map((item) => (
              <div key={item.termo} className="material__termo">
                <dt>{item.termo}</dt>
                <dd>{item.explicacao}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      {parametros.interesseAncora && (
        <p className="material__ancora">
          Âncora de interesse do perfil: <strong>{parametros.interesseAncora}</strong> — a recontextualização de exemplos é feita pela camada de IA, desligada neste protótipo.
        </p>
      )}
    </article>
  );
}
