# PEI Vivo — Plano de testes

**Versão:** 1.1 — 21/09/2026 (1.0 em 14/09/2026). Mudanças: §0 (estrutura formal do plano), TF-41…TF-47 (login por perfil, logout, origem, falha de autenticação), §1.1 (testes de integração), ferramentas e evidências.
**Escopo:** protótipo `apps/web` + `packages/motor-adaptacao`. Testes de RLS/Edge Functions seguem em `docs/plano-desenvolvimento.md` (P1.11–P1.19, P3.x).
**Automatizado hoje:** 30 testes do motor (`packages/motor-adaptacao/src/*.test.ts`) e 68 do app (`apps/web/src/**/*.test.tsx`, incluindo `autenticacao.test.tsx`), com axe-core em todas as telas. Comando: `npm test`.

---

## 0. Plano

### 0.1 Objetivo

Verificar que o PEI Vivo (a) executa o ciclo observar → validar → adaptar → retroalimentar para os quatro perfis; (b) **nega** todo acesso que a matriz de permissões v2 nega, mesmo por URL direta; (c) é operável por teclado e leitor de tela e atende WCAG 2.2 AA; (d) é utilizável por uma docente no celular em menos de 60 s para a tarefa central (gerar → aprovar). Evidências servem à banca e à Fase 6 (piloto).

### 0.2 Escopo e itens testados

| Item | O que é testado |
|---|---|
| Autenticação e sessão (D-16) | Porta de entrada, login por perfil (família, professores, equipe de saúde, coordenação), redirecionamento, logout, falha de autenticação, 404 |
| Controle de acesso (RF14, RN01–RN08) | 34 cenários negativos na camada de serviços + caminhos negados na interface |
| Fluxos por perfil | Responsável (consentimento, LGPD), docente (observar, fechar ciclo, gerar, revisar, aprovar, desfecho), profissional (validar, notas), coordenação (cadastrar, vincular, histórico, pendências) |
| Motor de adaptação | Regras (RN03), ciclos, âncora, adaptador determinístico |
| Componentes | Rótulos, erros, teclado, modal, material adaptado |
| Estados de interface | Carregando, vazio, sucesso, erro, negado |
| Acessibilidade | axe-core (auto) + checklist manual §3 |
| Usabilidade | Roteiro §2 com participantes |
| Compatibilidade | Navegadores §4 |
| Migrations | `npm run db:validar` (PGlite) e job `db` (Supabase real) |

### 0.3 Fora do escopo (nesta versão)

- Testes de carga/estresse (RNF10 é arquitetural; sem ambiente publicado).
- Testes de segurança ofensivos (pentest) — o modelo de ameaças está em `docs/seguranca-e-privacidade.md`.
- Camada de IA (RF10, Fase 5) e modo offline (P5.6/P5.7).
- Login real por e-mail/senha, recuperação de senha e expiração de sessão (P4.4) — **planejados**, listados como TF-46/TF-47 com status "planejado".
- Testes RLS contra PostgREST (P1.11–P1.19) — especificados pelos 34 cenários do mock.

### 0.4 Ambiente de testes

| Ambiente | Uso | Configuração |
|---|---|---|
| Local (dupla) | Vitest + jsdom, PGlite | Node ≥ 20, `npm test`, `npm run db:validar`; sem Docker |
| CI (GitHub Actions, Ubuntu) | Mesmos testes + Supabase real para migrations + cobertura ≥ 70 % + build + contraste | `.github/workflows/ci.yml`, jobs `motor`, `db`, `web` |
| Navegador (manual) | Chrome + axe DevTools + Lighthouse; Firefox + NVDA; iOS Safari + VoiceOver | `npm run dev` ou `npm run preview`; celular real 375 px |
| Piloto (Fase 6) | Protótipo publicado; participantes reais; estudante fictício | P6.2 deploy |

### 0.5 Responsáveis

| Atividade | Responsável | Revisor |
|---|---|---|
| Testes funcionais e de fluxo (Vitest em tela; Playwright P4.19/P4.20) | Jean | Geandre |
| Testes de acessibilidade (axe, teclado, NVDA) e de usabilidade (roteiro, SUS) | Geandre | Jean |
| Testes de permissão (mock hoje, RLS na Fase 1) | Geandre | Jean |
| Testes do motor | Jean | Geandre |
| Consolidação de evidências para a banca (`docs/resultados.md`) | ambos | orientadora |

### 0.6 Critérios de entrada

- Branch atualizada com `development`; `npm run typecheck` sem erros.
- Dados fictícios restaurados ("Restaurar dados da demonstração" ou `api.reiniciarDados()`).
- Para testes manuais: checklist da tela aberto; ferramenta (axe DevTools/NVDA) instalada.
- Para usabilidade: termo de participação assinado; roteiro §2.3; cronômetro; formulário SUS.

