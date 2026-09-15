# PEI Vivo — Avaliação heurística (Nielsen)

**Versão:** 1.0 — 14/09/2026
**Etapa da orientação:** 3 (pilar *Heurísticas de usabilidade*).
**Objeto avaliado:** protótipo funcional `apps/web` (19 telas, dados fictícios, IA desligada), percorrido nos quatro perfis em desktop (1568 px) e, por análise de CSS, em 375 px.
**Avaliadores:** equipe do projeto (avaliação de especialista, 1 rodada). Uma segunda rodada com 2 avaliadores externos está prevista no piloto (P4.2).
**Escala de severidade:** 0 não é problema · 1 cosmético · 2 baixa prioridade · 3 relevante (corrigir antes do piloto) · 4 crítico (bloqueia a tarefa).
**Regra adotada (orientação §6):** severidade 3 e 4 corrigidas no código; severidade 2 corrigidas quando viáveis; as demais registradas com justificativa.

---

## 1. Resultados por heurística

| # | Heurística | Evidência na interface | Problema ou risco | Recomendação | Sev. | Status |
|---|---|---|---|---|---|---|
| 1 | Visibilidade do status do sistema | Badges de consentimento/validação/aprovação em todas as listas; `Carregando…` com `role=status`; botões com "Salvando…"; toast + `aria-live` após cada ação; progresso textual na geração; "Gerado em 0,3 s" | Toast some em 6 s; quem não viu perde o feedback visual (a informação permanece na tela, mas em outro lugar) | Manter 6 s (2.2.1 atendido porque a informação é redundante); considerar histórico de avisos no rodapé | 1 | Aceito |
| 1 | — | Link "Pendências" no menu | Não mostra **quantas** pendências há; o profissional precisa entrar para saber | Badge numérico no item de menu (`aria-label="Pendências, 2"`) | 2 | Aberto (Could, P4.18) |
| 1 | — | Painel do docente | Estudante B aparecia com botão "Gerar material" mesmo bloqueado por RN01 — o status "Aguardando consentimento" contradizia a ação oferecida | Ocultar a ação principal quando não há consentimento; manter badge explicativo | 3 | **Corrigido** (`Painel.tsx`) |
| 2 | Compatibilidade com o mundo real | Escala REDUZIDA/ESTÁVEL/AMPLIADA traduzida por dimensão ("Cansa mais rápido que antes"); termo de consentimento em 5 perguntas humanas; "Domingo, 21h" como cenário de projeto | Códigos internos (RN01, D-12) aparecem entre parênteses em alguns textos — úteis para a banca, ruído para a docente | Em produção, mover os códigos para um "Saiba mais" ou removê-los; manter no modo demonstração | 1 | Aceito (decisão de demonstração) |
| 2 | — | Nomes de parâmetro na tabela de diff | "maxLinhasPorBloco" seria incompreensível | Já traduzido por `utils/rotulos.ts` ("Linhas por bloco — tamanho máximo de cada trecho de leitura") | 0 | — |
| 3 | Controle e liberdade do usuário | "Decidir depois" na revisão; "Cancelar" em todos os formulários; "Voltar para …" em toda tela de estudante; Esc fecha modais e devolve o foco; revogação pode ser desfeita por nova concessão | Aprovar material é um toque só, sem confirmação e sem "desaprovar" | Manter um toque (HU-D.04 pede fluxo curto; a auditoria registra) mas permitir gerar nova versão a partir do mesmo texto — o cache por hash impede: precisa de "gerar novamente" que ignore o cache | 2 | Aberto (Fase 4, junto com `supabaseApi`) |
| 3 | — | Tela *Entrar* | Sem "voltar" explícito, mas o menu e a logo levam ao início | — | 0 | — |
| 4 | Consistência e padrões | Um `Layout`; tokens únicos; mesmos nomes para as mesmas ações; botão primário sempre à esquerda; perigo sempre vermelho com confirmação; cabeçalho de estudante idêntico em 12 telas | A tela *Estudante* usa cards de ação e o *Painel* usa lista com um botão — dois padrões para "o que posso fazer" | Aceitável: painel = visão geral (1 ação), estudante = todas as ações. Documentado em `docs/ux-ui.md` | 1 | Aceito |
| 4 | — | `Card` como `<section aria-label>` | Cada card virava uma *region* para leitores de tela (dezenas por página) — inconsistente com a estrutura de landmarks | `section` sem nome acessível (não é landmark); título via `h2/h3` | 3 | **Corrigido** (`Feedback.tsx`) |
| 5 | Prevenção de erros | Ações irreversíveis em modal; exclusão exige nome exato; revogação exige checkbox; contador de caracteres ao vivo na geração; evidência sem escala é detectada; botão "Adaptar" só aparece com perfil vigente | Fechar ciclo **sem observações** criava uma versão idêntica à vigente (ruído no histórico e na fila do profissional) | Desabilitar o botão e explicar com alerta + link para observar; o mock também recusa (`CONFLITO`) | 3 | **Corrigido** (`FecharCiclo.tsx`, `mockApi.ts`) |
| 5 | — | `sair()` / `desativarVinculo()` | Chamadas sem retorno quebravam o clone do mock (`JSON.parse("undefined")`) → erro ao sair da conta | Clone tolera `undefined` | 4 | **Corrigido** (`mockApi.ts`), coberto por 34 testes |
| 6 | Reconhecimento em vez de memorização | Perfil vigente resumido na tela de geração; observações já registradas listadas na tela de observar; diff vigente → proposto; pergunta-guia por dimensão; texto de exemplo com um toque | Na validação, o profissional precisa lembrar o que significa "EXPIRADA" | Rótulo já diz "Expirada (7 dias sem validação)" + alerta explicando RN05 | 0 | — |
| 6 | — | Tela *Entrar* | Seis perfis sem explicar o que cada um demonstra — o avaliador da banca não saberia por onde começar | Descrição por perfil ("para demonstrar o que um perfil sem acesso NÃO vê") | 3 | **Corrigido** (`Entrar.tsx`) |
| 7 | Flexibilidade e eficiência | Fluxo docente gerar → revisar → aprovar em 3 telas; "Usar texto de exemplo"; desfecho em 2 toques; painel leva direto à ação principal do papel; preferências de acessibilidade persistem | Não há atalho para "gerar outro material para o mesmo estudante" a partir da tela de material | Adicionar link "Gerar outro" na tela *Material* | 2 | **Corrigido** parcialmente: link "Gerar material" após fechar ciclo; pendente na tela *Material* (Could) |
| 8 | Design estético e minimalista | Uma ação primária por tela; metadados em `.meta`; sem ícones decorativos; sem imagens; cores só semânticas | Tela *Estudante* fica longa no celular (ações + perfil + materiais) | Aceitável no MVP: ordem por prioridade (ações primeiro). Evoluir para acordeão do perfil vigente em 375 px | 2 | Aberto (P4.16) |
| 8 | — | Card "Como funciona o acesso" no painel | Repetido a cada visita | Torná-lo dispensável (`localStorage`) | 1 | Aberto |
| 9 | Reconhecer, diagnosticar e recuperar erros | `mensagemAmigavel` por código; resumo de erros focável com links; "Tentar novamente" em toda falha de carregamento; falha de rede simulável na Ajuda; página 404 com saídas | Docente que abria `/notas-clinicas` por URL recebia "Não foi possível carregar" genérico — não explicava que é uma restrição de papel, não uma falha | Alerta específico "Acesso negado (RN02)" com explicação e link de volta | 3 | **Corrigido** (`NotasClinicas.tsx`) |
| 9 | — | Material não encontrado (rascunho para responsável) | Mensagem poderia sugerir que houve erro | Texto explica: "Rascunhos só aparecem para a docente que os criou" | 2 | **Corrigido** (`MaterialFinal.tsx`) |
| 10 | Ajuda e documentação | Página *Ajuda* (o que é, quem faz o quê, fluxo em 60 s, por que sem laudo, IA); dica em todo campo; página *Acessibilidade* com atalhos; rodapé com links | Ajuda não é contextual (não há "?" na tela de fechar ciclo explicando RN03) | RN03 explicada em texto na própria tabela e no rodapé do card; evoluir para `<details>` contextual | 2 | Aceito no MVP |

---

## 2. Consolidação

| Severidade | Encontrados | Corrigidos | Abertos / aceitos |
|---|---|---|---|
| 4 | 1 | 1 | 0 |
| 3 | 5 | 5 | 0 |
| 2 | 7 | 2 | 5 (todos com destino no plano) |
| 1 | 4 | 0 | 4 (aceitos com justificativa) |

**Nenhum problema de severidade 3 ou 4 permanece aberto.** Os itens de severidade 2 abertos estão vinculados a cards do plano (P4.16, P4.18, Fase 4 `supabaseApi`) ou classificados como *Could* em `docs/requisitos.md` §11.3.

## 3. Próxima rodada

- 2 avaliadores externos (uma docente, um profissional de UX) com o mesmo formulário, em 375 px real (celular), antes do piloto (P4.2).
- Critério de aprovação: nenhum item novo de severidade ≥ 3; média de severidade dos novos itens ≤ 1,5.
