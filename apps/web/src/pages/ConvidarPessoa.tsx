import { useState } from "react";
import { api, mensagemAmigavel, type Papel } from "../services";
import { useMutacao } from "../hooks/useConsulta";
import { useAnuncio } from "../hooks/useAnuncio";
import { Alerta, ResumoErros } from "../components/Feedback";
import { Botao } from "../components/Botao";
import { Campo } from "../components/Campo";
import { PAPEL } from "../utils/rotulos";

const PAPEIS: Papel[] = ["DOCENTE", "RESPONSAVEL", "PROFISSIONAL_SAUDE"];
const EXPLICA: Partial<Record<Papel, string>> = {
  DOCENTE: "Entra na escola; depois você o vincula aos estudantes da turma.",
  RESPONSAVEL: "Fica vinculado a este estudante. Confira presencialmente o documento antes.",
  PROFISSIONAL_SAUDE: "Fica aguardando a família confirmar. Só depois tem acesso.",
};

/**
 * R2.1 — convite por e-mail (F2/F4/F5). No sistema real, a Edge Function
 * `convidar` envia o link de definir senha (uso único); o banco decide se quem
 * convida pode e grava os vínculos (D-24/D-25). Na demonstração, é simulado.
 */
export function ConvidarPessoa({ estudanteId, aoConvidar }: { estudanteId: string; aoConvidar: () => void }) {
  const { anunciar } = useAnuncio();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [papel, setPapel] = useState<Papel>("DOCENTE");
  const [registro, setRegistro] = useState("");
  const [conferido, setConferido] = useState(false);
  const [erros, setErros] = useState<{ campo: string; mensagem: string }[]>([]);

  const enviar = useMutacao(async () => {
    const lista: { campo: string; mensagem: string }[] = [];
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/u.test(email.trim())) lista.push({ campo: "convite-email", mensagem: "Informe um e-mail válido." });
    if (papel === "PROFISSIONAL_SAUDE" && !registro.trim()) lista.push({ campo: "convite-registro", mensagem: "Informe o registro no conselho profissional." });
    if (papel === "RESPONSAVEL" && !conferido) lista.push({ campo: "convite-conferido", mensagem: "Confirme a conferência presencial do documento." });
    setErros(lista);
    if (lista.length > 0) return;
    const r = await api.convidar({
      email,
      nome,
      papel,
      estudanteId: papel === "DOCENTE" ? null : estudanteId,
      registroConselho: papel === "PROFISSIONAL_SAUDE" ? registro : null,
      conferidoPresencialmente: conferido,
    });
    anunciar(r.emailEnviado ? `Convite enviado para ${email.trim()}.` : (r.avisos[0] ?? "Acesso registrado."), "sucesso");
    setNome("");
    setEmail("");
    setRegistro("");
    setConferido(false);
    aoConvidar();
  });
  const erroDe = (c: string) => erros.find((x) => x.campo === c)?.mensagem ?? null;

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        enviar.executar();
      }}
      aria-labelledby="titulo-convite"
      style={{ maxWidth: "var(--largura-leitura)" }}
    >
      <h2 id="titulo-convite">Convidar alguém novo por e-mail</h2>
      <p className="meta">A pessoa recebe um link para criar a senha. O link vale por 7 dias e só funciona uma vez.</p>
      <ResumoErros erros={erros} />
      {enviar.erro && (
        <Alerta tom="erro" vivo>
          {mensagemAmigavel(enviar.erro)}
        </Alerta>
      )}
      <Campo id="convite-nome" rotulo="Nome" opcional autoComplete="off" value={nome} onChange={(e) => setNome(e.target.value)} />
      <Campo id="convite-email" rotulo="E-mail" type="email" inputMode="email" autoComplete="off" required value={email} onChange={(e) => setEmail(e.target.value)} erro={erroDe("convite-email")} />
      <fieldset>
        <legend>Papel</legend>
        {PAPEIS.map((p) => (
          <label key={p} className="opcao">
            <input type="radio" name="convite-papel" value={p} checked={papel === p} onChange={() => setPapel(p)} />
            <span className="opcao__texto">
              <span>{PAPEL[p]}</span>
              <span className="opcao__descricao">{EXPLICA[p]}</span>
            </span>
          </label>
        ))}
      </fieldset>
      {papel === "PROFISSIONAL_SAUDE" && (
        <Campo id="convite-registro" rotulo="Registro no conselho profissional" dica="Ex.: CRFa, CRP, CREFITO. A escola confere depois." required value={registro} onChange={(e) => setRegistro(e.target.value)} erro={erroDe("convite-registro")} />
      )}
      {papel === "RESPONSAVEL" && (
        <div className="campo">
          <label className="opcao" htmlFor="convite-conferido">
            <input id="convite-conferido" type="checkbox" checked={conferido} onChange={(e) => setConferido(e.target.checked)} aria-invalid={erroDe("convite-conferido") ? true : undefined} aria-describedby={erroDe("convite-conferido") ? "convite-conferido-erro" : undefined} />
            <span className="opcao__texto">
              <span>Conferi presencialmente, com documento, que esta pessoa é responsável legal</span>
            </span>
          </label>
          {erroDe("convite-conferido") && (
            <div id="convite-conferido-erro" className="campo__erro">
              {erroDe("convite-conferido")}
            </div>
          )}
        </div>
      )}
      <div className="grupo-botoes">
        <Botao type="submit" carregando={enviar.ocupado} textoCarregando="Enviando…">
          Enviar convite
        </Botao>
      </div>
    </form>
  );
}
