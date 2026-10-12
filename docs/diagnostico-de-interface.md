# Diagnóstico de interface — telas do `apps/web`

Auditoria de 12/10/2026 (Fase 2), feita com os padrões de `docs/padroes-de-interface.md`.
Base: leitura de `styles/*.css`, `components/`, `pages/` e capturas em 1280 px das telas de
painel, estudante, observar, gerar, validar, privacidade, histórico e pendências.

**O que já está bom e não muda:** tokens semânticos com três temas verificados, alvo de 44px
nos botões e campos, anel de foco, `prefers-reduced-motion`, navegação inferior/lateral com
rótulos, estados carregando/vazio/erro/negado em todas as telas, linguagem leiga, uma só família
tipográfica. Regras de negócio, `services/` e contratos de API ficam fora do escopo.

## Problemas por prioridade

Impacto: **U** usabilidade · **V** consistência visual · **A** acessibilidade · **M** manutenção.

### Prioridade 1 — afeta leitura e acessibilidade em todas as telas

| # | Problema | Evidência | Padrão | Impacto | Correção (onde centraliza) |
|---|---|---|---|---|---|
| 1 | **Pesos de fonte pedidos não existem.** O app carrega Atkinson 400/600/800, mas o CSS usa `--peso-medio: 500` (7×) e `--peso-negrito: 700` (31×). Pela regra de correspondência de fontes do CSS, 500 cai para **400** (o "médio" sai igual ao normal) e 700 sobe para **800** (títulos e botões ficam pesados demais). | `main.tsx:8-10`, `tokens.css` | Apple Typography (hierarquia por peso); web.dev CLS (carregar só o que se usa) | V, A | `tokens.css`: alinhar os tokens aos arquivos carregados (médio → 600, negrito → 700 com o arquivo 700 no lugar do 800, ou negrito → 800). Nenhuma tela muda. |
| 2 | **Texto de conteúdo em 14px.** `.meta` (14px) é usado 48 vezes, inclusive para frases inteiras: estados vazios ("Ninguém leu as notas…"), ajuda de seção, contador de caracteres. | `Privacidade`, `Observar:187`, `Historico:85`, `Consentimento:169` | Apple Typography (tamanhos legíveis; corpo padrão 17 pt); skill: corpo ≥ 16px no celular | A, U | Separar **metadado** (data, autor: 14px) de **texto de apoio** (16px, cor secundária). Novo papel tipográfico em `tokens.css` + classe `.texto-apoio`. |
| 3 | **Estados vazios inconsistentes.** Quatro telas mostram "nada aqui" como `<p class="meta">` solto, enquanto as demais usam `EstadoVazio`. | itens do nº 2 | Fluent Content design ("next steps obvious"); Apple Layout (agrupar) | U, V | Variante compacta `EstadoVazio` (`compacto`) para seções dentro da página. |
| 4 | **Botão do aviso flutuante (toast) com 36px.** Fica abaixo do nosso alvo de 44px (passa no mínimo de 24px da WCAG 2.5.8, mas não no padrão do projeto, Apple e Fluent). | `componentes.css:469` | Google/web.dev 48dp; Fluent 44px web | A | Remover o `min-height` local; usar `--alvo-minimo`. |

### Prioridade 2 — consistência visual e estrutura das telas

