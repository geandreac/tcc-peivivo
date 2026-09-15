# PEI Vivo — Diretrizes de acessibilidade digital

**Versão:** 1.0 — 14/09/2026
**Etapa da orientação:** 3 (Documento de Acessibilidade e Design — pilar *Acessibilidade*).
**Normas de referência:** WCAG 2.2 AA (matriz em `docs/wcag-2.2.md`), ABNT NBR 17225:2025 (web), NBR 17060:2022 (mobile), eMAG.
**Onde está implementado:** `apps/web/src/styles/*.css`, `apps/web/src/components/*`, `apps/web/src/layouts/Layout.tsx`, hooks `useTitulo`, `useAnuncio`, `usePreferencias`.

Acessibilidade aqui não é adendo: o público-alvo inclui um estudante com sensibilidade visual, uma responsável com baixa familiaridade digital e uma docente que usa o celular à noite com brilho baixo. O próprio produto — material adaptado — é um artefato de acessibilidade; a interface que o produz precisa ser, no mínimo, tão acessível quanto ele.

---

## 1. Princípios de estrutura (HTML semântico)

### 1.1 Hierarquia de títulos

- Exatamente **um `h1` por tela**, que nomeia a tarefa ("Adaptar texto para Miguel", "Validar parâmetros do ciclo").
- `h2` para seções da tela; `h3` dentro de cards. Nunca pula nível.
- Títulos descrevem o conteúdo, não a aparência; um `h2` visualmente oculto (`.sr-only`) nomeia formulários quando o título visível já é o `h1` (ex.: "Formulário de observação").
- Em SPA, ao trocar de rota o **foco vai para o `h1`** (`useTitulo`) e `document.title` muda para `"<Tela> · PEI Vivo"` — o leitor de tela anuncia a nova página sem região live.

### 1.2 Landmarks

| Landmark | Elemento | Onde |
|---|---|---|
| `banner` | `<header class="cabecalho">` | Marca + navegação + sessão |
| `navigation` | `<nav aria-label="Principal">` | Único `nav` nomeado; consistente em todas as telas |
| `main` | `<main id="conteudo" tabindex="-1">` | Alvo do skip link; recebe foco programático |
| `contentinfo` | `<footer class="rodape">` | Links de ajuda/acessibilidade, aviso de dados fictícios |
| `region` | não usado por padrão | `section` sem nome acessível **não** vira landmark — evita poluir a lista de regiões dos leitores de tela |
| `dialog` | `<dialog>` nativo | Modais |

### 1.3 Skip link

Primeiro elemento focável do documento: `<a href="#conteudo" class="skip-link">Pular para o conteúdo principal</a>`. Fica fora da tela até receber foco (`top: -100%` → `top: 1rem`), com fundo primário e contorno escuro. Testado em `paginas.test.tsx`.

---

## 2. Teclado e foco

| Requisito | Implementação |
|---|---|
| Tudo alcançável por teclado | Só `<button>`, `<a>`, `<input>`, `<select>`, `<textarea>`, `<details>` — nenhum `div`/`span` clicável. Cards de perfil na tela *Entrar* são `<button class="perfil">` |
| Ordem lógica de foco | Ordem do DOM = ordem visual. Sem `tabindex > 0`. Cabeçalho → conteúdo → rodapé |
| Foco visível | `:focus-visible { outline: 3px solid var(--cor-foco); outline-offset: 3px }` em **todos** os elementos; nunca `outline: none` sem substituto. Rádios em cartão: `.opcao:has(input:focus-visible)` desenha o anel no cartão inteiro |
| Foco não obscurecido (2.4.11) | Cabeçalho `sticky` tem 3,5 rem; o anel de foco fica sempre abaixo dele porque o navegador rola o elemento para a área visível e o `outline-offset` é pequeno |
| Sem armadilha (2.1.2) | `<dialog>` nativo prende o foco **só** enquanto aberto, e `Esc` sempre fecha (`onCancel`). Toasts não roubam foco |
| Retorno de foco | `Modal` guarda `document.activeElement` ao abrir e o restaura ao fechar |
| Foco após erro de formulário | `ResumoErros` recebe foco (`tabIndex=-1` + `focus()`); cada item é um link que foca o campo |
| Atalhos | Nenhum atalho de tecla única (2.1.4 não se aplica). Tabela em `/acessibilidade` documenta Tab, Enter, Espaço, Setas, Esc |

