# Relatório final de conformidade — auditoria técnica, metodológica e documental

**Data:** 21/09/2026 · **Objeto:** `geandreac/tcc-peivivo`, branch `development` (`ef0c515`) · **Metodologia:** três pilares — Engenharia e Configuração; Qualidade e Processos; Governança e Serviços.
**Classificação:** **Conforme** (implementado e documentado) · **Parcialmente conforme** (existe, com lacunas ou evidência insuficiente) · **Não conforme** (inexistente ou sem evidência) · **Não aplicável** (justificado).

---

## 1. Resumo executivo

O PEI Vivo chega a esta auditoria com um **produto de engenharia acima da média para um TCC**: protótipo funcional com 22 telas, camada de serviços que aplica a matriz de permissões (34 testes negativos), motor determinístico com 97 % de cobertura, schema com RLS validado em Postgres real, CI de três frentes verde e documentação de requisitos, UX, acessibilidade e WCAG já madura. A acessibilidade não é adendo: HTML semântico, `<dialog>` nativo, `aria-live`, foco visível, contraste verificado numericamente e axe-core em toda tela.

A lacuna principal não é técnica, é de **evidência de processo**: em 21/09 o repositório tinha `main` sem proteção, zero Pull Requests, um único contribuidor, Kanban não criado e sem tags — o processo colaborativo estava documentado, mas não praticado. A segunda lacuna é o **backend real** (migration `0004`, RLS testada contra PostgREST, Edge Functions, Supabase Auth), que é o que transforma "o mock nega" em "o banco nega" — a prova central de RF14.

Esta auditoria **criou 12 documentos** (diagnóstico, matriz de rastreabilidade, ISO 25010, BPMN, PDCA, ITIL, COBIT, riscos, segurança/LGPD, guia do usuário, checklist da banca, este relatório), **reescreveu** `CONTRIBUTING.md`, **atualizou** 4 documentos (plano de testes, acessibilidade, WCAG, heurísticas), e **implementou** 7 testes de autenticação/rotas por perfil, threshold de cobertura no app web, `.env.example` e novo template de PR. Total de testes: **98** (30 motor + 68 web), todos verdes.

**Conformidade geral:** Engenharia e Configuração — *parcialmente conforme*; Qualidade e Processos — *parcialmente conforme*; Governança e Serviços — *conforme (documental)*, com 3 controles dependentes de ações no GitHub; Acessibilidade/WCAG/usabilidade — *conforme*, com verificação manual pendente.

## 2. Diagnóstico inicial

Documento completo: `docs/diagnostico-inicial.md`. Pontos-chave:

- **Stack:** TypeScript estrito, React 18 + Vite 5 + react-router 6, CSS com tokens, Vitest + Testing Library + axe-core, Supabase (migrations/seed), PGlite, GitHub Actions.
- **Estrutura:** corresponde à proposta da disciplina; nenhuma refatoração necessária.
- **11 problemas técnicos** (T-01…T-11): 3 corrigidos nesta auditoria (threshold web, testes de login por perfil, `.env.example`); 2 de governança dependem do GitHub (proteção, PRs); os demais são baixos/cosméticos.
- **7 suposições** registradas (S-01…S-07), a principal: `image.png` do enunciado não existe no repositório; os pilares foram tomados do texto.

## 3. Situação da engenharia e configuração — **Parcialmente conforme**

