# Como contribuir — fluxo de branches da dupla

Repositório: <https://github.com/geandreac/tcc-peivivo>. Dois integrantes
(Geandre e Jean), Kanban com revisão cruzada, CI obrigatório. O modelo abaixo
existe para que os dois trabalhem em paralelo sem pisar no código um do outro
e para que `main` esteja **sempre demonstrável**.

## Branches

| Branch | Papel | Quem escreve | Regra |
|---|---|---|---|
| `main` | Estável, demonstrável a qualquer momento (é o que a banca vê) | Ninguém diretamente | Só recebe merge de `development` via Pull Request, com CI verde. Cada merge = um marco (M0…M6) ou correção urgente |
| `development` | Integração: onde o trabalho dos dois se encontra | Ninguém diretamente | Só recebe merge de `feature/*` via PR, com CI verde **e revisão do outro integrante** |
| `feature/<frente>-<card>-<resumo>` | Um card do Kanban | Quem pegou o card | Nasce de `development`, volta para `development` |
| `fix/<resumo>` | Correção pontual | Quem achou | Nasce de `development` (ou de `main` se for urgente na demo) |

Exemplos: `feature/A-P1.1-enums-0004`, `feature/B-P4.19-playwright-golden-path`, `fix/foco-modal-safari`.

### Frentes (plano §0)

| Frente | Foco | Fases | Integrante sugerido |
|---|---|---|---|
| **A — Dados e servidor** | migrations, RLS, testes negativos, Edge Functions, IA | 1, 3, 5a | Geandre |
| **B — Motor e interface** | `motor-adaptacao`, `apps/web`, PWA, acessibilidade | 2, 4, 5b | Jean |

A divisão é sugestão; o que não muda é a regra: **quem escreveu não aprova o próprio PR**.

## Ciclo de um card

```bash
git switch development && git pull
git switch -c feature/A-P1.1-enums-0004
# ... trabalho, commits pequenos ...
npm test && npm run typecheck        # tem que passar antes do push
git push -u origin feature/A-P1.1-enums-0004
# abrir PR → base: development; pedir revisão do outro integrante
```

Definition of Done (plano §0): teste automatizado do critério de aceite, PR
revisado pelo outro, linha em `docs/rastreabilidade.md` com o hash do commit,
CI verde. Depois do merge, mover o card para *Concluído*.

## Quando `development` vira `main`

Ao fechar um marco (ou quando a demo precisa de algo novo): PR
`development → main`, título `M<n>: <o que passou a ser verdade>`. Nunca
`git push origin main` direto.

## Testes por frente (o que cada PR precisa rodar)

| Mudou em… | Rode | O CI roda |
|---|---|---|
| `supabase/migrations/**`, `supabase/seed.sql` | `npm run db:validar` | job `db` (Supabase real no runner) + `db:validar` |
| `packages/motor-adaptacao/**` | `npm run test:motor` | job `motor` (typecheck + cobertura ≥ 70 %) |
| `apps/web/**` | `npm run test:web`, `npm run typecheck -w apps/web` | job `web` (contraste + typecheck + Vitest/axe + build) |
| `apps/web/src/styles/tokens.css` | `npm run contraste` | job `web` |
| `docs/**` só | nada | nada (CI não roda em docs) |

## Convenções de commit

`<card>: <o que muda>` — ex.: `P1.3: papel_autor em observacoes + trigger`.
Sem card: `motor:`, `web:`, `docs:`, `ci:`, `chore:`. Mensagem em português,
no imperativo, uma linha; corpo opcional explicando o *porquê*.

## Proteção de `main` (fazer uma vez, no GitHub)

Settings → Branches → Add rule → `main`: *Require a pull request before
merging* (1 aprovação), *Require status checks to pass* (`motor`, `db`, `web`),
*Do not allow bypassing*. Repetir para `development` sem a exigência de
aprovação se quiserem agilidade — mas com status checks.
