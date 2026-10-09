# Sistema de Turnos — entorno Docker de desarrollo
#
#   make up      levanta todo (la primera vez instala el backend y crea la base)
#   make build   construye o reconstruye las imágenes
#   make down    apaga los contenedores (la base de datos se conserva)
#   make help    lista todos los comandos
#
# Funciona desde CMD/PowerShell de Windows, Git Bash, WSL, Linux y macOS.
# Requiere Docker (Docker Desktop en Windows) y make.
#
# Las recetas usan solo comandos que existen en cualquier consola: docker,
# $(MAKE) y $(info). Los mensajes van sin tildes porque la consola de Windows
# puede mostrarlas mal.

COMPOSE  := docker compose
BACKEND  := $(COMPOSE) exec -u app backend
FRONTEND := $(COMPOSE) exec frontend

ifeq ($(OS),Windows_NT)
  # Docker Desktop no necesita el UID/GID del usuario de Windows.
  HOST_UID ?= 1000
  HOST_GID ?= 1000
  COPIAR_ENV := cmd /c copy /Y .env.example .env >NUL
else
  # Linux/macOS/WSL: los archivos que crean Laravel o Composer quedan a tu nombre.
  HOST_UID ?= $(shell id -u 2>/dev/null || echo 1000)
  HOST_GID ?= $(shell id -g 2>/dev/null || echo 1000)
  COPIAR_ENV := cp .env.example .env
endif
export HOST_UID HOST_GID

# Variables de .env (puertos, credenciales) para los mensajes y `make mysql`
-include .env

.DEFAULT_GOAL := help
.PHONY: help up build down restart rebuild ps logs urls init migrate fresh seed \
        artisan composer test npm seed-mock sh-backend sh-frontend mysql clean

help: ## Muestra esta ayuda
	$(info Sistema de Turnos - comandos:)
	$(info )
	$(info   make up          Levanta todo (instala lo que falte y corre migraciones))
	$(info   make build       Construye o reconstruye las imagenes de Docker)
	$(info   make down        Apaga los contenedores (la base se conserva))
	$(info   make restart     Apaga y vuelve a levantar)
	$(info   make rebuild     Reconstruye sin cache y levanta)
	$(info   make ps          Estado de los contenedores)
	$(info   make logs        Logs en vivo  (uno solo: make logs s=backend))
	$(info   make urls        Direcciones de cada servicio)
	$(info )
	$(info   make init        Instala el backend, crea backend/.env y la base)
	$(info   make migrate     Corre las migraciones pendientes)
	$(info   make seed        Corre los seeders (solo agrega lo que falta))
	$(info   make fresh       BORRA la base y la recrea   (make fresh CONFIRMAR=si))
	$(info   make test        Tests del backend (en una base aparte: $(DB_DATABASE)_test))
	$(info   make artisan     Comando de artisan   (make artisan c="route:list"))
	$(info   make composer    Comando de Composer  (make composer c="require laravel/sanctum"))
	$(info   make sh-backend  Terminal dentro del contenedor de Laravel)
	$(info   make mysql       Consola de MySQL)
	$(info )
	$(info   make npm         Comando de npm en el frontend  (make npm c="install dayjs"))
	$(info   make seed-mock   Regenera frontend/db.json (API simulada))
	$(info   make sh-frontend Terminal dentro del contenedor de Angular)
	$(info )
	$(info   make clean       Apaga todo y BORRA la base y node_modules  (make clean CONFIRMAR=si))
	@docker --version

.env:
	$(COPIAR_ENV)
	$(info Se creo .env a partir de .env.example)

# ---------- Ciclo de vida ----------

up: .env
	@$(MAKE) --no-print-directory init
	$(COMPOSE) up -d
	@$(MAKE) --no-print-directory urls

build: .env
	$(COMPOSE) build

down:
	$(COMPOSE) down --remove-orphans
# Transición: apaga también los contenedores del nombre anterior del proyecto ("turnos"), si quedaron.
# Sus datos (volumen) no se borran. El "-" ignora el error si no existe.
	-@$(COMPOSE) -p turnos down --remove-orphans

restart: down up

rebuild: .env
	$(COMPOSE) build --no-cache
	@$(MAKE) --no-print-directory up

ps:
	$(COMPOSE) ps

logs:
	$(COMPOSE) logs -f --tail=100 $(s)

urls:
	$(info )
	$(info   Frontend (Angular)   http://localhost:$(or $(FRONTEND_PORT),4200))
	$(info   API simulada         http://localhost:$(or $(MOCK_API_PORT),3000))
	$(info   Backend (Laravel)    http://localhost:$(or $(BACKEND_PORT),8000))
	$(info   phpMyAdmin           http://localhost:$(or $(PMA_PORT),8081))
	$(info   Mailpit (emails)     http://localhost:$(or $(MAILPIT_PORT),8025))
	$(info   MySQL                localhost:$(or $(MYSQL_PORT),3306)  usuario $(DB_USERNAME))
	$(info )
	$(info   La primera vez el frontend tarda unos minutos en instalar dependencias: make logs s=frontend)
	$(info )
	@$(COMPOSE) ps --format "table {{.Service}}\t{{.Status}}"

# ---------- Laravel ----------

init: .env
	$(COMPOSE) up -d --wait mysql
	$(COMPOSE) run --rm --no-deps -u app backend init-backend

migrate:
	$(BACKEND) php artisan migrate

seed:
	$(BACKEND) php artisan db:seed

fresh:
ifeq ($(CONFIRMAR),si)
	$(BACKEND) php artisan migrate:fresh --seed
else
	$(info Esto BORRA todos los datos de la base MySQL y la recrea desde cero.)
	$(info Para confirmar:  make fresh CONFIRMAR=si)
	@docker --version
endif

artisan:
	$(BACKEND) php artisan $(c)

composer:
	$(BACKEND) composer $(c)

test:
	$(COMPOSE) exec mysql mysql -uroot -p$(DB_ROOT_PASSWORD) -e "CREATE DATABASE IF NOT EXISTS $(DB_DATABASE)_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; GRANT ALL ON $(DB_DATABASE)_test.* TO '$(DB_USERNAME)'@'%';"
	$(BACKEND) php artisan test

sh-backend:
	$(BACKEND) sh

mysql:
	$(COMPOSE) exec mysql mysql -u$(DB_USERNAME) -p$(DB_PASSWORD) $(DB_DATABASE)

# ---------- Angular ----------

npm:
	$(FRONTEND) npm $(c)

seed-mock:
	$(FRONTEND) npm run seed
	$(COMPOSE) restart mock-api

sh-frontend:
	$(FRONTEND) sh

# ---------- Limpieza ----------

clean:
ifeq ($(CONFIRMAR),si)
	$(COMPOSE) down -v
else
	$(info Esto apaga todo y BORRA la base de MySQL y node_modules del contenedor.)
	$(info Para confirmar:  make clean CONFIRMAR=si)
	@docker --version
endif
