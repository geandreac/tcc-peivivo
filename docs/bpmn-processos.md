# Processos do sistema — modelagem BPMN 2.0

**Versão:** 1.0 — 21/09/2026 · **Pilar:** Qualidade e Processos.
**Notação:** os diagramas abaixo estão em **Mermaid** (renderizado pelo GitHub e pelo VS Code) usando a convenção BPMN: círculo = evento (início/fim), losango = gateway exclusivo, retângulo = atividade, `subgraph` = raia (pool/lane) por responsável. **A versão final para a monografia deve ser reproduzida em ferramenta BPMN 2.0** (Bizagi Modeler, Camunda Modeler ou draw.io com a biblioteca BPMN), exportada para `docs/tcc/bpmn/*.png` — este arquivo é a especificação textual de cada processo e permanece como fonte.
**Base:** rotas de `apps/web/src/routes/index.tsx`, regras de `services/mockApi.ts`, decisões `D-nn` e regras `RN01–RN08`. Estado real: **modo demonstração** (D-16) — os passos marcados *(P4.4)* descrevem o login real planejado.

Convenção das raias: **U** = usuário (por perfil), **S** = sistema (interface + serviços), **B** = banco/RLS (hoje simulado por `mockApi`).

---

## 1. Processo de autenticação (genérico)

```mermaid
flowchart LR
    subgraph U[Usuário]
        A0((Início: quer entrar)) --> A1[Abrir /entrar]
        A1 --> A2[Escolher a porta do seu perfil]
        A2 --> A3[Ler o que o perfil faz / vê / nunca vê]
        A3 --> A4[Escolher perfil de demonstração<br/>ou informar e-mail e senha P4.4]
    end
    subgraph S[Sistema]
        A4 --> A5[api.entrar]
        A5 --> G1{Autenticou?}
        G1 -- não --> A6[Alerta role=alert:<br/>'Não foi possível entrar'] --> A4
        G1 -- sim --> A7[Guardar sessão<br/>anunciar aria-live]
        A7 --> G2{Havia rota de origem?}
        G2 -- sim --> A8[Redirecionar para a origem]
        G2 -- não --> A9[Redirecionar para /painel]
        A8 --> AF((Fim: sessão ativa))
        A9 --> AF
    end
```

| Elemento | Descrição |
|---|---|
| Evento inicial | Usuário sem sessão acessa `/entrar` (ou uma rota protegida, que o redireciona guardando `state.de`) |
| Atividades | Escolher porta (`Entrar.tsx`); ler especificação do papel (`EntrarPapel.tsx`); acionar `api.entrar(usuarioId)` |
| Decisões | G1 autenticou? (falha de rede / perfil inexistente → erro); G2 havia rota de origem? |
| Responsáveis | Usuário; sistema (`useSessao`, `RotaProtegida`) |
| Eventos intermediários | Anúncio `aria-live` "Você entrou como …" |
| Evento final | Sessão ativa; usuário no painel ou na rota de origem |
| Exceções | Falha de rede → alerta e permanece no login (TF-45); slug inválido → 404 (TF-01b); *(P4.4)* senha incorreta → "E-mail ou senha incorretos" sem dizer qual; 5 falhas → aguardar (rate limit do Supabase Auth) |
| Regras de negócio | D-16 (sem senha na demo); WCAG 3.3.8 (sem CAPTCHA, colar permitido); RN-sessão: nunca guardar senha no cliente |
| Entrada / saída | Entrada: identificador do perfil (ou e-mail + senha). Saída: `Usuario` em contexto; `localStorage["pei-vivo:sessao"]` (demo) / JWT (real) |

## 2. Login do familiar (responsável legal)

```mermaid
flowchart LR
    subgraph U[Família]
        B0((Convite recebido<br/>ou acesso direto)) --> B1[Abrir /entrar/familia]
        B1 --> B2[Ler: consentimento é a primeira ação;<br/>nunca vê nota clínica nem rascunho]
        B2 --> B3[Escolher Rosa / entrar com e-mail P4.4]
    end
    subgraph S[Sistema]
        B3 --> B4[Autenticar]
        B4 --> B5[Painel: estudantes vinculados<br/>ação principal 'Ver consentimento']
        B5 --> G{Consentimento ativo?}
        G -- não --> B6[Badge 'Aguardando consentimento'<br/>ação continua disponível] --> BF((Fim))
        G -- sim --> B7[Badge 'Consentimento ativo'] --> BF
    end
```