### 0.7 Critérios de saída

- 100 % dos testes automatizados verdes no CI; cobertura ≥ 70 % (motor e web).
- 100 % dos casos de prioridade **A** executados (auto ou manual) com resultado registrado.
- Nenhum defeito aberto de severidade 3 ou 4 (escala de `docs/avaliacao-heuristica.md`).
- Checklist de acessibilidade §3.2 executado por tela com resultado registrado.

### 0.8 Critérios de aprovação (por marco)

| Marco | Critério |
|---|---|
| M1 (RLS) | Todos os cenários negativos verdes contra PostgREST com token válido |
| M3 (fluxo HTTP) | TF-01…TF-33 verdes com `supabaseApi` |
| M4 (interface) | Golden path Playwright 375×812 verde; 0 violações axe A/AA com contraste real |
| M6 (piloto) | SUS ≥ 68; T3 ≤ 60 s mediana; taxa de sucesso ≥ 80 %; nenhum problema novo sev. ≥ 3 |

### 0.9 Tipos de teste

Unitário (motor, serviços), de componente (Testing Library + axe), de tela/fluxo (app inteiro numa rota), de integração (§1.1), de permissão (negativos), de acessibilidade (auto + manual), de usabilidade (moderado), de compatibilidade (manual), de migrations (PGlite/Supabase), E2E em navegador (Playwright — planejado).

### 0.10 Riscos do processo de teste

| Risco | Mitigação |
|---|---|
| jsdom não calcula contraste nem layout (falsos negativos em 1.4.3/1.4.10/2.5.8) | Contraste numérico (`scripts/contraste.mjs`) + Lighthouse/axe DevTools no navegador antes de cada marco |
| Ferramentas automáticas cobrem ~30–40 % das barreiras | Sessão manual NVDA obrigatória (P6.7); checklist §3.2 |
| Sem participantes para o piloto | Recrutamento individual (3 docentes mínimo); estudante fictício |
| Testes do mock não equivalem a RLS | Mesmos cenários reexecutados na Fase 1; teste de contrato |
| Avisos `act(...)` mascaram falhas reais | Revisar saída do CI; corrigir no backlog |

### 0.11 Ferramentas

Vitest 2, @testing-library/react + user-event, axe-core 4.10, jsdom, @vitest/coverage-v8, PGlite, Supabase CLI (CI), Lighthouse, axe DevTools, WAVE, WebAIM Contrast Checker, NVDA, VoiceOver, validador W3C, Playwright (planejado). Detalhes em §3.1.

> **Ferramentas automatizadas não substituem testes manuais.** Elas apontam problemas de estrutura (rótulos, ARIA, ordem de títulos), mas não verificam sentido, ordem de leitura, compreensão de mensagens nem a experiência real com leitor de tela.

### 0.12 Evidências esperadas

| Evidência | Onde fica |
|---|---|
| Saída do CI (jobs verdes, artefatos `cobertura-motor`, `cobertura-web`) | GitHub Actions |
| Relatórios lcov | `apps/web/coverage/`, `packages/motor-adaptacao/coverage/` (gerados, não versionados) |
| Nomes dos testes por requisito | `docs/matriz-rastreabilidade.md` |
| Checklist manual preenchido por tela + capturas | `docs/resultados.md` (P6.7) |
| Relatórios Lighthouse/axe DevTools (JSON/HTML) | `docs/evidencias/` (a criar no P6.7) |
| Gravações/anotações do piloto, planilha SUS | `docs/resultados.md` (P6.5) |
| Defeitos encontrados e correções | issues do GitHub + `docs/pdca.md` (Act) |

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
| TF-41 | Login família | Porta própria e dashboard do papel | Sem sessão | 1. Abrir `/entrar/familia` 2. Tocar em "Rosa" | Tela "Entrar como família" (faz / vê / nunca vê); painel com "Ver consentimento" e sem "Gerar material" | A | `autenticacao.test.tsx › família: entra por /entrar/familia…` |
| TF-42 | Login equipe de saúde | Porta própria e dashboard do papel | Sem sessão | 1. Abrir `/entrar/saude` 2. Tocar em "Camila" | Painel com "Validar parâmetros" | A | `autenticacao.test.tsx › equipe de saúde…` |
| TF-43 | Login coordenação | Porta própria; navegação institucional | Sem sessão | 1. Abrir `/entrar/coordenacao` 2. Entrar | Painel; item "Cadastrar estudante" no menu **só** para coordenação | A | `autenticacao.test.tsx › coordenação…`, `› docente não vê 'Cadastrar estudante'…` |
| TF-44 | Redirecionamento | Volta à rota de origem após login | Sem sessão | 1. Abrir `/estudantes/e-0010/consentimento` 2. Ser levado a Entrar 3. Família → Rosa | Após o login, tela *Consentimento* (não o painel) | A | `autenticacao.test.tsx › rota protegida sem sessão → Entrar → volta à origem` |
| TF-37b | Sessão | Sair (teste de tela) | Márcia logada | 1. "Sair" | Início; menu mostra "Entrar" e esconde "Meus estudantes"; `usuarioAtual()` nulo | A | `autenticacao.test.tsx › sair encerra a sessão…` |
| TF-45 | Login | Falha de autenticação | Ajuda → "Simular falha de rede" | 1. `/entrar/docente` 2. Tocar em "Márcia" | Alerta "Não foi possível entrar. Tente novamente." (`role=alert`); continua na tela de login; sem sessão | A | `autenticacao.test.tsx › falha na autenticação…` |
| TF-46 | Login real | Credenciais inválidas / campos obrigatórios | Supabase Auth (P4.4) | 1. E-mail vazio 2. Senha errada | Resumo de erros focável; mensagem "E-mail ou senha incorretos" sem revelar qual; sem bloqueio de colar (3.3.8) | A | **planejado** (P4.4) |
| TF-47 | Recuperação de acesso | Esqueci a senha | Supabase Auth (P4.4) | 1. "Esqueci a senha" 2. E-mail 3. Link recebido 4. Nova senha | E-mail de redefinição; nova senha aceita; sessão iniciada | B | **planejado** (P4.4) |

