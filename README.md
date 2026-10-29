# PEI Vivo

> Plataforma colaborativa entre escola, família e equipe de saúde para
> acompanhamento evolutivo e adaptação contínua de materiais didáticos de
> estudantes com TEA, TDAH e dislexia.

TCC de Sistemas de Informação — CEUNI FAMETRO, 2º semestre de 2026.
Dupla: Geandre Alfaia Colares e Jean Victor Torres dos Santos. Orientadora: Luana Leal.
ODS 4 (Educação de Qualidade) e ODS 3 (Saúde e Bem-estar).

---

## 1. Descrição

O Plano Educacional Individualizado (PEI) é obrigatório por lei, mas costuma
virar um PDF na gaveta. O PEI Vivo transforma o plano em um ciclo que executa
a si mesmo — **observar → validar → adaptar → retroalimentar**:

1. Docente, responsável legal e profissional de saúde registram, a cada 15
   dias, observações em seis dimensões (nunca diagnóstico).
2. Um motor determinístico converte as observações em parâmetros de adaptação;
   o profissional de saúde valida o conjunto do ciclo.
3. A docente cola um texto no celular e recebe material com blocos curtos,
   enunciados em etapa única e contraste reforçado; revisa lado a lado e aprova.
4. Registra o desfecho em sala; o resultado refina o perfil para o próximo ciclo.

## 2. Problema resolvido

- PEI estático, sem efeito sobre o material que o estudante recebe.
- Escola, família e terapeuta sem canal estruturado (Lei 14.254/2021 exige a
  articulação e não há instrumento).
- Adaptar um texto manualmente leva ~40 min; com 30 alunos, não acontece.
- Ferramentas existentes adaptam por categoria diagnóstica, não por perfil
  individual evolutivo. Detalhes em `docs/validacao-da-ideia.md`.

## 3. Público-alvo

Quatro perfis, com permissões distintas aplicadas **no dado** (RLS):

| Perfil | Faz | Nunca vê |
|---|---|---|
| Responsável legal | Concede/revoga consentimento, observa o contexto de casa, acompanha, exporta/exclui dados | Nota clínica, rascunhos |
| Docente regente (usuário decisivo) | Observa, fecha ciclo, gera, revisa, aprova, registra desfecho | Nota clínica, laudo (não existe no sistema) |
| Profissional de saúde | Registra estratégias, valida parâmetros por ciclo, mantém nota reservada | Rascunhos |
| Coordenação pedagógica | Cadastra, vincula, acompanha pendências, consolida histórico | Nota clínica, rascunhos |

Personas em `docs/validacao-da-ideia.md` §2.

## 4. Funcionalidades

| Estado | Funcionalidade (RF) |
|---|---|
| ✅ | Cadastro de estudante e vínculos pela coordenação (RF01) |
| ✅ | Consentimento em linguagem simples, granular, revogável, com trilha de auditoria (RF02) |
| ✅ | Observação quinzenal em 6 dimensões, mesma tela para 3 papéis com rótulos leigos (RF03, RF04) |
| ✅ | Fechamento de ciclo com diff vigente → proposto, RN03 e RN06 visíveis (RF05, RF06) |
| ✅ | Validação clínica do conjunto de parâmetros; ajuste com justificativa; expiração em 7 dias (RF07) |
| ✅ | Geração de material pela camada determinística real (`adaptador.ts`), com cache (RF08, RF09) |
| ✅ | Revisão original × adaptado, edição, aprovação/descarte; rascunho privado (RF11) |
| ✅ | Versão web acessível com CSS derivado do perfil + impressão (RF12) |
| ✅ | Desfecho em dois toques (RF13) |
| ✅ | Matriz de permissões v2 aplicada na camada de serviços; 34 testes negativos (RF14) |
| ✅ | Exportar / excluir dados do estudante (RF15) |
| ✅ | Ajuda, preferências de acessibilidade (contraste, fonte, movimento), página 404 |
| ⬜ | Camada de IA (RF10) — desligada; entra na Fase 5 |
| ⬜ | Backend real (Supabase Auth, Edge Functions, RLS `0004`) — Fases 1, 3 e 4 |

