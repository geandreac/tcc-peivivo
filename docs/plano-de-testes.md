# PEI Vivo — Plano de testes

**Versão:** 1.0 — 14/09/2026
**Escopo:** protótipo `apps/web` + `packages/motor-adaptacao`. Testes de RLS/Edge Functions seguem em `docs/plano-desenvolvimento.md` (P1.11–P1.19, P3.x).
**Automatizado hoje:** 30 testes do motor (`packages/motor-adaptacao/src/*.test.ts`) e 61 do app (`apps/web/src/**/*.test.tsx`), incluindo axe-core em todas as telas. Comando: `npm test`.

---

## 1. Testes funcionais

Prioridade: **A** (bloqueia demo) · **B** (importante) · **C** (desejável). Coluna *Auto* = nome do teste automatizado, quando existe.

| ID | Funcionalidade | Cenário | Pré-condição | Passos | Resultado esperado | Prio. | Auto |
|---|---|---|---|---|---|---|---|
| TF-01 | Entrar (D-16) | Porta de entrada por perfil | Nenhuma sessão | 1. Abrir `/entrar` 2. Tocar em "Professores" 3. Tocar em "Márcia" | Passo 2: tela "Entrar como professores" com especificação (faz / vê / nunca vê) e só perfis docentes; passo 3: painel com 2 estudantes; toast | A | `paginas.test.tsx › porta de entrada…` e `› escolher um perfil na tela de professores` |
| TF-01b | Entrar | Slug inválido | — | 1. Abrir `/entrar/xyz` | Página não encontrada | B | `/entrar/xyz mostra página não encontrada` |
| TF-02 | Rota protegida | Acesso sem sessão | Sem sessão | 1. Abrir `/painel` | Redireciona para `/entrar`; após entrar volta ao destino | A | `rota protegida sem sessão` |
| TF-03 | Painel | Estado vazio | Entrar como Paulo (sem vínculo) | 1. Abrir `/painel` | "Nenhum estudante vinculado a você" + explicação | B | `docente sem vínculo vê estado vazio` |
| TF-04 | Consentimento | Conceder | Rosa; estudante B sem consentimento | 1. Abrir consentimento de B 2. Tocar "Autorizo" sem marcar "li" 3. Marcar 4. Tocar de novo | Passo 2: resumo de erros com foco; passo 4: badge "Ativo", evento CONCESSAO na trilha | A | `Consentimento › responsável concede` |
| TF-05 | Consentimento | Revogar com dupla confirmação | Rosa; A com consentimento ativo | 1. "Revogar consentimento" 2. Modal: botão desabilitado 3. Marcar "Entendo" 4. Confirmar | "Revogado"; como Márcia, A mostra "Aguardando consentimento" e geração bloqueada | A | idem; `mockApi › revogar bloqueia` |
| TF-06 | Observação | Validação | Márcia; A | 1. Abrir observar 2. Registrar sem escolher nada | Resumo "Escolha ao menos uma dimensão" com foco | A | `Observação e fechamento` |
| TF-07 | Observação | Registrar | Márcia; ciclo 4 aberto | 1. Escolher "Reduzida" em Atenção 2. Registrar | Toast "1 observação registrada no ciclo 4"; volta ao estudante | A | idem |
| TF-08 | Observação | Sem ciclo aberto | Márcia; estudante sem ciclo | 1. Abrir observar | Estado vazio + botão "Abrir novo ciclo" | B | — (manual) |
| TF-09 | Fechar ciclo | Diff com RN03 | Márcia; ciclo 4 com observações | 1. Abrir fechar ciclo | Tabela vigente → proposto; linha "Nível de vocabulário: Aguardando 2º ciclo"; "Blocos por material" muda 8 → 6 | A | idem; `mockApi › PENDENTE` |
| TF-10 | Fechar ciclo | Sem observações | Márcia; ciclo aberto vazio | 1. Abrir fechar ciclo | Botão desabilitado; alerta com link para observar | B | `mockApi › ciclo já fechado` (parcial) |
| TF-11 | Fechar ciclo | Confirmar | TF-09 | 1. "Fechar ciclo 4" 2. Confirmar no modal | "Ciclo 4 fechado"; "Enviado para validação clínica"; ciclo 5 aberto | A | idem |
| TF-12 | Validar | Aprovar | Camila; versão PENDENTE | 1. Abrir validar 2. "Aprovar o conjunto" | Toast; versão VIGENTE no histórico; vigente usada na geração | A | `mockApi › profissional aprova` |
| TF-13 | Validar | Ajuste sem justificativa | Camila | 1. "Solicitar ajuste" 2. Enviar vazio | Erro no campo + resumo | A | `mockApi › solicitar ajuste exige justificativa` |
| TF-14 | Validar | Nada pendente | Camila; tudo vigente | 1. Abrir validar | Estado vazio "Nada aguardando validação" | B | — (manual) |
| TF-15 | Pendências | Expiração RN05 | Versão PENDENTE com > 7 dias | 1. Abrir `/pendencias` | Status "Expirada"; "prazo vencido" | B | — (manual: editar `createdAt` no localStorage) |
| TF-16 | Gerar | Validação | Márcia; A | 1. Abrir gerar 2. "Adaptar" com tudo vazio | Resumo "Há 2 problemas"; links focam campos; `aria-invalid` | A | `valida o formulário` |
| TF-17 | Gerar | Fluxo principal | Márcia; A | 1. "Usar texto de exemplo" 2. "Adaptar para Miguel" | Tela Revisar com original × adaptado; etapas numeradas; badge "Só camada determinística" | A | `gera com o texto de exemplo` |
| TF-18 | Gerar | Sem perfil vigente | Márcia; B com consentimento, sem versão | 1. Abrir gerar de B | Estado vazio "Ainda não há perfil vigente" + link observar | B | `estado vazio quando…` |
| TF-19 | Gerar | Cache | Márcia | 1. Gerar o mesmo texto duas vezes | Mesmo material (não regera) | C | `mockApi › cache` |
| TF-20 | Revisar | Editar e aprovar | TF-17 | 1. "Editar o texto adaptado" 2. Alterar 3. Aprovar | Material com texto revisado; badge "Aprovado" | A | (aprovar sem edição) `gera com…` |
| TF-21 | Revisar | Descartar | TF-17 | 1. "Descartar rascunho" 2. Confirmar | Volta ao estudante; material some da lista | B | — (manual) |
| TF-22 | Material | Impressão | Material aprovado | 1. Ctrl+P | Sem cabeçalho/rodapé/botões; blocos com borda; sem quebra dentro do bloco | B | — (manual) |
| TF-23 | Desfecho | Registrar | Material aprovado sem desfecho | 1. "Registrar desfecho" 2. Enviar vazio 3. Escolher "Alcançado" 4. Enviar | Passo 2: erro; passo 4: badge "Desfecho: Alcançado" no material | A | `gera com…` |
| TF-24 | Desfecho | Duplicado | Material com desfecho | via API | CONFLITO | B | `mockApi › segundo desfecho` |
| TF-25 | Nota clínica (RN02) | Negado ao docente | Márcia | 1. Abrir `/estudantes/e-0010/notas-clinicas` | "Acesso negado (RN02)" + link voltar; nenhum conteúdo de nota | A | `docente não vê link…` + `mockApi › RN02` |
| TF-26 | Nota clínica | Profissional escreve | Camila | 1. Abrir notas 2. Registrar | Nota listada; toast | A | `profissional de saúde acessa` |
| TF-27 | Rascunho privado (D-12) | Responsável por URL | Rosa | 1. Abrir `/materiais/m-0041` | "Material não encontrado" com explicação | A | `responsável não vê rascunho` |
| TF-28 | Cadastro (D-08) | Coordenação | Coordenação | 1. Cadastrar com data futura 2. Corrigir 3. Cadastrar | Passo 1: erro; passo 3: vai para Vínculos com vínculo COORDENACAO | A | `mockApi › coordenação cadastra` |
| TF-29 | Cadastro | Negado | Márcia | 1. Abrir `/coordenacao/cadastrar` | Alerta "Só a coordenação…" | B | `mockApi › docente não cadastra` |
| TF-30 | Vínculos (D-13/D-14) | Profissional sem registro | Coordenação | 1. Escolher Beatriz, papel Profissional, sem registro 2. Criar | Erro no campo "registro"; após preencher, vínculo criado | A | `mockApi › coordenação cadastra…vincula` |
| TF-31 | Vínculos | Desativar | Coordenação | 1. Desativar Márcia 2. Confirmar 3. Entrar como Márcia | A some do painel; acesso negado por URL | A | `mockApi › desativar vínculo` |
| TF-32 | Dados (RF15) | Exportar | Rosa | 1. "Exportar dados" | JSON exibido; sem notas clínicas; evento EXPORTACAO | B | `mockApi › exportação` |
| TF-33 | Dados | Excluir | Rosa | 1. "Excluir" 2. Nome errado 3. Nome certo | Passo 2: erro; passo 3: volta ao painel sem o estudante | B | `mockApi › exclusão` |
| TF-34 | Rotas | 404 | — | 1. Abrir `/xyz` | Página não encontrada com 2 saídas | A | `rota inexistente` |
| TF-35 | Erro de rede | Recuperação | Ajuda → "Simular falha de rede" | 1. Abrir qualquer lista 2. "Tentar novamente" após desativar | Alerta de erro com botão; após desativar, dados carregam | A | — (manual) |
| TF-36 | Carregamento | Estados | Latência 350 ms do mock | 1. Navegar entre telas | "Carregando…" com `role=status`; botões "Salvando…" | B | — (manual) |
| TF-37 | Sessão | Sair | Qualquer perfil | 1. "Sair" | Volta ao início; toast; rotas protegidas redirecionam | A | `mockApi › sem sessão` (parcial) |
| TF-38 | Motor | RN03 assimetria | — | `npm run test:motor` | 4 testes RN03 verdes | A | `regras.test.ts` |
| TF-39 | Motor | Adaptador determinístico | — | idem | 9 testes verdes (nada se perde, blocos ≤ limite, etapa única) | A | `adaptador.test.ts` |
| TF-40 | Motor | Ciclos consecutivos e âncora | — | idem | 10 testes verdes | A | `ciclos.test.ts` |

