# Gestão de riscos

**Versão:** 1.0 — 21/09/2026 · **Pilar:** Governança e Serviços.
**Consolida** os riscos do pré-projeto (§10), de `docs/plano-desenvolvimento.md` §11 e os achados do `docs/diagnostico-inicial.md`. Revisão a cada marco (M1…M6) no *Check* de `docs/pdca.md`.

## 1. Escala

| Probabilidade | Significado | Impacto | Significado |
|---|---|---|---|
| **Baixa (1)** | < 25 % de chance até a defesa | **Baixo (1)** | Atraso < 1 semana ou perda cosmética; sem efeito na banca |
| **Média (2)** | 25–60 % | **Médio (2)** | Atraso de 1–2 semanas ou perda de uma evidência/funcionalidade Should |
| **Alta (3)** | > 60 % ou já ocorrendo | **Alto (3)** | Compromete um marco, uma funcionalidade Must, a demonstração ou a segurança/privacidade |

**Nível de risco** = probabilidade × impacto: **1–2 Baixo** · **3–4 Médio** · **6–9 Alto**.
**Estratégias:** Evitar · Mitigar · Transferir · Aceitar.

## 2. Registro de riscos

| ID | Risco | Categoria | Probabilidade | Impacto | Nível de Risco | Estratégia de Resposta | Plano de Mitigação | Responsável | Status |
|---|---|---|---|---|---|---|---|---|---|
| R-01 | **Conflitos de merge** entre os dois integrantes (mesmos arquivos: `pages/`, `services/`, `rastreabilidade.md`) | Configuração | Média (2) | Médio (2) | **Médio (4)** | Mitigar | Divisão por área (CONTRIBUTING §11); um card por branch; rebase diário; PRs < 400 linhas; tabelas de rastreabilidade editadas só na própria linha; resolução em par quando envolve código do outro | Ambos | Aberto — controle definido, sem ocorrência ainda |
| R-02 | **Perda de código** (máquina, force push, branch apagada) | Configuração | Baixa (1) | Alto (3) | **Médio (3)** | Mitigar | Repositório remoto; push diário; proteção contra force push em `main`/`development` (C-03, pendente); `--force-with-lease` apenas em branch própria | Geandre | Aberto — proteção pendente |
| R-03 | **Atraso no cronograma**: Fase 1 (RLS `0004`) prevista para S2 (17/09) não começou; Fases 3 e 4 (backend, `supabaseApi`) dependem dela | Cronograma | Alta (3) | Alto (3) | **Alto (9)** | Mitigar | Replanejar: Fase 1 na S3–S4; Fase 5 (IA, offline) fica como incremento cortável; freeze em 26/11 mantido; demo com IA desligada já existe (protótipo) — a defesa não depende da IA; checkpoint semanal com burn-down de cards | Ambos | **Aberto — em tratamento** |
| R-04 | **Falta de testes contra o backend real** — RF14/RNF04 provados só no mock; a prova "403 com token válido" não existe | Qualidade | Alta (3) | Alto (3) | **Alto (9)** | Mitigar | Os 34 cenários do mock são a especificação; P1.11–P1.19 reexecutam contra PostgREST; teste de contrato garante que `supabaseApi` e `mockApi` respondem igual | Geandre | Aberto |
| R-05 | **Falhas de login** no ambiente real (Supabase Auth: convite, rate limit, sessão expirada) ou na demo (perfil não carrega) | Funcional | Média (2) | Alto (3) | **Alto (6)** | Mitigar | Demo: `autenticacao.test.tsx` (7 testes) + "Restaurar dados"; real: testes de login inválido/recuperação (TF-46/47), mensagens acessíveis (3.3.8), contingência local | Geandre | Aberto (demo mitigado) |
| R-06 | **Acesso indevido entre perfis** (docente lê nota clínica; responsável vê rascunho; escrita sem consentimento) | Segurança | Baixa (1) | Alto (3) | **Médio (3)** | Evitar | Permissão no dado (RLS) + camada de serviços que nega; cada bloco de teste começa pelo NEGADO; auditoria; incidente P1 com interrupção imediata (`itil-servicos.md` §2) | Geandre | Aberto — mitigado no mock; RLS real pendente |
| R-07 | **Dados sensíveis** (educacionais/terapêuticos de criança) expostos ou tratados sem base legal | Privacidade / LGPD | Baixa (1) | Alto (3) | **Médio (3)** | Evitar | Sem laudo/diagnóstico (D-01); consentimento granular revogável (RN01/RN08); nota clínica isolada (RN02); exportar/excluir (RF15); dados de desenvolvimento 100 % fictícios; sem segredos no repo; política em `seguranca-e-privacidade.md` | Geandre | Aberto — controles implementados |
| R-08 | **Baixa acessibilidade** não detectada por ferramentas (leitor de tela, zoom real, contraste renderizado) | Acessibilidade | Média (2) | Alto (3) | **Alto (6)** | Mitigar | axe em toda tela (auto); contraste numérico; 9 critérios WCAG 🟡 fechados na sessão NVDA (P6.7) antes de M4; checklist §3.2; heurística de acompanhamento | Geandre | Aberto |
| R-09 | **Incompatibilidade mobile/navegador** (`<dialog>`, `:has()`, `dvh` em Safari antigo; reflow em 320 px) | Compatibilidade | Média (2) | Médio (2) | **Médio (4)** | Mitigar | Fallbacks documentados (`plano-de-testes.md` §4); Playwright 375×812 (P4.19); teste em celular real antes de cada marco | Jean | Aberto |
| R-10 | **Indisponibilidade de serviço** na demonstração (Supabase pausado, hospedagem fora, rede da sala) | Operacional | Média (2) | Alto (3) | **Alto (6)** | Mitigar + Aceitar residual | Ping bi-semanal (secrets pendentes); teste 48 h antes; `npm run dev` local com mock como contingência; vídeo gravado (P7.3); materiais já gerados no seed | Geandre | Aberto — contingência local já existe |
| R-11 | **Falha de comunicação entre integrantes** — todos os commits são de um integrante; conhecimento concentrado | Equipe | Alta (3) | Médio (2) | **Alto (6)** | Mitigar | Checkpoint semanal fixo (terça, 30 min); divisão por área; Jean como colaborador com primeiro PR na S3; revisão cruzada obrigatória (só ela força a leitura do código do outro); documentação completa para reduzir dependência | Ambos | **Aberto — em tratamento** |
| R-12 | **Escopo excessivo** (IA real, offline, PWA, Flesch, indicadores) | Escopo | Média (2) | Alto (3) | **Alto (6)** | Evitar | MoSCoW com Won't explícito; Fase 5 como incremento; corte de HU-C.05; critério: nada entra sem card + teste + rastreabilidade | Ambos | Aberto — controlado |
| R-13 | **Falta de evidências de processo para a banca** (0 PRs, sem Kanban, sem proteção de branch, sem tags) | Governança | Alta (3) | Médio (2) | **Alto (6)** | Mitigar | Pendências de `cobit-governanca.md` §6 (prazo S3); checklist `checklist-final-tcc.md`; capturas do GitHub (PRs, Actions, rulesets) em `docs/evidencias/` | Geandre | **Aberto — em tratamento** |
| R-14 | **Dependências externas indisponíveis** (provedor de IA, npm, GitHub Actions, Supabase CLI) | Dependências | Baixa (1) | Médio (2) | **Baixo (2)** | Aceitar + contingência | IA desligada por padrão com fallback determinístico (RN06); `package-lock.json` versionado; CI reproduzível; PGlite substitui Docker/Supabase local | Ambos | Aberto |
| R-15 | **Vulnerabilidades em dependências de desenvolvimento** (`npm audit`: esbuild, vitest, react-router) | Segurança | Média (2) | Baixo (1) | **Baixo (2)** | Aceitar + monitorar | Não afetam o build de produção; `npm audit` a cada marco; atualizar em `chore:` quando houver versão sem breaking change | Jean | Aberto |
| R-16 | **Sem participantes para o piloto** (sem escola parceira) | Validação | Média (2) | Médio (2) | **Médio (4)** | Mitigar | Recrutamento individual (3 docentes mínimo, contatos da dupla e da orientadora); estudante fictício elimina exigência ética de dado real; se falhar, avaliação heurística externa (2 avaliadores) como evidência substituta | Ambos | Aberto |
| R-17 | **Custo por chamada de IA** na Fase 5 | Custo | Baixa (1) | Baixo (1) | **Baixo (1)** | Mitigar | Cache por hash; cota diária; IA desligada em dev | Geandre | Aberto (Fase 5) |

