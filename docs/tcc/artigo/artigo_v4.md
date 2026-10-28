<!--
Versão 4 (28/10/2026): artigo_revisado.md reorganizado no modelo do artigo REWORK aprovado
para a pré-banca (mesma orientadora). As versões anteriores ficam preservadas.
Gera o .docx com:
  python scripts/artigo/gerar_docx.py docs/tcc/artigo/artigo_v4.md docs/tcc/artigo/Artigo_PEI_Vivo_v4.docx
Estrutura do modelo: sem capa, resumo nem abstract; título com autores e notas de autoria no
rodapé; 1 Introdução (problema, pergunta, objetivos e justificativa em texto corrido);
2 Referencial teórico com sistemas semelhantes; 3 Metodologia com classificação, coleta,
requisitos em Tabelas 1–3, diagramas UML, cronograma em quadro, tecnologias e base de dados;
4 Resultados e 5 Considerações finais ficam para a N2; referências; 6 Declaração de IA.
Saíram desta versão (continuam em artigo_revisado.md): resumo/abstract, os quadros de tipos
enumerados e de operações das classes e a listagem de código do motor.
Marcadores [PREENCHER], [CONFERIR] e [CONFIRMAR COM O AVALIADOR] saem em amarelo.
-->

# PEI VIVO: SISTEMA WEB PARA ADAPTAÇÃO CONTÍNUA DE MATERIAL DIDÁTICO A PARTIR DE OBSERVAÇÃO PEDAGÓGICA VALIDADA POR PROFISSIONAL DE SAÚDE

@autores-rodape

# 1. INTRODUÇÃO

O crescimento das matrículas da Educação Especial no Brasil evidencia um avanço expressivo no acesso à escolarização de estudantes com deficiência e transtornos do neurodesenvolvimento: em 2025, essas matrículas alcançaram 2,5 milhões, um aumento de 82% em relação a 2021, com mais de 90% dos estudantes já inseridos em classes comuns do ensino regular, segundo o Censo Escolar do Instituto Nacional de Estudos e Pesquisas Educacionais Anísio Teixeira (Inep, 2026). Esse avanço, contudo, não veio acompanhado de igual fortalecimento da estrutura pedagógica: o mesmo levantamento indica que apenas 11,3% das equipes gestoras escolares possuem formação continuada específica em Educação Especial. Um dos instrumentos usados para responder a essa demanda é o Plano Educacional Individualizado (PEI), que se apoia nas obrigações do art. 28 da Lei Brasileira de Inclusão, entre elas a adoção de adaptações razoáveis e de medidas individualizadas (Brasil, 2015). A literatura nacional, entretanto, aponta a baixa operacionalização desse instrumento: Silva e Camargo (2021) concluíram que a produção acadêmica brasileira não explica de forma clara como o PEI pode ou deve ser elaborado e executado, e Pereira e Pereira (2022) observaram que, mesmo onde o plano é elaborado, o trabalho colaborativo na sua implementação ainda é deficitário.

Para os casos de dislexia e Transtorno do Déficit de Atenção com Hiperatividade (TDAH), a Lei nº 14.254 determina o acompanhamento integral do educando, com articulação entre a rede de ensino e a rede de saúde (Brasil, 2021). No levantamento exploratório realizado neste trabalho (seção 3.1.1), 63,0% dos 27 respondentes descreveram a comunicação atual entre escola, família e saúde como informal e fragmentada, conduzida predominantemente por aplicativos de mensagens, sem histórico recuperável nem continuidade entre ciclos letivos. Mesmo quando o conhecimento sobre o estudante é registrado, sua conversão em material didático acessível exige que o docente reescreva cada texto segundo as necessidades de cada estudante, tarefa que concorre com o tempo de planejamento de uma turma numerosa e que, por isso, frequentemente não ocorre. [PREENCHER: se a dupla cronometrar docentes adaptando o mesmo texto, inserir aqui o tempo medido e o método; caso contrário, manter a frase sem número.]

Como solução para esse cenário, o projeto PEI Vivo propõe um sistema web que organiza um ciclo quinzenal de acompanhamento do estudante: observar, validar, adaptar e retroalimentar. O docente, a família e o profissional de saúde registram observações em seis dimensões observáveis; um motor de regras determinísticas converte essas observações em parâmetros de adaptação; o profissional de saúde valida o conjunto de parâmetros do ciclo; e o docente gera, revisa e aprova o material adaptado antes que ele chegue ao estudante. O sistema considera responsabilidades distintas entre os perfis envolvidos: o responsável legal concede ou revoga o consentimento e acompanha quem tem acesso aos dados; o docente regente observa, gera e aprova o material; o profissional de saúde valida os parâmetros; e a coordenação pedagógica cadastra estudantes e organiza os vínculos.

Assim, a problemática deste estudo está relacionada à necessidade de transformar o PEI em instrumento continuamente atualizado, e não apenas documental. Estabelece-se, portanto, a seguinte questão de pesquisa: como um sistema de informação pode integrar o registro periódico de observações pedagógicas, a validação técnica de profissional de saúde e a geração de material didático adaptado, protegendo dados pessoais sensíveis de crianças? Para responder a essa questão, o objetivo geral é desenvolver e avaliar o PEI Vivo, aplicação web que integra observações pedagógicas periódicas a um motor de adaptação de materiais didáticos, com validação do conjunto de parâmetros por profissional de saúde a cada ciclo, quando houver profissional vinculado, ou em modo exclusivamente pedagógico, quando não houver. Como objetivos específicos, busca-se modelar o ciclo por meio de requisitos, regras de negócio e diagramas UML; implementar um controle de acesso aplicado no banco de dados que negue toda tentativa de acesso indevido catalogada, independentemente da interface; implementar um motor de adaptação determinístico, auditável e testável de forma isolada; desenvolver um protótipo web acessível, aderente às WCAG 2.2 nível AA, com telas para os quatro perfis; e avaliar a usabilidade do protótipo pela escala SUS, com meta igual ou superior a 68 pontos.

A realização deste projeto justifica-se em três dimensões. No plano legal e social, o problema corresponde a uma obrigação normativa vigente e ainda sem instrumento operacional, conforme a Lei nº 14.254/2021. No plano tecnológico, as soluções de mercado consultadas (seção 2.2) já combinam gestão do plano e adaptação de conteúdo por inteligência artificial (IA), mas nenhuma integra ao ciclo a validação por profissional de saúde nem oferece uma adaptação que funcione sem IA. No plano prático, o sistema pode reduzir o esforço da adaptação docente e preservar o conhecimento sobre o estudante entre ciclos letivos e trocas de professor, uma vez que o perfil pertence ao estudante e não ao docente. Há ainda uma justificativa de proteção de dados: informações sobre a saúde de crianças são dados pessoais sensíveis e exigem consentimento específico de pelo menos um dos pais ou responsável (Brasil, 2018, art. 11 e 14). Um sistema que circula esse tipo de informação entre escola e saúde precisa demonstrar, e não apenas declarar, que cada pessoa acessa somente o necessário ao seu papel.

