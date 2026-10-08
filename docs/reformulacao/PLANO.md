# Fase 0 · Plano de entrega

**Data:** 07/10/2026 · **Premissa:** trilha **(A)** do ADR-00, aprovada em 07/10/2026.
**Prazo:** congelamento em **26/11/2026** (`docs/plano-desenvolvimento.md`). Semanas de quarta a terça, como no plano original.
**Regra do prompt mantida:** um marco só começa com o anterior verde (código + testes + capturas + ADR + resumo de uma página "o que mudou, o que falta, o que me preocupa").

## Divisão sem conflito de arquivos

| Pessoa | É dona de | Não edita sem PR do outro |
|---|---|---|
| **Geandre (frente A, dados e servidor)** | `supabase/**`, `supabase/functions/**`, `supabase/tests/**`, `packages/contratos/**`, `scripts/implantar-escola.ts`, `scripts/sondar-rls.mjs`, `apps/web/src/services/supabaseApi.ts` | `apps/web/src/pages/**`, `styles/**` |
| **Jean (frente B, interface e qualidade)** | `apps/web/src/{pages,components,layouts,styles,hooks,utils}/**`, `apps/web/e2e/**`, `apps/web/src/services/mockApi.ts` (alinhar às mesmas regras), `docs/reformulacao/screens/**` | `supabase/**`, `services/api.ts` |
| **Contrato compartilhado** | `apps/web/src/services/api.ts` e `tipos.ts`: só mudam por PR revisado pelos dois, **antes** de cada marco | — |

Branches: `feature/geandre-…` e `feature/jean-…` a partir de `development`; PR revisado pelo outro (A-01…A-05 de `docs/relatorio-de-conformidade.md` continuam pendentes e são pré-requisito do R1).

---

## R0 · Aprovação (esta semana, até 14/10)
| Item | Aceite |
|---|---|
| Dupla responde ADR-00, 04, 05, 06 (e confirma com a orientadora D-01/ADR-07) | Respostas registradas em `DECISOES.md`; ADRs aprovados viram D-19… em `docs/requisitos.md` |
| ~~Docker local~~: a máquina não roda Docker. O Supabase real é validado no CI (job `db`) | Job `db` verde após o R1 |
| ✅ TOTP gratuito e ativo em todos os projetos (verificado em 07/10, ADR-13) | — |

## R1 · Banco que nega (≙ M1) · S6–S7 · 15/10–28/10 · Geandre (Jean: testes de política em paralelo)
| Card | Entrega | Critério de aceite |
|---|---|---|
| R1.1 | `0003_escola_e_identidade.sql`: `escolas`, `membros_escola`, `convites`, `estudantes.escola_id`, `laudo_apresentado_em`; enums D-13; `vinculos` com status de ciclo de vida, `unique` parcial (ADR-02), `conferido_por/em`, `verificacao_registro` | Migration roda em PGlite **e** em `supabase db reset` |
| R1.2 | `0004_politicas_v3.sql`: remove todas as policies `for all`; helpers com `search_path = ''`; RPCs de consentimento, vínculo, validação e decisão de material; GRANT por coluna (ADR-14); uma `VIGENTE` por estudante; imutabilidade de parâmetros; consentimento em escrita e leitura (D-11); aal2 em nota clínica e administração | `scripts/sondar-rls.mjs` passa a mostrar **0 falhas** |
| R1.3 | `0005_auditoria_notificacoes.sql`: tabelas append-only, triggers, `fn_ler_notas_clinicas`, `fn_expirar_validacoes` + `pg_cron` | Inserir, atualizar ou apagar `auditoria` como qualquer papel → erro |
| R1.4 | **Suíte de políticas em Vitest** (`packages/politicas`), porque o PGlite não tem pgTAP e a máquina não roda Docker. Cada sonda S-01…S-30 vira teste **negado primeiro**; mais os 34 cenários de `mockApi.test.ts`; D1 (dois papéis → `unique_violation`); D7 (docente lendo coluna → `permission denied`). Um adaptador de conexão roda a **mesma** suíte em PGlite (local) e no Postgres do Supabase (CI) | `npm test` verde local; job `db` do CI roda a suíte contra o Supabase real |
| R1.5 | `config.toml`: signup off, senha mínima 10, TOTP on, `site_url` correto, `inactivity_timeout` | Revisado em PR |
| R1.6 | `seed.sql` atualizado (escola fictícia, 6 campos de parâmetros, sem "TEA nível 1") + `scripts/implantar-escola.ts` | `db reset` gera o cenário da demo |
| R1.7 (Jean) | Alinhar `mockApi.ts` às regras novas (M-01 versões vigentes, rascunho só do autor, confirmação do profissional) para a demo não divergir do banco | `mockApi.test.ts` com os cenários novos; 68+ testes verdes |
| **Saída** | Diagrama de classes refeito (Escola, MembroEscola, Convite, Auditoria, Notificacao, NotaClinica) | PNG/SVG em `docs/tcc/` |