**Cobertura atual:** 41 cenários; 32 automatizados; 9 manuais (TF-08, 10 parcial, 14, 15, 21, 22, 35, 36 e compatibilidade de navegadores).

---

## 2. Testes de usabilidade

### 2.1 Perfil dos participantes

| Grupo | n | Critérios |
|---|---|---|
| Docentes regentes | 5 | Ensino fundamental; ≥ 1 estudante com laudo na turma; usam celular para planejar; sem contato prévio com o protótipo |
| Responsáveis | 3 | Filho(a) com TEA/TDAH/dislexia em classe comum; ≥ 1 com baixa familiaridade digital |
| Profissionais de saúde | 2 | TO, fono, psicopedagogo ou psicólogo que atende crianças em idade escolar |
| Coordenação | 1 | Coordenador(a) pedagógico(a) que responde pelo PEI |

Sem escola parceira: recrutamento individual (risco §10). Nenhum dado real de estudante — todos usam Miguel (fictício).

### 2.2 Tarefas

| ID | Papel | Tarefa (enunciado ao participante) | Sucesso |
|---|---|---|---|
| T1 | Responsável | "Você recebeu o convite. Leia o que a escola pede e decida se autoriza." | Consentimento ATIVO; explica com as próprias palavras quem vê o quê |
| T2 | Docente | "Registre como o Miguel esteve nas últimas duas semanas." | ≥ 3 dimensões registradas |
| T3 ⭐ | Docente | "É domingo à noite. Aqui está o texto de Ciências de amanhã. Deixe-o pronto para o Miguel." | Material APROVADO |
| T4 | Docente | "A aula aconteceu. O Miguel leu tudo sozinho. Registre isso." | Desfecho ALCANCADO |
| T5 | Profissional | "A escola fechou o ciclo. Veja o que propõem e decida." | Versão VIGENTE ou ajuste com justificativa |
| T6 | Coordenação | "Chegou um aluno novo. Cadastre-o e dê acesso à professora." | Estudante + vínculo DOCENTE |
| T7 | Todos | "Encontre como aumentar o tamanho do texto." | Preferência aplicada |

