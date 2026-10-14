# Guia de uso do PEI Vivo — pelo site publicado

**Versão:** 2.0 — 14/10/2026 · **Para quem:** a dupla, a orientadora e a banca (pré-banca), e quem for usar o sistema.
**Endereço:** <https://tcc-peivivo.vercel.app>

Este guia foi refeito **navegando no site publicado na Vercel**, perfil por perfil, em 14/10/2026. Cada funcionalidade descrita aqui foi aberta e usada de verdade; os acessos proibidos foram testados digitando a URL direto. O resultado está na seção 7, e os problemas encontrados, na seção 8.
Para instalar o sistema na sua máquina ou mexer no código, use `docs/guia-de-uso.md`.

> **Importante:** o site publicado é a **demonstração**: todas as pessoas e todos os estudantes são **fictícios** e **não há senha**. Nunca digite dados de um aluno real aqui. O banco real (Supabase) já está na nuvem, mas o site publicado ainda não está ligado a ele (ver seção 9).

---

## 1. Antes de começar

### 1.1 Abrir o sistema
Abra <https://tcc-peivivo.vercel.app> no navegador do computador ou do celular. A página inicial apresenta o problema (adaptar um texto à mão leva cerca de 40 minutos), mostra um exemplo do mesmo texto antes e depois da adaptação para o Miguel e explica o ciclo **observar → validar → adaptar → retroalimentar**. No topo: **Início · Ajuda · Acessibilidade · Entrar**.

### 1.2 Entrar com um perfil
Toque em **Entrar**. Aparecem quatro portas: **Família**, **Professores**, **Equipe de saúde** e **Coordenação**. Ao tocar numa porta, a tela mostra **o que você faz aqui**, **o que você vê** e **o que você nunca vê**, e os perfis fictícios daquela porta:

| Porta | Perfil fictício | Para que serve na demonstração |
|---|---|---|
| Família | **Rosa** | Responsável do Miguel e do Estudante B (o B começa sem consentimento) |
| Professores | **Márcia** | Docente do Miguel: perfil vigente, ciclo aberto e um rascunho para revisar |
| Professores | **Paulo** | Docente **sem vínculo**: painel vazio e acesso negado por URL |
| Equipe de saúde | **Camila** | Terapeuta ocupacional do Miguel: tem notas reservadas e valida ciclos |
| Equipe de saúde | **Beatriz** | Fonoaudióloga **sem vínculo**: a coordenação a vincula e a família confirma |
| Coordenação | **Coordenação** | Cadastra, vincula, acompanha números e pendências |

Você também pode ir direto pela URL: `/entrar/familia`, `/entrar/docente`, `/entrar/saude`, `/entrar/coordenacao`.

### 1.3 Sair e trocar de perfil
No canto superior direito, ao lado do nome, toque em **Sair**. Para trocar de perfil, saia e entre por outra porta. Se você tentar abrir uma página interna sem estar logado (ex.: `/painel`), o sistema leva para **Entrar**.

### 1.4 Os dados da demonstração ficam no seu navegador
Tudo o que você faz (autorizar, observar, aprovar…) fica salvo **no seu navegador**, não no servidor. Por isso:
- outra pessoa, em outro computador, vê a demonstração no estado original;
- para voltar ao começo, abra **Ajuda → Restaurar dados da demonstração**. Faça isso **antes de apresentar**.

Na mesma página há **Simular falha de rede**, para mostrar a tela de erro.

---

## 2. Coordenação

**Entrar:** *Entrar → Coordenação → Coordenação (fictícia)*.