| # | Problema | Evidência | Padrão | Impacto | Correção |
|---|---|---|---|---|---|
| 5 | **Formulários na largura toda.** Em Gerar material, o campo "Título" tem ~990px para uma frase curta; o contador fica longe do campo. Três telas resolvem com `style={{ maxWidth }}` inline e as outras não. | `GerarMaterial`, `CadastrarEstudante:67`, `ConvidarPessoa:63`, `Vinculos:145` | Fluent Layout (espaço dirige o olhar); Apple Layout (agrupar) | U, V | Classe única `.formulario` com largura de leitura, aplicada a todos os `<form>` de página. |
| 6 | **Escala de títulos em dois lugares.** `h1` é 28px em `base.css` e 36px em `telas.css` (sobrescrito por seletor de contexto); `h2` de seção varia por tela. | `base.css:53`, `telas.css:21-30` | Material 3 (papéis display/headline/title/body/label); Fluent Typography | V, M | Papéis tipográficos em `tokens.css` (`--texto-titulo-pagina`, `--texto-titulo-secao`…) e uma só regra em `base.css`. |
| 7 | **Grade com cartão órfão.** Em Privacidade, "Suas escolhas" tem 2 cartões numa grade de 3 colunas (terço vazio à direita). | `Privacidade`, `.grade-cards` | Fluent Layout (mais importante ocupa mais grid) | V | `.grade-cards` passa a usar `auto-fit` (como `.grade-cards--acoes`), e a variante some. |
| 8 | **Carregamento só com spinner** mesmo onde a estrutura é conhecida (lista de estudantes, versões, linha do tempo). O conteúdo "pula" quando chega. | `Carregando` em `Feedback.tsx` | Apple Loading; Fluent Skeleton; web.dev CLS | U, desempenho | Componente `Esqueleto` (linhas/cartões, `aria-busy`, sem animação com movimento reduzido) usado no painel e nas listas. Spinner continua onde a estrutura é desconhecida. |
| 9 | **Mesma cor com dois significados.** `--papel-coordenacao` e `--cor-aviso` são o mesmo `#8a5300`; um badge de aviso e a identidade da coordenação ficam idênticos. | `tokens.css` | Apple Color ("Avoid using the same color to mean different things") | V, A | Proposta (decisão sua): tom próprio para coordenação, verificado nos três temas. Não entra sem aprovação, porque muda a identidade D-41. |
| 10 | **Elevação no tema escuro.** As sombras quase não aparecem; cartões e fundo diferem pouco. | captura `escuro-familia-painel` | Material 3 (elevação tonal) | V | No escuro, cartão em hover/destaque usa `--cor-superficie-2` além da sombra (token, sem cor nova). |

### Prioridade 3 — manutenção e desempenho

| # | Problema | Evidência | Padrão | Impacto | Correção |
|---|---|---|---|---|---|
| 11 | **24 estilos inline** (margens, `maxWidth`, `justifyContent`) repetindo o mesmo valor em telas diferentes. | `grep style={{` em `pages/`, `components/` | React (componente com uma responsabilidade); Fluent tokens | M | Utilitários mínimos (`.mt-*`/`.mb-*` com tokens) ou props dos componentes (`EstadoVazio`, `Card`). Ficam só os dinâmicos (largura da barra, atraso da animação do início). |
| 12 | **Barra de progresso anima `width`**, que provoca layout a cada quadro. | `telas.css:161`, `Observar:146` | web.dev Animations ("restrict animations to opacity and transform") | desempenho | `transform: scaleX()` com `transform-origin: left`. |
| 13 | **Movimento sem tokens de curva.** Um único `--duracao: 160ms`; a página inicial usa `520ms cubic-bezier(...)` escrito à mão. | `tokens.css`, `inicio.css:247` | Fluent Motion (maior = mais tempo; curvas nomeadas) | M | `--duracao-curta`, `--duracao-media`, `--curva-padrao`, `--curva-entrada`. `--duracao` vira apelido de `--duracao-curta` para não quebrar nada. |
| 14 | **`z-index` soltos** (10, 50, 60, 200, 1000). | `base.css`, `componentes.css`, `telas.css` | skill: escala de z-index | M | `--camada-fixo`, `--camada-navegacao`, `--camada-sobreposicao`, `--camada-pular-link`. |
| 15 | **Cores literais fora de `tokens.css`.** 8 hex na demonstração do material (`inicio.css`), sobreposição do modal `rgba(27,27,27,.6)`, variante de alto contraste do material e QR em `#fff`. | `grep '#[0-9a-f]'` | Fluent/Material tokens; regra do projeto (cores só de `tokens.css`) | M | Tokens `--cor-sobreposicao`, `--material-*` (o material é sempre claro, D-10). `print.css` fica como está: impressão exige preto no branco. |
| 16 | **Tema escuro escrito duas vezes** (~40 variáveis em `@media` e em `[data-tema="escuro"]`), e `scripts/contraste.mjs` repete os hex à mão. Se alguém mudar um token, os outros dois lugares podem divergir sem nenhum teste falhar. | `tokens.css`, `contraste.mjs` | Fluent tokens (valor guardado em um lugar) | M | `contraste.mjs` passa a **ler os valores de `tokens.css`** e falha se os dois blocos escuros diferirem. Os blocos continuam duplicados, porque CSS não junta media query e atributo numa regra só sem `light-dark()`, que ainda não queremos exigir. |

