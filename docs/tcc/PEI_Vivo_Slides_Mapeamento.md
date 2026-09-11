# PEI Vivo — Mapeamento dos Slides

> Documento de planejamento. Cada seção abaixo corresponde a um slide. Depois de revisado, isso vira o `.pptx` final.

---

## Slide 1 — Abertura

**Conteúdo do slide:**
- Título: **PEI Vivo**
- Subtítulo: Plataforma colaborativa entre escola, família e equipe de saúde para acompanhamento evolutivo e adaptação contínua de materiais didáticos
- Dupla: **Geandre Alfaia Colares & Jean Victor Torres dos Santos**
- Curso / Turno: Sistemas de Informação — SIS231N01 / Noturno
- Orientadora: Luana Leal
- CEUNI FAMETRO — 2º semestre 2026

**Nota:** slide de capa, visual limpo. Sem bullets de conteúdo técnico aqui — isso vem a partir do slide 2.

---

## Slide 2 — Sistemas semelhantes e diferencial

Pesquisei três sistemas: dois brasileiros e um padrão internacional de mercado. Escolhi esses três porque cobrem as três abordagens que existem hoje — geração de conteúdo por IA, gestão documental do PEI e gestão de compliance do IEP — e o PEI Vivo não se encaixa em nenhuma das três.

### 2.1 Prova Adaptada (Brasil, SP — fundada em 2024)

**O que é:** startup brasileira que adapta provas e atividades para estudantes neurodivergentes em cerca de 30 segundos, usando IA e protocolos científicos. Atende TEA, TDAH, dislexia, baixa visão e discalculia. Presente em centenas de escolas privadas, mais de 10 mil alunos impactados, e iniciando expansão para a rede pública em 2025.

**Como funciona:** o professor envia a prova, seleciona a condição do aluno (ex.: TEA, dislexia) e recebe uma versão adaptada e padronizada, mantendo o grau de dificuldade original.

**Limitação em relação ao PEI Vivo:** a adaptação é parametrizada pela **categoria diagnóstica**, não pelo perfil individual do estudante em evolução. Dois alunos com o mesmo laudo recebem o mesmo tipo de adaptação. Não há ciclo de observação comportamental recorrente, não há validação clínica do parâmetro antes do uso, e não há mecanismo de retroalimentação que ajuste a adaptação ao longo do tempo.

### 2.2 Vínculoo (Brasil)

**O que é:** plataforma de educação especial que organiza e digitaliza o PEI, o PDI e o PAEE, alinhada ao Decreto nº 12.686/2025. Usa um módulo de IA ("Apoio Inteligente") para ajudar o professor a mapear o "Repertório de Aprendizagem" do estudante — o que ele traz da escola, de casa e das relações sociais.

**Como funciona:** professores, famílias e equipe escolar preenchem colaborativamente os documentos do plano; a plataforma centraliza e organiza essa informação para apoiar a tomada de decisão pedagógica.

**Limitação em relação ao PEI Vivo:** o sistema é **documental**. Ele organiza e centraliza o PEI, mas não converte a informação registrada em geração automática de material didático. O plano continua sendo um documento de referência que o professor precisa interpretar manualmente — não existe motor de adaptação nem validação clínica formal de parâmetros.

### 2.3 Frontline IEP / Goalbook (Estados Unidos — padrão internacional)

**O que é:** as duas plataformas mais usadas nos EUA para gestão de IEP (o equivalente ao PEI americano), presentes em mais de 2.300 distritos escolares. Frontline foca em compliance legal (IDEA), geração de documentos e rastreamento administrativo. Goalbook Toolkit foca em alinhar metas do IEP a padrões curriculares e monitorar o progresso do aluno, com um módulo de IA ("Threads") que sugere melhorias no texto do plano.

**Como funciona:** equipes de educação especial criam e gerenciam o IEP colaborativamente, com permissões por papel, geram relatórios de conformidade legal e acompanham metas ao longo do ano.