---

## 3. Cor e contraste

- Paleta em `tokens.css`; razões verificadas numericamente (`docs/ux-ui.md` §3.2). Texto ≥ 4,5:1; componentes e bordas de campo ≥ 3:1 (`--cor-borda: #767676`, 4,54:1).
- **Tema de alto contraste** (`data-contraste="alto"`, preferência na tela Acessibilidade): todos os pares ≥ 9:1, fundos coloridos viram branco com borda de 2 px, sombras removidas.
- **Material adaptado** aplica `contrasteMinimo` do perfil: 4,5 → fundo creme `#FFFDF5`/texto `#1B1B1B` (16,9:1); 7 → preto sobre branco com borda (21:1). O valor vem de `parametros`, não do tema — é o D-10.
- Nada depende só de cor: badges têm texto ("Aprovado", "Rascunho — só você vê"); alertas têm ícone + título textual; a linha alterada no diff tem prefixo "→" e a coluna "Situação" em texto; opções selecionadas têm borda + fundo + marcador nativo do rádio.

---

## 4. Texto, imagens e ícones

| Requisito | Implementação |
|---|---|
| Textos alternativos | Logo em SVG inline com `aria-hidden="true"` (o link já tem `aria-label="PEI Vivo — página inicial"`). Não há imagens informativas no protótipo; quando houver (P7.4, capturas), usar `alt` contextual. Decorativas: `alt=""` |
| Ícones | Sempre acompanhados de texto visível: "✓ Sucesso", "← Voltar", "⚠" no erro de campo via `::before` (decorativo, o texto diz o erro). Ícones em `aria-hidden` |
| Tamanho de fonte | Base 16 px (`1rem`), mínimo 14 px só em metadados; unidades `rem`; preferências de 19 e 22 px na tela Acessibilidade; zoom do navegador respeitado (`font-size: 100%` no `html`) |
| Espaçamento de texto (1.4.12) | `line-height: 1.6`; material 1.9; nenhuma altura fixa em contêineres de texto; `overflow-wrap: anywhere` em títulos |
| Linguagem simples | Rótulos leigos por dimensão (`utils/rotulos.ts`: "Cansa mais rápido que antes" em vez de "FADIGA_TAREFA: AMPLIADA"); termo de consentimento em 5 parágrafos com "o que", "o que não", "quem vê", "por quanto tempo", "seus direitos"; códigos de regra (RN01…) só entre parênteses como referência |
| Idioma | `<html lang="pt-BR">`; material adaptado com `lang="pt-BR"` explícito |

---

## 5. Formulários

| Requisito | Implementação |
|---|---|
| Rótulo em todo campo | `Campo` gera `<label for>`; grupos usam `fieldset`/`legend` (`Escala3`, escopos, papel, resultado) |
| Instruções (3.3.2) | `dica` ligada por `aria-describedby`; obrigatório indicado por `required` + `aria-required`; opcional marcado "(opcional)" no rótulo |
| Erros (3.3.1 / 3.3.3) | Validação **no envio** (não a cada tecla — evita ruído); `ResumoErros` no topo (`role="alert"`, focado, com links); mensagem por campo ligada por `aria-describedby`, `aria-invalid="true"`, borda de 3 px + ícone; texto diz **o que** e **como corrigir** ("Dê um título ao material (ex.: Ciências — O ciclo da água)") |
| Prevenção (3.3.4) | Ações irreversíveis (revogar, excluir, descartar, fechar ciclo) exigem modal de confirmação; exclusão pede o nome exato; revogação pede caixa "Entendo as consequências" |
| Sem tempo limite | Nenhum formulário expira |
| Autocomplete | `autoComplete="off"` só em campos de dados fictícios; login não tem senha (3.3.8) |

---

## 6. Estados e mensagens dinâmicas

| Estado | Componente | Acessibilidade |
|---|---|---|
| Carregando | `Carregando` | `role="status"`, spinner `aria-hidden`, texto "Carregando…"; botões com `aria-busy` e texto "Salvando…" |
| Vazio | `EstadoVazio` | `h2` + explicação + ação seguinte ("Registrar observação") |
| Sucesso | `useAnuncio` → região `aria-live="polite"` + toast | Anúncio sem mover foco; toast fecha em 6 s ou pelo botão "Fechar aviso: …"; a mesma informação aparece na tela (badge/alerta) — o toast é redundante, não essencial |
| Erro | `Alerta tom="erro" vivo` | `role="alert"` (assertivo) só para erros que bloqueiam; mensagem em linguagem simples (`mensagemAmigavel`) + "Tentar novamente" |
| Progresso longo | `.progresso` na geração | `role="status"` com texto do que está acontecendo |

