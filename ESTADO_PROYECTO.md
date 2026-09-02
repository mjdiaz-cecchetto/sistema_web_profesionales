# Sistema Web para Profesionales — Estado del Proyecto

Registro vivo del estado del proyecto. Última actualización: 02/09/2026.

## 🛠️ Stack
- **Frontend:** Angular 21 (standalone, signals) + TailwindCSS 3 · diseño flat pastel (blanco/gris/verde)
- **Base de datos simulada:** json-server sobre `frontend/db.json` en `localhost:3000`
- **Backend definitivo (próximo paso):** Laravel + MySQL · multi-tenant (SaaS) · tablas y atributos en español · auth con Sanctum

## ▶️ Cómo correr (desde `frontend/`)
```bash
npm install      # una sola vez
npm run dev      # API (localhost:3000) + web (localhost:4200)
npm run seed     # regenera db.json con las 2 cuentas demo (¡pisa los datos!)
```

## 🔑 Cuentas y rutas (multi-tenant en el frontend)
El sistema maneja **cuentas** (`cuentas` en db.json): cada cuenta es un **consultorio** (varios profesionales, con especialidades) o un **profesional independiente**. Cada cuenta tiene su login, su panel y su página pública propia.

| Cuenta | Login (`/login`) | Página pública |
|---|---|---|
| **Centro Médico San Martín** (consultorio · 5 profesionales: psicología, psiquiatría, odontología, nutrición, kinesiología) | `admin@centrosanmartin.com.ar` / `consultorio123` | `/c/centro-san-martin` |
| **Dra. Elena Ramos** (profesional independiente · psicología) | `elena.ramos@gmail.com` / `elena123` | `/p/dra-elena-ramos` |

- `/login`: pantalla de ingreso (mock contra `cuentas` de json-server; sesión en localStorage). Las cards de demo completan las credenciales con un clic.
- `/admin` está protegido por guard: sin sesión redirige a `/login`. "Cerrar Sesión" funciona.
- **Todos los datos** (profesionales, servicios, turnos, pacientes, disponibilidades, bloqueos) llevan `cuentaId` y el panel/las páginas públicas solo ven lo de su cuenta. El padrón de pacientes es por cuenta (compartido entre los profesionales del consultorio).

---

## ✅ Lo que está hecho y verificado

### Panel (`/admin`, según la cuenta logueada)
- **Cuenta consultorio:** selector global en el header ("Todos los profesionales" o uno), vista **Mi Equipo** (datos del centro, alta de profesionales con especialidad, activar/desactivar), chips de profesional en Perfil/Servicios/Disponibilidad, y el modal de turnos permite elegir profesional (reglas de solapamiento **por profesional**).
- **Cuenta profesional:** el panel se ve como siempre — sin selector, sin Mi Equipo.
- **Dashboard** compacto a pantalla completa: métricas, turnos de hoy (con profesional en modo consultorio), aceptar/cancelar, atajos.
- **Agenda · Lista:** búsqueda y estado visibles, filtros avanzados tras botón, paginador, editar/confirmar/cancelar, WhatsApp por turno.
- **Agenda · Calendario:** mes con indicadores por estado, panel del día con scroll propio, filtro nombre/DNI, alta y edición.
- **Modal de turno (compartido):** paciente con buscador + alta rápida inline, mini calendario con disponibilidad real, chips de hora, series repetidas (semanal/quincenal/mensual) con omitir-conflictos. Reglas: un horario = un turno activo · un paciente = un turno activo por día (por profesional).
- **Servicios / Mis Pacientes / Disponibilidad / Mi Perfil Público:** CRUD completos como antes, ahora scoped por cuenta y profesional en foco. "Ver página pública" apunta a `/c/{slug}` o `/p/{slug}` según la cuenta.

### Páginas públicas
- **`/c/{slug}` (consultorio):** landing del centro con hero, **filtro por especialidad**, cards del equipo (Ver Perfil / Agendar), CTA "Gestionar mi turno".
- **`/c/{slug}/p/{profId}` y `/p/{slug}`:** landing personal animada del profesional (banner, servicios con precios, áreas, horarios con "HOY", ubicaciones, doble CTA mobile). En consultorio hay botón de volver al centro.
- **Turnero (4 pasos)** bajo `/c/{slug}/turnos[/{profId}]` y `/p/{slug}/turnos`: disponibilidad real del profesional elegido, reserva Pendiente, comprobante por WhatsApp al profesional.
- **Gestionar mi turno** (`…/mis-turnos`): búsqueda por DNI **dentro de la cuenta**, reprogramar (mini agenda + horarios), Cancelar Turno, aviso por WhatsApp.
- **`/` (landing B2B):** botones Ingresar → `/login` y links a las dos demos.

### Técnica
- `core/auth.service.ts` (sesión) + `core/auth.guard.ts` · modelos en `core/models.ts` (con `Cuenta` y `cuentaId`) · fechas locales (`core/date-utils.ts`) · WhatsApp (`core/whatsapp.ts`) · rutas hijas heredan `:slug` (`paramsInheritanceStrategy: 'always'`) · todo persiste vía HTTP en json-server.
- Verificado con build + E2E Playwright (29 chequeos): guard, login/logout, aislamiento de datos entre cuentas, filtro de especialidades, wizard por profesional, mis-turnos scoped.

---

## 🚧 Lo que falta

### Etapa Backend (siguiente)
1. **Laravel + MySQL** multi-tenant, tablas en español (`cuentas`, `usuarios`, `perfiles`/`profesionales`, `especialidades`, `pacientes`, `turnos`, `servicios`, `disponibilidades`, `bloqueos_fechas`, `obras_sociales`, `lugares_atencion`, `series_turnos`).
2. **Auth real** (Sanctum): registro de cuentas, hash de contraseñas, tokens (hoy el login es mock contra json-server y la contraseña viaja en texto plano — solo para desarrollo).
3. **Validaciones server-side** de las reglas de negocio.
4. **Notificaciones automáticas**: WhatsApp (Business API) y email al confirmar/reprogramar/cancelar.
5. Subida real de imágenes a storage (hoy base64 en db.json).
6. Registro de cuentas nuevas desde la landing ("Crear cuenta" hoy lleva al login).

### Funcional pendiente (frontend)
- Estado **"Completado / Asistió / No asistió"** para turnos pasados (y métricas reales en dashboard).
- Gestión de **series como grupo** (cancelar/reprogramar toda la serie).
- Rediseño de la **landing B2B** (`/`) al nivel del resto.
- Requisitos de reprogramación/cancelación (ej. mínimo 24 hs antes) — hoy sin restricción.
- Roles dentro del consultorio (admin vs. profesional que solo ve lo suyo) — hoy el login del consultorio ve todo.

### Limpieza
- Borrar carpetas `client/components/booking-wizard` y `landing-home` (stubs vacíos).
- Tests automatizados (unitarios/E2E).
