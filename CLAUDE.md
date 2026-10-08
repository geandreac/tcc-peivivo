# PEI Vivo — instruções de projeto

TCC de Sistemas de Informação (CEUNI FAMETRO, orientadora Luana Leal, dupla
Geandre Alfaia Colares e Jean Victor Torres dos Santos). Plataforma que liga
escola, família e equipe de saúde num ciclo observar → validar → adaptar →
retroalimentar, gerando material didático personalizado para estudantes com
TEA, TDAH e dislexia.

## Ordem de implementação — não pule etapas

1. **Schema + RLS** (`supabase/migrations/`) — já existe, é a base de tudo.
2. **`motor-adaptacao`** — regras puras, sem banco nem rede. Já existe e testado.
3. **Edge Function `gerar-material`** — segue o Diagrama de Sequência
   mensagem por mensagem (ver `docs/` quando os SVGs forem adicionados).
4. **Frontend** — só depois que 1–3 estiverem estáveis. Exceção controlada
   (D-17): `apps/web` existe como **protótipo funcional** sobre `services/mockApi.ts`,
   que reproduz a matriz de permissões v2 e nega o que o RLS negará. Nenhuma
   tela decide permissão; ao trocar por `supabaseApi`, nenhuma tela muda.

Nunca implemente uma tela antes da política RLS que protege o dado que ela mostra
(no protótipo: antes do cenário negativo correspondente em `mockApi.test.ts`).

## Comandos

```bash
npm test                                    # motor (30) + funções (24) + políticas RLS (88, PGlite) + web (91, axe) — 100%
npm run dev                                 # protótipo em http://localhost:5173
npm run contraste                           # tokens de cor ≥ 4,5:1 / 3:1
npm run db:validar                          # migrations + seed no PGlite (sem Docker)
node scripts/sondar-rls.mjs                 # evidência histórica: 25/31 ataques passavam em 0002
node scripts/sincronizar-funcoes.mjs        # copia motor/contratos/funcoes p/ supabase/functions/_shared/gerado (Deno)
npm run test:e2e                            # Playwright (Chrome local, porta 5179): 20 E2E em 390/1280 px + axe com contraste real
npx supabase db push                        # aplica as migrations (sem seed) no projeto linkado
```

**A máquina da dupla não roda Docker.** Nada de `supabase start`/`db reset` local:
banco e políticas são validados no PGlite; o Supabase real roda só no job `db` do CI
(mesma suíte `packages/politicas` via `DATABASE_URL`).

## Convenções

- SQL: `snake_case`, tabelas no plural (`estudantes`, `observacoes`).
- TypeScript: `camelCase`, tipos em `packages/motor-adaptacao/src/tipos.ts`
  espelham 1:1 o `ParametrosAdaptacao` do diagrama de classes — não crie um
  tipo paralelo, estenda esse.
- Todo `id` é `uuid` (`gen_random_uuid()`), nunca serial incremental.
- Toda tabela sensível a estudante tem RLS habilitado antes do primeiro `insert`.
- Políticas (D-20, `0004`): nunca `for all`; toda escrita com `with check`; tabelas
  que definem acesso de outra pessoa (vínculos, consentimentos, versões, materiais,
  notas) só são escritas por RPC `security definer` (`search_path = ''`) ou Edge
  Function. Helpers ficam em `privado` (não exposto). Negado → `42501`, conflito →
  `PT409`, inválido → `22023`. Toda policy/RPC nova ganha teste negado em
  `packages/politicas`.
- GRANT por coluna em `estudantes`, `consentimentos`, `usuarios`: no cliente,
  **nunca `select *`** — liste as colunas.
- Front-end (`apps/web`): `button` para ação, `a` para navegação; todo campo com
  `label`; erros via `ResumoErros` + `aria-describedby`; estados carregando /
  vazio / sucesso / erro / negado em toda tela; cores só de `styles/tokens.css`
  (pares verificados em `docs/ux-ui.md` §3.2); rótulos leigos em `utils/rotulos.ts`;
  toda tela nova com `semViolacoesAxe` no teste. Guia: `docs/acessibilidade.md`.

## Regras de negócio (aplicam-se a qualquer feature que as toque)

