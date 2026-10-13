<!--
Rascunho para a avaliação N2 (Resultados e discussões). Separado do artigo em
13/10/2026, porque o avaliador informou que Resultados e discussões não fazem parte
desta entrega (N1). Este é o texto da versão 2, preservado como estava, inclusive os
marcadores [PREENCHER]/[CONFERIR]. As figuras de tela estão em telas/ e são
recapturadas com `npm run artigo:telas`. Ao montar a N2, renumere figuras e quadros
a partir dos últimos números usados no artigo e siga o texto de orientação da N2,
que o avaliador disse ter enviado (não está nos materiais do repositório).
-->

# 4. RESULTADOS E DISCUSSÕES

## 4.1 Apresentação do sistema

O PEI Vivo foi implementado como protótipo funcional com 31 telas, organizadas por perfil, com navegação lateral no computador e inferior no celular, tema escuro, modo de leitura facilitada e textos em linguagem leiga, sem siglas de regras na interface. O protótipo opera em dois modos: um modo de demonstração, com dados fictícios e uma camada de serviços que reproduz a matriz de permissões, e um modo real, conectado ao projeto Supabase na nuvem, com login por senha, segundo fator e convite. As telas e a lógica de negócio são as mesmas nos dois modos.

## 4.2 Funcionalidades e telas principais

As Figuras 4 a 10 percorrem um ciclo completo com os dados fictícios do protótipo.

### 4.2.1 Tela de observação

Na tela de observação (Figura 4), o docente registra, para cada uma das seis dimensões, se o comportamento ficou reduzido, estável ou ampliado em relação ao ciclo anterior, com evidência opcional em texto livre. A mesma tela atende responsável e profissional de saúde, com rótulos adaptados a cada um. Em teste automatizado em navegador, o registro das seis dimensões levou cerca de 1 segundo de máquina; o tempo humano será medido na avaliação com usuários.

![Figura 4 – Registro de observação pelo docente](telas/01-observar.png)

Fonte: Autoria própria (2026).

### 4.2.2 Tela de fechamento de ciclo

Ao fechar o ciclo (Figura 5), o docente vê a proposta de parâmetros calculada pelo motor, comparada com a versão vigente. No exemplo, o cansaço ampliado relatado pela família reduz de imediato o número de blocos por material, enquanto a melhora na autonomia com palavras aguarda um segundo ciclo para elevar o vocabulário, conforme a RN03.

![Figura 5 – Fechamento de ciclo com a proposta de parâmetros](telas/02-fechar-ciclo.png)

Fonte: Autoria própria (2026).

### 4.2.3 Tela de validação

O profissional de saúde valida o conjunto de parâmetros do ciclo (Figura 6), nunca um material individual (RN07). Ele pode aprovar, pedir revisão ou ajustar; um ajuste cria nova versão com justificativa obrigatória. Sem resposta em sete dias, a proposta expira e a versão anterior permanece vigente (RN05).

![Figura 6 – Validação dos parâmetros pelo profissional de saúde](telas/03-validar.png)

Fonte: Autoria própria (2026).

### 4.2.4 Telas de revisão e de material aprovado

O docente cola o texto da aula e recebe o rascunho adaptado, exibido ao lado do original para revisão e edição (Figura 7). O rascunho é visível apenas ao seu autor. Somente após a aprovação o material passa a ser visto pela família, pelo profissional e pela coordenação (Figura 8), com opção de leitura em voz alta por trecho e versão para impressão.

![Figura 7 – Revisão do material: original e adaptado lado a lado](telas/04-revisar.png)

Fonte: Autoria própria (2026).

![Figura 8 – Material aprovado](telas/05-material.png)

Fonte: Autoria própria (2026).

### 4.2.5 Telas de privacidade e de acesso negado

Na tela de privacidade (Figura 9), o responsável vê quem tem acesso aos dados do estudante, o que cada pessoa pode ver e o histórico de acessos, e pode remover o acesso do profissional ou revogar o consentimento. A Figura 10 mostra o que ocorre quando o docente tenta abrir as notas reservadas do profissional: a interface apenas explica a negação, que é decidida pelo banco.

![Figura 9 – Privacidade: quem tem acesso aos dados do estudante](telas/06-privacidade.png)

Fonte: Autoria própria (2026).

![Figura 10 – Acesso negado do docente às notas clínicas reservadas](telas/07-negado.png)

Fonte: Autoria própria (2026).

