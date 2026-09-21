# PDCA — melhoria contínua no desenvolvimento do PEI Vivo

**Versão:** 1.0 — 21/09/2026 · **Pilar:** Qualidade e Processos.
**Unidade do ciclo:** um **marco** do plano (M0…M6, `docs/plano-desenvolvimento.md` §1) — cada marco é uma volta completa do PDCA; dentro dele, cada card/PR é um mini-ciclo. Checkpoint semanal da dupla (terça) e checkpoint com a orientadora ao fim de cada marco.

---

## 1. Matriz PDCA

| Etapa | Ações no Projeto | Responsável | Evidências | Indicadores | Frequência |
|---|---|---|---|---|---|
| **Plan** | Identificar problema; definir escopo; requisitos; priorizar MVP; planejar sprints; definir indicadores; planejar testes; identificar riscos | Ambos (Geandre consolida) | `docs/validacao-da-ideia.md`, `docs/requisitos.md` (D-nn, HU, MoSCoW §11), `docs/plano-desenvolvimento.md` (cards, marcos), `docs/plano-de-testes.md` §0, `docs/gestao-de-riscos.md`, `docs/cobit-governanca.md` §2 | Nº de RF com critério de aceite (16/16); nº de cards com DoD (todos); riscos com plano (14) | Início de cada fase; revisão a cada marco |
| **Do** | Criar branch por card; implementar; criar telas/serviços/migrations; escrever testes junto; registrar evidência (teste nomeado, linha de rastreabilidade) | Quem pegou o card (divisão em `CONTRIBUTING.md` §11) | Branches `feature/<autor>-…`, commits Conventional, PRs para `development`, `docs/rastreabilidade.md` (hash), `docs/matriz-rastreabilidade.md` | PRs abertos/mesclados por semana; WIP ≤ 2 por pessoa; cobertura ≥ 70 % | Contínua; checkpoint semanal |
| **Check** | Revisar PR (o outro integrante); rodar CI (`motor`, `db`, `web`); validar critérios de aceite; auditar acessibilidade (axe + teclado); avaliar métricas; registrar defeitos e desvios | Revisor cruzado; CI | Aprovação no PR; execução verde do CI; `semViolacoesAxe`; `docs/avaliacao-heuristica.md`; checklist §3.2 do plano de testes; issues de defeito | % PRs revisados pelo outro (meta 100 %); falhas de CI por semana; violações axe (meta 0); itens sev. ≥ 3 abertos (meta 0); critérios WCAG 🟡 | A cada PR; auditoria de acessibilidade a cada marco |
| **Act** | Corrigir falhas; priorizar melhorias no backlog; atualizar documentos (requisitos, decisões D-nn, rastreabilidade); registrar lições aprendidas; promover `development → main` com tag | Ambos; Geandre consolida docs | PR `development → main` (`release: M<n>`), tag `v0.<n>.0`, seção §3 deste arquivo (lições), atualização de `docs/requisitos.md` §1 e `plano-desenvolvimento.md` §12 | Defeitos corrigidos / encontrados; decisões novas registradas; marcos entregues na data | Ao fechar cada marco |

## 2. Detalhamento por etapa

### Plan — Planejar

| Ação | Como é feita no PEI Vivo | Estado |
|---|---|---|
| Identificar problema | PEI estático; sem canal escola-família-saúde; 40 min por adaptação manual (`validacao-da-ideia.md` §1) | ✅ |
| Definir escopo | O que é / o que não é (pré-projeto §3.3); Won't have explícito (§11.3) | ✅ |
| Criar requisitos | RF01–RF16, RNF-A…J, RN01–RN08, HU por perfil, 18 decisões D-nn | ✅ |
| Priorizar MVP | MoSCoW (`requisitos.md` §11.3); IA e offline como incremento | ✅ |
| Planejar sprints | 12 semanas, 7 fases, cards `P<fase>.<n>`, marcos M0–M6 | ✅ (replanejar datas: Fase 1 atrasada — ver §3) |
| Definir indicadores | `cobit-governanca.md` §2 (login, tarefas, tempo, erros, cobertura, acessibilidade, SUS, incidentes) | ✅ (criado 21/09) |
| Planejar testes | `plano-de-testes.md` §0 (objetivo, escopo, critérios) | ✅ |
| Identificar riscos | `gestao-de-riscos.md` (14 riscos com probabilidade × impacto) | ✅ |

### Do — Executar

| Ação | Como | Estado |
|---|---|---|
| Criar branches | `feature/<autor>-<descrição>` a partir de `development` (CONTRIBUTING §2) | 🟡 padrão definido; até 21/09 os commits foram diretos em `development` |
| Implementar funcionalidades | Ordem schema/RLS → motor → Edge Functions → front (CLAUDE.md); front antecipado como protótipo (D-17) | ✅ motor, schema, protótipo; ⬜ EF, `supabaseApi` |
| Criar telas | 22 páginas com estados carregando/vazio/sucesso/erro/negado | ✅ |
| Executar testes iniciais | `npm test` antes do push; CI em cada push/PR | ✅ 98 testes |
| Registrar evidências | Teste nomeado por requisito; hash em `rastreabilidade.md` | ✅ (motor, protótipo) |

