## Card / issue

<!-- P<fase>.<n> do docs/plano-desenvolvimento.md, ou fix/… · Closes #<issue> -->

## O que muda

## Como testar

- [ ] `npm test` e `npm run typecheck` verdes localmente
- [ ] Caminho NEGADO testado (se toca permissão — RF14)
- [ ] Tela nova/alterada passa em `semViolacoesAxe` e foi percorrida só com teclado (Tab, Enter, Espaço, Esc)
- [ ] Estados carregando / vazio / sucesso / erro / negado presentes (se é tela)
- [ ] Conferido em 375 px (celular) e zoom 200 %

## Rastreabilidade e processo

- [ ] Linha em `docs/rastreabilidade.md` e `docs/matriz-rastreabilidade.md` com o RF/RN e o teste
- [ ] Commits no padrão Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, …)
- [ ] Branch nasceu de `development` e está atualizada (`git rebase development`)
- [ ] Revisão do **outro** integrante solicitada (quem escreveu não aprova)
- [ ] Nenhum segredo, `.env` ou dado real de estudante no diff
