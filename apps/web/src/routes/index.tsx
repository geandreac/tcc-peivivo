import { createBrowserRouter } from "react-router-dom";
import { Layout } from "../layouts/Layout";
import { RotaProtegida } from "./RotaProtegida";
import { Inicio } from "../pages/Inicio";
import { Entrar } from "../pages/Entrar";
import { EntrarPapel } from "../pages/EntrarPapel";
import { Ajuda } from "../pages/Ajuda";
import { Acessibilidade } from "../pages/Acessibilidade";
import { Painel } from "../pages/Painel";
import { Pendencias } from "../pages/Pendencias";
import { CadastrarEstudante } from "../pages/CadastrarEstudante";
import { Estudante } from "../pages/Estudante";
import { Consentimento } from "../pages/Consentimento";
import { Observar } from "../pages/Observar";
import { FecharCiclo } from "../pages/FecharCiclo";
import { ValidarParametros } from "../pages/ValidarParametros";
import { NotasClinicas } from "../pages/NotasClinicas";
import { GerarMaterial } from "../pages/GerarMaterial";
import { RevisarMaterial } from "../pages/RevisarMaterial";
import { MaterialFinal } from "../pages/MaterialFinal";
import { Desfecho } from "../pages/Desfecho";
import { Historico } from "../pages/Historico";
import { Vinculos } from "../pages/Vinculos";
import { DadosLgpd } from "../pages/DadosLgpd";
import { NaoEncontrada } from "../pages/NaoEncontrada";

/**
 * Mapa de rotas = arquitetura da informação (docs/ux-ui.md §1).
 * Um layout só; o que muda por papel é o conteúdo, nunca um "modo admin".
 */
export const rotas = [
  {
    element: <Layout />,
    children: [
      { path: "/", element: <Inicio /> },
      { path: "/entrar", element: <Entrar /> },
      { path: "/entrar/:slug", element: <EntrarPapel /> },
      { path: "/ajuda", element: <Ajuda /> },
      { path: "/acessibilidade", element: <Acessibilidade /> },
      {
        element: <RotaProtegida />,
        children: [
          { path: "/painel", element: <Painel /> },
          { path: "/pendencias", element: <Pendencias /> },
          { path: "/coordenacao/cadastrar", element: <CadastrarEstudante /> },
          { path: "/estudantes/:id", element: <Estudante /> },
          { path: "/estudantes/:id/consentimento", element: <Consentimento /> },
          { path: "/estudantes/:id/observar", element: <Observar /> },
          { path: "/estudantes/:id/fechar-ciclo", element: <FecharCiclo /> },
          { path: "/estudantes/:id/validar", element: <ValidarParametros /> },
          { path: "/estudantes/:id/notas-clinicas", element: <NotasClinicas /> },
          { path: "/estudantes/:id/gerar", element: <GerarMaterial /> },
          { path: "/estudantes/:id/historico", element: <Historico /> },
          { path: "/estudantes/:id/vinculos", element: <Vinculos /> },
          { path: "/estudantes/:id/dados", element: <DadosLgpd /> },
          { path: "/materiais/:id", element: <MaterialFinal /> },
          { path: "/materiais/:id/revisar", element: <RevisarMaterial /> },
          { path: "/materiais/:id/desfecho", element: <Desfecho /> },
        ],
      },
      { path: "*", element: <NaoEncontrada /> },
    ],
  },
];

export const router = createBrowserRouter(rotas);
