# Diagnóstico Inicial

**Versão:** 1.0 — 21/09/2026 · **Objeto:** repositório `geandreac/tcc-peivivo`, branch `development` em `ef0c515` · **Método:** leitura integral do código, documentação, configuração Git/CI e imagens de referência; execução de `npm test`, `npm run test:coverage`; consulta à API pública do GitHub (proteção de branch, execuções do CI, contribuidores).
**Metodologia de referência:** três pilares — Engenharia e Configuração; Qualidade e Processos; Governança e Serviços (enunciado da disciplina; ver *Suposições*, S-01).

---

## Resumo do Projeto

PEI Vivo é o TCC de Sistemas de Informação (CEUNI FAMETRO, 2026) de Geandre Alfaia Colares e Jean Victor Torres dos Santos, orientadora Luana Leal. É uma plataforma que liga escola, família e equipe de saúde num ciclo **observar → validar → adaptar → retroalimentar**, produzindo material didático adaptado ao perfil evolutivo de estudantes com TEA, TDAH e dislexia — sem armazenar laudo nem diagnóstico (D-01).

Estado em 21/09/2026: **protótipo funcional em código** (`apps/web`, React + Vite + TypeScript) rodando sobre uma camada de serviços simulada (`mockApi`) que aplica a matriz de permissões v2; **motor de adaptação** puro e testado (`packages/motor-adaptacao`); **schema e políticas RLS** escritas e validadas em Postgres (PGlite e Supabase no CI), mas **sem backend em produção** (Supabase Auth, Edge Functions e migration `0004` pendentes). A documentação de UX, acessibilidade, WCAG, heurísticas, requisitos e plano é extensa e coerente com o código.

## Tecnologias Identificadas

| Camada | Tecnologia | Versão / evidência |
|---|---|---|
| Linguagem | TypeScript estrito | `tsconfig.base.json`; `typescript ^5.5` |
| Monorepo | npm workspaces (`packages/*`, `apps/*`) | `package.json` raiz; Node ≥ 20 |
| Front-end | React 18.3, Vite 5.4, react-router-dom 6.26 | `apps/web/package.json` |
| Estilo | CSS puro com design tokens (sem Tailwind, sem web fonts) | `apps/web/src/styles/tokens.css`, D-15 |
| Motor | `@pei-vivo/motor-adaptacao` (TS puro, sem I/O) | `packages/motor-adaptacao/src/` |
| Banco | Supabase (Postgres + RLS + Auth + Edge Functions) — só migrations e seed | `supabase/migrations/0001`, `0002`; `seed.sql` fictício |
| Validação local do banco | PGlite (Postgres em WASM) | `scripts/validar-migrations.mjs` |
| Testes | Vitest 2, Testing Library, user-event, axe-core 4.10, jsdom 25, cobertura v8 | `apps/web/vite.config.ts`, `packages/motor-adaptacao/vitest.config.ts` |
| CI | GitHub Actions — jobs `motor`, `db`, `web`; workflow de ping do Supabase | `.github/workflows/ci.yml`, `manter-supabase-ativo.yml` |
| Scripts | `contraste.mjs` (razões de contraste), `criar-kanban.sh` (issues + Project) | `scripts/` |
| Não presentes | ESLint/Prettier, Playwright, PWA (service worker), `supabaseApi`, Edge Functions, `.env` real | — |

## Estrutura Atual