## 3. Mapa de calor (21/09/2026)

| Impacto ↓ / Probabilidade → | Baixa (1) | Média (2) | Alta (3) |
|---|---|---|---|
| **Alto (3)** | R-02, R-06, R-07 | R-05, R-08, R-10, R-12 | **R-03, R-04** |
| **Médio (2)** | R-14 | R-01, R-09, R-16 | **R-11, R-13** |
| **Baixo (1)** | R-17 | R-15 | — |

**Riscos altos (≥ 6):** R-03, R-04, R-05, R-08, R-10, R-11, R-12, R-13 — todos com plano e dono; R-03, R-11 e R-13 estão *em tratamento* a partir desta auditoria (replanejamento, colaboração via PR, evidências).

## 4. Plano de resposta consolidado (próximas 2 semanas)

| Ordem | Ação | Riscos atacados | Responsável | Prazo |
|---|---|---|---|---|
| 1 | Proteger `main`/`development`; adicionar Jean; criar Kanban; rótulos de incidente | R-02, R-11, R-13 | Geandre | S3 |
| 2 | Abrir esta auditoria como PR e obter revisão de Jean (primeira evidência de revisão cruzada) | R-11, R-13 | Ambos | S3 |
| 3 | Iniciar Fase 1: migration `0004` + primeiros testes RLS negativos (docente × nota clínica) | R-03, R-04, R-06 | Geandre | S3–S4 |
| 4 | Jean: Playwright golden path 375×812 (P4.19) | R-09, R-08 | Jean | S4 |
| 5 | Projeto Supabase dev + secrets do CI + teste do ping | R-10 | Geandre | S3 |
| 6 | Sessão NVDA nas 6 telas principais (antecipar parte do P6.7) | R-08 | Geandre | S5 |

## 5. Revisão

| Data | Revisor | Mudanças |
|---|---|---|
| 21/09/2026 | Auditoria metodológica | Criação; 17 riscos; R-03, R-11, R-13 elevados a Alto com base no diagnóstico |
| (próxima) M1 | Dupla | Reavaliar R-03/R-04 após a Fase 1 |