| Funcionalidade | Onde | O que acontece |
|---|---|---|
| **Painel da escola** | Tela inicial (*Meus estudantes*) | Cinco números: estudantes acompanhados, aguardando a família, sem profissional de saúde, validações atrasadas e quinzenas paradas. Em "O que precisa de você", as pendências (ex.: Estudante B aguardando autorização). O painel mostra **só contagens**, nunca observações ou notas. |
| **Cadastrar estudante** | Botão *Cadastrar estudante* | Nome, nascimento, turma e, se houver, **só a data** em que o laudo foi apresentado. O laudo em si nunca é guardado. |
| **Ficha do estudante** | Card do estudante | Perfil de aprendizagem vigente em linguagem simples, materiais aprovados e a data do laudo. |
| **Vínculos** | Ficha → *Gerenciar vínculos* | Lista quem tem acesso e com que papel; **Desativar** remove o acesso na hora (troca de professora). |
| ↳ Convidar por e-mail | Vínculos → *Convidar alguém novo* | Nome, e-mail e papel (docente, responsável, profissional). No sistema real, a pessoa recebe um link válido por 7 dias. |
| ↳ Vincular quem já tem conta | Vínculos → *Vincular quem já tem conta* | Escolha a pessoa e o papel. Para **profissional de saúde**, o registro no conselho é **obrigatório** (o formulário avisa se faltar). O profissional fica **"Aguardando confirmação"** até a família permitir. |
| **Histórico do PEI** | Ficha → *Abrir histórico* | Linha do tempo por ciclo: observações de todos, versões do perfil, materiais e desfechos, trilha de auditoria. Botão **Exportar para a reunião**. Nunca mostra a nota clínica. |
| **Pendências** | Menu lateral | Versões de perfil aguardando o profissional de saúde, com dias em aberto. |
| **Exportar dados** | `/estudantes/<id>/dados` | Coordenação pode exportar; só o responsável pode excluir. |

**Teste feito:** vincular Beatriz como fonoaudióloga do Miguel → apareceu "Aguardando confirmação"; a notificação chegou para a Rosa.

---

## 3. Família (responsável legal)

**Entrar:** *Entrar → Família → Rosa*.

| Funcionalidade | Onde | O que acontece |
|---|---|---|
| **Meus estudantes** | Tela inicial | Cada estudante com o selo **Consentimento ativo** ou **Aguardando consentimento** e o botão *Privacidade e autorização*. |
| **Consentimento** | Ficha → *Abrir consentimento* | Termo em cinco blocos simples (o que é registrado, o que não é, quem vê, por quanto tempo, seus direitos). Escolha o que autoriza (observações da escola, de casa, validação pelo profissional, geração de material), marque **"Li e entendi"** e toque em **Autorizo**. Se esquecer de marcar, o formulário avisa. |
| **Revogar** | Consentimento → *Revogar consentimento* | Abre uma confirmação: marque **"Entendo as consequências e quero revogar"** e toque em **Sim, revogar agora** (o botão fica inativo até marcar). Efeito imediato: a professora e o profissional deixam de ver e registrar. |
| **Privacidade** | Ficha → *Abrir privacidade* | (1) **Aguardando a sua decisão**: profissional proposto pela escola, com **Permitir** ou **Recusar**. (2) **Quem tem acesso agora**, com *Remover acesso* para profissionais. (3) Tabela **o que cada pessoa vê**. (4) **Quem leu as notas do profissional**, com data e hora. (5) Histórico de acessos e mudanças. |
| **Observação de casa** | Ficha → *Registrar observação* | Seis dimensões (atenção, compreensão de enunciados, autonomia com palavras, interesse, sensibilidade visual, cansaço), cada uma com *Reduzida / Estável / Ampliada* e um exemplo opcional. Não precisa responder todas. |
| **Histórico** | Ficha → *Ver histórico* | O mesmo histórico da coordenação. |
| **Meus dados (LGPD)** | Ficha → *Exportar ou excluir* | **Exportar dados** (arquivo legível, sem notas clínicas) e **Excluir todos os dados** (definitivo, só o responsável). |
| **Notificações** | Sino no topo | Ex.: "Um profissional de saúde foi proposto para Miguel e aguarda a sua confirmação." |

**Testes feitos:** permitir a Beatriz → "Beatriz agora tem acesso"; autorizar o Estudante B; registrar observação de casa (apareceu no fechamento de ciclo da professora); revogar o B → a professora ficou bloqueada na hora.

---

