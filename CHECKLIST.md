# Checklist de qualidade: PEI Vivo

**Primeira auditoria:** 26/10/2026, somente leitura, no branch `audit/integracoes`.
**Revisão depois das correções:** 26/10/2026, no branch `chore/deps-breaking`, que contém `audit/integracoes` mais as atualizações com quebra. O que mudou em cada item, commit por commit, está em `CORRECOES.md`.

Valores de `.env` não foram lidos nem exibidos. Nada foi executado contra o Supabase da nuvem nem contra a Vercel, com uma exceção registrada em `CORRECOES.md`: a restauração e o keep-alive do projeto, feitos a pedido do usuário antes desta rodada.

## Etapa 0: mapeamento

O projeto é um monorepo npm workspaces (Node v24.15.0 local, Node 20 no CI, npm 11.12.1) com:
- **`apps/web`:** React 18.3.1 + Vite 8.3.5 + React Router 7.18.4, TypeScript 5.9.3 em modo `strict`.
- **`packages/contratos`:** Zod 4.6.7.
- **`packages/motor-adaptacao`:** domínio puro.
- **`packages/funcoes`:** casos de uso das Edge Functions, com portas injetadas.
- **`packages/politicas`:** testes de RLS em PGlite e, no CI, no Supabase real.
- **`supabase/`:** 11 migrations, seed fictício e 3 Edge Functions Deno.

Ferramentas de qualidade: Vitest 4.1.12, Playwright 1.64.1, ESLint 9 (typescript-eslint, react-hooks, jsx-a11y) e Prettier, este só configurado. CI em `.github/workflows/ci.yml` com 5 jobs, mais o keep-alive. Deploy: Vercel (front, a partir de `main`) e Supabase Cloud (banco e Edge Functions, via CLI e painel).

Arquitetura em camadas: telas → `PeiVivoApi`, com `services/mock/*` e `services/supabase/*` → PostgREST/RLS ou Edge Function → caso de uso → RPC `security definer`.

---

## 1. Resumo executivo

| Categoria | OK | PARCIAL | FALHA | N/A | NÃO VERIF. | Antes (OK/P/F/NA/NV) |
|---|---|---|---|---|---|---|
| 1. Organização e arquitetura | 7 | 0 | 0 | 0 | 0 | 3/3/1/0/0 |
| 2. Frontend | 8 | 2 | 0 | 0 | 0 | 7/3/0/0/0 |
| 3. Backend | 5 | 4 | 0 | 0 | 0 | 3/5/1/0/0 |
| 4. Banco de dados | 5 | 2 | 0 | 0 | 1 | 4/3/0/0/1 |
| 5. Integrações | 5 | 1 | 0 | 0 | 0 | 4/2/0/0/0 |
| 6. Segurança | 5 | 3 | 0 | 1 | 0 | 4/2/2/1/0 |
| 7. Testes e qualidade | 4 | 0 | 0 | 0 | 0 | 2/1/1/0/0 |
| 8. Infra, CI/CD e observabilidade | 2 | 3 | 0 | 0 | 0 | 1/3/1/0/0 |
| 9. Documentação | 3 | 0 | 0 | 0 | 0 | 1/2/0/0/0 |
| **Total (61 itens)** | **44** | **15** | **0** | **1** | **1** | **29/24/6/1/1** |

### Os 5 maiores riscos que restam

