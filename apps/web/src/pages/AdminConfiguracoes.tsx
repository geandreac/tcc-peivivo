import { useState } from "react";
import { api, mensagemAmigavel, type ConfiguracoesSistema } from "../services";
import { useConsulta, useMutacao } from "../hooks/useConsulta";
import { useSessao } from "../hooks/useSessao";
import { useAnuncio } from "../hooks/useAnuncio";
import { CabecalhoAdmin } from "../components/CabecalhoAdmin";
import { ErroAdmin } from "../components/Admin";
import { Alerta, Card, Esqueleto } from "../components/Feedback";
import { Botao } from "../components/Botao";
import { Campo } from "../components/Campo";
import { formatarDataHora } from "../utils/datas";

/** Regras fixas de segurança: não se configuram pelo painel (D-32, D-49). */
const REGRAS_FIXAS = [
  "Conta só por convite: não existe cadastro aberto.",
  "Senha com pelo menos 10 caracteres.",
  "Verificação em duas etapas para administração, coordenação e profissional de saúde.",
  "Convite vale por 7 dias e só uma vez.",
  "Sessão de quem vê dado de saúde ou administra acaba após 30 minutos sem uso.",
  "A trilha de atividades não pode ser alterada nem apagada.",
];

/** D-50 — Configurações: o que o Administrador Geral ajusta e o que é fixo por segurança. */
export function AdminConfiguracoes() {
  const { usuario } = useSessao();
  const geral = usuario?.papelPlataforma === "ADMIN_GERAL";
  const consulta = useConsulta<ConfiguracoesSistema>(() => api.adminConfiguracoes(), []);
  return (
    <>
      <CabecalhoAdmin titulo="Configurações" descricao="Padrões para os acessos novos de quem é de fora da escola." />
      {consulta.carregando && <Esqueleto texto="Carregando configurações…" forma="cartao" />}
      {consulta.erro && <ErroAdmin erro={consulta.erro} tentarNovamente={consulta.recarregar} />}
      {consulta.dados && (
        <div className="grade-cards">
          <Formulario inicial={consulta.dados} editavel={geral} onSalvo={consulta.recarregar} />
          <Card titulo="Fixas por segurança">
            <ul>
              {REGRAS_FIXAS.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </>
  );
}

function Formulario({ inicial, editavel, onSalvo }: { inicial: ConfiguracoesSistema; editavel: boolean; onSalvo: () => void }) {
  const { anunciar } = useAnuncio();
  const [exigir, setExigir] = useState(inicial.exigirAprovacaoExternos);
  const [dias, setDias] = useState(String(inicial.validadePadraoDias));
  const [erro, setErro] = useState<string | null>(null);
  const salvar = useMutacao(async () => {
    const n = Number(dias);
    if (!Number.isInteger(n) || n < 1 || n > 730) {
      setErro("Informe um número inteiro de 1 a 730.");
      return;
    }
    setErro(null);
    await api.adminSalvarConfiguracoes({ exigirAprovacaoExternos: exigir, validadePadraoDias: n });
    anunciar("Configurações salvas.", "sucesso");
    onSalvo();
  });

  return (
    <Card titulo="Acesso de quem é de fora da escola">
      {!editavel && <Alerta tom="info">Só o Administrador Geral altera estas configurações.</Alerta>}
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          salvar.executar();
        }}
      >
        <div className="campo">
          <label className="opcao" htmlFor="exigir-aprovacao">
            <input id="exigir-aprovacao" type="checkbox" checked={exigir} disabled={!editavel} onChange={(e) => setExigir(e.target.checked)} />
            <span className="opcao__texto">Responsável e profissional de saúde só entram depois de uma aprovação</span>
          </label>
        </div>
        <Campo
          id="validade-padrao"
          type="number"
          inputMode="numeric"
          min={1}
          max={730}
          rotulo="Validade padrão do acesso (dias)"
          dica="Sugerida ao criar o acesso de quem é de fora. Pode ser trocada em cada cadastro."
          value={dias}
          disabled={!editavel}
          onChange={(e) => setDias(e.target.value)}
          erro={erro}
        />
        {inicial.alteradoEm && <p className="meta">Alterado pela última vez em {formatarDataHora(inicial.alteradoEm)}.</p>}
        {salvar.erro && (
          <Alerta tom="erro" vivo>
            {mensagemAmigavel(salvar.erro)}
          </Alerta>
        )}
        {editavel && (
          <Botao type="submit" carregando={salvar.ocupado} textoCarregando="Salvando…">
            Salvar configurações
          </Botao>
        )}
      </form>
    </Card>
  );
}
