import { usePreferencias, type Preferencias } from "../hooks/usePreferencias";
import { useTitulo } from "../hooks/useTitulo";
import { useAnuncio } from "../hooks/useAnuncio";
import { Botao } from "../components/Botao";
import { Card } from "../components/Feedback";

function Opcoes<K extends keyof Preferencias>({
  chave,
  legenda,
  descricao,
  opcoes,
  prefs,
  definir,
}: {
  chave: K;
  legenda: string;
  descricao: string;
  opcoes: { valor: Preferencias[K]; rotulo: string; descricao?: string }[];
  prefs: Preferencias;
  definir: (chave: K, valor: Preferencias[K]) => void;
}) {
  return (
    <fieldset>
      <legend>{legenda}</legend>
      <p className="campo__dica">{descricao}</p>
      {opcoes.map((o) => (
        <label key={String(o.valor)} className="opcao">
          <input type="radio" name={chave} value={String(o.valor)} checked={prefs[chave] === o.valor} onChange={() => definir(chave, o.valor)} />
          <span className="opcao__texto">
            <span>{o.rotulo}</span>
            {o.descricao && <span className="opcao__descricao">{o.descricao}</span>}
          </span>
        </label>
      ))}
    </fieldset>
  );
}

/** Tela de acessibilidade (orientação: tela 6) — preferências + declaração. */
export function Acessibilidade() {
  useTitulo("Acessibilidade");
  const { prefs, definir, redefinir } = usePreferencias();
  const { anunciar } = useAnuncio();

  return (
    <>
      <h1>Acessibilidade</h1>
      <p style={{ maxWidth: "var(--largura-leitura)" }}>
        Ajuste a interface do seu jeito. As preferências ficam salvas neste dispositivo e valem para todas as telas. O zoom do navegador
        (até 400 %) também funciona — nada aqui o substitui.
      </p>

      <div className="preferencias">
        <Opcoes
          chave="contraste"
          legenda="Contraste"
          descricao="O padrão já atende 4,5:1 (WCAG AA). O alto contraste leva todos os textos acima de 9:1."
          opcoes={[
            { valor: "padrao", rotulo: "Padrão", descricao: "Cores da marca, contraste mínimo 4,5:1" },
            { valor: "alto", rotulo: "Alto contraste", descricao: "Preto sobre branco, bordas reforçadas" },
          ]}
          prefs={prefs}
          definir={definir}
        />
        <Opcoes
          chave="fonte"
          legenda="Tamanho do texto"
          descricao="Aumenta todo o texto sem quebrar o layout."
          opcoes={[
            { valor: "padrao", rotulo: "Padrão (16 px)" },
            { valor: "grande", rotulo: "Grande (19 px)" },
            { valor: "maior", rotulo: "Maior (22 px)" },
          ]}
          prefs={prefs}
          definir={definir}
        />
        <Opcoes
          chave="movimento"
          legenda="Movimento"
          descricao="Se as animações incomodam, desative-as. O sistema também respeita a preferência do seu dispositivo."
          opcoes={[
            { valor: "padrao", rotulo: "Animações leves" },
            { valor: "reduzido", rotulo: "Sem animações" },
          ]}
          prefs={prefs}
          definir={definir}
        />
      </div>

      <div className="grupo-botoes">
        <Botao
          variante="secundario"
          onClick={() => {
            redefinir();
            anunciar("Preferências restauradas ao padrão.", "neutro");
          }}
        >
          Restaurar padrão
        </Botao>
      </div>

      <hr />

      <Card titulo="Declaração de acessibilidade">
        <p>
          O PEI Vivo é projetado para atender à <strong>WCAG 2.2 nível AA</strong> e à ABNT NBR 17225. Este protótipo implementa:
        </p>
        <ul>
          <li>navegação completa por teclado, com foco sempre visível e link para pular ao conteúdo;</li>
          <li>estrutura com títulos hierárquicos e regiões (cabeçalho, navegação, conteúdo, rodapé);</li>
          <li>todos os campos com rótulo; instruções e erros associados ao campo e lidos por leitores de tela;</li>
          <li>mensagens de status anunciadas sem mover o foco;</li>
          <li>contraste mínimo 4,5:1 (texto) e 3:1 (componentes), com tema de alto contraste;</li>
          <li>layout que reflui em 320 px de largura e zoom até 400 %;</li>
          <li>alvos de toque de pelo menos 44 × 44 px;</li>
          <li>nenhuma informação transmitida só por cor, ícone ou posição;</li>
          <li>respeito à preferência de redução de movimento.</li>
        </ul>
        <p>
          Limitações conhecidas: a validação com leitor de tela (NVDA) e usuários reais ainda está planejada (ver plano de testes). Encontrou uma
          barreira? Escreva para <a href="mailto:acessibilidade@peivivo.example">acessibilidade@peivivo.example</a> (endereço fictício).
        </p>
      </Card>

      <Card titulo="Atalhos de teclado">
        <dl className="dados">
          <dt>Tab / Shift + Tab</dt>
          <dd>Avança / volta entre elementos interativos.</dd>
          <dt>Enter</dt>
          <dd>Ativa links e botões; envia formulários.</dd>
          <dt>Espaço</dt>
          <dd>Ativa botões; marca caixas de seleção.</dd>
          <dt>Setas</dt>
          <dd>Escolhe entre opções de um grupo (escala de observação, escopos).</dd>
          <dt>Esc</dt>
          <dd>Fecha janelas de confirmação e devolve o foco a quem as abriu.</dd>
        </dl>
      </Card>
    </>
  );
}