| Item | Situação | Evidência |
|---|---|---|
| Organização por responsabilidade, componentes reutilizáveis, separação de camadas, baixo acoplamento, nomenclatura, tratamento de erros | **Conforme** | `README.md` §6; `services/api.ts`; `erros.ts`; nenhuma página importa `mockApi` |
| Preparação para API REST | **Conforme** | `PeiVivoApi`; erros mapeados a HTTP; troca em `services/index.ts` |
| Variáveis de ambiente e segredos | **Conforme** | `.gitignore`; `.env.example` (novo); grep sem segredos; secrets do CI no cofre |
| Branches `main`/`development` + branches de trabalho no padrão pedido | **Conforme (definido)** | `CONTRIBUTING.md` v2.0 §2 (`feature/<autor>-…`, `fix/`, `test/`, `docs/`) |
| Proteção de branches | **Não conforme** | API GitHub `protected: false` |
| Pull Requests revisados | **Não conforme** | 0 PRs; 12 commits diretos |
| Colaboração da dupla | **Não conforme** | 1 contribuidor; Jean sem commit |
| Distribuição de responsabilidades | **Conforme** | `CONTRIBUTING.md` §11 — adaptada: Geandre = arquitetura/auth/design system/a11y/docs **+ backend**; Jean = telas/dashboards/mocks/estados/responsividade/testes funcionais **+ motor**; justificativa técnica registrada |
| CONTRIBUTING com 12 seções e Conventional Commits | **Conforme** | `CONTRIBUTING.md` v2.0 |
| Rastreabilidade requisito → tela → código → teste | **Conforme** | `docs/matriz-rastreabilidade.md` (novo) + `docs/rastreabilidade.md` |
| CI | **Conforme** | 3 jobs verdes; cobertura obrigatória nos dois workspaces |
| Lint | **Não conforme** | sem ESLint (baixo impacto; plano de ação A-12) |

## 4. Situação da qualidade e dos processos — **Parcialmente conforme**

| Item | Situação | Evidência |
|---|---|---|
| ISO/IEC 25010 como referência (28 subitens avaliados) | **Conforme** | `docs/qualidade-iso-25010.md` |
| Plano de testes formal | **Conforme** | `docs/plano-de-testes.md` v1.1 §0 |
| Testes funcionais (49 cenários; 39 automatizados) | **Conforme** | §1; 98 testes verdes |
| Login família / professor / terapeuta, credenciais inválidas (falha), redirecionamento, proteção de rotas, logout, estados, 404, fluxo principal | **Conforme** | `autenticacao.test.tsx`, `paginas.test.tsx` |
| Recuperação de senha, credenciais inválidas com senha | **Não aplicável (demo)** → **planejado** (TF-46/47, P4.4) | D-16 |
| Testes de integração (10 integrações) | **Conforme** (9/10) | §1.1 |
| Testes de usabilidade (perfil, tarefas, roteiro, métricas, critério) | **Parcialmente conforme** — planejado, não executado | §2 |
| Testes de acessibilidade — automáticos | **Conforme** | axe em 21 telas/componentes; contraste no CI |
| Testes de acessibilidade — manuais (Tab, Shift+Tab, Enter/Espaço, Esc, foco, contraste renderizado, zoom 200/400 %, reflow, títulos, landmarks, alt, labels, erros, live, leitor de tela, armadilhas) | **Parcialmente conforme** — checklist A1–A26 definido; A1–A8, A12–A20, A24 verificados por código/jsdom; demais pendentes | §3.2 |
| BPMN 2.0 (10 processos) | **Conforme** (Mermaid; versão em ferramenta BPMN a reproduzir) | `docs/bpmn-processos.md` |
| PDCA | **Conforme** | `docs/pdca.md` |
| Ordem de implementação (schema → motor → EF → front) | **Parcialmente conforme** — desvio controlado (D-17); Fases 1 e 3 atrasadas | `docs/pdca.md` §3 |

## 5. Situação da governança e dos serviços — **Conforme (documental)**

| Item | Situação | Evidência |
|---|---|---|
| Catálogo de serviços (13) | **Conforme** | `docs/itil-servicos.md` §1 |
| Gestão de incidentes (9 tipos, P1–P3, prazos, fluxo) | **Conforme** | §2 |
| Gestão de requisições (8) | **Conforme** | §3 |
| Base de conhecimento (Ajuda, FAQ, guia, canal, triagem, recorrentes) | **Conforme** | §4; FAQ na tela é P4.18 |
| Objetivos (7) e indicadores (15) com fórmula/meta/frequência/fonte/responsável | **Conforme** | `docs/cobit-governanca.md` §1–§2; linha de base registrada |
| Controles (15) | **Parcialmente conforme** — 8 ✅, 6 🟡, 1 ❌ (C-03 proteção de branch) | §3 |
| Gestão de riscos (17 riscos) | **Conforme** | `docs/gestao-de-riscos.md` |
| Segurança e privacidade / LGPD | **Conforme (política)**; backend real pendente | `docs/seguranca-e-privacidade.md` |
| Plano de suporte (níveis, prazos) | **Conforme** | `docs/itil-servicos.md` §5 |

