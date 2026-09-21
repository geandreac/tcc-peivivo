# Gestão de serviços — práticas inspiradas no ITIL

**Versão:** 1.0 — 21/09/2026 · **Pilar:** Governança e Serviços.
**Aviso:** o ITIL é usado como **referência de práticas** (catálogo, incidentes, requisições, base de conhecimento) adaptadas ao contexto de um TCC com dois desenvolvedores e um piloto acadêmico. Não há certificação nem alegação de conformidade formal.
**Contexto de operação:** até o piloto (Fase 6), o "serviço" é o protótipo publicado para demonstração; os "usuários" são a orientadora, a banca e os participantes do piloto (docentes, responsáveis, profissionais, coordenação), sempre com estudante **fictício**.

---

## 1. Catálogo de serviços

| Serviço | Público | Descrição | Canal de Acesso | Horário/Disponibilidade Esperada | Responsável |
|---|---|---|---|---|---|
| Acesso ao sistema | Todos os perfis | Abrir o PEI Vivo no navegador (celular ou desktop) | URL do protótipo (P6.2) / `npm run dev` local | 24×7 em melhor esforço; ambiente gratuito (Supabase pausa após 7 dias sem uso — ping semanal) | Geandre |
| Autenticação por perfil | Família, Professores, Equipe de saúde, Coordenação | Entrar pela porta do seu perfil; ver o que faz / vê / nunca vê | `/entrar` → `/entrar/<perfil>` | Idem | Geandre (P4.4: Supabase Auth) |
| Consulta de informações | Todos (conforme matriz v2) | Painel, estudante, perfil vigente, materiais aprovados, histórico, pendências | Menu *Meus estudantes*, *Pendências* | Idem | Jean (telas) |
| Registro de informações | Responsável, Docente, Profissional | Consentimento, observações, fechamento de ciclo, validação, nota clínica, desfecho | Telas por estudante | Idem | Jean (telas) / Geandre (regras) |
| Geração e aprovação de material | Docente | Colar texto → material adaptado → revisar → aprovar → imprimir | `/estudantes/:id/gerar` | Idem; geração < 60 s (RNF02) | Ambos |
| Visualização de acompanhamento | Responsável, Coordenação, Profissional | Histórico do PEI por ciclo, desfechos, trilha de auditoria | `/estudantes/:id/historico` | Idem | Jean |
| Cadastro e vínculos | Coordenação | Cadastrar estudante; convidar família; vincular/desativar docente e profissional | `/coordenacao/cadastrar`, `/estudantes/:id/vinculos` | Idem | Jean |
| Exportação / exclusão de dados (LGPD) | Responsável | JSON completo; exclusão em cascata com confirmação pelo nome | `/estudantes/:id/dados` | Idem | Geandre |
| Preferências de acessibilidade | Todos | Alto contraste, tamanho de fonte, redução de movimento; atalhos de teclado | `/acessibilidade` | Idem | Geandre |
| Suporte ao usuário | Todos | Ajuda na interface; guia de uso; canal de problemas | `/ajuda`, `docs/guia-de-uso-do-sistema.md`, issues do GitHub / e-mail da dupla | Resposta em 1 dia útil (piloto); 4 h em dia de demonstração | Ambos |
| Recuperação de acesso | Todos | Demo: nenhum (sem senha); real: "Esqueci a senha" (P4.4) | Tela de login / suporte | Automático (real); 1 dia útil via suporte (demo) | Geandre |
| Comunicação de falhas | Todos | Registrar erro, acesso negado indevido, problema de acessibilidade | Issue com rótulo `incidente` ou `acessibilidade`; e-mail | Triagem em 1 dia útil | Ambos |
| Restauração da demonstração | Banca, orientadora | Voltar os dados fictícios ao estado inicial; simular falha de rede | Ajuda → "Restaurar dados" / "Simular falha" | Imediato (autoatendimento) | — |

## 2. Gestão de incidentes

**Definição:** interrupção não planejada ou redução de qualidade de um serviço do catálogo. **Prioridade** = impacto × urgência: **P1** (bloqueia demonstração ou tarefa essencial de um perfil, ou expõe dado indevido), **P2** (degrada uma tarefa, há contorno), **P3** (cosmético ou de baixa frequência).

