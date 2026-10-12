# Padrões de interface — fontes oficiais (Apple, Google, Microsoft)

Pesquisa de 12/10/2026, feita antes da refatoração das telas (Fase 1). Cada linha traz a
**fonte**, a **regra** (citação ou paráfrase fiel) e **como se aplica ao PEI Vivo**. Só entram
fontes que foram de fato lidas; o que não foi encontrado está na última seção.

## 1. Design tokens

| Fonte | Regra | Aplicação no PEI Vivo |
|---|---|---|
| Microsoft Fluent 2 — [Design tokens](https://fluent2.microsoft.design/design-tokens) | "Design tokens are stored values used to assign Fluent styles like color, typography, spacing, or elevation." Duas camadas: *global* (valor bruto, ex. hex) e *alias* (significado: "We name alias tokens so that their function is immediately recognizable"). | `tokens.css` já é a camada alias (`--cor-erro`, `--esp-4`). Falta: movimento (curvas), camadas (`z-index`) e alguns valores brutos espalhados em `inicio.css`/`componentes.css`. |
| Google Material (material-web) — [Theming](https://github.com/material-components/material-web/blob/main/docs/theming/README.md) | "On the web, design tokens are CSS custom properties"; tokens de sistema para cor, *typescale* e *shape*, normalmente em `:root`; componentes referenciam os de sistema via `var()`. | Mesma arquitetura que já usamos (CSS puro, `:root`). Confirma: componente nunca usa hex, só `var(--…)`. |
| Apple HIG — [Color](https://developer.apple.com/design/human-interface-guidelines/color) | "Each dynamic color is semantically defined by its purpose, rather than its appearance"; "Avoid hard-coding system color values". | Nomes por função (`--cor-texto-secundario`), não por aparência. Tema escuro/alto contraste trocam só os valores. |

## 2. Cor

| Fonte | Regra | Aplicação |
|---|---|---|
| Apple HIG — Color | "Avoid relying solely on color to differentiate between objects, indicate interactivity, or communicate essential information." | Badges sempre com texto; cor do papel (D-41) só como identidade. Já atendido; manter. |
| Apple HIG — Color | "Avoid using the same color to mean different things." | Primária = ação/link; papéis = identidade; semânticas = estado. Não usar `--cor-aviso` como cor de papel (coordenação e aviso compartilhavam `#8a5300`; separados em D-45). |
| Apple HIG — Color | "Make sure all your app's colors work well in light, dark, and increased contrast contexts." | Temos os três; todo token novo precisa dos três valores e entrar em `scripts/contraste.mjs`. |
| Apple HIG — [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) | Contraste mínimo WCAG AA: 4,5:1 até 17 pt; 3:1 a partir de 18 pt ou negrito. "If your app supports Dark Mode, make sure to check the minimum contrast in both light and dark appearances." | Já verificado por `npm run contraste`; script hoje repete os hex à mão (risco de divergir de `tokens.css`). |
| Google — [Material 3 em Compose](https://developer.android.com/develop/ui/compose/designsystems/material3) | Pares de papel: "Use on-primary on top of primary, and on-primary-container on top of primary-container… to provide accessible contrast". | Todo fundo tem seu "sobre": `--cor-sobre-primaria`, `--cor-sobre-erro`. Padronizar o mesmo para tints de papel. |

## 3. Tipografia

| Fonte | Regra | Aplicação |
|---|---|---|
| Apple HIG — [Typography](https://developer.apple.com/design/human-interface-guidelines/typography) | "Minimize the number of typefaces you use"; "Adjust font weight, size, and color… to help people visualize hierarchy." | Uma família (Atkinson, D-40). Hierarquia por tamanho + peso. |
| Apple HIG — Typography | "In general, avoid light font weights… prefer Regular, Medium, Semibold, or Bold." Tamanho padrão iOS 17 pt, mínimo 11 pt. | Corpo ≥ 16px; 14px só para metadado curto. |
| Apple HIG — Accessibility | "Give people the option to enlarge text by at least 200 percent." | Tamanhos em `rem`; preferência "grande/maior" já existe. |
| Google Material 3 (Compose) | Escala por papel: "display, headline, title, body, and label, with large, medium, and small sizes for each." | Hoje os tamanhos são por magnitude (`--tamanho-xl`) e o `h1` é definido em dois arquivos. Criar papéis: título de página, título de seção, corpo, rótulo, meta. |
| Microsoft Fluent 2 — [Typography](https://fluent2.microsoft.design/typography) | "Clear typographical hierarchy organizes and structures content." | Mesmo ponto acima. |

## 4. Espaçamento, grid e hierarquia

| Fonte | Regra | Aplicação |
|---|---|---|
| Microsoft Fluent 2 — [Layout](https://fluent2.microsoft.design/layout) | "The base unit is four pixels"; gutters "should be a multiple of the base unit"; "UI elements that have more spacing around them draw more focus"; "The most important elements… take up the biggest pieces of the grid." | Já usamos base 4px (`--esp-1…8`). Aplicar ritmo único entre seções e não deixar formulários de um campo ocuparem 100% da largura. |
| Apple HIG — [Layout](https://developer.apple.com/design/human-interface-guidelines/layout) | "Group related items… you might use negative space, container shapes, or separator lines"; "Order content by relative importance… place the most important items near the top"; "Keep functionality the same as size classes change." | Ação principal da tela no topo; grupos em cartões; celular e desktop com as mesmas funções (já é assim na Privacidade: tabela × blocos). |
| Apple HIG — Layout | "Determine layout based on size classes, not device type." | Grades com `auto-fit/minmax` em vez de breakpoints fixos por aparelho. |

## 5. Elevação

| Fonte | Regra | Aplicação |
|---|---|---|
| Microsoft Fluent 2 — [Elevation](https://fluent2.microsoft.design/elevation) | "Elevate UI elements to create visual cues, aid scannability, and convey levels of importance"; rampa de sombras por nível (cartão baixo; diálogo alto). | `--sombra-1` cartão, `--sombra-2` hover/destaque, `--sombra-3` modal. Manter três níveis e não inventar sombras locais. |
| Google Material 3 (Compose) | "Material 3 represents elevation mainly using tonal color overlays… in addition to shadows", inclusive no tema escuro. | No escuro, sombra quase não aparece: elevação deve vir também do tom (`--cor-superficie` → `--cor-superficie-2`). |

## 6. Navegação

| Fonte | Regra | Aplicação |
|---|---|---|
| Apple HIG — [Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars) | "Use a tab bar to support navigation, not to provide actions"; "Include tab labels"; "Make sure the tab bar is visible when people navigate"; poucas abas, sidebar para estruturas maiores. | Barra inferior no celular / lateral no desktop já seguem isso (R4). Manter 4 destinos e rótulo sempre visível. |
| Microsoft Fluent 2 — [Content design](https://fluent2.microsoft.design/content-design) | "Avoid generic text like 'Click here'." | Links e botões descrevem o destino ("Voltar para Miguel"). Já atendido. |

## 7. Estados de interface

| Fonte | Regra | Aplicação |
|---|---|---|
| Apple HIG — [Loading](https://developer.apple.com/design/human-interface-guidelines/loading) | "Show something as soon as possible… consider showing placeholder text, graphics, or animations as content loads"; indicador determinado quando se sabe a duração. | Listas com estrutura conhecida (painel, histórico) podem mostrar esqueleto em vez de só o spinner. |
| Microsoft Fluent 2 — [Skeleton](https://fluent2.microsoft.design/components/web/react/core/skeleton/usage) | "Use them to gradually load content that takes longer than a second"; "If you don't know the structure, try a progress bar or spinner"; manter simples; usar `aria-busy`. | Esqueleto só onde a estrutura é conhecida; spinner nos demais. |
| web.dev — [Optimize CLS](https://web.dev/articles/optimize-cls) | "Layout shifts can be avoided by reserving the space for them in the initial layout." | Placeholder com a altura aproximada do conteúdo final. |
| Microsoft Fluent 2 — Content design | "Make choices and next steps obvious"; "Short sentences… are easier to scan." | Estado vazio sempre diz o que acontece depois e quem age. |

## 8. Movimento e microinterações

| Fonte | Regra | Aplicação |
|---|---|---|
| Apple HIG — [Motion](https://developer.apple.com/design/human-interface-guidelines/motion) | "Add motion purposefully… Don't add motion for the sake of adding motion"; "Aim for brevity and precision in feedback animations"; "Make motion optional." | Só transições curtas de feedback (hover, foco, progresso). Nada de animação decorativa nas telas internas. |
| Microsoft Fluent 2 — [Motion](https://fluent2.microsoft.design/motion) | "Give larger elements more time to animate than smaller elements"; define curvas *ease-in*, *ease-out*, *ease-in-out*; incluir um ajuste "no motion". | Tokens de duração curta/média e curva padrão, em vez de um único `--duracao` e curvas escritas à mão. |
| web.dev — [prefers-reduced-motion](https://web.dev/articles/prefers-reduced-motion) | Remover movimento decorativo; manter feedback essencial de forma mais suave. | Já zeramos `--duracao`; manter o progresso visível sem animação. |
| Apple HIG — Accessibility | Com Reduce Motion: reduzir animações automáticas, "Replacing transitions… with fades". | Idem. |

## 9. Acessibilidade de interação

| Fonte | Regra | Aplicação |
|---|---|---|
| Google — [Android Accessibility Help: Touch target size](https://support.google.com/accessibility/android/answer/7101858) | "Consider making touch targets at least 48x48dp, separated by 8dp of space or more." | Nosso `--alvo-minimo` é 44px (Apple/Fluent web). Garantir 8px entre alvos vizinhos. |
| web.dev — [Accessible tap targets](https://web.dev/articles/accessible-tap-targets) | "A minimum recommended touch target size is around 48 device independent pixels"; "spaced about 8 pixels apart". | Idem. |
| Microsoft Fluent 2 — Layout | Alvos mínimos de "44 x 44 on iOS and Web, 48 x 48 on Android". | Confirma 44px no web. |
| Microsoft Learn — [Targeting](https://learn.microsoft.com/en-us/windows/apps/develop/input/guidelines-for-targeting) | Alvo de 7,5 mm (40×40 px); alvos com consequência grave pedem "greater padding". | "Remover acesso" e "Retirar autorização" ficam afastados de outras ações. |
| Apple HIG — Accessibility | Espaçamento: "about 12 points of padding around elements that include a bezel". | Grupo de botões com `gap` ≥ 8px. |
| web.dev — [Style focus](https://web.dev/articles/style-focus) | O indicador de foco é "extremely important"; nunca `:focus { outline: none; }` sem substituto; usar `:focus-visible`. | Já temos `--anel-foco`. Manter em todo componente novo. |
| Apple HIG — Accessibility | "Let people use the keyboard alone to navigate and interact with your app." | Testado no E2E; manter. |

## 10. Desempenho

| Fonte | Regra | Aplicação |
|---|---|---|
| web.dev — [Web Vitals](https://web.dev/articles/vitals) | LCP ≤ 2,5 s; INP ≤ 200 ms; CLS ≤ 0,1, medidos no percentil 75. | Metas para a apresentação. Esqueletos e espaço reservado protegem o CLS. |
| web.dev — [Animations guide](https://web.dev/articles/animations-guide) | "Where possible, restrict animations to `opacity` and `transform`"; "Avoid any property that triggers layout or paint"; `will-change` "sparingly". | A barra de progresso da observação anima `width` → trocar por `transform: scaleX()`. |
| web.dev — Optimize CLS | Fontes: "Load critical web fonts as early as possible using `<link rel=preload>`." | Carregar só os pesos usados; não pedir peso que não existe (ver diagnóstico). |

## 11. Componentes React

| Fonte | Regra | Aplicação |
|---|---|---|
| React — [Thinking in React](https://react.dev/learn/thinking-in-react) | "A component should ideally only be concerned with one thing. If it ends up growing, it should be decomposed"; "Find the minimal but complete representation of state… compute everything else on-demand." | Telas só compõem componentes de `components/`; nada de estilo inline repetido; estado derivado calculado (como `respondidas` na observação). |
| React — Thinking in React | Separe a UI em hierarquia que espelha o modelo de dados. | `CabecalhoEstudante`, `Card`, `EstadoVazio` já fazem isso; faltam componentes para padrões repetidos (lista de versões, esqueleto). |

## O que não foi encontrado ou não pôde ser lido

- **m3.material.io** (Material Design 3) é renderizado por JavaScript e não abriu na ferramenta de leitura. Os
  pontos do Material vêm de fontes oficiais do Google que citam o mesmo conteúdo: Android Accessibility Help,
  developer.android.com (Material 3 em Compose) e a documentação do `material-web` no GitHub.
- **Durações em milissegundos e curvas cúbicas:** nem Fluent 2 nem Apple HIG publicam valores na página de
  movimento. Os valores dos tokens novos serão nossos, justificados pelos princípios citados.
- **Estados vazios e mensagens de erro:** nenhuma página dedicada encontrada no Fluent 2 (Content design não trata
  o tema) nem na HIG lida. Usamos a orientação geral de redação do Fluent e o padrão já documentado em
  `docs/ux-ui.md`.
- **Foco visível na Apple:** a página de acessibilidade da HIG não fala de anel de foco; a regra vem do web.dev.
