# Correções do CHECKLIST.md e da AUDITORIA.md

**Data:** 26/10/2026.
**Branches:**
- `audit/integracoes`: etapas 1 a 9, sobre a auditoria do mesmo dia.
- `chore/deps-breaking`: etapa 10 e estes documentos; derivado de `audit/integracoes`.

Os dois estão sem PR aberto. Nada foi executado contra o Supabase da nuvem nem contra a Vercel, e nenhuma migration existente (0001–0009) foi editada.

**Verificação depois de cada etapa:** `npm run typecheck`, `npm test` e `npm run build`. Quando a etapa tocou no front, também `npm run test:e2e`; quando tocou no banco, também `npm run db:validar`; quando tocou em cobertura, `npm run test:coverage`. Nenhuma etapa avançou com verificação falhando.

**Fora desta rodada, a pedido do usuário e antes dela:**
- variável `SUPABASE_PING_ATIVO` e secrets do keep-alive;
- restauração do projeto `tcc-peivivo`, que estava `INACTIVE`;
- PR #110 (ping aceita 401), mesclado pelo usuário.

---

## Etapa 1: cobertura do web quebrando o CI (7.2)

| | |
|---|---|
| **Arquivos** | `apps/web/src/services/supabaseApi.test.ts` |
| **O que mudou** | Cliente Supabase simulado e encadeável que registra tabela, colunas e filtros. Os testes provam que nenhuma consulta usa `select *`, o snake→camel, as guardas de papel, o painel, a auditoria e a exportação sem notas clínicas |
| **Por quê** | O teste de contrato criado de manhã carregava o `supabaseApi.ts` (5,47 % das funções cobertas) e derrubava o web para 61,77 % |
| **Commit** | `da19fc0` |
| **Verificação** | `test:coverage` exit 0; web 80,66 % das funções (limite de 70 % mantido, nenhum arquivo excluído); `supabaseApi.ts` 98,6 % |

## Etapa 2: cabeçalhos de segurança (6.4, 2.9)

| | |
|---|---|
| **Arquivos** | `apps/web/vercel.json`, `docs/reformulacao/IMPLANTACAO.md` (§7.1) |
| **O que mudou** | CSP (`default-src 'self'`, `script-src 'self'`, `style-src 'self'` sem `unsafe-inline`, `img-src 'self' data:`, `connect-src` com `*.supabase.co` e `wss`, `frame-ancestors 'none'`, `base-uri`, `form-action`, `object-src 'none'`), `X-Content-Type-Options`, `Referrer-Policy` e `Permissions-Policy` |
| **Decisão** | `*.supabase.co` em vez de um placeholder: um placeholder que chegasse à `main` quebraria o login em produção. O ref não é segredo, e o IMPLANTACAO.md explica como restringir |
| **Commit** | `209ad25` |
| **Verificação** | Build de produção servido por um servidor local com os mesmos cabeçalhos e `report-uri`: 20 E2E passaram e 0 relatórios. Controle negativo: script inline bloqueado e reportado (`script-src-elem`). Repetido depois das etapas 7 e 10b, também no modo real |
| **Pendência** | Validar numa preview real da Vercel |

## Etapa 3: dependências sem quebra (6.8, 2.10)

| | |
|---|---|
| **Arquivos** | `package-lock.json`, `apps/web/package.json` |
| **O que mudou** | `@supabase/supabase-js` 2.45.4 → 2.118.0; `@playwright/test` 1.48 → 1.64; `npm audit fix` sem `--force`; `playwright-core` removido (sem import direto) |
| **Commit** | `2b97608` |
| **Verificação** | `npm audit`: 15 → 10; produção: 5 → 3. Suíte, build e E2E passaram |
| **Pendência** | As Edge Functions seguem com `npm:@supabase/supabase-js@2.45.4` até o próximo deploy |

## Etapa 4: migration 0010 e convite (4.1, 3.7)