## 6. Situação dos três perfis de acesso (+ coordenação)

| Requisito por perfil | Família | Professores | Terapeutas (equipe de saúde) | Coordenação |
|---|---|---|---|---|
| Tela de login própria | ✅ `/entrar/familia` | ✅ `/entrar/docente` | ✅ `/entrar/saude` | ✅ `/entrar/coordenacao` |
| Linguagem e instruções do contexto | ✅ "pai, mãe ou responsável… consentimento" | ✅ "domingo à noite, no celular" | ✅ "uso ocasional e de alta responsabilidade" | ✅ "cadastro, vínculos, histórico" |
| Fluxo de autenticação específico | 🟡 demo (real: convite por e-mail — P4.4) | 🟡 demo (real: e-mail institucional) | 🟡 demo (real: e-mail + registro no conselho) | 🟡 demo |
| Redirecionamento após login | ✅ painel ou origem (testado) | ✅ | ✅ | ✅ |
| Dashboard adequado ao papel | ✅ "Ver consentimento" | ✅ "Gerar material" (só com consentimento) | ✅ "Validar parâmetros" + Pendências | ✅ "Ver histórico" + "Cadastrar" |
| Controle de acesso por perfil | ✅ nunca vê nota clínica/rascunho (testado) | ✅ nunca vê nota clínica/laudo (testado) | ✅ nunca vê rascunho; nota exclusiva (testado) | ✅ não observa; não vê nota (testado) |
| Estados carregando/erro/vazio/sucesso | ✅ | ✅ (vazio: Paulo) | ✅ (vazio: Beatriz) | ✅ |
| Logout | ✅ (testado) | ✅ | ✅ | ✅ |
| Acessibilidade e teclado | ✅ axe nas 4 telas; `userEvent` | ✅ | ✅ | ✅ |
| Dados simulados / API preparada | ✅ mock + contrato | ✅ | ✅ | ✅ |
| Recuperação de senha | ⬜ planejado | ⬜ | ⬜ | ⬜ |

**Conclusão:** separação por perfil **conforme** no protótipo, com um design system único (mesmo `Layout`, tokens, componentes). Autenticação real e recuperação de senha são **planejadas** (P4.4) e já têm caso de teste (TF-46/47), processo BPMN (8) e requisitos de acessibilidade (3.3.8) definidos.

## 7. Situação de acessibilidade, WCAG e usabilidade — **Conforme, com verificação manual pendente**

- `docs/acessibilidade.md` v1.1: 24 requisitos mínimos mapeados (§0) — 20 ✅, 4 🟡 (zoom em dispositivo, reflow em dispositivo, leitor de tela, linguagem no piloto).
- `docs/wcag-2.2.md` v1.1: 48 critérios aplicáveis — 39 ✅, 9 🟡; **nenhum pendente de implementação**; plano de sessão de 3 h para fechar.
- `docs/avaliacao-heuristica.md` v1.1: 2 rodadas, 23 achados, 8 corrigidos, **0 de severidade 3/4 abertos** (regra da disciplina atendida); rodada 2 sobre login por perfil não encontrou sev. ≥ 3.
- Usabilidade com pessoas: roteiro, tarefas, métricas e critério definidos; execução no piloto (Fase 6).

## 8. Arquivos criados

