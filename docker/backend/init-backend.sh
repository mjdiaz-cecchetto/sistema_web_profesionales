#!/bin/sh
# Deja el backend listo para usar dentro de Docker. Lo corre `make init`
# (y `make up` la primera vez). Se puede correr de nuevo sin romper nada:
#   1. composer install si falta vendor/
#   2. backend/.env a partir de .env.example, con la conexión a MySQL y Mailpit
#   3. APP_KEY si está vacía
#   4. migraciones; si la base está vacía, también los seeders
#      (planes, catálogo de obras sociales y el administrador de la plataforma)
set -e
cd /var/www/html

if [ ! -f vendor/autoload.php ]; then
  echo ">> Instalando dependencias de Composer (la primera vez tarda unos minutos)..."
  composer install --no-interaction --prefer-dist
fi

if [ ! -f .env ]; then
  cp .env.example .env
  echo ">> Se creó backend/.env a partir de backend/.env.example"
fi

# Reemplaza (o descomenta) KEY=... en .env; si no existe, la agrega al final.
set_env() {
  if grep -qE "^#? *$1=" .env; then
    sed -i -E "s|^#? *$1=.*|$1=$2|" .env
  else
    echo "$1=$2" >> .env
  fi
}

# Mismos valores que fija docker-compose.yml, para que backend/.env sea fiel.
set_env APP_URL "http://localhost:${BACKEND_PORT:-8000}"
set_env DB_CONNECTION mysql
set_env DB_HOST mysql
set_env DB_PORT 3306
set_env DB_DATABASE "$DB_DATABASE"
set_env DB_USERNAME "$DB_USERNAME"
set_env DB_PASSWORD "$DB_PASSWORD"
set_env MAIL_HOST mailpit
set_env MAIL_PORT 1025

if ! grep -qE '^APP_KEY=.+' .env; then
  php artisan key:generate --ansi
fi

echo ">> Esperando a MySQL..."
i=0
until php artisan db:show >/dev/null 2>&1; do
  i=$((i + 1))
  if [ "$i" -ge 20 ]; then echo "MySQL no respondió. Probá 'make migrate' en un rato."; exit 1; fi
  sleep 3
done

if php artisan migrate:status >/dev/null 2>&1; then
  echo ">> Corriendo migraciones pendientes..."
  php artisan migrate --force --ansi
else
  echo ">> Base vacía: creando tablas y datos iniciales..."
  php artisan migrate --force --seed --ansi
fi

echo ">> Backend listo."
