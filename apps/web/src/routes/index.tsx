import { createBrowserRouter } from "react-router-dom";
import { lazy, Suspense, type ComponentType } from "react";
import { Carregando } from "../components/Feedback";
import { NaoEncontrada } from "../pages/NaoEncontrada";
import { Layout } from "../layouts/Layout";
import { RotaProtegida } from "./RotaProtegida";

/** D-48: cada tela vira um chunk, baixado ao abrir a rota (code splitting). */
function pagina<M>(carregar: () => Promise<M>, nome: keyof M) {
  const Tela = lazy(async () => ({ default: (await carregar())[nome] as ComponentType }));
  return (
    <Suspense fallback={<Carregando />}>
      <Tela />
    </Suspense>
  );
}

/**
 * Mapa de rotas = arquitetura da informação (docs/ux-ui.md §1).
 * Um layout só; o que muda por papel é o conteúdo. O painel administrativo (D-50) usa o mesmo
 * layout e a mesma navegação, só com outros itens.
 */
export const rotas = [
  {
    element: <Layout />,
    children: [
      { path: "/", element: pagina(() => import("../pages/Inicio"), "Inicio") },
      { path: "/entrar", element: pagina(() => import("../pages/Entrar"), "Entrar") },
      { path: "/entrar/verificacao", element: pagina(() => import("../pages/VerificacaoDuasEtapas"), "VerificacaoDuasEtapas") },
      { path: "/entrar/:slug", element: pagina(() => import("../pages/EntrarPapel"), "EntrarPapel") },
      { path: "/criar-conta", element: pagina(() => import("../pages/CriarConta"), "CriarConta") },
      { path: "/recuperar-senha", element: pagina(() => import("../pages/RecuperarSenha"), "RecuperarSenha") },
      { path: "/redefinir-senha", element: pagina(() => import("../pages/DefinirSenha"), "DefinirSenha") },
      { path: "/definir-senha", element: pagina(() => import("../pages/DefinirSenha"), "DefinirSenha") },
      { path: "/termos", element: pagina(() => import("../pages/Termos"), "Termos") },
      { path: "/ajuda", element: pagina(() => import("../pages/Ajuda"), "Ajuda") },
      { path: "/acessibilidade", element: pagina(() => import("../pages/Acessibilidade"), "Acessibilidade") },
      {
        element: <RotaProtegida />,
        children: [
          { path: "/painel", element: pagina(() => import("../pages/Painel"), "Painel") },
          { path: "/pendencias", element: pagina(() => import("../pages/Pendencias"), "Pendencias") },
          { path: "/notificacoes", element: pagina(() => import("../pages/Notificacoes"), "Notificacoes") },
          { path: "/conta", element: pagina(() => import("../pages/Conta"), "Conta") },
          { path: "/coordenacao/cadastrar", element: pagina(() => import("../pages/CadastrarEstudante"), "CadastrarEstudante") },
          { path: "/estudantes/:id", element: pagina(() => import("../pages/Estudante"), "Estudante") },
          { path: "/estudantes/:id/consentimento", element: pagina(() => import("../pages/Consentimento"), "Consentimento") },
          { path: "/estudantes/:id/observar", element: pagina(() => import("../pages/Observar"), "Observar") },
          { path: "/estudantes/:id/fechar-ciclo", element: pagina(() => import("../pages/FecharCiclo"), "FecharCiclo") },
          { path: "/estudantes/:id/validar", element: pagina(() => import("../pages/ValidarParametros"), "ValidarParametros") },
          { path: "/estudantes/:id/notas-clinicas", element: pagina(() => import("../pages/NotasClinicas"), "NotasClinicas") },
          { path: "/estudantes/:id/gerar", element: pagina(() => import("../pages/GerarMaterial"), "GerarMaterial") },
          { path: "/estudantes/:id/historico", element: pagina(() => import("../pages/Historico"), "Historico") },
          { path: "/estudantes/:id/vinculos", element: pagina(() => import("../pages/Vinculos"), "Vinculos") },
          { path: "/estudantes/:id/dados", element: pagina(() => import("../pages/DadosLgpd"), "DadosLgpd") },
          { path: "/estudantes/:id/privacidade", element: pagina(() => import("../pages/Privacidade"), "Privacidade") },
          { path: "/materiais/:id", element: pagina(() => import("../pages/MaterialFinal"), "MaterialFinal") },
          { path: "/materiais/:id/revisar", element: pagina(() => import("../pages/RevisarMaterial"), "RevisarMaterial") },
          { path: "/materiais/:id/desfecho", element: pagina(() => import("../pages/Desfecho"), "Desfecho") },
          // D-50: painel administrativo (Administrador Geral e coordenação; quem decide é o banco)
          { path: "/admin", element: pagina(() => import("../pages/AdminVisaoGeral"), "AdminVisaoGeral") },
          { path: "/admin/usuarios", element: pagina(() => import("../pages/AdminUsuarios"), "AdminUsuarios") },
          { path: "/admin/usuarios/novo", element: pagina(() => import("../pages/AdminCriarAcesso"), "AdminCriarAcesso") },
          { path: "/admin/usuarios/:id", element: pagina(() => import("../pages/AdminUsuario"), "AdminUsuario") },
          { path: "/admin/perfis", element: pagina(() => import("../pages/AdminPerfis"), "AdminPerfis") },
          { path: "/admin/ferramentas", element: pagina(() => import("../pages/AdminFerramentas"), "AdminFerramentas") },
          { path: "/admin/auditoria", element: pagina(() => import("../pages/AdminAuditoria"), "AdminAuditoria") },
          { path: "/admin/configuracoes", element: pagina(() => import("../pages/AdminConfiguracoes"), "AdminConfiguracoes") },
          { path: "/admin/busca", element: pagina(() => import("../pages/AdminBusca"), "AdminBusca") },
        ],
      },
      { path: "*", element: <NaoEncontrada /> },
    ],
  },
];

export const router = createBrowserRouter(rotas);