**Cobertura atual (21/09/2026):** 49 cenários; 39 automatizados; 8 manuais (TF-08, 10 parcial, 14, 15, 21, 22, 35, 36 e compatibilidade de navegadores); 2 planejados (TF-46, TF-47 — dependem do login real).

### 1.1 Testes de integração

Integração aqui significa **componentes reais trabalhando juntos** dentro do app (router + providers + serviços + telas), sem mocks de módulo — `renderizarApp` monta a mesma tabela de rotas da produção sobre `mockApi` sem latência. A integração com o backend real é a Fase 1/3.

| ID | Integração verificada | Como | Teste |
|---|---|---|---|
| TI-01 | Formulário ↔ validação ↔ resumo de erros ↔ foco no campo | Enviar vazio; clicar no link do resumo | `paginas.test.tsx › valida o formulário com resumo de erros focável…` |
| TI-02 | Autenticação ↔ rotas protegidas ↔ estado de origem | Rota protegida sem sessão → login → volta | `autenticacao.test.tsx › …volta à origem` |
| TI-03 | Perfil autenticado ↔ dashboard (ação principal por papel) ↔ navegação condicional | Login por 4 portas | `autenticacao.test.tsx` (4 testes), `paginas.test.tsx › escolher um perfil…` |
| TI-04 | Serviços ↔ dados mockados ↔ regras (RN01–RN08) ↔ tela | Caminhos negados por URL direta | `paginas.test.tsx › Caminhos negados na interface` (4) |
| TI-05 | Motor ↔ serviços ↔ tela (adaptador aplicado, diff RN03 renderizado) | Gerar com texto de exemplo; fechar ciclo | `paginas.test.tsx › gera com o texto de exemplo…`, `› …diff com RN03 ao fechar` |
| TI-06 | Componentes reutilizáveis ↔ telas (Campo, Escala3, Modal, Alerta) | Fluxos de consentimento e observação | `paginas.test.tsx › Consentimento`, `› Observação…`; `componentes.test.tsx` |
| TI-07 | Estados de interface ↔ hooks (`useConsulta`, `useMutacao`) ↔ `aria-live` | Vazio, erro de autenticação, sucesso com toast | `paginas.test.tsx › docente sem vínculo vê estado vazio`; `autenticacao.test.tsx › falha…` |
| TI-08 | Preferências ↔ `<html data-*>` ↔ todas as telas | Ligar alto contraste | `paginas.test.tsx › Ajuda e Acessibilidade…` |
| TI-09 | Migrations ↔ seed ↔ RLS habilitado | `npm run db:validar`; job `db` | `scripts/validar-migrations.mjs`; CI |
| TI-10 | `supabaseApi` ↔ PostgREST ↔ RLS (mesmos 34 cenários) | Teste de contrato | **planejado** P1.11–P1.19 / P4.4 |

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

**Estado em 21/09/2026:** A1–A7, A12–A20, A24 verificados em jsdom/axe (automático, agora também nas 4 telas de login por perfil — `autenticacao.test.tsx`) e por inspeção do código; A8 verificado numericamente; A9–A11, A21–A23, A25–A26 pendentes de sessão manual (P6.7). Resultado a registrar em `docs/resultados.md`.

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
