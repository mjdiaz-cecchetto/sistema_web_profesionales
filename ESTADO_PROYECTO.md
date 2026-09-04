# Sistema Web para Profesionales — Estado del Proyecto

Registro vivo del estado del proyecto. Última actualización: 04/09/2026 (pulido: asistencia, series, límite de plan, regla 24 hs).

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
| **Administrador de la Plataforma** (back-office · gestión de cuentas) | `admin@plataforma.com` / `admin123` | `/gestion` |

- `/login`: pantalla de ingreso (mock contra `cuentas` de json-server; sesión en localStorage). Las cards de demo completan las credenciales con un clic y **solo aparecen si `environment.demoCredenciales` es `true`** (ponerlo en `false` antes de mostrar el sistema).
- `/admin` está protegido por guard: sin sesión redirige a `/login`. "Cerrar Sesión" funciona.
- **Todos los datos** (profesionales, servicios, turnos, pacientes, disponibilidades, bloqueos) llevan `cuentaId` y el panel/las páginas públicas solo ven lo de su cuenta. El padrón de pacientes es por cuenta (compartido entre los profesionales del consultorio).

---

## ✅ Lo que está hecho y verificado

### Panel (`/admin`, según la cuenta logueada)
- **Cuenta consultorio:** selector global en el header ("Todos los profesionales" o uno), vista **Mi Equipo** con **catálogo de especialidades administrable** (colección `especialidades` por cuenta: alta, renombrar con actualización en cascada de sus profesionales, activar/desactivar — inactiva no se ofrece en altas nuevas —, eliminar solo si no tiene profesionales), **alta de profesionales eligiendo una especialidad ya cargada** (select; "+ Agregar acá" desde cada grupo la preselecciona) y **equipo agrupado por especialidad** (secciones con contador de activos y grupo "Sin especialidad" para huérfanos). Chips de profesional en Perfil/Servicios/Disponibilidad, y el modal de turnos permite elegir profesional (reglas de solapamiento **por profesional**).
- **Cuenta profesional:** el panel se ve como siempre — sin selector, sin Mi Equipo.
- **Dashboard** compacto a pantalla completa: métricas, turnos de hoy (con profesional en modo consultorio), aceptar/cancelar, atajos.
- **Agenda · Lista:** búsqueda y estado visibles, filtros avanzados tras botón, paginador, editar/confirmar/cancelar, WhatsApp por turno. Los turnos PASADOS sin resolución muestran **Asistió / No vino** (estados `ATTENDED`/`NO_SHOW`, con chips y filtro propios). Los turnos de una serie llevan chip **"Serie · N"** y botón **"Cancelar serie"** (con confirmación inline, cancela los futuros activos).
- **Agenda · Calendario:** mes con indicadores por estado (incluye punto celeste de asistencia), panel del día con scroll propio, filtro nombre/DNI (con filtros Asistió/No asistió), alta y edición, y las mismas acciones de asistencia en turnos pasados.
- **Modal de turno (compartido):** paciente con buscador + alta rápida inline, mini calendario con disponibilidad real, chips de hora, series repetidas (semanal/quincenal/mensual) con omitir-conflictos — ahora cada serie guarda `serieId`. Reglas: un horario = un turno activo · un paciente = un turno activo por día (por profesional).
- **Dashboard con métrica real:** card **"Asistencia (30 días)"** = asistidos / (asistidos + ausentes) de los últimos 30 días.
- **Límite del plan aplicado:** `Plan.maxProfesionales` bloquea el alta y la reactivación de profesionales en Mi Equipo (banner ámbar al alcanzarlo).
- **Regla de anticipación:** `Cuenta.horasMinimasCancelacion` (default 24, configurable en Mi Equipo → Datos del Centro) — el paciente no puede reprogramar/cancelar online dentro de esa ventana (ve un aviso con el número de horas).
- **Servicios / Mis Pacientes / Disponibilidad / Mi Perfil Público:** CRUD completos como antes, ahora scoped por cuenta y profesional en foco. "Ver página pública" apunta a `/c/{slug}` o `/p/{slug}` según la cuenta.