```
pei-vivo/
├── apps/web/src/
│   ├── routes/        index.tsx (22 rotas incl. 404), RotaProtegida.tsx
│   ├── layouts/       Layout.tsx (skip link, header/nav/main/footer, toasts, Sair)
│   ├── pages/         22 componentes de página + paginas.test.tsx + autenticacao.test.tsx (novo)
│   ├── components/    Botao, Campo, Escala3, Modal, Feedback, MaterialAdaptado, Toasts, CabecalhoEstudante + teste
│   ├── hooks/         useSessao, useConsulta/useMutacao, useAnuncio, usePreferencias, useTitulo, useEstudante
│   ├── services/      api.ts (contrato PeiVivoApi), erros.ts, tipos.ts, mockApi.ts (737 linhas) + 34 testes negativos
│   ├── mocks/         dados.ts (cenário fictício "Miguel")
│   ├── utils/         rotulos.ts, perfisLogin.ts, datas.ts
│   ├── styles/        tokens · base · componentes · print
│   └── test/          setup.ts, utils.tsx (renderizarApp, semViolacoesAxe)
├── packages/motor-adaptacao/src/  regras · ciclos · ancora · adaptador · tipos (+ 30 testes)
├── supabase/          migrations 0001 (10 tabelas), 0002 (18 policies), seed.sql, config.toml
├── scripts/           validar-migrations.mjs, contraste.mjs, criar-kanban.sh, _cards.json
├── docs/              13 documentos + docs/tcc/ (pré-projeto, diagramas, orientação)
├── .github/           ci.yml, manter-supabase-ativo.yml, pull_request_template.md
├── CLAUDE.md · CONTRIBUTING.md · README.md · .env.example (novo) · .gitignore · .gitattributes
```

A estrutura já corresponde à proposta da disciplina (`components/ pages/ layouts/ routes/ services/ hooks/ mocks/ utils/ styles/`); `contexts/` está implementado dentro de `hooks/` (`SessaoProvider`, `AnuncioProvider`) e `assets/` está vazio (logo em `public/`). **Nenhuma refatoração estrutural é necessária.**

## Funcionalidades Implementadas

| Área | Evidência | Estado |
|---|---|---|
| Porta de entrada + login por perfil (Família, Professores, Equipe de saúde, Coordenação) | `pages/Entrar.tsx`, `EntrarPapel.tsx`, `utils/perfisLogin.ts`; rotas `/entrar/:slug` | ✅ modo demonstração (sem senha, D-16) |
| Sessão, proteção de rotas, redirecionamento de volta à origem, logout | `hooks/useSessao.tsx`, `routes/RotaProtegida.tsx`, `Layout.tsx` (`aoSair`) | ✅ testado (`autenticacao.test.tsx`) |
| Dashboard único com ação principal por papel | `pages/Painel.tsx` (`ACAO_PRINCIPAL`) | ✅ |
| Controle de acesso por perfil na camada de serviços (matriz v2, RN01–RN08) | `services/mockApi.ts` (`exigirPapel`, `exigirConsentimento`, `exigirLeitura`) | ✅ 34 testes negativos |
| Cadastro de estudante e vínculos (coordenação) | `CadastrarEstudante.tsx`, `Vinculos.tsx` | ✅ |
| Consentimento granular, revogável, com auditoria | `Consentimento.tsx` | ✅ |
| Observação em 6 dimensões, fechamento de ciclo com diff (RN03/RN06), validação clínica (RN05/RN07), pendências | `Observar.tsx`, `FecharCiclo.tsx`, `ValidarParametros.tsx`, `Pendencias.tsx` | ✅ |
| Geração determinística, revisão lado a lado, aprovação (RN04), material acessível + impressão, desfecho | `GerarMaterial.tsx`, `RevisarMaterial.tsx`, `MaterialFinal.tsx`, `Desfecho.tsx`, `adaptador.ts` | ✅ |
| Nota clínica reservada (RN02) | `NotasClinicas.tsx`, mock | ✅ negado ao docente por rota direta |
| Histórico, exportação/exclusão LGPD | `Historico.tsx`, `DadosLgpd.tsx` | ✅ |
| Ajuda, Acessibilidade (preferências), 404 | `Ajuda.tsx`, `Acessibilidade.tsx`, `NaoEncontrada.tsx` | ✅ |
| Estados carregando / vazio / sucesso / erro / negado | `useConsulta`, `Feedback.tsx`; simulador de falha na Ajuda | ✅ |
| Schema + RLS | `0001_core_schema.sql` (10 tabelas), `0002_rls_policies.sql` (18 policies) | ✅ validados em Postgres; não aplicados em projeto cloud |
| CI | 3 jobs; última execução em `development` **verde** (15/09/2026) | ✅ |

## Funcionalidades Pendentes