## O que será centralizado

- **`tokens.css`:** pesos alinhados às fontes (1), papéis tipográficos (2, 6), movimento (13), camadas (14), sobreposição e material (15).
- **`base.css`:** uma só escala de títulos (6), `.texto-apoio` (2).
- **`componentes.css`:** `.formulario` (5), `.grade-cards` com `auto-fit` (7), esqueleto (8), toast (4), utilitários de espaço (11).
- **Componentes React:** `EstadoVazio compacto` (3), `Esqueleto` (8). Telas só trocam marcação; nenhuma chamada a `api` muda.
- **`scripts/contraste.mjs`:** fonte única dos valores (16).

## Ordem proposta para a Fase 3

1. Fundação: tokens e base (1, 2, 6, 13, 14, 15) → beneficia todas as telas de uma vez.
2. Componentes: `EstadoVazio compacto`, `Esqueleto`, toast, `.formulario`, `.grade-cards` (3, 4, 5, 7, 8).
3. Telas, por impacto: Painel → Gerar material → Privacidade → Observar → Validar → Histórico → Consentimento → demais formulários (Cadastrar, Convidar, Vínculos) → limpeza dos estilos inline (11, 12).
4. Escuro tonal (10) e `contraste.mjs` lendo `tokens.css` (16).
5. Item 9 (cor da coordenação) só com a sua decisão.

Cada etapa termina com `npm test`, `npm run typecheck`, `npm run contraste` e `npm run test:e2e`, mais capturas antes/depois.

## Resultado da Fase 3 (12/10/2026)

| # | Situação | O que mudou |
|---|---|---|
| 1 | Feito | `--peso-medio` 600, `--peso-negrito` 700; `latin-700.css` carregado em `main.tsx`. |
| 2 | Feito | Papéis `--texto-*`; `.texto-apoio` (16px) em 22 frases que estavam em `.meta`; `.meta` só para data/autor/contador. |
| 3 | Feito | `VazioSecao` em Consentimento, Histórico, Observar, Privacidade (2), Vínculos e Resumo da escola. |
| 4 | Feito | Botão do toast herda os 44px de `.botao`. |
| 5 | Feito | `.formulario` em Gerar material, Cadastrar estudante, Convidar pessoa e Vínculos. |
| 6 | Feito | Escala de títulos só em `base.css`; `telas.css` cuida só do espaçamento. |
| 7 | Feito | `.grade-cards` com `auto-fit` (2 cartões ocupam a linha; 4 viram 2×2). |
| 8 | Feito | `Esqueleto` no Painel, Estudante, Histórico, Notificações e Pendências. |
| 9 | **Pendente** | Depende da sua decisão (muda a identidade D-41). |
| 10 | Feito | `--cor-superficie-destaque` (tom mais claro no escuro) no hover/foco dos cartões. |
| 11 | Feito | 22 estilos inline viraram classes; ficaram 2 dinâmicos (atraso da animação do início, fração da barra). |
| 12 | Feito | Barra de progresso com `transform: scaleX()`. |
| 13 | Feito | `--duracao-curta/media/longa`, `--curva-padrao/entrada`; `--duracao` mantido como apelido. |
| 14 | Feito | `--camada-*` em todos os `z-index` de tela (os de `inicio.css` são locais ao herói). |
| 15 | Feito | `--material-*` e `--cor-sobreposicao`; nenhum hex fora de `tokens.css`, exceto `print.css`. |
| 16 | Feito | `contraste.mjs` lê `tokens.css` (78 pares) e falha se os temas escuros divergirem — testado com um valor alterado de propósito. |
