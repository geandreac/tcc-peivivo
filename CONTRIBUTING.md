# Como contribuir — PEI Vivo

**Versão:** 2.0 — 21/09/2026 (substitui a 1.0 de 14/09; muda o padrão de nome de branch e adota Conventional Commits).
Repositório: <https://github.com/geandreac/tcc-peivivo>. Dois integrantes (**Geandre** e **Jean**), revisão cruzada obrigatória, CI em `main` e `development`.

O objetivo deste fluxo é simples: os dois trabalham em paralelo sem pisar no código um do outro, e `main` está **sempre demonstrável** para a orientadora e a banca.

---

## 1. Clonar o projeto

```bash
git clone https://github.com/geandreac/tcc-peivivo.git
cd tcc-peivivo
npm install                 # instala os workspaces (packages/motor-adaptacao, apps/web)
cp .env.example .env        # opcional hoje: o protótipo roda sem variáveis (mockApi)
```

Pré-requisitos: Node ≥ 20, npm ≥ 10, Git. Docker **não** é necessário (migrations validam em PGlite; o CI usa Supabase real). Detalhes em `docs/guia-de-uso.md` Parte 1.

Confira a máquina antes de mexer em qualquer coisa:

```bash
npm test && npm run typecheck && npm run db:validar && npm run contraste
```

## 2. Branches

| Branch | Papel | Quem escreve | Regra |
|---|---|---|---|
| `main` | Estável, demonstrável a qualquer momento (é o que a banca vê) | Ninguém diretamente | Só recebe merge de `development` via Pull Request com CI verde. Cada merge = um marco (M0…M6) ou correção urgente de demo |
| `development` | Integração: onde o trabalho dos dois se encontra | Ninguém diretamente | Só recebe merge de branches de trabalho via PR, com CI verde **e** revisão do outro integrante |
| branches de trabalho | Uma tarefa (card do Kanban, correção, teste, documento) | Quem pegou a tarefa | Nasce de `development`, volta para `development` |

### 2.1 Nome das branches de trabalho

Padrão: `<tipo>/<autor>-<descricao-curta>` (minúsculas, hífens, sem acento). O card do plano (`P<fase>.<n>`) entra na descrição quando existe.

| Tipo | Uso | Exemplos |
|---|---|---|
| `feature/` | Funcionalidade nova | `feature/geandre-autenticacao-supabase`, `feature/jean-dashboard-terapeutas`, `feature/geandre-p1.1-enums-0004` |
| `fix/` | Correção | `fix/jean-foco-modal-safari`, `fix/geandre-contraste-badge` |
| `test/` | Só testes (sem mudar comportamento) | `test/autenticacao-e-rotas`, `test/rls-negativos` |
| `docs/` | Só documentação | `docs/governanca-e-processos`, `docs/bpmn-processos` |

Branches `test/` e `docs/` podem omitir o autor quando são compartilhadas pela dupla.

### 2.2 Criar a branch a partir de `development`

```bash
git switch development
git pull --ff-only
git switch -c feature/jean-dashboard-terapeutas
```

## 3. Manter a branch atualizada

Antes de abrir o PR e sempre que `development` receber merge de outra branch:

```bash
git fetch origin
git rebase origin/development          # histórico linear; resolva conflitos aqui, não no PR
npm test && npm run typecheck          # tem que continuar verde depois do rebase
git push --force-with-lease            # nunca --force puro
```

Se a branch já foi revisada e o rebase for grande, prefira `git merge origin/development` para não invalidar a revisão.

## 4. Executar o projeto localmente

```bash
npm run dev            # protótipo em http://localhost:5173 (dados fictícios, IA desligada)
npm run build          # typecheck + build de produção em apps/web/dist
npm run preview        # serve o build
```

Porta ocupada? `npx vite --port 5179 -w apps/web`. Roteiro de uso por perfil em `docs/guia-de-uso-do-sistema.md`.

## 5. Executar os testes

| Mudou em… | Rode localmente | O CI roda |
|---|---|---|
| `packages/motor-adaptacao/**` | `npm run test:motor` | job `motor` (typecheck + cobertura ≥ 70 %) |
| `apps/web/**` | `npm run test:web` e `npm run typecheck -w apps/web` | job `web` (contraste + typecheck + Vitest/axe + cobertura ≥ 70 % + build) |
| `apps/web/src/styles/tokens.css` | `npm run contraste` | job `web` |
| `supabase/migrations/**`, `supabase/seed.sql` | `npm run db:validar` | job `db` (Supabase real no runner) |
| `docs/**` só | nada obrigatório | nada (CI ignora `docs/**` e `*.md`) |

`npm test` roda tudo (motor + web). Cobertura: `npm run test:coverage`. Antes de todo push: `npm test && npm run typecheck`.

## 6. Commits — Conventional Commits

