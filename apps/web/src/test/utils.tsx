import { render, type RenderResult } from "@testing-library/react";
import { MemoryRouter, useRoutes } from "react-router-dom";
import axe from "axe-core";
import { rotas } from "../routes";
import { SessaoProvider } from "../hooks/useSessao";
import { AnuncioProvider } from "../hooks/useAnuncio";
import { api } from "../services";
import type { ReactNode } from "react";

/** Renderiza o app inteiro numa rota, opcionalmente já autenticado. */
export async function renderizarApp(rota: string, usuarioId?: string, preparar?: () => Promise<void>): Promise<RenderResult> {
  await api.reiniciarDados();
  if (preparar) await preparar();
  if (usuarioId) await api.entrar(usuarioId);
  else await api.sair();
  return render(
    <SessaoProvider>
      <AnuncioProvider>
        <MemoryRouter initialEntries={[rota]}>
          <Rotas />
        </MemoryRouter>
      </AnuncioProvider>
    </SessaoProvider>
  );
}

/** Mesma tabela de rotas da produção, num router sem loaders (jsdom não suporta o data router). */
function Rotas() {
  return useRoutes(rotas);
}

export function envolver(ui: ReactNode) {
  return render(
    <SessaoProvider>
      <AnuncioProvider>
        <MemoryRouter initialEntries={["/"]}>{ui}</MemoryRouter>
      </AnuncioProvider>
    </SessaoProvider>
  );
}

/**
 * axe-core no jsdom. `color-contrast` é desativada porque o jsdom não calcula
 * estilos — o contraste é verificado numericamente em docs/ux-ui.md e no
 * navegador (Lighthouse/axe DevTools, ver docs/plano-de-testes.md).
 */
export async function semViolacoesAxe(container: Element) {
  const resultado = await axe.run(container, {
    rules: { "color-contrast": { enabled: false } },
  });
  const resumo = resultado.violations.map((v) => `${v.id}: ${v.help} — ${v.nodes.map((n) => n.html).join(" | ")}`);
  expect(resumo).toEqual([]);
}