| Elemento | Descrição |
|---|---|
| Evento inicial | Responsável recebe convite da coordenação (P3.x `convidar-responsavel`) ou abre a porta Família |
| Atividades | Ler especificação; autenticar; ver painel com ação "Ver consentimento" |
| Decisões | Consentimento ativo? (muda badge, não bloqueia — D-11: responsável sempre lê) |
| Responsáveis | Responsável; sistema |
| Evento final | Painel da família |
| Exceções | Sem vínculo → estado vazio "Nenhum estudante vinculado a você" + orientação de pedir à coordenação |
| Regras | RN01/RN08 (só ele concede/revoga); D-11 (lê sempre); RF15 (exporta/exclui) |
| Entrada / saída | Entrada: identidade. Saída: lista de estudantes com papel RESPONSAVEL |

## 3. Login do professor (docente regente)

```mermaid
flowchart LR
    subgraph U[Professores]
        C0((Domingo à noite,<br/>celular)) --> C1[Abrir /entrar/docente]
        C1 --> C2[Ler: gera, revisa, aprova;<br/>nunca vê nota clínica nem laudo]
        C2 --> C3[Escolher Márcia ou Paulo /<br/>e-mail institucional P4.4]
    end
    subgraph S[Sistema]
        C3 --> C4[Autenticar]
        C4 --> G1{Tem vínculo ativo?}
        G1 -- não --> C5[Painel vazio + explicação] --> CF((Fim))
        G1 -- sim --> C6[Painel: estudantes]
        C6 --> G2{Consentimento ativo?}
        G2 -- não --> C7[Badge 'Aguardando';<br/>sem botão 'Gerar material'] --> CF
        G2 -- sim --> C8[Botão 'Gerar material'] --> CF
    end
```

| Elemento | Descrição |
|---|---|
| Evento inicial | Docente abre a porta Professores |
| Atividades | Autenticar; painel com "Gerar material" quando há consentimento |
| Decisões | Vínculo ativo? (Paulo demonstra o vazio); consentimento ativo? (heurística 1, sev. 3 corrigida: ação oculta sem consentimento) |
| Responsáveis | Docente; sistema |
| Evento final | Painel do docente |
| Exceções | URL de estudante sem vínculo → "Acesso não permitido"; `/notas-clinicas` → "Acesso negado (RN02)" |
| Regras | RN01, RN02, D-01 (laudo oculto), D-02 (só docente gera), D-12 (rascunho privado) |
| Entrada / saída | Identidade → lista de estudantes com papel DOCENTE |

## 4. Login do terapeuta (equipe de saúde)

```mermaid
flowchart LR
    subgraph U[Equipe de saúde]
        D0((Escola fechou um ciclo)) --> D1[Abrir /entrar/saude]
        D1 --> D2[Ler: valida o conjunto por ciclo;<br/>nota reservada; nunca vê rascunho]
        D2 --> D3[Escolher Camila ou Beatriz /<br/>e-mail + registro no conselho P4.4]
    end
    subgraph S[Sistema]
        D3 --> D4[Autenticar]
        D4 --> G1{Vínculo ativo com registro no conselho?}
        G1 -- não --> D5[Painel vazio;<br/>coordenação precisa vincular D-13] --> DF((Fim))
        G1 -- sim --> D6[Painel: 'Validar parâmetros']
        D6 --> G2{Há versão PENDENTE?}
        G2 -- sim --> D7[Link Pendências com fila] --> DF
        G2 -- não --> D8[Estado 'Nada aguardando validação'] --> DF
    end
```