| Tipo de Incidente | Exemplo | Impacto | Prioridade | Ação Inicial | Responsável | Prazo Esperado |
|---|---|---|---|---|---|---|
| Usuário não consegue realizar login | Botão do perfil não responde; "Não foi possível entrar" persistente; (real) e-mail não reconhecido | Alto — nenhum serviço acessível | P1 | Verificar console/rede; testar em outro navegador; "Restaurar dados"; (real) checar Supabase Auth e rate limit | Geandre | Contorno em 4 h; correção em 1 dia útil |
| Dashboard não carrega | Painel fica em "Carregando…" ou mostra erro de rede | Alto | P1 | "Tentar novamente"; verificar se "Simular falha de rede" ficou ativo na Ajuda; verificar Supabase (pausa por inatividade) | Geandre | 4 h |
| Dados não aparecem | Estudante sem observações/materiais que deveriam existir | Médio | P2 | Conferir vínculo ativo e consentimento (RN01 explica ausência para docente/profissional); restaurar dados | Jean | 1 dia útil |
| Erro de formulário | Envio não aceita valor válido; erro sem mensagem; resumo não foca | Médio | P2 | Reproduzir com o teste de tela; corrigir validação; adicionar teste | Jean | 2 dias úteis |
| **Falha de acesso por perfil** | Docente vê nota clínica; responsável vê rascunho; papel errado consegue escrever | **Crítico — segurança/LGPD** | **P1** | Interromper demo/piloto; reproduzir em `mockApi.test.ts`/RLS; corrigir; registrar em `docs/seguranca-e-privacidade.md` §9 | Geandre | Imediato; correção antes de qualquer nova sessão |
| Problema de acessibilidade | Foco invisível; modal sem Esc; leitor de tela não anuncia erro; contraste abaixo de 4,5:1 | Alto para quem depende de TA | P1 se bloqueia tarefa; P2 se há contorno | Verificar com axe DevTools/NVDA; corrigir token/componente; teste de regressão | Geandre | 1 dia útil (P1) / 1 semana (P2) |
| Erro de navegação | Link leva a 404; "voltar" errado; rota protegida não redireciona | Médio | P2 | Conferir `routes/index.tsx`; teste em `paginas.test.tsx` | Jean | 2 dias úteis |
| Serviço indisponível | Supabase pausado; hospedagem fora do ar; CI vermelho bloqueando merge | Alto | P1 (em demo) / P2 | Rodar `npm run dev` local como contingência; reativar projeto; ver `gestao-de-riscos.md` R-10 | Geandre | 4 h |
| Perda de dados da demonstração | `localStorage` limpo; seed alterado | Baixo (fictício) | P3 | "Restaurar dados"; `supabase db reset` | — | Imediato |

**Fluxo:** registrar (issue com rótulo `incidente` + prioridade) → triagem (1 dia útil) → contorno → correção via `fix/<autor>-…` com teste de regressão → fechar issue citando o PR → se recorrente, entrada em §4.4.

**Registro obrigatório:** data/hora, perfil afetado, tela, passos, resultado esperado × obtido, navegador/dispositivo, captura (sem dado real). Em dia de demonstração, o registro pode ser feito depois; o contorno vem primeiro.

## 3. Gestão de requisições de serviço

| Requisição | Quem pode pedir | Como é tratada | Prazo | Responsável |
|---|---|---|---|---|
| Recuperação de acesso | Qualquer usuário | Demo: sem senha — o usuário escolhe o perfil novamente; se o perfil sumiu, "Restaurar dados". Real (P4.4): "Esqueci a senha" automático; se o e-mail mudou, coordenação solicita à dupla, que atualiza via painel do Supabase após confirmar identidade | Imediato / 1 dia útil | Geandre |
| Atualização de informações | Coordenação (dados do estudante, vínculos); Responsável (escopos do consentimento) | Pela própria interface (cadastro, vínculos, consentimento). Campos sem tela de edição (ex.: nome do estudante) → issue `requisicao`; correção pela coordenação no banco com registro de auditoria | Interface: imediato; via dupla: 2 dias úteis | Jean / Geandre |
| Solicitação de suporte | Qualquer usuário | Ajuda → guia → issue/e-mail; triagem classifica como incidente, requisição ou melhoria | Resposta em 1 dia útil | Ambos |
| Sugestão de melhoria | Qualquer usuário, orientadora, banca | Issue `melhoria`; avaliada no checkpoint semanal; entra no backlog com prioridade MoSCoW; resposta ao solicitante com decisão | Decisão em 1 semana | Ambos |
| Solicitação de correção de dados | Responsável (LGPD art. 18) | Pela interface (observação nova, revogação, exclusão); correção de registro histórico não tem tela → issue `requisicao` com evidência; correção registrada na auditoria | 5 dias úteis (piloto) | Geandre |
| Exportação / exclusão de dados | Responsável | Autoatendimento em `/estudantes/:id/dados` | Imediato | — |
| Novo vínculo / troca de professor | Coordenação | Autoatendimento em `/estudantes/:id/vinculos` (D-13/D-14) | Imediato | — |
| Acesso de avaliador (banca) | Orientadora | Roteiro em `docs/guia-de-uso-do-sistema.md`; perfis fictícios já disponíveis; sem cadastro | Imediato | — |

## 4. Base de conhecimento e suporte

### 4.1 Página de ajuda (na interface)

`/ajuda` — o que é o PEI Vivo, quem faz o quê, o fluxo em 60 s, por que a professora não vê o laudo, o que a IA pode ou não fazer, ferramentas da demonstração. Acessível de todas as telas (menu e rodapé — WCAG 3.2.6).

### 4.2 Perguntas frequentes (a incorporar na Ajuda no P4.18)

