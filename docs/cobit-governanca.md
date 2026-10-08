# Governança de TI — objetivos, metas e controles com referência no COBIT

**Versão:** 1.0 — 21/09/2026 · **Pilar:** Governança e Serviços.
**Aviso:** o COBIT é usado como **referência conceitual** para ligar objetivos do sistema a metas mensuráveis, riscos e controles. Não há alegação de conformidade formal. A "cascata de objetivos" foi reduzida a três níveis: objetivo do projeto → indicador com meta → controle com evidência.

---

## 1. Objetivos do projeto

| ID | Objetivo | Origem | Perfis beneficiados |
|---|---|---|---|
| O1 | Facilitar o acompanhamento evolutivo do estudante (ciclo quinzenal em 6 dimensões) | Pré-projeto §3.1; RF03–RF07 | Todos |
| O2 | Melhorar a comunicação entre familiares, professores e equipe de saúde (Lei 14.254/2021) | `validacao-da-ideia.md` §1; RF04, RF06 | Todos |
| O3 | Centralizar dados relevantes **sem** centralizar laudo/diagnóstico (minimização) | D-01; RF15 | Coordenação, família |
| O4 | Reduzir o retrabalho da docente na adaptação de material (de ~40 min para < 60 s) | RF08–RF12; RNF02 | Docente |
| O5 | Oferecer uma interface acessível (WCAG 2.2 AA) e utilizável no celular | RNF03, RNF-A, RNF-F | Todos, inclusive quem usa tecnologia assistiva |
| O6 | Garantir acesso adequado por perfil, no dado (permissão que a tela não pode burlar) | RF14, RNF04, RN01–RN08 | Todos; especialmente o estudante (titular dos dados) |
| O7 | Entregar um TCC demonstrável, rastreável e com evidências de processo | Metodologia da disciplina (3 pilares) | Dupla, orientadora, banca |

## 2. Metas e indicadores

| Objetivo | Indicador | Fórmula ou Método de Medição | Meta | Frequência | Fonte de Evidência | Responsável |
|---|---|---|---|---|---|---|
| O6 | Taxa de sucesso no login | logins concluídos ÷ tentativas (demo: sessões iniciadas ÷ cliques em perfil; real: eventos `SIGNED_IN` ÷ tentativas do Supabase Auth) | ≥ 95 % | Por sessão de piloto; mensal em produção | Logs do Supabase Auth (real); anotação do moderador (piloto) | Geandre |
| O4, O5 | Taxa de conclusão de tarefas (T1–T7) | tarefas concluídas sem ajuda ÷ tarefas propostas | ≥ 80 % por tarefa; T3 ≥ 80 % | Piloto (Fase 6) | `docs/resultados.md`; planilha de sessões | Geandre |
| O4 | Tempo médio de execução da tarefa central (T3: colar → aprovar) | mediana do cronômetro do moderador; `duracaoMs` da geração | T3 ≤ 60 s; geração p95 < 60 s | Piloto; a cada release | `docs/resultados.md`; `materiais.duracao_ms` | Jean |
| O1, O2 | Uso do ciclo | ciclos fechados com ≥ 2 papéis observando ÷ ciclos fechados | ≥ 70 % | Piloto | Consulta ao banco (seed no piloto) | Jean |
| O7 | Quantidade de erros críticos abertos | contagem de issues `incidente` P1 abertas + itens heurísticos sev. 4 abertos | 0 | Semanal | GitHub issues; `docs/avaliacao-heuristica.md` | Ambos |
| O7 | Cobertura de testes | linhas cobertas ÷ linhas (v8) por workspace | ≥ 70 % (CI falha abaixo); motor ≥ 90 % | A cada PR | Artefatos `cobertura-*` do CI; `npm run test:coverage` | Jean |
| O7 | Quantidade de falhas por versão | defeitos encontrados após a tag `v0.<n>.0` ÷ versão | ≤ 3 por marco; 0 P1 | Por marco | Issues rotuladas com a versão; `docs/pdca.md` §3 | Ambos |
| O5 | Índice de conformidade com acessibilidade | critérios WCAG AA ✅ ÷ critérios aplicáveis; violações axe | ≥ 90 % ✅ até M4 (hoje 39/48 = 81 %); 0 violações axe | Por marco | `docs/wcag-2.2.md` §5; CI (`semViolacoesAxe`) | Geandre |
| O5 | Contraste dos tokens | pares verificados ≥ 4,5:1 (texto) e ≥ 3:1 (componentes) | 100 % | A cada mudança em `tokens.css` | `npm run contraste` no CI | Geandre |
| O4, O5 | Satisfação dos usuários | SUS (10 itens, 0–100) | ≥ 68 (RNF01); ideal ≥ 75 | Piloto | Formulário SUS; `docs/resultados.md` | Geandre |
| O7 | Quantidade de incidentes | issues `incidente` por mês, por prioridade | Tendência decrescente; 0 P1 em dia de demo | Mensal | GitHub issues | Ambos |
| O7 | Tempo de resolução de incidentes | mediana (fechamento − abertura) por prioridade | P1 ≤ 1 dia útil; P2 ≤ 1 semana | Mensal | GitHub issues | Ambos |
| O7 | Evidência de processo colaborativo | % de PRs mesclados com revisão do outro integrante; commits diretos em `main`/`development` | 100 % revisados; 0 commits diretos | Semanal | GitHub (PRs, branch protection) | Geandre |
| O7 | Aderência ao cronograma | marcos entregues na data ÷ marcos planejados | ≥ 5 de 7 (M5 é incremento) | Por marco | `docs/plano-desenvolvimento.md` §12; tags | Ambos |
| O3, O6 | Incidentes de privacidade | acessos indevidos detectados (teste ou uso) | 0 | Contínua | `mockApi.test.ts`/RLS; `docs/seguranca-e-privacidade.md` §9 | Geandre |

