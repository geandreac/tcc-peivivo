# Fase 0 · Decisões (ADRs) da reformulação

**Data:** 07/10/2026 · **Estado:** APROVADAS em 07/10/2026 pela dupla (ADR-00 trilha (A), ADR-04 (a), ADR-05 (a), ADR-06 (a)); demais ADRs seguem as recomendações. ADR-07 (laudo) ainda deve ser confirmado com a orientadora.
Registradas em `docs/requisitos.md` como D-19…D-39.
Formato curto por ADR: contexto → decisão recomendada → alternativa rejeitada → consequências.
`[DECISÃO DO USUÁRIO]` = não escolhi; apresento opções e recomendação, e espero a resposta.
Ao aprovar, cada ADR vira um `D-19…` em `docs/requisitos.md` §1, como manda o `CLAUDE.md`.

Correspondência com o prompt: D1→ADR-02/03 · D2→ADR-04 · D3→ADR-05 · D4→ADR-06 · D5→ADR-10 · D6→ADR-13 · D7→ADR-14 · D8→ADR-10 · D9→ADR-18 · D10→ADR-09/19 · D11→ADR-11 · D12→ADR-17 · matriz §4.4→ADR-07/15.

---

## ADR-00 · Escopo cabe no prazo? `[DECIDIDO: (A) trilha mínima]`

**Contexto.** Congelamento em 26/11/2026 e defesa em dezembro (`docs/plano-desenvolvimento.md`). Hoje é 07/10: restam 7 semanas. Com ~12 h/semana por pessoa, são **~170 h**, e parte disso vai para monografia, piloto e slides. Minha estimativa dos marcos do prompt **[SUPOSIÇÃO, ±30 %]**:

| Marco | h | Marco | h |
|---|---|---|---|
| M1 identidade + dados + testes de política | 40 | M6 profissional + expiração | 25 |
| M2 design system novo + auth + MFA | 50 | M7 gerar-material + revisão | 35 |
| M3 responsável | 25 | M8 notificações, auditoria, LGPD, PWA | 40 |
| M4 coordenação | 30 | M9 endurecimento | 30 |
| M5 docente | 20 | **Total** | **~295 h** |

**Opções.**
- **(A) Trilha mínima defensável (recomendada), ~135 h.** Ordem: M1 completo (o banco nega tudo o que deve negar, provado por testes de política) → auth real mínima (convite, senha, recuperação, TOTP para saúde e coordenação) → `supabaseApi` atrás do contrato atual, com **as telas existentes** → Edge Functions `fechar-ciclo`, `gerar-material`, expiração RN05 → correções de UX de gravidade alta (UX-01, 03, 08, 09) → Playwright com caminhos negados por URL. Design system **evolui** (tokens, ícones, navegação inferior, tema escuro), sem reescrita. Notificações no app, exportação e auditoria visível ao responsável entram se sobrar tempo.
- **(B) Prompt completo M1–M9.** Não cabe sem cortar piloto e monografia. Alto risco de chegar à banca com o backend pela metade.
- **(C) Só backend (M1 + Edge Functions), interface intacta.** Mais seguro para o prazo, mas não responde à motivação de "melhorar o produto".

**Por que (A).** A pergunta da banca é "como você sabe que é seguro?" (prompt §10). Hoje a resposta honesta é "não é": 25 sondas passam (`AUDITORIA.md` §3). Isso vale mais que telas novas. A interface atual já é acessível e testada.

---

## ADR-01 · Princípio de autorização: o banco decide; o cliente não escreve tabelas críticas

**Decisão.** Três camadas, como no prompt §4.2, com uma regra a mais: **tabelas cuja escrita define o que outra pessoa pode fazer não recebem `insert`/`update`/`delete` do cliente**. Elas são escritas só por funções `security definer` (RPC) ou Edge Functions, que validam a regra e gravam auditoria na mesma transação. São elas: `consentimentos`, `vinculos_usuario_estudante`, `versoes_perfil`, `estudantes`, `auditoria`, `convites`. As demais (`observacoes`, `notas_clinicas`, `desfechos`) continuam com RLS de escrita, mas **toda policy de escrita tem `with check` explícito** e nunca `for all`.

