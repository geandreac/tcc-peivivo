# Checklist final para a banca — evidências por pilar

**Versão:** 1.0 — 21/09/2026 · Consolida `docs/diagnostico-inicial.md`, `docs/relatorio-de-conformidade.md` e os documentos de cada pilar.
**Status:** ✅ Conforme (implementado e documentado com evidência) · 🟡 Parcialmente conforme (existe, mas com lacuna ou evidência insuficiente) · ❌ Não conforme (não existe ou sem evidência) · N/A não aplicável (justificado).
**Prioridade da pendência:** P1 (antes da próxima entrega à orientadora) · P2 (antes de M4) · P3 (antes da defesa).

---

## Engenharia e Configuração

| Pilar | Item Avaliado | Evidência/Arquivo | Status | Pendência | Responsável | Prioridade |
|---|---|---|---|---|---|---|
| Engenharia | Código organizado por responsabilidade (routes/layouts/pages/components/hooks/services/mocks/utils/styles) | `README.md` §6; `apps/web/src/` | ✅ | — | Geandre | — |
| Engenharia | Arquitetura documentada (camadas, contrato de serviços, troca mock → Supabase) | `README.md` §5–§6, D-15/D-16/D-17 em `docs/requisitos.md`, `docs/tcc/*.svg` | ✅ | ADRs formais são as decisões D-nn (aceito) | Geandre | — |
| Engenharia | Separação apresentação / regras / serviços / dados; baixo acoplamento | `services/api.ts`; motor puro; nenhuma página importa `mockApi` | ✅ | — | — | — |
| Engenharia | Tratamento de erros por código estável + mensagem simples + recuperação | `services/erros.ts`; `Feedback.tsx`; BPMN processo 10 | ✅ | — | — | — |
| Engenharia | Preparação para API REST | `PeiVivoApi`, mapeamento 401/403/404/409/400 | ✅ | `supabaseApi` (P4.4) | Geandre | P2 |
| Configuração | Repositório Git configurado com remoto | <https://github.com/geandreac/tcc-peivivo> | ✅ | — | — | — |
| Configuração | Branches `main` e `development` | `git branch -a`; CI nas duas | ✅ | `main` 1 commit atrás; sem tag | Geandre | P1 |
| Configuração | Proteção de branches | API GitHub: `protected: false` | ❌ | Criar rulesets (CONTRIBUTING, seção final) | Geandre | **P1** |
| Configuração | Estratégia colaborativa (padrão de branch, divisão de trabalho, revisão cruzada) | `CONTRIBUTING.md` v2.0 §2, §11 | ✅ (documentada) | Sem evidência de uso ainda | Ambos | P1 |
| Configuração | Pull Requests com template e revisão | `.github/pull_request_template.md`; API GitHub: 0 PRs | ❌ | Abrir esta auditoria como PR revisado por Jean | Ambos | **P1** |
| Configuração | Histórico de commits (mensagens claras, Conventional Commits) | 12 commits descritivos (`P4.3: …`); padrão Conventional a partir de 21/09 | 🟡 | Aplicar Conventional nos próximos | Ambos | P1 |
| Configuração | Segundo integrante com commits | API GitHub: 1 contribuidor | ❌ | Jean colaborador + primeiro PR | Jean | **P1** |
| Configuração | CI/CD | `.github/workflows/ci.yml` (3 jobs, verde em 15/09) | ✅ | Tornar obrigatório via ruleset | Geandre | P1 |
| Configuração | Kanban / gestão de cards | `scripts/criar-kanban.sh`, `scripts/_cards.json` | ❌ (não executado — S-02) | Executar o script | Geandre | P1 |
| Configuração | Rastreabilidade de requisitos | `docs/rastreabilidade.md` (formato da disciplina) + `docs/matriz-rastreabilidade.md` (RF → tela → arquivo → teste) | ✅ | Atualizar hashes a cada PR | Ambos | — |
| Configuração | README completo | `README.md` (15 seções + documentação) | ✅ | — | — | — |
| Configuração | CONTRIBUTING (12 seções) | `CONTRIBUTING.md` v2.0 | ✅ | — | — | — |
| Configuração | Segurança de credenciais (`.gitignore`, `.env.example`, secrets no CI) | `.gitignore`, `.env.example`, grep sem segredos | ✅ | Configurar secrets reais (P0.4) | Geandre | P2 |
| Configuração | Variáveis de ambiente documentadas | `.env.example` | ✅ | Consumidas só no P4.4 | — | — |
| Configuração | Lint/formatação automatizados | — | ❌ | `chore: eslint + prettier` | Jean | P3 |

## Qualidade e Processos

