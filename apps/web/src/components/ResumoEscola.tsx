import { Link } from "react-router-dom";
import { CircleAlert, Clock, ShieldQuestion, Stethoscope, type LucideIcon } from "lucide-react";
import { api, type MotivoPendenciaEscola, type ResumoEscola as Resumo } from "../services";
import { useConsulta } from "../hooks/useConsulta";
import { Carregando, ErroCarregamento } from "./Feedback";
import { formatarData } from "../utils/datas";

const MOTIVO: Record<MotivoPendenciaEscola, { texto: string; acao: string; rota: (id: string) => string; Icone: LucideIcon }> = {
  SEM_CONSENTIMENTO: { texto: "Aguardando autorização da família", acao: "Ver estudante", rota: (id) => `/estudantes/${id}`, Icone: ShieldQuestion },
  SEM_PROFISSIONAL: { texto: "Sem profissional de saúde (ajustes só pela escola e família)", acao: "Ver vínculos", rota: (id) => `/estudantes/${id}/vinculos`, Icone: Stethoscope },
  VALIDACAO_ATRASADA: { texto: "Validação do perfil atrasada", acao: "Ver pendências", rota: () => "/pendencias", Icone: Clock },
  CICLO_PARADO: { texto: "Quinzena sem nenhuma observação", acao: "Ver estudante", rota: (id) => `/estudantes/${id}`, Icone: CircleAlert },
};

/**
 * R4.5 — painel da escola (prompt §6.5): cobertura e pendências acionáveis,
 * SEM dado clínico nem conteúdo de observação. Números em tinta de texto;
 * o estado vem de ícone + rótulo, nunca só da cor (WCAG 1.4.1).
 */
export function ResumoEscola() {
  const consulta = useConsulta<Resumo>(() => api.resumoEscola(), []);
  if (consulta.carregando) return <Carregando texto="Carregando o resumo da escola…" />;
  if (consulta.erro || !consulta.dados) return <ErroCarregamento erro={consulta.erro} tentarNovamente={consulta.recarregar} />;
  const r = consulta.dados;
  const blocos = [
    { rotulo: "Estudantes acompanhados", valor: r.totalEstudantes, nota: `${r.comConsentimento} com autorização da família` },
    { rotulo: "Aguardando a família", valor: r.semConsentimento, nota: "sem autorização, nada é registrado" },
    { rotulo: "Sem profissional de saúde", valor: r.semProfissional, nota: "o perfil é ajustado sem validação clínica" },
    { rotulo: "Validações atrasadas", valor: r.validacoesAtrasadas, nota: "5 dias ou mais sem resposta" },
    { rotulo: "Quinzenas paradas", valor: r.ciclosParados, nota: "mais de 15 dias sem observação" },
  ];
  return (
    <section aria-labelledby="titulo-escola" className="resumo-escola">
      <h2 id="titulo-escola">Minha escola</h2>
      <ul className="blocos-numero" aria-label="Resumo da escola">
        {blocos.map((b) => (
          <li key={b.rotulo} className="bloco-numero">
            <span className="bloco-numero__rotulo">{b.rotulo}</span>
            <span className="bloco-numero__valor">{b.valor}</span>
            <span className="bloco-numero__nota">{b.nota}</span>
          </li>
        ))}
      </ul>
      <h3>O que precisa de você</h3>
      {r.pendencias.length === 0 ? (
        <p className="meta">Nenhuma pendência. Tudo em dia.</p>
      ) : (
        <ul className="lista-simples" aria-label="O que precisa de você">
          {r.pendencias.map((p) => {
            const m = MOTIVO[p.motivo];
            return (
              <li key={`${p.estudanteId}-${p.motivo}`}>
                <div className="pendencia-escola">
                  <m.Icone aria-hidden="true" size={20} />
                  <div>
                    <strong>{p.nome}</strong>
                    <div className="meta">
                      {m.texto}
                      {p.desde && ` · desde ${formatarData(p.desde)}`}
                    </div>
                  </div>
                </div>
                <Link to={m.rota(p.estudanteId)} aria-label={`${m.acao}: ${p.nome}`}>
                  {m.acao}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <p className="meta">Este painel mostra só contagens e situações — nunca observações, perfis, notas ou materiais.</p>
    </section>
  );
}
