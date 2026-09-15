# PEI Vivo — Guia passo a passo: do zero ao ciclo completo

**Versão:** 1.0 — 14/09/2026 · **Para quem:** a dupla (Geandre e Jean), a orientadora e a banca.
Este guia leva da máquina vazia até o ciclo completo *observar → validar → adaptar → retroalimentar* rodando no protótipo, e depois mostra como o sistema é usado por cada perfil. Tudo com dados **fictícios** e a camada de IA **desligada**.

---

## Parte 1 — Preparar a máquina (uma vez)

| Passo | O que fazer | Como conferir |
|---|---|---|
| 1.1 | Instalar **Node.js 20 ou superior** (<https://nodejs.org>, versão LTS) | `node -v` → `v20.x` ou mais |
| 1.2 | Instalar **Git** (<https://git-scm.com>) | `git --version` |
| 1.3 | Ter uma conta no GitHub com acesso a <https://github.com/geandreac/tcc-peivivo> | Abrir o link logado |
| 1.4 | (Opcional) VS Code com as extensões *ESLint*, *Prettier*, *axe Accessibility Linter* | — |

Docker **não** é necessário. O banco é validado em PGlite (Postgres em WASM) e, no CI, no Supabase real.

## Parte 2 — Clonar e instalar

```bash
git clone https://github.com/geandreac/tcc-peivivo.git
cd tcc-peivivo
npm install
```

Confira que está tudo certo antes de mexer em qualquer coisa:

```bash
npm test              # 91 testes: 30 do motor + 61 do app (com axe-core)
npm run typecheck     # TypeScript estrito, sem erros
npm run db:validar    # migrations + seed num Postgres real (PGlite)
npm run contraste     # tokens de cor ≥ 4,5:1 / 3:1
```

Se os quatro passarem, a máquina está pronta.

## Parte 3 — Rodar o protótipo

```bash
npm run dev
```

Abra <http://localhost:5173>. Se a porta estiver ocupada por outro projeto, use `npx vite --port 5179 -w apps/web` e abra <http://localhost:5179>.

Você verá a **tela inicial** (apresentação da solução). No menu: *Início · Ajuda · Acessibilidade · Entrar*.

> Dica: em **Acessibilidade** você pode ligar o alto contraste e aumentar a fonte; em **Ajuda** há "Restaurar dados da demonstração" (volta ao estado inicial) e "Simular falha de rede" (mostra os estados de erro).

## Parte 4 — Entrar: uma porta por perfil

Toque em **Entrar**. A tela mostra quatro portas, cada uma com a sua especificação (o que faz, o que vê, o que nunca vê, como será o acesso real):

| Porta | Rota | Perfis de demonstração |
|---|---|---|
| **Família** | `/entrar/familia` | Rosa (responsável do Miguel e do Estudante B) |
| **Professores** | `/entrar/docente` | Márcia (docente do Miguel); Paulo (sem vínculo — mostra o acesso negado) |
| **Equipe de saúde** | `/entrar/saude` | Camila (TO do Miguel); Beatriz (fono sem vínculo) |
| **Coordenação** | `/entrar/coordenacao` | Coordenação (fictícia) |

Não há senha na demonstração. Para trocar de perfil, use **Sair** (canto superior direito) e entre por outra porta.

## Parte 5 — O ciclo completo, passo a passo (o "Miguel")

Siga na ordem; cada passo é um perfil diferente. Os dados iniciais já têm 3 ciclos fechados do Miguel e um ciclo 4 aberto.

### 5.1 Coordenação — cadastrar e vincular (RF01)

1. Entrar → **Coordenação** → *Coordenação (fictícia)*.
2. No painel, toque em **Cadastrar estudante**. Preencha nome fictício (ex.: "Estudante fictício C"), data de nascimento, turma. Deixe o laudo em branco ou informe só a data — o sistema nunca guarda o laudo.
3. Ao cadastrar, você cai em **Vínculos**. Escolha *Beatriz (fictícia)*, papel *Profissional de saúde*, e tente criar sem registro no conselho → o sistema recusa (D-13). Preencha `CRFa-DEV-1` e crie.
4. Vincule também *Paulo* como docente e *Rosa* como responsável.
5. Volte a **Meus estudantes**: o novo estudante aparece "Aguardando consentimento".

*O que isso demonstra:* a única porta de entrada de um estudante é a coordenação (D-08); profissional exige conselho; um papel por pessoa por estudante (D-14).

### 5.2 Família — consentir (RF02, RN01)

1. **Sair** → Entrar → **Família** → *Rosa*.
2. No painel, o **Estudante fictício B** está "Aguardando consentimento". Abra-o → **Ler e decidir sobre o consentimento**.
3. Leia o termo (5 parágrafos em linguagem simples). Tente tocar **Autorizo** sem marcar "Li e entendi" → o resumo de erros aparece e recebe o foco.
4. Marque os escopos que quiser e "Li e entendi" → **Autorizo**. O badge vira **Ativo** e a trilha de auditoria registra *Consentimento concedido*.
5. (Para ver o bloqueio) abra o **Miguel** → consentimento → **Revogar** → marque "Entendo as consequências" → confirme. Depois conceda de novo para continuar o roteiro.

*O que isso demonstra:* sem consentimento nada acontece; revogação imediata e reversível só por nova concessão (RN08); auditoria (D-06).

### 5.3 Docente — observar (RF03)

1. **Sair** → Entrar → **Professores** → *Márcia*.
2. Abra **Miguel** → **Registrar observação**. O ciclo 4 já está aberto e mostra o que a família e a terapeuta registraram.
3. Escolha a escala em uma ou mais dimensões — os rótulos são em linguagem simples ("Perde o fio mais cedo que antes"). Em *Interesse manifesto*, escreva o tema na evidência (ex.: "vulcões").
4. **Registrar observações** → toast de confirmação.

*O que isso demonstra:* seis dimensões, escala de três pontos, evidência livre; mesma tela para os três papéis; nunca diagnóstico.

### 5.4 Docente — fechar o ciclo (RF05, RF06, RN03, RN06)

1. Ainda como Márcia, abra **Miguel** → **Fechar ciclo**.
2. Veja a tabela *Vigente → Proposto*. Repare: "Nível de vocabulário: **Aguardando 2º ciclo para elevar (RN03)**" (a terapeuta marcou AMPLIADA só uma vez) e "Blocos por material: 8 → 6" (fadiga AMPLIADA reduz imediatamente).
3. Toque **Fechar ciclo 4** → confirme no modal. Resultado: *Enviado para validação clínica*; o ciclo 5 abre sozinho.

*O que isso demonstra:* o motor determinístico (sem IA) e a assimetria conservadora; como há profissional vinculado, a versão nasce PENDENTE e a vigente anterior continua valendo.

### 5.5 Equipe de saúde — validar (RF07, RN07)

1. **Sair** → Entrar → **Equipe de saúde** → *Camila*.
2. Menu **Pendências** → a versão do ciclo 4 do Miguel aparece com os dias em aberto → **Abrir validação**.
3. Veja o diff e as observações que o geraram. Escolha **Aprovar o conjunto de parâmetros** (ou *Solicitar ajuste* — exige justificativa, que a docente lê).
4. (Opcional) Abra **Notas clínicas** e registre uma nota reservada. Depois, entre como Márcia e tente abrir `/estudantes/e-0010/notas-clinicas`: **Acesso negado (RN02)**.

*O que isso demonstra:* validação por conjunto, nunca por material; sem resposta em 7 dias a versão anterior permanece (RN05); a nota clínica é exclusiva do profissional.

### 5.6 Docente — gerar, revisar e aprovar (RF08–RF12, RN04) ⭐

1. **Sair** → Entrar → **Professores** → *Márcia* → **Miguel** → **Gerar material**.
2. A tela mostra o perfil vigente (linhas por bloco, etapa única, contraste 7:1, âncora "dinossauros"). Toque **Usar texto de exemplo (ciclo da água)** ou cole o seu texto.
3. **Adaptar para Miguel** → em menos de um segundo você está na **Revisão**: original à esquerda, adaptado à direita (empilhado no celular). Repare nos blocos de até 4 linhas e nos enunciados divididos em etapas ("1. Leia o texto acima. 2. Responda às perguntas…").
4. Se quiser, **Editar o texto adaptado**. Depois **Aprovar material**. Antes disso, só você vê o rascunho.
5. Na tela do **Material**, toque **Imprimir ou salvar em PDF** para a versão impressa (só o material sai).

*O que isso demonstra:* o caso central (domingo, 21h): colar → adaptar → revisar → aprovar em poucos toques; a IA nunca aprova; cache (o mesmo texto não é regerado).

### 5.7 Docente — registrar o desfecho (RF13)

1. Na tela do material aprovado → **Registrar desfecho**.
2. Escolha *Alcançado / Parcial / Não alcançado* e, se quiser, escreva uma linha ("Terminou sozinho. A âncora de interesse funcionou.") → **Registrar desfecho**.

*O que isso demonstra:* a retroalimentação — o resultado fica ligado à versão do perfil que gerou o material.

### 5.8 Família e coordenação — ver o que funcionou

1. Como **Rosa**: **Miguel** → **Ver histórico**: ciclos, observações de todos, versões, materiais aprovados com desfecho, auditoria. Rascunhos não aparecem. Em **Exportar ou excluir**: exporta o JSON (sem notas clínicas) ou exclui tudo (exige digitar o nome).
2. Como **Coordenação**: **Miguel** → **Histórico do PEI** → **Exportar para a reunião**.

O ciclo fechou: o que a família, a escola e a terapia sabem virou material para aquele aluno, e o resultado voltou para o perfil.

## Parte 6 — Ver os caminhos NEGADOS (o diferencial ético)

| Como | Faça | Resultado esperado |
|---|---|---|
| Márcia (docente) | Abrir `/estudantes/e-0010/notas-clinicas` | "Acesso negado (RN02)" |
| Rosa (responsável) | Abrir `/materiais/m-0041` (rascunho) | "Material não encontrado — rascunhos só aparecem para a docente" |
| Márcia | Abrir o Estudante B antes do consentimento | "Aguardando consentimento do responsável"; geração bloqueada |
| Paulo (docente sem vínculo) | Painel | "Nenhum estudante vinculado a você"; qualquer URL de estudante → negado |
| Qualquer um sem sessão | Abrir `/painel` | Redireciona para Entrar e volta depois |

Os mesmos cenários estão automatizados em `apps/web/src/services/mockApi.test.ts` (34 testes) — e serão reexecutados contra o Supabase real na Fase 1.

## Parte 7 — Trabalhar no código (para a dupla)

```bash
git switch development && git pull
git switch -c feature/B-P4.19-playwright   # um card por branch
# ... edite, teste ...
npm test && npm run typecheck
git push -u origin feature/B-P4.19-playwright
# abra o Pull Request para development; o outro integrante revisa
```

Regras completas em `CONTRIBUTING.md`. `main` só recebe `development` por PR ao fechar um marco.

## Parte 8 — Validar acessibilidade manualmente (antes de cada marco)

1. Recarregue qualquer tela e aperte **Tab** uma vez: o link "Pular para o conteúdo principal" deve aparecer.
2. Percorra uma tarefa inteira (ex.: 5.6) só com **Tab / Enter / Espaço / Setas / Esc**.
3. **Ctrl +** até 200 % e depois 400 %: nada deve sair da tela nem exigir rolagem horizontal (exceto tabelas).
4. Ligue o **alto contraste** e a **fonte maior** em Acessibilidade e repita a tarefa.
5. Com o NVDA (Windows) ou VoiceOver (iOS): ouça o título de cada tela mudar, os rótulos dos campos, os erros e os toasts.
6. Rode o Lighthouse (aba *Accessibility*) e o axe DevTools no Chrome. O checklist completo está em `docs/plano-de-testes.md` §3.

## Parte 9 — O que vem depois (roteiro do plano)

| Fase | O que muda para quem usa |
|---|---|
| 1 — migration `0004` + testes RLS | Nada visível; a matriz de permissões passa a valer no banco |
| 3 — Edge Functions | `fechar-ciclo` e `gerar-material` reais; o mock é substituído |
| 4 — `supabaseApi` + login real | Entrar com e-mail e senha; família entra pelo convite; sessão lembrada |
| 5 — IA + offline | Vocabulário simplificado e exemplos com a âncora de interesse; material aprovado abre sem internet |
| 6 — Piloto | Docentes reais, SUS, tempos, Flesch → `docs/resultados.md` |
