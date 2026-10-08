# Ameaças (STRIDE resumido) e o teste que cobre cada uma

**Data:** 08/10/2026 · **Escopo:** banco v3 (`0003`–`0006`), Edge Functions (R3), protótipo (R4).
**Leitura:** cada linha é uma ameaça plausível. "Teste" aponta onde ela é **provada negada**, não só "tratada".
Suítes: **P** = `packages/politicas` (PGlite local + Postgres do Supabase no CI) · **F** = `packages/funcoes` · **M** = `apps/web/src/services/mockApi.test.ts` · **T** = testes de tela (jsdom + axe) · **E** = E2E Playwright.

STRIDE: **S**poofing (falsificar identidade) · **T**ampering (adulterar dado) · **R**epudiation (negar autoria) · **I**nformation disclosure (vazar dado) · **D**enial of service (indisponibilidade) · **E**levation of privilege (ganhar poder indevido).

## F3 / F10 · Consentimento (RN01, RN08)
| # | STRIDE | Ameaça | Controle | Teste |
|---|---|---|---|---|
| A-01 | S/E | Docente (ou qualquer usuário) cria um consentimento "em nome da família" para liberar geração | Sem `insert` direto; só `fn_conceder_consentimento`, que exige vínculo `RESPONSAVEL` ativo | P "S-04", "S-05", "S-06" |
| A-02 | T/R | Responsável apaga o registro de consentimento e some com a trilha | Sem `delete` para ninguém + trigger que impede apagar com o estudante existente; evento em `auditoria` | P "S-07" · P "auditoria somente-inserção" |
| A-03 | T | Consentimento movido para outro estudante | Sem `update` direto | P "S-08" |
| A-04 | E | Após a revogação, docente/profissional continuam lendo ou escrevendo | Policies de leitura e escrita exigem consentimento (D-11) | P bloco "RN08/D-11 · depois da revogação" · E (via mock) |
| A-05 | I | Pessoa sem vínculo descobre se um estudante tem consentimento (oráculo) | Helpers no schema `privado`, não exposto | P "S-30" |

## F5 · Vínculo de profissional de saúde (RN02, D-24)
| # | STRIDE | Ameaça | Controle | Teste |
|---|---|---|---|---|
| A-06 | E | Coordenação se vincula como profissional e lê nota clínica | Ninguém vincula a si mesmo; vínculo só por RPC; proposta da coordenação fica pendente até o responsável confirmar | P "S-11", "S-12", "S-13" · M "S-11 negado" |
| A-07 | E | Coordenação remove o responsável legal para tirar a família do controle | `fn_encerrar_vinculo` não encerra `RESPONSAVEL` | P "S-14" · M "S-14 negado" |
| A-08 | E | Profissional proposto (ainda não confirmado) lê dados | Só vínculo `ATIVO` conta em `privado.papel_em` | P "proposta da coordenação fica pendente…" · M idem · T "família vê a proposta pendente…" |
| A-09 | S | Profissional com registro de conselho falso | Registro declarado + estado `NAO_VERIFICADO`/`VERIFICADO` com autor da verificação (verificação manual, limitação assumida) | P "coordenação verifica o registro; docente não" |
| A-10 | E | Duas contas/dois papéis no mesmo estudante escolhem o papel "melhor" (D1) | `unique` parcial: um vínculo vigente por pessoa e estudante | P "S-09", "S-10" |

## Nota clínica (RN02, D-30)
| # | STRIDE | Ameaça | Controle | Teste |
|---|---|---|---|---|
| A-11 | I | Docente/família/coordenação leem nota clínica pela API | `revoke all` na tabela; leitura só por `fn_ler_notas_clinicas` (profissional ativo + aal2 + consentimento) | P "S-01", "S-13" · E "docente abrindo a nota clínica" |
| A-12 | S | Sessão roubada de profissional (sem segundo fator) lê nota | Exige `aal2` (TOTP) no banco | P "profissional sem segundo fator (aal1) não lê" |
| A-13 | T | Profissional altera ou apaga nota de outro profissional | Sem acesso direto à tabela; só inserção por RPC | P "S-16/S-16b/S-17" |
| A-14 | R | Profissional nega ter lido a nota | Toda leitura grava `LEITURA_NOTA_CLINICA`; responsável vê quem leu e quando | P "PERMITIDO: profissional lê; responsável vê QUE leu…" · M "leitura de nota clínica entra na trilha" · T "UX-09" |

## F6 / F7 · Ciclo e validação (RN03, RN05, RN07)
| # | STRIDE | Ameaça | Controle | Teste |
|---|---|---|---|---|
| A-15 | T | Profissional reescreve os parâmetros (não só aprova) | Parâmetros imutáveis por trigger; ajuste = nova versão com justificativa | P "S-24", "ajuste cria nova versão" |
| A-16 | T | Duas versões vigentes / aprovar versão antiga por cima da nova | Índice único de uma `VIGENTE`; RPC recusa versão ≤ vigente e expirada | P "S-25", "RN05: … a expirada não volta" · M "M-01/S-25" |
| A-17 | T | Cliente grava versão de perfil inventada (sem o motor) | `fn_registrar_fechamento` só para service role; revalida | P "docente não chama a porta de gravação direto (não inventa versão de perfil)" |
| A-18 | E | Usuário força a expiração/execução da tarefa agendada | `fn_expirar_validacoes` sem `execute` para `authenticated` | P "authenticated não executa…", "RN05: o sistema expira…" |
| A-19 | T | Observação gravada em nome de outro / em ciclo fechado | `autor_id` e `papel_autor` definidos pelo servidor; coluna não gravável | P "cliente não escolhe a autoria", "ninguém observa em ciclo fechado" |