### 2.3 Roteiro da sessão (30–40 min, moderado, remoto ou presencial)

1. Boas-vindas, termo de participação, pensar em voz alta (3 min).
2. Contexto: "o sistema usa um aluno fictício; nada é real" (1 min).
3. Tarefas do papel (15–20 min), no **celular do participante** (docente/responsável) ou notebook (profissional/coordenação). Moderador não ajuda; anota erros, hesitações e falas.
4. SUS (10 itens, 3 min).
5. Perguntas abertas: "O que confundiu?", "O que faltou?", "Você usaria no domingo à noite?" (5 min).

### 2.4 Métricas e critério de aprovação

| Métrica | Como medir | Critério |
|---|---|---|
| Taxa de sucesso | Tarefas concluídas sem ajuda / total | ≥ 80 % por tarefa; T3 ≥ 80 % |
| Tempo de execução | Cronômetro do início ao "pronto" | T3 ≤ 60 s (mediana); T4 ≤ 20 s; T1 ≤ 3 min |
| Erros | Cliques em elemento errado, volta desnecessária, submissão com erro | ≤ 2 por tarefa (média) |
| Satisfação | SUS | ≥ 68 (RNF01); ideal ≥ 75 |
| Feedback qualitativo | Codificação de falas por heurística | Nenhum tema recorrente (≥ 3 participantes) sem plano de correção |
| Compreensão (T1) | 4 perguntas de reconto | ≥ 3 corretas em ≥ 4 dos 5 |

