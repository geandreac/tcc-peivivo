# Fase 0 · Auditoria do repositório para a reformulação

**Data:** 07/10/2026 · **Branch:** `docs/governanca-e-processos` (`a6a5a4e`) · **Autor:** Claude Code, a pedido da dupla
**Escopo:** prompt `PEI_Vivo_Prompt_Reformulacao.md`, seção 2.1. Nenhum código de produto foi alterado nesta fase.

Legenda usada em todo o documento:
- **[VERIFICADO]**: rodei, li ou testei, e o resultado está reproduzível pelo comando indicado.
- **[SUPOSIÇÃO]**: inferência que não consegui verificar aqui. Diz o que falta para confirmar.

---

## 0. Resumo em cinco linhas

1. O produto **não** é "sem login e sem separação de papéis", como diz o prompt: há login de demonstração por perfil e uma camada `mockApi` que aplica a matriz de permissões v2, com 34 testes de caminho negado. **[VERIFICADO]**
2. O problema real é outro: **as políticas RLS que estão no banco (`0002`) são muito mais fracas que o mock**. Rodei 31 ataques contra elas num Postgres de verdade e **25 passaram**, inclusive forjar consentimento (RN01) e a coordenação ler nota clínica (RN02). **[VERIFICADO]** `node scripts/sondar-rls.mjs`
3. Quase todas essas falhas **já estavam previstas** nas decisões D-06…D-14 de `docs/requisitos.md`, mas a migration que as corrige (`0004`) nunca foi escrita. Hoje a segurança existe só em JavaScript, no navegador.
4. Restam cerca de 7 semanas até o congelamento (26/11/2026, `docs/plano-desenvolvimento.md`). O plano M1–M9 do prompt **não cabe nesse prazo**. Proponho um corte em `DECISOES.md` (ADR-00) e `PLANO.md`.
5. Testes atuais: **98/98 verdes** (30 motor + 68 web). Migrations e seed rodam no PGlite. **A máquina de desenvolvimento não roda Docker** (informado pelo usuário em 07/10), então o Supabase local não é opção. O Supabase real roda só no job `db` do CI.

---

## 1. Onde o prompt contradiz o repositório

