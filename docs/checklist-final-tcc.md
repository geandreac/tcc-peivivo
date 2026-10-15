# Checklist final para a banca — evidências por pilar

**Versão:** 2.0 — 14/10/2026 (v1.0 de 21/09/2026). Junta `docs/diagnostico-inicial.md`, `docs/relatorio-de-conformidade.md`, os documentos de cada pilar e o estado da reformulação (`docs/reformulacao/`, R1–R5).
**Status:** ✅ Conforme (implementado e documentado, com evidência) · 🟡 Parcialmente conforme (existe, mas falta algo ou falta evidência) · ❌ Não conforme (não existe ou não tem evidência) · N/A não se aplica (com justificativa).
**Prioridade da pendência:** P1 (antes da pré-banca) · P2 (antes do congelamento de 26/11) · P3 (antes da defesa).

**O que mudou desde a v1.0:**
- Implantação: o banco real está pronto (R1–R3), assim como o `supabaseApi` e o login real (R2) e a nuvem (Vercel + Supabase).
- Testes: entraram os E2E e o Lighthouse.
- Repositório: a `main` está protegida, o Kanban foi criado e os rótulos de incidente existem.

---

## Engenharia e Configuração

| Pilar | Item Avaliado | Evidência/Arquivo | Status | Pendência | Responsável | Prioridade |
|---|---|---|---|---|---|---|
| Engenharia | Código organizado por responsabilidade (routes/layouts/pages/components/hooks/services/mocks/utils/styles) | `README.md` §6; `apps/web/src/` | ✅ | — | Geandre | — |
| Engenharia | Arquitetura documentada (camadas, contrato de serviços, troca mock → Supabase) | `README.md` §5–§6; D-15/D-16/D-17 e D-19…D-46 em `docs/requisitos.md`; ADR-00…20 em `docs/reformulacao/DECISOES.md`; diagramas gerados do código (`npm run diagramas`, `docs/tcc/*_diagram.svg`) | ✅ | — | Geandre | — |
| Engenharia | Separação entre apresentação, regras, serviços e dados, com baixo acoplamento | `services/api.ts`; motor puro; casos de uso puros em `packages/funcoes`; contratos Zod em `packages/contratos`; nenhuma tela decide permissão | ✅ | — | — | — |
| Engenharia | Tratamento de erros com código estável, mensagem simples e caminho de recuperação | `services/erros.ts`; `Feedback.tsx`; códigos `42501`/`PT409`/`22023` no banco; BPMN processo 10 | ✅ | — | — | — |
| Engenharia | Integração com o backend real | `supabaseApi` (`VITE_API=supabase`); contrato testado no CI contra o Supabase real com Edge Functions | ✅ | — | Geandre | — |
| Configuração | Repositório Git configurado com remoto | <https://github.com/geandreac/tcc-peivivo> | ✅ | — | — | — |
| Configuração | Branches `main` e `development` | `main ← development ← feature/*`; as duas estão em dia (a `development` não tem commit fora da `main`); as branches de feature já integradas foram apagadas | ✅ | — | Geandre | — |
| Configuração | Proteção de branches | Regra de proteção na `main` (GitHub, 14/10/2026), detalhada abaixo da tabela | ✅ | Levar a mesma regra para a `development`, se a dupla quiser | Geandre | P3 |
| Configuração | Estratégia colaborativa (padrão de branch, divisão de trabalho, revisão cruzada) | `CONTRIBUTING.md` v2.0 §2, §11 | 🟡 | Documentada e usada nos PRs, mas ainda sem revisão cruzada | Ambos | **P1** |
| Configuração | Pull Requests com template e revisão | `.github/pull_request_template.md`; 12 PRs (#1, #98–#108) | 🟡 | Nenhum PR com revisão registrada. Jean revisa e aprova o próximo PR para a `main` (a proteção já exige isso) | Jean | **P1** |
| Configuração | Histórico de commits com mensagens claras (Conventional Commits) | 70 commits; `feat:`/`fix:`/`test:`/`docs:` desde 21/09 | ✅ | — | Ambos | — |
| Configuração | Segundo integrante com commits | Jean (`JeanVictor0329`) é colaborador do repositório; API GitHub: 0 commits dele | ❌ | Primeiro commit e primeiro PR do Jean (`feature/jean-…`) | Jean | **P1** |
| Configuração | CI/CD | `.github/workflows/ci.yml` com 5 jobs (motor, banco no Supabase real, Edge Functions, E2E, web), verdes em 14/10; deploy automático na Vercel a cada push na `main`; `manter-supabase-ativo.yml` | ✅ | — | Geandre | — |
| Configuração | Kanban / gestão de cards | GitHub Project "PEI Vivo — Kanban": 97 cards (27 concluídos, 6 em desenvolvimento, 20 a fazer, 43 no backlog, 1 sem status) | ✅ | Atualizar o status dos cards das fases R1–R4, que já terminaram | Ambos | P1 |
| Configuração | Rastreabilidade de requisitos | `docs/rastreabilidade.md` (formato da disciplina) + `docs/matriz-rastreabilidade.md` (RF → tela → arquivo → teste); `docs/reformulacao/AMEACAS.md` (ameaça → teste) | ✅ | Atualizar os hashes a cada PR | Ambos | — |
| Configuração | README completo | `README.md` (15 seções + documentação) | ✅ | — | — | — |
| Configuração | CONTRIBUTING (12 seções) | `CONTRIBUTING.md` v2.0 | ✅ | — | — | — |
| Configuração | Segurança de credenciais (`.gitignore`, `.env.example`, secrets no CI) | `.gitignore`, `.env.example`; a chave `service_role` não fica gravada em disco; secrets do CI | ✅ | — | Geandre | — |
| Configuração | Variáveis de ambiente documentadas | `.env.example`; `docs/reformulacao/IMPLANTACAO.md` | ✅ | — | — | — |
| Configuração | Lint e formatação automatizados | — (typecheck estrito em todos os workspaces no CI) | ❌ | `chore: eslint + prettier` | Jean | P3 |

**Regra de proteção da `main` (configurada em 14/10/2026):**
- Exige Pull Request, com 1 aprovação, e todas as conversas resolvidas.
- Exige os 5 checks do CI, com a branch em dia antes do merge. O CI passou a rodar em todo PR, inclusive nos que só mudam documentação.
- Bloqueia force push e exclusão da branch.
- O administrador pode contornar a regra só em emergência.

## Qualidade e Processos

| Pilar | Item Avaliado | Evidência/Arquivo | Status | Pendência | Responsável | Prioridade |
|---|---|---|---|---|---|---|
| Qualidade | Critérios ISO/IEC 25010 avaliados (8 características, 28 subitens) | `docs/qualidade-iso-25010.md` | ✅ | Reavaliar a cada marco | Geandre | — |
| Qualidade | Plano de testes formal (objetivo, escopo, critérios de entrada/saída/aprovação, responsáveis, riscos, ferramentas, evidências) | `docs/plano-de-testes.md` | ✅ | Atualizar as contagens do cabeçalho (está com 12/10) | Geandre | P2 |
| Qualidade | Casos de teste funcionais | `docs/plano-de-testes.md` §1 | ✅ | — | — | — |
| Testes | Testes automatizados: motor 44 · funções 31 · políticas RLS 114 · web 119 = **308**, mais **20 E2E** | `npm test`; `npm run test:e2e`; CI | ✅ | — | — | — |
| Testes | Login real (senha, TOTP, convite, recuperação), logout, redirecionamento, falha de autenticação | `autenticacao.test.tsx`; testes HTTP (Auth + PostgREST + TOTP) no CI contra o Supabase real | ✅ | — | — | — |
| Testes | Testes de integração | `docs/plano-de-testes.md` §1.1; contrato do `supabaseApi` com PostgREST e Edge Functions no CI | ✅ | — | — | — |
| Testes | Testes de permissão (caminho negado primeiro) | 114 testes de políticas (PGlite + Supabase real no CI); `mockApi.test.ts`; STRIDE com 40 ameaças, cada uma com o teste que a nega (`docs/reformulacao/AMEACAS.md`) | ✅ | — | — | — |
| Testes | Testes de acessibilidade automatizados (axe em toda tela e componente; contraste no CI; axe com contraste real nos E2E) | `test/utils.tsx`; `scripts/contraste.mjs` (78 pares); job `e2e` | ✅ | — | — | — |
| Testes | Testes de acessibilidade manuais (teclado, NVDA, zoom) | `docs/plano-de-testes.md` §3.2 (roteiro) | 🟡 | Sessão com NVDA (R5.2), registrada no plano de testes | Geandre | P2 |
| Testes | Testes de usabilidade (perfil, tarefas, roteiro, métricas, critério) | `docs/plano-de-testes.md` §2; roteiro da pré-banca em `docs/guia-de-uso-do-sistema.md` | 🟡 (planejado) | Executar no piloto | Ambos | P3 |
| Testes | Cobertura ≥ 70 % com threshold no CI | `packages/motor-adaptacao/vitest.config.ts`, `apps/web/vite.config.ts`; artefatos do CI | ✅ | — | — | — |
| Testes | E2E em navegador real | Playwright: 20 cenários em 390 e 1280 px, inclusive acesso indevido por URL (job `e2e`) | ✅ | — | — | — |
| Testes | Desempenho e boas práticas (Lighthouse) | `docs/reformulacao/marcos/R5.md` (R5.5): ≥ 90 nas 3 páginas públicas | 🟡 | Medir as telas com sessão | Geandre | P3 |
| Testes | Compatibilidade de navegadores | `docs/plano-de-testes.md` §4; Chromium coberto pelos E2E | 🟡 | Rodada manual em Firefox, Safari e Edge | Jean | P2 |
| Processos | BPMN dos 10 processos (autenticação, login por perfil ×3, principal por perfil ×3, recuperação, suporte, erro/negado) | `docs/bpmn-processos.md` (Mermaid); `docs/reformulacao/FLUXOS.md` | ✅ (Mermaid) | Reproduzir em Bizagi/draw.io para a monografia | Jean | P3 |
| Processos | PDCA aplicado (matriz, ciclos por marco, lições) | `docs/pdca.md`; marcos em `docs/reformulacao/marcos/R1–R5.md` | ✅ | Preencher a cada marco | Ambos | — |
| Processos | Evidências de correções | `docs/avaliacao-heuristica.md` §2; `docs/diagnostico-de-interface.md`; os 10 problemas da verificação de 14/10 estão corrigidos (`docs/guia-de-uso-do-sistema.md`) | ✅ | — | — | — |
| Processos | Ordem de implementação respeitada (schema → motor → EF → front) | `CLAUDE.md`; R1 (banco que nega) e R3 (ciclo no servidor) antes do R2 (front no banco real); desvio D-17 documentado | ✅ | — | — | — |

## Governança e Serviços

| Pilar | Item Avaliado | Evidência/Arquivo | Status | Pendência | Responsável | Prioridade |
|---|---|---|---|---|---|---|
| Serviços | Catálogo de serviços (13 serviços) | `docs/itil-servicos.md` §1; ambiente publicado em <https://tcc-peivivo.vercel.app> | ✅ | — | — | — |
| Serviços | Gestão de incidentes (tipos, prioridade, prazos, fluxo) | `docs/itil-servicos.md` §2; rótulos `incidente`, `requisicao`, `p1`–`p3` no GitHub | ✅ | — | — | — |
| Serviços | Gestão de requisições (8 tipos) | `docs/itil-servicos.md` §3 | ✅ | — | — | — |
| Serviços | Base de conhecimento (Ajuda, FAQ, guia, canal, triagem, recorrentes) | `docs/itil-servicos.md` §4; `/ajuda`; `/acessibilidade` | 🟡 | A tela Ajuda ainda não tem perguntas frequentes | Jean | P3 |
| Serviços | Guia do usuário não técnico (primeiro acesso, fluxos por perfil, acessibilidade) | `docs/guia-de-uso-do-sistema.md` v2.0, conferido no site publicado com os 4 perfis | ✅ | — | — | — |
| Serviços | Plano de suporte (níveis 0–3, prazos) | `docs/itil-servicos.md` §5 | ✅ | — | — | — |
| Serviços | Ambiente publicado | Vercel (modo demonstração) + Supabase na nuvem (`sa-east-1`) com as migrations 0001–0009, RLS em 15/15 tabelas, cron da RN05, 3 Edge Functions; `docs/reformulacao/IMPLANTACAO.md` §0 | ✅ | E-mail próprio (SMTP do Gmail) depende da senha de app; a coordenação piloto ainda não aceitou o convite | Geandre | P1 |
| Governança | Objetivos do projeto (7) e indicadores (15) com fórmula, meta, frequência, fonte e responsável | `docs/cobit-governanca.md` §1–§2 | ✅ | Medir SUS e tempos no piloto | Ambos | P3 |
| Governança | Controles de governança (15) com evidência e periodicidade | `docs/cobit-governanca.md` §3 | 🟡 | C-03 (proteção) e C-13 (Kanban) estão resolvidos; C-02 (revisão de PR) segue pendente | Ambos | **P1** |
| Governança | Gestão de riscos (17 riscos, probabilidade × impacto, resposta, mitigação, dono) | `docs/gestao-de-riscos.md`; STRIDE em `docs/reformulacao/AMEACAS.md` | ✅ | Revisar a cada marco | Ambos | — |
| Governança | Segurança e privacidade / LGPD (dados tratados, minimização, acesso, senhas, segredos, retenção, riscos, incidentes) | `docs/seguranca-e-privacidade.md`; RLS testada; Auth na nuvem (sem cadastro aberto, senha ≥ 10, TOTP para quem vê dado de saúde); nota clínica só com aal2 e auditoria | ✅ | CSP e cabeçalhos de segurança na Vercel (R5.5) | Geandre | P2 |
| Governança | Ausência de dados reais | `seed.sql`, `mocks/dados.ts` (cabeçalhos), rodapé das telas | ✅ | — | — | — |
| Governança | Backup e recuperação | `docs/cobit-governanca.md` C-08; as migrations e o seed reproduzem o banco com um comando | 🟡 | O plano gratuito não tem backup diário. Fazer `pg_dump` antes da pré-banca e de cada demo | Geandre | P1 |
| Governança | Registro de mudanças e releases (tags) | Commits e PRs; nenhuma tag | 🟡 | Tag na `main` antes da pré-banca (ex.: `v1.0.0-pre-banca`) | Geandre | P1 |
| Governança | Pendências registradas com dono e prazo | Esta tabela; `docs/cobit-governanca.md` §6; `docs/reformulacao/BACKLOG-FUTURO.md` | ✅ | — | — | — |

## Acessibilidade, WCAG e usabilidade

| Pilar | Item Avaliado | Evidência/Arquivo | Status | Pendência | Responsável | Prioridade |
|---|---|---|---|---|---|---|
| Acessibilidade | Documento de acessibilidade com os requisitos mínimos mapeados (§0) e por componente (§10) | `docs/acessibilidade.md` | ✅ | — | — | — |
| WCAG | Matriz WCAG 2.2 AA por princípio, com os critérios priorizados (§6) | `docs/wcag-2.2.md` | 🟡 | Sessão manual (plano em §6), junto com a de NVDA | Geandre | P2 |
| Usabilidade | Avaliação heurística (10 heurísticas, escala 0–4, coluna "Ação aplicada") e diagnóstico de interface pelos padrões Apple/Google/Microsoft | `docs/avaliacao-heuristica.md`; `docs/padroes-de-interface.md`; `docs/diagnostico-de-interface.md` (D-44) | ✅ | Rodada externa (2 avaliadores) no piloto | Geandre | P3 |
| Perfis | Login próprio, linguagem, redirecionamento, painel, controle de acesso, estados, logout e teclado nos 4 perfis | `perfisLogin.ts`, `EntrarPapel.tsx`, `Painel.tsx`, `autenticacao.test.tsx`; login real com convite e TOTP | ✅ | — | — | — |
| UX/UI | Design system, arquitetura da informação, documento de telas, linguagem leiga (sem siglas na tela), tema escuro e leitura facilitada | `docs/ux-ui.md`; `styles/tokens.css`; `utils/rotulos.ts` | ✅ | — | — | — |
| UX/UI | Prompt de design com IA (etapa 6 da orientação) | `docs/prompt-design-ia.md` | ✅ | — | — | — |

## Entregas do TCC

| Pilar | Item Avaliado | Evidência/Arquivo | Status | Pendência | Responsável | Prioridade |
|---|---|---|---|---|---|---|
| Artigo | Texto v3 até a Metodologia; Resultados e discussões (N2) | `docs/tcc/artigo/artigo.md` (`npm run artigo` gera o `.docx`); `docs/tcc/artigo/n2-resultados-e-discussoes.md` | 🟡 | 18 marcadores `[PREENCHER]`/`[CONFERIR]`/`[CONFIRMAR COM O AVALIADOR]`: dados que só a dupla ou o avaliador têm | Ambos | **P1** |
| Artigo | Figuras e diagramas | `docs/tcc/artigo/figuras/` (UML pronto para impressão); `npm run artigo:telas` | ✅ | — | — | — |
| Apresentação | Roteiro da pré-banca, com dados de demonstração restauráveis | `docs/guia-de-uso-do-sistema.md` (roteiro); Ajuda → "Restaurar dados da demonstração" | ✅ | Ensaiar com os 4 perfis no navegador da apresentação | Ambos | P1 |

## Resumo

| Pilar | ✅ | 🟡 | ❌ | Conformidade geral |
|---|---|---|---|---|
| Engenharia e Configuração | 16 | 2 | 2 | **Conforme na engenharia, parcial no trabalho em dupla.** Proteção, CI e Kanban estão resolvidos. Faltam a revisão cruzada, os commits do Jean e o lint |
| Qualidade e Processos | 14 | 4 | 0 | **Conforme, com verificação manual pendente.** O banco real é testado no CI e os E2E estão feitos. Faltam NVDA, compatibilidade e o Lighthouse com sessão |
| Governança e Serviços | 11 | 4 | 0 | **Conforme, com 4 pendências.** O ambiente está publicado. Faltam a revisão de PR (C-02), o backup do plano gratuito, a tag e a FAQ na tela |
| Acessibilidade, WCAG e usabilidade | 5 | 1 | 0 | **Conforme**, com a sessão manual pendente |
| Entregas do TCC | 2 | 1 | 0 | **Parcial**: os marcadores do artigo dependem da dupla e do avaliador |

**Ações P1 (antes da pré-banca):**
- Jean faz o primeiro commit e o primeiro PR.
- Jean revisa e aprova um PR para a `main`.
- Preencher os 18 marcadores do artigo.
- Colar a senha de app do SMTP e aceitar o convite da coordenação piloto.
- Fazer o `pg_dump` da nuvem.
- Criar a tag da pré-banca.
- Atualizar o status dos cards do Kanban.
- Ensaiar o roteiro.
