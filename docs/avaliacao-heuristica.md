# PEI Vivo — Avaliação heurística (Nielsen)

**Versão:** 1.1 — 21/09/2026 (rodada 1 em 14/09/2026; rodada 2 em 21/09/2026 sobre as telas de login por perfil, sessão e navegação — §1.1). Coluna "Ação aplicada" acrescentada (formato da disciplina).
**Etapa da orientação:** 3 (pilar *Heurísticas de usabilidade*).
**Objeto avaliado:** protótipo funcional `apps/web` (22 telas, dados fictícios, IA desligada), percorrido nos quatro perfis em desktop (1568 px) e, por análise de CSS, em 375 px.
**Avaliadores:** equipe do projeto (avaliação de especialista, 2 rodadas). Uma rodada com 2 avaliadores externos está prevista no piloto (P4.2).
**Escala de severidade:** 0 não é problema · 1 cosmético · 2 baixa prioridade · 3 relevante (corrigir antes do piloto) · 4 crítico (bloqueia a tarefa).
**Regra adotada (orientação §6):** severidade 3 e 4 corrigidas no código; severidade 2 corrigidas quando viáveis; as demais registradas com justificativa.

---

## 1. Resultados por heurística

| # | Heurística | Evidência na interface | Problema ou risco | Recomendação | Sev. | Ação aplicada | Status |
|---|---|---|---|---|---|---|---|
| 1 | Visibilidade do status do sistema | Badges de consentimento/validação/aprovação em todas as listas; `Carregando…` com `role=status`; botões com "Salvando…"; toast + `aria-live` após cada ação; progresso textual na geração; "Gerado em 0,3 s" | Toast some em 6 s; quem não viu perde o feedback visual (a informação permanece na tela, mas em outro lugar) | Manter 6 s (2.2.1 atendido porque a informação é redundante); considerar histórico de avisos no rodapé | 1 | Nenhuma (justificado) | Aceito |
| 1 | — | Link "Pendências" no menu | Não mostra **quantas** pendências há; o profissional precisa entrar para saber | Badge numérico no item de menu (`aria-label="Pendências, 2"`) | 2 | Registrado no backlog | Aberto (Could, P4.18) |
| 1 | — | Painel do docente | Estudante B aparecia com botão "Gerar material" mesmo bloqueado por RN01 — o status "Aguardando consentimento" contradizia a ação oferecida | Ocultar a ação principal quando não há consentimento; manter badge explicativo | 3 | Correção em `Painel.tsx` | **Corrigido** (`Painel.tsx`) |
| 2 | Compatibilidade com o mundo real | Escala REDUZIDA/ESTÁVEL/AMPLIADA traduzida por dimensão ("Cansa mais rápido que antes"); termo de consentimento em 5 perguntas humanas; "Domingo, 21h" como cenário de projeto | Códigos internos (RN01, D-12) aparecem entre parênteses em alguns textos — úteis para a banca, ruído para a docente | Em produção, mover os códigos para um "Saiba mais" ou removê-los; manter no modo demonstração | 1 | Nenhuma (justificado) | Aceito (decisão de demonstração) |
| 2 | — | Nomes de parâmetro na tabela de diff | "maxLinhasPorBloco" seria incompreensível | Já traduzido por `utils/rotulos.ts` ("Linhas por bloco — tamanho máximo de cada trecho de leitura") | 0 | — | — |
| 3 | Controle e liberdade do usuário | "Decidir depois" na revisão; "Cancelar" em todos os formulários; "Voltar para …" em toda tela de estudante; Esc fecha modais e devolve o foco; revogação pode ser desfeita por nova concessão | Aprovar material é um toque só, sem confirmação e sem "desaprovar" | Manter um toque (HU-D.04 pede fluxo curto; a auditoria registra) mas permitir gerar nova versão a partir do mesmo texto — o cache por hash impede: precisa de "gerar novamente" que ignore o cache | 2 | Registrado no backlog | Aberto (Fase 4, junto com `supabaseApi`) |
| 3 | — | Tela *Entrar* | Sem "voltar" explícito, mas o menu e a logo levam ao início | — | 0 | — | — |
| 4 | Consistência e padrões | Um `Layout`; tokens únicos; mesmos nomes para as mesmas ações; botão primário sempre à esquerda; perigo sempre vermelho com confirmação; cabeçalho de estudante idêntico em 12 telas | A tela *Estudante* usa cards de ação e o *Painel* usa lista com um botão — dois padrões para "o que posso fazer" | Aceitável: painel = visão geral (1 ação), estudante = todas as ações. Documentado em `docs/ux-ui.md` | 1 | Nenhuma (justificado) | Aceito |
| 4 | — | `Card` como `<section aria-label>` | Cada card virava uma *region* para leitores de tela (dezenas por página) — inconsistente com a estrutura de landmarks | `section` sem nome acessível (não é landmark); título via `h2/h3` | 3 | Correção em `Feedback.tsx` | **Corrigido** (`Feedback.tsx`) |
| 5 | Prevenção de erros | Ações irreversíveis em modal; exclusão exige nome exato; revogação exige checkbox; contador de caracteres ao vivo na geração; evidência sem escala é detectada; botão "Adaptar" só aparece com perfil vigente | Fechar ciclo **sem observações** criava uma versão idêntica à vigente (ruído no histórico e na fila do profissional) | Desabilitar o botão e explicar com alerta + link para observar; o mock também recusa (`CONFLITO`) | 3 | Correção em `FecharCiclo.tsx`, `mockApi.ts` | **Corrigido** (`FecharCiclo.tsx`, `mockApi.ts`) |
| 5 | — | `sair()` / `desativarVinculo()` | Chamadas sem retorno quebravam o clone do mock (`JSON.parse("undefined")`) → erro ao sair da conta | Clone tolera `undefined` | 4 | Correção em `mockApi.ts` | **Corrigido** (`mockApi.ts`), coberto por 34 testes |
| 6 | Reconhecimento em vez de memorização | Perfil vigente resumido na tela de geração; observações já registradas listadas na tela de observar; diff vigente → proposto; pergunta-guia por dimensão; texto de exemplo com um toque | Na validação, o profissional precisa lembrar o que significa "EXPIRADA" | Rótulo já diz "Expirada (7 dias sem validação)" + alerta explicando RN05 | 0 | — | — |
| 6 | — | Tela *Entrar* | Seis perfis sem explicar o que cada um demonstra — o avaliador da banca não saberia por onde começar | Descrição por perfil ("para demonstrar o que um perfil sem acesso NÃO vê") | 3 | Correção em `Entrar.tsx` | **Corrigido** (`Entrar.tsx`) |
| 7 | Flexibilidade e eficiência | Fluxo docente gerar → revisar → aprovar em 3 telas; "Usar texto de exemplo"; desfecho em 2 toques; painel leva direto à ação principal do papel; preferências de acessibilidade persistem | Não há atalho para "gerar outro material para o mesmo estudante" a partir da tela de material | Adicionar link "Gerar outro" na tela *Material* | 2 | Link "Gerar material" após fechar ciclo (`FecharCiclo.tsx`); tela *Material* pendente | **Corrigido** parcialmente: link "Gerar material" após fechar ciclo; pendente na tela *Material* (Could) |
| 8 | Design estético e minimalista | Uma ação primária por tela; metadados em `.meta`; sem ícones decorativos; sem imagens; cores só semânticas | Tela *Estudante* fica longa no celular (ações + perfil + materiais) | Aceitável no MVP: ordem por prioridade (ações primeiro). Evoluir para acordeão do perfil vigente em 375 px | 2 | Registrado no backlog | Aberto (P4.16) |
| 8 | — | Card "Como funciona o acesso" no painel | Repetido a cada visita | Torná-lo dispensável (`localStorage`) | 1 | Registrado no backlog | Aberto |
| 9 | Reconhecer, diagnosticar e recuperar erros | `mensagemAmigavel` por código; resumo de erros focável com links; "Tentar novamente" em toda falha de carregamento; falha de rede simulável na Ajuda; página 404 com saídas | Docente que abria `/notas-clinicas` por URL recebia "Não foi possível carregar" genérico — não explicava que é uma restrição de papel, não uma falha | Alerta específico "Acesso negado (RN02)" com explicação e link de volta | 3 | Correção em `NotasClinicas.tsx` | **Corrigido** (`NotasClinicas.tsx`) |
| 9 | — | Material não encontrado (rascunho para responsável) | Mensagem poderia sugerir que houve erro | Texto explica: "Rascunhos só aparecem para a docente que os criou" | 2 | Correção em `MaterialFinal.tsx` | **Corrigido** (`MaterialFinal.tsx`) |
| 10 | Ajuda e documentação | Página *Ajuda* (o que é, quem faz o quê, fluxo em 60 s, por que sem laudo, IA); dica em todo campo; página *Acessibilidade* com atalhos; rodapé com links | Ajuda não é contextual (não há "?" na tela de fechar ciclo explicando RN03) | RN03 explicada em texto na própria tabela e no rodapé do card; evoluir para `<details>` contextual | 2 | Nenhuma (justificado) | Aceito no MVP |