| # | O prompt diz | O repositório mostra | Evidência | Minha posição |
|---|---|---|---|---|
| C-01 | "não tem login e não separa o que cada pessoa pode ver e fazer" | Login de demonstração por perfil (D-16), rotas protegidas, `mockApi` com matriz v2 e 34 testes negativos | `apps/web/src/services/mockApi.ts`, `mockApi.test.ts`, `pages/autenticacao.test.tsx` | Parcialmente falso. O que falta é **autenticação real** (senha, convite, sessão) e **a regra no banco**, não a separação de papéis na interface. |
| C-02 | "As migrations nunca foram executadas num Postgres real" | Rodam no PGlite (Postgres 18.3 em WASM) com `npm run db:validar`, e o job `db` do CI roda `supabase db reset` | `scripts/validar-migrations.mjs`; `.github/workflows/ci.yml` job `db`; última execução verde registrada em 15/09 (`docs/diagnostico-inicial.md`) | Falso quanto à *execução*. É verdade que **as políticas nunca tinham sido exercitadas com um usuário autenticado**. A sondagem desta auditoria (§3) é a primeira vez. |
| C-03 | Matriz "Quadro 5 do artigo": laudo com acesso Total para responsável e profissional | **D-01: o sistema não armazena laudo nem diagnóstico.** Só `laudo_apresentado_em` (data), planejada | `docs/requisitos.md` D-01; `CLAUDE.md` RN02 | **Discordo do prompt.** Ver ADR-07. Guardar laudo cria um repositório de dado sensível de saúde (LGPD art. 11) sem ganho no ciclo. |
| C-04 | Matriz: coordenação e profissional **geram material** | **D-02: só o docente gera**, coerente com casos de uso, classes, sequência e a política `docente_gera_material` | `docs/requisitos.md` D-02; `0002_rls_policies.sql` | O próprio prompt desconfia disso. Mantenho D-02. |
| C-05 | "Quadro 5" é a matriz de permissões | No repositório, Quadro 5 são as **regras do motor** e a matriz é o **Quadro 7** do pré-projeto, substituído pela matriz v2 | `README.md` §13; `CLAUDE.md`; `docs/requisitos.md` §6 | **[SUPOSIÇÃO]** O artigo pode ter renumerado os quadros. A dupla precisa conferir antes de citar. |
| C-06 | Tela "Laudo: enviar e ver o próprio documento" (6.2) | Contradiz D-01 e RN02 | idem C-03 | Não implementar. A tela vira "Documentos que ficam com você", explicando o que o sistema **não** guarda. |
| C-07 | Stack: Tailwind + Radix/shadcn + TanStack Query + react-hook-form + Zod; pastas `features/*`; rotas `/r /d /s /c` | **D-15: CSS com tokens, sem Tailwind**, com contraste auditável. 22 telas, 68 testes e axe já funcionando | `apps/web/src/styles/tokens.css`; `docs/requisitos.md` D-15 | Discordo de reescrever a stack agora (ADR-12). Rotas por prefixo de papel também não funcionam com papel **por estudante** (ADR-03). |
| C-08 | D1: corrigir criando `fn_tem_papel` e um **seletor de contexto** | **D-14 já decidiu "um papel por usuário por estudante"** (`unique (usuario_id, estudante_id)`), mas a decisão nunca foi para o SQL | `docs/requisitos.md` D-14; `0001_core_schema.sql` (unique ainda inclui `papel`) | Concordo com o bug (S-09/S-10 confirmam). Para a correção, ver ADR-02. Para o seletor, ver ADR-03: a tela inicial agrupada por papel substitui um seletor global. |
| C-09 | D8: cache do PWA guarda materiais após revogação | **Não existe service worker**, só o `manifest.webmanifest` | `apps/web/public/`; README §14 | O risco é futuro, não atual. Proponho não colocar material de estudante em cache (ADR-10). |
| C-10 | Pesquisa com 27 pessoas (59,3 %, 44,4 %, 40,7 %) | **Não encontrei esses números** em `docs/` nem no pré-projeto | `grep -rn "59,3" docs` sem resultado | **[SUPOSIÇÃO]** O dado existe fora do repositório. Para citar no artigo e na interface, precisa entrar em `docs/validacao-da-ideia.md` com instrumento, data e amostra. |
| C-11 | D-06 (antigo): auditoria de **leitura** fora do MVP | O prompt (D11) pede leitura sensível auditada via RPC | `docs/requisitos.md` D-06 | Concordo em parte: só a leitura de `notas_clinicas` passa por RPC auditada (ADR-11). |
| C-12 | D-07 (antigo): sem e-mail no MVP | O prompt (D10) pede e-mail em eventos de ação | `docs/requisitos.md` D-07 | Proponho e-mail só para o que o Supabase Auth já envia (convite, recuperação). O resto fica no centro de notificações do app (ADR-09). |

---

## 2. Mapa real do repositório **[VERIFICADO]**

### 2.1 Pastas
```
apps/web/                 React 18.3 + Vite 5.4 + react-router 6.26 + TS estrito (sem PWA real)
  src/routes/             index.tsx (22 rotas + 404), RotaProtegida.tsx (só verifica "tem sessão")
  src/layouts/            Layout.tsx: único layout; nav no topo também no celular
  src/pages/              22 telas (lista em §2.2)
  src/components/         Botao, Campo, Escala3, Modal, Feedback, MaterialAdaptado, Toasts, CabecalhoEstudante
  src/hooks/              useSessao, useConsulta/useMutacao, useAnuncio, usePreferencias, useTitulo, useEstudante
  src/services/           api.ts (contrato PeiVivoApi, 44 métodos), mockApi.ts (737 linhas), erros, tipos
  src/mocks/dados.ts      semente fictícia (6 usuários, 2 estudantes)
  src/styles/             tokens.css · base.css · componentes.css · print.css
packages/motor-adaptacao/ regras, ciclos, ancora, adaptador (TS puro), 30 testes, 97 % de cobertura
supabase/                 migrations 0001 (10 tabelas, 8 enums) e 0002 (18 policies, 2 funções), seed.sql, config.toml
scripts/                  validar-migrations.mjs (PGlite), contraste.mjs, criar-kanban.sh, sondar-rls.mjs (novo, esta auditoria)
.github/workflows/        ci.yml (motor, db, web), manter-supabase-ativo.yml
```
Não existem: `supabase/functions/`, migration `0003`/`0004`, `supabaseApi`, cliente `@supabase/supabase-js`, service worker, ESLint, Playwright no projeto.

