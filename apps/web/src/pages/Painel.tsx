import { Link } from "react-router-dom";
import { api, type Estudante, type Papel, type Consentimento } from "../services";
import { useConsulta } from "../hooks/useConsulta";
import { useSessao } from "../hooks/useSessao";
import { useTitulo } from "../hooks/useTitulo";
import { Badge, Card, Carregando, EstadoVazio, ErroCarregamento } from "../components/Feedback";
import { LinkBotao } from "../components/Botao";
import { PAPEL } from "../utils/rotulos";
import { idade } from "../utils/datas";

interface Linha {
  estudante: Estudante;
  papel: Papel | null;
  consentimento: Consentimento | null;
}

const ACAO_PRINCIPAL: Record<Papel, { rotulo: string; rota: (id: string) => string }> = {
  DOCENTE: { rotulo: "Gerar material", rota: (id) => `/estudantes/${id}/gerar` },
  RESPONSAVEL: { rotulo: "Ver consentimento", rota: (id) => `/estudantes/${id}/consentimento` },
  PROFISSIONAL_SAUDE: { rotulo: "Validar parâmetros", rota: (id) => `/estudantes/${id}/validar` },
  COORDENACAO: { rotulo: "Ver histórico do PEI", rota: (id) => `/estudantes/${id}/historico` },
};

/** Dashboard (tela 3 da orientação): um só painel, conteúdo muda pelo papel. */
export function Painel() {
  useTitulo("Meus estudantes");
  const { usuario } = useSessao();
  const consulta = useConsulta<Linha[]>(async () => {
    const estudantes = await api.listarEstudantes();
    return Promise.all(
      estudantes.map(async (estudante) => {
        const [papel, consentimento] = await Promise.all([api.meuPapel(estudante.id), api.obterConsentimento(estudante.id)]);
        return { estudante, papel, consentimento };
      })
    );
  }, [usuario?.id]);

  return (
    <>
      <div className="cabecalho-pagina">
        <div>
          <h1>Meus estudantes</h1>
          <p>Olá, {usuario?.nome}. Aqui estão os estudantes aos quais você está vinculado(a) e o que você pode fazer por cada um.</p>
        </div>
        {usuario?.papelInstitucional === "COORDENACAO" && <LinkBotao to="/coordenacao/cadastrar">Cadastrar estudante</LinkBotao>}
      </div>

      {consulta.carregando && <Carregando texto="Carregando seus estudantes…" />}
      {consulta.erro && <ErroCarregamento erro={consulta.erro} tentarNovamente={consulta.recarregar} />}
      {consulta.dados && consulta.dados.length === 0 && (
        <EstadoVazio titulo="Nenhum estudante vinculado a você">
          <p>
            Quem cria vínculos é a coordenação pedagógica. Se você deveria ter acesso a um estudante, peça à coordenação da escola.
            {usuario?.papelInstitucional === "COORDENACAO" && " Como coordenação, você pode cadastrar o primeiro estudante agora."}
          </p>
        </EstadoVazio>
      )}
      {consulta.dados && consulta.dados.length > 0 && (
        <ul className="lista-simples" aria-label="Estudantes">
          {consulta.dados.map(({ estudante, papel, consentimento }) => {
            const ativo = consentimento?.status === "ATIVO";
            const acao = papel ? ACAO_PRINCIPAL[papel] : null;
            return (
              <li key={estudante.id}>
                <div>
                  <h2 style={{ fontSize: "var(--tamanho-md)", marginBottom: "var(--esp-1)" }}>
                    <Link to={`/estudantes/${estudante.id}`}>{estudante.nome}</Link>
                  </h2>
                  <div className="chips">
                    <span className="meta">
                      {idade(estudante.dataNascimento)} anos{estudante.turma ? ` · ${estudante.turma}` : ""}
                    </span>
                    {papel && <Badge>{PAPEL[papel]}</Badge>}
                    <Badge tom={ativo ? "sucesso" : "erro"}>{ativo ? "Consentimento ativo" : "Aguardando consentimento"}</Badge>
                  </div>
                </div>
                {acao && (ativo || papel === "RESPONSAVEL" || papel === "COORDENACAO") && (
                  <LinkBotao to={acao.rota(estudante.id)} variante="secundario" pequeno>
                    {acao.rotulo}
                  </LinkBotao>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {consulta.dados && consulta.dados.length > 0 && (
        <Card titulo="Como funciona o acesso" nivel={3} className="nao-imprimir">
          <p className="meta">
            Sem consentimento ativo do responsável, docente e profissional de saúde não leem nem escrevem nada sobre o estudante (RN01). O
            responsável e a coordenação continuam vendo o histórico. A nota clínica é exclusiva do profissional de saúde (RN02).
          </p>
        </Card>
      )}
    </>
  );
}