| Elemento | Descrição |
|---|---|
| Evento inicial | Profissional abre a porta Equipe de saúde (uso ocasional) |
| Atividades | Autenticar; painel com "Validar parâmetros"; fila de pendências |
| Decisões | Vínculo com registro no conselho (D-13)? Há versão pendente? |
| Responsáveis | Profissional; sistema; coordenação (vincula) |
| Evento final | Painel do profissional |
| Exceções | Sem registro no conselho o vínculo nem é criado (VALIDACAO); versão expirada (RN05) aparece como "Expirada" |
| Regras | RN02 (nota reservada), RN05, RN07 (valida ciclo, não material), D-13, D-14 |
| Entrada / saída | Identidade → estudantes com papel PROFISSIONAL_SAUDE + pendências |

## 5. Processo principal do familiar — consentir e acompanhar

```mermaid
flowchart TD
    subgraph U[Família]
        E0((Sessão ativa)) --> E1[Abrir estudante → Consentimento]
        E1 --> E2[Ler termo em linguagem simples<br/>5 perguntas: o quê, o que não, quem vê, quanto tempo, direitos]
        E2 --> E3[Marcar escopos]
        E3 --> E4[Marcar 'Li e entendi']
        E4 --> E5[Autorizar]
        E9[Registrar observação de casa] --> E10[Ver materiais aprovados e desfechos]
        E10 --> E11{Quer sair do programa?}
        E11 -- revogar --> E12[Revogar: modal + 'Entendo as consequências']
        E11 -- exportar/excluir --> E13[Dados do estudante: exportar JSON /<br/>excluir com nome exato]
    end
    subgraph S[Sistema]
        E5 --> G1{Termo marcado e ≥1 escopo?}
        G1 -- não --> E6[Resumo de erros focável] --> E3
        G1 -- sim --> E7[Consentimento ATIVO<br/>evento CONCESSAO na auditoria]
        E7 --> E8[Docente e profissional passam a ler/escrever]
        E8 --> E9
        E12 --> E14[REVOGADO; evento REVOGACAO;<br/>escrita bloqueada para todos RN08]
        E13 --> E15[Evento EXPORTACAO / EXCLUSAO em cascata]
        E14 --> EF((Fim))
        E15 --> EF
        E10 --> EF
    end
```

| Elemento | Descrição |
|---|---|
| Evento inicial | Sessão da família ativa |
| Atividades | Ler termo; escolher escopos (`observacao_pedagogica`, `observacao_domiciliar`, `geracao_material`); autorizar; observar em casa; acompanhar; revogar; exportar; excluir |
| Decisões | Termo lido + ≥ 1 escopo? Revogar? Excluir? |
| Responsáveis | Responsável (decide); sistema (audita); docente/profissional (consumidores do consentimento) |
| Eventos intermediários | Eventos de auditoria CONCESSAO, REVOGACAO, EXPORTACAO, EXCLUSAO; toast + `aria-live` |
| Evento final | Consentimento ativo (fluxo segue nos processos 6 e 7) ou revogado/excluído |
| Exceções | Já existe consentimento ativo → CONFLITO; nome errado na exclusão → VALIDACAO; outro papel tentando → NEGADO |
| Regras | RN01, RN08, RF02, RF15, D-05, D-06, D-11 |
| Entrada / saída | Escopos marcados → `Consentimento{status, escopo, dataConcessao}`; auditoria |

## 6. Processo principal do professor — observar, fechar ciclo, gerar, aprovar, desfecho ⭐