**Rejeitada.** Remendar cada policy `for all` com `with check`. Corrige S-04/05/07/08, mas deixa a lógica de transição (ATIVO→REVOGADO, PENDENTE→VIGENTE) espalhada em condições SQL difíceis de testar.

**Consequência.** O contrato `PeiVivoApi` não muda: `concederConsentimento()` chama `rpc('fn_conceder_consentimento')` em vez de `insert`.

---

## ADR-02 · D1: um papel por pessoa por estudante (confirma D-14)

**Contexto.** S-09/S-10: com dois vínculos, `fn_meu_papel` escolhe um pela ordem do índice, não por regra.

**Decisão.**
1. `unique (usuario_id, estudante_id)` em vínculos não encerrados (índice único parcial `where status <> 'ENCERRADO'`, para preservar o histórico; ver ADR-17).
2. Coordenação deixa de ser vínculo por estudante e passa a ser **papel na escola** (ADR-04). Isso some com o caso real que motivou o bug: a coordenadora que também é docente da turma.
3. `fn_meu_papel` reescrita sem `limit 1`, já que a unicidade garante uma linha, com `set search_path = ''` (S-29). Para leitura clara das policies, cria-se `fn_tem_papel(estudante, variadic papeis)` → boolean.
4. Teste que prova o bug **antes** da correção: S-09/S-10 viram testes de política (inserir o segundo vínculo deve falhar com `unique_violation`).

**Rejeitada.** Vários papéis por estudante com união de permissões (`fn_tem_papel` sem unicidade). Funciona tecnicamente, mas legitima a mãe que observa o próprio filho como docente, um conflito de interesse que a escola deve resolver com outro docente. Quando acontecer, o caso fica documentado como limitação: duas contas ou outro docente.

---

## ADR-03 · Contexto ativo sem seletor global; rotas por estudante, não por papel

**Contexto.** O prompt pede um seletor "Estou agindo como…" e rotas `/r /d /s /c`. Mas o papel é **por estudante**: a professora que é mãe de outra criança é docente do Miguel e responsável da Ana **ao mesmo tempo**.

**Decisão.**
- A tela inicial agrupa por papel: "Meus filhos" (responsável), "Minha turma" (docente), "Validações" (saúde), "Minha escola" (coordenação). Cada grupo só aparece se houver vínculo.
- Dentro de `/estudantes/:id`, o papel daquele estudante define navegação, ações e vocabulário. O contexto fica visível no cabeçalho ("Você é: Docente regente").
- Área institucional em `/escola/...` (coordenação). Sem prefixos por papel.
- Ao trocar de estudante, limpa-se o cache de dados (prompt §8).

**Rejeitada.** Seletor global de modo: um passo a mais para todo usuário com mais de um vínculo e um estado escondido ("em que modo estou?"). Rotas `/d/...` também quebram links compartilhados entre papéis, como a coordenação mandar o link de um estudante ao docente.

---

## ADR-04 · D2: entidade escola `[DECIDIDO: (a) escola mínima]`

**Contexto.** S-15: o primeiro estudante não pode ser cadastrado. Sem escola, "coordenação de onde?" não tem resposta.

**Opções.**
- **(a) Recomendada: escola mínima.** `escolas(id, nome)`, `estudantes.escola_id not null`, `membros_escola(usuario_id, escola_id, papel in ('COORDENACAO','DOCENTE'), status)`. Coordenação lê dados **administrativos** dos estudantes da sua escola (nome, turma, situação do consentimento e da validação) e gerencia vínculos e convites. `turma` continua texto. A escola e o primeiro coordenador são criados por `scripts/implantar-escola.ts` com service role, documentado. Sem painel de super-admin.
- **(b) Sem escola.** Mantém `usuarios.papel_institucional` (D-08) e a RPC de cadastro. Limitação documentada: um só "universo" de coordenação, inviável fora do piloto.

**Consequência de (a).** Docente também é membro da escola, o que é necessário para a coordenação poder convidá-lo e vinculá-lo. O diagrama de classes ganha `Escola` e `MembroEscola`.

