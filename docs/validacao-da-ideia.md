# PEI Vivo — Validação da ideia

**Versão:** 1.0 — 14/09/2026
**Etapas da orientação cobertas:** 1 (IA como agente), 2 (pré-projeto anexado), 3 (análise da solução).
**Fontes:** pré-projeto (`docs/tcc/TCC - Geandre & Jean.md`), mapeamento dos slides, `docs/requisitos.md`, questionário de validação (5 perguntas, Google Forms — link no pré-projeto), código em `packages/` e `supabase/`.

---

## 0. Análise do projeto existente (diagnóstico)

| Item | Situação encontrada em 14/09/2026 |
|---|---|
| Ideia, problema, público | Documentados no pré-projeto (§1–§5) e refinados por perfil em `docs/requisitos.md` (§2–§5) |
| Estrutura de front-end | **Inexistente.** Só `packages/motor-adaptacao` (regras puras) e `supabase/` (schema + RLS validados em PGlite) |
| Dependências | npm workspaces, TypeScript estrito, Vitest, PGlite, Supabase CLI |
| Requisitos | RF01–RF15, RNF01–RNF10, RN01–RN08, HU-* com critérios *Dado/Quando/Então*, decisões D-01…D-13, rastreabilidade iniciada |
| Protótipo / identidade visual | Nenhum. Plano previa Figma (P4.1) |
| Dados mockados | `supabase/seed.sql` fictício (cenário A) |
| Integrações | Nenhuma implementada; Edge Functions só planejadas (Fase 3) |
| Imagens/diagramas | Casos de uso, classes, sequência (SVG/PNG) |
| Orientação da disciplina | `docs/tcc/orientacao.jpeg` — 6 etapas: IA como agente → pré-projeto → documento de acessibilidade/WCAG/heurísticas → design UX/UI → protótipo front-end → prompt de design |

**Riscos técnicos identificados**

1. Fazer interface antes das Edge Functions contraria a ordem do `CLAUDE.md`. *Mitigação:* camada de serviços com contrato único (`PeiVivoApi`) e implementação mock que **aplica a matriz de permissões v2** (o mock nega o que o RLS negaria) — as telas nunca decidem permissão; testes negativos rodam desde já (D-17).
2. Dependência de IA para demonstrar valor. *Mitigação:* protótipo roda 100 % com IA desligada (RN06, RNF08); a camada determinística real (`adaptador.ts`) foi implementada e testada.
3. Sem Docker local. *Já tratado* (PGlite + CI).
4. Vulnerabilidades reportadas pelo `npm audit` em dependências de desenvolvimento (esbuild dev-server, vitest mocker, react-router). Não afetam o build de produção; acompanhar em P6.12.

**Suposições adotadas** (registradas como decisões em `docs/requisitos.md` §1): D-14 (um papel por usuário por estudante), D-15 (CSS com tokens em vez de Tailwind), D-16 (autenticação em modo demonstração), D-17 (camada de serviços mock com permissões), D-18 (`adaptador.ts` no motor antes da Fase 3).

---

## 1. Problema e solução

### 1.1 Problema central

O Plano Educacional Individualizado (PEI) é obrigatório por lei (LBI, art. 28), mas na prática é um **documento estático**: preenchido uma vez por período, arquivado, sem efeito sobre o material que o estudante recebe em sala.

### 1.2 Contexto

- 2,5 milhões de matrículas na Educação Especial (Censo Escolar 2025), +82 % vs. 2021; mais de 90 % em classes comuns.
- Apenas 11,3 % das equipes gestoras têm formação continuada em Educação Especial.
- A Lei 14.254/2021 **obriga** a articulação escola ↔ saúde para dislexia e TDAH — e não existe instrumento que a operacionalize.
- Escola, família e terapeuta se comunicam por WhatsApp: sem histórico, sem padronização, sem consentimento formal.
- Adaptar um texto manualmente leva ~40 minutos; com 30 alunos, não acontece.
- Ferramentas existentes (Prova Adaptada, Vínculoo, Frontline/Goalbook) adaptam por **categoria diagnóstica** ou só organizam o documento — nenhuma fecha o ciclo observação → validação → material → resultado.