### 1.1 Rodada 2 (21/09/2026) — login por perfil, sessão, navegação e erro

Escopo: `/entrar`, `/entrar/{familia,docente,saude,coordenacao}`, cabeçalho/`Sair`, `RotaProtegida`, 404, tratamento de falha de autenticação. Percorrido nos quatro perfis com teclado; testes em `autenticacao.test.tsx`.

| # | Heurística | Evidência na interface | Problema ou risco | Recomendação | Sev. | Ação aplicada | Status |
|---|---|---|---|---|---|---|---|
| 1 | Visibilidade do status | Toast + `aria-live` "Você entrou como Rosa (Família)"; cabeçalho mostra nome e papel institucional; "Sair" anuncia "Você saiu da sua conta" | — | — | 0 | Teste automatizado (`sair encerra a sessão…`) | — |
| 2 | Mundo real | Portas nomeadas na linguagem do usuário ("Família", "Professores", "Equipe de saúde"), não pelos enums (`RESPONSAVEL`, `DOCENTE`); cada porta diz "o que você faz / vê / nunca vê" | Rótulo da porta de saúde ("Equipe de saúde") difere do termo do enunciado da disciplina ("Terapeutas") | Manter: o público inclui TO, fono, psicopedagogo e psicólogo — "terapeuta" seria restritivo; a descrição da porta lista as profissões | 0 | Nenhuma (justificado) | — |
| 3 | Controle e liberdade | "← Todos os perfis" e "Escolher outro perfil" na tela de login; rota de origem preservada após login; "Sair" em todas as telas | Ao tocar em "Sair" com um formulário preenchido (ex.: texto colado em *Gerar material*), o conteúdo é perdido sem aviso | Confirmar a saída quando houver alteração não salva (`useBlocker` do router ou estado "sujo" no formulário) | 2 | Registrado no backlog (Could) | Aberto |
| 4 | Consistência | Porta = `<a>` (navegação); perfil de demonstração = `<button>` (ação) — mesma aparência `.perfil`, semântica correta; menu idêntico logado/deslogado (muda só o conteúdo) | — | — | 0 | — | — |
| 5 | Prevenção de erros | Botões de perfil desabilitados durante a autenticação (`mutacao.ocupado`); slug inválido → 404 | — | — | 0 | — | — |
| 6 | Reconhecimento | Cada perfil de demonstração diz o que demonstra ("Docente SEM vínculo: demonstra o painel vazio e o acesso negado por URL") | — | — | 0 | — | — |
| 7 | Flexibilidade | Login em 2 toques; rota profunda (`/estudantes/:id/consentimento`) volta ao destino após o login | Não há como ir direto de uma porta a outra sem passar por `/entrar` (2 toques extras para a banca que alterna perfis) | Aceitável; alternativa: "Trocar de perfil" no menu da sessão que já abre `/entrar` | 1 | Nenhuma (justificado) | Aceito |
| 8 | Minimalismo | Login por perfil tem 3 cards + grupo de botões; tudo pertinente à decisão de entrar | Em 375 px a tela de login por perfil fica longa (especificação antes dos botões) | Manter a ordem (a especificação é o objetivo da tela D-16); considerar `<details>` para "Como será o acesso real" | 1 | Nenhuma (justificado) | Aceito |
| 9 | Recuperar erros | Falha de autenticação → `Alerta tom="erro" vivo` "Não foi possível entrar. Tente novamente."; usuário permanece na tela; `/entrar/xyz` → 404 com saídas | — | — | 0 | Teste automatizado (`falha na autenticação…`) | — |
| 10 | Ajuda | Cada porta explica o papel; link "ajuda" na tela *Entrar* para quem "ainda não tem acesso" | A Ajuda não responde "não vejo o estudante no meu painel" (dúvida mais provável de docente/profissional sem vínculo ou sem consentimento) | Incorporar as perguntas frequentes de `docs/itil-servicos.md` §4.2 na tela *Ajuda* | 2 | Registrado (P4.18) | Aberto |