### Check — Verificar

| Ação | Como | Estado |
|---|---|---|
| Revisar Pull Requests | Revisão cruzada obrigatória; template com checklist | ⬜ nenhum PR ainda (evidência a produzir a partir desta auditoria) |
| Executar testes | CI: typecheck, Vitest/axe, cobertura, build, contraste, migrations no Supabase | ✅ verde em 15/09 |
| Validar critérios de aceite | Coluna "Critério de aceite" de `requisitos.md` §11.1 ↔ teste nomeado | ✅ |
| Auditar acessibilidade | axe em toda tela; contraste numérico; checklist manual §3.2 | 🟡 automático ✅; manual (NVDA, zoom em dispositivo) ⬜ |
| Avaliar métricas | Cobertura (97 % motor, 78 % web); violações axe 0; itens sev. ≥ 3 abertos 0 | ✅ |
| Identificar defeitos e desvios | Avaliação heurística (17 achados, 8 corrigidos); diagnóstico 21/09 (T-01…T-11) | ✅ |

### Act — Agir corretivamente

| Ação | Como | Estado |
|---|---|---|
| Corrigir falhas | Sev. 3/4 corrigidas no código (6 itens); T-03/T-04/T-05 corrigidos em 21/09 | ✅ |
| Priorizar melhorias | Itens sev. 2 ligados a cards (P4.16, P4.18) ou Could | ✅ |
| Atualizar documentos | Cada decisão vira D-nn; docs de governança criados em 21/09 | ✅ |
| Registrar lições aprendidas | §3 abaixo | ✅ (iniciado) |
| Promover versões estáveis para `main` | PR `development → main` por marco; tag | ⬜ `main` está em `f2372d9`, um commit atrás de `development`; sem tag |

## 3. Registro de ciclos e lições aprendidas

| Ciclo | Período | Plan | Do | Check | Act / lição |
|---|---|---|---|---|---|
| **M0 — Fundação** | 10–16/09 | Repo, CI, migrations, Kanban | Monorepo, migrations 0001/0002, PGlite, CI de 3 jobs, rastreabilidade | CI verde; migrations validadas em Postgres real | **Lição:** sem Docker local, PGlite resolve a validação e o CI cobre o Supabase real — decisão documentada (plano §11). Pendência: GitHub protegido e Kanban ficaram para depois e não voltaram → virou risco R-13 |
| **M2 — Motor** (antecipado) | 10–14/09 | `ciclos`, `ancora`, `adaptador` | 30 testes, 97 % | Cobertura acima do threshold; RN03 assimétrica coberta | **Lição:** implementar o adaptador antes das Edge Functions (D-18) permitiu que o protótipo gerasse material de verdade sem backend |
| **Protótipo (P4.1–P4.18, antecipado)** | 12–15/09 | Substituir Figma por protótipo em código (D-15/D-17) | 22 telas, mock com permissões, 61 testes com axe | Heurística: 1 crítico + 5 relevantes encontrados e corrigidos; 0 violações axe | **Lição:** o mock que **nega** o que o RLS negará permitiu testar caminhos negados antes do banco existir. **Desvio:** a ordem do CLAUDE.md (backend antes do front) foi invertida de forma controlada; a Fase 1 ficou para trás |
| **Auditoria metodológica** | 21/09 | Verificar aderência aos 3 pilares | 12 documentos, CONTRIBUTING v2, 7 testes de autenticação, threshold web, `.env.example` | Diagnóstico: T-01…T-11; governança "não evidenciada" | **Lição:** processo documentado ≠ processo evidenciado. A partir daqui: tudo via PR, `main` protegida, Kanban populado. Replanejar: Fase 1 começa na S3 (24/09), não na S2 |
| M1 — RLS | planejado | 0004 + testes negativos | — | — | — |
| M3 — Fluxo HTTP | planejado | Edge Functions + `supabaseApi` | — | — | — |
| M4 — Interface | planejado | Playwright, NVDA | — | — | — |
| M5 / M6 | planejado | IA, piloto, métricas | — | — | — |

## 4. Como usar este documento

1. Ao **abrir** um marco, copiar a linha "planejado" e preencher *Plan* com os cards.
2. Ao **fechar** um marco, preencher *Check* com os números (testes, cobertura, violações, defeitos) e *Act* com a lição e o que mudou no plano.
3. Toda lição que muda uma regra vira uma linha em `CONTRIBUTING.md` ou uma decisão `D-nn` em `docs/requisitos.md`.
4. A banca pode ler esta tabela como histórico do processo; as evidências são os PRs, tags e execuções do CI apontados.