O trabalho relaciona-se aos Objetivos de Desenvolvimento Sustentável 4 (Educação de Qualidade), em especial à meta 4.5, que trata do acesso igualitário à educação para pessoas com deficiência, e 3 (Saúde e Bem-Estar), ao formalizar a participação da rede de saúde no acompanhamento escolar (Organização das Nações Unidas, 2015). O escopo delimita-se ao ensino fundamental, com cenário de demonstração de um estudante fictício de nove anos, a escolas que adotem o sistema por iniciativa da coordenação pedagógica e a estudantes cujas famílias consintam com o uso.

Além da contribuição para a educação inclusiva, o desenvolvimento do PEI Vivo apresenta relevância acadêmica por aplicar conhecimentos relacionados à Engenharia de Software, banco de dados, segurança da informação, modelagem UML, desenvolvimento web e acessibilidade em um problema real da escola. Dessa forma, o projeto integra conhecimentos do curso de Sistemas de Informação a uma necessidade prática de acompanhamento do estudante, contribuindo para a articulação entre escola, família e saúde e para a adaptação do material didático com proteção dos dados da criança.

# 2. REFERENCIAL TEÓRICO

O referencial teórico fundamenta o desenvolvimento do PEI Vivo a partir de estudos sobre educação inclusiva e o Plano Educacional Individualizado, soluções semelhantes de apoio ao plano e à leitura, tecnologias web, bancos de dados com controle de acesso, adaptação de texto e acessibilidade, e organização do código. A discussão relaciona esses conceitos ao objetivo do projeto: manter o PEI atualizado a cada ciclo e convertê-lo em material adaptado, com a participação da escola, da família e da saúde.

## 2.1 Educação inclusiva e o Plano Educacional Individualizado

Silva e Camargo (2021) definem o Plano Educacional Individualizado como uma metodologia de trabalho colaborativa, centrada no estudante com deficiência e elaborada a partir de sua série, idade, grau de desenvolvimento, habilidades e conhecimentos prévios, para estabelecer objetivos de aprendizagem de curto, médio e longo prazos e avaliar o progresso do estudante. A Lei Brasileira de Inclusão não nomeia o PEI, mas incumbe ao poder público assegurar adaptações razoáveis que garantam o pleno acesso ao currículo (art. 28, III), a adoção de medidas individualizadas e coletivas que maximizem o desenvolvimento acadêmico e social dos estudantes com deficiência (art. 28, V) e a elaboração de plano de atendimento educacional especializado (art. 28, VII) (Brasil, 2015).

Para educandos com dislexia, TDAH ou outro transtorno de aprendizagem, a Lei nº 14.254/2021 determina que o poder público mantenha programa de acompanhamento integral, que compreende a identificação precoce, o encaminhamento para diagnóstico, o apoio educacional na rede de ensino e o apoio terapêutico especializado na rede de saúde (art. 1º, parágrafo único). A mesma lei estabelece que as necessidades específicas do educando serão atendidas pelos profissionais da rede de ensino em parceria com profissionais da rede de saúde (art. 4º) e descreve esses educandos pelo efeito observável na aprendizagem, ao tratar de alterações no desenvolvimento da leitura e da escrita, ou de instabilidade na atenção, que repercutam na aprendizagem (art. 3º) (Brasil, 2021). É nessa parceria entre escola e saúde, centrada no que se observa na escola, que o PEI Vivo apoia a validação dos parâmetros pelo profissional de saúde.

Na produção acadêmica, Silva e Camargo (2021) analisaram 16 artigos nacionais sobre o PEI e concluíram que essa produção não o operacionaliza; apenas um dos artigos demonstrou contribuições do uso do PEI para o estudante. Pereira e Pereira (2022), em estudo documental em escola municipal de Campo Grande (MS), verificaram que o PEI era elaborado e aplicado, mas que o entendimento sobre o trabalho colaborativo na sua implementação ainda era deficitário. Fontana e Cruz (2022) identificaram o PEI como ferramenta pedagógica importante para organizar o ensino, e Battistello, Lisboa e Martins (2024) o tratam como instrumento norteador para a inclusão de estudantes autistas no ensino regular. Modesto, Araújo e Mendonça (2023), ao analisar a rede estadual de Sergipe, identificaram avanços acompanhados de investimento público insuficiente e de falta de formação continuada de professores. [CONFERIR: Battistello, Lisboa e Martins (2024), Modesto, Araújo e Mendonça (2023) e Fontana e Cruz (2022) foram conferidos pelo resumo; ler os três antes da entrega.]

Em conjunto, esses estudos indicam que o PEI é reconhecido como instrumento relevante, mas carece de operacionalização e de trabalho colaborativo efetivo. Nenhum deles trata de sistemas de informação: a hipótese de que um sistema que mantenha o plano atualizado ciclo a ciclo, com escola, família e saúde, possa reduzir essa lacuna é deste trabalho.

## 2.2 Sistemas semelhantes e apoio ao PEI

Soluções de apoio ao plano individualizado e à adaptação de material procuram reduzir o esforço do docente na elaboração do plano e na preparação de atividades acessíveis. Foram considerados apenas produtos com documentação pública verificável, consultada pelos autores em 13/10/2026 e conferida novamente em 26/10/2026; nenhum deles é de autoria dos autores deste trabalho. Como a comparação depende do que cada fornecedor publica, uma característica não documentada aparece como tal, e não como ausente.

A plataforma brasileira Prova Adaptada, oferecida também sob o nome IncluiAI (Prova Adaptada, 2026), utiliza inteligência artificial para gerar o PEI e adaptar atividades e provas elaboradas pelo docente, sem descrever perfil individual atualizado ciclo a ciclo, validação por profissional de saúde nem modo de funcionamento sem IA. A plataforma Vínculoo (Vínculoo, 2026) organiza o PEI e o Plano de Atendimento Educacional Especializado em um padrão único, prevê devolutiva à família e oferece um assistente de IA que lê laudos e observações, rascunha metas e adapta a atividade da turma, com revisão final do professor; menciona equipe multidisciplinar, sem descrever validação formal por profissional de saúde.

No cenário internacional, as plataformas Frontline Education (Frontline Education, 2026) e Goalbook Toolkit (Goalbook, 2026) apoiam o Individualized Education Program (IEP), equivalente ao PEI, com foco na conformidade regulatória, na escrita colaborativa do plano e na redação de metas, sem descrever a geração do material usado em sala. Já o Leitor Imersivo da Microsoft (Microsoft, 2024) é uma ferramenta de leitura que isola o texto, lê em voz alta, separa sílabas e exibe imagens para palavras comuns, voltada a leitores iniciantes e a pessoas com dislexia; ele apoia a leitura de qualquer texto, mas não mantém plano individual, perfil do estudante nem fluxo entre escola, família e saúde.

O PEI Vivo aplica princípios semelhantes aos dessas duas famílias de solução: do lado do plano, mantém um perfil por estudante com seis parâmetros, recalculado a cada ciclo e validado pelo profissional de saúde vinculado; do lado do material, gera o texto adaptado por regras determinísticas, com apoios de leitura semelhantes aos do Leitor Imersivo, mas parametrizados pelo perfil e sempre aprovados pelo docente. A comparação, resumida no Quadro 1, serve como referência conceitual, sem afirmar que as funcionalidades ou os resultados dos sistemas analisados sejam iguais aos do projeto.

Quadro 1 – Comparação entre o PEI Vivo e sistemas semelhantes

