import { Link } from "react-router-dom";
import type { ContextoEstudante } from "../hooks/useEstudante";
import { PAPEL } from "../utils/rotulos";
import { idade } from "../utils/datas";
import { Badge } from "./Feedback";

interface Props {
  contexto: ContextoEstudante;
  titulo: string;
  descricao?: string;
  /** Rota do link "voltar"; padrão: visão geral do estudante. */
  voltarPara?: string;
  voltarRotulo?: string;
}

/** Cabeçalho comum das telas por estudante: voltar + h1 + contexto (quem, papel, consentimento). */
export function CabecalhoEstudante({ contexto, titulo, descricao, voltarPara, voltarRotulo }: Props) {
  const { estudante, papel, consentimentoAtivo } = contexto;
  return (
    <div className="cabecalho-pagina">
      <div>
        <Link to={voltarPara ?? `/estudantes/${estudante.id}`} className="voltar">
          <span aria-hidden="true">←</span> {voltarRotulo ?? `Voltar para ${estudante.nome}`}
        </Link>
        <h1>{titulo}</h1>
        {descricao && <p>{descricao}</p>}
        <div className="chips">
          <Badge tom="info">
            {estudante.nome} · {idade(estudante.dataNascimento)} anos{estudante.turma ? ` · ${estudante.turma}` : ""}
          </Badge>
          {papel && <Badge>Você: {PAPEL[papel]}</Badge>}
          <Badge tom={consentimentoAtivo ? "sucesso" : "erro"}>{consentimentoAtivo ? "Consentimento ativo" : "Sem consentimento ativo"}</Badge>
        </div>
      </div>
    </div>
  );
}
