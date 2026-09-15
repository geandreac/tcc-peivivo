# PEI Vivo — Matriz de conformidade WCAG 2.2 nível AA

**Versão:** 1.0 — 14/09/2026
**Etapa da orientação:** 3 (pilar *WCAG* — os quatro princípios).
**Escopo:** `apps/web` (protótipo funcional). Critérios AAA citados só quando adotados voluntariamente.
**Legenda de status:** ✅ atende (verificado) · 🟡 atende parcialmente / verificação manual pendente · ⬜ não verificado · N/A não se aplica.
**Métodos:** *auto* = axe-core nos testes (`semViolacoesAxe`) + Lighthouse/axe DevTools no navegador; *num* = cálculo de contraste (`docs/ux-ui.md` §3.2); *manual* = inspeção do HTML, teclado, zoom, NVDA (checklist em `docs/plano-de-testes.md` §3); *teste* = teste automatizado nomeado.

---

## 1. Perceptível

| Critério | Nível | Aplicação no projeto | Implementação técnica | Método de validação | Status |
|---|---|---|---|---|---|
| 1.1.1 Conteúdo não textual | A | Logo, ícones de alerta, spinner | SVG inline `aria-hidden`; ícones `aria-hidden` com texto adjacente; spinner `aria-hidden` dentro de `role="status"` | auto (`image-alt`, `svg-img-alt`); manual | ✅ |
| 1.3.1 Informações e relações | A | Títulos, listas, tabelas, formulários | `h1–h3` reais; `ul/ol/dl`; `table` com `caption`/`th scope`; `fieldset/legend`; `label for`; `aria-describedby` | auto (`heading-order`, `list`, `label`, `td-headers-attr`); manual | ✅ |
| 1.3.2 Sequência com significado | A | Ordem DOM = ordem visual | Sem reordenação por CSS (`order`/`flex-direction: reverse`) | manual (desligar CSS) | ✅ |
| 1.3.3 Características sensoriais | A | Instruções nunca dizem "botão verde à direita" | Textos referem-se a nomes ("toque em Aprovar") | manual | ✅ |
| 1.3.4 Orientação | AA | Retrato e paisagem | Nenhum bloqueio de orientação; layout fluido | manual (rotacionar) | ✅ |
| 1.3.5 Identificar o propósito da entrada | AA | Campos de dados pessoais | Cadastro usa dados fictícios (`autocomplete="off"` deliberado); quando houver login real: `autocomplete="email"`, `"current-password"` | manual | 🟡 (P4.4) |
| 1.4.1 Uso da cor | A | Status, seleção, diff | Badges com texto; alertas com ícone + título; linha alterada com "→" e coluna "Situação"; rádio selecionado com borda + marcador | manual; teste `componentes.test.tsx` | ✅ |
| 1.4.2 Controle de áudio | A | — | Sem áudio | — | N/A |
| 1.4.3 Contraste mínimo | AA | Todo texto | Tokens verificados: mínimo 4,54:1 (borda), texto ≥ 6,2:1; alto contraste ≥ 9:1 | num; Lighthouse no navegador | ✅ num / 🟡 navegador |
| 1.4.4 Redimensionar texto | AA | Zoom 200 % | `rem`; sem altura fixa; preferências 19/22 px | manual (Ctrl + até 200 %) | ✅ |
| 1.4.5 Imagens de texto | AA | — | Nenhuma imagem de texto (logo é SVG com texto real ao lado) | manual | ✅ |
| 1.4.10 Reflow | AA | 320 px sem rolagem 2D | Grades → 1 coluna; comparação empilha; só `.tabela-rolagem` rola | manual (1280 px @ 400 %) | ✅ CSS / 🟡 Playwright |
| 1.4.11 Contraste não textual | AA | Bordas de campo, foco, ícones | `--cor-borda #767676` 4,54:1; anel de foco 8,39:1; badge com borda na cor do texto | num | ✅ |
| 1.4.12 Espaçamento de texto | AA | Texto continua legível com line-height 1,5 / parágrafo 2 em / letra 0,12 em / palavra 0,16 em | Sem `overflow: hidden` em texto; alturas automáticas | manual (bookmarklet de espaçamento) | 🟡 |
| 1.4.13 Conteúdo em hover/foco | AA | Tooltips | Não há tooltips; `title` não usado | manual | ✅ (N/A por design) |

## 2. Operável