---

## ADR-05 · D3: quem autoriza o profissional de saúde `[DECIDIDO: (a) proposta + confirmação do responsável]`

**Contexto.** S-11/S-12/S-13: hoje a coordenação se dá acesso clínico e lê a nota reservada.

**Opções.**
- **(a) Recomendada: proposta + confirmação do responsável.** Coordenação ou responsável propõe → vínculo `PENDENTE_RESPONSAVEL` → **o responsável confirma** → `ATIVO`. Registro de conselho declarado, com `verificacao_registro in ('NAO_VERIFICADO','VERIFICADO')`, `verificado_por`, `verificado_em`. A conferência é manual (site do conselho), feita pela coordenação e registrada na auditoria. A tela mostra "registro não verificado" sem bloquear o acesso.
- **(b) Igual à (a), mas o acesso só é liberado após a verificação.** Mais seguro, mas acrescenta mais um passo e mais uma pessoa ao fluxo, e o piloto pode travar nisso.
- **(c) Como hoje: a coordenação cria direto.** Rejeitada por mim: contradiz RN02 e LGPD art. 11.

Em todas: ninguém cria vínculo **para si mesmo** (`usuario_id <> autor`), e só RPC escreve vínculo (ADR-01).

---

## ADR-06 · D4: mais de um responsável `[DECIDIDO: (a) qualquer um revoga]`

**Opções.**
- **(a) Recomendada.** Todos os responsáveis ativos veem tudo o que o papel permite. **Qualquer um revoga sozinho** (lado seguro, RN08). **Reconceder** exige um responsável e notifica os demais. **Excluir os dados** (F11) exige a confirmação de **todos** os responsáveis ativos em até 7 dias; sem isso, a exclusão não acontece e a revogação continua valendo. Tudo vai para a auditoria.
- **(b) Responsável principal único** decide tudo; os demais só leem. Mais simples, mas cria conflito em guarda compartilhada.

**Prova de que é o responsável legal** (vale para as duas): a coordenação cadastra o e-mail informado na matrícula e, **antes de enviar o convite**, marca "vínculo conferido presencialmente com documento", que fica registrado em `vinculos.conferido_por/em`. O convite só sai com essa marca. O sistema não guarda cópia de documento.

---

## ADR-07 · Laudo não entra no sistema (mantém D-01; contraria o prompt)

**Contexto.** A matriz do prompt dá "Laudo: Total" ao responsável e ao profissional e pede tela de upload.

**Decisão.** Manter D-01. O sistema guarda só `laudo_apresentado_em` (data), visível a responsável, profissional e coordenação, e oculto ao docente (ADR-14).

**Motivo.** O laudo é dado sensível de saúde (LGPD art. 11). Guardá-lo cria o alvo de maior impacto do sistema sem melhorar o ciclo: o motor nunca usa diagnóstico, e esse é o diferencial do projeto ("perfil, não rótulo"). Também responde diretamente à preocupação nº 1 da pesquisa (privacidade, 59,3 %; ver C-10 em `AUDITORIA.md`).

**Rejeitada.** Storage privado com RLS por bucket. É tecnicamente viável, mas exige criptografia, retenção, exclusão em cascata no storage e auditoria de download. É escopo de outro trabalho.

---

## ADR-08 · Consentimento granular, versionado e escrito só por RPC

**Decisão.**
- `consentimentos(..., escopos escopo_consentimento[] not null, versao_termo text not null, aceito_por, aceito_em, revogado_por, revogado_em, user_agent)`. Sem IP: é minimização, e o IP não ajuda a provar nada aqui.
- Escrita só via `fn_conceder_consentimento(estudante, escopos, versao_termo)` e `fn_revogar_consentimento(estudante)`, que verificam o vínculo `RESPONSAVEL` ativo do chamador. Sem `delete` para ninguém (S-07). Revogar não apaga: cria o evento e marca `REVOGADO`.
- Escopos com efeito real: `observacao_pedagogica` (docente observa), `observacao_domiciliar` (responsável observa), `validacao_clinica` (profissional vinculado; sem ele, RN06), `geracao_material`. Escopo sem efeito no código não entra.
- D-11 mantido: depois da revogação, responsável e coordenação leem; docente e profissional não leem nem escrevem.
- Oráculo S-30: `fn_tem_consentimento_ativo` só responde a quem tem vínculo (senão devolve `false`) e sai do `grant execute` para `anon`.