| Item | Card / fase | Impacto para a banca |
|---|---|---|
| Migration `0004` (D-01…D-14) e testes RLS negativos reais | Fase 1 (P1.1–P1.19) | Alto — prova de "403 com token válido" |
| Edge Functions `fechar-ciclo`, `gerar-material`, ciclo de vida | Fase 3 | Alto |
| `supabaseApi` + Supabase Auth (login real por e-mail/senha, recuperação de senha) | P4.4 | Alto — hoje não há senha nem recuperação |
| Projeto Supabase dev (P0.4) e secrets do CI (ping está `skipped`) | P0.4 | Médio |
| Kanban no GitHub (P0.6) e proteção de branches (P0.1) | Fase 0 | Médio — evidência de processo |
| Playwright (golden path 375 px, caminhos negados, axe com contraste real) | P4.19/P4.20 | Médio |
| Sessão manual NVDA/VoiceOver, zoom 400 % em dispositivo, validador W3C | P6.7 | Médio — fecha 9 critérios 🟡 da WCAG |
| Camada de IA (RF10), PWA offline (RNF05/06), Flesch | Fase 5 | Baixo (Could) |
| Piloto com usuários (SUS, tempos) | Fase 6 | Médio — métricas quantitativas |
| ESLint/Prettier | — | Baixo |

## Pontos Fortes

1. **Permissão no dado, não na tela** (D-17): nenhuma página decide permissão; o mock nega o que o RLS negará e cada bloco de teste começa pelo caminho negado.
2. **Acessibilidade estrutural**: HTML semântico, skip link, `<dialog>` nativo, `aria-live` global, resumo de erros focável, tokens verificados numericamente, tema de alto contraste, alvos de 44 px, `prefers-reduced-motion`; axe-core em todas as telas e componentes.
3. **Documentação madura e rastreável**: 18 decisões `D-nn`, HU por perfil, MoSCoW, matriz de permissões, plano de 12 semanas com cards, rastreabilidade com hashes, WCAG por critério, heurísticas com severidade.
4. **Motor determinístico isolado** (sem rede, sem banco), 97 % de cobertura, RN03 assimétrica coberta.
5. **CI de três frentes** já verde, migrations validadas em Postgres real no runner.
6. **Sem segredos no repositório**: grep por `apikey|secret|password|token` só encontra referências a `secrets.*` do GitHub e `env(...)` no `config.toml`; `.env*` ignorado.
7. **Dados 100 % fictícios**, declarados no topo de `seed.sql` e `mocks/dados.ts`, e no rodapé de todas as telas.

## Problemas Técnicos Identificados

| # | Problema | Evidência | Severidade | Ação |
|---|---|---|---|---|
| T-01 | `main` sem proteção de branch | API GitHub: `"protected": false` | Alta (governança) | Configurar ruleset (CONTRIBUTING §Proteção) |
| T-02 | Nenhum Pull Request no histórico; 12 commits diretos, todos de um integrante | API GitHub: 0 PRs; contributors = `geandreac` (11) | Alta (processo colaborativo) | A partir de agora tudo via PR; primeiro PR de Jean |
| T-03 | Cobertura mínima só no motor; `apps/web` sem threshold | `apps/web/vite.config.ts` (antes) | Média | **Corrigido:** thresholds 70/70/70/60 (medido 78/81/80/78) |
| T-04 | Login testado só para o perfil docente; logout, volta à origem e falha de autenticação sem teste | `paginas.test.tsx` | Média | **Corrigido:** `autenticacao.test.tsx` (7 testes) |
| T-05 | `.env.example` referenciado no `.gitignore` mas inexistente | `ls -a` | Baixa | **Corrigido:** criado com placeholders e aviso "não lido ainda" |
| T-06 | Sem ESLint/Prettier; há `eslint-disable` órfão em `useConsulta.ts` | `package.json` | Baixa | Planejar `chore: adiciona eslint` (plano de ação A-12) |
| T-07 | Sessão da demonstração persiste em `localStorage` sem expiração | `mockApi.ts` (`CHAVE_SESSAO`) | Baixa (demo) | Aceito no modo demo; Supabase Auth traz expiração (P4.4); documentado em `docs/seguranca-e-privacidade.md` |
| T-08 | `npm audit` reporta vulnerabilidades em dependências de desenvolvimento (esbuild, vitest, react-router) | README §14 | Baixa | Acompanhar; não afetam o build |
| T-09 | Toasts usam `setTimeout` sem limpeza no unmount | `useAnuncio.tsx` | Cosmética | Backlog |
| T-10 | Avisos `act(...)` no console dos testes de tela | saída do Vitest | Cosmética | Backlog (não afetam resultado) |
| T-11 | Perfil "Coordenação" existe além dos 3 perfis do enunciado | `perfisLogin.ts` | — | Mantido e justificado (D-08: só a coordenação cadastra; suposição S-03) |

