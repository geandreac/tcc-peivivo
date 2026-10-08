import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api, mensagemAmigavel, type CadastroSegundoFator } from "../services";
import { useSessao } from "../hooks/useSessao";
import { useConsulta, useMutacao } from "../hooks/useConsulta";
import { useTitulo } from "../hooks/useTitulo";
import { Alerta, Carregando, ErroCarregamento } from "../components/Feedback";
import { Botao } from "../components/Botao";
import { Campo } from "../components/Campo";

/**
 * Verificação em duas etapas (R2.2, D-32): obrigatória para profissional de
 * saúde e coordenação — o banco nega dado clínico e administrativo em aal1.
 * Cadastro: QR code + o mesmo segredo em texto (alternativa para quem não usa
 * câmera ou usa leitor de tela). Código: `one-time-code` (preenchimento
 * automático), sem limite de tempo na tela (WCAG 2.2.1).
 */
export function VerificacaoDuasEtapas() {
  useTitulo("Verificação em duas etapas");
  const navigate = useNavigate();
  const location = useLocation();
  const destino = (location.state as { de?: string } | null)?.de ?? "/painel";
  const { usuario, atualizar } = useSessao();
  const [codigo, setCodigo] = useState("");
  const [cadastro, setCadastro] = useState<CadastroSegundoFator | null>(null);

  const nivel = useConsulta(() => api.nivelSessao(), [usuario?.id]);
  const iniciar = useMutacao(async () => setCadastro(await api.iniciarCadastroSegundoFator()));
  const verificar = useMutacao(async () => {
    await api.verificarSegundoFator(codigo, cadastro?.fatorId);
    await atualizar();
    navigate(destino, { replace: true });
  });

  if (!usuario) {
    return (
      <div className="pagina-estreita">
        <h1>Verificação em duas etapas</h1>
        <Alerta tom="info">Entre com e-mail e senha primeiro.</Alerta>
      </div>
    );
  }
  if (nivel.carregando) return <Carregando />;
  if (nivel.erro || !nivel.dados) return <ErroCarregamento erro={nivel.erro} tentarNovamente={nivel.recarregar} />;

  const precisaCadastrar = !nivel.dados.temFatorCadastrado && !cadastro;
  const formCodigo = (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        verificar.executar();
      }}
    >
      {verificar.erro && (
        <Alerta tom="erro" vivo>
          {mensagemAmigavel(verificar.erro)}
        </Alerta>
      )}
      <Campo
        id="codigo"
        rotulo="Código de 6 dígitos do aplicativo"
        dica="Abra o aplicativo autenticador e digite o código atual do PEI Vivo."
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={6}
        required
        value={codigo}
        onChange={(e) => setCodigo(e.target.value.replace(/\D/gu, ""))}
      />
      <div className="grupo-botoes grupo-botoes--empilhado">
        <Botao type="submit" carregando={verificar.ocupado} textoCarregando="Verificando…" disabled={codigo.length !== 6}>
          Verificar
        </Botao>
      </div>
    </form>
  );

  return (
    <div className="pagina-estreita">
      <h1>Verificação em duas etapas</h1>
      <p>
        Como você acessa dados de saúde ou administra a escola, pedimos um segundo passo além da senha: um código que muda a cada 30
        segundos no seu celular. Assim, mesmo que alguém descubra sua senha, não entra.
      </p>

      {precisaCadastrar && (
        <>
          <h2>Primeiro acesso: cadastre o aplicativo</h2>
          <ol>
            <li>Instale um aplicativo autenticador gratuito (por exemplo, Google Authenticator ou Microsoft Authenticator).</li>
            <li>Toque em “Começar” abaixo e leia o código QR com o aplicativo.</li>
            <li>Digite o código de 6 dígitos que aparecer.</li>
          </ol>
          {iniciar.erro && (
            <Alerta tom="erro" vivo>
              {mensagemAmigavel(iniciar.erro)}
            </Alerta>
          )}
          <Botao onClick={() => iniciar.executar()} carregando={iniciar.ocupado} textoCarregando="Preparando…">
            Começar
          </Botao>
        </>
      )}

      {cadastro && (
        <>
          <h2>Leia o código QR</h2>
          <img src={cadastro.qrCode} alt="Código QR para cadastrar o PEI Vivo no aplicativo autenticador. Se não puder ler, use a chave em texto abaixo." width={200} height={200} className="qr-code" />
          <p>
            Não consegue usar a câmera? No aplicativo, escolha “inserir chave” e digite: <code className="segredo">{cadastro.segredo}</code>
          </p>
          {formCodigo}
        </>
      )}

      {nivel.dados.temFatorCadastrado && !cadastro && formCodigo}

      <p className="meta">Perdeu o celular? Fale com a coordenação da escola: ela confere sua identidade e libera um novo cadastro.</p>
    </div>
  );
}