| Pilar | Item Avaliado | Evidência/Arquivo | Status | Pendência | Responsável | Prioridade |
|---|---|---|---|---|---|---|
| Qualidade | Critérios ISO/IEC 25010 avaliados (8 características, 28 subitens) | `docs/qualidade-iso-25010.md` | ✅ | Reavaliar por marco | Geandre | — |
| Qualidade | Plano de testes formal (objetivo, escopo, critérios de entrada/saída/aprovação, responsáveis, riscos, ferramentas, evidências) | `docs/plano-de-testes.md` v1.1 §0 | ✅ | — | — | — |
| Qualidade | Casos de teste funcionais (49 cenários, 39 automatizados) | `docs/plano-de-testes.md` §1 | ✅ | TF-46/47 dependem do login real | Jean | P2 |
| Testes | Testes funcionais automatizados (motor 30, serviços 34, componentes 10, telas 17, autenticação 7 = 98) | `npm test`; CI | ✅ | — | — | — |
| Testes | Login de cada perfil, logout, redirecionamento, falha de autenticação | `apps/web/src/pages/autenticacao.test.tsx` | ✅ | Credenciais inválidas / recuperação: login real | Geandre | P2 |
| Testes | Testes de integração (10 integrações, 9 cobertas) | `docs/plano-de-testes.md` §1.1 | ✅ | TI-10 (contrato com PostgREST) | Geandre | P2 |
| Testes | Testes de permissão (caminho negado primeiro) | `mockApi.test.ts` (34), `paginas.test.tsx` (4) | ✅ (mock) | RLS real P1.11–P1.19 | Geandre | **P1** (início) |
| Testes | Testes de acessibilidade automatizados (axe em toda tela/componente; contraste no CI) | `test/utils.tsx`; `scripts/contraste.mjs`; CI | ✅ | — | — | — |
| Testes | Testes de acessibilidade manuais (teclado, NVDA, zoom, W3C) | `docs/plano-de-testes.md` §3.2 (checklist) | 🟡 | Executar e registrar em `docs/resultados.md` | Geandre | P2 |
| Testes | Testes de usabilidade (perfil, tarefas, roteiro, métricas, critério) | `docs/plano-de-testes.md` §2 | 🟡 (planejado) | Executar no piloto (Fase 6) | Ambos | P3 |
| Testes | Cobertura ≥ 70 % com threshold no CI (motor 97 %, web 78 %) | `vitest.config.ts`, `vite.config.ts`; artefatos do CI | ✅ | — | — | — |
| Testes | E2E em navegador real (Playwright, 375 px) | — | ❌ (planejado P4.19/P4.20) | Implementar | Jean | P2 |
| Testes | Compatibilidade de navegadores | `docs/plano-de-testes.md` §4 (matriz vazia) | ❌ | Executar antes de M4 | Jean | P2 |
| Processos | BPMN dos 10 processos (autenticação, login por perfil ×3, principal por perfil ×3, recuperação, suporte, erro/negado) | `docs/bpmn-processos.md` (Mermaid) | ✅ (Mermaid) | Reproduzir em Bizagi/draw.io para a monografia | Jean | P3 |
| Processos | PDCA aplicado (matriz + ciclos por marco + lições) | `docs/pdca.md` | ✅ | Preencher a cada marco | Ambos | — |
| Processos | Evidências de correções (heurística: 6 itens sev. 3/4 corrigidos; diagnóstico: T-03/T-04/T-05) | `docs/avaliacao-heuristica.md` §2; `docs/diagnostico-inicial.md` | ✅ | — | — | — |
| Processos | Ordem de implementação respeitada (schema → motor → EF → front) | CLAUDE.md; desvio controlado D-17 documentado | 🟡 | Fase 1 e 3 pendentes | Geandre | P1 |

## Governança e Serviços