---

## ADR-09 · D10: notificações no app; e-mail só o que o Auth já envia

**Decisão.** Tabela `notificacoes(id, usuario_id, tipo, estudante_id, criada_em, lida_em)`. O conteúdo é **tipado**, sem texto livre com dado pessoal: o app monta a frase a partir do tipo. Escrita só por trigger ou função. Centro de notificações com contagem no cabeçalho. Tipos: convite aceito, validação pendente, validação expirando (dia 5), expirada, revisão solicitada, consentimento revogado (**sem motivo**), profissional proposto aguardando confirmação.
E-mail: só convite e recuperação de senha, que o Supabase Auth envia. Para o piloto, configurar SMTP próprio (o SMTP padrão do Supabase tem limite baixo de envio; **[SUPOSIÇÃO]**: conferir o limite atual no painel).

**Rejeitada.** E-mail transacional para todo evento (Resend etc.): mais um fornecedor, mais um lugar com dado pessoal e mais custo de tempo. Vai para `BACKLOG-FUTURO.md`.

---

## ADR-10 · D5/D8: estudante sem conta; nenhum dado de estudante em cache do navegador

**Decisão.**
- Sem login de estudante (D5). O material chega impresso, em PDF via impressão do navegador ou aberto na sessão do docente.
- **Service worker só para o "app shell"** (HTML, JS, CSS, ícones). Materiais, perfis e observações **não** são cacheados. Assim a RN08 vale também para a tela do docente: depois da revogação, a próxima abertura falha com o estado "negado".
- Nada sensível em `localStorage`/IndexedDB. A sessão do Supabase usa `localStorage` por padrão: aceito para o token, mas com expiração curta (ADR-13). Preferências de acessibilidade continuam no `localStorage`, porque não são dado pessoal.
- Rascunho de observação com conexão ruim: só **em memória** durante a sessão, com reenvio automático. Se a aba fechar, perde-se, e isso fica documentado.
- **Limitação assumida (para o artigo):** o que já foi impresso ou salvo em PDF antes da revogação não pode ser recolhido. A tela de revogação diz isso ao responsável.

**Rejeitada.** Cache de materiais com TTL e limpeza ao sincronizar: a limpeza depende de o docente abrir o app online, então a RN08 não fica garantida.

---

## ADR-11 · D11: auditoria append-only; leitura de nota clínica auditada

**Decisão.** `auditoria(id, escola_id, estudante_id, evento, entidade, entidade_id, autor_id, papel_autor, criado_em, detalhes jsonb)`, sem `update`/`delete` para nenhum papel, nem `service_role` via policy. É escrita só por triggers `security definer` e funções. `detalhes` nunca leva conteúdo de observação ou nota.
- **Leitura de `notas_clinicas` passa a ser só via `fn_ler_notas_clinicas(estudante)`**, que grava `LEITURA_NOTA_CLINICA`. O `select` direto é revogado (`revoke select`).
- Quem lê a auditoria: responsável (eventos do próprio filho, **incluindo quem leu nota clínica e quando**, sem o conteúdo); coordenação (eventos administrativos da escola: vínculos, convites, consentimento concedido/revogado, sem leitura clínica); profissional e docente não leem.
- Outras leituras (perfil, observações) continuam **não auditadas**. É limitação documentada: PostgREST não registra `select`.

---

## ADR-12 · Frontend: evoluir, não reescrever (mantém D-15; contraria o prompt §8)

**Contexto.** O prompt pede Tailwind, Radix/shadcn, TanStack Query, react-hook-form, Zod e pastas por feature. Há 22 telas com 68 testes e axe zerado, e restam 7 semanas.

