# Segurança, privacidade e conformidade (LGPD)

**Versão:** 1.0 — 21/09/2026 · **Pilar:** Governança e Serviços.
**Escopo:** protótipo `apps/web` (mock, dados fictícios), schema/RLS (`supabase/`), e o sistema real planejado (Supabase Auth + Edge Functions). Este documento é uma **avaliação interna** com base na LGPD (Lei 13.709/2018) e em boas práticas; não substitui parecer jurídico nem constitui certificação.
**Princípio orientador:** o estudante é criança/adolescente com deficiência ou transtorno — os dados são **sensíveis** (LGPD art. 5º, II; art. 11; art. 14 para crianças). O sistema foi desenhado para **tratar o mínimo** e **mostrar a cada perfil só o que ele precisa**.

---

## 1. Quais dados são tratados

| Entidade (tabela) | Dados | Titular | Classificação LGPD | Base legal prevista (real) |
|---|---|---|---|---|
| `usuarios` | nome, e-mail, `auth_user_id` | Adultos (responsável, docente, profissional, coordenação) | Pessoal | Execução de contrato / legítimo interesse (acesso ao serviço) |
| `estudantes` | nome, data de nascimento, turma, **data em que o laudo foi apresentado** (só a data — D-01) | Criança/adolescente | Pessoal; a data do laudo é indireta de saúde → tratada como **sensível** | Consentimento específico do responsável (art. 14 §1º) |
| `vinculos_usuario_estudante` | papel, registro no conselho (profissional) | Adultos | Pessoal | Idem usuários |
| `consentimentos` | escopos, datas de concessão/revogação, status | Responsável (pelo estudante) | Pessoal — é a própria evidência do consentimento | Art. 8º (registro do consentimento) |
| `ciclos_observacao`, `observacoes` | dimensão, escala (reduzida/estável/ampliada), evidência em texto livre, papel do autor | Estudante | **Sensível** (comportamento/aprendizagem de pessoa com deficiência) | Consentimento (escopo `observacao_pedagogica` / `observacao_domiciliar`) |
| `versoes_perfil` | parâmetros de adaptação (números e enums), status de validação | Estudante | **Sensível** (derivado) | Consentimento |
| `materiais_adaptados` | texto original da aula, texto adaptado, status, hash | Docente (autoria) / estudante (destinatário) | Pessoal; o texto pode conter nome do estudante | Consentimento (escopo `geracao_material`) |
| `desfechos` | resultado + observação livre | Estudante | **Sensível** | Consentimento |
| `notas_clinicas` | texto livre do profissional | Estudante | **Sensível — clínico** | Consentimento + sigilo profissional; acesso exclusivo (RN02) |
| `auditoria` (0004) | evento, autor, data, detalhes | Adultos / estudante | Pessoal | Obrigação legal (prestação de contas, art. 6º X) |