## 4.3 Verificação técnica

O Quadro 7 consolida os resultados da verificação técnica, obtidos em 13/10/2026.

Quadro 7 – Resultados da verificação técnica

| Indicador | Instrumento | Meta | Resultado |
|---|---|---|---|
| Bloqueio de acesso indevido | Sonda de 31 tentativas contra as políticas | 100% bloqueadas | 31 de 31 bloqueadas (eram 6 de 31 antes da reformulação) |
| Políticas de acesso | Testes em PGlite e no Supabase real (CI) | Todos aprovados | 113 aprovados, mais 12 de contrato HTTP que rodam só contra a nuvem |
| Motor de adaptação | Testes unitários (Vitest) | Todos aprovados; cobertura ≥ 70% | 42 aprovados, incluindo a RN03 em todas as dimensões |
| Funções do servidor | Testes unitários (Vitest) | Todos aprovados; cobertura ≥ 70% | 31 aprovados |
| Interface | Testes de componente com axe-core | 0 violações WCAG A/AA | 116 aprovados, 0 violações |
| Fluxos completos | Playwright em 390 e 1280 px, axe com contraste real | Todos aprovados | 20 aprovados |
| Desempenho e acessibilidade | Lighthouse (celular) nas páginas públicas | ≥ 90 | Desempenho 92 a 99; acessibilidade 100 |
| Ameaças de segurança | Análise STRIDE ligada a testes | Toda ameaça com teste | 40 ameaças, cada uma com o teste que a nega |

Fonte: Autoria própria (2026).

O resultado mais relevante para o problema de pesquisa é o primeiro. A auditoria de outubro mostrou que políticas de acesso escritas sem teste negado aceitavam 25 de 31 tentativas indevidas; após a reformulação, todas são recusadas pelo banco, inclusive no ambiente de nuvem. Esse dado sustenta o objetivo específico b e demonstra, de forma reproduzível, que a matriz do Quadro 6 não depende da interface.

## 4.4 Retorno do questionário ao projeto

As respostas abertas do questionário trouxeram preocupações que o sistema responde de forma concreta, sintetizadas no Quadro 8.

Quadro 8 – Preocupações dos respondentes e resposta no sistema

| Preocupação | Resposta no sistema |
|---|---|
| Dependência de tecnologia em escolas com poucos recursos | Camada determinística sem IA nem serviço externo (RNF08); material para impressão (RF12) |
| Privacidade dos dados da criança | Laudo não armazenado; consentimento por escopo e revogável; responsável vê quem acessou |
| Confiabilidade do material gerado por IA | IA desligada nesta versão; nenhum material é publicado sem aprovação do docente (RN04) |
| Sobrecarga do professor | Observação em seis toques; geração e revisão na mesma sequência |
| Tempo de tela da criança | Versão impressa do material aprovado |
| Suporte no primeiro uso | Tela de Ajuda e textos em linguagem leiga |
| "O conteúdo será o mesmo dos demais alunos?" | Sim: o motor muda a apresentação do mesmo texto, não o conteúdo |

Fonte: Autoria própria (2026), a partir das respostas abertas do questionário.

## 4.5 Validação de uso

[PREENCHER após a avaliação: número de participantes por perfil; pontuação SUS de cada participante, média e desvio-padrão (incluir gráfico); tempo médio e taxa de conclusão de cada tarefa; principais problemas observados e a correção feita em cada um. Se a avaliação não ocorrer até a entrega, substituir esta seção por um parágrafo que declare a ausência e remeta ao Quadro 9 como protocolo pronto.]

Quadro 9 – Indicadores da avaliação com usuários

| Indicador | Instrumento | Meta | Resultado |
|---|---|---|---|
| Usabilidade | System Usability Scale (SUS) | Média ≥ 68 | [PREENCHER] |
| Conclusão das tarefas | Observação da sessão | ≥ 80% sem ajuda | [PREENCHER] |
| Tempo para registrar observação | Cronometragem na sessão | < 60 segundos | [PREENCHER] |
| Legibilidade do material adaptado | Índice de Flesch adaptado ao português (Martins et al., 1996), antes e depois | Ganho ≥ 15 pontos | [PREENCHER] |

Fonte: Autoria própria (2026).

## 4.6 Discussão