**Decisão.**
- **Mantém:** CSS com tokens (D-15), componentes próprios, `useConsulta`, contrato `PeiVivoApi`.
- **Adiciona:** `@supabase/supabase-js`; **Zod** num pacote `packages/contratos` usado pelas Edge Functions e pelo cliente (é aqui que o ganho é real: um schema validando dos dois lados); `lucide-react` (ícones); tema escuro e opção de fonte para dislexia em `tokens.css`; navegação inferior no celular; tipos gerados (`supabase gen types`) mapeados para `services/tipos.ts`.
- **Não adiciona agora:** Tailwind, Radix, TanStack Query, react-hook-form, Storybook ou Ladle. Uma página `/dev/componentes`, só em modo dev, cumpre o papel de catálogo com menos custo. Tudo isso vai para `BACKLOG-FUTURO.md`.

**Rejeitada.** Reescrita da stack: consome cerca de 50 h do M2 sem mudar o que a banca avalia, e reabre a acessibilidade que já está verificada.

---

## ADR-13 · D6: autenticação

**Decisão.**
- `enable_signup = false`. Conta só por convite, emitido pela Edge Function `convidar` (service role), com validade de 7 dias, uso único e registro de quem convidou. Reenviar invalida o convite anterior.
- E-mail + senha (mínimo 10, sem regra de composição, colar permitido, `autocomplete="current-password"`), conforme WCAG 3.3.8. E-mail confirmado pelo próprio convite.
- **TOTP obrigatório para `PROFISSIONAL_SAUDE` e `COORDENACAO`**, garantido **no banco**: as policies e RPCs clínicas e administrativas exigem `auth.jwt()->>'aal' = 'aal2'`. A interface só orienta. Códigos de recuperação: o Supabase não gera códigos de backup para TOTP **[SUPOSIÇÃO a confirmar na doc atual]**. Alternativa: dois fatores TOTP (celular e outro dispositivo) e redefinição pela coordenação, auditada.
- Sessão: JWT de 1 h com refresh rotativo; inatividade de 30 min nas telas de saúde e coordenação (no cliente) e `timebox` de 12 h no Auth. "Sair de todos os dispositivos" = `signOut({ scope: 'global' })`.
- Mensagem de login genérica ("e-mail ou senha incorretos"). O limite de tentativas é o do Auth (`sign_in_sign_ups`).
- **Papel nunca no JWT** (o papel é por estudante; quem decide é a RLS).
- **[VERIFICADO 07/10/2026]** "TOTP MFA API is free to use and is enabled on all Supabase projects by default" (supabase.com/docs/guides/auth/auth-mfa/totp). A política recomendada pela doc para exigir aal2 é `as restrictive … using ((select auth.jwt()->>'aal') = 'aal2')`, que é a forma usada no M1. A mesma doc não menciona códigos de recuperação; vale o fluxo F15.
- Passkeys: fora do escopo (backlog).

---

## ADR-14 · D7: colunas sensíveis por GRANT de coluna, não por RLS

**Decisão.** `revoke select on estudantes from authenticated` + `grant select (id, nome, data_nascimento, turma, escola_id, created_at) on estudantes to authenticated`. `laudo_apresentado_em` só via `fn_laudo_apresentado_em(estudante)`, que nega ao docente. Mesma técnica em `vinculos` para `registro_conselho` (visível ao próprio profissional, ao responsável e à coordenação, nunca ao docente). Prova: teste de política (Vitest + PGlite, e no CI contra o Supabase) em que `select laudo_apresentado_em from estudantes` como docente dá `permission denied`.

**Rejeitada.** Views `security_invoker` por papel: duplicam o modelo e precisam de uma view por combinação de papel.

---

## ADR-15 · Matriz de permissões v3 (o prompt desafia a v2)

