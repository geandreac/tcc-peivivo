/**
 * P4.7 — axe-core em cada componente + comportamento de acessibilidade
 * (rótulos, erros associados, teclado, foco). Testa a estrutura, não a cor.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { Botao } from "./Botao";
import { Campo } from "./Campo";
import { Escala3 } from "./Escala3";
import { Modal } from "./Modal";
import { Alerta, ResumoErros, Carregando, EstadoVazio, Badge } from "./Feedback";
import { MaterialAdaptado } from "./MaterialAdaptado";
import { adaptar } from "@pei-vivo/motor-adaptacao";
import { PARAMETROS_CENARIO_A, TEXTO_CICLO_DA_AGUA } from "../mocks/dados";
import { semViolacoesAxe } from "../test/utils";

describe("Botao", () => {
  it("é um <button>, tem nome acessível e em loading fica desabilitado com aria-busy", async () => {
    const { container, rerender } = render(<Botao onClick={() => {}}>Salvar</Botao>);
    expect(screen.getByRole("button", { name: "Salvar" })).toBeEnabled();
    rerender(
      <Botao carregando textoCarregando="Salvando…">
        Salvar
      </Botao>
    );
    const b = screen.getByRole("button");
    expect(b).toBeDisabled();
    expect(b).toHaveAttribute("aria-busy", "true");
    expect(b).toHaveTextContent("Salvando…");
    await semViolacoesAxe(container);
  });
});

describe("Campo", () => {
  it("associa label, dica e erro ao controle (aria-describedby, aria-invalid)", async () => {
    const { container } = render(<Campo id="nome" rotulo="Nome" dica="Como aparece no documento." erro="Informe o nome." required value="" onChange={() => {}} />);
    const input = screen.getByLabelText(/Nome/);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Como aparece no documento. Informe o nome.");
    expect(input).toHaveAttribute("aria-required", "true");
    await semViolacoesAxe(container);
  });
  it("sem erro não marca aria-invalid; textarea e select também recebem rótulo", async () => {
    const { container } = render(
      <>
        <Campo tipo="area" rotulo="Evidência" opcional value="" onChange={() => {}} />
        <Campo tipo="select" rotulo="Papel" value="" onChange={() => {}}>
          <option value="">Escolha</option>
        </Campo>
      </>
    );
    expect(screen.getByLabelText(/Evidência/)).not.toHaveAttribute("aria-invalid");
    expect(screen.getByLabelText(/Papel/).tagName).toBe("SELECT");
    await semViolacoesAxe(container);
  });
});

describe("Escala3", () => {
  it("é um grupo nomeado (fieldset/legend) com 3 rádios operáveis por teclado", async () => {
    function Wrapper() {
      const [v, setV] = useState<"REDUZIDA" | "ESTAVEL" | "AMPLIADA" | null>(null);
      return <Escala3 dimensao="ATENCAO_SUSTENTADA" valor={v} onChange={setV} />;
    }
    const { container } = render(<Wrapper />);
    const grupo = screen.getByRole("group", { name: "Atenção sustentada" });
    expect(grupo).toBeInTheDocument();
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(3);
    await userEvent.click(screen.getByLabelText(/Ampliada/));
    expect(screen.getByLabelText(/Ampliada/)).toBeChecked();
    await semViolacoesAxe(container);
  });
  it("mostra erro associado ao grupo", () => {
    render(<Escala3 dimensao="FADIGA_TAREFA" valor={null} onChange={() => {}} erro="Escolha uma opção." />);
    expect(screen.getByText("Escolha uma opção.")).toBeInTheDocument();
    expect(screen.getByRole("group")).toHaveAttribute("aria-invalid", "true");
  });
});

describe("Modal", () => {
  it("abre com foco no título, fecha com Esc e devolve o foco ao botão de origem", async () => {
    function Wrapper() {
      const [aberto, setAberto] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setAberto(true)}>
            Abrir
          </button>
          <Modal aberto={aberto} titulo="Confirmar?" onFechar={() => setAberto(false)} acoes={<button type="button">Sim</button>}>
            <p>Texto</p>
          </Modal>
        </>
      );
    }
    const { container } = render(<Wrapper />);
    const abrir = screen.getByRole("button", { name: "Abrir" });
    abrir.focus();
    await userEvent.click(abrir);
    const dialog = container.querySelector("dialog")!;
    expect(dialog).toHaveAttribute("open");
    expect(dialog).toHaveAttribute("aria-labelledby");
    expect(document.activeElement?.textContent).toBe("Confirmar?");
    // Esc → evento cancel → close → onFechar
    dialog.dispatchEvent(new Event("cancel", { cancelable: true }));
    expect(dialog).not.toHaveAttribute("open");
    expect(document.activeElement).toBe(abrir);
  });
  it("botão Cancelar fecha", async () => {
    const onFechar = vi.fn();
    render(
      <Modal aberto titulo="T" onFechar={onFechar}>
        <p>x</p>
      </Modal>
    );
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onFechar).toHaveBeenCalled();
  });
});

describe("Feedback", () => {
  it("Alerta de erro vivo tem role=alert; status tem role=status; ícone é decorativo", async () => {
    const { container } = render(
      <>
        <Alerta tom="erro" vivo>
          Falhou
        </Alerta>
        <Alerta tom="sucesso" vivo>
          Ok
        </Alerta>
        <Carregando />
        <EstadoVazio titulo="Nada aqui" />
        <Badge tom="sucesso">Aprovado</Badge>
      </>
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Falhou");
    expect(screen.getAllByRole("status")).toHaveLength(2);
    expect(container.querySelector(".alerta__icone")).toHaveAttribute("aria-hidden", "true");
    await semViolacoesAxe(container);
  });
  it("ResumoErros recebe foco e cada item leva ao campo", async () => {
    const { container } = render(
      <>
        <ResumoErros erros={[{ campo: "nome", mensagem: "Informe o nome." }]} />
        <input id="nome" aria-label="Nome" />
      </>
    );
    expect(document.activeElement).toHaveClass("resumo-erros");
    await userEvent.click(screen.getByRole("link", { name: "Informe o nome." }));
    expect(document.activeElement).toBe(screen.getByLabelText("Nome"));
    await semViolacoesAxe(container);
  });
});

describe("MaterialAdaptado (D-10)", () => {
  it("aplica contraste do perfil como atributo e renderiza etapas como lista ordenada", async () => {
    const adaptado = adaptar(TEXTO_CICLO_DA_AGUA, PARAMETROS_CENARIO_A);
    const { container } = render(<MaterialAdaptado adaptado={adaptado} titulo="Ciclo da água" />);
    const artigo = container.querySelector("article.material")!;
    expect(artigo).toHaveAttribute("data-contraste", "7");
    expect(artigo).toHaveAttribute("lang", "pt-BR");
    expect(screen.getAllByRole("list").length).toBeGreaterThan(0);
    expect(screen.getByText("Leia o texto acima.")).toBeInTheDocument();
    await semViolacoesAxe(container);
  });
});
