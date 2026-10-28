# Auditoria técnica: sistema, banco de dados e integrações

**Data:** 26/10/2026 · **Branch:** `audit/integracoes` (a partir de `development`, `ccc13af`)
**Escopo:** monorepo `pei-vivo` inteiro: `apps/web`, `packages/*`, `supabase/migrations` (0001–0009), Edge Functions e workflows do GitHub Actions.
**Ambiente:** só desenvolvimento. Banco validado no PGlite (a máquina não tem Docker). Nenhum comando foi executado contra o Supabase da nuvem ou a Vercel. Nenhum `.env` foi lido.

> Este relatório não declara como testado o que não foi executado. Itens que dependem do Supabase real aparecem como **não testável localmente**. Para eles, a evidência citada é o último CI verde, com indicação de data.

---

## 1. Mapeamento

### 1.1 Stack e camadas

| Camada | Tecnologia | Onde |
|---|---|---|
| Interface (SPA/PWA) | React 18 + Vite + TypeScript, React Router | `apps/web/src` (telas em `pages/`, layout em `layouts/`) |
| Serviços do front ("repository") | contrato `PeiVivoApi`, com duas implementações: `mockApi` (protótipo) e `supabaseApi` (real) | `apps/web/src/services/api.ts`, `mockApi.ts`, `supabaseApi.ts` |
| Contratos (DTO e validação) | Zod, compartilhado entre front e Edge Functions | `packages/contratos/src/index.ts` |
| Casos de uso ("service") | TS puro com portas injetadas (ports & adapters) | `packages/funcoes/src/{gerarMaterial,fecharCiclo,convidar}.ts` |
| Domínio | motor de regras puro (RN03, apoios de leitura) | `packages/motor-adaptacao/src` |
| Camada HTTP ("controller") | Deno Edge Functions, uma por caso de uso | `supabase/functions/{gerar-material,fechar-ciclo,convidar}/index.ts` e `_shared/http.ts` |
| Dados | PostgreSQL (Supabase) com RLS + RPCs `security definer` | `supabase/migrations/0001…0009` |

Não existe backend próprio (Express ou similar). As "rotas" são:
- **SPA:** `apps/web/src/routes/index.tsx` (31 telas, protegidas por `RotaProtegida`);
- **HTTP:** `POST /functions/v1/gerar-material`, `/fechar-ciclo` e `/convidar`;
- **PostgREST:** tabelas sob RLS e 25 RPCs `public.fn_*`.

### 1.2 Integrações

| # | Integração | Arquivo(s) | Observação |
|---|---|---|---|
| I1 | Supabase Auth: senha, TOTP (MFA) e recuperação | `apps/web/src/services/supabaseApi.ts` (login, `nivel()`), `apps/web/src/services/index.ts:18` | sessão persistida pelo supabase-js |
| I2 | Supabase Auth Admin: convite por e-mail | `supabase/functions/convidar/index.ts:107-113` | usa a service role, só no servidor |
| I3 | PostgREST: tabelas e RPCs | `supabaseApi.ts` (`exec`, `traduzirErro`) | nunca `select *` (GRANT por coluna) |
| I4 | Edge Functions (gateway + Deno) | `supabase/functions/_shared/http.ts`, `supabaseApi.ts:247` (`funcao`) | JWT obrigatório; CORS restrito a `ORIGEM_APP` |
| I5 | RPCs de porta (preparar/registrar) | `supabase/migrations/0006_funcoes_ciclo_material.sql`, `0007_identidade_convites.sql` | "registrar" só com service role |
| I6 | pg_cron: expiração RN05 | `supabase/migrations/0005_auditoria_notificacoes.sql:289` | diário, 03:00 |
| I7 | Provedor de IA (simplificação) | `packages/funcoes/src/ia.ts` | **desligado** (`iaDesligada`, D-39); não há provedor real |
| I8 | Vercel (hospedagem do front) | `apps/web/vercel.json` | publica a partir de `main` |
| I9 | GitHub Actions: CI e keep-alive | `.github/workflows/ci.yml`, `manter-supabase-ativo.yml` | — |
| I10 | Script de implantação (service role) | `scripts/implantar-escola.mjs` | roda só na máquina da dupla |