```mermaid
flowchart TD
    subgraph U[Docente]
        F0((Sessão ativa e consentimento ativo)) --> F1[Registrar observação<br/>6 dimensões, escala 3, evidência]
        F1 --> F2[Fechar ciclo: ver diff vigente → proposto]
        F2 --> F3[Confirmar no modal]
        F6[Gerar material: colar texto] --> F7[Revisar original × adaptado;<br/>editar se quiser]
        F7 --> G3{Decisão}
        G3 -- aprovar --> F8[Aprovar]
        G3 -- descartar --> F9[Descartar rascunho]
        G3 -- depois --> F10[Decidir depois]
        F8 --> F11[Material web acessível / imprimir]
        F11 --> F12[Após a aula: registrar desfecho<br/>alcançado · parcial · não alcançado]
    end
    subgraph S[Sistema]
        F3 --> G1{Há observação no ciclo?}
        G1 -- não --> F4[Botão desabilitado + alerta] --> F1
        G1 -- sim --> F5[Motor: aplicarCiclo + RN03]
        F5 --> G2{Profissional vinculado? RN06}
        G2 -- sim --> F5a[Versão PENDENTE → processo 7] --> F6
        G2 -- não --> F5b[Versão VIGENTE direto<br/>modo pedagógico] --> F6
        F6 --> G4{Versão vigente existe?}
        G4 -- não --> F6a[Estado vazio: 'Ainda não há perfil vigente'] --> F1
        G4 -- sim --> F6b[Cache por hash?<br/>Camada determinística adaptar]
        F6b --> F7
        F8 --> F8a[APROVADO; evento; visível à família e ao profissional RN04]
        F9 --> F9a[DESCARTADO] --> FF((Fim))
        F12 --> F13[Desfecho 1:1; retroalimenta o próximo ciclo] --> FF
        F10 --> FF
    end
```

| Elemento | Descrição |
|---|---|
| Evento inicial | Sessão do docente + consentimento ativo (sem ele, tudo bloqueado — RN01) |
| Atividades | Observar (`/observar`); fechar ciclo (`/fechar-ciclo`); gerar (`/gerar`); revisar (`/materiais/:id/revisar`); material (`/materiais/:id`); desfecho (`/desfecho`) |
| Decisões | Há observação? Profissional vinculado (RN06)? Versão vigente? Aprovar/descartar/depois? |
| Responsáveis | Docente; sistema (motor); profissional (processo 7) |
| Eventos intermediários | Versão PENDENTE enviada à validação; toast "Gerado em 0,3 s"; eventos CICLO_FECHADO, APROVACAO_MATERIAL, DESCARTE_MATERIAL |
| Evento final | Desfecho registrado (retroalimentação) ou rascunho descartado |
| Exceções | Ciclo já fechado → CONFLITO; texto vazio ou > 20 000 → VALIDACAO; sem vigente → CONFLITO; segundo desfecho → CONFLITO; revogação no meio → NEGADO imediato |
| Regras | RN01, RN03 (2 ciclos para elevar), RN04 (só APROVADO chega ao estudante), RN06, RF05–RF13, D-02, D-12, D-18 |
| Entrada / saída | Observações + texto original → `VersaoPerfil`, `Material{textoAdaptado, statusAprovacao}`, `Desfecho` |

## 7. Processo principal do terapeuta — validar o ciclo e registrar nota

```mermaid
flowchart TD
    subgraph U[Equipe de saúde]
        H0((Versão PENDENTE criada)) --> H1[Abrir Pendências ou estudante → Validar]
        H1 --> H2[Ler diff e observações de origem]
        H2 --> G1{Decisão}
        G1 -- aprovar --> H3[Aprovar o conjunto]
        G1 -- ajustar --> H4[Solicitar ajuste com justificativa]
        H7[Registrar nota clínica reservada] --> H8[Registrar estratégia como observação<br/>linguagem operacional]
    end
    subgraph S[Sistema]
        H3 --> H5[VIGENTE; validador_id; evento VALIDACAO] --> H7
        H4 --> G2{Justificativa preenchida?}
        G2 -- não --> H4a[Erro no campo + resumo] --> H4
        G2 -- sim --> H6[EM_REVISAO; anterior segue vigente;<br/>evento REVISAO_SOLICITADA] --> H7
        H0 -.7 dias sem resposta RN05.-> H9[EXPIRADA por job diário;<br/>última VIGENTE mantida] --> HF((Fim))
        H8 --> HF
    end
```

