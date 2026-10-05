#!/bin/bash
# Återställer en app från en backup om något har gått riktigt fel.
#
#   ./aterstall.sh                    visar backuperna och frågar vilken
#   ./aterstall.sh senaste            tar den senaste
#   ./aterstall.sh 2026-10-05-0330    tar just den
#   ./aterstall.sh senaste minapp     återställer en annan app än talkamrater
#
# Innan något ändras tas en extra backup av läget just nu ("fore-aterstallning"),
# så att det alltid går att ångra.
set -euo pipefail
cd "$(dirname "$0")"

if ! docker compose config --services 2>/dev/null | grep -qx backup; then
  echo "Backup-containern saknas. Kör ./uppdatera.sh en gång först." >&2
  exit 1
fi
svc() { docker compose run --rm -T --no-deps backup "$@"; }
docker compose up -d db >/dev/null

mapfile -t LIST < <(svc lista)
if [ ${#LIST[@]} -eq 0 ]; then echo "Det finns inga backuper i backup/ än." >&2; exit 1; fi

CHOICE="${1:-}"
APP="${2:-talkamrater}"
if [ -z "$CHOICE" ]; then
  echo "Backuper (nyast först):"
  for i in "${!LIST[@]}"; do printf '  %2d) %s\n' $((i + 1)) "${LIST[$i]}"; [ "$i" -ge 29 ] && break; done
  read -rp "Vilken vill du återställa? (nummer, Enter = 1) " N
  N=${N:-1}
  [[ "$N" =~ ^[0-9]+$ ]] && [ "$N" -ge 1 ] && [ "$N" -le ${#LIST[@]} ] || { echo "Ogiltigt val." >&2; exit 1; }
  STAMP="${LIST[$((N - 1))]}"
elif [ "$CHOICE" = "senaste" ]; then
  STAMP="${LIST[0]}"
else
  STAMP="$CHOICE"
  printf '%s\n' "${LIST[@]}" | grep -qx "$STAMP" || { echo "Hittar ingen backup som heter $STAMP." >&2; exit 1; }
fi
[ -f "backup/$STAMP/$APP.dump" ] || { echo "Backupen $STAMP innehåller ingen databas som heter $APP." >&2; exit 1; }

echo
echo "Det här ersätter ALLT i databasen \"$APP\" med läget från $STAMP."
echo "Det som hänt efter det (stjärnor, rundor, nya elever) försvinner."
read -rp "Skriv ja för att fortsätta: " OK
[ "$OK" = "ja" ] || { echo "Avbrutet. Inget ändrat."; exit 0; }

echo "== Tar en extra backup av läget just nu"
./backup.sh fore-aterstallning

HAS_APP=0
docker compose config --services | grep -qx "$APP" && HAS_APP=1
if [ "$HAS_APP" = 1 ]; then echo "== Stoppar $APP"; docker compose stop "$APP"; fi

echo "== Återställer"
svc aterstall "$STAMP" "$APP"

if [ "$HAS_APP" = 1 ]; then
  echo "== Startar $APP igen"
  docker compose up -d "$APP"
  echo -n "Väntar på att $APP ska bli frisk"
  for i in $(seq 1 60); do
    [ "$(docker compose ps --format '{{.Health}}' "$APP")" = "healthy" ] && break
    echo -n "."; sleep 2
  done
  echo
  docker compose ps "$APP"
fi
echo "Klart! Ångra med: ./aterstall.sh <namnet på fore-aterstallning-backupen ovan>"