**Linha de base em 21/09/2026:** cobertura motor 97 %, web 78 %; violações axe 0; WCAG 39/48 ✅; itens sev. ≥ 3 abertos 0; PRs revisados 0 de 0 (nenhum PR); commits diretos 12; incidentes 0 (sem uso real); SUS, tempos e taxa de sucesso: sem medição (piloto pendente).

## 3. Controles de governança

**Status:** ✅ implementado e verificável · 🟡 parcial · ⬜ pendente.

| Risco ou Necessidade | Controle | Evidência | Responsável | Periodicidade | Status |
|---|---|---|---|---|---|
| Perda ou sobrescrita de código (R-02) | **C-01 Controle de versão** — Git, repositório remoto no GitHub, `.gitignore` para segredos/gerados, `.gitattributes` (LF) | <https://github.com/geandreac/tcc-peivivo>; 12 commits; `.gitignore` | Geandre | Contínua | ✅ |
| Código não revisado em integração (R-01, R-11) | **C-02 Revisão de Pull Requests** — todo merge em `development`/`main` via PR revisado pelo outro integrante; template com checklist | `.github/pull_request_template.md`; CONTRIBUTING §7–§8; PRs no GitHub | Ambos | A cada PR | 🟡 regra definida; **nenhum PR até 21/09** |
| Commit direto em branch estável (R-02) | **C-03 Proteção de branches** — ruleset em `main` e `development`: PR obrigatório, status checks `motor`/`db`/`web`, sem force push, sem bypass | GitHub → Settings → Branches (API pública: `protected: false` em 21/09) | Geandre | Uma vez + auditoria por marco | ⬜ |
| Regressão funcional/acessibilidade (R-04) | **C-04 Testes antes do merge** — CI obrigatório: typecheck, 98 testes (axe em toda tela), cobertura ≥ 70 %, build, contraste, migrations em Supabase real | `.github/workflows/ci.yml`; execução verde em `development` (15/09) | Jean (funcionais) / Geandre (a11y) | A cada push/PR | ✅ (obrigatoriedade depende de C-03) |
| Acesso indevido entre perfis (R-06) | **C-05 Controle de acesso por perfil no dado** — matriz v2 aplicada na camada de serviços (mock) e em RLS (`0002` + `0004`); cada bloco de teste começa pelo NEGADO | `mockApi.test.ts` (34), `paginas.test.tsx › Caminhos negados`, `0002_rls_policies.sql` (18 policies) | Geandre | A cada PR que toca permissão | 🟡 mock ✅; RLS real ⬜ (M1) |
| Vazamento de dado pessoal/sensível (R-07) | **C-06 Tratamento de dados pessoais** — sem laudo/diagnóstico (D-01); consentimento granular e revogável (RN01/RN08); nota clínica isolada (RN02); exportação/exclusão (RF15); dados de dev 100 % fictícios; política escrita | `docs/seguranca-e-privacidade.md`; `seed.sql`/`mocks/dados.ts` (cabeçalho fictício); testes RN01/RN02/RF15 | Geandre | Contínua; revisão por marco | ✅ (política) / 🟡 (backend) |
| Segredos no repositório (R-07) | **C-07 Gestão de segredos** — `.env*` ignorado; `.env.example` só com placeholders; secrets do CI no GitHub; chave `service_role` nunca no cliente | `.gitignore`; `.env.example`; `manter-supabase-ativo.yml` usa `secrets.*`; grep sem ocorrências (diagnóstico) | Geandre | A cada PR (checklist) | ✅ |
| Perda de dados do ambiente (R-02, R-10) | **C-08 Backup** — código: Git remoto; banco: migrations + seed reproduzem o estado em 1 comando; projeto Supabase: backup diário automático do plano (quando existir) + `pg_dump` antes de cada demo; documentação no repositório | `supabase/migrations`, `seed.sql`, `npm run db:validar` | Geandre | Demo: antes de cada; produção: diário | 🟡 (sem projeto cloud ainda) |
| Falhas sem tratamento (R-10) | **C-09 Gestão de incidentes** — catálogo, prioridades P1–P3, prazos, canal (issues), registro de recorrentes | `docs/itil-servicos.md` §2, §4 | Ambos | Contínua | ✅ (processo) / ⬜ (rótulos no GitHub) |
| Mudanças sem rastro (R-13) | **C-10 Registro de mudanças** — Conventional Commits; um card por PR; `docs/rastreabilidade.md` com hash; decisões `D-nn`; tags por marco; `docs/pdca.md` §3 | CONTRIBUTING §6; `rastreabilidade.md`; `requisitos.md` §1 | Ambos | A cada PR / marco | 🟡 (tags ⬜) |
| Conhecimento concentrado numa pessoa (R-11) | **C-11 Documentação** — README, CONTRIBUTING, guias de uso, requisitos, plano, testes, acessibilidade, governança; documentação atualizada no mesmo PR | `docs/` (25 documentos); checklist do PR | Geandre | A cada PR | ✅ |
| Barreiras de acessibilidade (R-08) | **C-12 Auditoria de acessibilidade** — axe em toda tela/componente (automático); contraste numérico; checklist manual por tela; sessão NVDA por marco; heurística sem sev. ≥ 3 aberta | `test/utils.tsx`; `scripts/contraste.mjs`; `plano-de-testes.md` §3; `wcag-2.2.md`; `avaliacao-heuristica.md` | Geandre | Auto: a cada PR; manual: por marco | 🟡 (manual pendente) |
| Escopo estourar o prazo (R-03, R-12) | **C-13 Gestão de escopo** — MoSCoW; Fase 5 como incremento; freeze em 26/11; WIP ≤ 2 por pessoa; Kanban | `requisitos.md` §11.3; `plano-desenvolvimento.md` §0; `scripts/criar-kanban.sh` | Ambos | Checkpoint semanal | 🟡 (Kanban ⬜) |
| Dependência externa indisponível (R-14) | **C-14 Contingência de demonstração** — IA desligada por padrão; `npm run dev` local com mock; ping do Supabase; vídeo de backup | README §14; `manter-supabase-ativo.yml`; P7.3 | Ambos | Antes de cada demo | 🟡 |
| Riscos não monitorados | **C-15 Gestão de riscos** — registro com probabilidade × impacto, resposta, dono; revisão por marco | `docs/gestao-de-riscos.md` | Ambos | Por marco | ✅ |

