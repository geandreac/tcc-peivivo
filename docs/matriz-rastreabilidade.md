# Matriz de rastreabilidade — requisito → tela → código → teste

**Versão:** 1.0 — 21/09/2026 · **Complementa** `docs/rastreabilidade.md` (formato da disciplina: RF · Motivação · Decisão · Teste · Commit). Aqui a pergunta é operacional: *para cada requisito, onde está a tela, onde está o código e qual teste prova.*
**Fonte dos requisitos:** `docs/requisitos.md` §11 (RF01–RF16, RNF-A…J), CLAUDE.md (RN01–RN08).
**Status:** ✅ implementado e testado · 🟡 implementado no protótipo (mock); backend pendente · 🔵 implementado sem teste automatizado (manual) · ⬜ planejado · N/A não se aplica.
**Testes:** nomes de `describe › it` em `apps/web/src/**/*.test.ts(x)` e `packages/motor-adaptacao/src/*.test.ts`. Total em 21/09/2026: **98 testes** (30 motor + 68 web).

---

## 1. Requisitos funcionais

| ID | Requisito | Funcionalidade/Tela | Arquivos ou Módulos Relacionados | Teste Associado | Status |
|---|---|---|---|---|---|
| RF01 | Cadastrar estudante e vincular (só coordenação; profissional exige registro no conselho) | *Cadastrar estudante* (`/coordenacao/cadastrar`), *Vínculos* (`/estudantes/:id/vinculos`) | `pages/CadastrarEstudante.tsx`, `pages/Vinculos.tsx`, `services/mockApi.ts` (`cadastrarEstudante`, `vincular`, `desativarVinculo`), `0001_core_schema.sql` (`vinculos_usuario_estudante`) | `mockApi.test.ts › D-08 / D-13 / D-14` (4 testes); `autenticacao.test.tsx › docente não vê 'Cadastrar estudante'` | 🟡 |
| RF02 | Consentimento granular, revogável, com auditoria | *Consentimento* (`/estudantes/:id/consentimento`) | `pages/Consentimento.tsx`, `mockApi.ts` (`concederConsentimento`, `revogarConsentimento`, `registrarAuditoria`), `0002_rls_policies.sql` | `mockApi.test.ts › RN01 / RN08` (5 testes); `paginas.test.tsx › Consentimento › responsável concede…` | 🟡 |
| RF03 | Observação pedagógica do docente por ciclo (6 dimensões, escala 3) | *Registrar observação* (`/estudantes/:id/observar`) | `pages/Observar.tsx`, `components/Escala3.tsx`, `utils/rotulos.ts`, `mockApi.ts` (`registrarObservacao`, `abrirCiclo`) | `paginas.test.tsx › Observação e fechamento › exige ao menos uma dimensão…`; `componentes.test.tsx › Escala3` (2) | 🟡 |
| RF04 | Observações do responsável e do profissional (mesma tela, `papel_autor`) | *Registrar observação* | idem RF03; `mockApi.ts` (D-04) | `mockApi.test.ts › RF03/RF04 — observações` (3 testes) | 🟡 |
| RF05 | Converter observações em parâmetros (regras determinísticas, RN03) | *Fechar ciclo* (`/estudantes/:id/fechar-ciclo`) | `packages/motor-adaptacao/src/regras.ts`, `ciclos.ts`, `ancora.ts`; `mockApi.ts` (`calcularProposta`, `fecharCiclo`); `pages/FecharCiclo.tsx` | `regras.test.ts` (11), `ciclos.test.ts` (10); `mockApi.test.ts › RF05–RF07` (6); `paginas.test.tsx › …mostra o diff com RN03 ao fechar` | ✅ motor / 🟡 EF |
| RF06 | Submeter parâmetros à validação clínica (PENDENTE se há profissional) | *Fechar ciclo* → *Pendências* | `mockApi.ts` (`fecharCiclo`, `temProfissional`), `pages/Pendencias.tsx` | `mockApi.test.ts › com profissional vinculado a versão nasce PENDENTE` | 🟡 |
| RF07 | Aprovar / ajustar / expirar em 7 dias (RN05, RN07) | *Validar parâmetros* (`/estudantes/:id/validar`), *Pendências* (`/pendencias`) | `pages/ValidarParametros.tsx`, `pages/Pendencias.tsx`, `mockApi.ts` (`validarVersao`, `aplicarExpiracao`, `listarPendencias`) | `mockApi.test.ts › docente não valida; profissional aprova`, `› solicitar ajuste exige justificativa` | 🟡 (expiração: 🔵 TF-15 manual) |
| RF08 | Gerar material a partir de texto + parâmetros vigentes, com cache | *Gerar material* (`/estudantes/:id/gerar`) | `pages/GerarMaterial.tsx`, `mockApi.ts` (`gerarMaterial`, `hash`) | `mockApi.test.ts › RF08/RF09` (5); `paginas.test.tsx › valida o formulário…`, `› gera com o texto de exemplo…`, `› estado vazio…` | 🟡 |
| RF09 | Camada determinística de adaptação (blocos, etapa única, contraste) | *Revisar*, *Material* | `packages/motor-adaptacao/src/adaptador.ts`, `components/MaterialAdaptado.tsx` | `adaptador.test.ts` (9); `componentes.test.tsx › MaterialAdaptado` | ✅ |
| RF10 | Camada de IA (opcional, desligável) | *Revisar* (aviso "IA desligada") | — (`ProvedorIA` planejado, Fase 5) | — | ⬜ Could |
| RF11 | Revisão, edição e aprovação humana; rascunho privado (RN04, D-12) | *Revisar* (`/materiais/:id/revisar`) | `pages/RevisarMaterial.tsx`, `mockApi.ts` (`aprovarMaterial`, `descartarMaterial`, `obterMaterial`) | `mockApi.test.ts › D-12 / RN04` (3); `paginas.test.tsx › gera…aprova…`, `› responsável não vê rascunho` | 🟡 |
| RF12 | Versão web acessível + impressão | *Material* (`/materiais/:id`) | `pages/MaterialFinal.tsx`, `components/MaterialAdaptado.tsx`, `styles/print.css`, `scripts/contraste.mjs` | `componentes.test.tsx › MaterialAdaptado` (contraste 7, lista, axe); `npm run contraste` | ✅ (impressão 🔵 TF-22) |
| RF13 | Registrar desfecho (1:1 com material, só docente) | *Desfecho* (`/materiais/:id/desfecho`) | `pages/Desfecho.tsx`, `mockApi.ts` (`registrarDesfecho`) | `mockApi.test.ts › RF13`; `paginas.test.tsx › gera…registra desfecho` | 🟡 |
| RF14 | RBAC + permissões granulares (matriz v2) | Todas as telas autenticadas; *Notas clínicas* como prova (RN02) | `services/mockApi.ts` (`exigirPapel`, `exigirLeitura`, `exigirConsentimento`), `routes/RotaProtegida.tsx`, `0002_rls_policies.sql` (18 policies) | `mockApi.test.ts` (34 cenários, cada bloco começa pelo NEGADO); `paginas.test.tsx › Caminhos negados na interface` (4); `autenticacao.test.tsx` (7) | 🟡 (RLS real: P1.11–P1.19) |
| RF15 | Exportar / excluir dados do estudante (LGPD art. 18) | *Dados do estudante* (`/estudantes/:id/dados`) | `pages/DadosLgpd.tsx`, `mockApi.ts` (`exportarDados`, `excluirEstudante`) | `mockApi.test.ts › RF15 / D-05 / D-06` (4) | 🟡 |
| RF16 | Ajuda e preferências de acessibilidade | *Ajuda* (`/ajuda`), *Acessibilidade* (`/acessibilidade`) | `pages/Ajuda.tsx`, `pages/Acessibilidade.tsx`, `hooks/usePreferencias.ts` | `paginas.test.tsx › Ajuda e Acessibilidade existem e passam no axe` | ✅ |

