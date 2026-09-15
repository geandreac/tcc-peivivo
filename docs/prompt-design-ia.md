# PEI Vivo — Prompt para design UX/UI e front-end com IA

**Versão:** 1.0 — 14/09/2026
**Etapa da orientação:** 6 (Criar prompt estruturado para solicitar à IA a geração da interface ou código front-end).
**Entrega esperada:** "Prompt utilizado para geração da interface" + "Resultado visual ou código front-end inicial" (o resultado está em `apps/web`).

Este documento registra (1) o prompt-modelo da orientação adaptado ao PEI Vivo, (2) o prompt efetivamente usado nesta iteração e (3) como usá-lo em iterações futuras (novas telas) sem perder as restrições do projeto.

---

## 1. Prompt estruturado (versão final, reutilizável)

```
Você é uma equipe multidisciplinar — Product Manager, Analista de Requisitos, UX Researcher,
UX/UI Designer, Especialista em Acessibilidade Digital, Desenvolvedor Front-end Sênior e
QA Engineer — trabalhando no PEI Vivo.

## Contexto (não reexplique; use como base)
- Pré-projeto: docs/tcc/TCC - Geandre & Jean.md (problema, público, ODS 3 e 4, base legal:
  LBI, Lei 14.254/2021, LGPD).
- Requisitos e decisões: docs/requisitos.md (RF01–RF16, RNF, RN01–RN08, HU-*, D-01…D-18,
  matriz de permissões v2, MoSCoW em §11).
- Acessibilidade: docs/acessibilidade.md, docs/wcag-2.2.md (matriz AA), docs/avaliacao-heuristica.md.
- Design system e telas: docs/ux-ui.md (tokens em apps/web/src/styles/tokens.css — não invente cores).
- Contrato de dados: apps/web/src/services/api.ts (PeiVivoApi) e tipos em services/tipos.ts;
  parâmetros em packages/motor-adaptacao/src/tipos.ts (ParametrosAdaptacao — único contrato).

## Público e cenário
Docente regente (usuário decisivo), domingo 21h, celular Android, brilho baixo, rede instável.
Responsável legal com baixa familiaridade digital. Profissional de saúde de uso ocasional.
Coordenação em desktop. O estudante (TEA/TDAH/dislexia) é usuário indireto: o material
adaptado precisa de contraste ≥ contrasteMinimo do perfil, blocos ≤ maxLinhasPorBloco e
enunciados em etapa única quando formatoEnunciado = ETAPA_UNICA.

## Tarefa
Projetar e implementar a tela <NOME DA TELA> (rota <ROTA>) para o(s) papel(is) <PAPÉIS>,
cobrindo a história <HU-X.nn> e os critérios de aceite Dado/Quando/Então dela.

## Restrições inegociáveis
1. Stack: React 18 + TypeScript estrito + Vite; CSS com os tokens existentes (sem Tailwind,
   sem biblioteca de componentes, sem web fonts). Reutilize Botao, Campo, Escala3, Modal,
   Alerta, Badge, Card, Carregando, EstadoVazio, ResumoErros, MaterialAdaptado.
2. Permissão é decidida pela camada de serviços (PeiVivoApi), NUNCA pela tela. A tela só
   exibe o motivo quando recebe ErroApi("NEGADO") — com linguagem simples e um link de saída.
3. Sem dados reais de estudante: use apenas apps/web/src/mocks/dados.ts (fictício).
4. Acessibilidade (WCAG 2.2 AA):
   - <button> para ação, <a> para navegação; nunca div/span clicável;
   - um h1 por tela nomeando a tarefa; níveis sem salto; landmarks do Layout;
   - todo campo com <label>; dica e erro via aria-describedby; aria-invalid; resumo de erros
     focável com links para os campos; validação no envio;
   - estados carregando / vazio / sucesso / erro / negado, todos com texto e role adequado;
   - mensagens dinâmicas por useAnuncio (aria-live), nunca só por cor;
   - modais com <dialog> (Esc, foco preso e devolvido);
   - foco visível (não remover outline); alvos ≥ 44 px; reflow em 320 px sem rolagem
     horizontal; respeitar prefers-reduced-motion;
   - contraste: só pares listados em docs/ux-ui.md §3.2.
5. Heurísticas de Nielsen: status visível; linguagem do usuário (rótulos de utils/rotulos.ts);
   saída fácil ("Voltar para …", "Cancelar", "Decidir depois"); consistência com as telas
   existentes; prevenção de erro em ações irreversíveis (confirmação); reconhecimento
   (mostrar o contexto necessário na própria tela); minimalismo (uma ação primária).
6. Mobile-first: layout em coluna única; comparações lado a lado só ≥ 48em.

## Entregáveis
- apps/web/src/pages/<Tela>.tsx (+ componentes novos só se reutilizáveis);
- rota registrada em apps/web/src/routes/index.tsx;
- teste em apps/web/src/pages/paginas.test.tsx cobrindo: fluxo principal, validação, estado
  vazio, caminho negado e semViolacoesAxe(container);
- linha nova em docs/ux-ui.md §2 (documento de telas) e, se houver critério WCAG novo,
  em docs/wcag-2.2.md;
- ao final: arquivos criados/alterados, motivo técnico, funcionalidade, critério de
  acessibilidade atendido e como validar localmente (npm test -w apps/web, npm run dev).

Não apresente pseudocódigo: implemente e rode os testes.
```

