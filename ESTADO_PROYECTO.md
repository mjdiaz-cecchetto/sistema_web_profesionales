# Sistema Web para Profesionales — Estado del Proyecto

Registro vivo del estado del proyecto. Última actualización: 20/09/2026 (segundo sprint del día: login del equipo por DNI + recuperación, secretarías asignadas por profesional, vencimiento de turnos sin confirmar, avisos de WhatsApp simulados, historia clínica confidencial). FRONTEND CERRADO: lo que sigue es el backend Laravel.

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
| **Dra. Elena Ramos** (profesional independiente · psicología) | DNI `24853917` / `elena123` | `/p/dra-elena-ramos` |
| **Administrador de la Plataforma** (back-office · gestión de cuentas) | `admin@plataforma.com` / `admin123` | `/gestion` |
| Rocío Méndez (secretaría · **todo el centro**) | DNI `28456123` / `secretaria123` | `/admin` |
| Valeria Suárez (secretaría **asignada solo a la Od. Ríos**) | DNI `33780415` / `valeria123` | `/admin` |
| Lic. Carolina Funes (rol profesional) | DNI `27912384` / `carolina123` | `/admin` |

> El **equipo interno entra con DNI + contraseña** (mínimo esfuerzo para el personal); el email del usuario queda para avisos y recuperación. **Credencial de las CUENTAS (alta desde /gestion → Nueva cuenta):** las de **profesional independiente van siempre con DNI** (`Cuenta.dni`, campo obligatorio en el alta) y las de **consultorio eligen** en el alta si acceden con email o con DNI (selector "Credencial de acceso"). El DNI es único en toda la plataforma (cuentas + usuarios, validado en el modal); el email siempre se pide (avisos/recuperación) y el login por email sigue aceptándose por compatibilidad. San Martín eligió email; Elena accede con DNI. "¿Olvidaste tu contraseña?" muestra el flujo de recuperación (simulado; el envío real por email/WhatsApp lo hará el backend), con respuesta neutra que no revela si la cuenta existe.

- `/login`: pantalla de ingreso (mock contra `cuentas` de json-server; sesión en localStorage). Las cards de demo completan las credenciales con un clic y **solo aparecen si `environment.demoCredenciales` es `true`** (ponerlo en `false` antes de mostrar el sistema).
- `/admin` está protegido por guard: sin sesión redirige a `/login`. "Cerrar Sesión" funciona.
- **Todos los datos** (profesionales, servicios, turnos, pacientes, disponibilidades, bloqueos) llevan `cuentaId` y el panel/las páginas públicas solo ven lo de su cuenta. El padrón de pacientes es por cuenta (compartido entre los profesionales del consultorio).

---

## ✅ Lo que está hecho y verificado

### Roles dentro del consultorio (colección `usuarios`)
- El email de la **Cuenta** es el **DUEÑO** (todo, como siempre). El dueño crea usuarios del equipo desde **Mi Equipo → Usuarios**: **Secretaría** y **Profesional** (atado a un profesional del equipo: solo su agenda, los pacientes que él atendió, su disponibilidad, sus servicios y su perfil; sin selector global).
- **Secretarías asignadas:** cada secretaría puede gestionar **todo el centro** (sin asignación) o **solo las agendas de los profesionales que el dueño le marque** (`Usuario.profesionalesAsignados`; chips en el alta y botón "Agendas" en el listado). El alcance limita agenda, pacientes, selector global y alta de turnos (`alcanceSecretaria` / `profesionalesOperables` / `turnosAlcance` en AdminService). Verificado: Valeria solo ve lo de la Od. Ríos.
- Guards por rol en las rutas (`rolGuard`): entrar por URL a una sección prohibida redirige al dashboard. El menú además la esconde.
- Alta con **DNI (credencial de login, único)** + email (avisos) + contraseña inicial, activar/desactivar acceso y reset de contraseña. Un usuario desactivado (o de cuenta suspendida) no puede iniciar sesión.
- El mismo `/login` resuelve las cuatro identidades: identificador numérico → usuario por DNI; si no, administrador de plataforma → cuenta (dueño) → usuario por email (compatibilidad).

### Historia clínica (colección `historias`) — dato sensible
- Entradas `{fecha, motivo, diagnóstico, tratamiento}` por paciente, en el modal del paciente (Mis Pacientes).
- **Confidencialidad decidida: solo el profesional tratante ve y carga SUS entradas.** Ni el dueño del consultorio, ni las secretarías, ni otros profesionales, ni la impersonación de soporte acceden (`profesionalClinico`/`puedeVerHistoria` en AdminService; el GET carga por cuenta pero la UI solo expone lo propio — la regla dura va en el backend). La cuenta independiente (Elena) es su propio profesional tratante.
- Verificado: Carolina ve y agrega sus entradas de Romina; la secretaría no ve la sección ni los diagnósticos; Elena ve las suyas.