Formato: `<tipo>(<escopo opcional>): <descrição no imperativo, em português>`. Uma linha ≤ 72 caracteres; corpo opcional explicando o **porquê**; rodapé com `Refs P4.4` ou `Closes #12` quando houver card/issue.

| Tipo | Quando | Exemplo |
|---|---|---|
| `feat` | Funcionalidade nova | `feat(web): adiciona login específico para familiares` |
| `fix` | Correção de defeito | `fix(web): corrige ordem de foco no formulário de autenticação` |
| `docs` | Só documentação | `docs: adiciona plano de testes do sistema` |
| `test` | Só testes | `test(web): cria testes de rota protegida por perfil` |
| `refactor` | Sem mudar comportamento | `refactor(services): organiza serviço de autenticação` |
| `style` | Formatação/CSS sem lógica | `style(web): ajusta layout responsivo do dashboard de professores` |
| `chore` | Build, dependências, CI | `chore: atualiza dependências do projeto` |
| `ci` | Workflows | `ci: exige cobertura mínima no job web` |

Escopos usados: `motor`, `web`, `db` (migrations/RLS), `services`, `ci`, `docs`. Os commits anteriores a 21/09/2026 seguem o padrão antigo (`P4.3: …`, `web: …`); não reescrever o histórico.

## 7. Abrir Pull Requests

1. `git push -u origin <branch>` e abrir o PR no GitHub com **base `development`**.
2. Título no mesmo padrão dos commits (`feat(web): …`). O template (`.github/pull_request_template.md`) é preenchido por completo.
3. Marcar o **outro integrante** como revisor. Quem escreveu não aprova o próprio PR.
4. PR pequeno (idealmente < 400 linhas de diff). Um card por PR.
5. Esperar o CI (`motor`, `db`, `web`) ficar verde antes de pedir revisão.

## 8. Checklist obrigatório antes do merge

- [ ] CI verde nos três jobs.
- [ ] `npm test` e `npm run typecheck` verdes localmente após o último rebase.
- [ ] Se toca permissão: teste do caminho **NEGADO** (`mockApi.test.ts` hoje; RLS na Fase 1).
- [ ] Se é tela: `semViolacoesAxe` no teste; percorrida só com teclado; estados carregando / vazio / sucesso / erro / negado; conferida em 375 px e zoom 200 %; cores só de `tokens.css`; rótulos leigos em `utils/rotulos.ts`.
- [ ] Linha em `docs/rastreabilidade.md` (formato da disciplina) e `docs/matriz-rastreabilidade.md` (RF → tela → arquivo → teste).
- [ ] Nenhum segredo, `.env`, dado real de estudante ou arquivo gerado (`dist/`, `coverage/`) no diff.
- [ ] Revisão aprovada pelo outro integrante; comentários resolvidos.
- [ ] Merge por **squash** (um commit por card em `development`) com mensagem Conventional.

## 9. Promover `development` para `main`

Ao fechar um marco (M0…M6) ou quando a demonstração precisa de algo novo:

1. Confirmar que `development` está verde no CI e que `npm run build` passa.
2. Abrir PR `development → main` com título `release: M<n> — <o que passou a ser verdade>`.
3. Revisão dos dois integrantes (checklist do §8 + roteiro da demo em `docs/guia-de-uso-do-sistema.md` executado de ponta a ponta).
4. Merge **sem squash** (`merge commit`) para preservar o histórico dos cards; criar tag `v0.<marco>.0`.
5. Nunca `git push origin main` direto.

## 10. Resolução de conflitos

- Conflitos se resolvem **na branch de trabalho**, via `git rebase origin/development`, nunca em `main`.
- Quem resolve é o autor da branch; se o conflito envolve código do outro integrante, resolvem juntos (chamada de 15 min) — não se adivinha a intenção alheia.
- Depois de resolver: `npm test && npm run typecheck` **obrigatório** antes do push.
- Arquivos que geram conflito com frequência (`docs/rastreabilidade.md`, `docs/matriz-rastreabilidade.md`, `README.md`): editar só a própria linha/seção; nunca reordenar tabelas em PR de funcionalidade.
- Conflito em `package-lock.json`: aceitar a versão de `development` e rodar `npm install` de novo.
- Prevenção: PRs pequenos, rebase diário, um card por branch, divisão de responsabilidades do §11.

## 11. Responsáveis e divisão de trabalho

A revisão é cruzada: **Geandre revisa o que Jean escreve e vice-versa**. Divisão por área para reduzir conflitos de merge (adaptada da proposta da disciplina ao estado real do projeto):