**Resultado da rodada 2:** nenhum problema de severidade 3 ou 4; 2 itens de severidade 2 registrados no backlog; 2 de severidade 1 aceitos com justificativa. A separação por perfil (tela própria, linguagem própria, redirecionamento, logout, controle de acesso e estados) foi verificada e está coberta por 7 testes automatizados.

---

## 2. Consolidação (rodadas 1 + 2)

| Severidade | Encontrados | Corrigidos | Abertos / aceitos |
|---|---|---|---|
| 4 | 1 | 1 | 0 |
| 3 | 5 | 5 | 0 |
| 2 | 9 | 2 | 7 (todos com destino no plano ou Could) |
| 1 | 6 | 0 | 6 (aceitos com justificativa) |

**Nenhum problema de severidade 3 ou 4 permanece aberto.** Os itens de severidade 2 abertos estão vinculados a cards do plano (P4.16, P4.18, Fase 4 `supabaseApi`) ou classificados como *Could* em `docs/requisitos.md` §11.3. Regra da disciplina (corrigir obrigatoriamente 3 e 4) atendida.

## 3. Próxima rodada

- 2 avaliadores externos (uma docente, um profissional de UX) com o mesmo formulário, em 375 px real (celular), antes do piloto (P4.2).
- Critério de aprovação: nenhum item novo de severidade ≥ 3; média de severidade dos novos itens ≤ 1,5.
