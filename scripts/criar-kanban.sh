#!/usr/bin/env bash
# P0.6 — cria labels, issues (um por card do plano) e o GitHub Project com
# as 5 colunas do Kanban. Idempotente o suficiente para rodar uma vez.
# Uso: GH=/caminho/gh.exe bash scripts/criar-kanban.sh <owner>/<repo>
set -euo pipefail
GH="${GH:-gh}"; REPO="$1"; OWNER="${REPO%%/*}"
CARDS="$(dirname "$0")/_cards.json"

echo "== labels"
for f in 0 1 2 3 4 5 6 7; do "$GH" label create "fase:$f" -R "$REPO" -c "$(printf '%02x%02x%02x' $((40+f*25)) $((80+f*15)) 200)" -f >/dev/null; done
"$GH" label create "frente:A" -R "$REPO" -c "1d76db" -d "Dados e servidor" -f >/dev/null
"$GH" label create "frente:B" -R "$REPO" -c "0e8a16" -d "Motor e interface" -f >/dev/null
"$GH" label create "frente:ambos" -R "$REPO" -c "5319e7" -f >/dev/null

echo "== project"
PROJ_URL=$("$GH" project create --owner "$OWNER" --title "PEI Vivo — Kanban" --format json | python -c "import sys,json; print(json.load(sys.stdin)['url'])")
PROJ_NUM="${PROJ_URL##*/}"
echo "$PROJ_URL"
# coluna Status: renomear/criar as 5 opções via GraphQL não é exposto no CLI;
# o CLI cria Todo/In Progress/Done. Ajuste manual das colunas para
# Backlog → A Fazer → Em Desenvolvimento → Revisão/Teste → Concluído
# fica documentado no README do projeto (1 min no navegador).

echo "== issues"
python - "$CARDS" <<'PY' | while IFS=$'\t' read -r id fase frente titulo; do
import sys, json
for c in json.load(open(sys.argv[1], encoding='utf-8')):
    print("\t".join([c["id"], c["fase"], c["frente"], c["titulo"].replace("\t"," ")]))
PY
  url=$("$GH" issue create -R "$REPO" -t "$id · $titulo" -l "fase:$fase,frente:$frente" \
        -b "Card **$id** do plano — ver \`docs/plano-desenvolvimento.md\`, Fase $fase.

**Definition of Done**
- [ ] teste automatizado do critério de aceite
- [ ] PR revisado pelo outro integrante
- [ ] linha em \`docs/rastreabilidade.md\` com o commit
- [ ] CI verde")
  "$GH" project item-add "$PROJ_NUM" --owner "$OWNER" --url "$url" >/dev/null
  echo "$id → $url"
done
echo "== pronto: $PROJ_URL"