| Pergunta | Resposta curta |
|---|---|
| Não vejo o estudante no meu painel | Quem cria vínculos é a coordenação; peça o vínculo. Docente e profissional também precisam do consentimento ativo da família para ver os dados (RN01). |
| Aparece "Aguardando consentimento" e não consigo gerar material | Só o responsável concede o consentimento. Sem ele, nada é registrado nem gerado (RN01). |
| Por que não vejo a nota clínica? | É reservada ao profissional de saúde vinculado (RN02). Ninguém mais lê, nem a coordenação. |
| Por que a professora não vê o laudo? | O sistema não guarda laudo nem diagnóstico (D-01); só a data em que foi apresentado, visível à coordenação, à família e ao profissional. |
| Fechei o ciclo e o parâmetro não subiu | Elevar exige dois ciclos consecutivos "ampliada" (RN03); a tabela mostra "Aguardando 2º ciclo". Reduzir é imediato. |
| A validação "expirou" | Sem resposta do profissional em 7 dias, valem os parâmetros anteriores (RN05). Ele ainda pode validar o próximo ciclo. |
| O material some para a família | Rascunhos são privados da docente; só o APROVADO aparece para os demais (RN04). |
| Quero letras maiores / mais contraste | `/acessibilidade`: fonte 19 ou 22 px, alto contraste, sem animações. O zoom do navegador (Ctrl +) também funciona até 400 %. |
| Como imprimo o material? | Na tela do material, "Imprimir" ou Ctrl+P: sai só o material, sem menus. |
| Como saio? | Botão "Sair" no canto superior direito. |
| Perdi a senha (login real) | "Esqueci a senha" na tela de login; o link vale 1 h. |

### 4.3 Guia de uso

`docs/guia-de-uso-do-sistema.md` (não técnico, por perfil) e `docs/guia-de-uso.md` (técnico: instalar, rodar, ciclo completo, caminhos negados).

### 4.4 Canal para registrar problemas e procedimento de triagem

| Passo | Ação | Prazo |
|---|---|---|
| 1 | Usuário abre issue em <https://github.com/geandreac/tcc-peivivo/issues> (ou envia e-mail à dupla, que abre a issue) — **sem dado real de estudante** | — |
| 2 | Triagem: rótulo `incidente` / `requisicao` / `melhoria` / `acessibilidade` + prioridade P1–P3 + responsável | 1 dia útil |
| 3 | P1: contorno imediato e correção em `fix/`; P2: próximo checkpoint; P3: backlog | conforme §2 |
| 4 | Resposta ao solicitante na issue; fechamento com link do PR | ao concluir |
| 5 | Se o mesmo problema ocorre ≥ 2 vezes ou afeta ≥ 2 usuários → entra em §4.5 | — |

Rótulos a criar no repositório: `incidente`, `requisicao`, `melhoria`, `acessibilidade`, `p1`, `p2`, `p3` (além de `fase:*` e `frente:*` de `scripts/criar-kanban.sh`).

### 4.5 Registro de problemas recorrentes (gestão de problemas)

| ID | Problema | Causa raiz | Solução definitiva | Estado |
|---|---|---|---|---|
| PR-01 | Erro ao sair da conta (`JSON.parse("undefined")`) | Clone do mock não tolerava retorno `undefined` | `clonar` tolera `undefined`; coberto por testes | ✅ corrigido (heurística 5, sev. 4) |
| PR-02 | Docente confuso com "Não foi possível carregar" ao abrir nota clínica por URL | Erro NEGADO tratado como falha genérica | Alerta "Acesso negado (RN02)" com motivo e saída | ✅ corrigido (heurística 9, sev. 3) |
| PR-03 | Avaliador não sabe qual perfil escolher na tela Entrar | Perfis sem descrição do que demonstram | Porta por perfil com "o que faz / vê / nunca vê" + descrição de cada perfil de demonstração | ✅ corrigido (D-16 rev.) |
| PR-04 | Supabase gratuito pausa após 7 dias e a demo falha | Política do plano gratuito | Ping bi-semanal no CI (`manter-supabase-ativo.yml`) + teste 48 h antes da demo + `npm run dev` local como contingência | 🟡 workflow pronto; secrets pendentes (P0.4) |
| PR-05 | Ferramentas automáticas não detectam barreiras de leitura de tela | Limite das ferramentas (~30–40 %) | Sessão NVDA obrigatória por marco (P6.7) | ⬜ planejado |

## 5. Níveis de suporte

| Nível | Quem | Escopo |
|---|---|---|
| 0 — Autoatendimento | Usuário | Ajuda, Acessibilidade, guia, "Restaurar dados", "Tentar novamente" |
| 1 — Coordenação da escola (piloto) | Coordenação pedagógica | Vínculos, convites, dúvidas de fluxo |
| 2 — Dupla | Geandre (acesso, permissões, dados, acessibilidade) / Jean (telas, formulários, navegação) | Incidentes e requisições |
| 3 — Fornecedor | Supabase / GitHub | Indisponibilidade de plataforma (sem SLA no plano gratuito) |

## 6. Ligações

- Indicadores de suporte (nº de incidentes, tempo de resolução): `docs/cobit-governanca.md` §2.
- Riscos operacionais (indisponibilidade, dependências externas): `docs/gestao-de-riscos.md` R-10, R-14.
- Tratamento de incidente de privacidade: `docs/seguranca-e-privacidade.md` §9.