| Arquivo | Conteúdo |
|---|---|
| `docs/diagnostico-inicial.md` | Inventário, tecnologias, estrutura, implementado/pendente, problemas T-01…T-11, lacunas, suposições S-01…S-07, riscos, plano resumido |
| `docs/matriz-rastreabilidade.md` | RF01–RF16, AUT-01…10, RN01–08, RNF → tela → arquivos → teste → status |
| `docs/qualidade-iso-25010.md` | 28 subitens das 8 características, evidência, lacuna, ação, status |
| `docs/bpmn-processos.md` | 10 processos em Mermaid + tabela (evento inicial, atividades, decisões, responsáveis, intermediários, final, exceções, regras, dados) |
| `docs/pdca.md` | Matriz PDCA, detalhamento por etapa, ciclos por marco com lições |
| `docs/itil-servicos.md` | Catálogo (13), incidentes (9 tipos), requisições (8), base de conhecimento (FAQ 11), níveis de suporte |
| `docs/cobit-governanca.md` | 7 objetivos, 15 indicadores com linha de base, 15 controles, RACI, ciclo de avaliação, 7 pendências |
| `docs/gestao-de-riscos.md` | Escala, 17 riscos, mapa de calor, plano de resposta, revisão |
| `docs/seguranca-e-privacidade.md` | Dados tratados, minimização, acesso, rotas, senhas, segredos, retenção, riscos de privacidade, incidente, demo, LGPD art. 6º |
| `docs/guia-de-uso-do-sistema.md` | Guia não técnico: primeiro acesso, 4 fluxos, acessibilidade, roteiro da banca |
| `docs/checklist-final-tcc.md` | Tabela consolidada por pilar com evidência, status, pendência, responsável, prioridade |
| `docs/relatorio-de-conformidade.md` | Este relatório |
| `apps/web/src/pages/autenticacao.test.tsx` | 7 testes: login família/saúde/coordenação, navegação condicional, volta à origem, logout, falha de autenticação |
| `.env.example` | Variáveis documentadas com placeholders (não consumidas até P4.4) |

## 9. Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `CONTRIBUTING.md` | Reescrito (v2.0): 12 seções, padrão `feature/<autor>-…`, Conventional Commits, divisão Geandre/Jean adaptada e justificada, checklist de merge, regras de acessibilidade/qualidade, proteção de branch pendente |
| `docs/plano-de-testes.md` | v1.1: §0 (objetivo, escopo, itens, fora do escopo, ambiente, responsáveis, critérios de entrada/saída/aprovação, tipos, riscos, ferramentas, evidências), TF-41…TF-47, §1.1 integração, estado do checklist |
| `docs/acessibilidade.md` | v1.1: §0 mapa dos 24 requisitos mínimos |
| `docs/wcag-2.2.md` | v1.1: §6 critérios priorizados + plano de fechamento |
| `docs/avaliacao-heuristica.md` | v1.1: coluna "Ação aplicada", rodada 2 (login por perfil), consolidação |
| `apps/web/vite.config.ts` | Threshold de cobertura 70/70/70/60 (CI falha abaixo) |
| `.github/pull_request_template.md` | Checklist ampliado (estados, 375 px, Conventional, rebase, segredos) |
| `README.md`, `CLAUDE.md` | Tabela de documentação e "onde estamos" atualizados |

## 10. Testes implementados, executados ou planejados

| Categoria | Implementados | Executados (21/09) | Planejados |
|---|---|---|---|
| Motor (unitário) | 30 | ✅ 30/30 | — |
| Serviços / permissões (negativos) | 34 | ✅ 34/34 | mesmos 34 contra PostgREST (P1.11–P1.19) |
| Componentes + axe | 10 | ✅ 10/10 | — |
| Telas / fluxos + axe | 17 | ✅ 17/17 | — |
| **Autenticação e rotas por perfil** (novo) | **7** | ✅ 7/7 | TF-46 credenciais inválidas, TF-47 recuperação (P4.4) |
| Cobertura | motor 97 %; web 78 % (threshold 70 %) | ✅ | — |
| Migrations | `db:validar` (PGlite) + job `db` | ✅ CI 15/09 | — |
| E2E navegador | — | — | Playwright 375×812 + axe com contraste (P4.19/P4.20) |
| Acessibilidade manual | checklist A1–A26 | parcial (código/jsdom) | sessão NVDA/zoom/W3C (P6.7) |
| Usabilidade | roteiro, SUS | — | piloto (P6.5) |
| Compatibilidade | matriz | — | antes de M4 |

**Total automatizado: 98 testes, 100 % verdes** (`npm test`, 21/09/2026).

## 11. Evidências disponíveis para apresentação à banca

1. **Repositório público** com histórico, CI verde (Actions), estrutura de monorepo.
2. **`npm test` ao vivo:** 98 testes, com axe-core; `npm run contraste`; `npm run db:validar`.
3. **Roteiro de 10 minutos** (`docs/guia-de-uso-do-sistema.md` §7): ciclo completo + 2 caminhos negados por URL + logout/redirecionamento + teclado/alto contraste.
4. **Documentação por pilar** (25 documentos em `docs/`), com rastreabilidade RF → tela → arquivo → teste → commit.
5. **Avaliação heurística** com correções evidenciadas em código; **matriz WCAG** por critério.
6. **Diagramas** (classes, sequência, casos de uso em `docs/tcc/`; BPMN em Mermaid; fluxo de navegação em `ux-ui.md`).
7. A produzir (P1–P2): capturas de rulesets, PRs revisados, Kanban, Actions obrigatórias → `docs/evidencias/`.

