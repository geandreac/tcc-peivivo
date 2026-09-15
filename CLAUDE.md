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
npm test                                    # motor (30) + web (61, com axe-core) — deve passar 100%
npm run dev                                 # protótipo em http://localhost:5173
npm run contraste                           # tokens de cor ≥ 4,5:1 / 3:1
npx supabase db push                        # aplica as migrations (sem seed) no projeto linkado
```

## Convenções

- SQL: `snake_case`, tabelas no plural (`estudantes`, `observacoes`).
- TypeScript: `camelCase`, tipos em `packages/motor-adaptacao/src/tipos.ts`
  espelham 1:1 o `ParametrosAdaptacao` do diagrama de classes — não crie um
  tipo paralelo, estenda esse.
- Todo `id` é `uuid` (`gen_random_uuid()`), nunca serial incremental.
- Toda tabela sensível a estudante tem RLS habilitado antes do primeiro `insert`.
- Front-end (`apps/web`): `button` para ação, `a` para navegação; todo campo com
  `label`; erros via `ResumoErros` + `aria-describedby`; estados carregando /
  vazio / sucesso / erro / negado em toda tela; cores só de `styles/tokens.css`
  (pares verificados em `docs/ux-ui.md` §3.2); rótulos leigos em `utils/rotulos.ts`;
  toda tela nova com `semViolacoesAxe` no teste. Guia: `docs/acessibilidade.md`.

## Regras de negócio (aplicam-se a qualquer feature que as toque)

| Código | Regra |
|---|---|
| RN01 | Sem consentimento ativo do responsável, nenhuma escrita nem geração no estudante; leitura só para responsável e coordenação (D-11). |
| RN02 | Docente nunca lê nota clínica — só `observacoes` e `versoes_perfil.parametros`. O sistema **não armazena laudo/diagnóstico** (D-01). |
| RN03 | Elevar parâmetro exige 2 ciclos consecutivos "ampliada"; reduzir é imediato. |
| RN04 | Nenhum material chega ao estudante sem `status_aprovacao = 'APROVADO'` pelo docente. |
| RN05 | Sem validação do profissional em 7 dias, mantém a última `VersaoPerfil` `VIGENTE`. |
| RN06 | Sem `PROFISSIONAL_SAUDE` vinculado, só a camada determinística roda (sem IA). |
| RN07 | Validação clínica é por ciclo (conjunto de parâmetros), nunca por material individual. |
| RN08 | Responsável revoga consentimento a qualquer momento; bloqueia geração imediatamente. |

A tabela completa de RF/RNF e o mapeamento para código está em `README.md`.
A análise de requisitos por perfil, as decisões de projeto (`D-nn`, hoje até
D-18) e a priorização MoSCoW (§11) estão em `docs/requisitos.md` — leia antes
de implementar qualquer feature; toda decisão nova ganha um `D-nn` lá. Para
telas: `docs/ux-ui.md` (arquitetura, telas, design system),
`docs/acessibilidade.md`, `docs/wcag-2.2.md`, `docs/avaliacao-heuristica.md`,
`docs/plano-de-testes.md`; prompt de extensão em `docs/prompt-design-ia.md`.

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

Migrations validadas em PGlite (P0.3). Motor completo (P2.1–P2.5, 30 testes,
97 %). Protótipo `apps/web` funcional sobre mock com permissões (19 telas, 59
testes com axe-core), documentação de UX/acessibilidade/WCAG/heurísticas/testes
entregue (14/09/2026). Plano completo em `docs/plano-desenvolvimento.md`.
Próximos: P0.1 (GitHub), P0.4 (Supabase dev), Fase 1 (migration `0004` + testes
RLS reaproveitando `apps/web/src/services/mockApi.test.ts`), Fase 3 (Edge
Functions), depois `supabaseApi` em `apps/web/src/services/`.