| Critério | Nível | Aplicação no projeto | Implementação técnica | Método de validação | Status |
|---|---|---|---|---|---|
| 2.1.1 Teclado | A | Toda a interface | Só elementos nativos interativos; sem handlers de mouse exclusivos | manual (tarefas T1–T6 sem mouse); teste (userEvent) | ✅ |
| 2.1.2 Sem armadilha | A | Modais | `<dialog>` + Esc sempre fecha; toasts não capturam foco | teste `Modal` (Esc); manual | ✅ |
| 2.1.4 Atalhos de caractere | A | — | Nenhum atalho de tecla única | — | N/A |
| 2.2.1 Tempo ajustável | A | Toasts | Toast some em 6 s, mas a informação permanece na tela e no `aria-live`; nenhum formulário expira | manual | ✅ |
| 2.2.2 Pausar, parar, ocultar | A | Spinner | Só durante carregamento (< 5 s); sem carrossel | manual | ✅ |
| 2.3.1 Três flashes | A | — | Nada pisca | — | ✅ |
| 2.3.3 Animação de interações | AAA (adotado) | Transições | `prefers-reduced-motion` + preferência na página | manual | ✅ |
| 2.4.1 Ignorar blocos | A | Skip link; landmarks | `.skip-link` → `main#conteudo` | teste `paginas.test.tsx`; manual | ✅ |
| 2.4.2 Página com título | A | Toda rota | `useTitulo` → "Tela · PEI Vivo" | teste; manual | ✅ |
| 2.4.3 Ordem do foco | A | Fluxos | DOM; foco vai ao `h1` na troca de rota; resumo de erros; retorno do modal | teste; manual | ✅ |
| 2.4.4 Finalidade do link | A | Links | Textos descritivos ("Voltar para Miguel", "Registrar desfecho"); sem "clique aqui" | auto (`link-name`); manual (lista de links do NVDA) | ✅ |
| 2.4.5 Várias formas | AA | Chegar a uma tela | Navegação principal + cards de ação + links contextuais + rodapé | manual | ✅ |
| 2.4.6 Cabeçalhos e rótulos | AA | Descritivos | Títulos nomeiam a tarefa; rótulos leigos | manual | ✅ |
| 2.4.7 Foco visível | AA | Tudo | `:focus-visible` 3 px + offset; cartões de rádio com `:has()` | manual; auto parcial | ✅ |
| 2.4.11 Foco não obscurecido (mínimo) | AA | Cabeçalho sticky | Cabeçalho baixo (3,5 rem); elementos focados rolam para a área visível; toasts no rodapé não cobrem foco (pointer-events e posição) | manual (Tab pela página com toast aberto) | 🟡 |
| 2.4.13 Aparência do foco | AAA (adotado) | Anel ≥ 2 px, contraste ≥ 3:1 | 3 px sólido `#1D4E89` (8,39:1 sobre branco) com gap de 3 px | num; manual | ✅ |
| 2.5.1 Gestos de ponteiro | A | — | Sem gestos multiponto ou de trajetória | — | N/A |
| 2.5.2 Cancelamento de ponteiro | A | Cliques | Ações no `click` (up), não no `mousedown` | manual | ✅ |
| 2.5.3 Rótulo no nome | A | Botões com texto visível | Nome acessível = texto visível (sem `aria-label` divergente) | auto (`label-content-name-mismatch`) | ✅ |
| 2.5.4 Atuação por movimento | A | — | Nenhuma | — | N/A |
| 2.5.7 Movimentos de arrastar | AA | — | Nenhuma interação de arrastar (ordenação, sliders) | — | N/A (por design) |
| 2.5.8 Tamanho do alvo (mínimo) | AA | Todos os alvos | `--alvo-minimo: 2.75rem` (44 px) > 24 px exigidos | manual (DevTools); Lighthouse `target-size` | ✅ |

## 3. Compreensível