**Não se aplica:** Microsoft Graph/MSAL, SQL Server, filas e webhooks de terceiros. Nada disso existe no repositório; a busca por `msal`, `graph`, `mssql` e `webhook` não encontrou nada.

**Variáveis de ambiente (só os nomes):**
- Front: `VITE_API`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_IA_ATIVA`.
- Edge Functions: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ORIGEM_APP`, `IA_HABILITADA`.
- CI e testes: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- Repositório: `vars.SUPABASE_PING_ATIVO`.

---

## 2. Banco de dados: síntese

**Pontos fortes (verificados no código e nos testes):**
- 15 tabelas, todas com RLS; 17 enums; PK `uuid` com `gen_random_uuid()` em todas.
- FKs com `on delete` coerente: `cascade` no que pertence ao estudante, `restrict` em escola. O teste `endurecimento.test.ts` garante índice em **toda** FK.
- Integridade por restrições do banco: uma versão `VIGENTE` por estudante (`uq_versao_vigente`), um consentimento ativo (`uq_consentimento_ativo`), um ciclo aberto (`uq_ciclo_aberto`), convite pendente único, `ck_material_tamanho` e `ck_versao_parametros`.
- Nenhuma policy `for all` depois da 0004 (as da 0002 são apagadas na 0004:19-38). Toda escrita sensível passa por RPC `security definer` com `search_path = ''`. A varredura não encontrou função `security definer` sem `search_path` além das da 0002, que são removidas.
- **SQL injection:** nenhuma das migrations usa SQL dinâmico (`execute`/`format`). O cliente só usa supabase-js, que parametriza tudo. Superfície: nula.
- **Transações e concorrência:** cada RPC roda em uma transação. `fn_registrar_fechamento` trava o ciclo com `for update`, e um fechamento duplo vira `PT409`.
- **N+1:** não há laço de consultas por linha no front. Os agregados vêm de consultas com `embed` do PostgREST. A exceção é o `resumoEscola` (M3).
- Migrations e seed aplicam sem erro no PGlite (`npm run db:validar`: 15 tabelas, 15 com RLS).

Problemas: ver M1, M2, M3 e B6 na seção 4.

---

## 3. Integrações: avaliação por critério

| Critério | Situação |
|---|---|
| Contrato req/resp | Zod `.strict()` na entrada (campo extra → 400); resposta tipada em `contratos`; erro padronizado `{ erro: { codigo, mensagem } }` |
| Autenticação | JWT do usuário em toda Edge Function; o papel vem do banco, não do JWT (D-32); aal2 para saúde e coordenação |
| Tratamento de erros | SQLSTATE → HTTP numa tabela só (`deErroBanco`); 500 sem detalhe interno; front traduz para `ErroApi` |
| Timeout | só na IA (30 s, `TIMEOUT_IA_MS`). **RPC e Auth Admin sem timeout próprio** (B2) |
| Retentativa | não há, nem no servidor nem no front. É aceitável porque as operações são idempotentes ou dão conflito explícito |
| Idempotência | gerar-material: cache por hash, mas com corrida (M1); fechar-ciclo: trava + `PT409`; convidar: convite repetido não reenvia e-mail, mas a operação não é atômica (M4) |
| Rate limit | só o do Supabase Auth. **Edge Functions sem limite por usuário** (M5) |
| Logging | JSON sem corpo nem usuário (LGPD). No 500 só vai `e.name`, o que dificulta o diagnóstico (B3) |

---

## 4. Problemas encontrados

Severidade: **crítico** = expõe dado sensível ou derruba o sistema agora; **alto** = risco relevante e explorável ou indisponibilidade provável; **médio** = defeito real com impacto limitado; **baixo** = qualidade ou manutenção.

**Nenhum crítico encontrado.** O controle de acesso, que é o núcleo do risco LGPD, está no banco e testado com o acesso negado primeiro.

### Alto

**A1. Sem cabeçalhos de segurança (CSP, frame-ancestors, nosniff, Referrer-Policy) na hospedagem**
- **Onde:** `apps/web/vercel.json:1-4` (só há o `rewrite` da SPA) e `apps/web/src/services/index.ts:20` (`persistSession: true`, o token fica no `localStorage`).
- **Causa:** a CSP estava pendente no R5 (já registrado no CLAUDE.md).
- **Impacto:**
  - sem `frame-ancestors`, o app pode ser embutido em iframe de terceiros (clickjacking);
  - sem CSP, uma XSS futura leria o JWT do `localStorage` e, com ele, os dados de crianças que o usuário enxerga. Hoje não há `dangerouslySetInnerHTML` (verificado), o que reduz a probabilidade, não o impacto.