## 2. Autenticação, sessão e navegação (recorte pedido pela disciplina)

| ID | Requisito | Funcionalidade/Tela | Arquivos ou Módulos Relacionados | Teste Associado | Status |
|---|---|---|---|---|---|
| AUT-01 | Tela de login própria por perfil, com linguagem do contexto | `/entrar` + `/entrar/familia`, `/entrar/docente`, `/entrar/saude`, `/entrar/coordenacao` | `pages/Entrar.tsx`, `pages/EntrarPapel.tsx`, `utils/perfisLogin.ts` | `paginas.test.tsx › porta de entrada lista os 4 perfis…`; `autenticacao.test.tsx › família/equipe de saúde/coordenação` | ✅ (demo) |
| AUT-02 | Fluxo de autenticação específico (Supabase Auth: e-mail + senha; convite para família) | `/entrar/:slug` (card "Como será o acesso real") | `hooks/useSessao.tsx` (`entrar`), `services/api.ts` (`entrar`, `sair`, `usuarioAtual`) | — | ⬜ P4.4 |
| AUT-03 | Redirecionamento correto após login (painel ou rota de origem) | `/entrar/:slug` → `/painel` ou `state.de` | `pages/EntrarPapel.tsx`, `routes/RotaProtegida.tsx` | `autenticacao.test.tsx › rota protegida sem sessão → Entrar → volta à origem`; `paginas.test.tsx › rota protegida sem sessão` | ✅ |
| AUT-04 | Dashboard adequado ao papel | `/painel` (ação principal por papel), `/estudantes/:id` (cards por papel) | `pages/Painel.tsx` (`ACAO_PRINCIPAL`), `pages/Estudante.tsx` | `autenticacao.test.tsx` (3 papéis); `paginas.test.tsx › escolher um perfil na tela de professores…` | ✅ |
| AUT-05 | Controle de acesso por perfil (rota + dado) | `RotaProtegida` + camada de serviços | `routes/RotaProtegida.tsx`, `services/mockApi.ts` | `mockApi.test.ts` (34); `paginas.test.tsx › Caminhos negados` | 🟡 |
| AUT-06 | Logout | Botão "Sair" no cabeçalho | `layouts/Layout.tsx` (`aoSair`), `useSessao.sair` | `autenticacao.test.tsx › sair encerra a sessão…` | ✅ |
| AUT-07 | Credenciais inválidas / falha de autenticação | `/entrar/:slug` (alerta "Não foi possível entrar") | `pages/EntrarPapel.tsx` (`mutacao.erro`) | `autenticacao.test.tsx › falha na autenticação mostra erro acessível…` | ✅ (falha) / ⬜ senha inválida (P4.4) |
| AUT-08 | Recuperação de senha | — | — | — | ⬜ P4.4 (Supabase Auth `resetPasswordForEmail`) |
| AUT-09 | Página 404 | `*` | `pages/NaoEncontrada.tsx` | `paginas.test.tsx › rota inexistente…`, `› /entrar/xyz…` | ✅ |
| AUT-10 | Estados carregando / vazio / erro em toda tela | todas | `hooks/useConsulta.ts`, `components/Feedback.tsx` | `paginas.test.tsx › docente sem vínculo vê estado vazio`, `› estado vazio quando…`; `componentes.test.tsx › Feedback` | ✅ (erro de rede: 🔵 TF-35) |