## F8 / F9 · Geração e aprovação de material (RN04, RN06)
| # | STRIDE | Ameaça | Controle | Teste |
|---|---|---|---|---|
| A-20 | T | Cliente grava "texto adaptado" que o motor não produziu | Inserção só pela Edge Function (`fn_registrar_material` = service role) | P "docente não chama a porta de gravação direto (não forja texto adaptado)" · P "S-20" |
| A-21 | E | Docente aprova rascunho de outro docente | `fn_decidir_material` só para o autor | P "S-19" · M "S-18/S-19 D-34" |
| A-22 | I | Família vê rascunho com erro (antes da revisão humana) | Rascunho visível só ao autor | P "S-18" · E "família abrindo um rascunho" |
| A-23 | T | Material gerado com perfil pendente ou de outro estudante | Trigger de integridade + revalidação na porta | P "S-21/S-22" · P "RN05: não grava com versão que não é a vigente" |
| A-24 | E | "IA aplicada" sem profissional autorizado (RN06) | Banco recusa `p_ia_aplicada` sem validação clínica ativa; caso de uso nem chama a IA | P "RN06: não grava 'IA aplicada'…" · F "RN06: sem permissão do banco, a IA nem é chamada" |
| A-25 | I | Dado pessoal do estudante enviado ao provedor de IA | Provedor recebe só `{texto, parametros}` | F "minimização: a IA recebe só texto e parâmetros" |
| A-26 | T | Prompt injection no texto colado leva a IA a "aprovar" ou executar ação | Saída validada por schema estrito; a IA não tem ferramenta; aprovação só humana (RN04) | F "saída fora do contrato (ex.: instrução injetada)" |
| A-27 | D | IA lenta ou fora do ar trava a geração | Tempo limite de 30 s → só regras, com aviso | F "IA que não responde é abandonada no tempo limite" |
| A-28 | T | Desfecho registrado em rascunho ou por outro docente | Policy de inserção exige material aprovado e autor | P "S-23" · M "S-23" |
| A-29 | D | Texto gigante para esgotar a função | Limite de 20 000 no schema compartilhado e `check` no banco | F "corpo inválido → 400…" |
| A-30 | T | Corpo da requisição com `docenteId` forjado | Schema `.strict()`; docente sempre vem de `auth.uid()` no banco | F "campo extra no corpo (ex.: docenteId forjado) → 400" |

## Cadastro, escola e coordenação (D-23)
| # | STRIDE | Ameaça | Controle | Teste |
|---|---|---|---|---|
| A-31 | E | Coordenação de outra escola vê ou cadastra estudantes | Escopo por `membros_escola` | P "coordenação de OUTRA escola não vê nem cadastra…" |
| A-32 | E | Coordenação sem segundo fator administra | `aal2` exigido | P "D-32 coordenação sem segundo fator (aal1) não cadastra" |
| A-33 | I | Painel da escola expõe dado pedagógico/clínico | Resumo só com contagens e motivos | M "coordenação recebe só contagens e motivos — nenhum campo de conteúdo" · E "painel da escola" |

## Transversais
| # | STRIDE | Ameaça | Controle | Teste |
|---|---|---|---|---|
| A-34 | I | Coluna sensível exposta apesar do RLS (D7) | GRANT por coluna (`laudo_apresentado_em`, `email`, `user_agent`) | P "docente não lê laudo…", "ninguém lê e-mail…", "user_agent não é legível" |
| A-35 | E | Usuário anônimo lê qualquer tabela | `revoke all … from anon` | P "anon não lê nenhuma tabela" |
| A-36 | E | Função `security definer` sequestrada por `search_path` | `search_path = ''` em todas | P "S-29" · `supabase db lint --fail-on warning` no CI |
| A-37 | R | Alguém apaga ou altera a trilha de auditoria | Trigger somente-inserção (inclusive para o dono) | P "nem o sistema altera ou apaga eventos" |
| A-38 | I | Erro interno vaza estrutura do banco ou dado pessoal | Erro inesperado → 500 genérico; logs sem corpo nem usuário | F "erro inesperado do banco → 500 genérico, sem vazar detalhe" |
| A-39 | I | Notificação de revogação expõe o motivo ou um dado da família | Notificações tipadas, sem texto livre | M "F10: revogação avisa todos os vinculados, menos quem revogou" · T "sino com contagem…" |
| A-40 | E | Tela "esconde" um botão, mas a ação passa por URL direta | A tela nunca decide; serviço/banco negam | E bloco "Acesso indevido por URL" · T "caminhos negados" |

## Ameaças conhecidas **sem** teste automatizado (limitações declaradas)
| # | Ameaça | Situação |
|---|---|---|
| L-01 | Força bruta no login / limite de taxa | Depende do Supabase Auth (`rate_limit` no `config.toml`); será verificado no R2 com o projeto na nuvem |
| L-02 | Material já impresso ou baixado continua com a família ou a escola após a revogação | Limitação assumida (ADR-10); a tela de revogação avisa |
| L-03 | Leituras não clínicas (perfil, observações) não são auditadas | PostgREST não registra `select`; só a nota clínica passa por RPC auditada (ADR-11) |
| L-04 | Verificação real do registro no conselho profissional | Manual, registrada (ADR-05); sem integração com conselhos |
| L-05 | CSP e cabeçalhos de segurança no host | R5.5 — depende do provedor de hospedagem escolhido |
| L-06 | Camada HTTP das Edge Functions contra o runtime real | Só `deno check` + revisão; teste com `supabase functions serve` no CI está no backlog do R5 |