- **Correção:** em `vercel.json`, adicionar `headers` com:
  - `Content-Security-Policy` com `default-src 'self'; connect-src 'self' https://<ref>.supabase.co wss://<ref>.supabase.co; frame-ancestors 'none'; object-src 'none'; base-uri 'self'`;
  - `X-Content-Type-Options: nosniff`;
  - `Referrer-Policy: strict-origin-when-cross-origin`.

  Validar com o E2E e numa *preview* da Vercel antes de ir para `main`.

**A2. O keep-alive do Supabase está desligado e, se for ligado, falha**
- **Onde:** `.github/workflows/manter-supabase-ativo.yml:14` e `:18`.
- **Causa:**
  - o job só roda com `vars.SUPABASE_PING_ATIVO == 'true'`, e as 5 últimas execuções (12/10 a 26/10) saíram `skipped`;
  - o ping usa `anon` em `/rest/v1/estudantes`, mas a 0004:42 revoga todo acesso de `anon` às tabelas. O PostgREST responde 401 e o `curl --fail` derruba o job.
- **Impacto:** no plano gratuito, o projeto pausa após inatividade, e o sistema real fica fora do ar perto da banca.
- **Correção:**
  - trocar o alvo por `GET ${SUPABASE_URL}/auth/v1/health`, com o header `apikey`;
  - criar a variável `SUPABASE_PING_ATIVO=true` no repositório.
- **Status:** não testável localmente (exige os secrets). O 401 foi inferido das migrations, não observado.

### Médio

**M1. Cache de material sem garantia no banco: dois cliques podem gerar dois rascunhos**
- **Onde:** `supabase/migrations/0006_funcoes_ciclo_material.sql:169-182`.
- **Causa:** o padrão "consulta, depois insere" roda sem índice único nem trava. Duas chamadas simultâneas com o mesmo texto passam juntas pelo `select` e as duas inserem.
- **Impacto:** rascunhos duplicados para o docente. Não há vazamento.
- **Correção:**
  - em uma migration nova (0010), `perform pg_advisory_xact_lock(hashtext(p_docente::text || p_versao::text || p_hash))` antes do `select`;
  - ou um índice único parcial `(docente_id, estudante_id, versao_perfil_id, hash_texto) where status_aprovacao <> 'DESCARTADO'` com `on conflict do nothing`, conferindo antes se a nuvem já tem duplicados.
- Não testável no PGlite, que roda numa conexão só.

**M2. Texto livre sem limite no banco**
- **Onde:** `observacoes.evidencia` (`0001_core_schema.sql:103`), `desfechos.observacao_livre` (`:142`) e `notas_clinicas.conteudo` (`:155`, só exige não vazio em `0005:222`).
- **Causa:** o limite existe só no formulário. O GRANT de insert (`0004:253`, `:339`) permite gravar direto pelo PostgREST.
- **Impacto:** um usuário autenticado pode gravar textos enormes, inflando banco e backups no plano gratuito.
- **Evidência:** a sonda executada nesta auditoria no PGlite gravou como docente uma `evidencia` de **1 MB**: `{"ok":true}`.
- **Correção:** migration 0010 com `check (char_length(evidencia) <= 2000)` (e equivalentes), `not valid` + `validate` depois de conferir os dados, e um teste negado em `packages/politicas`.

**M3. Painel da escola agrega no navegador e pode truncar em 1000 linhas**
- **Onde:** `apps/web/src/services/supabaseApi.ts:524-530`; `supabase/config.toml:18` (`max_rows = 1000`).
- **Causa:** baixa todas as linhas visíveis de consentimentos, vínculos e versões (sem filtro de escola nem paginação) e conta no cliente.
- **Impacto:** acima de 1000 versões ou vínculos, o PostgREST corta o resultado sem erro e as contagens saem erradas. Também há tráfego desnecessário.
- **Correção:** criar uma RPC `fn_resumo_escola(p_escola)` que devolva só as contagens (agregação no banco, sob as mesmas regras), ou no mínimo filtrar por escola via `embed`.