A comparação com as soluções semelhantes (Quadro 1) evidencia a diferença central do PEI Vivo. A Prova Adaptada adapta o material por IA a partir das necessidades informadas pelo docente; o motor deste trabalho a parametriza por observações datadas e atribuíveis a quem as registrou, acumuladas ciclo a ciclo, o que se traduz no código na contagem de ciclos consecutivos exibida no Código 1. O Vínculoo também adapta atividades com IA, mas a partir de laudos e documentos importados; o PEI Vivo não armazena laudo, e a adaptação decorre de regras auditáveis aplicadas a observações e validadas pela saúde. Frontline e Goalbook tratam a conformidade legal como fim; no PEI Vivo, a arquitetura de permissões é o meio que viabiliza, com segurança, a participação da rede de saúde exigida pela Lei nº 14.254/2021.

A principal escolha de projeto discutível é a camada de IA desligada. Ela foi desligada por duas razões: a confiabilidade do material gerado por IA foi uma das preocupações dos respondentes, e um texto colado pelo docente poderia conter instruções capazes de manipular o modelo. A camada determinística entrega o núcleo do valor sem esse risco, e a porta para a IA permanece implementada e condicionada à RN06. O efeito é que o nível de vocabulário e a âncora de interesse ainda não alteram o texto; o vocabulário atua apenas por meio do glossário de apoio.

## 4.7 Colaboração e uso de inteligência artificial

[PREENCHER: divisão concreta das atividades entre os autores, por exemplo, quem conduziu o questionário, a redação de cada seção, a modelagem, o banco, o motor e a interface, com referência aos pull requests de cada um no repositório.]

Durante o desenvolvimento, os autores utilizaram assistente de programação baseado em IA generativa (Claude Code, da Anthropic) para apoio à escrita de código, testes, documentação e revisão deste texto. Todas as decisões de projeto foram tomadas pelos autores e registradas com justificativa (D-01 a D-46), e todo código incorporado ao repositório passou pelos testes automatizados descritos na seção 4.3. [CONFERIR: ajustar a declaração ao uso real e às regras da instituição.]


# Considerações finais (texto da versão 2, que cita os resultados acima)


Este trabalho apresentou o PEI Vivo, sistema de informação que integra observação pedagógica periódica, validação de parâmetros por profissional de saúde e geração de material didático adaptado em um ciclo contínuo, com o propósito de tornar o Plano Educacional Individualizado um instrumento operacional, e não apenas documental.

Quanto aos objetivos específicos: a) o ciclo foi modelado em 15 requisitos funcionais, 10 não funcionais, 8 regras de negócio e três diagramas UML gerados a partir do sistema; b) o controle de acesso no banco bloqueou as 31 tentativas indevidas catalogadas, com 113 testes de política aprovados também no ambiente de nuvem; c) o motor determinístico foi implementado com 42 testes, incluindo a RN03 em todos os parâmetros; d) o protótipo reúne 31 telas sem violações automáticas das WCAG 2.2 AA; e) a avaliação de usabilidade [PREENCHER: resultado, ou "permanece pendente"]. Responde-se assim ao problema de pesquisa no plano técnico: a integração proposta é viável com a proteção de dados aplicada na camada de dados. O valor percebido pelos usuários e o efeito do material adaptado sobre a aprendizagem dependem de validação empírica.

Como limitações, destacam-se: a ausência de profissionais de saúde no questionário inicial e o caráter de conveniência da amostra; a camada de IA desligada; a exclusão de dados do estudante ainda não disponível no modo real; a verificação manual com leitor de tela e a política de segurança de conteúdo (CSP) ainda pendentes; a ausência de escola real implantada; a exigência de registro em conselho profissional, que deixa de fora o psicopedagogo sem conselho; e os limiares do motor, que são hipóteses de projeto a calibrar.

Como trabalhos futuros, propõe-se: concluir a avaliação com usuários e o piloto em escola, com dados fictícios; implantar a primeira escola no ambiente de nuvem; habilitar a camada de IA com defesas contra manipulação por texto de entrada; aceitar profissionais sem conselho mediante verificação manual; e acompanhar, ao longo dos ciclos, se os desfechos registrados pelos docentes confirmam a regra de assimetria conservadora.


# Referência usada só nesta parte

MARTINS, Teresa B. F.; GHIRALDELO, Claudete M.; NUNES, Maria das Graças V.; OLIVEIRA JÚNIOR, Osvaldo N. **Readability formulas applied to textbooks in Brazilian Portuguese**. São Carlos: ICMSC-USP, 1996. (Notas do ICMSC, n. 28). [CONFERIR: dados da publicação.]