| Critério | Prova Adaptada (IncluiAI) | Vínculoo | Frontline / Goalbook | Leitor Imersivo | PEI Vivo |
|---|---|---|---|---|---|
| Perfil individual atualizado por ciclo | N/D | N/D (revisões do PEI) | Metas do IEP | Não | Sim (6 parâmetros, ciclo quinzenal) |
| Participação formal da saúde | N/D | N/D (equipe multidisciplinar) | N/D | Não | Validação do conjunto de parâmetros |
| Geração de material adaptado | Sim (IA) | Sim (IA, a partir de documentos e laudos) | N/D | Não (apoia a leitura de texto pronto) | Sim (regras determinísticas, sem laudo) |
| Apoios de leitura no material | N/D | N/D | Não se aplica | Sim (voz, sílabas, imagens, tradução) | Sim (blocos, etapas, glossário, pictograma, voz) |
| Funciona sem IA | N/D | N/D | Não se aplica | Sim | Sim (IA desligada por padrão) |
| Consentimento granular e revogável | N/D | N/D | N/D | Não se aplica | Sim (4 escopos, revogação imediata) |
| Permissões aplicadas no banco e auditadas | N/D | N/D | Acesso por papel (camada não documentada) | Não se aplica | Sim (RLS em 15 tabelas e auditoria) |

Fonte: PEI Vivo (2026), com base na documentação pública das soluções e no código-fonte do projeto. N/D: não documentado pelo fornecedor.

## 2.3 Tecnologias utilizadas no desenvolvimento web

A construção de sistemas de informação demanda escolhas arquiteturais que equilibrem manutenibilidade, desempenho, segurança e confiabilidade, características de qualidade definidas na norma ISO/IEC 25010 (International Organization for Standardization, 2023). No PEI Vivo, adotou-se a linguagem TypeScript em todas as camadas, por sua tipagem estática, que permite detectar em tempo de compilação uma configuração inválida de parâmetros de adaptação. A interface foi construída com a biblioteca React e a ferramenta de build Vite.

No lado do servidor, o projeto utiliza a plataforma Supabase, que reúne o banco PostgreSQL, autenticação com segundo fator (TOTP) e funções serverless, as Edge Functions, executadas fora do navegador (Supabase, 2025). Nessa plataforma, o navegador acessa o banco diretamente por uma API gerada a partir do esquema; por isso, a documentação orienta a habilitar o controle de acesso por linha em todas as tabelas expostas (Supabase, 2025). Essa característica explica a divisão adotada: leituras e escritas simples passam pelas políticas do banco, enquanto as operações que precisam de credenciais de serviço, como gerar material e fechar um ciclo, ficam em Edge Functions, que conferem de novo, no banco, o papel e o consentimento de quem as chama.

A escolha dessas tecnologias está alinhada à natureza web do PEI Vivo e à necessidade de disponibilizar as mesmas regras de acesso para todos os perfis, em uma interface comum, sem que a segurança dependa da tela utilizada.

## 2.4 Banco de dados, proteção de dados e controle de acesso

O tratamento de dados de crianças e adolescentes com deficiência envolve dado pessoal sensível, definido pela Lei Geral de Proteção de Dados (LGPD) como, entre outros, o dado referente à saúde vinculado a uma pessoa natural (Brasil, 2018, art. 5º, II e art. 11), e exige consentimento específico e em destaque dado por pelo menos um dos pais ou pelo responsável legal (Brasil, 2018, art. 14, § 1º). A lei também impõe os princípios da finalidade, da necessidade, da segurança, da prevenção e da responsabilização e prestação de contas (Brasil, 2018, art. 6º, I, III, VII, VIII e X), segundo os quais cada pessoa deve acessar apenas o mínimo necessário à sua função e o controlador deve demonstrar a adoção de medidas eficazes.

Para atender a esses princípios de forma verificável, o PEI Vivo adota o sistema gerenciador de banco de dados relacional PostgreSQL, que oferece Row Level Security (RLS): políticas que restringem, na própria camada do banco, quais linhas de uma tabela cada usuário autenticado pode ler ou modificar (PostgreSQL Global Development Group, 2025). Com isso, a restrição de acesso de um docente às notas reservadas do profissional de saúde, por exemplo, é aplicada pelo banco independentemente da interface, o que impede que a informação seja obtida por chamada direta à interface de programação de aplicações (API).

A LGPD também assegura ao titular, ou ao responsável no caso de crianças, os direitos de acesso aos dados, de eliminação dos dados tratados com consentimento e de revogação do consentimento (Brasil, 2018, art. 18, II, VI e IX), e determina que controlador e operador mantenham registro das operações de tratamento (Brasil, 2018, art. 37). No PEI Vivo, esses dispositivos orientam a revogação do consentimento com bloqueio imediato das gerações, a exportação dos dados do estudante a pedido do responsável e uma tabela de auditoria, escrita apenas por gatilhos do banco, que registra concessões, revogações, fechamentos de ciclo, validações e cada leitura de nota clínica.

## 2.5 Adaptação de texto, acessibilidade e protótipo

O Transtorno do Espectro Autista (TEA), o TDAH e a dislexia são transtornos do neurodesenvolvimento com manifestações distintas, mas com efeitos convergentes sobre a leitura de materiais escolares (American Psychiatric Association, 2023). No TDAH, a dificuldade de sustentar a atenção torna textos longos e enunciados com várias instruções encadeadas mais custosos; na dislexia, a decodificação mais lenta aumenta o peso de vocabulário pouco frequente e de blocos densos de texto; no TEA, a sensibilidade sensorial e a preferência por instruções explícitas tornam relevantes o contraste visual, a previsibilidade da estrutura e o uso de interesses específicos como ponto de entrada. Por isso o sistema registra seis dimensões observáveis (atenção sustentada, compreensão de enunciados, autonomia com palavras, interesse manifesto, sensibilidade visual e cansaço na tarefa), em escala de três pontos (reduzida, estável, ampliada), e não armazena laudo nem diagnóstico.

O Desenho Universal para a Aprendizagem (DUA) propõe oferecer múltiplos meios de engajamento, de representação e de ação e expressão, reduzindo barreiras sem alterar o objetivo de aprendizagem (CAST, 2018). O PEI Vivo atua sobretudo no segundo princípio: o texto é o mesmo da turma, mas apresentado em blocos de poucas linhas, com enunciados compostos divididos em etapas, contraste mínimo configurável, limite de blocos por material e apoios de leitura (pictograma por etapa, glossário de palavras e leitura em voz alta). Cada dimensão observada corresponde a um parâmetro de apresentação; essa correspondência é uma hipótese de projeto, e não uma relação estabelecida pela literatura consultada, e por isso cada parâmetro é explícito, limitado a uma faixa válida e ajustável pelo profissional de saúde a cada ciclo.

As WCAG 2.2 organizam os critérios de acessibilidade em quatro princípios, segundo os quais o conteúdo deve ser perceptível, operável, compreensível e robusto (World Wide Web Consortium, 2024), também incorporados à ABNT NBR 17225 (Associação Brasileira de Normas Técnicas, 2025). Os limiares de contraste adotados (4,5:1 e 7:1) correspondem aos critérios de sucesso 1.4.3 (nível AA) e 1.4.6 (nível AAA), e a preferência por fontes sem serifa encontra apoio em Rello e Baeza-Yates (2013), que mediram o desempenho de leitura de pessoas com dislexia em diferentes fontes. No sistema, esses critérios valem para dois públicos: as pessoas que usam as telas e o estudante que recebe o material.