### Vencimiento de turnos sin confirmar (estado `EXPIRED`)
- Un turno **PENDIENTE** que nadie confirmó hasta `Cuenta.horasVencimientoPendiente` horas antes del inicio (default 12; 0 = nunca) pasa a **Vencido** y **libera el lugar** (el turnero público y los chequeos de solapamiento lo ignoran, igual que un cancelado). Los pendientes ya pasados no se tocan (quedan para marcar asistencia).
- En el mock se aplica al cargar el panel (con PATCH persistido); **en Laravel será un job programado**. Configurable en Mi Equipo → Datos del Centro y en Configuración de la Cuenta (individuales). Chip gris "Vencido" + filtro propio en Agenda Lista y Calendario; el paciente lo ve como "Vencido (sin confirmar)".

### Avisos de WhatsApp (colección `notificaciones`) — simulados
- Cada **reprogramación o cancelación** registra el aviso correspondiente: los cambios hechos **desde el panel** avisan al **paciente** (incluye cancelar/mover series, con un aviso por turno) y los cambios hechos **por el paciente online** avisan al **profesional**.
- El dashboard muestra los últimos avisos con badge **"Simulado"**: en el mock solo se registran (mensaje, teléfono, evento, origen, fecha) — **el envío real lo hará el backend vía WhatsApp Business API**, que tiene costo por conversación.

### Panel (`/admin`, según la cuenta y el rol logueados)
- **Cuenta consultorio:** selector global en el header ("Todos los profesionales" o uno), vista **Mi Equipo** con **catálogo de especialidades administrable** (colección `especialidades` por cuenta: alta, renombrar con actualización en cascada de sus profesionales, activar/desactivar — inactiva no se ofrece en altas nuevas —, eliminar solo si no tiene profesionales), **alta de profesionales eligiendo una especialidad ya cargada** (select; "+ Agregar acá" desde cada grupo la preselecciona) y **equipo agrupado por especialidad** (secciones con contador de activos y grupo "Sin especialidad" para huérfanos). Chips de profesional en Perfil/Servicios/Disponibilidad, y el modal de turnos permite elegir profesional (reglas de solapamiento **por profesional**).
- **Cuenta profesional:** el panel se ve como siempre — sin selector, sin Mi Equipo.
- **Dashboard** compacto a pantalla completa: métricas, turnos de hoy (con profesional en modo consultorio), aceptar/cancelar, atajos.
- **Agenda · Lista:** búsqueda y estado visibles, filtros avanzados tras botón, paginador, editar/confirmar/cancelar, WhatsApp por turno. Los turnos PASADOS sin resolución muestran **Asistió / No vino** (estados `ATTENDED`/`NO_SHOW`, con chips y filtro propios). Los turnos de una serie llevan chip **"Serie · N"**, botón **"Cancelar serie"** (confirmación inline) y **"Mover serie"**: panel inline para pasar todos los futuros activos a otro día y horario (valida disponibilidad, bloqueos, solapamientos y paciente-por-día; opción de omitir conflictivos; deja trazabilidad en las notas).
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
- **`/` (landing B2B) rediseñada al nivel del resto:** navbar fija, hero animado con mockup del panel hecho en CSS, 6 funciones, "cómo funciona" en 3 pasos, cards de las dos demos, **planes con precios reales leídos de la API** (misma fuente que /gestion, con "El más elegido"), FAQ acordeón y CTA de contacto (el alta es curada: mailto a la plataforma). Footer blanco — se fue el último bloque negro del sistema.

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
1. **Laravel + MySQL** multi-tenant, tablas en español (`cuentas` — con `dni` opcional como credencial —, `usuarios` — con `dni` único y `profesionales_asignados` —, `perfiles`/`profesionales`, `especialidades`, `pacientes`, `turnos` — con `serie_id` y 6 estados incl. `vencido` —, `servicios`, `disponibilidades`, `bloqueos_fechas`, `obras_sociales`, `lugares_atencion`, `historias_clinicas`, `notificaciones`, `planes`, `pagos`, `administradores`).
2. **Auth real** (Sanctum): registro de cuentas, hash de contraseñas, tokens, **recuperación de cuenta real** con token de un solo uso por email/WhatsApp (hoy simulada) (hoy el login es mock contra json-server y la contraseña viaja en texto plano — solo para desarrollo).
3. **Validaciones server-side** de todas las reglas de negocio (solapamientos, límite del plan, horas mínimas, alcance de secretarías, **acceso a historias clínicas SOLO del profesional tratante** — hoy la regla vive en la UI).
4. **Notificaciones automáticas**: WhatsApp (Business API, costo por conversación) y email al confirmar/reprogramar/cancelar — el mock ya registra qué aviso corresponde a cada evento en `notificaciones`.
5. **Job programado de vencimiento** de turnos pendientes (hoy se aplica al cargar el panel).
6. Subida real de imágenes a storage (hoy base64 en db.json).
7. Solicitud de alta desde la landing (formulario de contacto): el alta de cuentas es manual y curada desde `/gestion`, por decisión de producto.

### Funcional pendiente (frontend)
- (Ninguno bloqueante: la maqueta está completa, incluidas las definiciones del 20/09: secretarías por profesional, DNI + recuperación, vencimiento, avisos de WhatsApp simulados e historia clínica.)
- Invitaciones por email para usuarios del equipo (hoy el dueño define la contraseña inicial) — llega con el backend.

### Limpieza
- Borrar carpetas `client/components/booking-wizard` y `landing-home` (stubs vacíos).
- Tests automatizados (unitarios/E2E).
