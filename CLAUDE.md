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
4. **Frontend** — só depois que 1–3 estiverem estáveis.

Nunca implemente uma tela antes da política RLS que protege o dado que ela mostra.

## Comandos

```bash
cd packages/motor-adaptacao && npm test     # deve passar 100%
npx supabase db push                        # aplica as migrations em ordem
```

## Convenções

- SQL: `snake_case`, tabelas no plural (`estudantes`, `observacoes`).
- TypeScript: `camelCase`, tipos em `packages/motor-adaptacao/src/tipos.ts`
  espelham 1:1 o `ParametrosAdaptacao` do diagrama de classes — não crie um
  tipo paralelo, estenda esse.
- Todo `id` é `uuid` (`gen_random_uuid()`), nunca serial incremental.
- Toda tabela sensível a estudante tem RLS habilitado antes do primeiro `insert`.

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
A análise de requisitos por perfil, as decisões de projeto (`D-nn`) e a matriz
de rastreabilidade estão em `docs/requisitos.md` — leia antes de implementar
qualquer feature; toda decisão nova ganha um `D-nn` lá.

## Testes

- `motor-adaptacao`: funções puras, Vitest, sem mocks de rede/banco. Todo PR
  que mexer em `regras.ts` precisa de teste cobrindo a assimetria da RN03
  (ver `regras.test.ts` como modelo).
- Políticas RLS: teste tentando o acesso NEGADO explicitamente (ex.: docente
  lendo `notas_clinicas` deve retornar 403), não só o caminho permitido.

## Dados

**Nunca use dados reais de estudante, nem em desenvolvimento.**
`0003_seed_dev.sql` é fictício por design — mantenha assim. Qualquer dado de
teste novo segue o mesmo padrão (nomes claramente fictícios, comentário no
topo do arquivo).

## Onde estamos

Núcleo de dados e permissões escrito, mas **as migrations nunca rodaram num
Postgres real**. Plano completo em `docs/plano-desenvolvimento.md` (fases,
cards `P<fase>.<n>`, marcos M0–M6, datas). Estamos na Fase 0: próximo card é
P0.1 (`git init`) e depois P0.3 (rodar 0001–0003 no Supabase local).