**Limitação em relação ao PEI Vivo:** é software de **gestão e conformidade administrativa** do plano, não de geração de conteúdo. Ajuda a escrever um IEP melhor e a cumprir a lei — não adapta o material didático que o aluno recebe, e não conecta a rede de saúde ao processo por meio de validação clínica formal e periódica.

### 2.4 Quadro comparativo (para o slide)

| Sistema | Origem | O que resolve | O que não faz |
|---|---|---|---|
| Prova Adaptada | 🇧🇷 Brasil | Gera material adaptado por categoria diagnóstica, em segundos | Não usa perfil individual evolutivo nem validação clínica |
| Vínculoo | 🇧🇷 Brasil | Digitaliza e centraliza o PEI/PDI/PAEE colaborativamente | Não gera material — o plano continua sendo documento de referência |
| Frontline / Goalbook | 🇺🇸 EUA (padrão internacional) | Gestão, compliance e rastreamento de metas do IEP | Não gera conteúdo nem integra validação da rede de saúde |
| **PEI Vivo** | — | Une os três: observação evolutiva + validação clínica formal + geração automática de material | — |

### 2.5 O diferencial do PEI Vivo (frase-síntese para o slide)

> Nenhum dos três sistemas fecha o ciclo. O PEI Vivo é o único em que a **observação comportamental periódica do professor**, validada por **profissional de saúde**, determina automaticamente o **material que o aluno recebe** — com o resultado retroalimentando o ciclo seguinte.

---

## Slide 3 — Metodologia Ágil (Kanban)

**Por que Kanban e não Scrum:** a dupla é pequena (dois integrantes) e o trabalho é contínuo ao longo do semestre, sem papéis fixos de Scrum Master/PO nem benefício claro em sprints fechadas de 2 semanas para uma equipe desse tamanho. Kanban dá visibilidade do fluxo sem a sobrecarga cerimonial.

### 3.1 Estrutura do quadro

```
BACKLOG → A FAZER → EM DESENVOLVIMENTO → REVISÃO/TESTE → CONCLUÍDO
```

| Coluna | Critério de entrada | Critério de saída |
|---|---|---|
| **Backlog** | Item identificado nos requisitos (RF/RNF) | Priorizado e detalhado o suficiente para virar tarefa |
| **A Fazer** | Item priorizado para o ciclo atual | Dupla decidiu quem inicia |
| **Em Desenvolvimento** | Código sendo escrito | Funcionalidade implementada localmente |
| **Revisão/Teste** | Pull request aberto | Testes automatizados passando + revisão do outro integrante |
| **Concluído** | Aprovado e integrado à branch principal | — |

### 3.2 Limite de trabalho em progresso (WIP)

Máximo de **2 itens por pessoa** em "Em Desenvolvimento" simultaneamente — evita dispersão em equipe de dois.

### 3.3 Ferramenta

GitHub Projects, vinculado diretamente ao repositório do código — cada card referencia a issue e o commit correspondente, mantendo rastreabilidade entre planejamento e implementação (conecta com o slide 6).

### 3.4 Cadência

- Reunião de alinhamento semanal (não cerimônia formal — checkpoint rápido)
- Revisão de fluxo a cada marco do cronograma (seção 9 do pré-projeto): requisitos → arquitetura → backend → frontend → testes → piloto

**Conteúdo visual sugerido para o slide:** captura de tela do quadro Kanban (ainda que com dados fictícios/exemplo) mostrando as 5 colunas e alguns cards de exemplo com os RFs do slide 4.

---

## Slide 4 — Requisitos Funcionais e Não Funcionais

### 4.1 Requisitos Funcionais (RF)