No projeto, o protótipo permite organizar a interação conforme os perfis e demonstrar como as informações circulam entre as etapas do ciclo. Todo material gerado passa por revisão e aprovação explícita do docente antes de chegar ao estudante, de modo que a adaptação automática é sempre uma proposta, e não uma publicação, e o material existe em versão web acessível e em versão para impressão, o que atende escolas com poucos equipamentos. A existência do protótipo, por si só, não comprova a usabilidade nem a eficácia pedagógica; essas conclusões exigem a avaliação com usuários pela System Usability Scale (SUS), instrumento breve para avaliar a percepção dos usuários sobre a facilidade de uso (Brooke, 1996).

## 2.6 Código e organização da aplicação

A separação entre uma camada determinística, implementada como código-fonte auditável, e uma camada opcional assistida por modelo de linguagem decorre de exigência de confiabilidade: regras que alteram o material recebido por uma criança devem ser verificáveis e reproduzíveis, condição que código determinístico satisfaz e que a saída de um modelo de linguagem não garante. No PEI Vivo, a camada de IA existe no código, porém está desligada por padrão e, quando ligada, só recebe o texto e os parâmetros, nunca dados do estudante.

Para que a mesma regra valha em todas as camadas, o código foi organizado em pacotes independentes: o motor de adaptação, com funções puras sem acesso a banco ou rede; os casos de uso das Edge Functions, que recebem o banco e os serviços externos como dependências injetadas e, por isso, são testáveis sem infraestrutura; e os contratos de entrada e saída, escritos uma única vez com a biblioteca Zod e usados tanto na validação dos formulários quanto na validação das requisições no servidor. Essa separação permite verificar cada regra isoladamente antes de integrá-la ao banco e à interface, e torna mais simples localizar e corrigir inconsistências.

# 3. METODOLOGIA

A pesquisa é aplicada, exploratória e descritiva, orientada ao desenvolvimento de um artefato computacional para apoiar o acompanhamento do estudante e a adaptação de material didático. A metodologia contempla o levantamento das necessidades, a modelagem UML, a definição das tecnologias web, a estruturação da base PostgreSQL com políticas de acesso e o desenvolvimento do protótipo. O processo foi organizado incrementalmente, com definição de requisitos, regras de negócio e procedimentos de verificação para cada parte do ciclo.

## 3.1 Classificação da pesquisa

Quanto à natureza, a pesquisa é aplicada, por ter como finalidade a geração de conhecimento dirigido à solução de um problema específico (Prodanov; Freitas, 2013). Quanto aos objetivos, é exploratória e descritiva. Quanto aos procedimentos, segue a Design Science Research (Hevner et al., 2004; Dresch; Lacerda; Antunes Júnior, 2015), abordagem que orienta a construção de um artefato para resolver um problema relevante e a sua avaliação com critérios definidos previamente. O artefato é o PEI Vivo; a avaliação combina verificação técnica automatizada e avaliação de usabilidade com usuários (seção 3.4). Não houve experimento controlado. [CONFIRMAR COM O AVALIADOR: a versão avaliada classificava os procedimentos como pesquisa bibliográfica e experimental; a classificação mudou porque não houve manipulação de variáveis com grupo de controle.]

### 3.1.1 Participação na pesquisa e instrumento de coleta

A coleta de dados foi realizada por meio de um questionário eletrônico no Google Forms, aplicado em setembro de 2026 a 27 pessoas envolvidas no acompanhamento de estudantes neurodivergentes: 12 responsáveis, 10 profissionais de apoio escolar e 5 docentes. O questionário abordou a comunicação atual entre escola, família e saúde, a avaliação da proposta em escala de 1 a 5 e as preocupações com a plataforma. Nenhum profissional de saúde respondeu, o que constitui limitação relevante, já que esse é o perfil que valida os parâmetros no sistema. Por se tratar de uma amostra por conveniência, os resultados representam as percepções dos participantes, não podendo ser generalizados.

Para 63,0% dos respondentes a comunicação atual é informal e fragmentada, enquanto 18,5% discordaram dessa afirmação. A proposta recebeu nota 4 ou 5 de 81,5% (22 de 27). As preocupações mais citadas foram a dependência de tecnologia em escolas com poucos recursos (59,3%), a privacidade dos dados da criança (51,9%) e a confiabilidade do material gerado por IA (37,0%); 11,1% não indicaram preocupação. [CONFERIR: recontar cada percentual na planilha original com CONT.SE antes da entrega.]

Como a pergunta de avaliação foi feita logo após a apresentação da proposta pelos autores, o resultado indica aceitação inicial do conceito, e não validação do produto. As regras de privacidade já constavam da especificação antes da coleta; as respostas as confirmaram, e a preocupação com dependência de tecnologia orientou a decisão de manter uma camada que funciona sem IA e a versão impressa do material.

O formulário coletou nome e e-mail dos participantes, dado que não era necessário à análise, e não apresentou Termo de Consentimento Livre e Esclarecido (TCLE). Para a análise, as respostas foram codificadas de R01 a R27 e os identificadores foram descartados. [CONFERIR: executar a anonimização antes de citar esta frase.] A pesquisa de opinião com participantes não identificados está dispensada de registro no sistema CEP/Conep (Brasil, 2016, art. 1º, parágrafo único, I) [CONFERIR: inciso com a orientadora]; a avaliação de usabilidade usa formulário anônimo com TCLE na primeira página.

## 3.2 Método de desenvolvimento e modelagem UML

O desenvolvimento do PEI Vivo foi planejado de forma iterativa porque a solução reúne módulos interdependentes e atende a perfis com responsabilidades diferentes. A construção foi organizada em marcos: especificação (requisitos, regras de negócio e modelagem UML), banco de dados com políticas de acesso, motor de adaptação, protótipo de interface e, após uma auditoria interna em 07/10/2026 que encontrou 25 de 31 tentativas de acesso indevido aceitas pelas políticas da época, uma reformulação em seis marcos: banco que nega, autenticação real, regras no servidor, experiência de uso e verificação final. Cada decisão de projeto foi registrada com código próprio e justificativa, e o trabalho foi acompanhado em quadro Kanban no GitHub. O repositório está disponível em https://github.com/geandreac/tcc-peivivo.

### 3.2.1 Requisitos Funcionais

Os requisitos funcionais descrevem as ações que o sistema PEI Vivo deve executar para atender aos perfis envolvidos no acompanhamento do estudante, da obtenção do consentimento à exportação dos dados. Em 26/10/2026, todos estavam implementados, exceto o RF10, desligado por padrão, e a exclusão de dados prevista no RF15. Conforme citado na Tabela 1:

Tabela 1 – Requisitos Funcionais

