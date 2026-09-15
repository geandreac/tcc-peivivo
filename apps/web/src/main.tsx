import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./routes";
import { SessaoProvider } from "./hooks/useSessao";
import { AnuncioProvider } from "./hooks/useAnuncio";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <SessaoProvider>
      <AnuncioProvider>
        <RouterProvider router={router} />
      </AnuncioProvider>
    </SessaoProvider>
  </React.StrictMode>
);
