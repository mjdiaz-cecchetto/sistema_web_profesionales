# Sistema Web para Profesionales — Estado del Proyecto

Registro vivo del estado del proyecto. Última actualización: 26/09/2026 (modelo de usuarios: personas + membresías + roles combinables, multi-centro, independientes con secretaría; paleta petróleo + menta; fix mobile del perfil público). FRONTEND CERRADO: lo que sigue es el backend Laravel.

## 🛠️ Stack
- **Frontend:** Angular 21 (standalone, signals) + TailwindCSS 3 · diseño flat azul petróleo + verde menta (escalas `teal` y `menta` en `tailwind.config.js`)
- **Base de datos simulada:** json-server sobre `frontend/db.json` en `localhost:3000`
- **Backend definitivo (próximo paso):** Laravel + MySQL · multi-tenant (SaaS) · tablas y atributos en español · auth con Sanctum

## ▶️ Cómo correr (desde `frontend/`)
```bash
npm install      # una sola vez
npm run dev      # API (localhost:3000) + web (localhost:4200)
npm run seed     # regenera db.json con las 2 cuentas demo y sus personas (¡pisa los datos!)
```

## 🔑 Cuentas, personas y roles (multi-tenant en el frontend)
El sistema separa la **organización** de las **personas**:
- **`cuentas`**: la organización (un **consultorio** con varios profesionales o un **profesional independiente**), con su plan, su slug y su página pública. Su `email` es solo de contacto: **no es un login**.
- **`usuarios`**: **personas**. Entran con **su DNI o su email** + contraseña (ambos únicos en toda la plataforma).
- **`miembros`**: la **membresía** que une a una persona con una cuenta: `rol` (`administrador` | `secretaria` | `profesional`) + `profesionalId` (el profesional del equipo que ES esa persona) + `profesionalesAsignados` (agendas de una secretaría) + `activo`.

| Rol | Qué ve / hace |
|---|---|
| **Administrador** | Todo: equipo, **usuarios y accesos**, configuración, servicios, perfiles. Puede haber varios. Si además **atiende** (`profesionalId`), ve la historia clínica de SUS pacientes. |
| **Profesional** | Solo lo suyo: agenda, pacientes que atendió, disponibilidad, servicios, perfil e historia clínica. |
| **Secretaría** | Agendas y pacientes de todo el centro o de los profesionales asignados. Sin configuración ni historia clínica. |

- **Multi-centro:** una misma persona puede tener membresías en varias cuentas (p. ej. un profesional que atiende en dos centros). Al entrar **elige el centro**, y en el panel tiene **"Cambiar de centro"**.
- **Independientes con equipo:** una cuenta de profesional independiente también puede sumar secretarías (su administradora es la profesional, que atiende).
- **Reglas** (en `EquipoUsuariosService`; en Laravel irán en Policies): siempre queda ≥1 administrador activo (incluso frente a soporte), nadie cambia su propio rol ni se quita su acceso, un profesional se vincula a una sola persona, y la contraseña de una persona multi-centro no la resetea un centro (la gestiona ella).

| Persona (login DNI o email) | Contraseña | Acceso |
|---|---|---|
| Laura Benítez · `30112233` / `admin@centrosanmartin.com.ar` | `consultorio123` | Administradora de San Martín (no atiende) |
| Dr. Gustavo Lema · `20345678` | `lema1234` | Administrador de San Martín **+ atiende** (psiquiatría) |
| Rocío Méndez · `28456123` | `secretaria123` | Secretaría de todo San Martín |
| Valeria Suárez · `33780415` | `valeria123` | Secretaría de San Martín, solo la Od. Ríos |
| Lic. Carolina Funes · `27912384` | `carolina123` | Profesional en San Martín |
| Dra. Elena Ramos · `24853917` | `elena123` | **Multi-centro:** administradora + atiende en su cuenta, y profesional en San Martín (jueves) |
| Julieta Paz · `36544210` | `julieta123` | Secretaría de la cuenta de la Dra. Ramos |
| Administrador de la Plataforma · `admin@plataforma.com` | `admin123` | Back-office `/gestion` |

Páginas públicas: `/c/centro-san-martin` (consultorio) y `/p/dra-elena-ramos` (independiente).

- `/login`: una sola pantalla para todos (mock contra json-server; sesión en localStorage con persona + membresía activa). Las cards de demo **solo aparecen si `environment.demoCredenciales` es `true`** (ponerlo en `false` antes de mostrar el sistema).
- `/admin` está protegido por guard y cada sección por rol (`rolGuard`). **Todos los datos** llevan `cuentaId` y el panel/las páginas públicas solo ven lo de su cuenta.
- **Alta de cuentas (`/gestion` → Nueva cuenta):** crea la cuenta **y su administrador** (persona nueva, o se **vincula** una existente por DNI, que conserva su contraseña). Los usuarios y contraseñas se gestionan dentro de la cuenta en **Usuarios y Accesos** (soporte puede entrar como la cuenta).

---

## ✅ Lo que está hecho y verificado