## 3. Regras de negócio

| ID | Regra | Funcionalidade/Tela | Arquivos | Teste Associado | Status |
|---|---|---|---|---|---|
| RN01 | Sem consentimento ativo, nenhuma escrita nem geração; leitura só R e C (D-11) | Estudante, Observar, Gerar | `mockApi.ts` (`exigirConsentimento`, `exigirLeitura`) | `mockApi.test.ts › sem consentimento (estudante B)…`, `› responsável e coordenação continuam lendo…`; `paginas.test.tsx › sem consentimento, a tela de geração mostra bloqueio` | 🟡 |
| RN02 | Docente nunca lê nota clínica; sem laudo (D-01) | Notas clínicas | `mockApi.ts` (`listarNotasClinicas`, `obterEstudante` oculta laudo) | `mockApi.test.ts › RN02 ⭐` (3), `› D-01: docente não vê a data do laudo`; `paginas.test.tsx › docente…'Acesso negado (RN02)'` | 🟡 |
| RN03 | Elevar exige 2 ciclos "ampliada"; reduzir é imediato | Fechar ciclo (diff) | `regras.ts` (`paraProximoNivel`), `ciclos.ts` | `regras.test.ts › RN03` (4); `mockApi.test.ts › …PENDENTE` (assimetria no diff) | ✅ |
| RN04 | Nada chega ao estudante sem APROVADO | Revisar, Material | `mockApi.ts` (`listarMateriais`, `obterMaterial`) | `mockApi.test.ts › D-12 / RN04` | 🟡 |
| RN05 | Sem validação em 7 dias, mantém a VIGENTE | Pendências | `mockApi.ts` (`aplicarExpiracao`) | TF-15 manual (editar `createdAt`) | 🔵 |
| RN06 | Sem profissional vinculado, só camada determinística; versão nasce VIGENTE | Fechar ciclo (badge "modo pedagógico") | `mockApi.ts` (`temProfissional`) | `mockApi.test.ts › RN06: sem profissional…` | 🟡 |
| RN07 | Validação por ciclo, nunca por material | Validar | `mockApi.ts` (`aprovarMaterial` exige DOCENTE) | `mockApi.test.ts › RN07: profissional não aprova material` | 🟡 |
| RN08 | Revogação bloqueia geração imediatamente | Consentimento | `mockApi.ts` (`revogarConsentimento`) | `mockApi.test.ts › revogar bloqueia geração imediatamente…` | 🟡 |