| Informação | Responsável | Docente | Saúde | Coordenação |
|---|---|---|---|---|
| Dados básicos do estudante | L | L | L | L + E (cadastro) |
| `laudo_apresentado_em` | L | ❌ | L | L + E |
| Consentimento | **concede/revoga** | situação (ativo ou não) | situação | situação |
| Observações | L + E própria | L + E própria | L + E própria | **L (no histórico do PEI, não no painel)** |
| Perfil (parâmetros) | L (traduzido) | L (traduzido) | L + **valida** | L |
| Nota clínica | ❌ | ❌ | L + E própria (aal2, auditada) | ❌ |
| Material rascunho | ❌ | **só o autor** | ❌ | ❌ |
| Material aprovado e desfecho | L | L + E (autor) | L | L |
| Vínculos | L (do filho) + **confirma profissional** | L próprio | L próprio | propõe/encerra |
| Auditoria | L (do filho) | ❌ | ❌ | L (administrativa) |
| Gerar material | ❌ | ✅ | ❌ | ❌ |
| Após revogação | L | ❌ | ❌ | L |

Mudanças em relação à v2: rascunho visível só ao docente **autor** (S-19); confirmação do responsável (ADR-05); auditoria administrativa da coordenação; nota clínica com aal2 e auditada.

Resposta ao desafio do prompt: coordenação **não** gera material e **não** vê observação no painel. Ela lê observações só no histórico do PEI, que é obrigação legal dela (LBI). Profissional **não** gera material (D-02).

---

## ADR-16 · Ciclo de vida da versão de perfil

`status_validacao`: `PENDENTE → VIGENTE | EM_REVISAO | EXPIRADA`, e `VIGENTE → SUBSTITUIDA` quando outra entra em vigor. Índice único parcial: **uma** `VIGENTE` por estudante (corrige S-25 e M-01). Transições só por `fn_validar_versao(versao, decisao, justificativa)`, que exige aal2 e consentimento e grava auditoria. Parâmetros são imutáveis depois de criados (trigger; corrige S-24). O "ajuste" do profissional cria **nova versão** com origem `AJUSTE_PROFISSIONAL` e justificativa obrigatória, em vez de editar a proposta. Não se aprova versão de ciclo mais antigo que a vigente.

---

## ADR-17 · D12: virada de ano e transferência

Vínculo ganha `status in ('ATIVO','ENCERRADO', 'PENDENTE_RESPONSAVEL')` + `encerrado_em`, `encerrado_por`. A coordenação encerra em lote ("encerrar vínculos de docentes da turma X"). O perfil pertence ao estudante. O novo docente vê o perfil vigente e as observações anteriores (é o problema "recomeça do zero" que o produto resolve), e nunca nota clínica (já é regra). Transferência entre escolas: **fora do escopo**. O estudante é encerrado na escola de origem e o responsável exporta os dados (F11). Fica como limitação documentada.

---

## ADR-18 · D9: regras no servidor

- `gerar-material` (Edge Function): valida corpo com Zod; verifica vínculo DOCENTE, consentimento com escopo `geracao_material`, versão `VIGENTE` única (RN05), RN06 (IA só com profissional e escopo `validacao_clinica`); grava rascunho com `docente_id = auth.uid()`. O cliente perde a policy de `insert` em `materiais_adaptados` (S-20/21/22). Aprovar e descartar via `fn_decidir_material` (só o autor, só rascunho, com consentimento; S-19/S-28). Desfecho só em material aprovado (trigger; S-23).
- `fechar-ciclo` (Edge Function): única escrita de `versoes_perfil`.
- Testes chamam as funções diretamente com JWTs de cada papel, sem passar pela UI.

---

## ADR-19 · RN05: expiração por `pg_cron`

Função `fn_expirar_validacoes(agora timestamptz default now())`, chamada diariamente por `pg_cron`. Recebe `agora` como parâmetro para ser testável (o teste chama com `now() + 8 days`). O PGlite não tem `pg_cron`: o agendamento é criado só se a extensão existir. Gera notificações (ADR-09).

---

## ADR-20 · IA continua desligada na trilha mínima

`ProvedorIA` com implementação `Desligada` (HU-S.05). As regras de prompt injection do prompt §9 ficam documentadas em `docs/seguranca-e-privacidade.md`: o texto é dado; a IA recebe só texto + parâmetros, sem nome nem idade; a saída é não confiável e passa sempre por RN04. Implementação real só se a trilha (A) do ADR-00 terminar antes de 19/11.