| | |
|---|---|
| **Arquivos (4a)** | `supabase/migrations/0010_limites_texto_e_cache_material.sql`, `packages/contratos` (`LIMITE_EVIDENCIA` 1.000, `LIMITE_OBSERVACAO_DESFECHO` 1.000, `LIMITE_NOTA_CLINICA` 5.000), `packages/politicas/src/limites.test.ts`, mock (VALIDACAO), `maxLength` em Observar, Desfecho e NotasClinicas, `docs/requisitos.md` (D-47) |
| **Correção na AUDITORIA** | Ela dizia "limite só no formulário"; na verdade não havia limite nem no formulário |
| **O que mudou (4a)** | `check` de tamanho, `not valid` + `validate` na mesma transação; `pg_advisory_xact_lock` antes da consulta ao cache em `fn_registrar_material` (mesma assinatura, então os GRANTs se mantêm) |
| **Commit (4a)** | `fde00ec` |
| **Verificação (4a)** | `db:validar` OK. `limites.test.ts`: acima do limite recusado com 23514 (inclusive 1 MB e inclusive pelo service role); no limite, aceito; os números do banco são os de `contratos`. A corrida real com duas conexões só roda com `DATABASE_URL` (CI): ficou pulada localmente, porque o PGlite tem uma conexão só |
| **Arquivos (4b)** | `packages/funcoes/src/convidar.ts`, teste dele, `supabase/functions/convidar/index.ts`, cópia gerada |
| **O que mudou (4b)** | Porta `desfazerNoAuth` (`auth.admin.deleteUser`): se o registro falha depois do e-mail, a conta recém-criada é apagada. Falha da compensação não esconde o erro original |
| **Commit (4b)** | `82fdfe3` |
| **Verificação (4b)** | 3 testes novos; `funcoes` 71 passaram |
| **Pendência** | `db push` da 0010 na nuvem; `deno check` do `convidar` só roda no CI |

## Etapa 5: paginação e agregação (3.8)

| | |
|---|---|
| **Arquivos** | `supabase/migrations/0011_resumo_escola_e_paginacao.sql`, `packages/politicas/src/resumo-escola.test.ts`, `services/api.ts` (`Pagina`), mock, `supabaseApi`, `pages/Estudante.tsx`, `pages/Historico.tsx`, testes de tela e do mock, D-48 |
| **O que mudou** | `fn_resumo_escola` (coordenação com aal2; as mesmas regras do mock). `fn_listar_auditoria(p_estudante, p_limite, p_deslocamento)`. `pagina?` em `listarObservacoes`, `listarMateriais` e `listarAuditoria`; sem página, o modo real busca em lotes de 1000. "Carregar mais" nos materiais (10) e na trilha de auditoria (20) |
| **Commit** | `3993b27` |
| **Verificação** | Negado primeiro (docente, coordenação com aal1, coordenação de outra escola). Contagem exata com 1.102 estudantes. Auditoria com 1.100 eventos paginada sem repetir. Cliente buscando 2.350 linhas em 3 lotes. Tela com axe. E2E e `db:validar` passaram |
| **Pendência** | `db push` da 0011; listagens menores ainda sem `paginado()` (CHECKLIST, risco 5) |

## Etapa 6: ESLint e Prettier (1.7, 8.1)

| | |
|---|---|
| **Arquivos** | `eslint.config.mjs`, `.prettierrc`, `.prettierignore`, `package.json` (raiz e workspaces: `lint`, `format`, `format:check`), `ci.yml` (passo de lint; `deno check` em `convidar`), `useConsulta.ts`, `useInatividade.ts`, `useSessao.tsx`, `RevisarMaterial.tsx`, `mockApi.ts`, `capturar-telas.mjs` |
| **Correções** | Ref atualizada em efeito, não durante o render. Texto editável do RevisarMaterial como estado derivado, sem efeito. Import sem uso removido |
| **Regras ajustadas, com justificativa no config** | `label-has-associated-control` com `depth: 3`, porque o texto do rótulo fica em `span` aninhado. `no-noninteractive-tabindex` aceitando `role="region"` e `pre`, porque região com rolagem precisa de foco (WCAG 2.1.1) |
| **Desativações de linha** | 2, com o motivo escrito: busca com efeito em `useConsulta` e `useSessao` |
| **Commit** | `741602b` |
| **Verificação** | `npm run lint` com 0 problemas; suíte, build, cobertura e E2E passaram |
| **Pendência** | A reformatação com Prettier (cerca de 92 arquivos) não foi aplicada, para não misturar uma diff mecânica com esta revisão |

