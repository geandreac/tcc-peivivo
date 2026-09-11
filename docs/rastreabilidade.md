# PEI Vivo — Rastreabilidade

Formato definido em aula (foto do quadro, `docs/tcc/IMG_9678.heic`):
**RF · Texto · Motivação · Decisão · Teste · Commit**.

- **Motivação** — por que o requisito existe (problema, lei, regra de negócio).
- **Decisão** — como foi resolvido: decisão `D-nn` de `docs/requisitos.md` e arquivo.
- **Teste** — o critério verificável; quando automatizado, o nome do teste.
- **Commit** — hash curto do commit que fecha o requisito. Vazio = ainda aberto.

Regra do Kanban: um card só vai para *Concluído* quando sua linha aqui tem
commit. Antes de mudar código, esta tabela diz o que a mudança impacta
(uso previsto no TCC: "sem ocorrer mudança no código, pedir para a IA
analisar os impactos dentro da estrutura do sistema").

## Requisitos funcionais

| RF | Texto | Motivação | Decisão | Teste | Commit |
|---|---|---|---|---|---|
| RF01 | Cadastrar estudante e emitir convite ao responsável | LBI: PEI exige cadastro; onboarding é da coordenação | D-08 · `fn_cadastrar_estudante` (0004) + EF `convidar-responsavel` | Sem `papel_institucional` → 403; com → estudante + vínculo na mesma transação | |
| RF02 | Registrar consentimento com trilha de auditoria | RN01/RN08 · LGPD art. 7º/8º | D-06 · tabela `auditoria` + trigger; policy do responsável sem `delete` | Revogar gera evento; `delete from consentimentos` → 403 | |
| RF03 | Observação comportamental do docente por ciclo | Perfil evolutivo — diferencial vs. Prova Adaptada | D-04 · `observacoes.papel_autor` | Insert sem consentimento ATIVO → 403 | |
| RF04 | Observações do responsável e do profissional | Três atores alimentam o perfil (§3.2) | D-03/D-04 | Responsável com `autor_id` de outro → 403 | |
| RF05 | Converter observações em parâmetros por regras determinísticas | RNF08 — não é wrapper de IA | `regras.ts` + EF `fechar-ciclo` (D-09/D-10) | `regras.test.ts` 11/11 · cobertura 98 % | `efca920`, `c35a1d9` (motor); EF pendente |
| RF06 | Submeter parâmetros à validação clínica | Lei 14.254/2021 — escola ↔ saúde | D-09 · `versoes_perfil.status_validacao = PENDENTE` | Com profissional vinculado, nova versão nasce PENDENTE | |
| RF07 | Aprovar / ajustar / expirar validação em 7 dias | RN05, RN07 | D-07 · `EXPIRADA` + job diário + `justificativa_revisao` | 8 dias sem resposta → EXPIRADA; VIGENTE anterior mantida; aparece em `pendencias_validacao` | |
| RF08 | Gerar material a partir de texto + parâmetros vigentes | Caso central — §5, domingo 21h | EF `gerar-material` (18 mensagens do diagrama de sequência) | POST retorna rascunho com `versao_perfil_id` da VIGENTE; < 60 s | |
| RF09 | Camada determinística de adaptação | RNF08 | D-10 · `adaptador.ts` no motor | Mesma entrada → mesma saída; blocos ≤ `maxLinhasPorBloco`; sem rede | |
| RF10 | Camada de IA quando habilitada | Simplificação lexical + âncora de interesse | `ProvedorIA` atrás de interface; desligável (RN06) | IA off → 200 só com camada 1; IA on → glossário presente | |
| RF11 | Revisão, edição e aprovação humana | RN04 — "e se a IA distorcer?" | D-12 · rascunho privado; `docente_aprova_ou_descarta_material` | Responsável lê RASCUNHO → 0 linhas; APROVADO → 1 | |
| RF12 | Versão web acessível + impressão | RNF03, RNF05 | D-10 · CSS a partir de `parametros` + `@media print` | axe-core 0 violações A/AA; contraste ≥ `contrasteMinimo` | |
| RF13 | Registrar desfecho | Retroalimentação (§3.1) | `desfechos` 1:1 material (`unique`) | Segundo desfecho no mesmo material → violação `unique` | |
| RF14 | RBAC + permissões granulares | RN02, RNF04, RNF09 | RLS `0002` + revisões D-11/D-12 | **Docente lê `notas_clinicas` com token válido → 0 linhas / insert → 403** (Exemplo 3) | `c35a1d9` (PoC PGlite: 0 linhas, insert barrado); teste automatizado pendente (P1.12) |
| RF15 | Exportar / excluir dados do estudante | LGPD art. 18 | D-05 · EFs `exportar-dados-estudante`, `excluir-estudante` | Docente chama `excluir-estudante` → 403; responsável → cascata + evento `EXCLUSAO` | |

## Requisitos não funcionais

| RNF | Texto | Motivação | Decisão | Teste | Commit |
|---|---|---|---|---|---|
| RNF01 | SUS ≥ 68 | Docente precisa usar de verdade (§13) | Mobile-first, fluxo < 60 s | Escala SUS no piloto (P6.5) | |
| RNF02 | Geração < 60 s | Domingo 21h em rede móvel | Cache por hash; timeout de IA 30 s com fallback | p95 de `duracaoMs` no piloto (P6.10); Playwright com throttling (P5.9) | |
| RNF03 | WCAG 2.2 AA + NBR 17225 | Público-alvo | axe-core em componentes e telas; NVDA manual | 0 violações A/AA (P6.7) | |
| RNF04 | RLS + JWT + TLS | Permissão no dado, não na tela | `0002_rls_policies.sql`; Supabase Auth | Testes RLS negativos (P1.11–P1.19) | `c35a1d9` (validação) |
| RNF05 | Cache offline de leitura | Uso em casa sem rede | Service Worker, só leitura (sem fila) | Playwright `setOffline` (P5.7) | |
| RNF06 | PWA instalável | Sem loja de apps | `vite-plugin-pwa` | Lighthouse "instalável" (M4) | |
| RNF07 | Cobertura ≥ 70 % | Manutenibilidade | `vitest.config.ts` com threshold; CI falha abaixo | `npm run test:coverage` — 98 % no motor | `efca920` |
| RNF08 | Camada determinística sem serviço externo | "Não é wrapper" | Motor puro, sem I/O; IA opcional | `regras.test.ts` roda sem rede; demo com IA desligada (M3) | `efca920` |
| RNF09 | LGPD — minimização e consentimento granular | Dado sensível de criança | D-01 (sem laudo), D-05, D-06, D-11 | Testes RN01/RN08 (P1.13) | |
| RNF10 | Serverless para pico concentrado | Domingo à noite | Edge Functions | — (arquitetural) | |

## Regras de negócio

| RN | Garantia | Teste | Commit |
|---|---|---|---|
| RN01 | `fn_tem_consentimento_ativo` em todo insert/update filho (D-11) | Insert em `observacoes` sem consentimento → 403 | |
| RN02 | `somente_profissional_acessa_nota_clinica`; laudo não existe (D-01) | Docente → 0 linhas / 403 | `c35a1d9` (PoC) |
| RN03 | `paraProximoNivel` em `regras.ts` | `regras.test.ts` "RN03" (4 testes) | `7c870c7`, `efca920` |
| RN04 | Rascunho privado (D-12) + update só docente | Responsável não lê RASCUNHO | |
| RN05 | Job diário + `EXPIRADA` (D-07) | 8 dias → EXPIRADA, VIGENTE mantida | |
| RN06 | `fechar-ciclo` decide PENDENTE vs VIGENTE pelo vínculo (D-09) | Sem profissional → VIGENTE direto | |
| RN07 | Validação só em `versoes_perfil` | Profissional `update` em materiais → 403 | |
| RN08 | Revogação bloqueia inserts imediatamente (D-11) | Revogar + POST gerar → 403 | |

## Decisões de projeto sem RF direto

| Decisão | Onde | Commit |
|---|---|---|
| Seed fictício fora de `migrations/` (nunca vai no `db push`) | `supabase/seed.sql` | `c35a1d9` |
| Validação local das migrations sem Docker (PGlite) | `scripts/validar-migrations.mjs` | `c35a1d9` |
| `gen_random_uuid()` sem extensão `pgcrypto` | `0001_core_schema.sql` | `c35a1d9` |
| Monorepo npm workspaces, TS estrito | `package.json`, `tsconfig.base.json` | `efca920` |