**M4. Convite não é atômico: e-mail enviado e acesso não registrado**
- **Onde:** `supabase/functions/convidar/index.ts:107-125`; `packages/funcoes/src/convidar.ts:539-554`.
- **Causa:** `inviteUserByEmail` (I2) e `fn_registrar_convite` são duas chamadas sem compensação.
- **Impacto:** se o registro falhar, a pessoa recebe o e-mail e entra sem vínculo. Repetir o convite resolve, pelo caminho do 422 "já existe".
- **Correção:**
  - registrar antes, com `auth_user_id` nulo, enviar o e-mail depois e só então atualizar;
  - ou, se o registro falhar, apagar o usuário recém-criado (`auth.admin.deleteUser`).

**M5. Edge Functions sem limite de requisições por usuário**
- **Onde:** `supabase/functions/_shared/http.ts:59-86`.
- **Impacto:** um docente pode disparar `gerar-material` em laço com textos diferentes; cada chamada grava uma linha de até 20 mil caracteres.
- **Correção:** limitar por usuário no banco, por exemplo recusando com `PT409` mais de N materiais por minuto em `fn_registrar_material`, ou usar um limitador na borda.

**M6. [CORRIGIDO] Sessão expirada na Edge Function aparecia como "falha de rede"**
- **Onde:** `apps/web/src/services/supabaseApi.ts:247-262` (`funcao`).
- **Causa:** o gateway responde 401 com um corpo próprio (`{code,message}`). A leitura de `erro.codigo` lançava `TypeError`, e o código caía no `REDE`.
- **Impacto:** com o JWT expirado, a tela dizia "Não foi possível falar com o servidor", e não pedia novo login.
- **Correção aplicada:** checar `status === 401` → `NAO_AUTENTICADO` (commit `eb7efeb`). O teste `supabaseApi.test.ts` falhava antes da correção e passa depois.

### Baixo

**B1. CI não roda `deno check` em `convidar`**
- **Onde:** `.github/workflows/ci.yml:111` (só `gerar-material` e `fechar-ciclo`).
- **Correção:** incluir `convidar/index.ts`. Não alterei porque não há Deno nesta máquina para validar antes.

**B2. Sem timeout nas chamadas de banco e de Auth dentro das Edge Functions**
- **Onde:** `supabase/functions/_shared/http.ts:48-51` e `convidar/index.ts:108`.
- **Impacto:** um banco lento segura a função até o limite do runtime.
- **Correção:** passar um `AbortSignal.timeout(10_000)` no `global.fetch` do `createClient`.

**B3. Erro 500 registra só `e.name`**
- **Onde:** `http.ts:82`.
- **Impacto:** o diagnóstico em produção fica difícil (variável ausente, timeout e erro de rede saem iguais).
- **Correção:** registrar também `e.code` e um id de correlação, sem a mensagem, que pode ter dado pessoal.

**B4. Padrões inseguros quando falta variável de ambiente**
- **Onde:** `http.ts:11` e `convidar/index.ts:94` (`ORIGEM_APP ?? "http://localhost:5173"`).
- **Impacto:** se faltar `ORIGEM_APP` na nuvem, o CORS bloqueia o app (falha fechada) e o link do convite aponta para localhost.
- **Correção:** falhar no início com uma mensagem clara.

**B5. "Conta já existe" detectada por texto da mensagem**
- **Onde:** `convidar/index.ts:111` (`/already/iu`).
- **Impacto:** quebra se o Supabase mudar a redação.
- **Correção:** usar `error.code === "email_exists"` (supabase-js ≥ 2.4x) e manter o `status === 422`.

**B6. RN05 com granularidade diária**
- **Onde:** `0005_auditoria_notificacoes.sql:289` (`0 3 * * *`).
- **Impacto:** uma proposta pode expirar até cerca de 24 h depois dos 7 dias.
- **Correção:** documentar a tolerância ou rodar de hora em hora.

