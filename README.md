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
│   ├── public/                    # favicon.svg, manifest.webmanifest, logo-pei-vivo.png
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
├── supabase/                      # migrations 0001 (schema) e 0002 (RLS), seed fictício, config
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

## 9. Scripts disponíveis

| Comando | O que faz |
|---|---|
| `npm run dev` | Vite dev server do app |
| `npm run build` | Typecheck + build do app |
| `npm test` | Todos os testes (motor + web) |
| `npm run test:motor` | 30 testes do motor |
| `npm run test:web` | 61 testes do app (inclui axe-core) |
| `npm run test:coverage` | Cobertura de motor e web |
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
Decisões de projeto D-01…D-18 em `docs/requisitos.md` §1.

## 13. Estratégia de testes

| Camada | Ferramenta | Cobertura |
|---|---|---|
| Motor (regras puras) | Vitest | 30 testes, 97 % (RN03, ciclos, âncora, adaptador, cenário A) |
| Camada de serviços (permissões) | Vitest | 34 cenários negativos — cada um começa pelo acesso NEGADO |
| Componentes | Testing Library + axe-core | 10 testes (rótulos, erros, teclado, modal, material) |
| Telas | Testing Library + axe-core (MemoryRouter) | 15 testes: fluxo principal, validação, vazio, 404, caminhos negados |
| Migrations | PGlite | `npm run db:validar` |
| Planejado | Playwright 375×812 + axe, NVDA, SUS, Flesch | `docs/plano-de-testes.md` |

Documentação: `docs/plano-de-testes.md` (40 casos funcionais, roteiro de usabilidade, checklist de acessibilidade com 26 itens).

Mapa artefato do TCC → código:

| Artefato | Arquivo |
|---|---|
| Diagrama de classes | `supabase/migrations/0001_core_schema.sql`, `apps/web/src/services/tipos.ts` |
| Matriz de permissões v2 | `supabase/migrations/0002_rls_policies.sql`, `apps/web/src/services/mockApi.ts` |
| Quadro 5 (regras) | `packages/motor-adaptacao/src/regras.ts` |
| Diagrama de sequência | `mockApi.gerarMaterial` (mensagens 2–11) e `aprovarMaterial` (14–17); Edge Function em P3.4–P3.8 |
| Diagrama de casos de uso | `apps/web/src/routes/index.tsx` + `docs/ux-ui.md` §1 |

## 14. Limitações atuais

- **Backend é mock.** Supabase Auth, Edge Functions e migration `0004` (D-01…D-14) ainda não existem; o mock reproduz a matriz de permissões, mas a prova "403 com token válido" só vem com PostgREST (P1.11–P1.19).
- **IA desligada.** Vocabulário e âncora de interesse não são aplicados (RF10, Fase 5).
- **PWA parcial.** Manifest presente; service worker e cache offline em P5.6.
- **Verificação manual pendente:** NVDA/VoiceOver, zoom 400 % em dispositivo, compatibilidade de navegadores, validador W3C.
- **Sem usuários reais ainda:** SUS, tempo de tarefa e Flesch dependem do piloto (Fase 6).
- `npm audit` reporta vulnerabilidades em dependências de desenvolvimento (esbuild dev server, vitest mocker, react-router); não afetam o build de produção; acompanhar.
- Dados persistem no `localStorage` do navegador — "Restaurar dados" na Ajuda limpa.

## 15. Próximos passos

Ordem do `CLAUDE.md` (schema/RLS → motor → Edge Functions → frontend):

1. **Fase 0 (restante):** P0.1 repositório no GitHub, P0.4 projeto Supabase dev, P0.6 Kanban.
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
| `docs/tcc/` | Pré-projeto, slides, diagramas, orientação da disciplina |
