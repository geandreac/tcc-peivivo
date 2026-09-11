# PEI Vivo — Análise de requisitos por perfil de usuário

**Versão:** 1.0 — 10/09/2026
**Fontes:** pré-projeto (`docs/tcc/TCC - Geandre & Jean.md`), mapeamento dos slides
(`docs/tcc/PEI_Vivo_Slides_Mapeamento.md`), diagramas de casos de uso, classes e
sequência (`docs/tcc/*.svg`), foto do quadro com o formato de rastreabilidade
(`docs/tcc/IMG_9678.heic`), e o código atual em `supabase/migrations/` e
`packages/motor-adaptacao/`.

Este documento faz três coisas, nesta ordem:

1. **Resolve as divergências** encontradas entre os artefatos do TCC e o código (seção 1).
   Cada decisão tem código `D-nn` e é referenciada pelas histórias e pela rastreabilidade.
2. **Analisa os requisitos de cada um dos 4 perfis** (seções 2–5): contexto de uso,
   o que vê / escreve / nunca vê, histórias de usuário com critérios de aceite,
   e as lacunas do código atual que impedem cada história.
3. **Inicia a matriz de rastreabilidade** no formato definido em aula
   (RF | Texto | Motivação | Decisão | Teste | Commit) — seção 7. A coluna
   *Commit* é preenchida conforme os cards do Kanban forem concluídos.

Convenções: `HU-X.nn` = história de usuário do perfil X (R = Responsável,
D = Docente, P = Profissional de saúde, C = Coordenação, S = Sistema/interno).
Critérios de aceite em *Dado / Quando / Então*. Referências a código no
formato `arquivo:linha`.

---

## 1. Divergências resolvidas

Princípio usado em todo empate: **o artefato mais recente e mais específico
vence** (diagramas > pré-projeto), e **minimização de dados vence** quando o
artefato é ambíguo (RNF09, RN02).

### D-01 · O sistema não armazena laudo nem diagnóstico

**Divergência.** A matriz de permissões (pré-projeto §6) tem a linha
"Diagnóstico e laudo clínico: Responsável Total · Prof. saúde Total ·
Coordenação Resumo". O schema não tem tabela nem campo para isso.

**Decisão.** O laudo **não entra no sistema**. O único conteúdo clínico é
`notas_clinicas` (linha "Nota clínica reservada", exclusiva do profissional).
Para a necessidade legal da coordenação ("Resumo" = saber que existe laudo
que justifica o PEI), adicionar apenas metadado:
`estudantes.laudo_apresentado_em date null` — sem CID, sem descrição, sem arquivo.

**Justificativa.** O projeto "não diagnostica" (§3.3). RN02 fica trivialmente
verificável: não há o que vazar. LGPD art. 6º III (minimização). O responsável
"tem acesso total" porque *possui* o documento físico — não é função do sistema.

**Impacto.** Migration `0004`: coluna nova. Matriz v2 (seção 6) substitui a linha.
`notas_clinicas` passa a ser descrita como *anotação operacional*, não prontuário
(o prontuário do profissional vive fora do sistema — ver D-05).

### D-02 · Só o docente gera material

**Divergência.** Matriz §6: "Gerar material adaptado: Docente ✅ · Prof. saúde ✅ ·
Coordenação ✅". Diagrama de casos de uso, diagrama de classes ("gerado por
(docente)"), diagrama de sequência e a policy `docente_gera_material`
(`0002_rls_policies.sql:112`) dizem: só docente.

**Decisão.** Só `DOCENTE` gera, aprova, descarta e registra desfecho.
Profissional de saúde e coordenação **leem** materiais aprovados. A linha da
matriz é corrigida.

**Justificativa.** Três artefatos mais recentes contra um. RN04 exige aprovação
do docente; se outro papel gerasse, haveria material em rascunho sem dono
pedagógico. Reduz escopo. Geração pelo profissional para uso terapêutico fica
como evolução pós-TCC.

**Impacto.** Nenhum no código. Documentação corrigida.

### D-03 · `Gatilho`/`Estrategia`/`Interesse` viram dimensões de `Observacao`

**Divergência.** O modelo de dados do pré-projeto (§7) tem classes `Gatilho`,
`Estrategia` e `Interesse` dentro de `PerfilDeAprendizagem`. O diagrama de
classes (posterior) e o schema têm apenas `Observacao(dimensao, valorEscala,
evidencia)` e `VersaoPerfil(parametros)`.

**Decisão.** O diagrama de classes é canônico. Mapeamento:

| Conceito do §7 | Onde vive agora |
|---|---|
| Gatilho ("ruído alto desorganiza") | `observacoes` com `dimensao` ∈ {SENSIBILIDADE_VISUAL, FADIGA_TAREFA, ATENCAO_SUSTENTADA} + `evidencia` |
| Estratégia ("antecipar mudanças reduz crise") | `observacoes` com `dimensao` ∈ {COMPREENSAO_ENUNCIADOS, AUTONOMIA_LEXICAL} + `evidencia`, autor PROFISSIONAL_SAUDE ou DOCENTE |
| Interesse ("ama dinossauros") | `observacoes` com `dimensao = INTERESSE_MANIFESTO` + `evidencia` = a âncora |
| `PerfilDeAprendizagem` | `versoes_perfil` (uma linha por ciclo) |
| `ParametroAdaptacao` | `versoes_perfil.parametros` (jsonb, tipo `ParametrosAdaptacao`) |

O caso de uso "Registrar estratégia clínica validada" (profissional) = inserir
`observacoes` com autor profissional. O **raciocínio clínico** por trás fica em
`notas_clinicas`; a **estratégia operacional** fica em `observacoes`, legível
pelo docente (é isso que a matriz "Gatilhos e estratégias: L+E para os três" pede).

**Impacto.** `interesseAncora` não é calculado pelo motor
(`regras.ts:96-100` deixa explícito). A Edge Function que fecha o ciclo
(D-09) deve derivá-lo da `evidencia` da última observação
`INTERESSE_MANIFESTO`/`AMPLIADA`. Isso é lacuna aberta — ver HU-S.02.

