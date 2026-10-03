#!/bin/bash
# Skapar en egen databas och användare för en app i den gemensamma Postgres,
# och skriver in uppgifterna i env/<app>.env.
#
#   ./ny-databas.sh talkamrater
set -euo pipefail
cd "$(dirname "$0")"

APP="${1:-}"
if [[ ! "$APP" =~ ^[a-z][a-z0-9_]{1,30}$ ]]; then
  echo "Användning: $0 <appnamn>   (små bokstäver, siffror och _)" >&2
  exit 1
fi

ENV_FILE="env/$APP.env"
# Compose läser alla env-filer i stacken, så appens fil måste finnas
# innan docker compose körs, även om den ännu saknar databasuppgifter.
[ -f "$ENV_FILE" ] || { [ -f "$ENV_FILE.example" ] && cp "$ENV_FILE.example" "$ENV_FILE" || touch "$ENV_FILE"; }
chmod 600 "$ENV_FILE"

if [ -z "${PSQL:-}" ]; then
  # Starta databasen och vänta tills den svarar (första starten tar längre tid)
  docker compose up -d db
  echo -n "Väntar på databasen"
  for i in $(seq 1 90); do
    if docker compose exec -T db pg_isready -U postgres -q 2>/dev/null; then echo " klar!"; break; fi
    echo -n "."; sleep 1
    if [ "$i" = 90 ]; then
      echo; echo "Databasen svarar inte. Senaste loggraderna:" >&2
      docker compose logs --tail=30 db >&2
      exit 1
    fi
  done
  PSQL="docker compose exec -T db psql -U postgres -v ON_ERROR_STOP=1 -qtA"
fi

if [ "$($PSQL -c "SELECT 1 FROM pg_roles WHERE rolname = '$APP'")" = "1" ]; then
  echo "Databasen för $APP finns redan. Inget ändrat."
  exit 0
fi

PASS=$(openssl rand -hex 24)
$PSQL <<SQL
CREATE ROLE $APP LOGIN PASSWORD '$PASS';
CREATE DATABASE $APP OWNER $APP;
REVOKE ALL ON DATABASE $APP FROM PUBLIC;
SQL

# Skriv in uppgifterna i appens env-fil (byter ut gamla DB_-rader)
sed -i -E '/^#? ?DB_(HOST|PORT|NAME|USER|PASSWORD)=/d' "$ENV_FILE"
cat >> "$ENV_FILE" <<ENV
DB_HOST=db
DB_PORT=5432
DB_NAME=$APP
DB_USER=$APP
DB_PASSWORD=$PASS
ENV
chmod 600 "$ENV_FILE"
echo "Klart! Databasen $APP är skapad och uppgifterna ligger i $ENV_FILE"