| ID | Requisito Funcional | Descrição |
|---|---|---|
| RF01 | Cadastrar estudante e vínculos | Permitir à coordenação cadastrar o estudante e propor os vínculos de docente e de profissional de saúde. |
| RF02 | Registrar consentimento | Permitir ao responsável conceder ou revogar o consentimento por escopo, com registro na trilha de auditoria. |
| RF03 | Registrar observação do docente | Permitir ao docente registrar, a cada ciclo quinzenal, a observação estruturada das seis dimensões. |
| RF04 | Registrar observações complementares | Permitir ao responsável e ao profissional de saúde registrar suas observações no mesmo ciclo. |
| RF05 | Calcular parâmetros | Converter as observações do ciclo em parâmetros de adaptação por regras determinísticas. |
| RF06 | Submeter à validação | Enviar os parâmetros do ciclo para a validação do profissional de saúde vinculado. |
| RF07 | Processar a validação | Registrar aprovação, pedido de revisão ou ajuste e expirar a proposta sem resposta em 7 dias. |
| RF08 | Gerar material adaptado | Gerar o material a partir do texto inserido pelo docente e dos parâmetros vigentes. |
| RF09 | Aplicar camada determinística | Segmentar o texto, dividir enunciados em etapas e aplicar contraste e apoios de leitura. |
| RF10 | Aplicar camada de IA | Simplificar o vocabulário com modelo de linguagem, quando habilitada (desligada por padrão). |
| RF11 | Revisar e aprovar material | Permitir ao docente revisar, editar e aprovar o material antes que ele chegue ao estudante. |
| RF12 | Exibir material | Exibir o material em versão web acessível e em versão para impressão. |
| RF13 | Registrar desfecho | Permitir ao docente registrar o resultado da aplicação do material em sala. |
| RF14 | Controlar acesso | Restringir cada leitura e escrita ao papel do usuário e à informação acessada. |
| RF15 | Exportar ou excluir dados | Permitir ao responsável exportar os dados do estudante e solicitar sua exclusão. |

Fonte: PEI Vivo (2026).

[CONFIRMAR COM O AVALIADOR: na parte de requisitos funcionais, o avaliador mencionou "Payday 2006" (transcrição). Confirmar o nome exato da obra e acrescentar a referência só depois de conferida.]

### 3.2.2 Requisitos Não-Funcionais

Os requisitos não funcionais estabelecem atributos de qualidade e restrições de operação da aplicação, alinhados às características da ISO/IEC 25010. Para que possam ser verificados, são descritos em termos observáveis. O RNF05 foi revisto durante o desenvolvimento: guardar materiais no navegador para leitura sem conexão exporia dados de criança em aparelhos compartilhados, e por isso nenhum dado de estudante é armazenado no dispositivo. Conforme citado na Tabela 2:

Tabela 2 – Requisitos Não-Funcionais

| ID | Requisito Não-Funcional | Descrição |
|---|---|---|
| RNF01 | Usabilidade | A interface deve alcançar pontuação igual ou superior a 68 na escala SUS. |
| RNF02 | Desempenho | A geração de material adaptado deve ocorrer em menos de 60 segundos. |
| RNF03 | Acessibilidade | As telas devem atender às WCAG 2.2 nível AA e à ABNT NBR 17225. |
| RNF04 | Segurança | Permissões no banco (RLS), segundo fator para saúde e coordenação e TLS em trânsito. |
| RNF05 | Privacidade | Nenhum dado de estudante deve ser armazenado no navegador. |
| RNF06 | Portabilidade | A aplicação web deve ser responsiva e instalável pelo navegador em Android, iOS e desktop. |
| RNF07 | Manutenibilidade | O motor e as funções devem ter cobertura de testes automatizados igual ou superior a 70%. |
| RNF08 | Confiabilidade | A camada determinística deve operar sem depender de serviços externos. |
| RNF09 | Conformidade legal | O tratamento deve aderir à LGPD, com minimização de dados e consentimento granular. |
| RNF10 | Escalabilidade | A arquitetura serverless deve absorver picos de uso concentrado. |

Fonte: PEI Vivo (2026).

### 3.2.3 Regras de Negócio

As regras de negócio definem as condições que orientam o funcionamento do PEI Vivo e a responsabilidade de cada perfil sobre as informações registradas, e independem da tecnologia adotada. A RN02 é uma decisão de projeto: a informação diagnóstica não altera a conduta pedagógica do docente e amplia o risco de rotulação, razão pela qual o sistema não armazena laudo nem diagnóstico, apenas a data em que um laudo foi apresentado à escola. A RN03 impõe assimetria deliberada, de modo que um eventual erro do sistema recaia sempre sobre o lado mais acessível do material. Conforme citado na Tabela 3:

Tabela 3 – Regras de Negócio

| ID | Regra de Negócio | Descrição |
|---|---|---|
| RN01 | Consentimento ativo | Sem consentimento ativo do responsável, nenhuma escrita nem geração ocorre para o estudante; a leitura fica restrita ao responsável e à coordenação. |
| RN02 | Sigilo clínico | O docente nunca lê nota clínica, apenas observações e parâmetros; o sistema não armazena laudo nem diagnóstico. |
| RN03 | Assimetria conservadora | Elevar um parâmetro exige dois ciclos consecutivos de observação "ampliada"; reduzi-lo é imediato. |
| RN04 | Aprovação docente | Nenhum material chega ao estudante sem aprovação explícita do docente. |
| RN05 | Expiração da validação | Sem validação em 7 dias, a proposta expira e permanece vigente a última versão aprovada, no máximo uma por estudante. |
| RN06 | Modo sem profissional | Sem profissional de saúde vinculado, apenas a camada determinística opera, sem IA. |
| RN07 | Validação por ciclo | A validação clínica incide sobre o conjunto de parâmetros do ciclo, nunca sobre material individual. |
| RN08 | Revogação imediata | O responsável pode revogar o consentimento a qualquer momento, com bloqueio imediato de novas gerações. |

Fonte: PEI Vivo (2026).

### 3.2.4 Diagrama de classes

As Figuras 1 a 3 representam o diagrama de classes do PEI Vivo, gerado a partir das migrações do banco, de modo que cada classe persistente corresponde a uma tabela. São 15 classes persistentes e 2 objetos de valor (ParametrosAdaptacao, com os seis parâmetros, e TextoAdaptado). Para que continue legível no papel, o diagrama foi dividido em três figuras por domínio: escola, pessoas e vínculos (Figura 1); estudante, consentimento, nota clínica e auditoria (Figura 2); e ciclo de observação, versão do perfil e material (Figura 3). Uma classe com borda tracejada é detalhada em outra figura; entre chaves estão as restrições garantidas pelo banco, como uma versão vigente por estudante e um consentimento ativo. A versão integral, em uma única imagem, está no repositório (docs/tcc/class_diagram.svg).

![Figura 1 – Diagrama de classes do PEI Vivo: escola, pessoas e vínculos](figuras/classes-1-pessoas.png){pagina}

Fonte: PEI Vivo (2026).

![Figura 2 – Diagrama de classes do PEI Vivo: estudante, consentimento, nota clínica e auditoria](figuras/classes-2-estudante.png)

Fonte: PEI Vivo (2026).

![Figura 3 – Diagrama de classes do PEI Vivo: ciclo de observação, versão do perfil e material](figuras/classes-3-ciclo.png){pagina}

Fonte: PEI Vivo (2026).