**Aprovação:** todos os critérios acima atendidos **e** nenhum problema novo de severidade ≥ 3 na avaliação heurística de acompanhamento. Caso contrário: corrigir, nova rodada com 3 participantes.

---

## 3. Testes de acessibilidade

> Ferramentas automáticas (axe, Lighthouse, WAVE) detectam no máximo ~30–40 % das barreiras. Elas **não substituem** a passagem manual com teclado e leitor de tela. O checklist abaixo é executado por tela; resultado registrado em `docs/resultados.md` (P6.7).

### 3.1 Ferramentas

| Ferramenta | Uso | Quando |
|---|---|---|
| axe-core (Vitest) | Toda tela e componente, em jsdom (sem contraste) | A cada `npm test` (CI) |
| axe DevTools / Lighthouse (Chrome) | Contraste renderizado, `target-size`, `heading-order`, PWA | Antes de cada marco |
| WAVE | Segunda opinião: landmarks, rótulos, ARIA | Antes do piloto |
| `node scripts/contraste.mjs` | Pares de cor dos tokens | A cada mudança de token |
| Contrast Checker (WebAIM) | Conferência pontual | Ao propor nova cor |
| NVDA + Firefox/Chrome (Windows) | Leitura completa das 6 telas principais | P6.7 |
| VoiceOver (iOS Safari) | Fluxo docente no celular | P6.7 |
| Validador W3C | HTML renderizado (`dist/`) | Antes do freeze |
| Inspeção manual do DOM | Ordem de foco, `aria-*`, ids únicos | Revisão de PR |

### 3.2 Checklist verificável (por tela)