### 2.2 Rotas e telas

| Rota | Tela | Quem usa | Protegida? |
|---|---|---|---|
| `/` | Inicio | público | não |
| `/entrar`, `/entrar/:slug` | Entrar, EntrarPapel (escolha de perfil fictício, sem senha) | público | não |
| `/ajuda`, `/acessibilidade` | Ajuda (restaurar dados, simular falha), Acessibilidade (preferências) | todos | não |
| `/painel` | Painel ("Meus estudantes", ação principal por papel) | todos | sessão |
| `/pendencias` | Pendencias (validações em aberto) | profissional, coordenação | sessão |
| `/coordenacao/cadastrar` | CadastrarEstudante | coordenação | sessão |
| `/estudantes/:id` | Estudante (ações por papel, perfil vigente, materiais) | todos | sessão |
| `…/consentimento` | Consentimento (termo, escopos, revogação, trilha) | responsável | sessão |
| `…/observar` | Observar (6 dimensões × 3) | docente, responsável, profissional | sessão |
| `…/fechar-ciclo` | FecharCiclo (diff vigente → proposto) | docente | sessão |
| `…/validar` | ValidarParametros | profissional | sessão |
| `…/notas-clinicas` | NotasClinicas | profissional | sessão |
| `…/gerar` | GerarMaterial | docente | sessão |
| `…/historico` | Historico | todos | sessão |
| `…/vinculos` | Vinculos | coordenação | sessão |
| `…/dados` | DadosLgpd (exportar/excluir) | responsável | sessão |
| `/materiais/:id`, `…/revisar`, `…/desfecho` | MaterialFinal, RevisarMaterial, Desfecho | docente (+ leitura) | sessão |
| `*` | NaoEncontrada | todos | não |

O guard (`RotaProtegida.tsx`) só verifica se há sessão. **Quem decide o papel é o serviço**: uma tela aberta pela URL errada mostra o estado "negado" vindo do `mockApi` (ex.: `28-negado-notas-docente-*.png`). O desenho está certo, mas a decisão acontece no navegador.

### 2.3 Como o app fala com o "backend"
- `services/index.ts` instancia `criarMockApi()`. **Nenhuma chamada ao Supabase existe.** `.env.example` declara variáveis que nada lê.
- Sessão: o id do usuário fica em `localStorage["pei-vivo:sessao"]`, sem expiração. Estado inteiro do "banco" fica em `localStorage["pei-vivo:demo:v1"]`. Hoje os dados são fictícios, mas com dado real isso seria proibido (prompt §8; ADR-10).
- Auth: **nada usa Supabase Auth.** `config.toml` está com valores padrão: `enable_signup = true`, `minimum_password_length = 6`, `enable_confirmations = false`, MFA TOTP desligado, `site_url` na porta 3000 (o app usa 5173).

---

## 3. O que só está protegido pela interface (ou pelo mock), e não pelo banco

### 3.1 Sondagem RLS **[VERIFICADO]**
`node scripts/sondar-rls.mjs` aplica `0001` + `0002` no PGlite, concede a `authenticated` os mesmos GRANTs do padrão Supabase, cria uma fixture fictícia e executa cada ação como `set role authenticated` com `request.jwt.claim.sub` definido. Cada sonda roda em transação com `rollback`.

**Resultado em 07/10/2026: 31 sondas, 25 falhas confirmadas, 6 comportamentos corretos.**