## 4. Papéis e responsabilidades (RACI simplificado)

| Atividade | Geandre | Jean | Orientadora |
|---|---|---|---|
| Arquitetura, permissões, backend, acessibilidade, documentação | R/A | C | I |
| Telas, mocks, estados, responsividade, testes funcionais | C | R/A | I |
| Revisão de PR | R (dos PRs de Jean) | R (dos PRs de Geandre) | — |
| Promoção `development → main` e tag | A | R | I |
| Gestão de riscos e indicadores | R | C | C |
| Aprovação de marco | C | C | A |
| Piloto (recrutamento, sessões, SUS) | R | R | C |

R = responsável · A = aprova · C = consultado · I = informado.

## 5. Ciclo de avaliação da governança

1. **Por PR:** checklist do template (controles C-02, C-04, C-06, C-07, C-10, C-11, C-12 automático).
2. **Semanal (checkpoint):** indicadores de processo (PRs revisados, commits diretos, incidentes abertos, WIP).
3. **Por marco:** tabela de controles reavaliada; indicadores de produto (cobertura, WCAG, defeitos por versão); atualização de `docs/pdca.md` e `docs/gestao-de-riscos.md`; PR `development → main` + tag.
4. **Fim do projeto:** `docs/checklist-final-tcc.md` consolidado com evidências para a banca.

## 6. Pendências de governança em 21/09/2026 (priorizadas)

| # | Pendência | Controle | Ação | Responsável | Prazo sugerido |
|---|---|---|---|---|---|
| 1 | `main`/`development` sem proteção | C-03 | Criar rulesets no GitHub | Geandre | S3 (até 24/09) |
| 2 | Nenhum PR; commits diretos | C-02, C-10 | Esta auditoria entra por PR `docs/governanca-e-processos` revisado por Jean; daqui em diante só PR | Ambos | S3 |
| 3 | Jean sem acesso/commit | C-11, R-11 | Adicionar como colaborador; primeiro PR de Jean (P4.19 ou badge de pendências) | Geandre / Jean | S3 |
| 4 | Kanban não criado | C-13 | `bash scripts/criar-kanban.sh geandreac/tcc-peivivo` com `gh` autenticado | Geandre | S3 |
| 5 | Secrets do CI não configurados; projeto Supabase dev inexistente | C-08, C-14 | P0.4 | Geandre | S3 |
| 6 | Rótulos de incidente/requisição inexistentes | C-09 | Criar 7 rótulos | Jean | S3 |
| 7 | Sem tag/release | C-10 | Tag `v0.2.0` ao mesclar esta auditoria em `main` (marco "protótipo + governança") | Geandre | S3 |
