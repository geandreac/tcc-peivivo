# Qualidade do produto — avaliação com referência na ISO/IEC 25010

**Versão:** 1.0 — 21/09/2026 · **Pilar:** Qualidade e Processos.
**Aviso:** a ISO/IEC 25010 é usada aqui **apenas como referência conceitual** para uma avaliação interna do TCC. Não há, nem se alega, certificação ou avaliação formal por terceiros.
**Objeto avaliado:** `apps/web` (protótipo sobre `mockApi`), `packages/motor-adaptacao`, `supabase/migrations`.
**Status:** ✅ atendido com evidência · 🟡 parcial (implementado, evidência incompleta ou backend pendente) · ⬜ não atendido / planejado · N/A.

---

## 1. Matriz por característica

| Característica de Qualidade | Aplicação no Projeto | Evidência Atual | Lacuna Identificada | Ação Necessária | Status |
|---|---|---|---|---|---|
| **Adequação funcional** — completude | RF01–RF16 do MVP (Must/Should) implementados no protótipo | `docs/matriz-rastreabilidade.md` §1: 15 de 16 RF ✅/🟡; RF10 (IA) é Could | Backend real (RLS `0004`, Edge Functions) não existe; RF10 desligado | Fases 1 e 3 do plano; manter IA como incremento | 🟡 |
| Adequação funcional — correção | Regras RN01–RN08 produzem o resultado especificado | 34 testes negativos (`mockApi.test.ts`), 30 do motor (RN03 assimétrica, cenário A) | Correção só provada no mock; RLS real sem teste | P1.11–P1.19 reaproveitando os 34 cenários | 🟡 |
| Adequação funcional — pertinência | Fluxo docente gerar → revisar → aprovar em 3 telas; desfecho em 2 toques | `docs/ux-ui.md` §1.3; HU-D.03–D.06 | Sem validação com usuários reais | Piloto (Fase 6) com T3 ≤ 60 s | 🟡 |
| **Eficiência de desempenho** — tempo | Geração < 60 s (RNF02); bundle inicial leve | `duracaoMs` instrumentado ("Gerado em 0,3 s"); build 104 kB gzip; sem web fonts | Sem medição p95 em rede móvel; sem IA ainda | P5.9 (throttling Slow 4G), P6.10 (p95 no piloto) | 🟡 |
| Eficiência — recursos | Cache por hash do texto + versão evita regerar | `mockApi.gerarMaterial`; teste `cache: mesmo texto + mesma versão → mesmo material` | Cota diária de IA não existe (Fase 5) | P5.3 | 🟡 |
| **Compatibilidade** — coexistência | Monorepo com dois workspaces isolados; motor isomórfico (cliente e Edge) | `packages/motor-adaptacao` sem I/O; `apps/web` importa via workspace | — | — | ✅ |
| Compatibilidade — interoperabilidade | Contrato `PeiVivoApi` com erros mapeados a HTTP (401/403/404/409/400); tipos espelham o schema SQL | `services/api.ts`, `services/erros.ts`, `services/tipos.ts` ↔ `0001_core_schema.sql` | `supabaseApi` não implementado; nenhum teste de contrato contra PostgREST | P4.4; teste de contrato (mesmos cenários nos dois adaptadores) | 🟡 |
| Compatibilidade — navegadores (RNF-G) | Chrome, Firefox, Safari ≥ 16.4, Edge; `<dialog>`, `:has()`, `dvh` com fallback | `docs/plano-de-testes.md` §4 (matriz vazia) | Nenhuma verificação registrada | Executar a matriz antes de M4 | ⬜ |
| **Usabilidade** — reconhecimento de adequação | Início apresenta problema/solução; portas de entrada dizem o que cada perfil faz/vê/nunca vê | `pages/Inicio.tsx`, `utils/perfisLogin.ts` | — | — | ✅ |
| Usabilidade — apreensibilidade | Ajuda, texto de exemplo, rótulos leigos, pergunta-guia por dimensão | `pages/Ajuda.tsx`, `utils/rotulos.ts`, `GerarMaterial` ("Usar texto de exemplo") | Sem ajuda contextual (`<details>`) nas telas mais densas (heurística 10, sev. 2) | Backlog Could | 🟡 |
| Usabilidade — operabilidade | Uma ação primária por tela; confirmação em ações irreversíveis; "Decidir depois" | `docs/avaliacao-heuristica.md` (0 itens sev. ≥ 3 abertos) | SUS não medido | Piloto: SUS ≥ 68 | 🟡 |
| Usabilidade — proteção contra erro | Validação no envio com resumo focável; exclusão exige nome exato; revogação com checkbox; ciclo sem observação bloqueado | `components/Feedback.tsx` (`ResumoErros`), `FecharCiclo.tsx`, `DadosLgpd.tsx` | — | — | ✅ |
| Usabilidade — estética | Design system com tokens, sem ícones decorativos, cores só semânticas | `styles/tokens.css`, `docs/ux-ui.md` §3 | Tela Estudante longa em 375 px (sev. 2) | P4.16 acordeão | 🟡 |
| Usabilidade — **acessibilidade** | WCAG 2.2 AA: 48 critérios aplicáveis, 39 ✅, 9 🟡 (verificação manual) | `docs/wcag-2.2.md`; axe-core em 21 telas/componentes; `npm run contraste` | NVDA/VoiceOver, zoom 400 % em dispositivo, W3C validator pendentes | P6.7 sessão manual | 🟡 |
| **Confiabilidade** — maturidade | 98 testes automatizados verdes; CI verde em `development` | `npm test`; GitHub Actions run de 15/09/2026 | Sem histórico de falhas por versão (não há releases) | Registrar defeitos por marco (`docs/pdca.md`) | 🟡 |
| Confiabilidade — disponibilidade | Supabase gratuito pausa após 7 dias; ping semanal no CI | `manter-supabase-ativo.yml` | Workflow `skipped` (secrets não configurados); sem ambiente publicado | P0.4; deploy de demo (P6.2) | ⬜ |
| Confiabilidade — tolerância a falhas | Todo carregamento tem estado de erro com "Tentar novamente"; falha de rede simulável; `localStorage` indisponível não quebra o mock | `hooks/useConsulta.ts`, `Feedback.tsx` (`ErroCarregamento`), `mockApi.ts` (`lerStorage` com try/catch) | Sem retry automático; sem timeout na IA ainda | Fase 5 (timeout 30 s + fallback) | 🟡 |
| Confiabilidade — recuperabilidade | "Restaurar dados da demonstração"; `git` para código; seed reproduzível em 1 comando | `pages/Ajuda.tsx`, `supabase/seed.sql` | Sem backup do projeto Supabase (não existe ainda) | Política de backup em `docs/cobit-governanca.md` C-08 | 🟡 |
| **Segurança** — confidencialidade | Permissão no dado (RLS) + mock que nega; nota clínica só do profissional; laudo não armazenado; rascunho privado | `0002_rls_policies.sql` (18 policies), `mockApi.ts`, D-01, D-12 | RLS não testada contra PostgREST com token válido | P1.12 (Exemplo 3: docente × nota clínica → 403) | 🟡 |
| Segurança — integridade | Auditoria append-only; `unique` em desfecho; um papel por usuário por estudante | `0001_core_schema.sql`, D-06, D-14; testes CONFLITO | Trigger de auditoria só na `0004` | P1.4 | 🟡 |
| Segurança — não repúdio / responsabilização | Todo evento sensível grava `autor_id` e data | `registrarAuditoria`; teste `revogar…gera evento de auditoria` | Auditoria de **leitura** fora do escopo (Won't) | — | ✅ (escopo) |
| Segurança — autenticidade | Modo demonstração sem senha (D-16) | `useSessao`, `EntrarPapel` | Sem autenticação real; sessão em `localStorage` sem expiração | P4.4 Supabase Auth (JWT, expiração, recuperação de senha) | ⬜ (planejado) |
| **Manutenibilidade** — modularidade | Separação rotas / layout / páginas / componentes / hooks / serviços / mocks / utils / estilos | `README.md` §6; nenhuma página importa `mockApi` diretamente (só `api`) | — | — | ✅ |
| Manutenibilidade — reusabilidade | 8 componentes reutilizados em 22 telas; `CabecalhoEstudante` em 12 telas | `components/` | — | — | ✅ |
| Manutenibilidade — analisabilidade | TS estrito; erros por código; rastreabilidade RF → arquivo → teste | `tsconfig.base.json`, `erros.ts`, `docs/matriz-rastreabilidade.md` | Sem ESLint; sem ADRs separados (decisões vivem em `requisitos.md` §1) | `chore: eslint`; aceitar `D-nn` como ADR | 🟡 |
| Manutenibilidade — modificabilidade | Troca `mockApi` → `supabaseApi` em um único arquivo; tipos do motor como contrato único | `services/index.ts`; CLAUDE.md ("não crie tipo paralelo") | — | — | ✅ |
| Manutenibilidade — testabilidade | Motor puro; mock sem latência em teste; `renderizarApp` renderiza o app inteiro numa rota | `vitest.config.ts`, `test/utils.tsx`; cobertura motor 97 %, web 78 % com threshold 70 % no CI | Testes de tela emitem avisos `act(...)` | Backlog cosmético | ✅ |
| **Portabilidade** — adaptabilidade | Web responsiva 320–1440 px; PWA planejada; sem dependência de SO | `styles/`, `manifest.webmanifest` | Service worker ausente (RNF05/06) | P5.6 | 🟡 |
| Portabilidade — instalabilidade | `npm install && npm run dev` sem Docker; CI reproduz em Ubuntu | `README.md` §7, `docs/guia-de-uso.md` | — | — | ✅ |
| Portabilidade — substituibilidade | Backend atrás de interface; IA atrás de `ProvedorIA` (planejado) | `services/api.ts` | — | — | ✅ |

## 2. Síntese por característica

| Característica | ✅ | 🟡 | ⬜ | Leitura |
|---|---|---|---|---|
| Adequação funcional | 0 | 3 | 0 | Completa no protótipo; depende do backend para ser "correta" no dado |
| Eficiência de desempenho | 0 | 2 | 0 | Instrumentada, não medida em campo |
| Compatibilidade | 1 | 1 | 1 | Arquitetura preparada; navegadores sem evidência |
| Usabilidade | 3 | 5 | 0 | Forte em estrutura; falta medição com pessoas |
| Confiabilidade | 0 | 3 | 1 | Testes sólidos; ambiente publicado inexistente |
| Segurança | 1 | 2 | 1 | Modelo correto; autenticação real e RLS testada pendentes |
| Manutenibilidade | 4 | 1 | 0 | Ponto mais forte do projeto |
| Portabilidade | 2 | 1 | 0 | — |

**Conclusão:** o produto tem qualidade **estrutural** alta (manutenibilidade, modularidade, acessibilidade por construção, testabilidade). As lacunas concentram-se em **evidência operacional**: autenticação real, RLS testada contra o banco, medições com usuários e em navegador real. Nenhuma lacuna exige mudança de arquitetura; todas estão em cards do plano.

## 3. Ligação com os demais documentos

- Indicadores e metas por característica: `docs/cobit-governanca.md` §2.
- Riscos associados às lacunas: `docs/gestao-de-riscos.md` (R-04, R-05, R-08, R-09).
- Ciclo de reavaliação: a cada marco, no *Check* de `docs/pdca.md`.