**O que o sistema deliberadamente NÃO trata:** laudo, CID, diagnóstico, descrição clínica na ficha do estudante (D-01); foto; endereço; documentos; dados de outros familiares; auditoria de leitura (Won't).

## 2. Minimização de dados

| Prática | Onde |
|---|---|
| Sem laudo/diagnóstico; só a data de apresentação, e mesmo ela oculta ao docente | D-01; `mockApi.obterEstudante` (docente recebe `laudoApresentadoEm: null`); teste `D-01: docente não vê a data do laudo` |
| Observações em escala de 3 pontos por dimensão, não em texto clínico | RF03; `Escala3` |
| Nota clínica separada em tabela própria com policy exclusiva | `notas_clinicas`; `somente_profissional_acessa_nota_clinica` |
| Exportação exclui notas clínicas; rascunhos não saem do docente | `exportarDados`; teste `exportação não inclui notas clínicas` |
| Um papel por usuário por estudante (evita acúmulo de permissões) | D-14; `unique (usuario_id, estudante_id)` |
| Texto do material limitado a 20 000 caracteres | `gerarMaterial` (VALIDACAO) |
| Nenhum campo de autocompletar dados pessoais no protótipo (`autoComplete="off"`) | `Campo.tsx` |

## 3. Controle de acesso por perfil

Matriz v2 (`docs/requisitos.md` §6) aplicada **no dado**:

| Camada | Hoje | Real |
|---|---|---|
| Interface | Só mostra links/ações permitidos, mas **nunca decide** permissão (D-17) | idem |
| Serviços | `mockApi` nega (403/404) o que o RLS negará: `exigirPapel`, `exigirLeitura`, `exigirConsentimento` | `supabaseApi` só repassa; erros PostgREST mapeados (`erros.ts`) |
| Banco | 10 tabelas com RLS habilitado; 18 policies em `0002`; revisões D-11/D-12 em `0004` | RLS + JWT do Supabase Auth; `auth.uid()` ↔ `usuarios.auth_user_id` |
| Servidor | — | Edge Functions com `service_role` **só** para operações atômicas (cadastro, exclusão em cascata, expiração), sempre validando o chamador |

Provas: 34 testes negativos (`mockApi.test.ts`), 4 caminhos negados na interface (`paginas.test.tsx`), 7 de autenticação/rotas (`autenticacao.test.tsx`). Pendente: os mesmos cenários contra PostgREST (P1.11–P1.19).

## 4. Proteção de rotas

- `RotaProtegida` redireciona sem sessão para `/entrar` guardando a origem (`state.de`); testado.
- Rotas existem para todos os papéis; a **negação vem do dado** e a tela mostra o motivo sem exibir conteúdo ("Acesso negado (RN02)", "Material não encontrado").
- Não há rota administrativa oculta; o item "Cadastrar estudante" aparece só para `papelInstitucional = COORDENACAO`, e o serviço nega os demais (teste `docente não vê 'Cadastrar estudante'…`).

## 5. Senhas e autenticação

| Aspecto | Modo demonstração (hoje, D-16) | Sistema real (P4.4) |
|---|---|---|
| Credencial | Nenhuma senha; escolha de perfil fictício | E-mail + senha via Supabase Auth (bcrypt no servidor); convite por e-mail para a família |
| Armazenamento | Só o **id** do perfil em `localStorage["pei-vivo:sessao"]` (não é credencial) | JWT de curta duração + refresh token gerenciados pelo `supabase-js`; **nenhuma senha no cliente ou no repositório** |
| Expiração | Não expira (aceito: dados fictícios) | Sessão expira; `NAO_AUTENTICADO` → volta ao login (já tratado em `erros.ts`) |
| Recuperação | Não se aplica | `resetPasswordForEmail`; link de 1 h; resposta neutra (não revela se o e-mail existe) |
| Acessibilidade (WCAG 3.3.8) | Sem CAPTCHA nem teste cognitivo | Colar permitido; gerenciador de senhas; sem CAPTCHA; erro "E-mail ou senha incorretos" sem indicar qual |
| Força bruta | N/A | Rate limit do Supabase Auth; sem bloqueio permanente de conta |
| Profissional de saúde | — | Registro no conselho obrigatório no vínculo (D-13); verificação documental pela coordenação (fora do sistema) |

**O que nunca será feito:** armazenar senha em texto claro ou hash próprio; enviar senha por e-mail; guardar `service_role` no cliente; login "lembrado" sem expiração em produção.

## 6. Não exposição de credenciais e variáveis de ambiente

| Controle | Evidência |
|---|---|
| `.env`, `.env.*` ignorados; só `.env.example` versionado (placeholders) | `.gitignore`; `.env.example` |
| Varredura do repositório por `apikey|secret|password|senha|token` | Só `secrets.*` do GitHub e `env(...)` no `config.toml` (diagnóstico 21/09) |
| Secrets do CI no cofre do GitHub (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) | `manter-supabase-ativo.yml` |
| Só a chave **anon** (pública por desenho, protegida por RLS) vai ao navegador via `VITE_*` | `.env.example` |
| `service_role` e chave de IA só em `supabase secrets set` (Edge Functions) | `.env.example` (comentado) |
| Checklist do PR: "Nenhum segredo, `.env` ou dado real de estudante no diff" | `.github/pull_request_template.md` |
| `dist/`, `coverage/` fora do Git | `.gitignore` |

## 7. Política de retenção (simulada; a aplicar no sistema real)

| Dado | Retenção | Gatilho de eliminação | Onde |
|---|---|---|---|
| Dados do estudante (todos os filhos) | Enquanto houver consentimento ativo **ou** até o responsável excluir | Exclusão pelo responsável (RF15) → cascata, inclusive notas clínicas; permanece só o evento `EXCLUSAO` sem dados pessoais | `excluirEstudante`; teste `exclusão exige o nome exato, apaga em cascata` |
| Após revogação (sem exclusão) | Mantidos, **sem escrita nem leitura** por docente/profissional; responsável e coordenação leem (D-11) | Nova concessão reabre; exclusão elimina | `exigirLeitura` |
| Materiais em rascunho | Até aprovação ou descarte; descartados ficam marcados `DESCARTADO` (sem texto exibido) | Exclusão do estudante | `descartarMaterial` |
| Versão de perfil expirada/em revisão | Histórico do PEI (evidência pedagógica) | Exclusão do estudante | — |
| Auditoria | Enquanto o estudante existir + evento final de exclusão | — | D-06 |
| Contas de adultos | Enquanto houver vínculo ativo; inativação pela coordenação | Solicitação do titular (art. 18) | `desativarVinculo` |
| Dados da demonstração (`localStorage`) | Até "Restaurar dados" ou limpeza do navegador | Manual | `Ajuda.tsx` |
| Logs do Supabase | Padrão do provedor (7 dias no plano gratuito) | Automático | — |

**Fim do TCC:** o projeto Supabase de desenvolvimento/piloto será apagado após a defesa; nenhum dado de participante do piloto é guardado (participantes usam apenas o estudante fictício; respostas do SUS são anônimas).

## 8. Riscos de privacidade

| ID | Risco | Controle | Residual |
|---|---|---|---|
| P-01 | Rotulação do estudante por exposição do diagnóstico à escola | Laudo/diagnóstico não existem no sistema (D-01) | Baixo — o texto livre de observação pode conter menção; orientação na dica do campo ("descreva o que aconteceu, não o diagnóstico") a acrescentar (P4.8) |
| P-02 | Profissional de outra área lendo nota clínica | Policy exclusiva por vínculo PROFISSIONAL_SAUDE do **mesmo** estudante | Baixo |
| P-03 | Família não compreender o que autoriza | Termo em linguagem simples em 5 perguntas; escopos granulares; teste de compreensão H5 no piloto | Médio até o piloto |
| P-04 | Texto da aula com nome do estudante enviado a provedor de IA (Fase 5) | IA desligada por padrão; quando ligada: só vocabulário/exemplos; pseudonimizar nome antes do envio; fornecedor com DPA; cota | Médio — decisão D-nn a registrar na Fase 5 |
| P-05 | Dado real usado em desenvolvimento | Regra do CLAUDE.md: nunca; seed e mocks fictícios com cabeçalho; revisão de PR | Baixo |
| P-06 | Exportação JSON acessada por terceiro no dispositivo | Responsabilidade do titular; aviso na tela; sem notas clínicas no export | Baixo |
| P-07 | Sessão persistente em dispositivo compartilhado (demo) | Botão "Sair" visível; dados fictícios | Aceito na demo; real: expiração |
| P-08 | Issue pública no GitHub com dado de estudante | Regra em `itil-servicos.md` §4.4; template de issue a criar | Baixo |

## 9. Incidente de privacidade — procedimento

1. **Conter:** interromper a demonstração/piloto; se real, revogar tokens (Supabase → Auth → sessões) e, se necessário, desativar o vínculo do perfil afetado.
2. **Reproduzir:** transformar o caso num teste negativo (`mockApi.test.ts` / RLS) que falhe.
3. **Corrigir:** policy/serviço; PR com rótulo `incidente` P1; teste verde.
4. **Registrar:** data, dados afetados, perfis, causa raiz, correção — em `docs/itil-servicos.md` §4.5 e aqui (§10).
5. **Comunicar:** orientadora; no sistema real, titular/responsável e, se aplicável, ANPD (art. 48) — decisão com a instituição.

## 10. Registro de incidentes de privacidade

| Data | Descrição | Dados afetados | Ação | Estado |
|---|---|---|---|---|
| — | Nenhum incidente registrado até 21/09/2026 (sem uso real; dados fictícios) | — | — | — |

## 11. Cuidados para ambiente acadêmico e demonstração

- **Tudo é fictício e está dito na tela:** rodapé de todas as telas ("Protótipo com dados fictícios"), cabeçalho de `seed.sql` e `mocks/dados.ts`, nomes marcados "(fictício)".
- **Nunca cadastrar um estudante real na demo**, nem "só para testar": o guia de uso e o checklist do PR reforçam.
- **Piloto:** participantes usam o Miguel (fictício); nenhum dado de aluno real é digitado; respostas do SUS anônimas; termo de participação sem dados sensíveis.
- **Apresentação à banca:** usar `npm run dev` local ou o ambiente de demo com seed restaurado; não abrir o painel do Supabase com dados de terceiros na tela.
- **Capturas de tela na monografia:** só com dados fictícios; sem tokens/URLs de projeto visíveis.
- **Repositório público:** por isso mesmo, `.env` fora, secrets no cofre, e nenhum dado de participante em issues.

## 12. Conformidade — resumo

| Princípio LGPD (art. 6º) | Como o projeto atende | Status |
|---|---|---|
| Finalidade / adequação | Dados só para adaptação pedagógica; escopos de consentimento nomeiam a finalidade | ✅ |
| Necessidade (minimização) | §2 | ✅ |
| Livre acesso / transparência | Responsável e coordenação leem tudo (exceto nota clínica); histórico e auditoria visíveis; termo simples | ✅ |
| Qualidade dos dados | Observação por ciclo com autor e data; validação clínica | ✅ |
| Segurança | RLS, JWT, sem segredos no cliente, HTTPS (Supabase) | 🟡 (backend real pendente) |
| Prevenção | Confirmações em ações irreversíveis; caminhos negados testados | ✅ |
| Não discriminação | Sem diagnóstico armazenado; rótulos por comportamento observável | ✅ |
| Responsabilização e prestação de contas | Auditoria append-only; este documento; registro de incidentes | 🟡 (trigger de auditoria na `0004`) |
| Direitos do titular (art. 18) | Exportar, excluir, revogar pela interface | ✅ (protótipo) |
| Consentimento de criança (art. 14) | Específico, em destaque, pelo responsável; revogável | ✅ (protótipo) |