### Usuarios y Accesos (colecciones `usuarios` + `miembros`) — 26/09
- Pantalla **Usuarios y Accesos** (`/admin/usuarios`, solo administradores, en consultorios **e independientes**): alta de persona por **DNI** — si ya existe en la plataforma se **vincula** sin duplicarla —, rol (Administrador / Profesional / Secretaría), "¿También atiende?" para administradores, agendas para secretarías, editar acceso, activar/desactivar por cuenta y reset de contraseña (bloqueado para personas multi-centro). Chips "Vos", "Atiende" y "Multi-centro". Mi Equipo tiene un atajo.
- **Login** por DNI o email para todas las personas; con varias membresías aparece **"¿En qué centro vas a trabajar?"** y en el panel **"Cambiar de centro"** (recarga los datos de la otra cuenta). La sesión recuerda el centro elegido.
- **Secretarías asignadas:** `Miembro.profesionalesAsignados` limita agenda, pacientes, selector global y alta de turnos (`alcanceSecretaria` / `profesionalesOperables` / `turnosAlcance`). Verificado: Valeria solo ve lo de la Od. Ríos.
- **Alcance vs. acceso clínico:** `AuthService.profesionalAtado` (solo rol profesional: el panel queda clavado en lo suyo) y `AuthService.profesionalPropio` (rol profesional o administrador que atiende: define la historia clínica). La impersonación de soporte nunca tiene acceso clínico.
- Guards por rol en las rutas (`rolGuard`): entrar por URL a una sección prohibida redirige al dashboard. El menú además la esconde.
- Verificado con E2E Playwright (39 chequeos, 26/09): los 8 perfiles demo, selector y cambio de centro, alta/vinculación de personas, reglas de último administrador / auto-edición / reset multi-centro, alta de cuentas desde /gestion con administrador nuevo y vinculado.

### Historia clínica (colección `historias`) — dato sensible
- Entradas `{fecha, motivo, diagnóstico, tratamiento}` por paciente, en el modal del paciente (Mis Pacientes).
- **Confidencialidad decidida: solo el profesional tratante ve y carga SUS entradas.** Ni un administrador que no atiende, ni las secretarías, ni otros profesionales, ni la impersonación de soporte acceden (`profesionalClinico`/`puedeVerHistoria` en AdminService; el GET carga por cuenta pero la UI solo expone lo propio — la regla dura va en el backend). Un administrador que **atiende** (p. ej. el Dr. Lema, o Elena en su cuenta) sí ve y carga las de SUS pacientes.
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
1. **Laravel + MySQL** multi-tenant, tablas en español (`cuentas` — organización, sin credenciales —, `usuarios` — personas, `dni` y `email` únicos —, `miembros` — cuenta + persona + rol + `profesional_id` + agendas asignadas —, `perfiles`/`profesionales`, `especialidades`, `pacientes`, `turnos` — con `serie_id` y 6 estados incl. `vencido` —, `servicios`, `disponibilidades`, `bloqueos_fechas`, `obras_sociales`, `lugares_atencion`, `historias_clinicas`, `notificaciones`, `planes`, `pagos`, `administradores`).
2. **Auth real** (Sanctum): registro de cuentas, hash de contraseñas, tokens, **recuperación de cuenta real** con token de un solo uso por email/WhatsApp (hoy simulada) (hoy el login es mock contra json-server y la contraseña viaja en texto plano — solo para desarrollo).
3. **Validaciones server-side** de todas las reglas de negocio (solapamientos, límite del plan, horas mínimas, alcance de secretarías, reglas de membresías (≥1 administrador, auto-edición, reset multi-centro), **acceso a historias clínicas SOLO del profesional tratante** — hoy la regla vive en la UI).
4. **Notificaciones automáticas**: WhatsApp (Business API, costo por conversación) y email al confirmar/reprogramar/cancelar — el mock ya registra qué aviso corresponde a cada evento en `notificaciones`.
5. **Job programado de vencimiento** de turnos pendientes (hoy se aplica al cargar el panel).
6. Subida real de imágenes a storage (hoy base64 en db.json).
7. Solicitud de alta desde la landing (formulario de contacto): el alta de cuentas es manual y curada desde `/gestion`, por decisión de producto.

### Funcional pendiente (frontend)
- (Ninguno bloqueante: la maqueta está completa, incluidas las definiciones del 20/09: secretarías por profesional, DNI + recuperación, vencimiento, avisos de WhatsApp simulados e historia clínica.)
- Invitaciones por email para usuarios del equipo (hoy el administrador define la contraseña inicial) — llega con el backend.
- Roles del back-office (soporte / facturación) y registro de impersonaciones y de accesos a historias clínicas — recomendados, pendientes.
- "Gestionar mi turno" del paciente solo con DNI: sumar código de un solo uso o link único cuando exista el backend.

### Limpieza
- Borrar carpetas `client/components/booking-wizard` y `landing-home` (stubs vacíos).
- Tests automatizados (unitarios/E2E).