## 4. Professores (docente regente)

**Entrar:** *Entrar → Professores → Márcia*.

| Funcionalidade | Onde | O que acontece |
|---|---|---|
| **Meus estudantes** | Tela inicial | Alunos vinculados; o botão **Gerar material** só aparece com consentimento ativo. |
| **Ficha do estudante** | Card | Perfil vigente, ciclo aberto, materiais (inclusive **rascunhos**, marcados "só você vê"). A professora **não** vê a data do laudo. |
| **Observação quinzenal** | Ficha → *Registrar observação* | As mesmas seis dimensões da família. |
| **Fechar o ciclo** | Ficha → *Fechar ciclo* | Mostra as observações do ciclo e a tabela **vigente → proposto**. Regras visíveis na tela: **reduzir é imediato** (ex.: blocos 8 → 6 por cansaço) e **elevar exige dois ciclos seguidos** ("Aguardando 2º ciclo para elevar"). Confirmação → "Enviado para validação clínica". |
| **Gerar material** | Ficha → *Gerar material* | Título + texto da aula (ou *Usar texto de exemplo*) → **Adaptar para Miguel**. Gera em menos de 1 segundo. |
| **Revisar** | Abre sozinho depois de gerar | **Original e adaptado lado a lado**. O adaptado vem em trechos com botão **Ouvir**, e as instruções em passos numerados ("Leia o texto." / "Sublinhe…" / "Explique…"). Ações: **Aprovar**, **Editar o texto adaptado**, **Descartar rascunho**. Nada chega ao estudante sem **Aprovar**. |
| **Material aprovado** | Depois de aprovar | Versão final com selo **Aprovado**, **Ouvir** por trecho e **Imprimir ou salvar em PDF**. |
| **Desfecho** | Material → *Registrar desfecho* | **Alcançado / Parcial / Não alcançado** + observação opcional. Alimenta o próximo ciclo. |

**Paulo (sem vínculo):** painel vazio ("Nenhum estudante vinculado a você"); qualquer URL de estudante ou material mostra "Você não está vinculado a este estudante".

---

## 5. Equipe de saúde

**Entrar:** *Entrar → Equipe de saúde → Camila*.

| Funcionalidade | Onde | O que acontece |
|---|---|---|
| **Meus estudantes** | Tela inicial | Botão principal **Validar parâmetros**. |
| **Pendências** | Menu lateral | Versões aguardando a sua validação, com dias em aberto. |
| **Validar parâmetros** | Ficha → *Abrir validação* | Tabela vigente → proposto, as observações que geraram a proposta e duas decisões: **Aprovar o conjunto de parâmetros** ou **Solicitar ajuste** (com justificativa). Valida-se o **ciclo inteiro**, nunca um material. Depois de aprovar, a versão vira **Vigente**. |
| **Notas clínicas reservadas** | Ficha → *Abrir notas* | Só profissionais de saúde vinculados leem. Ao ler, fica registrado, e a família vê "quem leu e quando". Há também **Registrar como observação (todos veem)**, para o que a escola precisa saber. |
| **Ficha e histórico** | Card | Perfil vigente com a explicação de cada parâmetro, materiais aprovados, data do laudo. **Não** vê rascunhos. |

**Teste feito:** aprovar o ciclo 4 → passou a "Vigente"; a leitura das notas apareceu na Privacidade da família às 19:15.

---

## 6. Recursos para todos os perfis

- **Ajuda** (`/ajuda`): o que é o PEI Vivo, quem faz o quê, o fluxo em 60 segundos, por que a professora não vê o laudo, o que a IA faz e não faz, e as ferramentas da demonstração.
- **Acessibilidade** (`/acessibilidade`): tema **claro/escuro**, **leitura facilitada** (fonte e espaçamento para dislexia), **alto contraste**, **tamanho do texto** (16, 19 ou 22 px) e **sem animações**. As escolhas ficam salvas no aparelho. A página traz a declaração de acessibilidade (WCAG 2.2 AA) e os atalhos de teclado.
- **Teclado:** Tab / Shift+Tab, Enter, Espaço, setas nos grupos de opção, Esc fecha confirmações.
- **Conta e segurança** (ícone de pessoa no topo): na demonstração, só explica o que existirá no sistema real (troca de senha, autenticador, sair de todos os dispositivos).