### D-04 · Origem do registro = papel do autor; sem coluna de visibilidade

**Divergência.** Matriz §6 distingue "Registros de sala" (docente escreve) de
"Registros do contexto familiar" (responsável escreve). O schema tem uma só
tabela `observacoes` com `autor_id`, sem `nivel_visibilidade`.

**Decisão.** Uma tabela só. A origem é o papel do autor. Todos os vinculados
leem todas as observações (a matriz dá *Leitura* a todos em ambas as linhas);
a escrita já é restrita à própria identidade
(`papel_autorizado_registra_observacao`, `0002_rls_policies.sql:91-96`).
Adicionar `observacoes.papel_autor papel_usuario not null`, preenchido por
trigger a partir do vínculo no momento do insert — preserva a origem mesmo que
o vínculo mude depois (professor trocou, responsável trocou).

**Impacto.** Migration `0004`: coluna + trigger. Frontend agrupa por `papel_autor`.

### D-05 · RF15 via Edge Function; exclusão é total

**Divergência.** Caso de uso "Exportar ou excluir dados do estudante"
(responsável) sem nenhuma policy de `delete` nem mecanismo de exportação.

**Decisão.** Duas Edge Functions com service role:
`exportar-dados-estudante` (JSON legível, todas as tabelas em que o estudante
aparece, **exceto** `notas_clinicas` — que não pertence ao responsável) e
`excluir-estudante` (verifica que o chamador é RESPONSAVEL vinculado; deleta
`estudantes` e as FKs em cascata — já existem `on delete cascade` em todas as
tabelas filhas). Nenhum papel recebe `delete` direto via RLS.

Exclusão **inclui** `notas_clinicas`: o sistema não é prontuário (D-01); o
profissional mantém seu registro legal fora dele. Isso deve ficar explícito
no termo de consentimento e na tela do profissional.

**Impacto.** Duas Edge Functions novas; evento em `auditoria` (D-06).

### D-06 · Trilha de auditoria: tabela `auditoria` alimentada por trigger

**Divergência.** RF02 pede "consentimento com trilha de auditoria" e o Q&A da
defesa promete "auditoria de acessos". `consentimentos` guarda só status e datas;
a policy `responsavel_gerencia_consentimento` (`0002_rls_policies.sql:64`) é
`for all` — o responsável poderia **apagar** o registro, destruindo a trilha.

**Decisão.**
- Tabela `auditoria(id, entidade, entidade_id, evento, autor_id, data, detalhes jsonb)`,
  append-only, escrita apenas por triggers `security definer` e pelas Edge Functions.
  Leitura: RESPONSAVEL (próprio estudante) e COORDENACAO. Ninguém escreve direto.
- Triggers em: `consentimentos` (CONCESSAO/REVOGACAO), `versoes_perfil`
  (mudança de `status_validacao`), `materiais_adaptados` (mudança de
  `status_aprovacao`), `vinculos_usuario_estudante` (criação/desativação).
- Policy do responsável passa a `select` + `insert` + `update`; **sem `delete`**.
- Auditoria de **leitura** (quem abriu o quê) fica **fora do MVP**: não é
  capturável via PostgREST sem proxy. Registrar como limitação conhecida na
  monografia. O que é auditável: toda escrita e toda chamada de Edge Function.

**Impacto.** Migration `0004`: tabela, triggers, ajuste da policy.

### D-07 · RN05: expiração por job diário + painel de pendências (pull, não push)