## 12. Itens conformes

Organização e arquitetura do código · separação de camadas e contrato de API · tratamento de erros · segurança de credenciais · branches e estratégia colaborativa (definidas) · CONTRIBUTING · rastreabilidade (2 formatos) · CI com cobertura obrigatória · ISO 25010 · plano de testes formal · casos funcionais e de integração · testes de login/rotas por perfil · testes de permissão (mock) · acessibilidade automatizada · BPMN · PDCA · catálogo/incidentes/requisições/base de conhecimento · objetivos e indicadores · gestão de riscos · segurança e privacidade · guia do usuário · documento de acessibilidade · avaliação heurística (0 sev. ≥ 3) · separação dos perfis no protótipo · dados 100 % fictícios.

## 13. Itens parcialmente conformes

Histórico de commits (padrão antigo até 21/09) · controles de governança (6 🟡) · ordem de implementação (Fase 1/3 atrasadas) · testes de acessibilidade manuais · testes de usabilidade (planejados) · WCAG (9 critérios de verificação manual) · fluxo de autenticação real por perfil · backup (sem projeto cloud) · releases/tags · segurança no backend (RLS não testada contra PostgREST).

## 14. Itens não conformes

Proteção de branches · Pull Requests (nenhum) · segundo integrante sem commits · Kanban não criado · lint automatizado · E2E em navegador · matriz de compatibilidade vazia · recuperação de senha (não aplicável na demo; planejada).

## 15. Riscos restantes

| ID | Risco | Nível | Tratamento |
|---|---|---|---|
| R-03 | Atraso do backend (Fases 1 e 3) | Alto | Replanejar para S3–S4; IA como incremento; demo já existe |
| R-04 | RF14 provado só no mock | Alto | Fase 1 com os 34 cenários |
| R-11 | Colaboração concentrada num integrante | Alto | Jean colaborador; PR desta auditoria revisado por ele; revisão cruzada |
| R-13 | Evidência de processo insuficiente | Alto | Ações P1 desta semana + `docs/evidencias/` |
| R-05, R-08, R-10, R-12 | Login real, acessibilidade manual, indisponibilidade na demo, escopo | Alto | Planos em `docs/gestao-de-riscos.md` |
| Demais (R-01, R-02, R-06, R-07, R-09, R-14…R-17) | — | Baixo/Médio | Controles implementados |

## 16. Plano de ação priorizado

