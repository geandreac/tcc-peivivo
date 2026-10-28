import { useState } from "react";
import { FERRAMENTAS, PERMISSOES, TETO } from "@pei-vivo/contratos";
import { api, mensagemAmigavel, type NovoPerfil, type PerfilAcesso } from "../services";
import { useConsulta, useMutacao } from "../hooks/useConsulta";
import { useSessao } from "../hooks/useSessao";
import { useAnuncio } from "../hooks/useAnuncio";
import { CabecalhoAdmin } from "../components/CabecalhoAdmin";
import { ConfirmarAcao, ErroAdmin, type AcaoCritica } from "../components/Admin";
import { Alerta, Badge, Card, Esqueleto, ResumoErros, type ErroCampo } from "../components/Feedback";
import { Botao } from "../components/Botao";
import { Campo } from "../components/Campo";
import { ACAO, FERRAMENTA, PAPEL_BASE, rotuloPermissao } from "../utils/rotulos";

const ACOES = ["VER", "EDITAR", "APROVAR"] as const;
type PapelEditavel = NovoPerfil["papelBase"];
const PAPEIS_EDITAVEIS: PapelEditavel[] = ["COORDENACAO", "DOCENTE", "RESPONSAVEL", "PROFISSIONAL_SAUDE"];

/** D-50 — Perfis e permissões. Perfis base têm o teto do papel; derivados só ficam abaixo dele. */
export function AdminPerfis() {
  const { usuario } = useSessao();
  const geral = usuario?.papelPlataforma === "ADMIN_GERAL";
  const { anunciar } = useAnuncio();
  const consulta = useConsulta<PerfilAcesso[]>(() => api.adminListarPerfis(), []);
  const [edicao, setEdicao] = useState<NovoPerfil | null>(null);
  const [acao, setAcao] = useState<AcaoCritica | null>(null);
  const perfis = consulta.dados ?? [];
  const admin = perfis.find((p) => p.papelBase === "ADMIN_GERAL");

  return (
    <>
      <CabecalhoAdmin
        titulo="Perfis e permissões"
        descricao="O que cada perfil pode fazer nas ferramentas do sistema."
        acao={
          geral && (
            <Botao onClick={() => setEdicao({ nome: "", descricao: "", papelBase: "DOCENTE", permissoes: [...TETO.DOCENTE] })} disabled={!!edicao}>
              Novo perfil
            </Botao>
          )
        }
      />
      {!geral && consulta.dados && (
        <Alerta tom="info">A coordenação consulta os perfis e os atribui na escola. Só o Administrador Geral cria e altera perfis.</Alerta>
      )}
      {consulta.carregando && <Esqueleto texto="Carregando perfis…" />}
      {consulta.erro && <ErroAdmin erro={consulta.erro} tentarNovamente={consulta.recarregar} />}

      {edicao && (
        <EditorPerfil
          perfil={edicao}
          onCancelar={() => setEdicao(null)}
          onSalvo={(nome) => {
            anunciar(`Perfil “${nome}” salvo.`, "sucesso");
            setEdicao(null);
            consulta.recarregar();
          }}
        />
      )}

      {admin && (
        <Card titulo="Administração geral" className="card--destaque">
          <p>
            <strong>Controle completo de contas</strong>: escolas, pessoas, perfis, ferramentas, configurações e a trilha de atividades.{" "}
            <strong>Nunca abre dados de estudante</strong>: observações, materiais, perfis de aprendizagem e notas clínicas ficam fora do alcance deste perfil,
            por regra do banco.
          </p>
          <p className="texto-apoio">Coordenação é o perfil administrativo limitado: administra só os acessos da própria escola.</p>
        </Card>
      )}

      {consulta.dados && (
        <div className="tabela-rolagem" role="region" aria-label="Perfis de acesso" tabIndex={0}>
          <table className="tabela-cartoes">
            <caption>{perfis.length} perfis de acesso</caption>
            <thead>
              <tr>
                <th scope="col">Perfil</th>
                <th scope="col">Papel base</th>
                <th scope="col">Tipo</th>
                <th scope="col">Permissões</th>
                <th scope="col">Pessoas</th>
                <th scope="col">Ações</th>
              </tr>
            </thead>
            <tbody>
              {perfis
                .filter((p) => p.papelBase !== "ADMIN_GERAL")
                .map((p) => (
                  <tr key={p.id}>
                    <th scope="row" data-rotulo="Perfil">
                      {p.nome}
                      {p.descricao && <div className="meta">{p.descricao}</div>}
                    </th>
                    <td data-rotulo="Papel base">{PAPEL_BASE[p.papelBase]}</td>
                    <td data-rotulo="Tipo">
                      {p.arquivadoEm ? <Badge>Arquivado</Badge> : p.sistema ? <Badge tom="info">Base</Badge> : <Badge tom="sucesso">Derivado</Badge>}
                    </td>
                    <td data-rotulo="Permissões">
                      {p.permissoes.length === 0 ? "Nenhuma ferramenta de estudante" : p.permissoes.map(rotuloPermissao).join("; ")}
                      {!p.sistema && p.permissoes.length < p.teto.length && (
                        <div className="meta">{p.teto.length - p.permissoes.length} a menos que o perfil base</div>
                      )}
                    </td>
                    <td data-rotulo="Pessoas">{p.sistema ? <span className="meta">Padrão do papel</span> : p.usuarios}</td>
                    <td data-rotulo="Ações">
                      {geral && !p.sistema && !p.arquivadoEm ? (
                        <div className="acoes-linha">
                          <Botao
                            variante="secundario"
                            pequeno
                            onClick={() =>
                              setEdicao({
                                id: p.id,
                                nome: p.nome,
                                descricao: p.descricao,
                                papelBase: p.papelBase as PapelEditavel,
                                permissoes: [...p.permissoes],
                              })
                            }
                            aria-label={`Editar o perfil ${p.nome}`}
                          >
                            Editar
                          </Botao>
                          <Botao
                            variante="perigo"
                            pequeno
                            aria-label={`Arquivar o perfil ${p.nome}`}
                            onClick={() =>
                              setAcao({
                                titulo: `Arquivar o perfil “${p.nome}”?`,
                                efeito: <p>O perfil deixa de aparecer para novos acessos. Só é possível arquivar quando ninguém o usa.</p>,
                                confirmar: "Arquivar perfil",
                                perigo: true,
                                executar: () => api.adminArquivarPerfil(p.id),
                              })
                            }
                          >
                            Arquivar
                          </Botao>
                        </div>
                      ) : (
                        <span className="meta">{p.sistema ? "Definido pelo sistema" : "—"}</span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmarAcao
        acao={acao}
        onFechar={() => setAcao(null)}
        onConcluir={() => {
          anunciar("Perfil arquivado.", "sucesso");
          setAcao(null);
          consulta.recarregar();
        }}
      />
    </>
  );
}

/** Matriz áreas × ações: o que está fora do teto do papel aparece desabilitado, com o motivo. */
function EditorPerfil({ perfil, onCancelar, onSalvo }: { perfil: NovoPerfil; onCancelar: () => void; onSalvo: (nome: string) => void }) {
  const [p, setP] = useState<NovoPerfil>(perfil);
  const [erros, setErros] = useState<ErroCampo[]>([]);
  const teto: readonly string[] = TETO[p.papelBase];
  const salvar = useMutacao(async () => {
    const lista: ErroCampo[] = [];
    if (p.nome.trim().length < 3 || p.nome.trim().length > 60) lista.push({ campo: "perfil-nome", mensagem: "O nome tem de 3 a 60 caracteres." });
    setErros(lista);
    if (lista.length) return;
    await api.adminSalvarPerfil({ ...p, nome: p.nome.trim(), permissoes: p.permissoes.filter((x) => teto.includes(x)) });
    onSalvo(p.nome.trim());
  });

  return (
    <Card titulo={perfil.id ? `Editar perfil “${perfil.nome}”` : "Novo perfil"}>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          salvar.executar();
        }}
      >
        <ResumoErros erros={erros} />
        <Campo
          id="perfil-nome"
          rotulo="Nome do perfil"
          required
          maxLength={60}
          value={p.nome}
          onChange={(e) => setP({ ...p, nome: e.target.value })}
          erro={erros.find((x) => x.campo === "perfil-nome")?.mensagem ?? null}
        />
        <Campo
          id="perfil-descricao"
          tipo="area"
          rotulo="Descrição"
          opcional
          maxLength={300}
          rows={2}
          value={p.descricao ?? ""}
          onChange={(e) => setP({ ...p, descricao: e.target.value })}
        />
        <Campo
          id="perfil-papel"
          tipo="select"
          rotulo="Papel base"
          dica="O perfil nunca vai além do que este papel permite."
          value={p.papelBase}
          onChange={(e) => {
            const papelBase = e.target.value as PapelEditavel;
            setP({ ...p, papelBase, permissoes: [...TETO[papelBase]] });
          }}
        >
          {PAPEIS_EDITAVEIS.map((x) => (
            <option key={x} value={x}>
              {PAPEL_BASE[x]}
            </option>
          ))}
        </Campo>

        <div className="tabela-rolagem" role="region" aria-label="Áreas e ações do perfil" tabIndex={0}>
          <table className="matriz-permissoes">
            <caption>Áreas e ações permitidas</caption>
            <thead>
              <tr>
                <th scope="col">Área</th>
                {ACOES.map((a) => (
                  <th key={a} scope="col">
                    {ACAO[a]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FERRAMENTAS.map((f) => (
                <tr key={f}>
                  <th scope="row">{FERRAMENTA[f].titulo}</th>
                  {ACOES.map((a) => {
                    const chave = `${f}:${a}`;
                    if (!(PERMISSOES as readonly string[]).includes(chave)) {
                      return (
                        <td key={a}>
                          <span className="meta">Não se aplica</span>
                        </td>
                      );
                    }
                    const noTeto = teto.includes(chave);
                    return (
                      <td key={a}>
                        <label className="caixa" htmlFor={`m-${chave}`}>
                          <input
                            id={`m-${chave}`}
                            type="checkbox"
                            disabled={!noTeto}
                            checked={noTeto && p.permissoes.includes(chave)}
                            aria-describedby={noTeto ? undefined : "motivo-teto"}
                            onChange={(e) => setP({ ...p, permissoes: e.target.checked ? [...p.permissoes, chave] : p.permissoes.filter((x) => x !== chave) })}
                          />
                          <span className="sr-only">
                            {FERRAMENTA[f].titulo}: {ACAO[a]}
                          </span>
                          {!noTeto && <span aria-hidden="true">—</span>}
                        </label>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p id="motivo-teto" className="texto-apoio">
          Caixas desabilitadas estão acima do teto de {PAPEL_BASE[p.papelBase].toLowerCase()} e o banco recusaria (por exemplo, docente nunca lê nota clínica).
        </p>
        {salvar.erro && (
          <Alerta tom="erro" vivo>
            {mensagemAmigavel(salvar.erro)}
          </Alerta>
        )}
        <div className="grupo-botoes">
          <Botao variante="secundario" onClick={onCancelar} disabled={salvar.ocupado}>
            Cancelar
          </Botao>
          <Botao type="submit" carregando={salvar.ocupado} textoCarregando="Salvando…">
            Salvar perfil
          </Botao>
        </div>
      </form>
    </Card>
  );
}
