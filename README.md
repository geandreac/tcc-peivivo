# PEI Vivo — starter do repositório

Este não é o app completo — é o **núcleo de dados e permissões** que o próprio
cronograma do pré-projeto (seção 9) define como pré-requisito de tudo o mais.
Cada arquivo aqui existe porque um diagrama ou uma regra já documentada o exige;
nada foi inventado nesta etapa.

## Mapeamento diagrama → código

| Artefato do TCC | Arquivo neste repositório |
|---|---|
| Diagrama de Classes | `supabase/migrations/0001_core_schema.sql` |
| Quadro 7 — Matriz de permissões | `supabase/migrations/0002_rls_policies.sql` |
| Quadro 5 — Regras de conversão | `packages/motor-adaptacao/src/regras.ts` |
| RN03 — Assimetria conservadora | `regras.test.ts`, testes "RN03" |
| Cenário demonstrativo A (seção 6.7) | `supabase/seed.sql` + teste "Cenário demonstrativo A" |
| Diagrama de Sequência | ainda não implementado — é o próximo passo (ver abaixo) |

## Como rodar agora

```bash
npm install                 # instala todos os workspaces
npm run test:motor          # motor de adaptação — 11/11, sem banco nem rede
npm run db:validar          # roda migrations + seed num Postgres real (PGlite, sem Docker)
```

Para o banco na nuvem (projeto de desenvolvimento, ver `docs/plano-desenvolvimento.md` P0.4):

```bash
npx supabase login
npx supabase link --project-ref <ref-do-pei-vivo-dev>
npx supabase db push          # aplica as migrations (o seed NÃO vai junto)
npx supabase db reset --linked  # zera o projeto de dev e carrega supabase/seed.sql
```

> **Docker não é necessário na máquina de desenvolvimento.** As migrations são
> validadas localmente em PGlite e, a cada push, no Supabase real dentro do CI
> (`.github/workflows/ci.yml`). Ver `docs/plano-desenvolvimento.md` §2.

## Por que essa ordem e não outra

1. **Schema antes de tudo** — sem tabela, não há o que proteger nem o que testar.
2. **RLS logo em seguida, antes de qualquer tela** — é o diferencial ético do
   projeto (RN02). Se a permissão for "lembrada" depois, na interface, ela
   sempre vaza por algum caminho que ninguém pensou em proteger.
3. **Motor de adaptação isolado, sem banco nem IA** — é código puro
   (`observação → parâmetro`), testável em milissegundos, e é o que prova
   pra banca que o sistema não é um wrapper de IA (RNF08).
4. **Frontend e Edge Functions vêm depois** — só faz sentido desenhar a tela
   de aprovação de material quando o dado que ela mostra já existe e já está
   protegido.

## Próximos passos

O plano completo, com fases, cards e datas, está em
`docs/plano-desenvolvimento.md`. Requisitos por perfil e decisões de projeto
em `docs/requisitos.md`; rastreabilidade RF → decisão → teste → commit em
`docs/rastreabilidade.md`.

## Estrutura de pastas prevista (o que ainda falta criar)

```
pei-vivo/
├── apps/
│   └── web/                    # React + Vite PWA — RF08-RF12, RNF01-RNF03
├── supabase/
│   ├── migrations/             # ✅ 0001 schema, 0002 RLS
│   ├── seed.sql                # ✅ cenário A fictício (só db reset)
│   └── functions/
│       ├── fechar-ciclo/       # D-09
│       └── gerar-material/     # Diagrama de Sequência → código
├── packages/
│   ├── motor-adaptacao/        # ✅ regras + testes
│   └── testes-rls/             # Fase 1
├── scripts/
│   └── validar-migrations.mjs  # ✅ PGlite
└── docs/
    ├── requisitos.md           # ✅
    ├── plano-desenvolvimento.md# ✅
    ├── rastreabilidade.md      # ✅
    └── tcc/                    # ✅ fontes do TCC (pré-projeto, diagramas)
```