## 5. Tecnologias

| Camada | Tecnologia | Motivo |
|---|---|---|
| Linguagem | TypeScript estrito (`tsconfig.base.json`) | Tipa perfil e permissões |
| Front-end | React 18 + Vite 5 + react-router 6 | Leve, mobile-first, sem SSR |
| Estilo | CSS puro com design tokens (D-15) | Contraste auditável; material derivado de `parametros` |
| Motor | `@pei-vivo/motor-adaptacao` (TS puro, isomórfico) | Sem banco, sem rede, sem IA |
| Dados | Supabase (Postgres + RLS + Auth + Edge Functions) — migrations validadas em PGlite | Permissão no dado |
| Testes | Vitest, Testing Library, axe-core; Playwright planejado | Unitário + tela + acessibilidade |
| CI | GitHub Actions (motor, migrations, web) | — |

## 6. Estrutura de diretórios

```
pei-vivo/
├── apps/web/                      # React + Vite — protótipo funcional
│   ├── index.html · vite.config.ts · tsconfig.json
│   ├── public/                    # favicon.svg, manifest.webmanifest, logo-pei-vivo.webp (arte-fonte em design/)
│   └── src/
│       ├── main.tsx               # providers (sessão, anúncios) + router
│       ├── routes/                # mapa de rotas (= arquitetura da informação) e RotaProtegida
│       ├── layouts/               # Layout único: skip link, header/nav/main/footer, toasts
│       ├── pages/                 # 20 telas, uma por rota (Inicio, Entrar, EntrarPapel, Painel, Estudante, …)
│       ├── components/            # design system acessível (Botao, Campo, Escala3, Modal, Feedback, MaterialAdaptado, …)
│       ├── hooks/                 # useSessao, useConsulta/useMutacao, useAnuncio, usePreferencias, useTitulo, useEstudante
│       ├── services/              # contrato PeiVivoApi, ErroApi, tipos de domínio, mockApi (permissões)
│       ├── mocks/                 # dados 100 % fictícios (cenário A)
│       ├── utils/                 # rótulos em linguagem simples, datas
│       ├── styles/                # tokens.css · base.css · componentes.css · print.css
│       ├── assets/                # (vazio — logo em public/, ícone em SVG inline)
│       └── test/                  # setup do Vitest e utilitários (renderizarApp, semViolacoesAxe)
├── packages/motor-adaptacao/      # regras, ciclos, âncora, adaptador + testes (README próprio)
├── packages/politicas/            # 113 testes de RLS/RPC (+12 só no CI) (caminho negado primeiro) — PGlite local, Supabase no CI
├── packages/contratos/            # schemas Zod compartilhados app ↔ Edge Functions
├── packages/funcoes/              # casos de uso das Edge Functions (TS puro, 24 testes)
├── supabase/                      # migrations 0001–0011, functions/ (gerar-material, fechar-ciclo, convidar), seed fictício, config
├── scripts/                       # validar-migrations.mjs (PGlite), contraste.mjs, criar-kanban.sh
├── docs/                          # documentação do projeto (ver §13)
│   └── tcc/                       # fontes do TCC: pré-projeto, diagramas, orientação
└── .github/workflows/             # ci.yml, manter-supabase-ativo.yml
```

Responsabilidade de cada diretório de `apps/web/src`:

- **routes/** — só declaração de rotas e guarda de sessão; nenhuma lógica de tela.
- **layouts/** — estrutura de landmarks compartilhada; navegação consistente.
- **pages/** — composição de componentes por tela; carrega dados via hooks; nunca decide permissão.
- **components/** — reutilizáveis, sem conhecimento de rota ou de API.
- **hooks/** — estado assíncrono (carregando/erro/dados), sessão, anúncios `aria-live`, preferências, título/foco.
- **services/** — única porta para dados; `mockApi` hoje, `supabaseApi` depois, sem mudar telas.
- **mocks/** — semente fictícia; espelha `supabase/seed.sql`.
- **utils/** — funções puras de apresentação.
- **styles/** — tokens e componentes CSS; o único lugar com cores.

## 7. Instalação

Pré-requisitos: Node ≥ 20 (testado com 24), npm ≥ 10. Docker **não** é necessário.

```bash
git clone <repo> pei-vivo
cd pei-vivo
npm install            # instala todos os workspaces
```

## 8. Execução

```bash
npm run dev            # protótipo em http://localhost:5173 (dados fictícios, IA desligada)
npm run build          # build de produção em apps/web/dist
npm run preview        # serve o build
```

Na tela **Entrar**, escolha o tipo de perfil (Família, Professores, Equipe de saúde, Coordenação) — cada um tem a própria tela com a especificação do papel — e depois um perfil fictício. Sugestão de roteiro (o "Miguel"):
Rosa → consentimento · Márcia → observar → fechar ciclo · Camila → validar ·
Márcia → gerar (texto de exemplo) → revisar → aprovar → desfecho · Coordenação → histórico.
Em **Ajuda** há "Restaurar dados" e "Simular falha de rede".

### 8.1 Variáveis de ambiente

Só os nomes estão no repositório. Os valores do front ficam em `apps/web/.env.local` (ignorado pelo git; modelo em [`.env.example`](.env.example)), e os das Edge Functions ficam nos *secrets* do Supabase. Passo a passo em [`docs/reformulacao/IMPLANTACAO.md`](docs/reformulacao/IMPLANTACAO.md).

| Variável | Onde | Finalidade | Pública? |
|---|---|---|---|
| `VITE_API` | front (build) | `supabase` liga o sistema real; qualquer outro valor (ou ausente) mantém a demonstração com dados fictícios | sim |
| `VITE_SUPABASE_URL` | front (build) | URL do projeto Supabase | sim (vai no bundle) |
| `VITE_SUPABASE_ANON_KEY` | front (build) | chave anônima; quem protege os dados é o RLS, não a chave | sim (vai no bundle) |
| `VITE_IA_ATIVA` | front (build) | reservada para a Fase 5; **hoje nenhum código a lê**. Quem liga a IA é o servidor (`IA_HABILITADA`) | sim |
| `ORIGEM_APP` | Edge Functions | origem aceita no CORS e base do link do convite | não é segredo |
| `IA_HABILITADA` | Edge Functions | `true` liga a camada de IA (desligada por padrão, D-39) | não é segredo |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions | injetadas pelo Supabase; a *service role* só existe no servidor | **service role é segredo** |
| `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | testes (`packages/politicas`, CI) | quando presentes, os testes de política rodam contra Postgres/Supabase real | segredo no CI |
| `SUPABASE_PING_ATIVO` (variável) e `SUPABASE_URL`/`SUPABASE_ANON_KEY` (secrets) | GitHub Actions | ping de keep-alive (`manter-supabase-ativo.yml`) | secrets |

### 8.2 Edge Functions (API HTTP)

As três funções recebem `POST` com `Authorization: Bearer <JWT do usuário>` e corpo JSON. O corpo é validado por schemas Zod em modo estrito, em [`packages/contratos`](packages/contratos/src/index.ts), e um campo a mais é recusado. Toda resposta traz o cabeçalho `x-request-id`. Os erros saem como `{ "erro": { "codigo", "mensagem" } }`.

| Rota | Entrada | Saída (200) | Quem pode |
|---|---|---|---|
| `/functions/v1/gerar-material` | `{ estudanteId: uuid, titulo?: string ≤ 120, texto: string 1–20 000 }` | `{ materialId, emCache, origem: "REGRAS" \| "REGRAS_E_IA", avisos[], duracaoMs }` | docente vinculado, com consentimento de geração e perfil vigente |
| `/functions/v1/fechar-ciclo` | `{ cicloId: uuid }` | `{ versaoId, statusValidacao: "PENDENTE" \| "VIGENTE", modoPedagogico, diff[] }` | docente vinculado, ciclo aberto com observação |
| `/functions/v1/convidar` | `{ escolaId: uuid, email, nome?, papel: "DOCENTE" \| "RESPONSAVEL" \| "PROFISSIONAL_SAUDE", estudanteId?, registroConselho?, conferidoPresencialmente? }` | `{ emailEnviado, avisos[] }` | coordenação da escola com segundo fator (aal2) |

| HTTP | `codigo` | Quando |
|---|---|---|
| 400 | `VALIDACAO` | corpo inválido, campo extra, JSON malformado, `22023`/`23514`/`22P02` do banco |
| 401 | `NAO_AUTENTICADO` | sem `Bearer` (o gateway também recusa JWT expirado) |
| 403 | `NEGADO` | o banco negou (`42501`): papel, vínculo, consentimento ou segundo fator |
| 405 | `VALIDACAO` | método diferente de `POST` |
| 409 | `CONFLITO` | estado mudou (`PT409`) ou duplicidade (`23505`) |
| 500 / 502 | `INTERNO` | erro inesperado ou Auth indisponível, sem detalhe interno |

O schema do banco está documentado em [`docs/tcc/class_diagram.svg`](docs/tcc/class_diagram.svg) (gerado das migrations por `npm run diagramas`) e nos `comment on table` das migrations.

### 8.3 Contas fictícias para a apresentação

Todas as pessoas, a escola e os estudantes abaixo são **fictícios** (nenhum dado real, nem em teste). Os e-mails usam domínios reservados (`example.com`, `example.test`) e não recebem mensagens.

#### Sistema real — https://tcc-peivivo.vercel.app/entrar

Contas criadas por [`scripts/cenario-nuvem.mjs`](scripts/cenario-nuvem.mjs) no Supabase de produção, na escola "Escola Municipal Aurora (fictícia)", com o estudante "Miguel (fictício)".

| Perfil | Nome | E-mail | Segundo fator (TOTP) | O que mostrar |
|---|---|---|---|---|
| Administração geral | Administração Geral (fictícia) | `admin.demo@example.com` | sim | painel `/admin`: usuários e acessos, criar acesso, perfis e permissões, ferramentas, auditoria, configurações; nunca abre dado de estudante |
| Coordenação pedagógica | Coordenação (fictícia) | `coordenacao.demo@example.com` | sim | painel da escola (só contagens), vínculos, convites, histórico do PEI, administração limitada à própria escola |
| Docente regente | Márcia (fictícia) | `docente.demo@example.com` | não | observar, fechar ciclo, gerar, revisar e aprovar material, desfecho |
| Responsável legal | Rosa (fictícia) | `responsavel.demo@example.com` | não | consentimento, privacidade (quem vê o quê), exportar dados |
| Profissional de saúde | Camila (fictícia) | `saude.demo@example.com` | sim | validar parâmetros do ciclo, notas clínicas reservadas |

**Senhas e chaves TOTP não ficam no repositório**, porque ele é público e essas contas entram no sistema real. Elas estão no arquivo local `.env.demo-nuvem` (ignorado pelo git), gerado pelo script. Para cadastrar o segundo fator, use "inserir chave" no app autenticador com o valor `DEMO_*_TOTP`. Rodar o script de novo recria as senhas e mantém o cenário.

#### Demonstração (sem senha) — `npm run dev` ou previews da Vercel

Em **Entrar**, escolha a porta do perfil e depois a pessoa. Os dados vivem no navegador; **Ajuda → Restaurar dados** volta ao estado inicial.

| Porta | Nome | E-mail | Para que serve |
|---|---|---|---|
| Família | Rosa (fictícia) | `responsavel.dev@example.test` | responsável do Miguel (consentimento ativo) e do Estudante fictício B (aguardando consentimento) |
| Professores | Márcia (fictícia) | `docente.dev@example.test` | docente do Miguel: perfil vigente, ciclo aberto e material para revisar |
| Professores | Paulo (fictício) | `docente2.dev@example.test` | docente sem vínculo: painel vazio e acesso negado ao Miguel |
| Equipe de saúde | Camila (fictícia) | `profissional.dev@example.test` | profissional do Miguel: valida parâmetros e escreve notas clínicas |
| Equipe de saúde | Beatriz (fictícia) | `fono.dev@example.test` | profissional sem papel ativo |
| Coordenação | Coordenação (fictícia) | `coordenacao.dev@example.test` | cadastra estudantes, vincula pessoas, painel da escola |
| Administração geral | Administração Geral (fictícia) | `admin.dev@example.test` | painel administrativo completo |

Contas que só aparecem no painel administrativo, para mostrar os estados de acesso:

| Nome | E-mail | Situação |
|---|---|---|
| Lúcia (fictícia) | `docente3.dev@example.test` | suspensa |
| Ricardo (fictício) | `terapeuta.dev@example.test` | acesso expirado |
| Henrique (fictício) | `externo.dev@example.test` | aguardando aprovação (Centro Terapêutico Horizonte, fictício) |
| Joana (fictícia) | `convidada.dev@example.test` | convite pendente |

## 9. Scripts disponíveis

| Comando | O que faz |
|---|---|
| `npm run dev` | Vite dev server do app |
| `npm run build` | Typecheck + build do app |
| `npm test` | Todos os testes (motor + funções + políticas + web) |
| `npm run test:motor` | 44 testes do motor |
| `npm test -w packages/funcoes` | 74 testes dos casos de uso e da camada HTTP das Edge Functions |
| `npm run test:web` | 172 testes do app (inclui axe-core, autenticação por perfil e o contrato do `supabaseApi`) |
| `npm test -w packages/politicas` | 133 testes das políticas RLS e RPCs no PGlite (+13 que só rodam com `DATABASE_URL`/Supabase real, no CI) |
| `npm run test:e2e` | 20 testes ponta a ponta (Playwright, 390 e 1280 px, axe com contraste real) |
| `npm run lint` | ESLint no monorepo (typescript-eslint, react-hooks, jsx-a11y) |
| `npm run format` / `format:check` | Prettier (configurado; reformatação em massa ainda não aplicada) |
| `node scripts/sondar-rls.mjs` | Evidência histórica: 31 ataques contra as policies de `0002` (25 passavam) |
| `npm run test:coverage` | Cobertura de motor, funções e web (limite de 70 %) |
| `npm run typecheck` | `tsc --noEmit` em todos os workspaces |
| `npm run contraste` | Verifica as razões de contraste dos tokens |
| `npm run db:validar` | Migrations + seed num Postgres real (PGlite) |
| `npm run db:push` / `db:reset` | Supabase CLI no projeto linkado |

## 10. Critérios de acessibilidade implementados

- HTML semântico: um `h1` por tela, níveis sem salto, landmarks `header/nav/main/footer`, skip link.
- Teclado: tudo operável; foco visível (anel 3 px); ordem lógica; modais `<dialog>` com Esc e retorno de foco; foco no `h1` a cada rota; sem armadilhas.
- Formulários: `label` em todo campo; dica e erro via `aria-describedby`; `aria-invalid`; resumo de erros focável com links; validação no envio; confirmação em ações irreversíveis.
- Estados: carregando (`role=status`), vazio (título + próximo passo), sucesso (toast + `aria-live`), erro (mensagem simples + tentar novamente), negado (motivo + saída).
- Cor e contraste: paleta verificada numericamente (≥ 4,5:1 texto, ≥ 3:1 componentes); tema de alto contraste (≥ 9:1); nada só por cor.
- Texto: 16 px base, `rem`, preferências 19/22 px, zoom até 400 %, linguagem simples com rótulos leigos.
- Layout: mobile-first, reflow em 320 px, alvos ≥ 44 px, `prefers-reduced-motion`.
- ARIA mínima: só onde o HTML nativo não basta.
- Material adaptado: contraste do perfil (4,5 ou 7), blocos e etapas como listas, `lang`, impressão.
- Detalhes por componente: `docs/acessibilidade.md`.

## 11. WCAG 2.2 AA abordada

Matriz completa em `docs/wcag-2.2.md` (48 critérios aplicáveis; 39 verificados,
9 pendentes de verificação manual — nenhum pendente de implementação).
Destaques: 1.4.3/1.4.11 (contraste), 1.4.10 (reflow), 2.4.7/2.4.11/2.4.13 (foco),
2.5.8 (alvo 44 px), 3.3.1–3.3.4 (erros e prevenção), 3.3.8 (autenticação acessível),
4.1.3 (mensagens de status), 2.5.7 (sem arrastar).
Testes automáticos com axe-core em todas as telas; sessão manual com NVDA planejada (P6.7).

## 12. Decisões de UX/UI

Arquitetura da informação, fluxo (Mermaid), documento de telas e design system
em `docs/ux-ui.md`. Avaliação heurística (Nielsen) em `docs/avaliacao-heuristica.md`:
1 problema crítico e 5 relevantes encontrados e corrigidos; nenhum ≥ 3 aberto.
Decisões de projeto D-01…D-46 em `docs/requisitos.md` §1; reformulação (auditoria, fluxos, ADRs, plano) em `docs/reformulacao/`.

## 13. Estratégia de testes

| Camada | Ferramenta | Cobertura |
|---|---|---|
| Motor (regras puras) | Vitest | 42 testes (RN03 em todas as dimensões, ciclos, âncora, adaptador, apoios de leitura, cenário A) |
| **Políticas RLS e RPCs (banco)** | Vitest + PGlite / Postgres do Supabase no CI | **113 testes** (+12 HTTP/contrato só no CI) — cada sonda da auditoria de 07/10 vira teste negado; testes de mutação confirmam que detectam regressão |
| Camada de serviços (permissões) | Vitest | 38 cenários negativos no mock, alinhados às políticas v3 |
| Componentes | Testing Library + axe-core | 10 testes (rótulos, erros, teclado, modal, material) |
| Telas | Testing Library + axe-core (MemoryRouter) | 17 testes: fluxo principal, validação, vazio, 404, caminhos negados |
| Autenticação e rotas por perfil | Testing Library + axe-core | 7 testes: login família/saúde/coordenação, navegação condicional, volta à origem, logout, falha de autenticação |
| Casos de uso das Edge Functions (`packages/funcoes`) | Vitest | 31 testes |
| E2E em navegador real | Playwright + axe com contraste renderizado | 20 testes (10 cenários × 390/1280 px) |
| Migrations | PGlite | `npm run db:validar` |
| Planejado | Playwright 375×812 + axe, NVDA, SUS, Flesch | `docs/plano-de-testes.md` |

Documentação: `docs/plano-de-testes.md` (49 casos funcionais, 10 integrações, roteiro de usabilidade, checklist de acessibilidade com 26 itens). Cobertura mínima de 70 % obrigatória no CI nos dois workspaces.

Mapa artefato do TCC → código:

| Artefato | Arquivo |
|---|---|
| Diagrama de classes | `supabase/migrations/0001_core_schema.sql`, `apps/web/src/services/tipos.ts` |
| Matriz de permissões v2 | `supabase/migrations/0002_rls_policies.sql`, `apps/web/src/services/mockApi.ts` |
| Quadro 5 (regras) | `packages/motor-adaptacao/src/regras.ts` |
| Diagrama de sequência | `mockApi.gerarMaterial` (mensagens 2–11) e `aprovarMaterial` (14–17); Edge Function em P3.4–P3.8 |
| Diagrama de casos de uso | `apps/web/src/routes/index.tsx` + `docs/ux-ui.md` §1 |

## 14. Limitações atuais

- **App ainda usa o mock.** As políticas v3 (`0003`–`0005`) estão provadas no banco (71 testes), mas Supabase Auth, Edge Functions e `supabaseApi` vêm nos marcos R2–R3 (`docs/reformulacao/PLANO.md`). A máquina da dupla não roda Docker: o Supabase real só roda no CI.
- **IA desligada.** Vocabulário e âncora de interesse não são aplicados (RF10, Fase 5).
- **PWA parcial.** Manifest presente; service worker e cache offline em P5.6.
- **Verificação manual pendente:** NVDA/VoiceOver, zoom 400 % em dispositivo, compatibilidade de navegadores, validador W3C.
- **Sem usuários reais ainda:** SUS, tempo de tarefa e Flesch dependem do piloto (Fase 6).
- `npm audit` reporta vulnerabilidades em dependências de desenvolvimento (esbuild dev server, vitest mocker, react-router); não afetam o build de produção; acompanhar.
- Dados persistem no `localStorage` do navegador — "Restaurar dados" na Ajuda limpa.

## 15. Próximos passos

Ordem do `CLAUDE.md` (schema/RLS → motor → Edge Functions → frontend):

1. **Fase 0 (restante):** proteger `main`/`development`, adicionar Jean, P0.4 projeto Supabase dev, P0.6 Kanban (ações A-01…A-05 de `docs/relatorio-de-conformidade.md` §16).
2. **Fase 1:** migration `0004` (D-01…D-14) + testes RLS negativos (reaproveitar os 34 cenários de `mockApi.test.ts`).
3. **Fase 3:** Edge Functions (`fechar-ciclo`, `gerar-material`, ciclo de vida).
4. **Fase 4:** `supabaseApi` implementando `PeiVivoApi`; login real; Playwright golden path + caminhos negados; NVDA.
5. **Fase 5:** IA real com fallback; offline; Flesch.
6. **Fase 6/7:** piloto, métricas (`docs/resultados.md`), defesa.

Plano completo: `docs/plano-desenvolvimento.md`. Rastreabilidade: `docs/rastreabilidade.md`. Fluxo de branches: `CONTRIBUTING.md`. Passo a passo de uso: `docs/guia-de-uso.md`.

## Documentação

| Documento | Conteúdo |
|---|---|
| `docs/guia-de-uso.md` | Passo a passo do zero ao ciclo completo, por perfil |
| `docs/validacao-da-ideia.md` | Diagnóstico, problema/solução, personas, hipóteses e métodos de validação |
| `docs/requisitos.md` | Decisões D-01…D-18, requisitos por perfil, HU-*, matriz v2, MVP e MoSCoW (§11) |
| `docs/acessibilidade.md` | Diretrizes e tabela por componente |
| `docs/wcag-2.2.md` | Matriz de conformidade AA |
| `docs/avaliacao-heuristica.md` | 10 heurísticas de Nielsen, severidade, status |
| `docs/ux-ui.md` | Arquitetura da informação, fluxo, telas, design system |
| `docs/plano-de-testes.md` | Funcionais, usabilidade, acessibilidade, compatibilidade |
| `docs/prompt-design-ia.md` | Prompt estruturado para gerar/estender a interface com IA |
| `docs/plano-desenvolvimento.md` | Fases, cards, marcos, riscos |
| `docs/rastreabilidade.md` | RF · Motivação · Decisão · Teste · Commit |
| `docs/matriz-rastreabilidade.md` | Requisito → tela → arquivos → teste → status |
| `docs/guia-de-uso-do-sistema.md` | Guia não técnico por perfil + roteiro de 10 min para a banca |
| `docs/diagnostico-inicial.md` | Auditoria de 21/09/2026: inventário, problemas, lacunas, suposições |
| `docs/qualidade-iso-25010.md` | Avaliação de qualidade do produto (referência ISO/IEC 25010) |
| `docs/bpmn-processos.md` | 10 processos em BPMN (Mermaid) |
| `docs/pdca.md` | Ciclos de melhoria contínua por marco |
| `docs/itil-servicos.md` | Catálogo de serviços, incidentes, requisições, base de conhecimento |
| `docs/cobit-governanca.md` | Objetivos, indicadores, controles, RACI |
| `docs/gestao-de-riscos.md` | 17 riscos com probabilidade × impacto e resposta |
| `docs/seguranca-e-privacidade.md` | Dados tratados, LGPD, senhas, segredos, retenção, incidentes |
| `docs/checklist-final-tcc.md` | Evidências por pilar para a banca |
| `docs/relatorio-de-conformidade.md` | Relatório final da auditoria + plano de ação |
| `docs/tcc/` | Pré-projeto, slides, diagramas, orientação da disciplina |