## Lacunas de Documentação

| Documento exigido pela metodologia | Situação antes | Situação após esta auditoria |
|---|---|---|
| `docs/diagnostico-inicial.md` | inexistente | **criado** (este) |
| `CONTRIBUTING.md` com 12 seções, Conventional Commits, padrão `feature/<autor>-…` | parcial (v1.0: 5 seções, commits `P4.3: …`) | **reescrito** (v2.0) |
| `docs/matriz-rastreabilidade.md` (RF → tela → arquivos → teste → status) | só `docs/rastreabilidade.md` (formato da disciplina, sem coluna de tela/arquivo) | **criado** |
| `docs/qualidade-iso-25010.md` | inexistente | **criado** |
| `docs/plano-de-testes.md` com objetivo/escopo/critérios de entrada e saída/integração | parcial (funcionais, usabilidade, acessibilidade, compatibilidade) | **atualizado** (v1.1) |
| `docs/bpmn-processos.md` | inexistente (só fluxo de navegação em Mermaid em `ux-ui.md`) | **criado** |
| `docs/pdca.md` | inexistente | **criado** |
| `docs/itil-servicos.md` | inexistente | **criado** |
| `docs/cobit-governanca.md` | inexistente | **criado** |
| `docs/gestao-de-riscos.md` | parcial (riscos em `plano-desenvolvimento.md` §11 e pré-projeto §10) | **criado** (consolidado com probabilidade × impacto) |
| `docs/seguranca-e-privacidade.md` | disperso (D-01, D-05, D-06, D-11, README) | **criado** |
| `docs/acessibilidade.md` | completo | **atualizado** (§0: mapa dos requisitos mínimos) |
| `docs/wcag-2.2.md` | completo | **atualizado** (v1.1: métodos, evidência de teste) |
| `docs/avaliacao-heuristica.md` | completo (rodada 1) | **atualizado** (rodada 2 sobre as telas de login por perfil; coluna "Ação aplicada") |
| `docs/guia-de-uso-do-sistema.md` (não técnico) | só `docs/guia-de-uso.md` (técnico, para a dupla) | **criado** |
| `docs/checklist-final-tcc.md` | inexistente | **criado** |
| `docs/relatorio-de-conformidade.md` | inexistente | **criado** |

## Lacunas de Qualidade e Testes

- Testes de **integração contra backend real** (RLS, Edge Functions) inexistem porque o backend não existe; os 34 cenários do mock são a especificação (P1.11–P1.19).
- **Testes E2E em navegador** (Playwright) não existem; reflow, contraste renderizado e `target-size` só têm verificação por CSS/numérica.
- **Testes de usabilidade** com participantes não foram executados (roteiro pronto em `plano-de-testes.md` §2).
- **Verificação manual com leitor de tela** pendente (9 critérios WCAG 🟡).
- Cobertura web (78 %) sem threshold — corrigido nesta auditoria.
- Sem lint automatizado.

## Lacunas de Governança

- Proteção de `main`/`development` não configurada; sem regra de revisão obrigatória no GitHub (só em texto).
- Sem PRs, sem Kanban populado, sem tags/releases — o processo está documentado mas **não evidenciado**.
- Sem catálogo de serviços, gestão de incidentes/requisições, indicadores com metas, controles e registro de riscos consolidado — criados nesta auditoria.
- Sem política escrita de segurança/privacidade (LGPD) — criada.
- Secrets do CI (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) não configurados (workflow `skipped`).

