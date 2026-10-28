import { useState } from "react";
import { api, type EventoAdmin, type ListaPaginada } from "../services";
import { useConsulta } from "../hooks/useConsulta";
import { CabecalhoAdmin } from "../components/CabecalhoAdmin";
import { ErroAdmin } from "../components/Admin";
import { Esqueleto, EstadoVazio } from "../components/Feedback";
import { Botao } from "../components/Botao";
import { Campo } from "../components/Campo";
import { AUTOR_ADMIN, EVENTO_ADMIN, FERRAMENTA, rotuloPermissao } from "../utils/rotulos";
import { formatarData, formatarDataHora } from "../utils/datas";

const POR_PAGINA = 30;

/** Resumo legível dos detalhes (nunca motivo nem conteúdo de estudante; o banco já os tira). */
function resumoDetalhes(e: EventoAdmin): string | null {
  const d = e.detalhes;
  if (typeof d.ferramenta === "string") return FERRAMENTA[d.ferramenta as keyof typeof FERRAMENTA]?.titulo ?? d.ferramenta;
  if (Array.isArray(d.permissoes)) return d.permissoes.length ? (d.permissoes as string[]).map(rotuloPermissao).join("; ") : "Sem permissões de estudante";
  if (Array.isArray(d.removidas) && d.removidas.length) return `Sem: ${(d.removidas as string[]).map(rotuloPermissao).join("; ")}`;
  if ("validade" in d) return d.validade ? `Até ${formatarData(String(d.validade))}` : "Sem prazo";
  if (d.escopo === "ESCOLA") return "Só nesta escola";
  if (d.exigeAprovacao === true) return "Depende de aprovação";
  return null;
}

/** D-50 — Atividades e auditoria: toda mudança de acesso com responsável, ação e data. */
export function AdminAuditoria() {
  const [filtro, setFiltro] = useState("");
  const [aplicado, setAplicado] = useState("");
  const [limite, setLimite] = useState(POR_PAGINA);
  const consulta = useConsulta<ListaPaginada<EventoAdmin>>(() => api.adminListarAuditoria(aplicado || undefined, { limite }), [aplicado, limite]);
  const dados = consulta.dados;

  return (
    <>
      <CabecalhoAdmin
        titulo="Atividades e auditoria"
        descricao="A trilha não pode ser alterada nem apagada. Ela registra mudanças de acesso, perfil, ferramenta e configuração, e nunca o conteúdo de um estudante."
      />
      <form
        className="filtros-admin"
        aria-label="Filtrar atividades"
        onSubmit={(e) => {
          e.preventDefault();
          setLimite(POR_PAGINA);
          setAplicado(filtro.trim());
        }}
      >
        <Campo id="filtro-auditoria" type="search" rotulo="Responsável, pessoa ou ação" value={filtro} onChange={(e) => setFiltro(e.target.value)} opcional />
        <Botao type="submit" variante="secundario">
          Filtrar
        </Botao>
      </form>
      {consulta.carregando && !dados && <Esqueleto texto="Carregando atividades…" />}
      {consulta.erro && <ErroAdmin erro={consulta.erro} tentarNovamente={consulta.recarregar} />}
      {dados && dados.itens.length === 0 && (
        <EstadoVazio titulo="Nenhuma atividade encontrada">
          <p>{aplicado ? "Nada corresponde ao filtro." : "Nenhuma mudança de acesso foi registrada ainda."}</p>
        </EstadoVazio>
      )}
      {dados && dados.itens.length > 0 && (
        <>
          <div className="tabela-rolagem" role="region" aria-label="Atividades" tabIndex={0}>
            <table className="tabela-cartoes">
              <caption>
                {dados.total === 1 ? "1 atividade" : `${dados.total} atividades`}
                {dados.itens.length < dados.total && ` (mostrando ${dados.itens.length})`}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Data</th>
                  <th scope="col">Ação</th>
                  <th scope="col">Responsável</th>
                  <th scope="col">Alvo</th>
                  <th scope="col">Detalhe</th>
                </tr>
              </thead>
              <tbody>
                {dados.itens.map((e, i) => (
                  <tr key={`${e.criadoEm}-${i}`}>
                    <td data-rotulo="Data">{formatarDataHora(e.criadoEm)}</td>
                    <th scope="row" data-rotulo="Ação">
                      {EVENTO_ADMIN[e.evento] ?? e.evento}
                    </th>
                    <td data-rotulo="Responsável">
                      {e.autorNome ?? "Sistema"}
                      {e.papelAutor && <div className="meta">{AUTOR_ADMIN[e.papelAutor] ?? e.papelAutor}</div>}
                    </td>
                    <td data-rotulo="Alvo">{e.alvoNome ?? "—"}</td>
                    <td data-rotulo="Detalhe">{resumoDetalhes(e) ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {dados.itens.length < dados.total && (
            <div className="grupo-botoes">
              <Botao variante="secundario" onClick={() => setLimite((l) => l + POR_PAGINA)} carregando={consulta.carregando} textoCarregando="Carregando…">
                Carregar mais
              </Botao>
            </div>
          )}
        </>
      )}
    </>
  );
}