| Sonda | Ataque | Deveria | Banco | Regra violada | Já previsto em |
|---|---|---|---|---|---|
| S-01 | Docente lê `notas_clinicas` | negar | **negou** ✅ | RN02 | — |
| S-02 | Pessoa sem vínculo lê `estudantes` | negar | **negou** ✅ | — | — |
| S-03 | Docente gera material sem consentimento | negar | **negou** ✅ | RN01 | — |
| **S-04** | **Docente cria um consentimento em nome próprio** para estudante sem consentimento | negar | **permitiu** | RN01 | não previsto |
| **S-05** | **Pessoa sem nenhum vínculo cria consentimento** para qualquer estudante | negar | **permitiu** | RN01 | não previsto |
| **S-06** | Depois de S-04, o docente **gera material** no estudante | negar | **permitiu** | RN01 | não previsto |
| S-07 | Responsável apaga o registro de consentimento | negar | permitiu | trilha (D-06) | D-06 |
| S-08 | Responsável move o consentimento para outro estudante | negar | permitiu | RN01 | não previsto |
| S-09 | `fn_meu_papel` com 2 vínculos (coord + docente) | — | devolveu `DOCENTE` | D1 | D-14 |
| S-10 | A mesma pessoa gera material, o que depende do papel sorteado | — | permitiu | D1 | D-14 |
| **S-11** | **Coordenação cria vínculo `PROFISSIONAL_SAUDE` para si mesma** | negar | **permitiu** | RN02, D3 | não previsto |
| **S-12/13** | Coordenação troca o **próprio** vínculo para profissional e **lê a nota clínica** | negar | **permitiu** | **RN02** | não previsto |
| S-14 | Coordenação desativa o vínculo do responsável legal | negar | permitiu | D4 | não previsto |
| S-15 | Coordenação cadastra o primeiro estudante (bootstrap) | permitir | **negou** | RF01 | D-08 |
| S-16 | Profissional 2 altera a nota do profissional 1 mantendo a autoria | negar | negou ✅ | — | — |
| S-16b | Profissional 2 **assume a autoria** e reescreve a nota do profissional 1 | negar | permitiu | integridade | não previsto |
| S-17 | Profissional 2 apaga a nota do profissional 1 | negar | permitiu | integridade | não previsto |
| S-18 | Responsável lê rascunho de material | negar | permitiu | RN04 | D-12 |
| S-19 | Docente 1 aprova o rascunho do docente 2 | negar | permitiu | RN04 | não previsto |
| S-20 | Docente cria material atribuindo autoria a outro docente | negar | permitiu | integridade | não previsto |
| S-21 | Material gerado com versão **PENDENTE** (não validada) | negar | permitiu | RN05/RN07 | parcialmente (D-09) |
| S-22 | Material do estudante 1 com a versão de perfil do estudante 2 | negar | permitiu | integridade | não previsto |
| S-23 | Desfecho registrado em material ainda em rascunho | negar | permitiu | RN04 | não previsto |
| S-24 | Profissional reescreve os **parâmetros** da versão (não só o status) | negar | permitiu | RN03, D-09 | não previsto |
| S-25 | Duas versões `VIGENTE` no mesmo estudante | negar | permitiu | RN05 | não previsto |
| S-26 | Após revogação, docente registra observação | negar | permitiu | RN08 | D-11 |
| S-27 | Após revogação, docente continua lendo o perfil | negar | permitiu | D-11 | D-11 |
| S-28 | Após revogação, docente aprova material | negar | permitiu | RN08 | D-11 |
| S-29 | `fn_meu_papel` e `fn_tem_consentimento_ativo` são `SECURITY DEFINER` sem `search_path` fixo | — | vulnerável | hardening | não previsto |
| S-30 | Pessoa sem vínculo consulta se um estudante tem consentimento (oráculo) | negar | permitiu | minimização | não previsto |

Conclusões:
- **As três falhas mais graves não estavam em nenhuma decisão anterior**: S-04/05/06 (consentimento forjável), S-11/12/13 (coordenação se dá acesso clínico) e S-24 (parâmetro clínico reescrito à mão). As três quebram as regras que a banca mais vai perguntar (RN01 e RN02).
- **Causa comum:** políticas `for all using (...)` sem `with check` próprio, e escrita direta do cliente em tabelas que deveriam ser escritas só por função de servidor (`consentimentos`, `vinculos`, `versoes_perfil`).
- D1 confirmado: com dois vínculos, `fn_meu_papel` devolveu `DOCENTE`. A escolha vem da ordem do índice único (o enum `DOCENTE` vem antes de `COORDENACAO`), não de uma regra de negócio. **[VERIFICADO no PGlite; SUPOSIÇÃO:** o Postgres do Supabase pode escolher outro plano e outro papel.]