| Critério | Nível | Aplicação no projeto | Implementação técnica | Método de validação | Status |
|---|---|---|---|---|---|
| 3.1.1 Idioma da página | A | `<html lang="pt-BR">` | `index.html`; material com `lang` | auto (`html-has-lang`) | ✅ |
| 3.1.2 Idioma de partes | AA | Termos estrangeiros | Não há trechos em outro idioma (siglas como WCAG não exigem) | manual | ✅ |
| 3.1.5 Nível de leitura | AAA (adotado parcialmente) | Termo de consentimento, rótulos | Linguagem simples; frases curtas; sem jargão sem explicação | manual; teste de compreensão H5 | 🟡 |
| 3.2.1 Em foco | A | Nada muda de contexto ao focar | Sem `onFocus` que navegue | manual | ✅ |
| 3.2.2 Em entrada | A | Selects e rádios não submetem | Mudanças só com botão explícito (exceto preferências, que aplicam tema — comportamento esperado e anunciado) | manual | ✅ |
| 3.2.3 Navegação consistente | AA | Mesmo `nav` em todas as telas | `Layout` único | manual | ✅ |
| 3.2.4 Identificação consistente | AA | Mesmos nomes para mesmas funções | "Registrar observação", "Voltar para …", "Cancelar" padronizados | manual | ✅ |
| 3.2.6 Ajuda consistente | A | Link de ajuda no mesmo lugar | `nav` e rodapé em todas as telas | manual | ✅ |
| 3.3.1 Identificação do erro | A | Formulários | Resumo com links + mensagem no campo + `aria-invalid` | teste `paginas.test.tsx`; manual | ✅ |
| 3.3.2 Rótulos ou instruções | A | Formulários | `label` + `dica` via `aria-describedby`; obrigatoriedade e formato indicados | auto (`label`); manual | ✅ |
| 3.3.3 Sugestão de erro | AA | Mensagens dizem como corrigir | Ex.: "O texto tem 21.000 caracteres; o máximo é 20.000" | manual | ✅ |
| 3.3.4 Prevenção de erros (legal, financeiro, dados) | AA | Consentimento, exclusão, aprovação | Confirmação em modal; exclusão exige nome exato; revogação exige checkbox; rascunho pode ser descartado | manual; teste | ✅ |
| 3.3.7 Entrada redundante | A | Não pedir a mesma informação duas vezes | Fluxos curtos; título do material é o único campo repetido entre telas e é opcional editar | manual | ✅ |
| 3.3.8 Autenticação acessível (mínimo) | AA | Login | Modo demonstração sem senha nem CAPTCHA; login futuro deve permitir colar senha e gerenciador de senhas (sem bloquear paste) | manual | ✅ (demo) / 🟡 (P4.4) |

## 4. Robusto

| Critério | Nível | Aplicação no projeto | Implementação técnica | Método de validação | Status |
|---|---|---|---|---|---|
| 4.1.1 Análise (parsing) | — | Removido na WCAG 2.2 | — | — | N/A |
| 4.1.2 Nome, função, valor | A | Componentes | Elementos nativos com nome (texto/label); estados nativos (`checked`, `disabled`, `open`); `aria-pressed`, `aria-busy`, `aria-current` onde há estado custom | auto (`button-name`, `aria-*`); NVDA | ✅ auto / 🟡 NVDA |
| 4.1.3 Mensagens de status | AA | Toasts, carregamento, contador de caracteres | `aria-live="polite"` global; `role="status"`; `role="alert"` só para erro bloqueante | teste (`role=status/alert`); NVDA | ✅ auto / 🟡 NVDA |
| HTML válido | boa prática | Todo o app | JSX gera HTML bem formado; validar `dist/index.html` + DOM renderizado no validador W3C | manual | 🟡 |
| Compatibilidade com tecnologias assistivas | boa prática | NVDA + Firefox/Chrome; VoiceOver iOS | Só elementos nativos; ARIA mínima | manual (sessão P6.7) | ⬜ |

---

## 5. Resumo

| Princípio | Critérios aplicáveis | ✅ | 🟡 | ⬜ |
|---|---|---|---|---|
| Perceptível | 13 | 10 | 3 | 0 |
| Operável | 17 | 15 | 1 | 0 (+ N/A) |
| Compreensível | 14 | 12 | 2 | 0 |
| Robusto | 4 | 2 | 1 | 1 |

**Pendências para fechar AA com evidência completa** (todas em `docs/plano-de-testes.md`): sessão NVDA (4.1.2, 4.1.3), verificação de contraste no navegador renderizado (1.4.3), espaçamento de texto (1.4.12), reflow em Playwright (1.4.10), foco não obscurecido com toast aberto (2.4.11), validação W3C do HTML. Nenhuma pendência é de implementação; todas são de **verificação manual** ainda não executada.

**Critérios AAA adotados voluntariamente:** 2.3.3 (animação), 2.4.13 (aparência do foco), 3.1.5 (leitura — parcial), contraste 7:1 no tema de alto contraste e no material quando `contrasteMinimo = 7` (1.4.6).
