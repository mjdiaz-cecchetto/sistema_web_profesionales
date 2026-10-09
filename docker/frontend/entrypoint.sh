#!/bin/sh
# Instala las dependencias de npm cuando cambia package-lock.json y después
# ejecuta el comando del contenedor (ng serve, json-server...).
# frontend y mock-api comparten node_modules: el lock evita que instalen a la vez.
set -e
cd /app

HASH=$(md5sum package-lock.json | cut -d' ' -f1)
LOCK=node_modules/.install.lock
touch "$LOCK"

(
  flock 9
  if [ "$(cat node_modules/.lock-hash 2>/dev/null)" != "$HASH" ]; then
    echo ">> Instalando dependencias de npm (la primera vez tarda unos minutos)..."
    find node_modules -mindepth 1 -maxdepth 1 ! -name .install.lock -exec rm -rf {} +
    npm install --no-audit --no-fund
    # npm puede reescribir el lock: se guarda el hash final para no reinstalar en cada arranque
    md5sum package-lock.json | cut -d' ' -f1 > node_modules/.lock-hash
  fi
) 9>"$LOCK"

exec "$@"
