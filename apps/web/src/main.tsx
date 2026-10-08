import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./routes";
import { SessaoProvider } from "./hooks/useSessao";
import { AnuncioProvider } from "./hooks/useAnuncio";
import { aplicarPreferencias, lerPreferencias } from "./hooks/usePreferencias";
import "./styles/index.css";

// Preferências de acessibilidade valem desde a primeira pintura, em qualquer tela.
aplicarPreferencias(lerPreferencias());

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <SessaoProvider>
      <AnuncioProvider>
        <RouterProvider router={router} />
      </AnuncioProvider>
    </SessaoProvider>
  </React.StrictMode>
);