**B7. Tabela de erros e `CodigoErro` duplicados**
- **Onde:** `packages/funcoes/src/erros.ts:18-35` × `apps/web/src/services/supabaseApi.ts:64-75`; `packages/contratos/src/index.ts:647` × `apps/web/src/services/erros.ts:6-12`.
- **Impacto:** as duas versões podem divergir (o web trata `22P02`, a função não).
- **Correção:** exportar o mapa SQLSTATE → código de `@pei-vivo/contratos` e usá-lo nos dois lados.

**B8. Módulos grandes demais (SRP)**
- **Onde:** `supabaseApi.ts` (665 linhas) e `mockApi.ts` (902).
- **Impacto:** cada um mistura consultas, mapeamento snake→camel e regras de exibição; isso deixa a revisão mais lenta.
- **Correção:** separar os mapeadores (`paraEstudante` etc.) e agrupar as consultas por agregado.

**B9. `traduzirErro` classifica como rede qualquer mensagem com "fetch"**
- **Onde:** `supabaseApi.ts:68`.
- **Impacto:** classificação errada rara.
- **Correção:** confiar só em `name === "TypeError"` ou `FunctionsFetchError`.

**B10. `supabase/config.toml` versionado com `site_url` de localhost**
- **Onde:** `supabase/config.toml:158`.
- **Impacto:** um `supabase config push` por engano quebra o login na nuvem. O risco já está documentado no CLAUDE.md.
- **Correção:** comentário de alerta no topo do arquivo, ou mover a configuração da nuvem para um arquivo separado.

**B11. RF15 (exclusão dos dados) não implementado no modo real**
- **Onde:** `supabaseApi.ts:655-656`.
- **Impacto:** o direito de eliminação (LGPD art. 18, VI) depende de um pedido manual à coordenação.
- **Correção:** criar uma Edge Function com service role, auditada.

**B12. [CORRIGIDO] E2E local dependia do `.env.local`**
- **Onde:** `apps/web/playwright.config.ts` (`webServer`).
- **Causa:** o Vite carrega `apps/web/.env.local` (arquivo existe; o conteúdo não foi lido). Com ele, o app subia em modo Supabase, e os 20 E2E, escritos sobre o protótipo, estouravam o tempo limite.
- **Correção aplicada:** `env: { VITE_API: "mock" }` no `webServer`. `npm run test:e2e` puro passou a dar 20/20. No CI não havia efeito, porque lá não existe `.env.local`.

### Arquitetura e segurança

- **Acoplamento:** os casos de uso dependem só de interfaces de portas (inversão de dependência, como em Clean Architecture), e o motor não conhece banco nem rede. A interface depende do contrato `PeiVivoApi`, e não do Supabase (D-17).
- **SOLID:** as violações relevantes são as de B8 (SRP). Não há violação de LSP: `mockApi` e `supabaseApi` cumprem o mesmo contrato, provado pela mesma suíte de telas.
- **Validação de entrada:** Zod estrito nas três funções; o banco revalida (`privado.parametros_validos`, `check`). A lacuna está em M2.
- **Autenticação e autorização:** feitas no banco, com aal2 para os papéis sensíveis. O id do docente vem de `auth.uid()`, nunca do corpo. Os testes de acesso negado existem para toda RPC.
- **Segredos:**
  - nenhum segredo versionado (busca por JWT, `sk-` e service role no histórico rastreado: nada encontrado);
  - `.env*` está no `.gitignore`, exceto o `.env.example`;
  - a service role só existe nas Edge Functions e no script local.

---

## 5. Testes

### 5.1 Testes escritos nesta auditoria

| Arquivo | Tipo | Cenários |
|---|---|---|
| `packages/funcoes/src/http.test.ts` (novo, 14) | contrato HTTP das 3 Edge Functions (Deno simulado) | 405, 401 sem Bearer, JSON inválido, 403/409/400/502 padronizados, 500 sem vazar detalhe nem no log, env ausente, CORS, `rpc()` repassando SQLSTATE |
| `packages/funcoes/src/erros.test.ts` (novo, 10) | unitário | 42501, PT409, **23505 (duplicado)**, 22023, 23514, desconhecido, rede, passthrough |
| `packages/funcoes/src/gerarMaterial.test.ts` (+7) | unitário com mock | falha de rede, perfil fora do contrato, versão trocada (PT409), **duplicado** (cache e 23505) |
| `packages/funcoes/src/fecharCiclo.test.ts` (+4) | unitário com mock | **fechar duas vezes**, 23505, falha de rede, `docenteId` forjado |
| `packages/funcoes/src/convidar.test.ts` (+4) | unitário com mock | e-mail inválido, papel não convidável, recusa do banco (22023), **convite duplicado** |
| `apps/web/src/services/supabaseApi.test.ts` (novo, 19) | contrato do cliente com PostgREST e Edge Functions | tradução de 10 códigos, corpo padronizado 403/409/400/500, **401 do gateway (bug M6)**, rede caiu, corpo não-JSON |

