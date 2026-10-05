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

# Postgres sparar adminlösenordet bara när databasen skapas första gången. Har
# env/db.env ändrats efter det kommer backup-containern inte in. Då sätts
# lösenordet från env/db.env (inifrån databascontainern, där inget lösenord behövs).
synka_losenord() {
  PW=$(sed -n 's/^POSTGRES_PASSWORD=//p' env/db.env | head -1)
  [ -n "$PW" ] || { echo "Hittar inget POSTGRES_PASSWORD i env/db.env" >&2; return 1; }
  printf "ALTER USER postgres PASSWORD :'pw';\n" | docker compose exec -T db psql -U postgres -q -v ON_ERROR_STOP=1 -v pw="$PW" >/dev/null
}

if docker compose config --services 2>/dev/null | grep -qx backup; then
  if ! docker compose run --rm -T --no-deps backup nu "${1:-}"; then
    echo "Backup-containern kom inte in i databasen. Sätter lösenordet från env/db.env och försöker igen."
    synka_losenord
    docker compose run --rm -T --no-deps backup nu "${1:-}"
  fi
else
  # Äldre uppsättning utan backup-containern: en enda fil med allt
  FILE="backup/postgres-$(date +%F-%H%M).sql.gz"
  docker compose exec -T db pg_dumpall -U postgres | gzip > "$FILE.tmp"
  mv "$FILE.tmp" "$FILE"; chmod 600 "$FILE"
  find backup -name 'postgres-*.sql.gz' -mtime +"${KEEP_DAYS:-14}" -delete
  echo "Backup klar: $FILE ($(du -h "$FILE" | cut -f1))"
fi