### 3.2 Regras que existem só no mock (JavaScript no navegador)
Tudo o que `mockApi.ts` aplica e `0002` não aplica precisa ir para o banco ou para uma Edge Function antes de trocar para `supabaseApi`. Do contrário, a troca **piora** a segurança:

| Regra no mock | Onde | Destino no servidor |
|---|---|---|
| Só coordenação institucional cadastra estudante | `cadastrarEstudante` | RPC `fn_cadastrar_estudante` (ADR-04) |
| Profissional exige registro de conselho; um vínculo ativo por pessoa e estudante | `vincular` | `check` + `unique` + fluxo de proposta (ADR-05) |
| Escrita exige consentimento; docente e profissional perdem leitura após revogação | `exigirConsentimento`, `exigirLeitura` | policies (ADR-08) |
| Ciclo fechado não recebe observação | `registrarObservacao` | policy/trigger |
| Fechamento cria versão (PENDENTE ou VIGENTE por RN06) e abre o próximo ciclo | `fecharCiclo` | Edge Function `fechar-ciclo` |
| Rascunho é privado do docente; só rascunho é aprovado; desfecho só em aprovado | `listarMateriais`, `aprovarMaterial`, `registrarDesfecho` | policies + trigger de transição |
| Data do laudo oculta para o docente (coluna) | `obterEstudante` | view/RPC; RLS não esconde coluna (ADR-06, D7) |
| Exportar e excluir | `exportarDados`, `excluirEstudante` | Edge Functions |
| Auditoria de eventos | `registrarAuditoria` | triggers `security definer` (ADR-11) |

### 3.3 Defeitos no próprio mock **[VERIFICADO]**
- **M-01 Várias versões "vigentes".** `fecharCiclo` no modo pedagógico e `validarVersao` marcam a nova versão como `VIGENTE` sem rebaixar a anterior. A tela de validação mostra três versões "Vigente" ao mesmo tempo (`screens/antes/31-validar-1280.png`). Pior: `versaoVigente()` escolhe a **maior `dataVigencia`**, então aprovar tarde uma versão antiga e expirada a torna vigente por cima de uma mais nova. É a mesma falha de S-25. Correção: status `SUBSTITUIDA` mais índice único parcial `(estudante_id) where status_validacao = 'VIGENTE'`.
- **M-02** A trilha de auditoria na tela de consentimento diz "Quem lê: todos os vinculados", mas a matriz v2 restringe a auditoria a responsável e coordenação (`11-consentimento-390.png`).
- **M-03** `listarPerfisDemo` devolve e-mail de todos os usuários (aceitável só na demo).
- **M-04** Mais de um responsável: qualquer responsável vinculado revoga ou exclui o estudante sozinho, e os demais não são avisados (D4).

---

## 4. Testes e banco **[VERIFICADO]**

| Comando | Resultado (07/10/2026, Node 24.15) |
|---|---|
| `npm run test:motor` | 3 arquivos, **30/30** ✅ (regras 11, adaptador 9, ciclos 10) |
| `npm run test:web` | 4 arquivos, **68/68** ✅ (há avisos `act(...)` conhecidos, T-10) |
| `npm run db:validar` | 10 tabelas, 18 policies, 10/10 com RLS, seed OK |
| `node scripts/sondar-rls.mjs` | 31 sondas, **25 falhas** (§3.1) |
| `supabase start` / `db reset` | **Não executado.** `docker version` respondeu "failed to connect to the docker API… dockerDesktopLinuxEngine". O Docker Desktop está instalado (`C:\Program Files\Docker\…`), mas parado. Supabase CLI 2.117.0 disponível. |

**Restrição:** a máquina de desenvolvimento não roda Docker. A estratégia passa a ser: PGlite localmente (migrations, sondas e a suíte de políticas em Vitest) e o mesmo conjunto de testes rodando contra o Postgres do Supabase no CI (o runner do GitHub tem Docker). O que o PGlite **não** cobre e só o CI prova: GRANTs reais, `auth.uid()` de verdade via PostgREST/JWT, extensões (`pg_cron`) e o `security definer` com o dono `postgres` do Supabase.

