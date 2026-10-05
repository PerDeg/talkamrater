#!/bin/bash
# Hämtar senaste koden för alla egna appar, tar en backup av databaserna,
# bygger om det som ändrats och startar om bara de containrar som påverkas.
set -euo pipefail
cd "$(dirname "$0")"

for dir in src/*/; do
  [ -d "$dir/.git" ] || continue
  echo "== $(basename "$dir")"
  git -C "$dir" pull --ff-only
done

# Hjälpskripten i stacken hålls uppdaterade från talkamrater-repot
# (docker-compose.yml och env/ rörs aldrig, där har du egna ändringar)
SRC=src/talkamrater/deploy/mina-appar
if [ -d "$SRC" ]; then
  for f in backup.sh backup-tjanst.sh aterstall.sh docker-compose.backup.yml; do
    if ! cmp -s "$SRC/$f" "$f"; then cp "$SRC/$f" "$f"; chmod +x "$f" 2>/dev/null || true; echo "Uppdaterade $f"; fi
  done
  cmp -s "$SRC/uppdatera.sh" uppdatera.sh || echo "OBS: det finns en ny uppdatera.sh. Kör:  cp $SRC/uppdatera.sh . && ./uppdatera.sh"
fi
# Backup varje natt: en egen liten container, inställningar i env/backup.env
[ -f env/backup.env ] || { printf 'BACKUP_AT=03:30\nKEEP_DAYS=14\nTZ=Europe/Stockholm\n' > env/backup.env; echo "Skapade env/backup.env (backup kl 03:30, sparas 14 dagar)"; }
if [ -f docker-compose.backup.yml ] && ! grep -q '^COMPOSE_FILE=' .env 2>/dev/null; then
  echo 'COMPOSE_FILE=docker-compose.yml:docker-compose.backup.yml' >> .env
  echo "Lade till backup-containern i stacken (.env)"
fi

if docker compose ps --status running --services 2>/dev/null | grep -qx db; then
  ./backup.sh fore-uppdatering || { echo "Backupen gick inte att ta, så inget uppdaterades. Se felet ovan." >&2; exit 1; }
fi

docker compose build --pull
docker compose up -d --remove-orphans
docker image prune -f >/dev/null

# Vänta tills apparna svarar (första starten skapar tabeller i databasen)
echo -n "Väntar på att apparna ska bli friska"
for i in $(seq 1 60); do
  if ! docker compose ps --format '{{.Health}}' | grep -qE 'starting|unhealthy'; then break; fi
  echo -n "."; sleep 2
done
echo
docker compose ps