---

## 7. Verificação dos acessos (feita no site publicado em 14/10/2026)

**Legenda:** ✅ = funcionou como esperado; ⛔ = acesso negado, como deveria.

### 7.1 O que cada perfil pode fazer

| Ação | Coordenação | Família | Docente | Saúde |
|---|---|---|---|---|
| Ver painel com contagens da escola | ✅ | — | — | — |
| Vincular pessoa / exigir registro do profissional | ✅ | — | — | — |
| Permitir profissional proposto | — | ✅ | — | — |
| Autorizar e revogar consentimento | — | ✅ | — | — |
| Registrar observação | — | ✅ | ✅ | ✅ |
| Fechar ciclo (RN03 visível na tela) | — | — | ✅ | — |
| Validar o conjunto de parâmetros | — | — | — | ✅ |
| Gerar → revisar → aprovar → desfecho | — | — | ✅ | — |
| Ler notas clínicas (com registro de leitura) | — | — | — | ✅ |
| Ver "quem leu as notas" | — | ✅ | — | — |

### 7.2 O que cada perfil NÃO pode fazer (URL digitada direto)

| Tentativa | Resultado |
|---|---|
| Coordenação abre notas clínicas e tenta gravar uma nota | ⛔ "Acesso negado" + "Seu perfil não tem permissão" ao gravar |
| Família abre notas clínicas | ⛔ Acesso negado |
| Família abre o rascunho da professora (`/materiais/m-0041/revisar`) | ⛔ "Material não encontrado" |
| Família tenta gerar material | ⛔ "Só a docente gera material" |
| Docente abre notas clínicas, Privacidade, Vínculos, Validar, Dados | ⛔ todas bloqueadas, cada uma com explicação |
| Docente sem vínculo (Paulo) abre estudante, histórico ou material | ⛔ "Você não está vinculado a este estudante" |
| Docente gera ou observa depois que a família revogou | ⛔ "Geração bloqueada" / "Sem consentimento ativo" (RN08) |
| Visitante sem login abre `/painel` | ⛔ volta para Entrar |
| Profissional de saúde vê rascunho | ⛔ não aparece na lista |

---

## 8. Problemas encontrados (14/10/2026)

| # | Gravidade | Problema | Situação |
|---|---|---|---|
| 1 | **Alta** | Abrir qualquer página interna pela URL, recarregar a página ou clicar no link do convite (`/definir-senha`) dava **404 da Vercel**. | **Corrigido** no mesmo dia (`apps/web/vercel.json`); conferido no site. |
| 2 | Média | Os trechos do material adaptado eram cortados **no meio da frase** ("Quando o magma chega à \| superfície…"). O mesmo aparecia no exemplo da página inicial. | **Corrigido**: o motor agrupa frases inteiras; só uma frase maior que o limite é dividida. Observação: na tela, um trecho de "4 linhas" (≈ 60 caracteres cada) pode ocupar mais linhas num cartão estreito. |
| 3 | Média | **Pendências** lista versões antigas do Miguel (ciclos 1 e 2, já "substituídas") como "prazo vencido", enquanto o painel diz "Validações atrasadas: 0". | **Corrigido**: Pendências mostra só versões pendentes ou em revisão (as que ainda podem ser decididas), no mock e no Supabase. |
| 4 | Média | A página inicial diz "A coordenação vê números, não observações", mas a coordenação vê as observações no Histórico, e a tabela da Privacidade confirma ("Só vê"). Pela decisão registrada em `docs/reformulacao/DECISOES.md`, a coordenação lê observações só no histórico (obrigação legal). | **Corrigido**: o texto da página inicial agora diz isso. |
| 5 | Baixa | Nas notas clínicas, quem não tem acesso vê "Acesso negado" **e também** o formulário "Nova nota". A gravação é barrada, mas o formulário não deveria aparecer. | **Corrigido**: o formulário só aparece para quem tem acesso. |
| 6 | Baixa | A âncora de interesse vira a frase inteira ("engajamento espontâneo com dinossauros") depois do ciclo 4. A causa estava nos dados fictícios: a evidência do ciclo 3 era uma frase, e não o tema. | **Corrigido**: a evidência agora é só o tema ("Dinossauros."), no mock e no `seed.sql`. |
| 7 | Baixa | Siglas internas apareciam na tela: "(HU-C.02)" em Vínculos e "(RN06)" na porta da equipe de saúde. | **Corrigido**, com teste que procura siglas nessas telas. |
| 8 | Baixa | A família e a docente viam "Pendências" no menu, mas só a saúde e a coordenação usam. | **Corrigido**: o item só aparece para coordenação e profissional de saúde. |
| 9 | Baixa | O perfil dizia "Palavras simples; termos difíceis vêm explicados", mas com a IA desligada o vocabulário não muda. | **Corrigido**: o texto agora diz que o vocabulário é aplicado quando a camada de IA estiver ligada. |
| 10 | Baixa | A notificação "profissional proposto" continuava como "Nova" depois que a família já tinha decidido. | **Corrigido** no mock e no banco (migration `0009`): decidida a última proposta, o aviso é marcado como lido. |

