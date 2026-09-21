# Guia de uso do PEI Vivo — para quem vai usar o sistema

**Versão:** 1.0 — 21/09/2026 · **Para quem:** famílias, professores, equipe de saúde e coordenação — e para a banca, que pode seguir este roteiro do começo ao fim.
Este guia não exige conhecimento técnico. Se você quer instalar o sistema na sua máquina ou mexer no código, use `docs/guia-de-uso.md`.

> **Importante:** nesta versão de demonstração todas as pessoas e todos os estudantes são **fictícios** e **não há senha**. Nunca digite dados de um aluno real aqui.

---

## 1. Primeiro acesso

### 1.1 Como abrir o sistema

Abra o endereço do PEI Vivo no navegador do celular ou do computador (na demonstração, `http://localhost:5173`). A primeira tela apresenta o que o sistema faz: o ciclo *observar → validar → adaptar → retroalimentar*. No menu superior há **Início · Ajuda · Acessibilidade · Entrar**.

### 1.2 Como identificar o seu perfil

Toque em **Entrar**. Você verá quatro "portas", cada uma com um pequeno texto dizendo para quem ela é:

| Porta | Para quem |
|---|---|
| **Família** | Pai, mãe ou responsável legal pelo estudante |
| **Professores** | Professora ou professor regente da turma |
| **Equipe de saúde** | Terapeuta ocupacional, fonoaudióloga(o), psicopedagoga(o) ou psicóloga(o) que acompanha o estudante |
| **Coordenação** | Coordenação pedagógica da escola |

Escolha a porta que descreve você. Se tiver dúvida, a página **Ajuda** explica quem faz o quê.

### 1.3 Como acessar o login adequado

Ao tocar numa porta, a tela mostra, na sua linguagem, **o que você faz aqui**, **o que você vê** e **o que você nunca vê** (por exemplo, a professora nunca vê a nota clínica). Leia — é isso que garante que você está no lugar certo.

### 1.4 Como preencher os campos

- **Na demonstração:** não há campos; toque no cartão com o nome da pessoa fictícia que você quer "ser" (ex.: *Rosa*, na porta Família). Cada cartão explica o que aquele perfil demonstra.
- **No sistema real (em breve):** informe o e-mail e a senha que a coordenação da escola enviou. Você pode colar a senha do seu gerenciador; não há códigos nem quebra-cabeças para resolver.

### 1.5 Como identificar mensagens de erro

- Uma mensagem em **vermelho, com título e ícone**, aparece no topo do formulário e diz **o que aconteceu e como corrigir** ("Há 2 problemas no formulário"). Cada item é um link que leva ao campo com problema.
- Se o sistema não conseguir entrar ("Não foi possível entrar. Tente novamente."), você continua na mesma tela — basta tentar de novo.
- Se você abrir um endereço que não existe, verá **"Página não encontrada"** com dois botões para voltar.
- Mensagens de erro nunca somem sozinhas; as de sucesso (verdes) aparecem por alguns segundos, mas a informação fica na tela.

### 1.6 Como recuperar o acesso

- **Demonstração:** não há senha. Se algo ficou estranho, abra **Ajuda → "Restaurar dados da demonstração"**; tudo volta ao começo.
- **Sistema real (em breve):** na tela de login, toque em **"Esqueci a senha"**, informe o e-mail e siga o link que chegar (vale por 1 hora). Se o e-mail mudou, fale com a coordenação da escola.

### 1.7 Como sair do sistema

No canto superior direito, ao lado do seu nome, toque em **Sair**. Você volta à página inicial e uma mensagem confirma "Você saiu da sua conta". Faça isso sempre que usar um aparelho compartilhado.

---

## 2. Fluxo da família (responsável legal)

1. **Entrar:** *Entrar → Família → Rosa*. Você chega em **Meus estudantes**.
2. **Área inicial:** a lista mostra cada estudante com a idade, a turma e se o **consentimento** está ativo ou aguardando. O botão principal é **Ver consentimento**.
3. **Consentimento — a sua primeira e mais importante ação:**
   - Toque em **Ver consentimento**. Leia o termo, escrito em cinco perguntas simples: *o que autorizo, o que não, quem vê, por quanto tempo, meus direitos*.
   - Marque o que você autoriza (observação na escola, observação em casa, geração de material).
   - Marque **"Li e entendi o termo"** e toque em **Autorizar**. O selo muda para **Ativo** e a linha do tempo registra a data.
   - Sem o seu consentimento, **nada** é registrado nem gerado para o estudante.
