#!/bin/bash
# Tar en backup direkt av alla databaser i stacken, till backup/<datum-tid>/.
# Körs automatiskt av uppdatera.sh och aterstall.sh. Varje natt tar
# backup-containern en egen (se docker-compose.backup.yml).
#
#   ./backup.sh             vanlig backup
#   ./backup.sh fore-x      lägger till ett namn, t.ex. 2026-10-05-2130-fore-x
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p backup

if docker compose config --services 2>/dev/null | grep -qx backup; then
  docker compose run --rm -T --no-deps backup nu "${1:-}"
else
  # Äldre uppsättning utan backup-containern: en enda fil med allt
  FILE="backup/postgres-$(date +%F-%H%M).sql.gz"
  docker compose exec -T db pg_dumpall -U postgres | gzip > "$FILE.tmp"
  mv "$FILE.tmp" "$FILE"; chmod 600 "$FILE"
  find backup -name 'postgres-*.sql.gz' -mtime +"${KEEP_DAYS:-14}" -delete
  echo "Backup klar: $FILE ($(du -h "$FILE" | cut -f1))"
fi