Achados de banco fora das sondas:
- `materiais_adaptados.status_aprovacao`, `ciclos_observacao.status` e `vinculos.status` são `text` livres (D-13 não aplicado).
- `seed.sql`: o `parametros` tem 5 campos (falta `blocosPorMaterial`), diferente do tipo `ParametrosAdaptacao`, que tem 6.
- O seed descreve o estudante fictício como "TEA nível 1" em comentário. É fictício e aceitável, mas contradiz o espírito de D-01. Sugiro remover.
- Sem `escolas`, sem `auditoria`, sem `convites`, sem `notificacoes`.
- `config.toml`: `enable_signup = true` (o prompt pede só convite), senha mínima de 6 e `site_url` errado.

---

## 5. Dívidas visuais e de UX
Capturas do estado atual: `docs/reformulacao/screens/antes/` (26 telas × 390 px e 1280 px = 52 PNG, Chrome headless, `prefers-reduced-motion`).

| # | Dívida | Evidência | Gravidade |
|---|---|---|---|
| UX-01 | No celular, cabeçalho e navegação ocupam cerca de 210 px de 844 antes do conteúdo, e os itens quebram em duas linhas. Não há navegação inferior | `20-painel-docente-390.png` | Alta |
| UX-02 | O `h1` recebe foco a cada troca de rota e mostra um anel de foco grosso no carregamento. Parece campo editável | todas as telas | Média |
| UX-03 | Jargão para leigos: "RN01", "RN02", "RN03" e "Contraste mínimo 7:1" aparecem para docente e família | `20-painel-docente`, `21-estudante-docente`, `11-consentimento` | Alta |
| UX-04 | O perfil do estudante mostra parâmetros técnicos ao docente, sem o "por quê" em linguagem de sala | `21-estudante-docente-1280.png` | Média |
| UX-05 | O mesmo layout de cartões para todos os papéis, com grid desbalanceado (cartão "Histórico" sozinho) | `21-estudante-docente-1280.png` | Baixa |
| UX-06 | Sem ícones. Estados dependem de pílulas coloridas (com texto, o que é correto, mas a leitura é pobre) | geral | Baixa |
| UX-07 | A trilha de auditoria não diz **quem** fez cada coisa | `11-consentimento-390.png` | Média (confiança) |
| UX-08 | O histórico de versões mostra várias "Vigente" (M-01) | `31-validar-1280.png` | Alta (bug) |
| UX-09 | Responsável não tem tela de "quem vê o quê e quem acessou", que o prompt chama de tela mais importante | ausente | Alta |
| UX-10 | Sem tema escuro, e a fonte para dislexia não é opção de preferência | `05-acessibilidade` | Baixa |

O que já está bom e **não deve se perder** na reformulação: skip link, `<dialog>` nativo, `aria-live`, resumo de erros, alvos de 44 px, tema de alto contraste, tokens com contraste verificado e axe em todas as telas.

---

## 6. Divergências com os diagramas do TCC (o artigo cita)
- **Diagrama de classes:** faltam `Escola`, `Auditoria`, `NotaClinica`, `Convite`; `Usuario.papelInstitucional`; `Observacao.papelAutor`; `ParametrosAdaptacao` com 6 campos (D-13). Depois do M1, o diagrama precisa ser refeito.
- **Diagrama de sequência (`gerar-material`):** sem divergência de mensagens. Faltam o passo de verificação de consentimento e o de "versão VIGENTE única" (D9).
- **Casos de uso:** entram "Confirmar profissional proposto" (responsável) e "Aceitar convite" (todos).

---

## 7. Ações imediatas que não dependem de decisão
1. Manter `scripts/sondar-rls.mjs` como especificação: cada sonda vira um teste da suíte de políticas (Vitest + PGlite) no M1 com o resultado invertido (negado).
2. Fazer o job `db` do CI rodar as migrations novas e a suíte de políticas contra o Supabase real (sem Docker local).
3. Corrigir M-01 no mock **junto** com a migration (a mesma regra nos dois lados).