4. **Consultar informações:** toque no nome do estudante. Você vê o perfil vigente (explicado em palavras simples), os **materiais aprovados** e se **funcionaram** (desfecho), e o **histórico** completo por ciclo. Você **nunca** vê a nota clínica nem rascunhos.
5. **Registrar o que percebe em casa:** *Registrar observação* — escolha, para cada dimensão, se está *reduzida*, *estável* ou *ampliada* nas últimas duas semanas e, se quiser, escreva um exemplo.
6. **Seus direitos (LGPD):** em *Dados do estudante* você pode **Exportar** tudo (um arquivo) ou **Excluir** tudo — a exclusão pede que você digite o nome do estudante exatamente como aparece.
7. **Revogar o consentimento:** a qualquer momento, em *Consentimento → Revogar*. O sistema pede uma confirmação ("Entendo as consequências"). A escola para de registrar e gerar imediatamente.
8. **Buscar ajuda:** menu **Ajuda** (perguntas frequentes) ou **Acessibilidade** (texto maior, contraste).
9. **Encerrar:** **Sair**.

---

## 3. Fluxo do professor (docente regente)

1. **Entrar:** *Entrar → Professores → Márcia*. (O perfil *Paulo* mostra como fica o painel de quem ainda não tem estudante vinculado.)
2. **Dashboard:** **Meus estudantes** lista seus alunos com o selo de consentimento. O botão principal é **Gerar material** — ele só aparece quando a família já autorizou.
3. **Consultar informações educacionais:** toque no nome do estudante. Você vê o **perfil vigente** (linhas por bloco, formato do enunciado, vocabulário, contraste…), o ciclo aberto, os materiais e os desfechos. Você **não** vê laudo (o sistema não guarda) nem nota clínica.
4. **Registrar dados — a cada 15 dias:**
   - **Registrar observação:** para cada uma das seis dimensões, escolha *reduzida / estável / ampliada*. Há uma pergunta-guia em cada uma ("Cansa mais rápido que antes?"). Escreva exemplos se quiser. Toque em **Registrar observações**.
   - **Fechar ciclo:** o sistema mostra uma tabela **"vigente → proposto"** com o que mudaria e por quê. Regras que você verá explicadas: para *aumentar* a dificuldade é preciso dois ciclos seguidos "ampliada"; para *reduzir*, basta um. Confirme. Se houver profissional de saúde vinculado, a proposta vai para validação; se não, passa a valer na hora (modo pedagógico).
5. **Gerar, revisar e aprovar material (o momento principal):**
   - **Gerar material:** dê um título, cole o texto da aula (ou toque em *Usar texto de exemplo*) e toque em **Adaptar para [nome]**.
   - **Revisar:** a tela mostra o **original** e o **adaptado lado a lado** (no celular, um abaixo do outro). Você pode **editar** o texto adaptado. Nada chega ao estudante sem o seu **Aprovar**. Também pode **Descartar** ou **Decidir depois**.
   - **Material:** depois de aprovado, abra o material em versão acessível e toque em **Imprimir ou salvar em PDF** (sai só o material, sem menus).
6. **Visualizar resultados — depois da aula:** no material, toque em **Registrar desfecho** e escolha *Alcançado*, *Parcial* ou *Não alcançado*, com um comentário opcional. Dois toques. Isso alimenta o próximo ciclo.
7. **Buscar ajuda:** **Ajuda** (fluxo em 60 segundos, por que você não vê o laudo, o que a IA faz ou não faz) e **Acessibilidade**.
8. **Sair:** botão **Sair**.

---

## 4. Fluxo do terapeuta (equipe de saúde)

1. **Entrar:** *Entrar → Equipe de saúde → Camila* (terapeuta ocupacional do Miguel). *Beatriz* mostra o caso de quem ainda não foi vinculada pela coordenação.
2. **Área profissional:** **Meus estudantes** com o botão principal **Validar parâmetros**. No menu, **Pendências** lista tudo o que aguarda a sua decisão e há quantos dias.
3. **Consultar informações do estudante:** toque no nome. Você vê observações de todos (escola e casa), o histórico de versões do perfil, materiais aprovados e desfechos, e a data em que o laudo foi apresentado à escola (só a data).
4. **Validar o ciclo (sua responsabilidade central):**
   - Abra **Validar parâmetros**. A tela mostra o conjunto proposto, o que mudou e as observações que originaram a proposta.
   - **Aprovar o conjunto de parâmetros** — passa a valer para os próximos materiais; ou **Solicitar ajuste**, escrevendo a justificativa para a professora (obrigatória).
   - Você valida o **conjunto do ciclo**, nunca um material específico. Sem resposta em 7 dias, continuam valendo os parâmetros anteriores (a tela avisa "Expirada").
5. **Registrar acompanhamentos:**
   - **Notas clínicas:** espaço **reservado** — só profissionais de saúde vinculados ao estudante leem. Nem a família, nem a escola, nem a coordenação.
   - **Registrar observação:** estratégias que a escola pode aplicar, em linguagem operacional (essas todos veem).
6. **Acessar dados relevantes:** **Histórico** do PEI por ciclo, com desfechos reais em sala.
7. **Buscar ajuda:** **Ajuda** e **Acessibilidade**.
8. **Sair:** botão **Sair**.

---

## 5. Fluxo da coordenação (perfil institucional)