**Divergência.** Caso de uso "Notificar pendência de validação" («extend» de
validar parâmetros) e o Exemplo 2 de rastreabilidade ("sinaliza a pendência
à coordenação") — mas "notificações" está na lista de *cortar se apertar* e
nada está modelado.

**Decisão.**
- Novo valor `EXPIRADA` em `status_validacao`.
- Job diário (`pg_cron` ou Edge Function agendada) marca `versoes_perfil`
  com `status_validacao = 'PENDENTE'` e `created_at < now() - 7 days` como
  `EXPIRADA`. A última `VIGENTE` permanece vigente (RN05) — nada mais muda.
- View `pendencias_validacao` (estudante, ciclo, dias em aberto, status)
  exibida no painel da coordenação e do profissional. **Sem push/e-mail** no MVP.
- RN06: se não há `PROFISSIONAL_SAUDE` vinculado, a versão nasce `VIGENTE`
  direto (modo pedagógico), nunca `PENDENTE`.

**Justificativa.** Satisfaz o critério de teste do Exemplo 2 com custo mínimo
e mantém "notificações" cortável sem afetar a regra.

### D-08 · Bootstrap do cadastro: papel institucional + RPC atômica

**Divergência.** RF01 (coordenação cadastra estudante) é **impossível** com as
policies atuais: `estudantes` só tem `select` (`0002_rls_policies.sql:48`), e
`fn_meu_papel` exige um vínculo ao estudante — que ainda não existe. Ovo e galinha.

**Decisão.**
- `usuarios.papel_institucional papel_usuario null` — só `COORDENACAO` usa;
  atribuído pelo seed/administração (fora do fluxo normal).
- RPC `fn_cadastrar_estudante(nome, data_nascimento, turma) returns uuid`,
  `security definer`: verifica `papel_institucional = 'COORDENACAO'` do
  chamador, insere `estudantes` **e** o vínculo `COORDENACAO` na mesma
  transação. É a única porta de entrada de um estudante.
- Convite ao responsável: Edge Function `convidar-responsavel` (usa
  `auth.admin.inviteUserByEmail`, precisa de service role) que cria o
  `usuarios` e o vínculo `RESPONSAVEL`. O `consentimentos` **não** é criado
  aqui — é o responsável quem o insere ao aceitar (a policy já permite).
  Enquanto não existir linha `ATIVO`, `fn_tem_consentimento_ativo` é falso e
  tudo fica bloqueado (RN01) sem precisar de status "PENDENTE".

**Impacto.** Migration `0004`: coluna, função. Edge Function nova.

### D-09 · Quem escreve `versoes_perfil`: Edge Function `fechar-ciclo`

**Divergência.** RF05 (converter observações em parâmetros) não tem ator no
diagrama; nenhuma policy de `insert` em `versoes_perfil`; nenhuma policy de
`update` em `ciclos_observacao` para fechar o ciclo.

**Decisão.** O docente aciona "fechar ciclo" → Edge Function `fechar-ciclo`
(service role): lê observações do ciclo, calcula `ciclosConsecutivos` por
dimensão comparando com ciclos anteriores, chama `aplicarCiclo`, deriva
`interesseAncora` (D-03), insere `versoes_perfil` com status `PENDENTE` (ou
`VIGENTE` se RN06), fecha o ciclo, registra auditoria. **Nenhum papel
escreve `versoes_perfil` via RLS** — só a função. O profissional só faz
`update` de status (policy existente).

**Justificativa.** O snapshot de parâmetros é o dado mais crítico do sistema
(pré-projeto §7). Se o cliente pudesse gravá-lo, o motor deixaria de ser
confiável (RNF08).

### D-10 · Onde roda o motor: conversão e adaptação de texto no servidor; apresentação no cliente

**Divergência.** Pré-projeto §8: camada determinística "roda no cliente".
Diagrama de sequência: `API → Motor Determinístico → aplicar(texto, parametros)`
(servidor).

**Decisão.** `packages/motor-adaptacao` é isomórfico (TS puro, sem I/O).
- **Servidor** (Edge Functions): `regras.ts` (observação → parâmetro, em
  `fechar-ciclo`) e um futuro `adaptador.ts` (texto → texto: segmentação em
  blocos, etapa única, marcação de palavras difíceis — em `gerar-material`).
  Motivo: o resultado precisa ser persistido com snapshot confiável e é a
  entrada da camada de IA.
- **Cliente**: aplicação **visual** dos parâmetros (tipografia, espaçamento,
  contraste 4.5/7) via CSS a partir do `parametros` do material — é isso que
  "roda no cliente" significa, e é o que permite leitura offline (RNF05).

**Impacto.** `motor-adaptacao` ganha um segundo módulo (`adaptador.ts`) com
testes próprios. `ParametrosAdaptacao` continua sendo o único contrato.

### D-11 · RN01/RN08 após revogação: escrita bloqueada para todos; leitura só para responsável e coordenação

**Divergência.** CLAUDE.md: "sem consentimento ativo, nenhuma operação". Mas
RF15 (exportar) e "consolidar histórico do PEI" (coordenação) exigem leitura
após revogação. Hoje só `docente_cria_ciclo` e `docente_gera_material` checam
consentimento; `observacoes` e `versoes_perfil` não.

**Decisão.**
- **Escrita**: toda policy de `insert`/`update` em tabelas filhas de
  `estudantes` ganha `and fn_tem_consentimento_ativo(...)`. Exceção: a própria
  `consentimentos` (senão não dá para reconceder) e `notas_clinicas`
  (registro do profissional; mas ele perde o vínculo operacional — ver abaixo).
- **Leitura**: `RESPONSAVEL` e `COORDENACAO` continuam lendo (histórico é
  documento legal, LBI; exportação, RF15). `DOCENTE` e `PROFISSIONAL_SAUDE`
  **perdem leitura** — a necessidade operacional deles acabou. Policies
  `vinculado_le_*` ganham
  `and (fn_tem_consentimento_ativo(x) or fn_meu_papel(x) in ('RESPONSAVEL','COORDENACAO'))`.
- Reconcessão: novo `insert` em `consentimentos` com `ATIVO` reabre tudo.

**Impacto.** Migration `0004` reescreve ~8 policies. Reformular RN01 no
CLAUDE.md para: *"Sem consentimento ativo, nenhuma escrita nem geração; leitura
restrita a responsável e coordenação."*

### D-12 · Materiais em rascunho são privados do docente

**Divergência.** A matriz não tem linha para "material adaptado". O cenário
do Miguel diz que a mãe "vê em casa o que deu certo". `vinculado_le_material`
hoje mostra rascunhos a todos.

**Decisão.** `DOCENTE` lê todos os materiais do estudante; demais papéis
leem apenas `status_aprovacao = 'APROVADO'`. Desfechos seguem o material.

**Justificativa.** RN04 — o que não foi aprovado não existe para ninguém
além de quem está revisando. Evita que a família veja um rascunho com erro
de IA.

### D-13 · Tipos e enums menores

- `ParametrosAdaptacao` fica com **6 campos** (o TS já estende o diagrama com
  `blocosPorMaterial`; a convenção do CLAUDE.md permite estender, não duplicar).
  Atualizar o diagrama de classes na monografia.
- `materiais_adaptados.status_aprovacao text` → enum
  `status_aprovacao ('RASCUNHO','APROVADO','DESCARTADO')`.
- `ciclos_observacao.status text` → enum `status_ciclo ('ABERTO','FECHADO')`.
- `vinculos_usuario_estudante.status text` → enum `status_vinculo ('ATIVO','INATIVO')`.
- `registro_conselho` obrigatório quando `papel = PROFISSIONAL_SAUDE`: virar
  `check constraint`, não comentário.

---

## 2. Responsável legal

### 2.1 Contexto e objetivo

Dona Rosa: trabalha o dia todo, acessa pelo celular, à noite. Quer **entender
o que está sendo feito com o filho, autorizar com clareza e ver se está dando
certo**. Não é usuária diária — entra no convite, no consentimento, e depois
para acompanhar. É a única com poder de bloquear o sistema inteiro (RN01/RN08).

### 2.2 O que vê / escreve / nunca vê

| | Dado | Tabela |
|---|---|---|
| **Escreve** | Consentimento (conceder, revogar) | `consentimentos` |
| **Escreve** | Observação do contexto domiciliar | `observacoes` (`papel_autor = RESPONSAVEL`) |
| **Aciona** | Exportar / excluir dados | Edge Functions (D-05) |
| **Lê** | Dados básicos do estudante, vínculos, todas as observações, parâmetros vigentes, materiais **aprovados**, desfechos, trilha de auditoria | `estudantes`, `vinculos_*`, `observacoes`, `versoes_perfil`, `materiais_adaptados` (APROVADO), `desfechos`, `auditoria` |
| **Nunca vê** | Nota clínica reservada, materiais em rascunho | `notas_clinicas`, `materiais_adaptados` (RASCUNHO/DESCARTADO) |

### 2.3 Histórias de usuário

**HU-R.01 — Aceitar convite e conceder consentimento** (RF02, RN01)
Como responsável, quero ler em linguagem simples o que será coletado, quem vê
o quê e por quanto tempo, e autorizar, para que o perfil do meu filho possa existir.
- *Dado* um convite válido e nenhum `consentimentos` ATIVO, *quando* aceito o termo,
  *então* é criada uma linha `consentimentos(status='ATIVO', escopo=…)` e um evento
  `CONCESSAO` em `auditoria`.
- *Dado* que não aceitei, *quando* qualquer outro papel tenta criar ciclo ou gerar
  material, *então* a operação é negada pelo banco (403/42501).
- O termo lista os escopos (`observacao_pedagogica`, `observacao_domiciliar`,
  `geracao_material`) e deixa explícito que a exclusão apaga também as anotações
  do profissional (D-05).

**HU-R.02 — Revogar consentimento** (RF02, RN08)
- *Dado* um consentimento ATIVO, *quando* revogo, *então* `status='REVOGADO'`,
  `data_revogacao=now()`, evento `REVOGACAO` em `auditoria`, e **imediatamente**
  nenhuma geração, ciclo ou observação nova é aceita para o estudante.
- *Então* docente e profissional deixam de ler os dados; eu e a coordenação continuamos (D-11).
- A revogação não pode ser desfeita por ninguém além de mim (nova concessão = nova linha).

**HU-R.03 — Registrar observação do contexto domiciliar** (RF04)
- *Dado* consentimento ATIVO e ciclo ABERTO, *quando* registro uma observação
  (dimensão, escala, evidência livre), *então* ela é gravada com
  `autor_id = eu`, `papel_autor = RESPONSAVEL`.
- Não consigo gravar com `autor_id` de outra pessoa (policy já garante).
- Interface guiada: a escala (REDUZIDA/ESTÁVEL/AMPLIADA) precisa de rótulos em
  linguagem leiga por dimensão (ex.: "Fadiga: cansa mais rápido / igual / aguenta mais").

**HU-R.04 — Acompanhar o que funcionou** (RF13 leitura)
- *Dado* materiais APROVADOS com desfecho, *quando* abro o estudante, *então*
  vejo lista de materiais, o resultado (ALCANÇADO/PARCIAL/NÃO) e a observação
  livre do docente. Não vejo rascunhos (D-12).

**HU-R.05 — Exportar meus dados** (RF15, LGPD art. 18 V)
- *Quando* solicito exportação, *então* recebo JSON legível com estudante,
  vínculos, consentimentos, ciclos, observações, versões de perfil, materiais
  aprovados, desfechos, auditoria. **Sem** `notas_clinicas`.

**HU-R.06 — Excluir os dados do estudante** (RF15, LGPD art. 18 VI)
- *Quando* confirmo a exclusão (dupla confirmação), *então* `estudantes` e tudo
  em cascata é apagado, incluindo `notas_clinicas`; fica apenas um evento
  `EXCLUSAO` em `auditoria` com `entidade_id` e sem dados pessoais.

### 2.4 Lacunas no código atual

| Lacuna | Onde | Resolve com |
|---|---|---|
| Responsável pode `delete` em `consentimentos` | `0002_rls_policies.sql:64` (`for all`) | D-06 |
| Sem trilha de auditoria | — | D-06 |
| Vê rascunhos de material | `0002_rls_policies.sql:109` | D-12 |
| Exportar/excluir inexistentes | — | D-05 |
| Sem `papel_autor` na observação | `0001_core_schema.sql:97` | D-04 |
| Após revogação, docente e profissional continuam lendo tudo | `vinculado_le_*` | D-11 |

---

## 3. Docente regente

### 3.1 Contexto e objetivo

Márcia: 31 alunos, 3 com laudo. **Domingo, 21h, no celular.** Quer colar um
texto e receber em menos de um minuto a versão que funciona para aquele aluno,
revisar rápido e aprovar. Tolerância zero a fluxo longo: se levar mais que
alguns toques, ela volta a não adaptar. É o usuário que decide se o sistema é
usado ou não (RNF01, RNF02).

### 3.2 O que vê / escreve / nunca vê

| | Dado | Tabela |
|---|---|---|
| **Escreve** | Ciclo quinzenal (abrir), observação pedagógica, material (gerar, editar, aprovar, descartar), desfecho | `ciclos_observacao`, `observacoes`, `materiais_adaptados`, `desfechos` |
| **Aciona** | Fechar ciclo (→ nova versão de perfil), gerar material | Edge Functions `fechar-ciclo`, `gerar-material` |
| **Lê** | Dados básicos, todas as observações (inclusive do responsável e do profissional), **parâmetros** vigentes, todos os materiais do estudante, desfechos, status da validação clínica | `estudantes`, `observacoes`, `versoes_perfil.parametros`, `materiais_adaptados`, `desfechos` |
| **Nunca vê** | Nota clínica reservada, laudo (não existe no sistema), `laudo_apresentado_em` | `notas_clinicas`, `estudantes.laudo_apresentado_em` |

O docente vê `versoes_perfil.parametros` e `status_validacao`, mas **não
precisa** ver `validador_id` nem quem é o profissional — só que "há um
profissional vinculado" (para saber se está em modo pedagógico, RN06).

### 3.3 Histórias de usuário

**HU-D.01 — Registrar observação pedagógica quinzenal** (RF03)
- *Dado* consentimento ATIVO, *quando* abro o ciclo N (ou o sistema abre ao
  fechar o N-1), *então* posso registrar uma observação por dimensão (6 dimensões,
  escala de 3 pontos, evidência livre opcional).
- Fluxo completável em < 60 s no celular: 6 toques + opcional texto.
- Não consigo registrar sem consentimento ATIVO (policy).

**HU-D.02 — Fechar o ciclo e ver os parâmetros propostos** (RF05, RN03, RN06)
- *Quando* fecho o ciclo, *então* o sistema gera `versoes_perfil` com os
  parâmetros calculados pelo motor (D-09) e me mostra o **diff** contra a versão
  vigente ("blocos: 6 → 4; enunciado: múltiplas etapas → etapa única").
- *Dado* profissional vinculado, *então* a versão nasce `PENDENTE` e vejo
  "aguardando validação clínica"; os materiais continuam usando a última VIGENTE.
- *Dado* nenhum profissional vinculado (RN06), *então* nasce `VIGENTE` e vejo
  "modo pedagógico".
- RN03 visível: se uma dimensão foi AMPLIADA só 1 ciclo, o diff mostra
  "aguardando 2º ciclo para elevar".

**HU-D.03 — Gerar material adaptado** (RF08, RF09, RF10, RNF02) ⭐ caso central
- *Dado* consentimento ATIVO e uma versão VIGENTE, *quando* colo o texto e toco
  "adaptar para [estudante]", *então* em < 60 s recebo um rascunho com:
  segmentação em blocos ≤ `maxLinhasPorBloco`, enunciados em `formatoEnunciado`,
  no máximo `blocosPorMaterial` blocos, palavras difíceis marcadas com glossário
  (se IA ligada), exemplos recontextualizados por `interesseAncora` (se IA ligada).
- O material grava `versao_perfil_id` = snapshot da versão usada (nunca a "atual"
  se ela mudar depois).
- *Dado* IA desligada ou indisponível, *então* recebo só a camada determinística,
  com aviso — nunca erro (RNF08).
- Cache: texto idêntico + mesma `versao_perfil_id` → não regera (risco §10).

**HU-D.04 — Revisar lado a lado e aprovar** (RF11, RN04)
- *Dado* rascunho, *quando* abro, *então* vejo original × adaptado lado a lado
  (empilhado no celular), posso editar o adaptado, e aprovar ou descartar.
- *Quando* aprovo, *então* `status_aprovacao='APROVADO'`, evento em `auditoria`,
  e o material passa a ser visível para responsável, profissional e coordenação.
- Nada é publicado sem esse toque. A IA nunca aprova.

**HU-D.05 — Exportar versão web e impressão** (RF12, RNF03, RNF05)
- *Dado* material APROVADO, *então* tenho versão web acessível (contraste ≥
  `contrasteMinimo`, tipografia e espaçamento aplicados por CSS — D-10) e versão
  para imprimir via `@media print`. Zero violação axe-core A/AA.
- A versão web fica em cache do Service Worker para leitura offline.

**HU-D.06 — Registrar desfecho** (RF13)
- *Dado* material APROVADO, *quando* registro ALCANÇADO/PARCIAL/NÃO_ALCANÇADO
  + observação livre, *então* grava `desfechos` (1:1 com material, já `unique`).
- Dois toques. É a retroalimentação: alimenta o painel de indicadores (HU-C.05)
  e a próxima observação quinzenal.

**HU-D.07 — Ver estratégias do profissional e contexto da família** (RF04 leitura)
- *Então* vejo observações de outros autores agrupadas por `papel_autor`, com
  a evidência livre. Isso é o "o professor precisa saber que instrução longa
  trava, não o CID".

### 3.4 Lacunas no código atual

| Lacuna | Onde | Resolve com |
|---|---|---|
| Nenhum mecanismo cria `versoes_perfil` | sem policy de insert | D-09 |
| Não há como fechar ciclo | sem update policy em `ciclos_observacao` | D-09 |
| `interesseAncora` nunca é preenchido | `regras.ts:96-100` | D-03 / HU-S.02 |
| `ciclosConsecutivos` é entrada do motor, ninguém calcula | `tipos.ts:30` | HU-S.01 |
| Não existe adaptação de texto (só conversão de parâmetros) | `motor-adaptacao` só tem `regras.ts` | D-10 / HU-S.03 |
| `gerar-material` não existe | `supabase/functions/` inexistente | HU-S.04 |
| Observação sem checagem de consentimento | `0002_rls_policies.sql:91` | D-11 |
| `status_aprovacao` texto livre | `0001_core_schema.sql:132` | D-13 |

---

## 4. Profissional de saúde (TO, fono, psicopedagogo, psicólogo)

### 4.1 Contexto e objetivo

Camila: atende 2×/semana, vários pacientes em várias escolas. Quer **ver
resultado real em sala, não relato**, e garantir que o que a escola faz é
coerente com o que ela trabalha em terapia. Usa o sistema com baixa
frequência e alta responsabilidade: é ela que valida os parâmetros de cada
ciclo (RF06/RF07, RN07). Tem `registro_conselho` obrigatório.

### 4.2 O que vê / escreve / nunca vê

| | Dado | Tabela |
|---|---|---|
| **Escreve** | Estratégia clínica validada (como observação), nota clínica reservada, validação da versão (aprovar / solicitar ajuste) | `observacoes` (`papel_autor = PROFISSIONAL_SAUDE`), `notas_clinicas`, `versoes_perfil.status_validacao` |
| **Lê** | Dados básicos, `laudo_apresentado_em`, todas as observações, todas as versões de perfil (histórico), materiais aprovados, desfechos, pendências, notas clínicas de outros profissionais do mesmo estudante | tudo exceto rascunhos |
| **Nunca vê** | Materiais em rascunho/descartados | `materiais_adaptados` (RASCUNHO/DESCARTADO) |

### 4.3 Histórias de usuário

**HU-P.01 — Validar os parâmetros do ciclo** (RF06, RF07, RN07)
- *Dado* uma `versoes_perfil` PENDENTE, *quando* abro, *então* vejo o conjunto
  completo de parâmetros, o diff contra a vigente, e as observações que os
  geraram (com autor e evidência).
- *Quando* aprovo, *então* `status_validacao='VIGENTE'`, `validador_id=eu`,
  `data_vigencia=now()`; a versão anterior deixa de ser vigente; evento em
  `auditoria`. A partir daí `gerar-material` usa esta versão.
- *Quando* solicito ajuste, *então* `status_validacao='EM_REVISAO'` + campo de
  justificativa (novo: `versoes_perfil.justificativa_revisao text`) visível ao
  docente; a vigente continua.
- Nunca valido material individual — só o conjunto (RN07). A tela não mostra
  materiais no fluxo de validação.
- Só eu (papel PROFISSIONAL_SAUDE vinculado) consigo mudar o status (policy existente).

**HU-P.02 — Registrar estratégia clínica validada** (RF04, D-03)
- *Quando* registro "instrução com mais de 2 etapas trava" como observação
  (`COMPREENSAO_ENUNCIADOS`, `REDUZIDA`, evidência), *então* o docente a vê e o
  motor a usa no próximo fechamento de ciclo.
- Eu escolho o que vai para `observacoes` (operacional, visível) e o que vai
  para `notas_clinicas` (reservado). A interface deixa os dois caminhos
  visualmente distintos ("todos veem" × "só profissionais de saúde veem").

**HU-P.03 — Nota clínica reservada** (RN02)
- *Quando* escrevo uma nota, *então* só profissionais de saúde vinculados leem.
  Docente, responsável e coordenação recebem 403 mesmo por chamada direta à
  API com token válido. Este é o **teste de segurança nº 1** do projeto.
- Dois profissionais vinculados ao mesmo estudante (TO + fono) **leem as notas
  um do outro** — a policy atual já permite (`fn_meu_papel = 'PROFISSIONAL_SAUDE'`)
  e é o comportamento desejado para equipe multiprofissional. Documentar no termo.

**HU-P.04 — Ver resultado em sala** (RF13 leitura)
- *Então* vejo materiais APROVADOS com desfecho e a `versao_perfil_id` que os
  gerou — consigo correlacionar "com âncora de interesse → 80 % de conclusão".

**HU-P.05 — Ver pendências e histórico** (RN05)
- *Então* vejo a view `pendencias_validacao` filtrada pelos meus estudantes,
  com dias em aberto; versões `EXPIRADA` aparecem marcadas ("não validada em
  7 dias — parâmetros anteriores mantidos").

### 4.4 Lacunas no código atual

| Lacuna | Onde | Resolve com |
|---|---|---|
| Sem campo de justificativa em "solicitar ajuste" | `versoes_perfil` | migration 0004 |
| Sem `EXPIRADA` nem job de 7 dias | `status_validacao` | D-07 |
| Sem view de pendências | — | D-07 |
| `registro_conselho` só comentado | `0001_core_schema.sql:65` | D-13 (`check`) |
| Continua lendo após revogação | `vinculado_le_*` | D-11 |
| Vê rascunhos | `0002_rls_policies.sql:109` | D-12 |

---

## 5. Coordenação pedagógica

### 5.1 Contexto e objetivo

Quer chegar na reunião de PEI do bimestre com **histórico e evidência**, não
documento em branco. É quem faz o onboarding (cadastra, convida, vincula) e
quem responde legalmente pela existência do PEI (LBI). Usa desktop mais que
celular. Lê muito, escreve pouco.

### 5.2 O que vê / escreve / nunca vê

| | Dado | Tabela |
|---|---|---|
| **Escreve** | Estudante (cadastro, `laudo_apresentado_em`), vínculos (criar, desativar) | via `fn_cadastrar_estudante`, `vinculos_usuario_estudante` |
| **Aciona** | Convidar responsável | Edge Function `convidar-responsavel` |
| **Lê** | Tudo que os outros leem (observações, parâmetros, materiais aprovados, desfechos, consentimentos, auditoria, pendências, indicadores agregados) | — |
| **Nunca vê** | Nota clínica reservada, rascunhos de material; **não escreve** observação nem gera material | `notas_clinicas` |

### 5.3 Histórias de usuário

**HU-C.01 — Cadastrar estudante** (RF01, D-08)
- *Dado* `papel_institucional = 'COORDENACAO'`, *quando* chamo
  `fn_cadastrar_estudante`, *então* estudante e meu vínculo COORDENACAO são
  criados atomicamente. Sem esse papel, 403.
- Nenhum outro caminho cria estudante (sem `insert` via RLS).

**HU-C.02 — Convidar o responsável** (RF01)
- *Quando* informo e-mail do responsável, *então* a Edge Function cria o
  usuário no Auth, o registro em `usuarios` e o vínculo RESPONSAVEL, e dispara
  o convite. O consentimento **não** existe até o responsável aceitar (HU-R.01).

**HU-C.03 — Vincular docente e profissional** (RF14)
- *Quando* vinculo um profissional, *então* `registro_conselho` é obrigatório
  (check). *Quando* desativo um vínculo (`status='INATIVO'`), *então* a pessoa
  perde acesso imediatamente (`fn_meu_papel` já filtra por ATIVO) e o evento vai
  para `auditoria`.
- Troca de professor no ano seguinte = desativar um vínculo e criar outro; o
  histórico permanece (é o problema "recomeça do zero" do §2.1 resolvido).

**HU-C.04 — Consultar histórico do PEI**
- *Então* vejo, por estudante, a linha do tempo: consentimentos, ciclos com
  observações, versões de perfil (com status e validador), materiais aprovados
  com desfecho, auditoria. Exportável para a reunião (mesma função de HU-R.05,
  sem `notas_clinicas`).

**HU-C.05 — Acompanhar indicadores agregados** (cortável se apertar)
- *Então* vejo por turma/escola: nº de estudantes com consentimento ativo,
  ciclos fechados no prazo, versões pendentes/expiradas, materiais gerados por
  docente (meta ≥ 5), taxa de desfecho ALCANÇADO com vs. sem âncora de interesse.
- **Nunca** identifica dado clínico; só contagens.

**HU-C.06 — Ver pendências de validação** (RN05, D-07)
- *Então* a view `pendencias_validacao` aparece no painel; sem push.

### 5.4 Lacunas no código atual

| Lacuna | Onde | Resolve com |
|---|---|---|
| Impossível cadastrar estudante | `estudantes` só `select` | D-08 |
| Sem papel institucional | `usuarios` | D-08 |
| Sem convite | — | D-08 |
| Sem `laudo_apresentado_em` | `estudantes` | D-01 |
| Sem view de pendências / indicadores | — | D-07 / HU-C.05 |
| Sem auditoria | — | D-06 |

---

## 6. Matriz de permissões v2 (substitui o Quadro 7)

| Informação | Responsável | Docente | Prof. saúde | Coordenação |
|---|---|---|---|---|
| Dados básicos do estudante | L | L | L | L + E |
| `laudo_apresentado_em` (só data) | L | ❌ | L | L + E |
| Consentimento | **Exclusivo** (conceder/revogar) | L | L | L |
| Observações (todas as origens) | L + E (autoria própria) | L + E (autoria própria) | L + E (autoria própria) | L |
| Versão de perfil (parâmetros) | L | L | L + **validar** | L |
| Nota clínica reservada | ❌ | ❌ | L + E | ❌ |
| Material em rascunho | ❌ | L + E (próprio) | ❌ | ❌ |
| Material aprovado | L | L + E | L | L |
| Desfecho | L | L + E | L | L |
| Vínculos | L (próprios) | L (próprios) | L (próprios) | L + E |
| Auditoria | L (próprio estudante) | ❌ | ❌ | L |
| Gerar material | ❌ | ✅ | ❌ | ❌ |
| Exportar / excluir dados | **Exclusivo** | ❌ | ❌ | ❌ (exporta histórico sem excluir) |
| Após revogação | L | ❌ | ❌ | L |

---

## 7. Matriz de rastreabilidade (formato do quadro)

Colunas conforme definido em aula: **RF | Texto | Motivação | Decisão | Teste | Commit**.
*Motivação* = por que existe (problema/lei/regra). *Decisão* = como foi resolvido
(D-nn, arquivo). *Teste* = critério verificável. *Commit* preenchido ao concluir.

| RF | Texto | Motivação | Decisão | Teste | Commit |
|---|---|---|---|---|---|
| RF01 | Cadastrar estudante e emitir convite ao responsável | LBI: PEI exige cadastro; onboarding é da coordenação | D-08: `fn_cadastrar_estudante` + EF `convidar-responsavel` | Usuário sem `papel_institucional` chamando a RPC → 403; com papel → estudante + vínculo criados na mesma transação | — |
| RF02 | Registrar consentimento com trilha de auditoria | RN01/RN08, LGPD art. 7º/8º | D-06: `auditoria` + trigger; policy sem `delete` | Revogar gera evento; `delete from consentimentos` como responsável → 403 | — |
| RF03 | Observação comportamental do docente por ciclo | Perfil evolutivo (diferencial vs. Prova Adaptada) | `observacoes` + `papel_autor` (D-04) | Insert sem consentimento ATIVO → 403; com → grava `papel_autor=DOCENTE` | — |
| RF04 | Observações do responsável e do profissional | Três atores alimentam o perfil (§3.2) | D-03/D-04 | Responsável inserindo com `autor_id` de outro → 403 | — |
| RF05 | Converter observações em parâmetros (regras determinísticas) | RNF08: não é wrapper de IA | `regras.ts` + EF `fechar-ciclo` (D-09/D-10) | `regras.test.ts` 7/7; EF insere `versoes_perfil` com snapshot | `packages/motor-adaptacao` (existente) |
| RF06 | Submeter parâmetros à validação clínica | Lei 14.254/2021 (escola↔saúde) | `versoes_perfil.status_validacao=PENDENTE` (D-09) | Com profissional vinculado, nova versão nasce PENDENTE | — |
| RF07 | Aprovar / ajustar / expirar em 7 dias | RN05, RN07 | D-07: `EXPIRADA` + job diário + `justificativa_revisao` | Simular 8 dias sem resposta → versão EXPIRADA, anterior segue VIGENTE, aparece em `pendencias_validacao` | — |
| RF08 | Gerar material a partir de texto + parâmetros vigentes | Caso central (§5, domingo 21h) | EF `gerar-material` seguindo as 18 mensagens do diagrama de sequência | POST retorna rascunho com `versao_perfil_id` da VIGENTE; < 60 s | — |
| RF09 | Camada determinística de adaptação | RNF08 | `adaptador.ts` no motor (D-10) | Mesma entrada → mesma saída; blocos ≤ `maxLinhasPorBloco`; sem rede | — |
| RF10 | Camada de IA quando habilitada | Simplificação lexical + âncora de interesse | EF chama LLM atrás de interface própria; desligável (RN06) | Com IA off, EF responde 200 só com camada 1; com IA on, glossário presente | — |
| RF11 | Revisão, edição e aprovação humana | RN04; "e se a IA distorcer?" | `docente_aprova_ou_descarta_material`; rascunho privado (D-12) | Responsável lendo RASCUNHO → 0 linhas; após APROVADO → 1 linha | — |
| RF12 | Exportar versão web acessível + impressão | RNF03, RNF05 | CSS a partir de `parametros` + `@media print` (D-10) | axe-core zero violações A/AA; contraste ≥ `contrasteMinimo` | — |
| RF13 | Registrar desfecho | Retroalimentação (§3.1) | `desfechos` 1:1 material | Segundo desfecho no mesmo material → violação `unique` | — |
| RF14 | RBAC + permissões granulares | RN02, RNF04, RNF09 | RLS (`0002`) + revisões D-11/D-12 | **Docente lendo `notas_clinicas` → 403 com token válido** (Exemplo 3) | `supabase/migrations/0002` (existente) |
| RF15 | Exportar / excluir dados do estudante | LGPD art. 18 | D-05: EFs `exportar-dados-estudante`, `excluir-estudante` | Docente chamando `excluir-estudante` → 403; responsável → cascata completa, evento `EXCLUSAO` sem dados pessoais | — |

Regras de negócio → onde são garantidas:

| RN | Garantia | Teste |
|---|---|---|
| RN01 | `fn_tem_consentimento_ativo` em todo `insert`/`update` filho (D-11) | insert em `observacoes` sem consentimento → 403 |
| RN02 | `somente_profissional_acessa_nota_clinica`; laudo não existe (D-01) | docente → 403 |
| RN03 | `paraProximoNivel` em `regras.ts:22-36` | `regras.test.ts` "RN03" |
| RN04 | rascunho privado (D-12) + update só docente | responsável não lê RASCUNHO |
| RN05 | job diário + `EXPIRADA` (D-07) | 8 dias → EXPIRADA, VIGENTE mantida |
| RN06 | `fechar-ciclo` decide PENDENTE vs VIGENTE pela existência do vínculo (D-09) | sem profissional → VIGENTE direto |
| RN07 | validação só em `versoes_perfil`, nunca em `materiais_adaptados` | profissional `update` em materiais → 403 |
| RN08 | revogação bloqueia inserts imediatamente (D-11) | revogar + POST gerar → 403 |

---

## 8. Requisitos internos (Sistema) — o que precisa existir para as histórias acima

**HU-S.01 — Calcular `ciclosConsecutivos`.** `fechar-ciclo` compara a
observação de cada dimensão com os ciclos anteriores do mesmo estudante e
conta quantos consecutivos têm a mesma escala. Entrada do motor
(`tipos.ts:30`), hoje ninguém a produz. Teste: 3 ciclos AMPLIADA → 3;
AMPLIADA, ESTÁVEL, AMPLIADA → 1.

**HU-S.02 — Derivar `interesseAncora`.** Última `observacoes` com
`INTERESSE_MANIFESTO` + `AMPLIADA` → `evidencia` normalizada (trim, minúsculas).
Sem observação → mantém o valor anterior; nunca `null` se já houve um.

**HU-S.03 — `adaptador.ts` no motor.** `adaptar(texto, parametros) → TextoAdaptado`
puro: segmenta em blocos ≤ `maxLinhasPorBloco`, limita a `blocosPorMaterial`,
reescreve enunciados compostos em etapa única quando `formatoEnunciado =
ETAPA_UNICA` (heurística: divide em "1. … 2. …"). Testes Vitest, sem rede.

**HU-S.04 — Edge Function `gerar-material`.** As 18 mensagens do diagrama
de sequência viram a ordem das linhas: (2) valida body com Zod → (3–4) busca
VIGENTE → (5–6) `adaptar` → alt IA (7–8) → (9–10) insert rascunho com
`versao_perfil_id` → (11) retorna. Cache por hash(texto)+`versao_perfil_id`.
Timeout de IA de 30 s com fallback para camada 1.

**HU-S.05 — Interface de LLM própria.** `interface ProvedorIA { simplificar(texto, parametros): Promise<ResultadoIA> }`
com implementação real + implementação `Desligada` (retorna o texto intacto).
Saída validada por Zod. Chave só em variável de ambiente da Edge Function.

**HU-S.06 — Migration `0004_revisao_requisitos.sql`.** Tudo de D-01, D-04,
D-06, D-07, D-08, D-11, D-12, D-13 e `justificativa_revisao`. Deve rodar
depois de `0003` sem quebrar o seed.

**HU-S.07 — Testes de RLS negativos.** Um arquivo por papel, cada teste
tenta o acesso **negado** primeiro (CLAUDE.md). Mínimo: os 15 testes da
coluna *Teste* da seção 7.

---

## 9. Backlog derivado (ordem de execução — viram cards)

Respeita a ordem inegociável do CLAUDE.md: schema/RLS → motor → Edge
Function → frontend.

1. **Migration `0004`** (HU-S.06) — desbloqueia tudo.
2. **Testes de RLS negativos** (HU-S.07) — primeiro card de segurança;
   Exemplo 3 (docente × `notas_clinicas`) é o primeiro teste.
3. **`fn_cadastrar_estudante` + seed atualizado** (HU-C.01).
4. **Motor: `ciclosConsecutivos`, `interesseAncora`, `adaptador.ts`** (HU-S.01–03).
5. **EF `fechar-ciclo`** (HU-D.02, HU-S.01–02).
6. **EF `gerar-material`** com `ProvedorIA.Desligada` (HU-S.04–05, HU-D.03).
7. **Job de expiração + view `pendencias_validacao`** (D-07).
8. **EFs `convidar-responsavel`, `exportar-dados-estudante`, `excluir-estudante`** (D-05, D-08).
9. **Scaffold `apps/web`** — só aqui. Primeiras telas, nesta ordem: consentimento
   (HU-R.01) → observação quinzenal (HU-D.01) → gerar + revisar (HU-D.03/04) →
   validar (HU-P.01) → desfecho (HU-D.06).
10. **`ProvedorIA` real** (RF10) — depois de tudo funcionar com IA desligada.
11. **CI** (`npm test` do motor + testes RLS contra Supabase local).
12. *Cortáveis:* indicadores agregados (HU-C.05), notificações push.

---

## 10. Atualizações a fazer nos artefatos do TCC

- **CLAUDE.md** — RN01 reformulada (D-11); adicionar D-01 ("o sistema não
  armazena laudo") às regras; adicionar `docs/requisitos.md` à lista de leitura.
- **Diagrama de classes** — `ParametrosAdaptacao` com 6 campos; adicionar
  `NotaClinica`, `Auditoria`; `Usuario.papelInstitucional`; `Observacao.papelAutor`.
- **Diagrama de casos de uso** — já está correto (geração só pelo docente);
  só a matriz do pré-projeto estava divergente.
- **Pré-projeto §6 (matriz)** — substituir pela v2 (seção 6 deste documento).
- **Pré-projeto §7 (modelo)** — substituir `Gatilho/Estrategia/Interesse` pela
  tabela de mapeamento de D-03.
- **Pré-projeto §8** — esclarecer "roda no cliente" = apresentação (D-10).