1. **CSP validada só localmente** (6.4). O build de produção, servido com os mesmos cabeçalhos, passou sem violações nos dois modos. Falta a prova numa preview real da Vercel, que é a única que exercita o Supabase de verdade.
2. **Sem monitoramento nem alertas de erro** (8.4). O keep-alive funciona (PR #110, "ping ok"), mas nenhuma ferramenta avisa se o site ou as Edge Functions caírem.
3. **Edge Functions da nuvem desatualizadas.** O código novo (timeout, requestId, compensação do convite, zod 4) só vale depois de `functions deploy`, e as migrations 0010/0011 só valem depois de `db push`. As duas ações dependem do usuário.
4. **JWT no `localStorage`** (2.9). O risco caiu com a CSP, mas não sumiu. Trocar por cookie HttpOnly exigiria um backend próprio, fora do escopo do Supabase.
5. **Listagens menores sem paginação** (3.8). Estudantes, vínculos, ciclos, versões, notificações e pendências ainda fazem uma consulta só. Acima de 1000 linhas, o PostgREST cortaria o resultado. Hoje o volume é pequeno.

---

## 2. Tabelas por categoria

As linhas marcadas com ▲ melhoraram nesta rodada.

### 1. Organização e arquitetura

| Item | Status | Antes | Evidência | Observação |
|---|---|---|---|---|
| 1.1 Estrutura de pastas | OK | OK | `apps/`, `packages/`, `supabase/`; `services/mock/*` e `services/supabase/*` por agregado | — |
| 1.2 Separação de responsabilidades | OK | OK | 26 de 27 telas via `useConsulta`/`useMutacao`; regras no banco e no motor; Edge Functions finas | — |
| 1.3 Acoplamento e SOLID ▲ | OK | PARCIAL | `supabaseApi.ts` 665 → 40 linhas (montagem) + `services/supabase/*` (≤ 129 linhas cada); `mockApi.ts` ≈ 920 → 41 + `services/mock/*` (o maior é `contexto.ts`, com 311) | commits `b94b358`, `03f50d8`; interface pública intacta |
| 1.4 Duplicação, código morto, TODOs ▲ | OK | PARCIAL | Tabela SQLSTATE única (`CODIGO_DO_SQLSTATE`, `packages/contratos/src/index.ts`); prazos 5/7/15 dias em constantes; `playwright-core` removido; nenhum TODO | A regra do painel existe no SQL (`0011`) e no mock por desenho; o teste `resumo-escola.test.ts` garante os mesmos números |
| 1.5 Nomenclatura | OK | OK | snake_case no SQL, camelCase em português no TS | — |
| 1.6 Configuração centralizada ▲ | OK | PARCIAL | `MS_POR_DIA`, `DIAS_*`, `LIMITE_*`, `ORIGEM_PADRAO_DEV` e `TIMEOUT_IA_MS` em `@pei-vivo/contratos`; `http.ts` e `convidar/index.ts` usam `ORIGEM_PADRAO_DEV` | — |
| 1.7 ESLint/Prettier ▲ | OK | FALHA | `eslint.config.mjs`; `npm run lint` → 0 problemas; passo no CI (`ci.yml:149`); `.prettierrc`/`.prettierignore` | O Prettier está configurado, mas a reformatação de cerca de 92 arquivos foi adiada (ver "Depende de mim") |

### 2. Frontend

| Item | Status | Antes | Evidência | Observação |
|---|---|---|---|---|
| 2.1 Componentes pequenos, lógica em hooks | OK | OK | maior tela com 287 linhas; `hooks/` | — |
| 2.2 Estado | OK | OK | contextos `useSessao` e `useEstudante` | — |
| 2.3 API centralizada, erro e loading | OK | OK | `services/index.ts` (`iniciarApi`); `ErroApi`; `useConsulta` | — |
| 2.4 Rotas protegidas | OK | OK | `RotaProtegida.tsx:14-15`; **novo:** `utils/destino.ts` aceita só destino interno depois do login (9 testes) | — |
| 2.5 Validação no cliente | OK | OK | `Campo` + `ResumoErros`; **novo:** `maxLength` em evidência, desfecho e nota clínica (`LIMITE_*`) | O servidor revalida (Zod `.strict()` e `check` da 0010) |
| 2.6 Responsividade | OK | OK | E2E 390/1280 px "sem rolagem lateral": 20/20 | — |
| 2.7 Acessibilidade | OK | OK | axe em 181 testes web; `jsx-a11y` no lint; contraste 78/78 | NVDA pendente |
| 2.8 Performance ▲ | OK | PARCIAL | `React.lazy` em 29 rotas (`routes/index.tsx`); mock e supabase-js por `import()`; chunk principal **730,40 → 254,57 kB** (gzip 205,72 → 83,68); sem o aviso de 500 kB; logo de 269.864 B → 34.072 B (WebP) | No build real, o mock não é baixado (conferido no navegador) |
| 2.9 Sem console.log, sensíveis no storage ou chaves | PARCIAL | PARCIAL | sem `console.*` no app; chave anon pública por desenho; JWT no `localStorage` (`services/index.ts:24`) | Risco reduzido pela CSP (6.4) |
| 2.10 Dependências desatualizadas ou sem uso ▲ | PARCIAL | PARCIAL | `npm audit` 0; `playwright-core` removido; `npm outdated`: react 18 → 19, typescript 5.9 → 7, vitest 4 → 5, jsdom 25 → 30, lucide 0.441 → 1.x | Nenhuma das pendentes tem vulnerabilidade conhecida |

### 3. Backend (Edge Functions + RPCs)

| Item | Status | Antes | Evidência | Observação |
|---|---|---|---|---|
| 3.1 Rotas RESTful | PARCIAL | PARCIAL | só `POST`; códigos de status padronizados; contrato documentado em `README.md` §8.2 | Estilo RPC, sem versionamento de rota |
| 3.2 Validação de entrada | OK | OK | Zod `.strict()`; ids com `z.guid()` (aceita o que o Postgres aceita) | — |
| 3.3 Erros centralizados | OK | OK | `http.ts`; `deErroBanco` com a tabela única | — |
| 3.4 Camadas e DI | OK | OK | portas injetadas; nova porta `desfazerNoAuth` | — |
| 3.5 Logging estruturado ▲ | OK | PARCIAL | `requestId` em todo log e no header `x-request-id` (`http.ts:74`); 500 registra `tipo` e `code`, nunca a mensagem; testes em `http.test.ts` | — |
| 3.6 Timeout, retentativa e falha ▲ | PARCIAL | PARCIAL | `fetch` com `AbortSignal.timeout(10 000)` nos dois clientes (`http.ts:29-35`), testado; IA com 30 s | Sem retentativa automática: as operações são idempotentes ou dão conflito explícito |
| 3.7 Idempotência ▲ | OK | PARCIAL | `pg_advisory_xact_lock` no cache (`0010:49`); convite com compensação (`convidar.ts:71`); fechar-ciclo com `for update` | A corrida real entre duas conexões só roda no CI (`limites.test.ts`) |
| 3.8 Paginação e limites ▲ | PARCIAL | FALHA | `fn_resumo_escola` (`0011:14`); `fn_listar_auditoria` com `p_limite`/`p_deslocamento`; `paginado()` em observações, materiais e auditoria (lotes de 1000); "Carregar mais" em 2 telas | Estudantes, vínculos, ciclos, versões, notificações e pendências ainda fazem consulta única (risco 5) |
| 3.9 Configuração por ambiente | PARCIAL | PARCIAL | `VITE_API`; variáveis documentadas no README §8.1 | Sem homologação |

### 4. Banco de dados

| Item | Status | Antes | Evidência | Observação |
|---|---|---|---|---|
| 4.1 Schema e constraints ▲ | OK | PARCIAL | `0010`: `check` de tamanho nos 3 textos livres; `limites.test.ts` (1 MB recusado, inclusive para o service role) | — |
| 4.2 Índices | OK | OK | `0008`; teste "toda FK tem índice" | — |
| 4.3 Queries parametrizadas e N+1 | OK | OK | sem SQL dinâmico; painel agregado no banco (`0011`) | — |
| 4.4 Transações | OK | OK | RPCs atômicas; trava consultiva na 0010 | — |
| 4.5 Migrations reversíveis | PARCIAL | PARCIAL | 0001–0011 aplicam no PGlite (`db:validar`) | Só para frente |
| 4.6 Menor privilégio | OK | OK | `fn_resumo_escola` e a nova `fn_listar_auditoria` com GRANT só para `authenticated` (`0011`) | — |
| 4.7 Pool de conexões | NÃO VERIFICÁVEL | NÃO VERIFICÁVEL | gerenciado pelo Supabase | painel |
| 4.8 Backup e dados sensíveis | PARCIAL | PARCIAL | senha delegada ao Auth; nota clínica em texto puro | Backup de dados não confirmado |

### 5. Integrações

| Item | Status | Antes | Evidência | Observação |
|---|---|---|---|---|
| 5.1 Inventário | OK | OK | `AUDITORIA.md` §1.2 | — |
| 5.2 Contrato por schema | OK | OK | Zod 4 nas fronteiras | — |
| 5.3 Autenticação e credenciais | OK | OK | `autoRefreshToken`; 401 do gateway → `NAO_AUTENTICADO` | — |
| 5.4 Timeout, backoff e circuit breaker ▲ | PARCIAL | PARCIAL | timeout de 10 s no banco e no Auth (novo) e de 30 s na IA | Sem backoff nem circuit breaker; rate limit só do Auth |
| 5.5 Logs e rastreabilidade ▲ | OK | PARCIAL | `requestId` no log e no header; trilha de auditoria no banco | — |
| 5.6 Testes de sucesso, falha, timeout e payload | OK | OK | `funcoes` 75; `supabaseApi.test.ts` 50 testes simulados; contrato real no CI | — |

### 6. Segurança

| Item | Status | Antes | Evidência | Observação |
|---|---|---|---|---|
| 6.1 Segredos fora do repositório | OK | OK | `.gitignore:5-7`; histórico sem segredos | — |
| 6.2 AuthN/AuthZ e IDOR | OK | OK | RLS 15/15; 133 testes de política | — |
| 6.3 Injeção, XSS, CSRF, SSRF, path traversal | OK | OK | sem SQL dinâmico nem `innerHTML`; **novo:** guarda contra open redirect (`utils/destino.ts`) | — |
| 6.4 CORS, cabeçalhos e HTTPS ▲ | PARCIAL | FALHA | `apps/web/vercel.json:9` (CSP sem `unsafe-inline`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`); build servido com os cabeçalhos: demo 20 E2E e 0 violações; real renderiza e 0 violações; controle com script inline bloqueado e reportado | Fica PARCIAL até a validação numa preview da Vercel |
| 6.5 Rate limiting e força bruta | PARCIAL | PARCIAL | `config.toml:197-207` | Nuvem no painel; Edge Functions sem limite por usuário |
| 6.6 Hash de senha e sessão | PARCIAL | PARCIAL | Auth (bcrypt); `jwt_expiry` 3600 | Limite de sessão indisponível no plano gratuito |
| 6.7 Upload | N/A | N/A | — | — |
| 6.8 Dependências vulneráveis ▲ | OK | FALHA | `npm audit`: **15 → 0**; `npm audit --omit=dev`: **5 → 0** | commits `2b97608`, `356c2e9`, `b3d8032`, `024233e` |
| 6.9 Mensagens de erro | OK | OK | `deErroBanco`, `traduzirErro`, `http.ts` | — |

### 7. Testes e qualidade

| Item | Status | Antes | Evidência | Observação |
|---|---|---|---|---|
| 7.1 Lint, build e testes ▲ | OK | PARCIAL | lint 0 problemas; build sem aviso; `npm test` 433 passaram + 13 pulados; E2E 20 | — |
| 7.2 Cobertura ▲ | OK | FALHA | `test:coverage` exit 0: funções 99,06 % de linhas; motor 99,4 %; web 84,73 % de linhas e 81,09 % de funções (limite de 70 %) | Sem excluir arquivo e sem baixar limite |
| 7.3 Determinísticos | OK | OK | dublês, PGlite, E2E em modo mock | — |
| 7.4 Tipagem nas fronteiras | OK | OK | `strict` + Zod | — |

### 8. Infraestrutura, CI/CD e observabilidade

| Item | Status | Antes | Evidência | Observação |
|---|---|---|---|---|
| 8.1 CI com lint, testes e build ▲ | OK | PARCIAL | `ci.yml:149` (`npm run lint`); `ci.yml:111` (`deno check` também em `convidar`) | A primeira execução desses passos será no PR |
| 8.2 Deploy reproduzível | PARCIAL | PARCIAL | Vercel por git; `IMPLANTACAO.md` | Deploy das Edge Functions e configuração do Auth manuais |
| 8.3 Variáveis documentadas e ambientes ▲ | PARCIAL | PARCIAL | `README.md` §8.1 (nomes, uso, se são públicas) | Sem homologação |
| 8.4 Health, monitoramento e alertas ▲ | PARCIAL | FALHA | keep-alive corrigido e ativo (PR #110 mesclado; run `40400245495` "ping ok"); `requestId` nos logs | Sem monitor externo nem alerta de erro |
| 8.5 Git | OK | OK | Conventional Commits; `main` protegida | — |

### 9. Documentação

| Item | Status | Antes | Evidência | Observação |
|---|---|---|---|---|
| 9.1 README ▲ | OK | PARCIAL | §8.1 variáveis de ambiente; §9 scripts com as contagens atuais | — |
| 9.2 API e schema ▲ | OK | PARCIAL | `README.md` §8.2: rota, entrada, saída, quem pode e tabela HTTP/código; diagrama de classes | Tabela em vez de OpenAPI (sem dependência nova) |
| 9.3 Decisões e comentários "por quê" | OK | OK | D-47 e D-48 registradas em `docs/requisitos.md` | — |

---

## 3. Problemas que restam, por severidade

**Crítico:** nenhum. **Alto:** nenhum depois das correções; a CSP depende só da validação na preview.

**Médio**
1. **CSP sem validação em preview** (6.4). Correção: o roteiro está em `IMPLANTACAO.md` §7.1.
2. **Sem monitoramento nem alertas** (8.4). Correção: monitor externo e notificação de falha de workflow.
3. **Listagens menores sem paginação** (3.8). Correção: usar `paginado()` também em estudantes, vínculos, ciclos, versões, notificações e pendências.
4. **Sem homologação e sem backup de dados** (3.9, 4.8). Correção: segundo projeto Supabase para as previews e `supabase db dump --data-only` periódico.
5. **Edge Functions e migrations da nuvem atrás do código.** Correção: `db push` (0010, 0011) e `functions deploy` das 3 funções.

**Baixo**
6. Sem retentativa nem circuit breaker (3.6, 5.4). Correção: só se aparecerem falhas transitórias reais.
7. Migrations só para frente (4.5).
8. JWT no `localStorage` (2.9).
9. Dependências maiores pendentes, sem vulnerabilidade: React 19, TypeScript 7, vitest 5 (exige Node 22 no CI) (2.10).
10. Prettier configurado, mas a reformatação não foi aplicada (1.7).
11. Edge Functions sem rate limit por usuário (6.5).
12. `VITE_API`/`VITE_IA_ATIVA`: a segunda está no `.env.example`, mas nenhum código a lê (README §8.1).

---

## 4. Plano de ação (o que falta)

| # | Ação | Itens | Prioridade | Esforço |
|---|---|---|---|---|
| 1 | Abrir os PRs (`audit/integracoes` → `development`, depois `chore/deps-breaking`) e conferir os 5 jobs, inclusive os 13 testes do Supabase real | 8.1, 3.7 | Alta | Baixo |
| 2 | Validar a CSP na preview da Vercel (roteiro em `IMPLANTACAO.md` §7.1) e, se quiserem, restringir `*.supabase.co` ao ref | 6.4 | Alta | Baixo |
| 3 | `npx supabase db push` (0010, 0011) e `functions deploy --use-api` das 3 funções | 4.1, 3.7, 3.8, 3.5 | Alta | Baixo |
| 4 | Monitor externo e alerta de workflow | 8.4 | Alta | Baixo |
| 5 | `paginado()` nas listagens restantes | 3.8 | Média | Baixo |
| 6 | Backup de dados e projeto de homologação | 4.8, 3.9 | Média | Médio |
| 7 | Reformatação com Prettier num commit separado | 1.7 | Baixa | Baixo |
| 8 | React 19, TypeScript 7 e vitest 5 (com Node 22 no CI) | 2.10 | Baixa | Alto |

---

## 5. Depende de mim

| Item | Como fazer |
|---|---|
| CSP na preview (6.4) | Abrir o link de preview que a Vercel comenta no PR. Fazer login, cadastrar o segundo fator e gerar um material. Em DevTools → Console, não deve aparecer "Refused to … Content Security Policy". Em Network → documento, os 4 cabeçalhos devem estar presentes |
| Migrations e Edge Functions na nuvem | `npx supabase db push` (aplica 0010 e 0011). Se algum texto antigo passar do limite, a 0010 falha inteira e não altera nada. Depois, `npx supabase functions deploy gerar-material fechar-ciclo convidar --use-api` |
| Monitor externo (8.4) | UptimeRobot (ou similar, gratuito): monitor HTTP em `https://tcc-peivivo.vercel.app` e em `https://<ref>.supabase.co/auth/v1/health`, com o header `apikey: <anon>`, a cada 5 min, com alerta por e-mail |
| Alerta de falha de workflow | GitHub → Settings → Notifications → Actions: "Send notifications for failed workflows only" |
| Backup de dados (4.8) | `npx supabase db dump --data-only -f backup-AAAA-MM-DD.sql`, guardado fora do repositório (contém dados de pessoas). No plano gratuito, conferir no painel se há backup diário |
| Homologação (3.9) | Criar um segundo projeto Supabase gratuito, aplicar as migrations e o seed, e apontar as variáveis de *Preview* da Vercel para ele |
| Rate limit e sessão do Auth (6.5, 6.6) | Painel → Authentication → Rate Limits e Sessions: anotar os valores ativos |
| Pool de conexões (4.7) | Painel → Project Settings → Database → Connection pooling |
| NVDA (2.7) | Roteiro em `docs/acessibilidade.md` |
| Prettier em massa (1.7) | Decidir se aplicam `npm run format` (cerca de 92 arquivos) num commit isolado, depois do merge |
| OpenAPI (9.2) | Se quiserem a especificação gerada do Zod, aprovar a dependência `@asteasolutions/zod-to-openapi` |

---

## 6. Saída resumida dos comandos (última execução, `chore/deps-breaking`)

```
npm run typecheck            EXIT 0
npm test                     EXIT 0  · funcoes 75 · motor 44 · politicas 133 (+13 só no CI) · web 181
npm run test:coverage        EXIT 0  · funcoes 99,06 % linhas · motor 99,4 % · web 84,73 % linhas / 81,09 % funções
npm run test:e2e             EXIT 0  · 20 passed
npm run build                EXIT 0  · chunk principal 254,57 kB (gzip 83,68); sem aviso de 500 kB
npm run db:validar           EXIT 0  · 0001–0011 + seed; 15 tabelas, 15 com RLS
npm run lint                 EXIT 0  · 0 problemas
npm audit                    found 0 vulnerabilities   (antes: 15 — 3 críticas, 5 altas, 5 moderadas, 2 baixas)
npm audit --omit=dev         found 0 vulnerabilities   (antes: 5)
node scripts/sincronizar-funcoes.mjs --verificar   · cópia Deno em dia (15 arquivos)
Build de produção servido com a CSP do vercel.json:
  demo  → 20 E2E passaram, 0 relatórios de violação
  real  → tela Entrar renderiza, 0 erros JS, mock não baixado, 0 violações
  controle negativo → script inline bloqueado e reportado (script-src-elem)
```