### 3.2.5 Diagrama de casos de uso

As Figuras 4 a 8 representam o diagrama de casos de uso do PEI Vivo, relacionando os atores (responsável legal, docente regente, profissional de saúde e coordenação pedagógica, além de um ator abstrato Usuário e do ator Tempo, que dispara diariamente a expiração das validações pendentes) às funcionalidades disponíveis conforme suas responsabilidades. São 28 casos de uso, dos quais 4 são subfluxos ligados por inclusão («include») ou extensão («extend»), como a aplicação condicional da camada de IA, que estende a geração de material. Para a leitura no papel, o diagrama foi dividido por perfil; a versão integral está no repositório (docs/tcc/usecase_diagram.svg).

![Figura 4 – Diagrama de casos de uso do PEI Vivo: casos comuns a todos os perfis](figuras/casos-1-usuario.png)

Fonte: PEI Vivo (2026).

![Figura 5 – Diagrama de casos de uso do PEI Vivo: responsável legal](figuras/casos-2-responsavel.png){cm=11}

Fonte: PEI Vivo (2026).

![Figura 6 – Diagrama de casos de uso do PEI Vivo: docente regente](figuras/casos-3-docente.png){paisagem}

Fonte: PEI Vivo (2026).

![Figura 7 – Diagrama de casos de uso do PEI Vivo: coordenação pedagógica](figuras/casos-4-coordenacao.png){cm=11}

Fonte: PEI Vivo (2026).

![Figura 8 – Diagrama de casos de uso do PEI Vivo: profissional de saúde e expiração automática](figuras/casos-5-saude.png){cm=11}

Fonte: PEI Vivo (2026).

### 3.2.6 Diagrama de sequência

A Figura 9 representa o diagrama de sequência do PEI Vivo e demonstra a ordem das interações durante a geração e a aprovação de material adaptado. A Edge Function valida o texto recebido e solicita ao banco, com a identidade do docente, a verificação de vínculo, consentimento e versão vigente; se alguma condição falha, a requisição é negada (erro 403) ou recusada por conflito (erro 409). Quando a camada de IA é permitida, ela atua antes do motor determinístico. O rascunho é gravado por uma função do banco que confere novamente as condições, e a aprovação recusa o material caso a família tenha revogado o consentimento depois da geração, evidenciando a comunicação entre interface, lógica da aplicação e persistência dos dados.

![Figura 9 – Diagrama de sequência do PEI Vivo: geração e aprovação de material adaptado](../sequence_diagram.png){pagina}

Fonte: PEI Vivo (2026).

### 3.2.7 Cronograma de atividades

O desenvolvimento do PEI Vivo foi organizado em etapas sequenciais entre agosto e dezembro de 2026, elaboradas em sala de aula com a orientação da professora responsável. A ordem segue a dependência técnica do projeto: o núcleo de dados e as políticas de acesso precedem o motor de adaptação, e a redação do texto corre em paralelo ao desenvolvimento. O período de 8 a 15 de dezembro fica reservado a imprevistos e à defesa. A síntese do cronograma é apresentada no Quadro 2.

Quadro 2 – Síntese do cronograma de desenvolvimento do PEI Vivo

| Etapa | Período | Atividades previstas |
|---|---|---|
| Fundamentação e linha de base | 24/08 a 06/09/2026 | Roteiro de entrevistas e revisão da contextualização. |
| Modelagem | 07/09 a 20/09/2026 | Modelo de dados, matriz de permissões, diagramas UML e protótipo de interface. |
| Back-end e segurança | 21/09 a 04/10/2026 | Supabase, esquema PostgreSQL, autenticação e políticas RLS. |
| Front-end | 05/10 a 18/10/2026 | Telas dos perfis, fluxo de consentimento e primeira auditoria de acessibilidade. |
| Motor de adaptação | 19/10 a 01/11/2026 | Camada determinística, Edge Function e camada assistida por IA. |
| Integração e testes | 02/11 a 15/11/2026 | Testes unitários, de ponta a ponta, de violação de RLS e com leitor de tela. |
| Validação com usuários | 16/11 a 22/11/2026 | Escala SUS, índice de legibilidade e pesquisa de aceitação. |
| Consolidação | 23/11 a 29/11/2026 | Ajustes a partir do retorno dos usuários e relatório de validação. |
| Versão final e entrega | 30/11 a 06/12/2026 | Implantação final, repositório documentado e preparação da defesa. |

Fonte: PEI Vivo (2026).

Na execução, até 13/10/2026, as cinco primeiras etapas foram concluídas, com o motor de adaptação e o protótipo antecipados e a etapa de back-end reforçada pela reformulação de outubro. Três itens mudaram por decisão de projeto: o protótipo foi feito diretamente em código, a aplicação não guarda dados no navegador para uso sem conexão e a camada de IA está implementada, mas desligada. A verificação com leitor de tela está pendente.

## 3.3 Linguagens e tecnologias utilizadas

O sistema PEI Vivo foi desenvolvido como uma aplicação web estruturada em três camadas (interface, servidor e banco de dados), integralmente escritas em TypeScript e organizadas em um repositório único com cinco pacotes: a interface, o motor de adaptação, os contratos de dados, os casos de uso das Edge Functions e a suíte de testes de políticas de acesso. No front-end, foram utilizados React e Vite, com design responsivo e a fonte Atkinson Hyperlegible Next, hospedada na própria aplicação. No back-end, foram utilizadas três Edge Functions do Supabase (gerar-material, fechar-ciclo e convidar), as únicas autorizadas a criar materiais e versões de perfil, que mantêm fora do navegador as credenciais de serviço.

Os contratos de entrada são validados com a biblioteca Zod, compartilhada entre interface e servidor, em modo estrito: um campo inesperado, como um identificador de docente enviado pelo navegador, faz a requisição ser recusada. Na interface, toda chamada passa por uma única camada de serviços, que traduz os códigos de erro do banco (acesso negado, conflito e dado inválido) em mensagens em linguagem simples; essa camada tem uma implementação simulada, usada no protótipo e nos testes, e uma implementação real sobre o Supabase, sem que nenhuma tela mude. As integrações do sistema estão no Quadro 3.

Quadro 3 – Integrações do sistema

| Integração | Finalidade | Autenticação | Tratamento de falhas |
|---|---|---|---|
| Supabase Auth | Login com senha, segundo fator TOTP e convite por e-mail | Senha e TOTP; convite com chave de serviço só na Edge Function | Mensagem genérica de credencial inválida; convite repetido não reenvia e-mail |
| PostgREST (API do banco) | Leituras e escritas simples sob RLS | Token do usuário | Código do banco traduzido para mensagem simples |
| Edge Functions | Operações que exigem credencial de serviço | Token do usuário verificado pelo gateway e pelo banco | Erro padronizado, sem detalhe interno; tempo limite de 10 s |
| pg_cron | Expiração diária das validações pendentes (RN05) | Executa no próprio banco | Rotina idempotente |
| Provedor de IA | Camada opcional de simplificação lexical (RF10) | Chave de serviço, se ligada | Desligada por padrão; falha ou demora acima de 30 s resultam no material só por regras |
| Vercel e GitHub Actions | Publicação da interface e integração contínua | Repositório e segredos da plataforma | Publicação só a partir da branch principal protegida |