| Código | Descrição |
|---|---|
| RF01 | Cadastrar estudante e emitir convite de consentimento ao responsável legal |
| RF02 | Registrar consentimento (concessão/revogação) com trilha de auditoria |
| RF03 | Registrar observação comportamental estruturada do docente a cada ciclo quinzenal |
| RF04 | Registrar observações complementares do responsável e do profissional de saúde |
| RF05 | Converter observações em parâmetros técnicos de adaptação, por regras determinísticas |
| RF06 | Submeter os parâmetros do ciclo à validação do profissional de saúde |
| RF07 | Processar aprovação, solicitação de ajuste, ou expiração automática da validação (7 dias) |
| RF08 | Gerar material didático adaptado a partir de texto inserido e dos parâmetros vigentes |
| RF09 | Aplicar a camada determinística de adaptação (tipografia, espaçamento, segmentação, contraste) |
| RF10 | Aplicar a camada assistida por IA (simplificação lexical, recontextualização), quando habilitada |
| RF11 | Permitir revisão, edição e aprovação humana do material antes da publicação |
| RF12 | Exportar o material em versão web acessível e versão para impressão |
| RF13 | Registrar o desfecho da aplicação do material em sala |
| RF14 | Controlar acesso por papel (RBAC) e por informação (permissões granulares) |
| RF15 | Exportar ou excluir os dados do estudante mediante solicitação do responsável |

### 4.2 Requisitos Não Funcionais (RNF)

| Código | Categoria | Descrição |
|---|---|---|
| RNF01 | Usabilidade | Pontuação SUS igual ou superior a 68 |
| RNF02 | Desempenho | Geração de material adaptado em menos de 60 segundos |
| RNF03 | Acessibilidade | Conformidade com WCAG 2.2 nível AA e ABNT NBR 17225 |
| RNF04 | Segurança | Permissões aplicadas no banco (RLS), autenticação JWT, TLS em trânsito |
| RNF05 | Disponibilidade | Cache de leitura offline via Service Worker para materiais já gerados |
| RNF06 | Portabilidade | PWA instalável em Android, iOS e desktop via navegador |
| RNF07 | Manutenibilidade | Cobertura de testes automatizados igual ou superior a 70% |
| RNF08 | Confiabilidade | Camada determinística funcional sem dependência de serviços externos |
| RNF09 | Conformidade legal | Aderência à LGPD — minimização de dados e consentimento granular |
| RNF10 | Escalabilidade | Arquitetura serverless (Edge Functions) suporta pico de uso concentrado (domingo à noite) |

💡 **Para o slide:** não caber as duas tabelas inteiras — dividir em dois blocos visuais (RF à esquerda, RNF à direita) com 5-6 itens mais representativos cada, e falar os demais oralmente ou colocar completo nas notas do apresentador.

---

## Slide 5 — Regras de Negócio

| Código | Regra |
|---|---|
| RN01 | Nenhum perfil de aprendizagem é criado sem consentimento explícito do responsável legal |
| RN02 | O docente não tem acesso ao laudo ou diagnóstico clínico do estudante — apenas a observações e parâmetros |
| RN03 | Elevação de parâmetro exige 2 ciclos consecutivos de observação "ampliada"; redução aplica-se no ciclo imediato (assimetria conservadora) |
| RN04 | Nenhum material chega ao estudante sem aprovação explícita do docente |
| RN05 | Sem resposta do profissional de saúde em 7 dias, mantém-se vigente o último conjunto de parâmetros aprovado |
| RN06 | Sem profissional de saúde vinculado, o sistema opera em modo pedagógico — apenas camada determinística |
| RN07 | A validação clínica incide sobre o conjunto de parâmetros do ciclo, nunca sobre material individual |
| RN08 | O responsável pode revogar o consentimento a qualquer momento, com bloqueio imediato de novas gerações |

💡 **A RN03 é a mais interessante de explicar no slide** — é a única regra de negócio que expressa uma decisão de design deliberada (o sistema erra a favor do material mais acessível, nunca do menos). Vale destacar visualmente com um pequeno diagrama:

```
Observação "ampliada"  →  ciclo 1: aguarda
                        →  ciclo 2: parâmetro sobe de nível

Observação "reduzida"  →  ciclo 1: parâmetro desce imediatamente
```

---

## Slide 6 — Rastreabilidade

Rastreabilidade liga **requisito → objetivo do projeto → critério de teste/aceite**, provando que nada foi implementado sem propósito e que tudo é verificável.