| Pilar | Item Avaliado | Evidência/Arquivo | Status | Pendência | Responsável | Prioridade |
|---|---|---|---|---|---|---|
| Serviços | Catálogo de serviços (13 serviços) | `docs/itil-servicos.md` §1 | ✅ | URL do ambiente publicado (P6.2) | Geandre | P3 |
| Serviços | Gestão de incidentes (tipos, prioridade, prazos, fluxo) | `docs/itil-servicos.md` §2 | ✅ | Criar rótulos no GitHub | Jean | P1 |
| Serviços | Gestão de requisições (8 tipos) | `docs/itil-servicos.md` §3 | ✅ | — | — | — |
| Serviços | Base de conhecimento (Ajuda, FAQ, guia, canal, triagem, recorrentes) | `docs/itil-servicos.md` §4; `/ajuda`; `/acessibilidade` | ✅ | FAQ na tela Ajuda (P4.18) | Jean | P3 |
| Serviços | Guia do usuário não técnico (primeiro acesso, 4 fluxos, acessibilidade) | `docs/guia-de-uso-do-sistema.md` | ✅ | — | — | — |
| Serviços | Plano de suporte (níveis 0–3, prazos) | `docs/itil-servicos.md` §5 | ✅ | — | — | — |
| Governança | Objetivos do projeto (7) e indicadores (15) com fórmula, meta, frequência, fonte, responsável | `docs/cobit-governanca.md` §1–§2 | ✅ | Medir SUS/tempos no piloto | Ambos | P3 |
| Governança | Controles de governança (15) com evidência e periodicidade | `docs/cobit-governanca.md` §3 | ✅ (documentados) | C-03 proteção de branch ❌, C-02 PRs ❌, C-13 Kanban ❌ | Geandre | **P1** |
| Governança | Gestão de riscos (17 riscos, probabilidade × impacto, resposta, mitigação, dono) | `docs/gestao-de-riscos.md` | ✅ | Revisar por marco | Ambos | — |
| Governança | Segurança e privacidade / LGPD (dados tratados, minimização, acesso, senhas, segredos, retenção, riscos, incidentes) | `docs/seguranca-e-privacidade.md` | ✅ | Backend real (RLS testada, Auth) | Geandre | P2 |
| Governança | Ausência de dados reais | `seed.sql`, `mocks/dados.ts` (cabeçalhos), rodapé das telas | ✅ | — | — | — |
| Governança | Backup / recuperação | `docs/cobit-governanca.md` C-08 | 🟡 | Projeto Supabase inexistente | Geandre | P2 |
| Governança | Registro de mudanças e releases (tags) | Commits; sem tags | 🟡 | Tag `v0.2.0` ao mesclar em `main` | Geandre | P1 |
| Governança | Pendências registradas com dono e prazo | `docs/cobit-governanca.md` §6; `docs/relatorio-de-conformidade.md` §16 | ✅ | — | — | — |

## Acessibilidade, WCAG e usabilidade

| Pilar | Item Avaliado | Evidência/Arquivo | Status | Pendência | Responsável | Prioridade |
|---|---|---|---|---|---|---|
| Acessibilidade | Documento de acessibilidade com os requisitos mínimos mapeados (§0) e por componente (§10) | `docs/acessibilidade.md` v1.1 | ✅ | — | — | — |
| WCAG | Matriz WCAG 2.2 AA por princípio (48 critérios: 39 ✅, 9 🟡) + critérios priorizados (§6) | `docs/wcag-2.2.md` v1.1 | 🟡 | Sessão manual de 3 h (plano em §6) | Geandre | P2 |
| Usabilidade | Avaliação heurística (10 heurísticas, 2 rodadas, escala 0–4, coluna "Ação aplicada"; 0 itens sev. ≥ 3 abertos) | `docs/avaliacao-heuristica.md` v1.1 | ✅ | Rodada externa (2 avaliadores) no piloto | Geandre | P3 |
| Perfis | Tela de login própria, linguagem, redirecionamento, dashboard, controle de acesso, estados, logout, teclado — 4 perfis | `perfisLogin.ts`, `EntrarPapel.tsx`, `Painel.tsx`, `autenticacao.test.tsx` | ✅ (demo) | Fluxo de autenticação real e recuperação de senha (P4.4) | Geandre | P2 |
| UX/UI | Design system, arquitetura da informação, documento de telas | `docs/ux-ui.md` | ✅ | — | — | — |
| UX/UI | Prompt de design com IA (etapa 6 da orientação) | `docs/prompt-design-ia.md` | ✅ | — | — | — |

## Resumo

| Pilar | ✅ | 🟡 | ❌ | Conformidade geral |
|---|---|---|---|---|
| Engenharia e Configuração | 13 | 1 | 6 | **Parcialmente conforme** — engenharia sólida; configuração colaborativa documentada mas não evidenciada (proteção, PRs, segundo integrante, Kanban) |
| Qualidade e Processos | 12 | 4 | 2 | **Parcialmente conforme** — testes e processos documentados; faltam E2E, compatibilidade, manuais e a fase de backend |
| Governança e Serviços | 11 | 2 | 0 | **Conforme (documental)** — todos os artefatos existem; 3 controles dependem de ações no GitHub (P1) |
| Acessibilidade, WCAG e usabilidade | 5 | 1 | 0 | **Conforme** com verificação manual pendente |

**Ações P1 (esta semana):** proteger branches · abrir o PR desta auditoria com revisão de Jean · adicionar Jean e obter o primeiro PR dele · executar `criar-kanban.sh` · criar rótulos de incidente · tag `v0.2.0` · iniciar a Fase 1 (migration `0004`).
