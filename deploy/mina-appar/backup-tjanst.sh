#!/bin/sh
# Körs i backup-containern (postgres-avbildningen, så pg_dump och psql finns).
#
#   backup-tjanst.sh schema            tar en backup varje natt kl BACKUP_AT (standard 03:30)
#   backup-tjanst.sh nu [namn]         tar en backup direkt
#   backup-tjanst.sh lista             visar backuperna, nyast först
#   backup-tjanst.sh aterstall MAPP DB återställer en databas från en backup
#
# Varje backup är en mapp, t.ex. /backup/2026-10-05-0330/, med en fil per
# databas (talkamrater.dump) och användarna (roller.sql.gz). Mappar äldre
# än KEEP_DAYS dagar tas bort.
set -eu

DIR=${BACKUP_DIR:-/backup}
KEEP_DAYS=${KEEP_DAYS:-14}
AT=${BACKUP_AT:-03:30}
export PGHOST=${PGHOST:-db} PGUSER=${PGUSER:-postgres}
export PGPASSWORD=${PGPASSWORD:-${POSTGRES_PASSWORD:-}}

databaser() {
  psql -d postgres -Atc "SELECT datname FROM pg_database WHERE NOT datistemplate AND datname <> 'postgres' ORDER BY datname"
}

backup() {
  stamp=$(date +%Y-%m-%d-%H%M)${1:+-$1}
  tmp="$DIR/.$stamp.tmp"
  dbs=$(databaser) || { echo "Kommer inte åt databasen, ingen backup tagen" >&2; return 1; }
  rm -rf "$tmp"; mkdir -p "$tmp"
  trap 'rm -rf "$tmp"' EXIT
  # Varje steg kontrolleras för sig (set -e gäller inte när backup körs med ||)
  { pg_dumpall --globals-only -f "$tmp/roller.sql" && gzip "$tmp/roller.sql"; } || { echo "Kunde inte spara användarna" >&2; rm -rf "$tmp"; return 1; }
  for db in $dbs; do
    pg_dump -Fc -d "$db" -f "$tmp/$db.dump" || { echo "Kunde inte spara $db" >&2; rm -rf "$tmp"; return 1; }
  done
  chmod -R go-rwx "$tmp"
  rm -rf "${DIR:?}/$stamp"; mv "$tmp" "$DIR/$stamp"; trap - EXIT
  # Gamla backuper (både mappar och de äldre .sql.gz-filerna) rensas bort
  find "$DIR" -mindepth 1 -maxdepth 1 -type d -name '20*' -mtime +"$KEEP_DAYS" -exec rm -rf {} +
  find "$DIR" -maxdepth 1 -name 'postgres-*.sql.gz' -mtime +"$KEEP_DAYS" -delete
  echo "Backup klar: $stamp ($(du -sh "$DIR/$stamp" | cut -f1)): $(cd "$DIR/$stamp" && ls *.dump 2>/dev/null | sed 's/\.dump$//' | tr '\n' ' ')"
}

case "${1:-schema}" in
  nu)
    backup "${2:-}" ;;
  lista)
    ls -1d "$DIR"/20*/ 2>/dev/null | sed "s#^$DIR/##; s#/\$##" | sort -r ;;
  aterstall)
    src="$DIR/${2:?Ange vilken backup}"; db=${3:?Ange vilken databas}
    file="$src/$db.dump"
    [ -f "$file" ] || { echo "Hittar inte $file" >&2; exit 1; }
    # Behåll samma ägare som databasen har nu (appens egen användare)
    owner=$(psql -d postgres -Atc "SELECT pg_get_userbyid(datdba) FROM pg_database WHERE datname = '$db'")
    if [ -z "$owner" ]; then
      owner=$(psql -d postgres -Atc "SELECT rolname FROM pg_roles WHERE rolname = '$db'")
      owner=${owner:-postgres}
    fi
    echo "Återställer $db från $(basename "$src") (ägare: $owner) …"
    dropdb --if-exists --force "$db"
    createdb -O "$owner" "$db"
    pg_restore -d "$db" --exit-on-error "$file"
    echo "Klart: $db är återställd." ;;
  schema)
    echo "Backup varje natt kl $AT, sparas i $KEEP_DAYS dagar."
    last=""
    while true; do
      if [ "$(date +%H:%M)" = "$AT" ] && [ "$last" != "$(date +%F)" ]; then
        last=$(date +%F)
        backup || echo "Backupen misslyckades" >&2
      fi
      sleep 30
    done ;;
  *)
    echo "Okänt kommando: $1" >&2; exit 1 ;;
esac