## Etapa 7: performance do front (2.8)

| | |
|---|---|
| **Arquivos** | `routes/index.tsx`, `services/index.ts`, `services/api.ts`, `main.tsx`, `test/setup.ts`, `mocks/exemplos.ts` (novo), `mocks/dados.ts`, 5 telas, `public/logo-pei-vivo.webp`, `design/logo-pei-vivo.png` (movido), README |
| **O que mudou** | `React.lazy` em 29 rotas. Mock e supabase-js por `import()`. `api` virou ligação viva preenchida por `iniciarApi()`. Constantes de exemplo fora do seed. Logo em WebP de 320 px |
| **Defeito encontrado e corrigido antes do commit** | A primeira versão usava top-level await. No build de produção, o chunk do mock dependia do chunk principal, que estava suspenso no await: deadlock e página em branco, sem erro. Isso valia também para o modo real. Só apareceu porque testei o build no navegador; o servidor de desenvolvimento e o Vitest não mostram o problema |
| **Commit** | `6e3b42f` |
| **Verificação** | Chunk principal 730,40 → 241,40 kB (gzip 205,72 → 79,48); 20 E2E. Build real: tela Entrar renderiza, 0 erros, mock não baixado. Demo com CSP: 20 E2E e 0 violações. 3 testes de tela passaram a esperar a tela (`findBy`), sem mudar o que verificam |

## Etapa 8: backend, duplicação e divisão dos serviços (3.5, 3.6, 1.4, 1.6, 1.3)

| Parte | Arquivos | O que mudou | Commit | Verificação |
|---|---|---|---|---|
| 8a | `supabase/functions/_shared/http.ts`, `packages/funcoes/src/http.test.ts` | `requestId` no log e no header `x-request-id`; o 500 registra `tipo` e `code`; `fetch` com `AbortSignal.timeout(10 000)` combinado com o sinal do chamador, nos dois clientes (cobre o Auth Admin) | `4200de5` | 16 testes da camada HTTP; o sinal aborta quando o tempo expira |
| 8b | `packages/contratos`, `funcoes/erros.ts`, `supabaseApi`, mock, `http.ts`, `convidar/index.ts`, cópia gerada, `resumo-escola.test.ts` | `MS_POR_DIA`, `DIAS_EXPIRACAO_VALIDACAO`, `DIAS_VALIDACAO_ATRASADA`, `DIAS_CICLO_PARADO`, `ORIGEM_PADRAO_DEV` e `CODIGO_DO_SQLSTATE`. Única mudança de comportamento: `22P02` vira 400 também nas Edge Functions | `edf1ad4` | O teste no PGlite confere que os prazos do SQL são os das constantes |
| 8c | `services/supabaseApi.ts` + `services/supabase/*` | 665 → 40 linhas de montagem + infra, mapeadores, contexto e 6 agregados | `b94b358` | Interface intacta; os 50 testes do arquivo passaram sem alteração |
| 8d | `services/mockApi.ts` + `services/mock/*` | cerca de 920 → 41 linhas de montagem + contexto (estado com getters/setters, regras simuladas) e 6 agregados | `03f50d8` | Os 53 testes do mock e os 172 do web passaram sem alteração |

## Etapa 9: documentação (9.1, 9.2)

| | |
|---|---|
| **Arquivos** | `README.md` |
| **O que mudou** | §8.1 com as variáveis de ambiente (nome, onde, finalidade, se é pública). §8.2 com o contrato das 3 Edge Functions (rota, entrada, saída, quem pode, tabela HTTP/código de erro). Tabela de scripts atualizada. Registrado que `VITE_IA_ATIVA` não é lida por nenhum código |
| **Decisão** | Tabela em vez de OpenAPI: gerar a especificação do Zod exigiria a dependência `@asteasolutions/zod-to-openapi`, que fica para aprovação |
| **Commit** | `ff08628` |