### 1.3 Impactos para o usuário

| Quem | Impacto do problema hoje |
|---|---|
| Estudante com TEA, TDAH ou dislexia | Recebe o mesmo material da turma, ou uma adaptação genérica "modo dislexia" que ignora seu perfil |
| Docente regente | Sobrecarga: 31 alunos, 3 com laudo, sem tempo para adaptar; culpa e frustração |
| Responsável legal | Não sabe o que a escola faz; informação fragmentada; não tem controle sobre os dados do filho |
| Profissional de saúde | Suas estratégias não chegam à sala; só recebe relato, nunca resultado |
| Coordenação | Chega à reunião de PEI com documento em branco; recomeça do zero a cada troca de professor |

### 1.4 Solução digital proposta

Plataforma web (PWA, mobile-first) que liga os quatro perfis num **ciclo fechado**:

```
REGISTRAR ──► PARAMETRIZAR ──► ADAPTAR ──► RETROALIMENTAR ──┐
   ▲                                                       │
   └───────────────────────────────────────────────────────┘
```

1. **Observar** — docente, família e profissional registram, a cada 15 dias, seis dimensões numa escala de 3 pontos (nunca diagnóstico).
2. **Validar** — o motor determinístico converte observações em `ParametrosAdaptacao`; o profissional de saúde valida o conjunto do ciclo.
3. **Adaptar** — a docente cola um texto no celular e recebe material com blocos curtos, enunciados em etapa única e contraste reforçado; revisa lado a lado e aprova.
4. **Retroalimentar** — registra o desfecho; o resultado refina o perfil.

### 1.5 Proposta de valor

> "A professora cola o texto e recebe a versão que funciona **para aquele aluno** — em segundos, no celular, com a autorização da família e a validação da equipe de saúde. Depois marca se funcionou, e o plano aprende."

### 1.6 Diferenciais

| Diferencial | Como se materializa |
|---|---|
| Perfil **individual e evolutivo**, não categoria diagnóstica | `versoes_perfil` por ciclo; RN03 (assimetria conservadora) |
| Validação **clínica formal** dos parâmetros | RF06/RF07, RN05, RN07 — Lei 14.254/2021 |
| Permissão **no dado**, não na tela | RLS; docente nunca lê nota clínica (RN02); laudo não é armazenado (D-01) |
| Não é wrapper de IA | Camada determinística pura (`motor-adaptacao`), demonstrável com IA desligada |
| Revisão humana obrigatória | RN04; a IA nunca aprova |
| Consentimento granular e revogável, com auditoria | RN01, RN08, D-06; exportar/excluir (RF15) |

### 1.7 Benefícios esperados

- Tempo de adaptação: de ~40 min para < 1 min (meta: redução ≥ 80 %).
- Comunicação datada, estruturada e recuperável entre os três atores.
- Histórico do PEI com evidência para a reunião de bimestre.
- Legibilidade do material: ganho ≥ 15 pontos no índice Flesch PT-BR.
- Confiança no conteúdo (revisão obrigatória) e conformidade com LGPD.

---

## 2. Público-alvo e personas

### 2.1 Público-alvo

Escolas de ensino fundamental (rede pública e privada) com estudantes com TEA, TDAH ou dislexia em classes comuns, e a rede de apoio desses estudantes: docentes regentes, responsáveis legais, profissionais de saúde (TO, fono, psicopedagogo, psicólogo) e coordenação pedagógica. **Usuário decisivo:** a docente regente — se ela não usar, o sistema não existe (RNF01).

### 2.2 Persona principal — Márcia, docente regente