Fonte: PEI Vivo (2026).

Na etapa de modelagem, foi utilizada a UML (Unified Modeling Language), por meio dos diagramas de casos de uso, classes e sequência, gerados a partir do próprio código. As ferramentas de verificação são o Vitest, para os testes unitários e de integração; o Playwright, para os fluxos ponta a ponta em navegador; o PGlite, um PostgreSQL executado em processo que permite testar migrações e políticas sem servidor de banco; e o axe-core, para a auditoria automática de acessibilidade.

## 3.4 Base de dados e protótipo

Inicialmente, foi realizado o levantamento do processo de acompanhamento do estudante e das necessidades dos perfis envolvidos, buscando identificar quais informações precisavam ser registradas, validadas e protegidas. A partir desse levantamento, foram definidos os requisitos funcionais, não funcionais e as regras de negócio, e a matriz de permissões resumida no Quadro 4.

Em seguida, o banco PostgreSQL foi implementado em onze migrações sequenciais, com 15 tabelas, 17 tipos enumerados, RLS habilitado em todas as tabelas e 26 funções do banco que concentram as escritas sensíveis. Todas as chaves primárias são do tipo UUID, toda chave estrangeira tem índice, e restrições do próprio banco garantem as regras de unicidade, como no máximo uma versão vigente e um consentimento ativo por estudante. Nenhuma política concede acesso total a uma tabela: vínculos, consentimentos, versões de perfil, materiais e notas clínicas só são escritos por funções que verificam papel, consentimento e segundo fator quando exigido, e que registram cada operação relevante em uma tabela de auditoria que não admite alteração nem exclusão.

Quadro 4 – Matriz de permissões por perfil de usuário

| Informação | Responsável | Docente | Prof. de saúde | Coordenação |
|---|---|---|---|---|
| Laudo ou diagnóstico | Não armazenado | Não armazenado | Não armazenado | Não armazenado |
| Data de apresentação do laudo | Leitura | Sem acesso | Leitura | Leitura e escrita |
| Consentimento | Concede e revoga | Vê se está ativo | Vê se está ativo | Vê se está ativo |
| Observações do ciclo | Leitura e escrita própria | Leitura e escrita própria | Leitura e escrita própria | Leitura no histórico |
| Parâmetros do perfil | Leitura | Leitura | Leitura e validação | Leitura |
| Nota clínica reservada | Sem acesso | Sem acesso | Leitura e escrita (segundo fator, auditada) | Sem acesso |
| Material em rascunho | Sem acesso | Só o autor | Sem acesso | Sem acesso |
| Material aprovado e desfecho | Leitura | Leitura e escrita (autor) | Leitura | Leitura |
| Gerar material | Não | Sim | Não | Não |
| Vínculos | Leitura e confirmação do profissional | Leitura própria | Leitura própria | Propõe e encerra |
| Auditoria | Leitura (do próprio filho) | Sem acesso | Sem acesso | Leitura administrativa |
| Após revogação do consentimento | Leitura | Sem acesso | Sem acesso | Leitura |

Fonte: PEI Vivo (2026).

Na etapa de prototipação e implementação, foram desenvolvidas as telas dos quatro perfis sobre um cenário demonstrativo fictício, sem dados reais de estudante: um estudante de nove anos, do 4º ano, com interesse manifesto por dinossauros, cujo perfil de aprendizagem foi construído por docente, responsável e profissional de saúde fictícios. O protótipo contempla o consentimento por escopo, o registro de observações, o fechamento do ciclo, a validação dos parâmetros, a geração, revisão e aprovação do material, a tela de privacidade da família e a explicação de cada acesso negado.

Ao final, a solução será avaliada por dois procedimentos definidos antes da coleta. O primeiro é a verificação técnica automatizada, em cinco níveis: testes unitários do motor, que cobrem a assimetria da RN03 em todos os parâmetros; testes dos casos de uso das Edge Functions, com o banco e os serviços externos substituídos por dublês em cenários de sucesso, falha, tempo esgotado, carga inválida e dado duplicado; testes de integração com o banco no PGlite, que tentam primeiro o acesso negado e só depois o permitido, incluindo uma sonda de 31 tentativas de acesso indevido; testes de contrato com o Supabase real no GitHub Actions; e testes ponta a ponta em navegador, nas larguras de 390 e 1280 pixels, com verificação automática de acessibilidade. O segundo é a avaliação de usabilidade com usuários, em sessão individual de cerca de 20 minutos, em que cada participante lê o TCLE, executa três tarefas do seu perfil e responde ao questionário SUS (Brooke, 1996). [PREENCHER: local, período e número de participantes por perfil, incluindo pelo menos 2 profissionais de saúde.]

# 4. RESULTADOS E DISCUSSÕES

Será desenvolvida na Avaliação N2, com a entrega geral para a banca final.

# 5. CONSIDERAÇÕES FINAIS

Será desenvolvida na Avaliação N2, com a entrega geral para a banca final.

# REFERÊNCIAS

AMERICAN PSYCHIATRIC ASSOCIATION. **Manual diagnóstico e estatístico de transtornos mentais**: DSM-5-TR. 5. ed., texto revisado. Porto Alegre: Artmed, 2023.

ASSOCIAÇÃO BRASILEIRA DE NORMAS TÉCNICAS. **NBR 17225**: acessibilidade em conteúdo e aplicações web – requisitos. Rio de Janeiro: ABNT, 2025.

BATTISTELLO, Viviane Cristina de Mattos; LISBOA, Elise Ribas; MARTINS, Rosemari Lorenz. Inclusão de alunos com autismo em sala de aula e o Plano Educacional Individualizado (PEI). **Linguagens, Educação e Sociedade**, [Teresina], v. 28, n. 57, p. 1-23, 2024. DOI: https://doi.org/10.26694/rles.v28i57.4334.

BRASIL. Conselho Nacional de Saúde. Resolução nº 510, de 7 de abril de 2016. Dispõe sobre as normas aplicáveis a pesquisas em Ciências Humanas e Sociais. **Diário Oficial da União**: seção 1, Brasília, DF, p. 44-46, 24 maio 2016.

BRASIL. **Lei nº 13.146, de 6 de julho de 2015**. Institui a Lei Brasileira de Inclusão da Pessoa com Deficiência (Estatuto da Pessoa com Deficiência). Brasília, DF: Presidência da República, [2015]. Disponível em: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13146.htm. Acesso em: 13 out. 2026.

BRASIL. **Lei nº 13.709, de 14 de agosto de 2018**. Lei Geral de Proteção de Dados Pessoais (LGPD). Brasília, DF: Presidência da República, [2018]. Disponível em: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm. Acesso em: 13 out. 2026.

BRASIL. **Lei nº 14.254, de 30 de novembro de 2021**. Dispõe sobre o acompanhamento integral para educandos com dislexia ou Transtorno do Déficit de Atenção com Hiperatividade (TDAH) ou outro transtorno de aprendizagem. Brasília, DF: Presidência da República, [2021]. Disponível em: https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14254.htm. Acesso em: 13 out. 2026.

BROOKE, John. SUS: a "quick and dirty" usability scale. In: JORDAN, Patrick W. et al. (ed.). **Usability evaluation in industry**. London: Taylor & Francis, 1996. p. 189-194.