1. **Entrar:** *Entrar → Coordenação*.
2. **Cadastrar estudante:** menu **Cadastrar estudante** — nome, data de nascimento, turma e, se houver, **só a data** em que o laudo foi apresentado (o laudo em si nunca é anexado).
3. **Vínculos:** na tela do estudante, **Vínculos** — escolha a pessoa, o papel (família, docente, profissional) e, para profissional de saúde, o registro no conselho. Ao trocar de professora, **desative** o vínculo antigo: o acesso some na hora.
4. **Acompanhar:** **Pendências** (validações em aberto) e **Histórico** de cada estudante, com opção de exportar para a reunião de PEI.
5. **Sair.**

---

## 6. Recursos de acessibilidade

### 6.1 Navegar pelo teclado

Tudo no PEI Vivo funciona sem mouse:

| Tecla | O que faz |
|---|---|
| **Tab** | Vai para o próximo botão, link ou campo. Na primeira vez, aparece o link **"Pular para o conteúdo principal"**. |
| **Shift + Tab** | Volta para o anterior. |
| **Enter** | Ativa o link ou botão em foco; envia o formulário quando o foco está num campo de texto. |
| **Espaço** | Ativa o botão em foco; marca/desmarca caixas de seleção. |
| **Setas ↑ ↓ ← →** | Trocam a opção dentro de um grupo (ex.: reduzida / estável / ampliada). |
| **Esc** | Fecha a janela de confirmação e devolve o foco ao botão que a abriu. |

### 6.2 Identificar o foco

O elemento em foco recebe um **contorno azul-escuro de 3 pixels** ao redor, com um pequeno espaço. Nos cartões de opção, o contorno envolve o cartão inteiro. Ao mudar de tela, o foco vai para o título da tela e o leitor de tela anuncia o novo nome da página.

### 6.3 Usar o zoom e ajustar a leitura

- **Zoom do navegador:** Ctrl + (Windows) ou Cmd + (Mac) até 400 % — a tela se reorganiza em uma coluna, sem rolagem horizontal (só as tabelas rolam de lado).
- **Página Acessibilidade** (menu ou rodapé): **Contraste** (padrão ou alto contraste), **Tamanho do texto** (16, 19 ou 22 px) e **Movimento** ("Animações leves" ou "Sem animações"). As escolhas ficam salvas no seu aparelho e valem para todas as telas.
- **Material adaptado:** o contraste vem do perfil do estudante (fundo creme suave ou preto no branco) e a impressão sai limpa.

### 6.4 Leitores de tela

O sistema foi construído com HTML nativo (botões, links, listas, tabelas com cabeçalho, campos com rótulo) e anuncia mensagens de carregamento, sucesso e erro sem mover o foco. Funciona com NVDA (Windows), VoiceOver (Mac/iPhone) e TalkBack (Android). A verificação manual completa com NVDA está planejada para antes do piloto.

### 6.5 Encontrar a página de acessibilidade

Link **Acessibilidade** no menu superior e no rodapé de todas as telas.

### 6.6 Reportar problemas de acessibilidade

Se algo não funcionou com teclado, leitor de tela, zoom ou contraste:

1. Anote a tela, o que tentou fazer, o aparelho/navegador e a tecnologia assistiva usada.
2. Registre em <https://github.com/geandreac/tcc-peivivo/issues> (rótulo *acessibilidade*) ou avise a coordenação da escola, que repassa à equipe.
3. Problemas que impedem uma tarefa são tratados como prioridade máxima (resposta em até 1 dia útil — ver `docs/itil-servicos.md`).

**Nunca inclua dados reais de estudante no relato.**

---

## 7. Roteiro rápido para a banca (10 minutos)

| Passo | Perfil | Ação | O que observar |
|---|---|---|---|
| 1 | Família (Rosa) | Consentimento do *Estudante B* → Autorizar | Termo simples; resumo de erros se não marcar "li" |
| 2 | Professores (Márcia) | Miguel → Registrar observação → Fechar ciclo | Tabela vigente → proposto; "Aguardando 2º ciclo" (RN03) |
| 3 | Equipe de saúde (Camila) | Pendências → Validar → Aprovar | Versão passa a VIGENTE |
| 4 | Professores (Márcia) | Gerar material (texto de exemplo) → Revisar → Aprovar → Imprimir → Desfecho | Original × adaptado; nada chega sem aprovar |
| 5 | Professores (Márcia) | Digitar `/estudantes/e-0010/notas-clinicas` na barra de endereço | **"Acesso negado (RN02)"** — permissão no dado |
| 6 | Família (Rosa) | Digitar `/materiais/m-0041` | "Material não encontrado" — rascunho é privado |
| 7 | Qualquer | Sair → tentar `/painel` | Volta para Entrar; após entrar, volta ao destino |
| 8 | Qualquer | Tab, Tab, Tab… + Acessibilidade → alto contraste | Foco visível; tudo pelo teclado |