| Prioridade | Ação | Pilar | Impacto | Responsável | Dependência | Critério de Conclusão |
|---|---|---|---|---|---|---|
| **A-01 (P1)** | Criar rulesets de proteção em `main` e `development` (PR obrigatório, checks `motor`/`db`/`web`, sem force push) | Engenharia e Configuração | Alto — controle C-03; risco R-02/R-13 | Geandre | Acesso admin ao repo | API GitHub `protected: true`; captura em `docs/evidencias/` |
| **A-02 (P1)** | Abrir esta auditoria como PR `docs/governanca-e-processos` → `development`, revisão de Jean, merge por squash | Engenharia e Configuração | Alto — primeira evidência de PR revisado | Ambos | A-03 (Jean com acesso) | PR mesclado com aprovação de Jean |
| **A-03 (P1)** | Adicionar Jean como colaborador; Jean abre seu primeiro PR (`test/jean-playwright-golden-path` ou `feature/jean-badge-pendencias`) | Engenharia e Configuração | Alto — R-11 | Geandre / Jean | — | Contributors = 2; PR de Jean mesclado |
| **A-04 (P1)** | Executar `scripts/criar-kanban.sh` (labels, issues por card, Project) + rótulos `incidente/requisicao/melhoria/acessibilidade/p1-p3` | Governança e Serviços | Médio — C-13, C-09 | Geandre | `gh auth login` | Project com 5 colunas e cards; rótulos criados |
| **A-05 (P1)** | PR `development → main` (`release: M0+ — protótipo e governança`) + tag `v0.2.0` | Engenharia e Configuração | Médio — C-10 | Geandre | A-01, A-02 | Tag publicada; `main` = `development` |
| **A-06 (P1)** | Iniciar Fase 1: `0004_revisao_requisitos.sql` + primeiro teste RLS negativo (docente × `notas_clinicas` → 403) contra PostgREST | Qualidade e Processos | Alto — R-03, R-04; prova de RF14 | Geandre | P0.4 (projeto Supabase dev) | Teste verde no CI com token válido |
| **A-07 (P2)** | Projeto Supabase dev + secrets `SUPABASE_URL`/`SUPABASE_ANON_KEY` + `vars.SUPABASE_PING_ATIVO=true` | Governança e Serviços | Médio — R-10, C-08 | Geandre | Conta Supabase | Workflow de ping com `conclusion: success` |
| **A-08 (P2)** | Playwright: golden path 375×812 nos 4 perfis + caminhos negados + axe com contraste real (P4.19/P4.20) | Qualidade e Processos | Alto — fecha 1.4.3/1.4.10/2.5.8 e RNF-A | Jean | A-03 | Job `e2e` verde no CI; relatório em `docs/evidencias/` |
| **A-09 (P2)** | Sessão manual de acessibilidade (3 h): Lighthouse/axe DevTools, zoom 200/400 %, NVDA + Firefox, W3C; registrar em `docs/resultados.md` | Acessibilidade | Alto — fecha 9 critérios WCAG 🟡; R-08 | Geandre | Build atual | 9 critérios ✅ ou defeitos abertos com card |
| **A-10 (P2)** | `supabaseApi` + Supabase Auth: login por e-mail/senha, convite para família, "Esqueci a senha", expiração; TF-46/TF-47 automatizados; teste de contrato mock × supabase | Engenharia e Configuração | Alto — R-05; completa os 3 perfis com fluxo real | Geandre | A-06, Fase 3 (EF `fechar-ciclo`, `gerar-material`) | 34 cenários verdes nos dois adaptadores; login real na demo |
| **A-11 (P2)** | Matriz de compatibilidade (Chrome, Firefox, Safari iOS, Edge) executada e preenchida | Qualidade e Processos | Médio — RNF-G, R-09 | Jean | Build atual | `plano-de-testes.md` §4 preenchido |
| **A-12 (P3)** | ESLint + Prettier (`chore:`), regras `react-hooks`, `jsx-a11y`; job `lint` no CI | Engenharia e Configuração | Baixo | Jean | — | CI com job `lint` verde |
| **A-13 (P3)** | FAQ (`itil-servicos.md` §4.2) incorporada à tela Ajuda; badge de contagem em Pendências; confirmação ao sair com formulário sujo | Acessibilidade / Usabilidade | Baixo — itens sev. 2 | Jean | — | Heurística: itens fechados; testes de tela |
| **A-14 (P3)** | Reproduzir os 10 BPMN em Bizagi/draw.io → `docs/tcc/bpmn/` | Qualidade e Processos | Baixo — apresentação na monografia | Jean | — | 10 PNG/SVG referenciados em `bpmn-processos.md` |
| **A-15 (P3)** | Piloto: 3+ docentes, SUS, tempos, taxa de sucesso; rodada heurística externa; `docs/resultados.md` | Qualidade / Governança | Alto — indicadores O4/O5; R-16 | Ambos | A-10 ou protótipo publicado | SUS ≥ 68; T3 ≤ 60 s; resultados tabulados |
| **A-16 (P3)** | `docs/evidencias/` com capturas: rulesets, PRs, Actions, Kanban, Lighthouse, NVDA | Governança e Serviços | Médio — R-13 | Geandre | A-01…A-09 | Pasta referenciada no checklist final |

---

**Assinatura da auditoria:** gerada em 21/09/2026 a partir da leitura integral do repositório e da execução dos testes; suposições explícitas em `docs/diagnostico-inicial.md`. Nenhum teste, documento ou implementação foi inventado: o que está planejado está marcado como planejado, e o que está implementado aponta o arquivo e o teste correspondentes.
