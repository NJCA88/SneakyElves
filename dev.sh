#!/usr/bin/env bash
# Local development for SneakyElves.
#   ./dev.sh setup   one time (and after pulling schema changes): install, create/update the dev schema, add test data
#   ./dev.sh         run the API (http://localhost:3000) and the site (http://localhost:5173) together; Ctrl+C stops both
set -euo pipefail
cd "$(dirname "$0")"

case "${1:-run}" in
  setup)
    (cd wishlist-api-node && npm install && npm run dev:setup)
    (cd wishlist-client && npm install)
    echo -e "\n✅ Setup done. Start everything with: ./dev.sh"
    ;;
  run)
    (cd wishlist-api-node && node scripts/check-dev-env.js) || exit 1
    trap 'kill 0' EXIT
    (cd wishlist-api-node && npm run dev) &
    (cd wishlist-client && npm run dev -- --port 5173 --strictPort) &
    sleep 3
    echo -e "\n👉 Open http://localhost:5173  (log in as dev.admin@example.com / devpassword)\n"
    wait
    ;;
  *)
    echo "Usage: ./dev.sh [setup|run]"; exit 1 ;;
esac
