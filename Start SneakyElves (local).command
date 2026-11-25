#!/bin/bash
# Double-click (macOS) to run SneakyElves locally: http://localhost:5173
# First run asks for the Neon connection string; it is saved only in
# wishlist-api-node/.env (git-ignored). Close this window or press Ctrl+C to stop.
cd "$(dirname "$0")" || exit 1
pause_exit() { echo; read -r -p "Press Enter to close this window..." _; exit "${1:-1}"; }

# --- Node.js 20+ ---------------------------------------------------------------
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" >/dev/null 2>&1
node_ok() { command -v node >/dev/null 2>&1 && node -e 'process.exit(+process.versions.node.split(".")[0] >= 20 ? 0 : 1)'; }
if ! node_ok; then
  if command -v nvm >/dev/null 2>&1; then
    echo "Installing Node.js 22 with nvm..."
    nvm install 22 >/dev/null && nvm use 22 >/dev/null
  fi
fi
if ! node_ok; then
  echo "❌ Node.js 20 or newer is needed. Install it from https://nodejs.org (LTS), then double-click this file again."
  open "https://nodejs.org/en/download" 2>/dev/null
  pause_exit 1
fi
echo "Using Node $(node -v)"

# --- Database settings (first run only) ----------------------------------------
ENV_FILE="wishlist-api-node/.env"
if ! grep -q '^DATABASE_URL=.*schema=' "$ENV_FILE" 2>/dev/null; then
  echo
  echo "First-time setup: paste your Neon connection string and press Enter."
  echo "(Neon → project sneakyelves → Connect → Connection pooling OFF → Copy snippet)"
  echo "It won't be shown on screen. It's saved only in $ENV_FILE, which git ignores."
  read -r -s NEON; echo
  NEON="$(printf '%s' "$NEON" | tr -d "\"' \r\n")"
  NEON="${NEON#psql}"
  case "$NEON" in postgres://*|postgresql://*) ;; *) echo "❌ That doesn't look like a postgresql:// connection string."; pause_exit 1;; esac
  NEON="$(printf '%s' "$NEON" | sed -E 's/[&?]channel_binding=[^&]*//; s/[&?]schema=[^&]*//')"
  case "$NEON" in *\?*) URL="$NEON&schema=dev" ;; *) URL="$NEON?sslmode=require&schema=dev" ;; esac
  awk -v u="$URL" '/^DATABASE_URL=/{print "DATABASE_URL=\"" u "\""; next} {print}' wishlist-api-node/.env.example > "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  rm -f .dev-setup-done
fi

# --- Setup when first run or the schema/dependencies changed ---------------------
STAMP="$(cat wishlist-api-node/prisma/schema.prod.prisma wishlist-api-node/package-lock.json wishlist-client/package-lock.json | shasum | cut -d' ' -f1)"
if [ "$(cat .dev-setup-done 2>/dev/null)" != "$STAMP" ]; then
  echo; echo "Setting up (installs packages and creates the dev schema; takes a minute)..."
  ./dev.sh setup || pause_exit 1
  echo "$STAMP" > .dev-setup-done
fi

# --- Run --------------------------------------------------------------------------
( sleep 6; open "http://localhost:5173" ) &
./dev.sh
pause_exit 0