| Elemento | Descrição |
|---|---|
| Evento inicial | Versão PENDENTE criada pelo fechamento de ciclo (processo 6) |
| Atividades | Ler diff; aprovar ou pedir ajuste; nota clínica (`/notas-clinicas`); observação clínica |
| Decisões | Aprovar/ajustar? Justificativa preenchida? |
| Responsáveis | Profissional; sistema (job diário RN05 — hoje simulado na leitura) |
| Eventos intermediários | Temporizador de 7 dias (evento intermediário de tempo, BPMN *timer*) |
| Evento final | Versão VIGENTE / EM_REVISAO / EXPIRADA; nota registrada |
| Exceções | Docente tentando validar → NEGADO; validar versão já vigente → CONFLITO; nota vazia → VALIDACAO; docente/família/coordenação lendo nota → NEGADO (RN02) |
| Regras | RN02, RN05, RN07, D-07, D-09 |
| Entrada / saída | `VersaoPerfil{PENDENTE}` → `{VIGENTE|EM_REVISAO|EXPIRADA}`; `NotaClinica` |

## 8. Processo de recuperação de acesso

**Estado:** não existe no modo demonstração (não há senha). **Planejado** para P4.4 com Supabase Auth.

```mermaid
flowchart LR
    subgraph U[Usuário]
        I0((Esqueceu a senha)) --> I1[Tela de login → 'Esqueci a senha']
        I1 --> I2[Informar e-mail]
        I4[Abrir link do e-mail] --> I5[Definir nova senha<br/>colar permitido, sem CAPTCHA]
    end
    subgraph S[Sistema Supabase Auth]
        I2 --> I3[resetPasswordForEmail: e-mail com link temporário<br/>mesma mensagem exista ou não a conta]
        I3 --> I4
        I5 --> G{Link válido e não expirado?}
        G -- não --> I6[Mensagem: link expirado; pedir novo] --> I1
        G -- sim --> I7[Senha atualizada; sessão iniciada; evento na auditoria] --> IF((Fim))
    end
```

| Elemento | Descrição |
|---|---|
| Evento inicial | Usuário não consegue entrar |
| Atividades | Solicitar redefinição; abrir link; definir nova senha |
| Decisões | Link válido? |
| Responsáveis | Usuário; Supabase Auth; sem intervenção da dupla |
| Exceções | Link expirado (1 h); e-mail não cadastrado (mesma resposta neutra, para não revelar contas) |
| Regras | WCAG 3.3.8 (sem teste cognitivo, colar permitido); LGPD (não revelar existência de conta); RN-sessão |
| Entrada / saída | E-mail → nova credencial; evento de auditoria (`SENHA_REDEFINIDA`, a acrescentar na `0004`) |

Enquanto o login real não existe, o **procedimento de suporte** vale: ver processo 9 e `docs/itil-servicos.md` §3 (requisição "Recuperação de acesso").

## 9. Processo de suporte / solicitação de ajuda

```mermaid
flowchart LR
    subgraph U[Qualquer perfil]
        J0((Dúvida ou problema)) --> J1[Abrir Ajuda no menu ou rodapé]
        J1 --> G1{Resolveu?}
        G1 -- sim --> JF((Fim))
        G1 -- não --> J2[Abrir Acessibilidade<br/>preferências e atalhos]
        J2 --> G2{Resolveu?}
        G2 -- sim --> JF
        G2 -- não --> J3[Registrar problema:<br/>issue no GitHub ou canal da coordenação]
    end
    subgraph S[Suporte — dupla]
        J3 --> J4[Triagem em 1 dia útil:<br/>incidente · requisição · melhoria]
        J4 --> J5[Classificar prioridade<br/>docs/itil-servicos.md]
        J5 --> J6[Resolver; responder; registrar em problemas recorrentes] --> JF
    end
```

| Elemento | Descrição |
|---|---|
| Evento inicial | Usuário com dúvida ou erro |
| Atividades | Consultar Ajuda (`/ajuda`), Acessibilidade (`/acessibilidade`), guia (`docs/guia-de-uso-do-sistema.md`); registrar; triagem; resolução |
| Decisões | Autoatendimento resolveu? Tipo (incidente/requisição/melhoria)? |
| Responsáveis | Usuário; dupla (suporte de nível 1 e 2); coordenação da escola (nível 0 no piloto) |
| Evento final | Problema resolvido e registrado |
| Exceções | Problema de acessibilidade bloqueante → prioridade alta (ver ITIL §2) |
| Regras | Prazos de `docs/itil-servicos.md`; nenhum dado real de estudante em issue pública |
| Entrada / saída | Relato → issue rotulada (`incidente`, `requisicao`, `melhoria`, `acessibilidade`) → correção + entrada na base de conhecimento |