## R2 · Identidade real (≙ parte do M2) · S8 · 29/10–04/11
| Card | Dono | Aceite |
|---|---|---|
| R2.1 EF `convidar` (service role; validade, uso único, reenvio invalida) | Geandre | Teste chamando a EF: docente convidando → 403; convite reutilizado → 410 |
| R2.2 Telas: entrar, aceitar convite (senha + termos versionados), recuperar e redefinir senha, ativar TOTP, desafio TOTP | Jean | axe sem violações; colar senha funciona; erro de login genérico; 390 e 1280 px capturados |
| R2.3 `supabaseApi.ts` implementando `PeiVivoApi` (sessão + estudantes + consentimento) atrás de `VITE_API=supabase` | Geandre | Os mesmos testes de contrato passam contra mock **e** contra Supabase local |
| R2.4 Guard: rota de saúde ou coordenação sem aal2 → desafio TOTP; inatividade de 30 min | Jean | Playwright: profissional sem TOTP abrindo `/estudantes/:id/notas-clinicas` vai ao desafio, e o banco nega mesmo assim |

## R3 · Ciclo no servidor (≙ M6 + M7 sem IA) · S9 · 05/11–11/11 · Geandre
| Card | Aceite |
|---|---|
| R3.1 `packages/contratos` (Zod) compartilhado entre EF e web | Mesmo schema rejeita texto > 20 000 nos dois lados |
| R3.2 EF `fechar-ciclo` (motor; RN03; RN06) | Teste direto: sem profissional → VIGENTE; com profissional → PENDENTE; sem observação → 409 |
| R3.3 EF `gerar-material` (RN01/04/05/06/08; IA desligada) | Testes diretos: sem consentimento → 403; versão PENDENTE nunca usada; revogar + gerar → 403; `docente_id` sempre o chamador |
| R3.4 Expiração RN05 | Teste de política: `fn_expirar_validacoes(now() + 8 days)` → EXPIRADA, vigente mantida, notificações criadas |
| R3.5 `supabaseApi` completo | 44 métodos; a demo roda inteira em Supabase local |

## R4 · Interface que responde à pesquisa (≙ partes de M3–M5) · S8–S10 · 29/10–18/11 · Jean
| Card | Aceite |
|---|---|
| R4.1 Navegação: inferior no celular, lateral no desktop; tela inicial agrupada por papel (ADR-03); ícones Lucide | UX-01 resolvido: conteúdo começa antes de 120 px em 390 px |
| R4.2 Linguagem: remover "RN0x" e parâmetros crus para não profissionais; `rotulos.ts` com tradução leiga do perfil | UX-03/04: nenhuma sigla RN visível fora da área do profissional (teste de texto) |
| R4.3 **Privacidade e consentimento** do responsável: quem vê o quê, quem tem acesso, quem leu nota clínica e quando, revogar, exportar, excluir | F3 e F10 de ponta a ponta no Playwright |
| R4.4 Confirmação de profissional proposto (responsável) e proposta (coordenação) | F5 no Playwright |
| R4.5 Painel da escola: cobertura de ciclos, validações atrasadas, aguardando consentimento, sem profissional; **zero dado clínico** | Teste: o painel não contém texto de observação nem nota |
| R4.6 Tema escuro e fonte para dislexia em `tokens.css`; foco do `h1` sem anel no carregamento (UX-02) | `npm run contraste` cobre os dois temas |
| R4.7 Centro de notificações (lista + contagem) | Notificações de F7/F10 aparecem para os papéis certos |
| R4.8 Observar < 60 s: escolha segmentada grande, uma tela, rascunho em memória | Playwright mede o tempo de preenchimento automatizado; o piloto mede o humano |

## R5 · Provas e endurecimento (≙ M9 reduzido) · S11 · 19/11–25/11 · ambos
| Card | Aceite |
|---|---|
| R5.1 Playwright: um caminho por perfil + **acesso indevido por URL** (docente → nota clínica, validar; responsável → rascunho) | Job `e2e` no CI |
| R5.2 axe no CI em todas as telas; sessão NVDA (roteiro de `docs/plano-de-testes.md`) | Relatório em `docs/resultados.md` |
| R5.3 Capturas finais 390/1280 em `docs/reformulacao/screens/depois/` | Uma por tela |
| R5.4 STRIDE resumido por fluxo, com o teste que cobre cada ameaça | `docs/reformulacao/AMEACAS.md` |
| R5.5 Lighthouse mobile ≥ 90 (desempenho, acessibilidade, boas práticas); CSP em `vercel.json`/host | Relatório anexado |
| R5.6 `CLAUDE.md`, `README.md`, matriz, diagramas sincronizados | Revisão cruzada |

**26/11: congelamento.** O que não estiver verde fica documentado como limitação, não é demonstrado.

## Fora da trilha (A), entram só se sobrar tempo, nesta ordem
1. Exportação/exclusão real via EF (hoje só no mock) · 2. Auditoria visível à coordenação · 3. `ProvedorIA` real · 4. Service worker do shell · 5. Página `/dev/componentes`.

## Riscos do plano
| Risco | Mitigação |
|---|---|
| Sem Docker local: diferenças entre PGlite e o Supabase real só aparecem no CI | A mesma suíte roda nos dois; o push só vale com o job `db` verde |
| TOTP não disponível no plano | ADR-13: exigir só na demo local e documentar |
| Jean sem acesso ao repositório (T-02) | Pré-requisito do R1 |
| A reescrita de policies quebra a demo | A demo continua em `mockApi` até R3.5; troca por flag |
