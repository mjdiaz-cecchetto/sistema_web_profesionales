# Entorno Docker (desarrollo)

Todo el sistema corre en contenedores: no hace falta instalar PHP, Composer, MySQL ni Node en la máquina.

## Requisitos

- **Docker Desktop** con el motor **WSL2** activado (Settings → General → *Use the WSL 2 based engine*).
- **make**:
  - Windows (CMD o PowerShell): `winget install GnuWin32.Make` (o `choco install make`) y reabrir la terminal. El `Makefile` funciona desde CMD, PowerShell y Git Bash.
  - WSL (Ubuntu): `sudo apt install make`

> **Rendimiento en Windows:** con el repo en `C:\...`, Angular y Laravel andan más lentos y la recarga al guardar puede demorar unos segundos. Para trabajar fluido, cloná el repo **dentro de WSL** (por ejemplo `~/proyectos/sistema-web-profesionales`) y abrilo con `code .` desde la terminal de Ubuntu.

## Primer arranque

```bash
make up
```

La primera vez:

1. Crea `.env` (raíz) a partir de `.env.example`: puertos, credenciales de MySQL y el **administrador inicial**.
2. Construye las imágenes de backend y frontend.
3. Instala las dependencias de Composer, crea `backend/.env` y genera `APP_KEY`.
4. Crea la base **desde cero**: corre las migraciones y los seeders.
5. Levanta todos los servicios e instala las dependencias de npm del frontend (tarda unos minutos: seguilo con `make logs s=frontend`).

Las siguientes veces `make up` arranca en segundos (y corre las migraciones nuevas, si las hay).

## Datos iniciales

La base arranca vacía: **sin centros, profesionales, personas, pacientes, turnos ni cobros**. Todo eso se da de alta desde el sistema. Los seeders cargan solo:

| Qué | Detalle |
|---|---|
| Planes | Demo ($0, 1 profesional), Profesional ($15.000, 1), Consultorio ($40.000, hasta 10) |
| Catálogo de obras sociales | Nombres sugeridos (OSDE, IOMA, PAMI…). Cada centro arma su propia lista |
| Administrador de la plataforma | Único usuario. Nombre, email, DNI y contraseña de `PLATAFORMA_ADMIN_*` en `.env` |

Si `PLATAFORMA_ADMIN_PASSWORD` está vacía, se genera una contraseña aleatoria y **se muestra una sola vez** en la consola de `make up`. Guardala. Los seeders no pisan nada que ya exista: correrlos de nuevo (`make seed`) solo agrega lo que falta.

## Servicios

| Servicio | Dirección | Para qué |
|---|---|---|
| Frontend (Angular) | http://localhost:4200 | La aplicación, con recarga automática. Lo que va a `/api` lo reenvía a Laravel |
| API simulada | http://localhost:3000 | json-server con `frontend/db.json`, hasta conectar Laravel |
| Backend (Laravel 12) | http://localhost:8000 | API real (nginx + PHP 8.3) |
| phpMyAdmin | http://localhost:8081 | Ver y editar la base (entra solo, con el usuario de la app) |
| Mailpit | http://localhost:8025 | Bandeja donde caen los emails que manda Laravel (no salen a internet) |
| MySQL 8.4 | `localhost:3306` | Para DBeaver, Workbench, etc. Usuario y contraseña en `.env` |

Además corren `queue` (cola de Laravel para los avisos) y `scheduler` (tareas programadas, como vencer turnos sin confirmar).

## Comandos

| Comando | Qué hace |
|---|---|
| `make up` | Levanta todo (instala lo que falte y corre migraciones pendientes) |
| `make build` | Construye o reconstruye las imágenes (después de tocar algo en `docker/`) |
| `make down` | Apaga todo. **La base de datos se conserva** |
| `make restart` | Apaga y vuelve a levantar |
| `make ps` | Estado de los contenedores |
| `make logs` / `make logs s=backend` | Logs en vivo, de todo o de un servicio |
| `make urls` | Muestra las direcciones |
| `make migrate` | Corre las migraciones pendientes |
| `make seed` | Corre los seeders (solo agrega lo que falta) |
| `make fresh CONFIRMAR=si` | **Borra todos los datos** y recrea la base desde cero |
| `make test` | Tests del backend (usan una base aparte, `<base>_test`; nunca tocan la de desarrollo) |
| `make artisan c="route:list"` | Cualquier comando de artisan |
| `make composer c="require laravel/sanctum"` | Cualquier comando de Composer |
| `make npm c="install dayjs"` | Cualquier comando de npm en el frontend |
| `make seed-mock` | Regenera `frontend/db.json` (pisa los datos de la API simulada) |
| `make sh-backend` / `make sh-frontend` | Terminal dentro del contenedor |
| `make mysql` | Consola de MySQL |
| `make clean CONFIRMAR=si` | Apaga todo y **borra la base de MySQL** y las dependencias de npm |

`make help` lista todo.

## Cómo está armado

```
docker-compose.yml      servicios
.env.example            puertos, credenciales y administrador inicial (se copia a .env, que no se sube a git)
Makefile                atajos
docker/backend/         imagen de Laravel (PHP 8.3 FPM) + init-backend.sh
docker/nginx/           nginx delante de PHP
docker/frontend/        imagen de Angular (Node 22) + script que instala dependencias
backend/                Laravel 12 (migraciones en database/migrations, seeders en database/seeders)
docs/modelo-base-de-datos.html   el modelo de datos, tabla por tabla
```

- El código se monta desde `backend/` y `frontend/`: lo que guardás en el editor se ve al instante.
- `backend/vendor` y `backend/.env` no se suben a git: los crea `make up`.
- El login del frontend ya usa Laravel (`/api/auth/...`, sesión por cookie). `ng serve` reenvía `/api` a Laravel con `frontend/proxy.conf.mjs`, así comparten dominio y no hace falta CORS. El resto de las pantallas todavía usa la API simulada.
- `node_modules` del frontend vive en un volumen de Docker, separado del de Windows (que no sirve en Linux).
- Dentro de Docker, la conexión a MySQL y a Mailpit la fijan las variables del `docker-compose.yml`; `backend/.env` queda con los mismos valores para que se entienda qué usa.
- `.gitattributes` fuerza saltos de línea LF en los scripts: con CRLF fallan dentro de los contenedores.

## Problemas comunes

- **"port is already allocated"**: ya tenés algo usando ese puerto (por ejemplo un MySQL local en 3306). Cambiá el puerto en `.env` y `make up`.
- **El frontend no carga los primeros minutos**: está instalando dependencias. `make logs s=frontend`.
- **Cambié algo en `docker/`**: `make build` y `make up`.
- **Perdí la contraseña del administrador**: `make fresh CONFIRMAR=si` (borra todo) o cambiala con `make artisan c="tinker"`.
- **Quiero empezar de cero la base**: `make fresh CONFIRMAR=si` (solo tablas) o `make clean CONFIRMAR=si` (todo).

> Este entorno es solo para desarrollo. Para producción va un compose aparte: Angular compilado servido por nginx, sin phpMyAdmin ni `ng serve`.
