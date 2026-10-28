import { useState } from "react";
import { FERRAMENTAS, type Ferramenta } from "@pei-vivo/contratos";
import { api, type ItemCatalogo } from "../services";
import { useConsulta } from "../hooks/useConsulta";
import { useSessao } from "../hooks/useSessao";
import { useAnuncio } from "../hooks/useAnuncio";
import { CabecalhoAdmin } from "../components/CabecalhoAdmin";
import { ConfirmarAcao, ErroAdmin, type AcaoCritica } from "../components/Admin";
import { Badge, Card, Esqueleto } from "../components/Feedback";
import { Botao } from "../components/Botao";
import { ACAO, FERRAMENTA, PAPEL_BASE } from "../utils/rotulos";
import { formatarDataHora } from "../utils/datas";

/** D-50 — Ferramentas: módulos reais que o Administrador Geral liga e desliga no sistema todo. */
export function AdminFerramentas() {
  const { usuario } = useSessao();
  const geral = usuario?.papelPlataforma === "ADMIN_GERAL";
  const { anunciar } = useAnuncio();
  const consulta = useConsulta<ItemCatalogo[]>(() => api.adminCatalogo(), []);
  const [acao, setAcao] = useState<AcaoCritica | null>(null);
  const porFerramenta = (f: Ferramenta) => (consulta.dados ?? []).filter((i) => i.ferramenta === f);

  return (
    <>
      <CabecalhoAdmin
        titulo="Ferramentas"
        descricao="Desligar uma ferramenta bloqueia a ação para todos na hora, inclusive quem já está com o sistema aberto. Ligar não dá a ninguém mais do que o perfil permite."
      />
      {consulta.carregando && <Esqueleto texto="Carregando ferramentas…" forma="cartao" />}
      {consulta.erro && <ErroAdmin erro={consulta.erro} tentarNovamente={consulta.recarregar} />}
      {consulta.dados && (
        <ul className="lista-cartoes" aria-label="Ferramentas do sistema">
          {FERRAMENTAS.map((f) => {
            const itens = porFerramenta(f);
            const ligada = itens[0]?.disponivel ?? true;
            return (
              <li key={f}>
                <Card titulo={FERRAMENTA[f].titulo} nivel={2}>
                  <p>
                    <Badge tom={ligada ? "sucesso" : "erro"}>{ligada ? "Ligada" : "Desligada"}</Badge>
                    {itens[0]?.alteradoEm && <span className="meta"> · alterada em {formatarDataHora(itens[0].alteradoEm)}</span>}
                  </p>
                  <p>{FERRAMENTA[f].descricao}</p>
                  <ul className="lista-compacta">
                    {itens.map((i) => (
                      <li key={i.acao}>
                        <strong>{ACAO[i.acao]}</strong>: {i.descricao}. <span className="meta">Quem pode: {i.papeis.map((p) => PAPEL_BASE[p]).join(", ")}</span>
                      </li>
                    ))}
                  </ul>
                  {geral && (
                    <Botao
                      variante={ligada ? "perigo" : "primario"}
                      onClick={() =>
                        setAcao({
                          titulo: ligada ? `Desligar “${FERRAMENTA[f].titulo}”?` : `Ligar “${FERRAMENTA[f].titulo}”?`,
                          efeito: ligada ? (
                            <p>
                              Ninguém mais consegue usar esta ferramenta, em nenhuma escola, até que ela seja ligada de novo. O que já foi registrado continua
                              guardado.
                            </p>
                          ) : (
                            <p>Quem tem a permissão no perfil volta a usar a ferramenta.</p>
                          ),
                          confirmar: ligada ? "Desligar ferramenta" : "Ligar ferramenta",
                          perigo: ligada,
                          executar: () => api.adminDefinirFerramenta(f, !ligada),
                        })
                      }
                    >
                      {ligada ? "Desligar" : "Ligar"}
                    </Botao>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
      <ConfirmarAcao
        acao={acao}
        onFechar={() => setAcao(null)}
        onConcluir={() => {
          anunciar(`${acao?.confirmar ?? "Ferramenta"}: feito.`, "sucesso");
          setAcao(null);
          consulta.recarregar();
        }}
      />
    </>
  );
}