## 4. Requisitos não funcionais

| ID | Requisito | Onde | Arquivos | Teste / evidência | Status |
|---|---|---|---|---|---|
| RNF-A | Responsividade 320–1440 px | Todas | `styles/base.css`, `componentes.css` (9 `@media`) | CSS revisado; Playwright 375×812 ⬜ (P4.19) | 🔵 |
| RNF-B | Desempenho (geração < 60 s; bundle < 150 kB gzip) | Gerar | `mockApi.ts` (`duracaoMs`), `vite build` | build 104 kB gzip (README) | 🔵 |
| RNF-C | Segurança básica (permissão no dado; sem segredo no cliente) | Serviços | `mockApi.ts`, `0002_rls_policies.sql`, `.env.example` | `mockApi.test.ts` (34); grep de segredos (diagnóstico) | 🟡 |
| RNF-D | Manutenibilidade (TS estrito, cobertura ≥ 70 %) | Todo o código | `tsconfig.base.json`, `vitest.config.ts`, `vite.config.ts` (thresholds) | motor 97 %; web 78 % (threshold no CI desde 21/09) | ✅ |
| RNF-E | Usabilidade (SUS ≥ 68; heurísticas sem sev. ≥ 3) | — | `docs/avaliacao-heuristica.md`, `docs/plano-de-testes.md` §2 | heurística ✅; SUS ⬜ piloto | 🟡 |
| RNF-F | Acessibilidade WCAG 2.2 AA | Todas | `docs/wcag-2.2.md`, `test/utils.tsx` (`semViolacoesAxe`) | axe em 21 telas/componentes (0 violações); NVDA ⬜ | 🟡 |
| RNF-G | Compatibilidade de navegadores | — | `docs/plano-de-testes.md` §4 | ⬜ manual | ⬜ |
| RNF-H | Tratamento de erros (código estável + mensagem simples + recuperação) | Todas | `services/erros.ts` (`mensagemAmigavel`), `components/Feedback.tsx` | `autenticacao.test.tsx › falha na autenticação…`; TF-35 manual | ✅ |
| RNF-I | Consistência visual | Todas | `styles/tokens.css`, `layouts/Layout.tsx` | `npm run contraste`; `paginas.test.tsx › Layout` | ✅ |
| RNF-J | Preparação para API REST | `services/` | `services/api.ts` (contrato), `services/index.ts` (troca única) | revisão de arquitetura | ✅ |

## 5. Como manter

- Toda linha nova de `docs/rastreabilidade.md` ganha a linha correspondente aqui (mesmo PR).
- Ao trocar 🟡 por ✅ (backend real), citar o teste RLS/Playwright que fecha e o hash do commit em `docs/rastreabilidade.md`.
- Cobertura por requisito é revisada a cada marco (M1…M6) e registrada em `docs/pdca.md` (Check).