| Código | Regra |
|---|---|
| RN01 | Sem consentimento ativo do responsável, nenhuma escrita nem geração no estudante; leitura só para responsável e coordenação (D-11). |
| RN02 | Docente nunca lê nota clínica — só `observacoes` e `versoes_perfil.parametros`. O sistema **não armazena laudo/diagnóstico** (D-01). Nota clínica só via `fn_ler_notas_clinicas` (aal2, auditada). |
| RN03 | Elevar parâmetro exige 2 ciclos consecutivos "ampliada"; reduzir é imediato. |
| RN04 | Nenhum material chega ao estudante sem `status_aprovacao = 'APROVADO'` pelo docente. |
| RN05 | Sem validação do profissional em 7 dias, a proposta vira `EXPIRADA` (não volta) e mantém a última `VersaoPerfil` `VIGENTE` — no máximo uma `VIGENTE` por estudante (D-35). |
| RN06 | Sem `PROFISSIONAL_SAUDE` vinculado, só a camada determinística roda (sem IA). |
| RN07 | Validação clínica é por ciclo (conjunto de parâmetros), nunca por material individual. |
| RN08 | Responsável revoga consentimento a qualquer momento; bloqueia geração imediatamente. |

A tabela completa de RF/RNF e o mapeamento para código está em `README.md`.
A análise de requisitos por perfil, as decisões de projeto (`D-nn`, hoje até
D-39) e a priorização MoSCoW (§11) estão em `docs/requisitos.md` — leia antes
de implementar qualquer feature; toda decisão nova ganha um `D-nn` lá. Para
telas: `docs/ux-ui.md` (arquitetura, telas, design system),
`docs/acessibilidade.md`, `docs/wcag-2.2.md`, `docs/avaliacao-heuristica.md`,
`docs/plano-de-testes.md`; prompt de extensão em `docs/prompt-design-ia.md`.
Governança e processo (auditoria de 21/09/2026): `docs/relatorio-de-conformidade.md`
(plano de ação), `docs/checklist-final-tcc.md`, `docs/matriz-rastreabilidade.md`,
`docs/bpmn-processos.md`, `docs/pdca.md`, `docs/itil-servicos.md`,
`docs/cobit-governanca.md`, `docs/gestao-de-riscos.md`, `docs/seguranca-e-privacidade.md`.
Fluxo de branches e commits (Conventional Commits, `feature/<autor>-…`): `CONTRIBUTING.md`.

## Testes

- `motor-adaptacao`: funções puras, Vitest, sem mocks de rede/banco. Todo PR
  que mexer em `regras.ts` precisa de teste cobrindo a assimetria da RN03
  (ver `regras.test.ts` como modelo).
- Políticas RLS: teste tentando o acesso NEGADO explicitamente (ex.: docente
  lendo `notas_clinicas` deve retornar 403), não só o caminho permitido.

## Dados

**Nunca use dados reais de estudante, nem em desenvolvimento.**
`supabase/seed.sql` é fictício por design — mantenha assim. Qualquer dado de
teste novo segue o mesmo padrão (nomes claramente fictícios, comentário no
topo do arquivo).

## Onde estamos

Motor completo (30 testes, 97 %). Protótipo `apps/web` funcional sobre mock com
permissões (22 telas, 72 testes com axe-core). Documentação de UX/acessibilidade
(14/09) e de governança/processos (21/09/2026).

**Reformulação (desde 07/10/2026)** — fonte de verdade: `docs/reformulacao/`
(AUDITORIA, FLUXOS, DECISOES = ADR-00…20 = D-19…D-39, PLANO R0–R5, marcos/).
Trilha mínima aprovada até o congelamento de 26/11. **R1 (banco que nega) feito:**
migrations `0003`–`0005`, políticas verdes no PGlite **e no Supabase real (CI)**.
**R3 (ciclo no servidor) feito, antecipado:** `0006` (portas das EFs), `packages/
contratos` (Zod), `packages/funcoes` (casos de uso puros), Edge Functions
`gerar-material` e `fechar-ciclo` (camada HTTP fina; nunca edite
`_shared/gerado/`, rode o script). Bloqueado: R2 (login real) precisa de projeto
Supabase na nuvem. **R2 parcial:** `packages/politicas/src/http.test.ts` prova no CI, com
Auth + PostgREST reais, o 403 com token válido e o TOTP (aal2). **R4 (UX) feito:** navegação inferior/lateral, linguagem
leiga (nunca sigla RN/D na tela), Privacidade (família confirma profissional), painel
da escola (só contagens), notificações tipadas, tema escuro e leitura facilitada
(pares em `scripts/contraste.mjs`). Depois: R5 (E2E e provas). O diagrama de classes do artigo
está desatualizado → `docs/reformulacao/DIAGRAMA-CLASSES.md`.