| Campo | Descrição |
|---|---|
| Nome fictício | Márcia Oliveira |
| Idade | 38 anos |
| Ocupação | Professora regente do 4º ano, rede municipal; 31 alunos, 3 com laudo |
| Contexto de uso | Planeja aula **em casa, à noite (domingo, 21h), no celular Android** de entrada, rede móvel instável. Na escola, computador compartilhado e lento |
| Objetivos | Preparar material que o Miguel consiga ler sozinho; cumprir o PEI sem virar madrugada; provar à coordenação que está fazendo |
| Dores | 40 min por adaptação manual; não sabe o que a terapeuta trabalha; não tem o laudo (e não quer ter — teme rotular); sente culpa |
| Necessidades | Colar texto → receber adaptado → revisar → aprovar em **poucos toques**; entender *por que* a adaptação saiu daquele jeito; registrar "funcionou" em 2 toques |
| Barreiras tecnológicas | Pouca paciência com cadastro longo; não instala app de loja; tela pequena; notificações irritam |
| Comportamento digital | WhatsApp, Google Sala de Aula, Canva. Usa o polegar; lê pouco texto de interface; abandona fluxo com mais de 4 telas |
| Necessidades de acessibilidade | Presbiopia inicial (aumenta fonte do celular); usa o celular com brilho baixo à noite — contraste importa; fadiga visual |

### 2.3 Personas secundárias

| Persona | Idade | Contexto | Objetivo | Dor | Acessibilidade |
|---|---|---|---|---|---|
| **Dona Rosa**, responsável legal | 45 | Trabalha o dia todo; acessa pelo celular à noite; baixa familiaridade digital | Entender e autorizar com clareza; ver se está dando certo; poder revogar | Medo de o filho ser rotulado; termos jurídicos incompreensíveis | Linguagem simples (WCAG 3.1.5); fonte grande; sem tempo limite |
| **Camila**, terapeuta ocupacional | 33 | Atende 2×/semana, vários pacientes, várias escolas; usa notebook e celular | Ver resultado real em sala; garantir coerência com a terapia; manter nota reservada | Escola não aplica o que ela orienta; relato ≠ evidência | Uso ocasional — precisa reconhecer, não memorizar (heurística 6) |
| **Coordenação** (Sr. Antônio) | 52 | Desktop na escola; muitos estudantes; responde legalmente pelo PEI | Chegar à reunião com histórico; fazer onboarding sem dor | Recomeça do zero na troca de professor; planilhas paralelas | Teclado e leitor de tela ocasional; tabelas navegáveis |
| **Miguel**, estudante (usuário indireto) | 9 | TEA nível 1, dificuldade de leitura, ama dinossauros | Ler o texto inteiro sozinho | Blocos longos, instruções compostas, luz forte | Material com contraste 7:1, blocos ≤ 4 linhas, etapa única (é o `ParametrosAdaptacao`) |

---

## 3. Hipóteses e validação