## Etapa 10: atualizações com quebra (6.8), branch `chore/deps-breaking`

| Parte | O que mudou | Commit | Verificação |
|---|---|---|---|
| 10a | `react-router-dom` 6.30.6 → 7.18.4 (open redirect por barra invertida). Nenhuma rota mudou. Novo `utils/destino.ts`: o destino depois do login só aceita caminho interno; 9 testes, negados primeiro | `356c2e9` | Audit 10 → 8; produção 3 → 1. Suíte, build e E2E passaram |
| 10b | `vite` 5 → 8, `@vitejs/plugin-react` 4 → 6, `vitest` 2 → 4.1.12, `@vitest/coverage-v8` 4.1.12 (também na raiz). `vite.config` com `defineConfig` de `vitest/config`. `http.test.ts` com URL via `import.meta.url` | `b3d8032` | Audit 8 → 1. Build de produção no navegador com a CSP (real e demo) sem erros. Cobertura OK |
| 10c | `zod` 3.23.8 → 4.6.7 no app, nos pacotes e nas Edge Functions (`npm:zod@4.6.7`). Ids com `z.guid()`: o `uuid()` do zod 4 recusaria os ids do seed (versão 0). Teste novo | `024233e` | Audit 1 → **0**; produção **0**. Suíte, cobertura, E2E e `db:validar` passaram |

**Decisão da 10b:** vitest 4.1.12 em vez do 5. Ele resolve as mesmas vulnerabilidades (vitest, `@vitest/mocker`, `tinypool`) e roda no Node 20 do CI; o 5 exige Node 22.12 ou mais novo. Nenhuma etapa da 10 precisou ser revertida.

---

## Resultado final (`chore/deps-breaking`)

| Comando | Antes da rodada | Depois |
|---|---|---|
| `npm run typecheck` | OK | OK |
| `npm test` | 364 passaram + 12 pulados | **433 passaram** + 13 pulados (só no CI) |
| `npm run test:coverage` | **exit 1** (web: 61,77 % das funções) | exit 0 (web: 81,09 % das funções, 84,73 % das linhas) |
| `npm run test:e2e` | 20 passaram | 20 passaram |
| `npm run build` | chunk 730,40 kB, aviso de 500 kB | chunk 254,57 kB, sem aviso |
| `npm run db:validar` | 0001–0009 OK | 0001–0011 OK |
| `npm run lint` | não existia | 0 problemas |
| `npm audit` / `--omit=dev` | 15 / 5 | **0 / 0** |
| CHECKLIST (OK/PARCIAL/FALHA/NA/NV) | 29 / 24 / 6 / 1 / 1 | **44 / 15 / 0 / 1 / 1** |

## Pendências

Todas detalhadas em `CHECKLIST.md` §5:
- validar a CSP numa preview;
- `db push` (0010, 0011) e `functions deploy` das 3 funções;
- monitor externo e alerta de workflow;
- backup de dados e projeto de homologação;
- conferir no painel o rate limit e a sessão do Auth e o pool de conexões;
- roteiro do NVDA;
- decidir a reformatação com Prettier e a geração de OpenAPI;
- `paginado()` nas listagens menores;
- React 19, TypeScript 7 e vitest 5.

---

# Segunda rodada: plano de ação do CHECKLIST §4 (27/10/2026)

**Branches**, empilhados sobre `chore/deps-breaking`, nesta ordem: `fix/paginacao-listas` → `chore/backup-script` → `style/prettier` → `chore/deps-major`.

**PR:** #112 (`chore/deps-major` → `development`), com os 5 jobs do CI verdes no run `40433427658`, inclusive os 13 testes do Supabase real. O #111 (`audit/integracoes`) foi fechado em favor do #112: sozinho, ele falhava no CI por dois motivos corrigidos mais acima na pilha (o supabase-js 2.118 exige WebSocket nativo, do Node 22; e o `http.test.ts` precisa do import via `import.meta.url`).

