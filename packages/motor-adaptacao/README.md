# @pei-vivo/motor-adaptacao

Motor de adaptação do PEI Vivo: código **puro, determinístico e isomórfico** —
sem banco, sem rede, sem IA. É o que prova que o sistema não é um wrapper de
IA (RNF08) e o que roda no "modo demo" com a camada de IA desligada (RN06).

| Módulo | Card | Função | Regra |
|---|---|---|---|
| `tipos.ts` | — | `ParametrosAdaptacao` (contrato único), `Observacao`, `ObservacaoHistorica`, `TextoAdaptado` | D-13, P2.3 |
| `regras.ts` | existente | `aplicarObservacao`, `aplicarCiclo` — observação → parâmetro (Quadro 5) | RN03 |
| `ciclos.ts` | P2.1 | `calcularCiclosConsecutivos`, `observacoesDoUltimoCiclo` | HU-S.01 |
| `ancora.ts` | P2.2 | `derivarInteresseAncora`, `normalizarAncora` | HU-S.02, D-03 |
| `adaptador.ts` | P2.4 | `adaptar(texto, parametros)`, `quebrarEmLinhas`, `dividirEmEtapas`, `textoDoAdaptado` | RF09, D-10 |
| `index.ts` | P2.5 | barrel | — |

```bash
npm test -w packages/motor-adaptacao            # 30 testes
npm run test:coverage -w packages/motor-adaptacao  # ≥ 70 % exigido (RNF07); hoje 97 %
npm run typecheck -w packages/motor-adaptacao
```

## Como importar (spike P2.5)

- **Node / Vitest / Vite (`apps/web`)** — pelo nome do workspace; o `package.json`
  aponta `exports` para `./src/index.ts` e o Vite/Vitest compilam TS direto:

  ```ts
  import { adaptar, aplicarCiclo, PARAMETROS_PADRAO } from "@pei-vivo/motor-adaptacao";
  ```

- **Deno (Edge Functions, Fase 3)** — o código não usa APIs de Node, então
  basta um import relativo com extensão explícita a partir de
  `supabase/functions/_shared/motor/`:

  ```ts
  import { adaptar } from "../../../../packages/motor-adaptacao/src/adaptador.ts";
  ```

  Como o bundler do Supabase só empacota o que está sob `supabase/functions/`,
  a alternativa segura é um passo de cópia no `npm run build:functions`
  (`cp -r packages/motor-adaptacao/src supabase/functions/_shared/motor`),
  a ser definido em P3.1. Os imports internos do motor já usam caminhos
  relativos **sem** extensão; para Deno, o passo de cópia deve reescrevê-los
  com `.ts` (ou ativar `"nodeModulesDir"`/import map). Decisão registrada
  como pendência de P3.1.

## O que NÃO está aqui (de propósito)

- Simplificação lexical e recontextualização por `interesseAncora` — camada de
  IA (RF10, Fase 5).
- Tipografia, espaçamento e contraste — CSS no cliente a partir de
  `parametros` (`apps/web/src/components/MaterialAdaptado.tsx`, D-10).
- Índice de legibilidade Flesch PT-BR — P5.8.