| # | Hipótese | Evidência necessária | Método de validação | Métrica | Critério de sucesso | Risco se falsa |
|---|---|---|---|---|---|---|
| H1 | A comunicação escola–família–saúde é percebida como informal e fragmentada | Concordância dos três perfis | Questionário de validação (Q1, escala 1–5), n ≥ 30 | Média de Q1 | ≥ 4,0 | Problema não sentido → baixa adoção |
| H2 | Um perfil operacional (sem diagnóstico) é suficiente para a docente adaptar | Docentes entendem os 6 parâmetros sem ver o laudo | Entrevista semiestruturada com 3–5 docentes (30 min) + teste com protótipo | % que explica corretamente 5 dos 6 parâmetros | ≥ 80 % | Docente exige laudo → conflito com RN02 |
| H3 | O fluxo gerar → revisar → aprovar cabe em < 60 s no celular | Tempo medido em tarefa real | Teste de usabilidade moderado (viewport 375 px), 5 docentes | Tempo mediano da tarefa T3 | ≤ 60 s; taxa de sucesso ≥ 80 % | RNF01/RNF02 não atendidos |
| H4 | O material gerado só pela camada determinística já é útil sem IA | Docente aprova ≥ 1 material sem editar | Teste com protótipo (IA desligada) | % de materiais aprovados sem edição | ≥ 60 % | Sistema depende da IA → risco §10 |
| H5 | Responsáveis entendem o termo de consentimento em linguagem simples | Reconto correto de "quem vê o quê" e "como revogo" | Teste de compreensão com 5 responsáveis (ler + explicar) | Acertos em 4 perguntas | ≥ 4/5 participantes acertam ≥ 3 | Consentimento não informado → LGPD |
| H6 | A validação por ciclo (não por material) é aceitável ao profissional de saúde | Profissional aprova o conjunto em ≤ 5 min e concorda com RN07 | Entrevista + tarefa T5 no protótipo | Tempo + concordância (Likert) | ≤ 5 min; ≥ 4/5 | Profissional quer validar material a material → gargalo |
| H7 | A interface é usável (satisfação) | SUS após uso | Escala SUS (10 itens) com docentes do piloto | Pontuação SUS | ≥ 68 (RNF01) | Abandono |
| H8 | A interface é acessível para leitor de tela e teclado | Zero violações A/AA e tarefas completáveis sem mouse | axe-core + Lighthouse + sessão manual NVDA + teclado (checklist em `docs/plano-de-testes.md` §3) | Violações; taxa de sucesso por teclado | 0 violações; 100 % das tarefas por teclado | RNF03 não atendido |
| H9 | Preocupações principais são privacidade e confiabilidade da IA | Distribuição de Q3 | Questionário (Q3, múltipla escolha) | % por preocupação | Identificadas as 2 maiores; endereçadas por RN02/RN04/RNF09 | Argumento de defesa fraco |
| H10 | Escolas se beneficiariam se a plataforma existisse | Intenção de adoção | Questionário (Q4) | Média de Q4 | ≥ 4,0 | Sem demanda |

### 3.1 Instrumentos

- **Questionário de validação** (já elaborado no pré-projeto): Bloco 0 (perfil) + Q1 percepção do problema, Q2 reação ao conceito, Q3 preocupações, Q4 intenção de adoção, Q5 aberta.
- **Roteiro de entrevista** (docentes e profissionais): rotina de adaptação hoje; o que precisa saber sobre o aluno; reação ao perfil sem diagnóstico; reação à validação por ciclo; o que faria abandonar.
- **Teste de usabilidade com protótipo** — tarefas, métricas e critério em `docs/plano-de-testes.md` §2.
- **Métricas de acessibilidade** — `docs/plano-de-testes.md` §3 e `docs/wcag-2.2.md`.

### 3.2 Métricas consolidadas (ligação com §11.2 do pré-projeto)

| Dimensão | Métrica | Meta |
|---|---|---|
| Sucesso | Taxa de conclusão das tarefas T1–T6 | ≥ 80 % |
| Eficiência | Tempo de T3 (gerar → aprovar); redução vs. manual | ≤ 60 s; ≥ 80 % |
| Satisfação | SUS | ≥ 68 |
| Acessibilidade | Violações axe A/AA; tarefas por teclado; NVDA | 0; 100 %; sem bloqueio |
| Legibilidade | Flesch PT-BR antes/depois | ≥ +15 |
| Segurança | Acessos indevidos bloqueados (testes negativos) | 100 % |

---

## 4. Estado da validação em 14/09/2026

| Hipótese | Estado | Evidência |
|---|---|---|
| H4 | **Parcialmente validada** em bancada | `adaptador.test.ts`: enunciados compostos divididos, blocos ≤ limite, nada se perde; material do cenário A legível |
| H8 | **Parcialmente validada** em bancada | 59 testes do app com axe-core: 0 violações em todas as telas (jsdom, sem contraste); contraste verificado numericamente (`docs/ux-ui.md` §3.2) |
| H1, H9, H10 | Instrumento pronto; coleta pendente | Questionário no pré-projeto |
| H2, H3, H5, H6, H7 | Pendentes — dependem do piloto (Fase 6) | Roteiros em `docs/plano-de-testes.md` |
