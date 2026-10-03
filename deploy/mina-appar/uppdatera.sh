#!/bin/bash
# Hämtar senaste koden för alla egna appar, tar en backup av databasen,
# bygger om det som ändrats och startar om bara de containrar som påverkas.
set -euo pipefail
cd "$(dirname "$0")"

for dir in src/*/; do
  [ -d "$dir/.git" ] || continue
  echo "== $(basename "$dir")"
  git -C "$dir" pull --ff-only
done

if docker compose ps --status running --services 2>/dev/null | grep -qx db; then
  ./backup.sh
fi

docker compose build --pull
docker compose up -d --remove-orphans
docker image prune -f >/dev/null
docker compose ps