## Suposições Adotadas

| ID | Suposição | Motivo | Impacto se falsa |
|---|---|---|---|
| S-01 | A imagem `image.png` mencionada no enunciado não está no repositório; os três pilares da metodologia foram tomados do texto do enunciado. As imagens existentes (`docs/tcc/orientacao.jpeg` — orientação de IA/UX/acessibilidade; logotipo; ODS) foram analisadas. | `find -iname image.png` sem resultado | Baixo — os pilares estão descritos por extenso no enunciado |
| S-02 | O Kanban do GitHub (P0.6) **não** foi criado e Jean **não** é colaborador do repositório | plano §12 marca P0.6 ⏳; API pública não expõe Projects/colaboradores; `gh` não autenticado | Médio — se existir, o checklist final muda de "não conforme" para "conforme" em 2 itens |
| S-03 | O quarto perfil (Coordenação) é mantido além dos três do enunciado (Familiares, Professores, Terapeutas = Equipe de saúde) | D-08: só a coordenação cadastra estudante e cria vínculos; sem ela o sistema não tem bootstrap | Baixo — pode ser apresentado como "perfil institucional" |
| S-04 | "Recuperação de senha" e "credenciais inválidas" não se aplicam ao modo demonstração (sem senha); são requisitos do login real (P4.4) | D-16 | Nenhum — registrados como *planejado* |
| S-05 | O projeto Supabase de desenvolvimento (P0.4) não existe ainda | workflow de ping `skipped` (var `SUPABASE_PING_ATIVO` ausente) | Baixo |
| S-06 | As datas do plano (defesa em dezembro/2026, freeze 26/11) continuam válidas | `plano-desenvolvimento.md` | Médio — o plano de ação prioriza por essas datas |
| S-07 | Os testes de usabilidade e a sessão NVDA serão conduzidos pela dupla, sem laboratório | plano §8 | Baixo |

## Riscos Iniciais

Registro completo em `docs/gestao-de-riscos.md`. Os cinco mais relevantes hoje:

| ID | Risco | Nível |
|---|---|---|
| R-03 | Atraso no cronograma: Fases 1 e 3 (backend) ainda não começaram na S2 do plano | **Alto** |
| R-11 | Falha de comunicação/colaboração: um único integrante com commits | **Alto** |
| R-13 | Falta de evidências de processo para a banca (PRs, Kanban, proteção de branch) | **Alto** |
| R-04 | Falta de testes contra o backend real (RLS) — a prova central de RF14 é só no mock | Médio |
| R-08 | Baixa acessibilidade não detectada por ferramenta (sem NVDA) | Médio |

## Plano Resumido de Correção

| Ordem | Ação | Feito nesta auditoria? |
|---|---|---|
| 1 | Criar a documentação de governança/qualidade/processo exigida (12 documentos) | ✅ |
| 2 | Reescrever `CONTRIBUTING.md` (branches, Conventional Commits, divisão, checklist) | ✅ |
| 3 | Testes de autenticação e rotas por perfil (família, saúde, coordenação, logout, origem, falha) | ✅ 7 testes |
| 4 | Threshold de cobertura em `apps/web` no CI | ✅ |
| 5 | `.env.example` e template de PR atualizado | ✅ |
| 6 | Proteger `main` e `development` no GitHub; adicionar Jean; criar Kanban (`scripts/criar-kanban.sh`) | ⬜ exige login no GitHub (dupla) |
| 7 | Abrir o primeiro PR (esta auditoria) de `docs/governanca-e-processos` → `development`, revisado por Jean | ⬜ dupla |
| 8 | Fase 1: migration `0004` + testes RLS negativos | ⬜ plano |
| 9 | Fase 3/4: Edge Functions, `supabaseApi`, Supabase Auth (login real, recuperação de senha) | ⬜ plano |
| 10 | Playwright + sessão NVDA + piloto (evidências manuais) | ⬜ plano |

Relatório consolidado: `docs/relatorio-de-conformidade.md`. Checklist para a banca: `docs/checklist-final-tcc.md`.