---

## 2. Prompt efetivamente usado nesta iteração

O prompt da disciplina (seções 1–11 do enunciado de 14/09/2026, "Atue como uma equipe multidisciplinar…") foi usado integralmente, com a instrução adicional de não pedir informações já presentes no repositório e de usar `docs/tcc/orientacao.jpeg` como guia obrigatório. A IA (Claude Code) executou, nesta ordem:

1. Leitura de todos os artefatos (`docs/`, `packages/`, `supabase/`, diagramas, orientação).
2. Diagnóstico e suposições (D-14…D-18).
3. Motor: P2.1–P2.5 com testes (30 testes, 97 % de cobertura).
4. `apps/web`: tokens → componentes → layout → rotas → 19 telas → mocks com permissões → 59 testes com axe.
5. Verificação visual no navegador (fluxo docente completo).
6. Documentação: validação da ideia, requisitos §11, acessibilidade, WCAG, heurísticas, UX/UI, plano de testes, este prompt, README.

---

## 3. Como iterar (novas telas ou ajustes)

1. Copie o prompt da seção 1; preencha `<NOME DA TELA>`, `<ROTA>`, `<PAPÉIS>`, `<HU-X.nn>`.
2. Se a tela exigir dado novo, **primeiro** a decisão (`D-nn` em `docs/requisitos.md`) e a policy/mock (`mockApi.ts` + teste negativo em `mockApi.test.ts`); só depois a tela — é a ordem do `CLAUDE.md`.
3. Rode `npm test` e `npm run typecheck -w apps/web`; abra `npm run dev` e percorra a tela com teclado e, quando possível, NVDA.
4. Atualize `docs/ux-ui.md` §2, `docs/wcag-2.2.md` (se houver critério novo) e `docs/rastreabilidade.md` (commit).

### 3.1 Prompts curtos úteis

| Objetivo | Prompt |
|---|---|
| Revisão de acessibilidade de uma tela | "Audite `apps/web/src/pages/<Tela>.tsx` contra `docs/acessibilidade.md` §10 e `docs/wcag-2.2.md`. Liste violações com critério WCAG, severidade e correção. Corrija as de severidade ≥ 3 e adicione asserções em `paginas.test.tsx`." |
| Análise de impacto (rastreabilidade, uso previsto no TCC) | "Sem alterar código, analise o impacto de mudar <regra/campo> em: migrations, policies, `motor-adaptacao`, `mockApi`, telas, testes e `docs/rastreabilidade.md`. Apresente como tabela arquivo → impacto → teste afetado." |
| Nova cor no design system | "Proponha um token para <uso> com HEX, calcule o contraste sobre `#FFFFFF`, `#F6F8FB` e o fundo tint correspondente com `scripts/contraste.mjs`, e só então adicione a `tokens.css` e a `docs/ux-ui.md` §3.2." |
| Substituir o mock pelo Supabase | "Implemente `apps/web/src/services/supabaseApi.ts` satisfazendo `PeiVivoApi` com supabase-js e as Edge Functions de `docs/plano-desenvolvimento.md` §5, mapeando PostgREST 401/403/409 para `ErroApi`. Reexecute `mockApi.test.ts` contra a nova implementação (parametrize o `criar*Api`) sem mudar nenhuma tela." |