Regiões live existem no DOM desde o carregamento (`Toasts`), para que leitores de tela as registrem antes da primeira mensagem.

---

## 7. ARIA — uso mínimo

| Uso | Justificativa |
|---|---|
| `aria-label="Principal"` no `nav` | Nomear a única navegação |
| `aria-labelledby` no `<dialog>` | Nome acessível do modal |
| `aria-describedby`, `aria-invalid`, `aria-required` | Ligação campo ↔ dica/erro |
| `aria-live`, `role="status"`, `role="alert"` | Mensagens dinâmicas |
| `aria-busy` | Botão em carregamento |
| `aria-pressed` | Botões de alternância ("Editar o texto adaptado", "Simular falha de rede") |
| `aria-current="page"` | `NavLink` automático |
| `aria-hidden="true"` | Ícones e SVG decorativos |
| **Não usado** | `role="button"` em div, `role="dialog"` manual, `aria-label` redundante em `section`, `tabindex` positivo, `role="presentation"` em tabelas |

---

## 8. Reflow, responsividade e zoom

- Mobile-first; breakpoints `48em` (768 px) e `64em` (1024 px).
- Em 320 px (zoom 400 % em 1280 px) nenhum conteúdo exige rolagem horizontal: grades viram coluna única; `dl.dados` empilha abaixo de 30em; comparação original × adaptado empilha; só **tabelas** rolam, dentro de `.tabela-rolagem`.
- Nenhum `min-width` maior que a tela; imagens `max-width: 100%`; `dvh` para altura mínima.
- Alvos de toque ≥ **44 × 44 px** (`--alvo-minimo`) em botões, links de navegação, rádios em cartão, toasts; excede o mínimo de 24 px da WCAG 2.5.8.
- Orientação livre (1.3.4); sem bloqueio de zoom (`user-scalable` não é restringido).

---

## 9. Movimento

- Únicas animações: spinner (rotação) e transições de 160 ms em botões.
- `@media (prefers-reduced-motion: reduce)` zera durações; a preferência "Sem animações" na tela Acessibilidade faz o mesmo via `data-movimento="reduzido"`.
- Nada pisca, nada rola automaticamente, nada de parallax (2.3.1, 2.3.3, 2.2.2).

---

## 10. Requisitos por componente