CAST. **Universal Design for Learning Guidelines version 2.2**. Wakefield, MA: CAST, 2018. Disponível em: https://udlguidelines.cast.org. Acesso em: 13 out. 2026.

DRESCH, Aline; LACERDA, Daniel Pacheco; ANTUNES JÚNIOR, José Antonio Valle. **Design science research**: método de pesquisa para avanço da ciência e tecnologia. Porto Alegre: Bookman, 2015.

FONTANA, Evelline Cristhine; CRUZ, Gilmar de Carvalho. Plano Educacional Individualizado e o reconhecimento da diferença para o ensino da Educação Física. **Caderno de Educação Física e Esporte**, Marechal Cândido Rondon, v. 20, 2022. DOI: https://doi.org/10.36453/cefe.2022.29468.

FRONTLINE EDUCATION. **IEP and Special Education Management**. [S. l.], 2026. Disponível em: https://www.frontlineeducation.com/special-programs/special-ed-software/iep-management/. Acesso em: 13 out. 2026.

GOALBOOK. **Goalbook Toolkit**. [S. l.], 2026. Disponível em: https://goalbook.com/explore-toolkit/. Acesso em: 13 out. 2026.

HEVNER, Alan R.; MARCH, Salvatore T.; PARK, Jinsoo; RAM, Sudha. Design science in information systems research. **MIS Quarterly**, Minneapolis, v. 28, n. 1, p. 75-105, 2004.

INSTITUTO NACIONAL DE ESTUDOS E PESQUISAS EDUCACIONAIS ANÍSIO TEIXEIRA (INEP). **Notas estatísticas**: Censo Escolar da Educação Básica 2025. Brasília, DF: Inep, 2026. Disponível em: [CONFERIR: link da publicação no portal gov.br/inep, de onde saíram os dados de 2,5 milhões, 82% e 11,3%]. Acesso em: [CONFERIR].

INTERNATIONAL ORGANIZATION FOR STANDARDIZATION. **ISO/IEC 25010:2023**: systems and software engineering – systems and software quality requirements and evaluation (SQuaRE) – product quality model. Geneva: ISO, 2023.

MICROSOFT. **What is Azure AI Immersive Reader?** Redmond: Microsoft, 2024. Disponível em: https://learn.microsoft.com/en-us/azure/ai-services/immersive-reader/overview. Acesso em: 26 out. 2026.

MODESTO, Mônica Andrade; ARAÚJO, Isabela Rosália Lima de; MENDONÇA, Ana Cláudia Sousa. Desafios e possibilidades para a implementação de uma educação especial e inclusiva na rede estadual de ensino de Sergipe. **Revista Brasileira de Educação Especial**, Bauru, v. 29, 2023. DOI: https://doi.org/10.1590/1980-54702023v29e0234.

ORGANIZAÇÃO DAS NAÇÕES UNIDAS. **Transformando nosso mundo**: a Agenda 2030 para o Desenvolvimento Sustentável. Nova York: ONU, 2015. Disponível em: https://brasil.un.org/pt-br/91863-agenda-2030-para-o-desenvolvimento-sustent%C3%A1vel. Acesso em: 13 out. 2026.

PEREIRA, Marta Aparecida de Mello; PEREIRA, Ana Paula Camilo. Planejamento educacional individualizado: desafios e avanços nas práticas colaborativas de ensino. **Colloquium Humanarum**, Presidente Prudente, v. 19, p. 1-15, jan./dez. 2022. DOI: https://doi.org/10.5747/ch.2022.v19.h523.

POSTGRESQL GLOBAL DEVELOPMENT GROUP. **PostgreSQL documentation**: row security policies. [S. l.], 2025. Disponível em: https://www.postgresql.org/docs/current/ddl-rowsecurity.html. Acesso em: 13 out. 2026.

PRODANOV, Cleber Cristiano; FREITAS, Ernani Cesar de. **Metodologia do trabalho científico**: métodos e técnicas da pesquisa e do trabalho acadêmico. 2. ed. Novo Hamburgo: Feevale, 2013. E-book. Disponível em: https://www.feevale.br/Comum/midias/0163c988-1f5d-496f-b118-a6e009a7a2f9/E-book%20Metodologia%20do%20Trabalho%20Cientifico.pdf. Acesso em: 13 out. 2026.

PROVA ADAPTADA. **IncluiAI**: Prova Adaptada. [S. l.], 2026. Disponível em: https://incluiai.com.br/. Acesso em: 13 out. 2026.

RELLO, Luz; BAEZA-YATES, Ricardo. Good fonts for dyslexia. In: INTERNATIONAL ACM SIGACCESS CONFERENCE ON COMPUTERS AND ACCESSIBILITY, 15., 2013, Bellevue. **Proceedings** [...]. New York: ACM, 2013.

SILVA, Gabrielle Lenz da; CAMARGO, Síglia Pimentel Höher. Revisão integrativa da produção científica nacional sobre o Plano Educacional Individualizado. **Revista Educação Especial**, Santa Maria, v. 34, p. 1-23, 2021. DOI: https://doi.org/10.5902/1984686X66509.

SUPABASE. **Supabase documentation**: row level security. [S. l.], 2025. Disponível em: https://supabase.com/docs/guides/database/postgres/row-level-security. Acesso em: 13 out. 2026.

VÍNCULOO. **Vínculoo**: educação especial e inclusiva. [S. l.], 2026. Disponível em: https://vinculoo.com.br/. Acesso em: 13 out. 2026.

WORLD WIDE WEB CONSORTIUM. **Web Content Accessibility Guidelines (WCAG) 2.2**. W3C Recommendation, 5 out. 2023, atualizada em 12 dez. 2024. Disponível em: https://www.w3.org/TR/WCAG22/. Acesso em: 13 out. 2026.

# 6. DECLARAÇÃO DE USO DE INTELIGÊNCIA ARTIFICIAL GENERATIVA

Declaramos que utilizamos ferramentas de Inteligência Artificial Generativa como apoio instrumental na elaboração deste Trabalho de Conclusão de Curso, exclusivamente para fins de estruturação, suporte à redação e formatação do documento, assumindo total e exclusiva responsabilidade pelo conteúdo final, rigor técnico-científico e autoria do texto apresentado.

**Ferramenta Utilizada:** Modelo de Linguagem de Grande Escala (LLM): Claude (Anthropic).

**Finalidade Específica do Uso:** Auxílio na organização estrutural da Introdução, tendo como base o pré-projeto; apoio à redação e aprofundamento do Referencial Teórico; revisão gramatical, ortográfica e verificação de coesão e coerência textual nessas seções.

**Localização no Texto:** Introdução (elaborada a partir do pré-projeto) e seções do Referencial Teórico do TCC.

**Garantia de Autoria e Responsabilidade:** Atestamos que todas as concepções teóricas, decisões metodológicas, análises, resultados e conclusões deste trabalho constituem produções intelectuais de nossa exclusiva autoria, revisadas e validadas criticamente sob nossa inteira responsabilidade acadêmica. A utilização da ferramenta de IA generativa limitou-se a funções instrumentais de apoio à escrita, sem interferência na originalidade e no mérito científico do trabalho.