### Exemplo 1 — Consentimento

| Etapa | Conteúdo |
|---|---|
| Requisito | RF01, RF02 — cadastro e consentimento |
| Objetivo específico | Modelagem do sistema (fluxo de consentimento do responsável legal) |
| Regra de negócio | RN01 — nenhum perfil sem consentimento |
| Critério de teste | Tentativa de criar perfil de aprendizagem sem registro de consentimento aprovado deve ser bloqueada pela API, retornando erro de autorização |

### Exemplo 2 — Validação clínica

| Etapa | Conteúdo |
|---|---|
| Requisito | RF05, RF06, RF07 — conversão e validação de parâmetros |
| Objetivo específico | Implementação do fluxo de validação clínica |
| Regra de negócio | RN05 — fallback de 7 dias sem resposta |
| Critério de teste | Simular ciclo sem resposta do profissional por 7 dias; verificar que o sistema mantém a versão anterior vigente e sinaliza a pendência à coordenação |

### Exemplo 3 — Controle de acesso

| Etapa | Conteúdo |
|---|---|
| Requisito | RF14 — controle de acesso por papel e por informação |
| Objetivo específico | Modelagem do sistema (matriz de permissões) |
| Regra de negócio | RN02 — docente sem acesso ao laudo clínico |
| Critério de teste | Autenticado como docente, executar chamada direta à API solicitando o campo de laudo clínico; verificar retorno 403 mesmo com token válido |

💡 **Para o slide:** montar como matriz/tabela única com as colunas **Requisito → Objetivo → Regra → Teste**, uma linha por exemplo. Fica compacto e mostra a cadeia completa de rastreabilidade em uma imagem só.

---

## Slide 7 — ISO/IEC 25010

A norma define 8 características de qualidade de produto de software. Mapeamento de cada uma ao PEI Vivo:

| Característica | Como o PEI Vivo atende |
|---|---|
| **Adequação funcional** | Os 15 requisitos funcionais (slide 4) cobrem integralmente os casos de uso do ciclo observar→validar→adaptar→retroalimentar |
| **Eficiência de desempenho** | RNF02 — geração de material em menos de 60 segundos, mesmo em rede móvel |
| **Compatibilidade** | Arquitetura PWA multiplataforma; exportação de dados em formato legível para portabilidade entre instituições (RF15) |
| **Usabilidade** | Interface mobile-first, fluxo docente completável em menos de 60 segundos, validado pela escala SUS (meta ≥ 68) |
| **Confiabilidade** | Camada determinística funciona sem dependência de serviços externos; fallback automático na ausência de validação clínica (RN05, RN06) |
| **Segurança** | Row Level Security no banco, autenticação JWT, separação estrita entre dado pedagógico e dado clínico, consentimento granular e revogável (RNF04, RNF09) |
| **Manutenibilidade** | TypeScript com tipagem estática, regras de conversão versionadas e testáveis isoladamente, cobertura de testes ≥ 70% (RNF07) |
| **Portabilidade** | PWA instalável sem loja de aplicativos, hospedagem em Vercel/Netlify e Supabase Cloud, sem dependência de infraestrutura proprietária (RNF06) |

💡 **Para o slide:** este é o mais denso — considerar dividir em duas colunas de 4 características cada, ou usar ícones por característica para não virar parede de texto. As três mais fortes para destacar oralmente na apresentação: **Segurança** (é o diferencial ético do projeto), **Confiabilidade** (prova que não é wrapper de IA) e **Usabilidade** (prova que o professor realmente vai usar).

---

## Próximos passos

- [ ] Revisar se a dupla concorda com os 3 sistemas escolhidos para o slide 2
- [ ] Decidir se RF/RNF completos vão no slide ou só um recorte (com o restante em anexo/apêndice)
- [ ] Capturar screenshot real do quadro Kanban no GitHub Projects para o slide 3
- [ ] Definir o template visual (cores, fonte) antes de montar o .pptx
- [ ] Confirmar limite de slides da disciplina (este mapeamento assume 7, um por item pedido)