| # | Verificação | Como | Critério | Telas |
|---|---|---|---|---|
| A1 | `Tab` / `Shift+Tab` percorrem todos os controles na ordem visual | Teclado | Nenhum controle pulado; ordem = leitura | todas |
| A2 | `Enter` ativa links e botões; `Espaço` ativa botões e marca caixas | Teclado | Funciona em 100 % | todas |
| A3 | Setas trocam opção em grupos de rádio | Teclado | Escala3, escopos, papel, resultado, preferências | observar, consentimento, vínculos, desfecho, acessibilidade |
| A4 | `Esc` fecha modal e o foco volta ao botão de origem | Teclado | Sempre | consentimento, fechar ciclo, revisar, vínculos, dados |
| A5 | Foco visível em todo elemento focado (anel ≥ 3 px) | Visual | Sem exceção; também em alto contraste | todas |
| A6 | Skip link aparece no primeiro Tab e leva ao `main` | Teclado | Foco no `main` | todas |
| A7 | Sem armadilha de teclado (modal, toast, `pre` rolável) | Teclado | Sempre há saída | todas |
| A8 | Contraste de texto ≥ 4,5:1; de componentes ≥ 3:1 | axe DevTools + script | 0 violações | todas |
| A9 | Zoom 200 % | Ctrl + | Sem sobreposição, sem corte | todas |
| A10 | Zoom 400 % (320 px) | Ctrl + em 1280 px | Sem rolagem horizontal (exceto tabelas) | todas |
| A11 | Layout em 375 px real (celular) | Dispositivo | Comparação empilhada; alvos ≥ 44 px | revisar, observar, gerar |
| A12 | Um `h1`; níveis sem salto | NVDA Insert+F7 / DevTools | Lista de títulos coerente | todas |
| A13 | Landmarks: banner, navigation, main, contentinfo | NVDA `D` / axe | 4 landmarks; sem regiões espúrias | todas |
| A14 | Imagens: logo `aria-hidden`; futuras com `alt` | DOM | 0 imagens sem `alt` | todas |
| A15 | Todo campo com rótulo lido pelo NVDA (rótulo + dica) | NVDA | 100 % | formulários |
| A16 | Erro: resumo lido ao aparecer; campo anuncia "inválido" + mensagem | NVDA | 100 % | formulários |
| A17 | Modal anunciado como diálogo com nome; fundo inerte | NVDA | Sim | modais |
| A18 | Links descritivos fora de contexto | NVDA Insert+F7 (links) | Nenhum "clique aqui" | todas |
| A19 | Botões com nome; estado busy/pressed lido | NVDA | Sim | botões |
| A20 | ARIA mínima e válida | axe `aria-*` | 0 violações | todas |
| A21 | Mensagens de status lidas sem mover o foco | NVDA | Toasts e "Carregando…" lidos | todas |
| A22 | Leitura completa da tela em modo navegação faz sentido | NVDA | Sem conteúdo órfão | 6 telas principais |
| A23 | Reduzir movimento respeitado | SO + preferência | Spinner/transições sem animação | todas |
| A24 | Título da aba muda a cada rota | Visual | "Tela · PEI Vivo" | todas |
| A25 | HTML válido | Validador W3C | 0 erros | index + DOM |
| A26 | Impressão do material | Ctrl+P | Só o material; blocos inteiros | material |

**Estado em 14/09/2026:** A1–A7, A12–A20, A24 verificados em jsdom/axe (automático) e por inspeção do código; A8 verificado numericamente; A9–A11, A21–A23, A25–A26 pendentes de sessão manual (P6.7).

---

## 4. Testes de compatibilidade (RNF-G)

| Navegador | Versão | `<dialog>` | `:has()` | `dvh` | Resultado |
|---|---|---|---|---|---|
| Chrome (Windows/Android) | ≥ 120 | ✅ | ✅ | ✅ | ⬜ |
| Firefox | ≥ 121 | ✅ | ✅ | ✅ | ⬜ |
| Safari (macOS/iOS) | ≥ 16.4 | ✅ | ✅ | ✅ | ⬜ |
| Edge | ≥ 120 | ✅ | ✅ | ✅ | ⬜ |

Fallbacks: sem `:has()` o cartão selecionado perde o realce de borda, mas o rádio nativo continua indicando seleção (informação não depende do realce); sem `dvh` a altura mínima usa `100vh` implícito.

---

## 5. Automação futura (plano)

| Card | Ferramenta | Conteúdo |
|---|---|---|
| P4.19 | Playwright 375×812 + `@axe-core/playwright` | Golden path dos 4 papéis contra o Supabase; axe com contraste real |
| P4.20 | Playwright | Caminhos negados na UI + chamada direta à API → 403 |
| P5.7 | Playwright `setOffline` | Material já visto abre offline |
| P5.9 | Playwright throttling "Slow 4G" | Geração < 60 s com IA |
| P6.7 | NVDA/VoiceOver manual | Checklist §3.2 completo |
