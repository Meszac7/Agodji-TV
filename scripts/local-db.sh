#!/usr/bin/env bash
# Base PostgreSQL locale pour le développement et les tests (sans Docker).
# Usage : npm run db:local -- start|stop|status
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATA="$ROOT/.local-db"
PORT="${LOCAL_DB_PORT:-54329}"
PGBIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)"
PGBIN="${PGBIN:-$(dirname "$(command -v pg_ctl)")}"

# PostgreSQL refuse de tourner en root : on utilise alors l'utilisateur système « postgres ».
run() {
  if [ "$(id -u)" = "0" ]; then runuser -u postgres -- "$@"; else "$@"; fi
}
if [ "$(id -u)" = "0" ]; then
  DATA="/tmp/agodjie-local-db"
fi

case "${1:-start}" in
  start)
    if [ ! -d "$DATA" ]; then
      run "$PGBIN/initdb" -D "$DATA" -U postgres --auth=trust -E UTF8 >/dev/null
    fi
    if ! run "$PGBIN/pg_ctl" -D "$DATA" status >/dev/null 2>&1; then
      run "$PGBIN/pg_ctl" -D "$DATA" -o "-p $PORT -k /tmp -c listen_addresses=localhost" -l "$DATA/server.log" -w start >/dev/null
    fi
    echo "PostgreSQL local prêt : postgres://postgres@localhost:$PORT/postgres"
    ;;
  stop) run "$PGBIN/pg_ctl" -D "$DATA" -m fast stop ;;
  status) run "$PGBIN/pg_ctl" -D "$DATA" status ;;
  *) echo "Usage: $0 start|stop|status" >&2; exit 1 ;;
esac