| Componente | Requisito de acessibilidade | Implementação | Como testar |
|---|---|---|---|
| **Botão** (`Botao`) | Elemento nativo, nome acessível, foco visível, alvo ≥ 44 px, estado de carregamento anunciado | `<button>`; `aria-busy`; texto muda para "Aguarde…"; `disabled` durante carregamento | Tab até o botão, Enter/Espaço; com NVDA, ouvir "botão, Salvar"; clicar e ouvir "ocupado" |
| **Link / LinkBotao** | `<a>` só para navegação; sublinhado; nome descritivo | `Link` do router; `.botao` só muda aparência | Tab, Enter; verificar que a URL muda; lista de links do NVDA (Insert+F7) faz sentido fora de contexto |
| **Menu de navegação** | `nav` nomeado, lista, item atual marcado, consistente | `<nav aria-label="Principal"><ul>`; `aria-current="page"` | Ler com NVDA em modo navegação; conferir "atual" no item ativo; mesma ordem em todas as telas |
| **Campo de texto / área / select** (`Campo`) | Label visível associado; dica e erro por `aria-describedby`; `aria-invalid` | `useId()` gera ids; `label for` | Clicar no rótulo foca o campo; NVDA lê rótulo + dica + erro; axe `label` |
| **Grupo de rádios** (`Escala3`, escopos, resultado) | `fieldset`/`legend`; navegação por setas; seleção não só por cor | Rádio nativo dentro de `label.opcao`; `:has(:checked)` | Setas trocam a opção; NVDA lê "grupo Atenção sustentada, botão de opção 1 de 3" |
| **Checkbox** (termo, confirmação) | Label associado; estado lido | `<label class="opcao"><input type="checkbox">` | Espaço alterna; NVDA lê "marcado/não marcado" |
| **Modal** (`Modal`) | Foco preso enquanto aberto; Esc fecha; foco retorna; nome acessível; fundo inerte | `<dialog>.showModal()`; `aria-labelledby`; `onCancel` | Abrir, Tab (não sai), Esc (fecha, foco volta ao botão); NVDA anuncia "diálogo, Revogar o consentimento?" |
| **Card** (`Card`) | Título em nível correto; não é landmark | `<section>` sem nome + `h2`/`h3` | Lista de títulos do NVDA (Insert+F7) coerente |
| **Tabela** (diff, pendências) | `caption`, `th scope`, rolagem própria | `<caption>`, `scope="col"/"row"`, `.tabela-rolagem` | NVDA modo tabela (Ctrl+Alt+setas) lê cabeçalhos; em 320 px só a tabela rola |
| **Alerta** (`Alerta`) | Ícone decorativo + título textual; live só quando dinâmico | `role="status"`/`"alert"` sob demanda | Disparar erro; NVDA lê imediatamente; sem `vivo`, não interrompe |
| **Resumo de erros** | Foco ao aparecer; links para campos | `tabIndex=-1`, `role="alert"` | Enviar formulário vazio; foco vai ao resumo; Enter no link foca o campo |
| **Toast / status** | Anúncio sem mover foco; fechável; redundante | `aria-live` polite/assertive + botão "Fechar aviso" | NVDA lê a mensagem; Tab alcança "Fechar"; informação também na tela |
| **Badge** | Texto, não só cor; contraste ≥ 4,5:1 | `<span class="badge">` com texto | Zoom no badge; ler com NVDA |
| **Paginação** | *Não há* (listas curtas por estudante). Se entrar: `nav aria-label="Paginação"`, `aria-current` | — | — |
| **Busca** | *Não há* no MVP (≤ 10 estudantes por usuário). Se entrar: `role="search"`, rótulo, resultados anunciados | — | — |
| **Gráficos** | *Não há* (indicadores agregados são Could). Se entrar: tabela de dados equivalente + `aria-describedby` | — | — |
| **Imagens** | Logo decorativa `aria-hidden`; futuras capturas com `alt` | SVG inline | axe `image-alt`; NVDA ignora a logo e lê o nome do link |
| **Estado vazio** (`EstadoVazio`) | Título + próximo passo | `h2` + link/botão | Ler; verificar que a ação leva ao lugar certo |
| **Carregando** | Anunciado; não bloqueia teclado | `role="status"` | NVDA lê "Carregando…"; Tab continua funcionando |
| **Material adaptado** (`MaterialAdaptado`) | Contraste do perfil; blocos como parágrafos/listas; `lang`; impressão | `article[data-contraste]`, `<ol>` para etapas, `print.css` | Ler com NVDA (lista numerada); Ctrl+P sem cabeçalho; zoom 400 % |
| **Skip link** | Primeiro foco; visível ao focar; leva ao `main` | `.skip-link` + `main tabindex=-1` | Recarregar, Tab uma vez, Enter; foco no `main` |
| **Preferências de acessibilidade** | Persistem; aplicam em todas as telas; rádios nativos | `usePreferencias` → atributos em `<html>` | Alterar, navegar, recarregar; conferir atributo no DevTools |

---

## 11. Checklist rápido por tela (Definition of Done de acessibilidade)

Antes de marcar um card de tela como concluído:

- [ ] Um `h1`; níveis sem salto; título do documento atualizado.
- [ ] Tudo operável por teclado; foco visível; ordem lógica; Esc fecha modais.
- [ ] Todo campo com rótulo; erros no resumo + no campo; `aria-invalid`.
- [ ] Estados carregando / vazio / sucesso / erro presentes e anunciados.
- [ ] Nenhuma informação só por cor; contraste conferido na tabela de tokens.
- [ ] 320 px sem rolagem horizontal; alvos ≥ 44 px.
- [ ] `semViolacoesAxe(container)` no teste da tela verde.
- [ ] Sessão manual com NVDA + teclado registrada em `docs/plano-de-testes.md` §3 (pendente para o piloto).

> Ferramentas automáticas (axe, Lighthouse, WAVE) encontram no máximo ~40 % dos problemas. Nada substitui a passagem manual com teclado e leitor de tela.