## 10. Processo de tratamento de erro e acesso negado

```mermaid
flowchart TD
    K0((Ação ou navegação)) --> K1[Camada de serviços responde]
    K1 --> G{Código do erro}
    G -- NAO_AUTENTICADO 401 --> K2[Redirecionar para /entrar<br/>guardando a origem]
    G -- NEGADO 403 --> K3[Tela mostra o motivo em linguagem simples<br/>ex.: 'Acesso negado RN02' + link de saída;<br/>nenhum dado é exibido]
    G -- NAO_ENCONTRADO 404 --> K4[Estado 'não encontrado' com explicação<br/>ex.: rascunho só para a docente]
    G -- CONFLITO 409 --> K5[Alerta com a regra violada<br/>ex.: 'Este ciclo já foi fechado']
    G -- VALIDACAO 400 --> K6[Resumo de erros focável + erro por campo]
    G -- REDE --> K7[Alerta 'Não foi possível conectar' + Tentar novamente]
    G -- rota inexistente --> K8[Página não encontrada + 2 saídas]
    K2 --> KF((Fim: usuário orientado))
    K3 --> KF
    K4 --> KF
    K5 --> KF
    K6 --> KF
    K7 --> K9{Tentou de novo?}
    K9 -- sim --> K1
    K9 -- não --> KF
    K8 --> KF
```

| Elemento | Descrição |
|---|---|
| Evento inicial | Qualquer chamada à API ou navegação |
| Atividades | Mapear `ErroApi.codigo` → mensagem (`mensagemAmigavel`) → componente (`Alerta`, `ErroCarregamento`, `ResumoErros`, `NaoEncontrada`) |
| Decisões | Código do erro; tentar novamente? |
| Responsáveis | Sistema; usuário (recuperação) |
| Eventos intermediários | `role="alert"` para erros bloqueantes; `aria-live` para os demais |
| Evento final | Usuário sabe o que houve e tem uma saída |
| Exceções | Erro desconhecido → "Algo deu errado. Tente novamente em instantes." (nunca stack trace) |
| Regras | RNF-H; heurística 9; WCAG 3.3.1/3.3.3/4.1.3; **acesso negado nunca vaza dado** (a tela recebe o erro antes de qualquer conteúdo) |
| Entrada / saída | `ErroApi{codigo, status, message}` → interface de recuperação |

---

## 11. Rastreabilidade dos processos

| Processo | Telas | Testes que o exercitam |
|---|---|---|
| 1–4 (autenticação por perfil) | Entrar, Login por perfil, Painel | `autenticacao.test.tsx` (7), `paginas.test.tsx › Entrar (D-16) e painel` (4) |
| 5 (familiar) | Consentimento, Observar, Dados | `paginas.test.tsx › Consentimento`; `mockApi.test.ts › RN01/RN08`, `› RF15` |
| 6 (docente) | Observar, Fechar ciclo, Gerar, Revisar, Material, Desfecho | `paginas.test.tsx › Fluxo principal`, `› Observação e fechamento`; `mockApi.test.ts › RF05–RF07`, `› RF08/RF09`, `› RF13` |
| 7 (terapeuta) | Validar, Pendências, Notas clínicas | `mockApi.test.ts › docente não valida; profissional aprova`, `› solicitar ajuste…`, `› RN02`; `paginas.test.tsx › profissional de saúde acessa as notas` |
| 8 (recuperação) | — | planejado (TF-47) |
| 9 (suporte) | Ajuda, Acessibilidade | `paginas.test.tsx › Ajuda e Acessibilidade…` |
| 10 (erro / negado) | todas | `paginas.test.tsx › Caminhos negados`, `› rota inexistente`; `autenticacao.test.tsx › falha na autenticação` |