Nenhum problema de **segurança** foi encontrado: todo acesso proibido foi barrado. Os 10 itens foram corrigidos no mesmo dia, cada um com teste.

---

## 9. O que o site publicado ainda não mostra

- **Login real:** o site da Vercel roda em modo demonstração. O banco real na nuvem já tem as migrations 0001–0009, as 3 Edge Functions e a primeira escola ("Escola Piloto PEI Vivo"), mas o site publicado ainda não está ligado a ele. Para mostrar o modo real, rode localmente com `VITE_API=supabase` (ver `docs/reformulacao/IMPLANTACAO.md` §7) ou mostre os testes do CI contra o Supabase real.
- **IA:** desligada por decisão de projeto; só a camada determinística roda (trechos, etapas, contraste).

---

## 10. Roteiro para a pré-banca (cerca de 12 minutos)

Antes de começar: **Ajuda → Restaurar dados da demonstração**.

| Passo | Perfil | Ação | O que mostrar |
|---|---|---|---|
| 1 | — | Página inicial | O problema (~40 min por texto) e o antes/depois do Miguel |
| 2 | Coordenação | Painel → Miguel → Vínculos → vincular Beatriz (sem registro, depois com `CRFa-DEV-123`) | Só contagens no painel; registro obrigatório; "Aguardando confirmação" |
| 3 | Família (Rosa) | Sino → Privacidade → **Permitir** Beatriz; Estudante B → Consentimento → Autorizar | A família tem a chave; termo em linguagem simples |
| 4 | Docente (Márcia) | Miguel → Fechar ciclo → confirmar | Tabela vigente → proposto; "reduzir é imediato, elevar exige 2 ciclos" |
| 5 | Saúde (Camila) | Pendências → Validar → Aprovar | Valida o ciclo, não o material; versão vira Vigente |
| 6 | Docente (Márcia) | Gerar material (texto de exemplo) → Revisar → Aprovar → Desfecho | Original × adaptado em menos de 1 s; nada chega sem aprovar |
| 7 | Docente (Márcia) | Digitar `/estudantes/e-0010/notas-clinicas` | "Acesso negado": a permissão está no dado, não na tela |
| 8 | Família (Rosa) | Privacidade → "Quem leu as notas" | A leitura da Camila com data e hora |
| 9 | Família (Rosa) | Estudante B → Revogar; depois Márcia tenta gerar | Bloqueio imediato |
| 10 | Qualquer | Acessibilidade → leitura facilitada / alto contraste; navegar com Tab | Acessibilidade de verdade |

Todos os problemas da seção 8 foram corrigidos em 14/10/2026.