Nada foi executado contra o Supabase da nuvem.

| Ação | Arquivos e motivo | Commit | Verificação | Situação |
|---|---|---|---|---|
| 5. Paginação restante | `services/supabase/{ciclo,escola,privacidade}.ts`: estudantes, vínculos, usuários, ciclos, versões, pendências, notificações, notas e consentimentos em `paginado()`, com desempate por `id`; `rpc()` simulado encadeável; teste com 1.500 estudantes | `42ceb9e` | 182 testes web, 20 E2E, cobertura | Feito |
| 6. Backup | `scripts/backup-dados.mjs`, `npm run db:backup`, `backups/` no `.gitignore`, `IMPLANTACAO.md` §7.2 | `9293d11` | Sintaxe, lint e suíte | Parcial: não executado (leria a nuvem); homologação depende de vocês |
| 7. Prettier | 109 arquivos + cópia Deno regenerada; `format:check` no CI | `b4410e9`, `4e4ffb0` | Suíte, 20 E2E, contraste 78/78, `db:validar`, lint | Feito |
| CSP (regressão do zod 4) | `packages/contratos`: `z.config({ jitless: true })`. O zod 4 testava `Function("")` e a CSP registrava violação a cada carga (1 no modo real, 34 na demonstração). Passou despercebido na etapa 10c, porque o teste no navegador não foi refeito depois dela | `8205ead` | Build limpo servido com a CSP: 0 violações nos dois modos, 20 E2E | Feito |
| 8a. React 19 | react/react-dom 19.3.1, tipos 19, lucide-react 1.61, Testing Library 16.3.3. O lockfile prendia uma cópia 18 na raiz e duas cópias quebravam 70 testes; foi corrigido. O "Sair" agora navega para `/` antes de zerar a sessão (no React 19, a RotaProtegida redirecionava para `/entrar` primeiro) | `44d7078` | 182 testes web, 20 E2E, produção no navegador sem erros e com 0 violações; chunk 254,57 → 335,11 kB | Feito (na primeira tentativa foi revertido; refeito e verificado) |
| 8b. TypeScript 7 | — | — | O `typescript-eslint` 8.72.1 aceita só TypeScript abaixo da 6.1 | **Não feito:** bloqueado na origem |
| 8c. vitest 5 | vitest e coverage-v8 5.0.5 (raiz e workspaces); CI em Node 22 nos 5 jobs | `6790122` | 434 testes, cobertura, `db:validar`; CI verde | Feito |
| Extra: dependências dentro das faixas | axe-core e @axe-core/playwright 4.14, pglite 0.5.12, user-event 14.6.8 | `0025bf6` | 434 testes, 20 E2E, build | Feito |
| 1. PRs e CI | PR #112 | — | 5/5 jobs verdes | Feito |
| 2. CSP na preview | Link temporário da preview (conector Vercel, expira em 23 h) | — | 4 cabeçalhos presentes; tela de entrada sem mensagem de CSP | Parcial: a preview roda em modo demonstração (as variáveis do Supabase só existem em Production) |
| 3. Nuvem / 4. Monitor | — | — | — | Dependem de vocês (`CHECKLIST.md` §5) |

## Resultado depois da segunda rodada (`chore/deps-major`)

| Comando | Depois da 1ª rodada | Depois da 2ª |
|---|---|---|
| `npm test` | 433 passaram + 13 pulados | **434 passaram** + 13 pulados (verdes no CI) |
| `npm run test:coverage` | exit 0 | exit 0 (web 84,38 % das linhas, 81,29 % das funções) |
| `npm run test:e2e` | 20 | 20 |
| `npm run build` | chunk 254,57 kB | chunk 335,11 kB (React 19), sem aviso |
| Prettier | só configurado | aplicado e conferido no CI |
| `npm audit` | 0 | 0 |
| Violações de CSP no build de produção | 34 (regressão do zod 4, não detectada) | **0** |
| CHECKLIST (OK/PARCIAL/FALHA/NA/NV) | 44 / 15 / 0 / 1 / 1 | **45 / 14 / 0 / 1 / 1** |
