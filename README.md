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
| Cenário demonstrativo A (seção 6.7) | `0003_seed_dev.sql` + teste "Cenário demonstrativo A" |
| Diagrama de Sequência | ainda não implementado — é o próximo passo (ver abaixo) |

## Como rodar agora

```bash
# 1. motor de adaptação — não depende de banco nem de rede
cd packages/motor-adaptacao
npm install
npm test          # deve passar 7/7

# 2. schema + RLS — precisa de um projeto Supabase seu
npx supabase init
npx supabase link --project-ref <seu-project-ref>
npx supabase db push     # aplica as 3 migrations em ordem
```

⚠️ **As migrations SQL foram revisadas com cuidado mas não executadas contra um
Postgres real** — o sandbox onde foram geradas não teve acesso de rede para
instalar o Postgres. Rode `supabase db push` num projeto de teste antes de
confiar nelas em produção.

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

## Próximos passos (nesta ordem, viram cards no Kanban)

- [ ] Criar projeto Supabase real e rodar as 3 migrations
- [ ] Escrever testes das políticas RLS (pgTAP ou supabase-js + usuários de
      teste) — o Exemplo 3 da rastreabilidade (docente tentando ler laudo
      clínico deve receber 403) vira o primeiro teste de segurança
- [ ] Scaffold do frontend: `npm create vite@latest apps/web -- --template react-ts`
- [ ] Edge Function `gerar-material`, seguindo o Diagrama de Sequência
      mensagem por mensagem (as 18 mensagens já numeradas viram,
      literalmente, a ordem das linhas de código)
- [ ] Conectar `motor-adaptacao` como dependência do Edge Function
- [ ] CI: rodar `npm test` do motor a cada push (GitHub Actions)

## Estrutura de pastas prevista (o que ainda falta criar)

```
pei-vivo/
├── apps/
│   └── web/                    # React + Vite PWA — RF08-RF12, RNF01-RNF03
├── supabase/
│   ├── migrations/             # ✅ já existe
│   └── functions/
│       └── gerar-material/     # Diagrama de Sequência → código
├── packages/
│   └── motor-adaptacao/        # ✅ já existe
└── docs/
    └── rastreabilidade.md      # já existe como slide — vale versionar aqui também
```
