import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./routes";
import { SessaoProvider } from "./hooks/useSessao";
import { AnuncioProvider } from "./hooks/useAnuncio";
import { aplicarPreferencias, lerPreferencias } from "./hooks/usePreferencias";
import { iniciarApi } from "./services";
import "@fontsource/atkinson-hyperlegible-next/latin-400.css";
import "@fontsource/atkinson-hyperlegible-next/latin-600.css";
import "@fontsource/atkinson-hyperlegible-next/latin-700.css";
import "@fontsource/atkinson-hyperlegible-next/latin-800.css";
import "./styles/index.css";

// Preferências de acessibilidade valem desde a primeira pintura, em qualquer tela.
aplicarPreferencias(lerPreferencias());

// A API (mock ou Supabase) é carregada sob demanda; as telas só montam depois dela.
void iniciarApi().then(() =>
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <SessaoProvider>
        <AnuncioProvider>
          <RouterProvider router={router} />
        </AnuncioProvider>
      </SessaoProvider>
    </React.StrictMode>,
  ),
);