### Páginas públicas
- **`/c/{slug}` (consultorio):** landing del centro con hero, **filtro por especialidad**, cards del equipo (Ver Perfil / Agendar), CTA "Gestionar mi turno".
- **`/c/{slug}/p/{profId}` y `/p/{slug}`:** landing personal animada del profesional (banner, servicios con precios, áreas, horarios con "HOY", ubicaciones, doble CTA mobile). En consultorio hay botón de volver al centro.
- **Turnero (4 pasos)** bajo `/c/{slug}/turnos[/{profId}]` y `/p/{slug}/turnos`: en el centro, si no viene profesional en la URL el paciente elige **especialidad → profesional**, con la opción **"El turno más próximo"** (compara la disponibilidad de todos los profesionales de la especialidad y asigna al del primer horario libre; se ofrece cuando hay más de uno). "Volver" regresa al selector sin salir del turnero; con una sola especialidad ese paso se saltea, y la cuenta individual va directo a servicios. Disponibilidad real del profesional elegido, reserva Pendiente, comprobante por WhatsApp al profesional.
- **Gestionar mi turno** (`…/mis-turnos`): búsqueda por DNI **dentro de la cuenta**, reprogramar (mini agenda + horarios), Cancelar Turno, aviso por WhatsApp. Dentro de la ventana mínima de anticipación los botones se reemplazan por un aviso; el historial distingue **Asististe / No asististe**.
- **`/` (landing B2B):** botones Ingresar → `/login` y links a las dos demos.

### Back-office de la plataforma (`/gestion`, solo administradores)
- **Layout con sidebar oscuro** (misma estructura que el panel de las cuentas): Dashboard · Cuentas · Membresías · Cobros (+ Reportes y Configuración como "próximamente").
- **Modelo `Administrador`** (colección `administradores`); el mismo `/login` detecta el tipo y redirige a `/gestion` o `/admin`.
- **Dashboard de plataforma:** KPIs (cuentas activas/suspendidas, profesionales, pacientes, turnos del mes, ingresos del mes), cobranza del período (al día / con pago pendiente / sin cargo, con atajo a registrar), actividad del mes por cuenta (barras), últimos cobros y atajos.
- **Cuentas:** listado con tipo, plan (con aviso "pago pendiente"), estado y totales agregados — **por diseño el back-office nunca ve pacientes ni turnos**, solo contadores. Alta (a la de profesional le crea perfil + disponibilidad vacía), edición (datos, plan, slug, reset de contraseña), suspender/reactivar (suspendida = sin login + página pública oculta) e **impersonación** ("Entrar como" con banner de soporte y Volver a Gestión).
- **Membresías:** CRUD de planes (`planes`: nombre, precio mensual ARS, máx. profesionales, activo). Un plan inactivo no se ofrece a cuentas nuevas; las existentes lo conservan.
- **Cobros:** registro manual de pagos de membresía (`pagos`: cuenta, período YYYY-MM, monto, medio, notas), con sugerencia del precio del plan, control de duplicados por período, filtros (cuenta/período/medio) y panel de pendientes del período. Estado de cobranza derivado: plan gratuito = sin cargo; plan pago sin pago del período = **vencida** (se ve en Dashboard y Cuentas).
- `Cuenta` suma `estado` ('activa'|'suspendida'), `plan` (FK a `planes`) y `fechaAlta`. Seed: planes Demo/Profesional/Consultorio + historial de pagos (San Martín al día, Elena con el mes pendiente).

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
6. Solicitud de alta desde la landing (formulario de contacto): el alta de cuentas es manual y curada desde `/gestion`, por decisión de producto.

### Funcional pendiente (frontend)
- Rediseño de la **landing B2B** (`/`) al nivel del resto.
- Reprogramar una serie completa como grupo (hoy: cancelar serie sí; reprogramar es turno por turno).
- Roles dentro del consultorio (admin vs. secretaría vs. profesional que solo ve lo suyo) — hoy el login del consultorio ve todo. **Definirlo antes del backend.**

### Limpieza
- Borrar carpetas `client/components/booking-wizard` y `landing-home` (stubs vacíos).
- Tests automatizados (unitarios/E2E).
