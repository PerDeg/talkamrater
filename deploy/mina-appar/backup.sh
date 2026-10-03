#!/bin/bash
# Säkerhetskopierar alla databaser i stacken till backup/.
# Sparar 14 dagar. Körs automatiskt av uppdatera.sh, och varje natt
# om du lägger in det i User Scripts (se README).
set -euo pipefail
cd "$(dirname "$0")"

DUMP=${DUMP:-docker compose exec -T db pg_dumpall -U postgres}
KEEP_DAYS=${KEEP_DAYS:-14}
mkdir -p backup
FILE="backup/postgres-$(date +%F-%H%M).sql.gz"

$DUMP | gzip > "$FILE.tmp"
mv "$FILE.tmp" "$FILE"
chmod 600 "$FILE"
find backup -name 'postgres-*.sql.gz' -mtime +"$KEEP_DAYS" -delete
echo "Backup klar: $FILE ($(du -h "$FILE" | cut -f1))"