O **timeout** está coberto onde existe (IA: teste "abandonada no tempo limite"). Para banco e Auth não há timeout a testar (B2).

### 5.2 Saída dos testes executados (máquina local, 26/10/2026)

```
Antes (baseline, development ccc13af):
  motor-adaptacao  44 passed
  funcoes          31 passed
  politicas       114 passed | 12 skipped (http.test.ts e supabaseApi.test.ts: sem Supabase local)
  web             119 passed
  typecheck (5 pacotes) OK · db:validar OK (15 tabelas, 15 com RLS) · contraste 78/78 OK

Depois (audit/integracoes):
  motor-adaptacao  44 passed
  funcoes          68 passed   (cobertura: 96,8 % linhas · 89,6 % ramos)
  politicas       114 passed | 12 skipped (mesmo motivo)
  web             138 passed
  typecheck OK
  e2e (Playwright)  1ª execução: falha por timeout (30 s) em quase todos os casos → causa B12
                    depois da correção: 20 passed (56,3 s), em 390 px e 1280 px
```

Sonda manual no PGlite (M2): `insert observacoes(..., evidencia = repeat('x', 1000000))` como docente → `{"ok":true}`.

**Último CI no GitHub (não executado por mim, só consultado):** run `38668758643` em `development`, 15/10/2026, `success` nos 5 jobs, inclusive "migrations + políticas RLS (Supabase real)", que roda os 12 testes pulados localmente.

---

## 6. Checklist de integrações

| # | Integração | Status | Motivo |
|---|---|---|---|
| I1 | Supabase Auth (senha, TOTP) | **Não testável localmente** | Exige Supabase. Coberto por `politicas/src/http.test.ts` (TOTP real) no CI, verde em 15/10 |
| I2 | Auth Admin (convite) | **OK** (mock) / **não testável localmente** (real) | Caso de uso com sucesso, falha 502, duplicado e conta existente testados; o real roda em `supabaseApi.test.ts` no CI. Ver M4 |
| I3 | PostgREST (tabelas e RPCs) | **OK** | Políticas e RPCs testadas no PGlite (114); tradução de erros no cliente testada (19) |
| I4 | Edge Functions (camada HTTP) | **OK** | `http.test.ts` com Deno simulado; o runtime Deno real é coberto só no CI |
| I5 | RPCs de porta (0006/0007) | **OK** | `funcoes-banco.test.ts` (negado primeiro, cache, RN05/RN06/RN08). Ver M1 (corrida) |
| I6 | pg_cron (RN05) | **OK** (função) / **não testável** (agendamento) | `fn_expirar_validacoes` testada no PGlite; o agendamento só existe na nuvem |
| I7 | Provedor de IA | **Não testável** | Não há provedor real (D-39). Falha, saída inválida e timeout testados com dublê |
| I8 | Vercel | **Falha** (configuração) | Funciona, mas sem cabeçalhos de segurança (A1) |
| I9 | GitHub Actions: CI | **OK** | Último run verde (15/10); lacuna B1 |
| I9 | GitHub Actions: keep-alive | **Falha** | Desligado e com endpoint que retornaria 401 (A2) |
| I10 | `implantar-escola.mjs` | **Não testável localmente** | Exige service role; o CI roda a fumaça contra o Supabase local |

### O que a dupla precisa fazer

1. **A2:** criar `SUPABASE_PING_ATIVO=true` (Settings → Variables) e aprovar a troca do endpoint do ping.
2. **A1:** decidir a CSP e testá-la numa preview da Vercel antes de mesclar.
3. **M1 e M2:** aprovar a migration 0010. Ela altera a nuvem e exige `npx supabase db push`, que só deve rodar com confirmação.
4. Ter Deno instalado (ou confiar no CI) para validar o B1.