| Área | Responsável principal | Arquivos típicos |
|---|---|---|
| Arquitetura, rotas, autenticação e proteção de rotas (`useSessao`, `RotaProtegida`, `supabaseApi`) | **Geandre** | `apps/web/src/routes/`, `hooks/useSessao.tsx`, `services/` |
| Componentes reutilizáveis e design system (tokens, contraste) | **Geandre** | `apps/web/src/components/`, `styles/` |
| Acessibilidade, WCAG 2.2, testes de acessibilidade e de usabilidade | **Geandre** | `docs/acessibilidade.md`, `docs/wcag-2.2.md`, `test/utils.tsx`, roteiro do piloto |
| Dados e servidor: migrations, RLS, testes RLS negativos, Edge Functions, IA | **Geandre** | `supabase/`, `supabase/functions/` |
| Documentação técnica e de governança; revisão final da integração em `development` | **Geandre** | `docs/*.md`, `CONTRIBUTING.md` |
| Telas específicas dos perfis, dashboards e formulários | **Jean** | `apps/web/src/pages/` |
| Dados mockados e cenários de demonstração | **Jean** | `apps/web/src/mocks/dados.ts`, `supabase/seed.sql` |
| Estados de carregamento / vazio / sucesso / erro e responsividade | **Jean** | `pages/`, `styles/componentes.css` |
| Testes funcionais e de fluxo (Vitest em tela hoje; Playwright golden path P4.19/P4.20) | **Jean** | `pages/*.test.tsx`, `e2e/` |
| Correções visuais e de experiência do usuário; avaliação heurística de acompanhamento | **Jean** | `pages/`, `styles/`, `docs/avaliacao-heuristica.md` |
| Motor de adaptação (`regras`, `ciclos`, `ancora`, `adaptador`) | **Jean** (escreve) / **Geandre** (revisa a RN03) | `packages/motor-adaptacao/` |

**Por que difere da proposta padrão da disciplina.** A proposta original coloca os dois integrantes só no front-end. Neste projeto o front-end (19 telas, 68 testes) já está funcional; o que resta e bloqueia a defesa é o **backend** (migration `0004`, RLS, Edge Functions, `supabaseApi`). Como a arquitetura de permissões atravessa banco → serviços → rotas, ela fica com um único responsável (Geandre) para não fragmentar a matriz v2 entre duas pessoas; Jean concentra-se em tudo o que o usuário vê e testa. Essa divisão coincide com as frentes A/B de `docs/plano-desenvolvimento.md` §0 e evita que os dois editem `services/` e `pages/` ao mesmo tempo. A dupla pode inverter os nomes; a regra que não muda é a revisão cruzada.

**Estado real em 21/09/2026:** todos os 12 commits são de Geandre; Jean ainda não tem commit nem PR. Primeiro PR sugerido para Jean: `test/jean-playwright-golden-path` (P4.19) ou `feature/jean-badge-pendencias` (heurística 1, sev. 2).

## 12. Regras de acessibilidade e qualidade para aprovação

Um PR **não é aprovado** se violar qualquer item abaixo (`docs/acessibilidade.md` §11 tem o checklist por tela):

1. `button` para ação, `a` para navegação; nenhum `div`/`span` clicável.
2. Todo campo com `label`; dica e erro via `aria-describedby`; `aria-invalid` quando há erro; resumo de erros focável (`ResumoErros`).
3. Um `h1` por tela; níveis sem salto; `useTitulo` atualiza o título do documento.
4. Foco visível em tudo; Esc fecha modais e o foco retorna; sem `tabindex` positivo; sem armadilhas.
5. Nenhuma informação transmitida só por cor; cores só de `styles/tokens.css` (`npm run contraste` verde).
6. Reflow em 320 px sem rolagem horizontal (exceto tabelas em `.tabela-rolagem`); alvos ≥ 44 px.
7. Estados carregando (`role=status`), vazio, sucesso (`aria-live`), erro (mensagem simples + recuperação) e negado (motivo + saída).
8. `semViolacoesAxe(container)` no teste da tela; teste do caminho negado quando há permissão envolvida.
9. TypeScript estrito sem `any` novo; cobertura não cai abaixo de 70 % (CI falha).
10. Nenhum dado real de estudante (nomes claramente fictícios, comentário no topo do arquivo de dados).
11. Textos em linguagem simples (rótulos leigos em `utils/rotulos.ts`); códigos internos (RN01, D-12) só como referência entre parênteses.
12. Documentação atualizada no mesmo PR quando a mudança afeta requisito, permissão, tela ou processo.

---

## Proteção de branches (fazer uma vez, no GitHub — pendente em 21/09/2026)

A API pública do GitHub reporta `"protected": false` para `main`. Configurar em *Settings → Branches → Add branch ruleset*:

- `main`: *Require a pull request before merging* (1 aprovação), *Require status checks to pass* (`motor`, `db`, `web`), *Require branches to be up to date*, *Do not allow bypassing*, *Block force pushes*.
- `development`: *Require status checks to pass* (`motor`, `db`, `web`) e *Require a pull request* (1 aprovação). Se a dupla preferir agilidade, manter só os status checks — mas registrar a decisão em `docs/cobit-governanca.md` (controle C-03).

Adicionar Jean como colaborador com permissão *Write* (Settings → Collaborators).
