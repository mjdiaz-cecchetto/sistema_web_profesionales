# Plan Multi-tenant (Workspaces) — Guía para continuar

> Documento de handoff. Si sos Claude (u otra IA) retomando este proyecto: leé este doc completo
> y `ESTADO_PROYECTO.md` antes de tocar código. Última actualización: 01/09/2026.

## Contexto y decisión

El sistema (hoy mono-profesional: Angular 21 + json-server, ver `ESTADO_PROYECTO.md`) evoluciona a
**SaaS multi-tenant basado en Workspaces**. Un workspace es un consultorio/centro o un profesional
independiente. Mismo código para ambos casos: la composición del workspace (1 miembro o varios)
decide qué UI se muestra, nunca hay dos proyectos separados.

**Estrategia:** NO tocar backend hasta terminar el maquetado del frontend. Todo se simula con
json-server (`db.json` + `seed.js`), incluida la auth (mock). Backend futuro: Laravel + MySQL +
Sanctum, tablas y campos en español.

**Roles (RBAC):**
- **Dueño:** todo.
- **Profesional:** su agenda y sus pacientes.
- **Secretaría:** agendas y pacientes de todos; ve precios; marca asistió/no asistió; NO toca
  disponibilidad de profesionales, ni configuración, ni facturación, ni equipo, ni perfil público.

## Las 8 decisiones cerradas (01/09/2026)

1. **Nombres:** `db.json` y `models.ts` pasan YA a español/snake_case (`paciente_id`, `fecha`),
   espejo exacto del Laravel futuro.
2. **Disponibilidad:** slots de hora fija (`['08:00','09:00',...]`), como el modelo actual.
   (Posible evolución futura: rangos desde/hasta + duración por servicio — no ahora.)
3. **Multi-workspace por usuario:** el modelo lo soporta (pivote `workspace_usuario`), pero la UI
   del MVP asume UN workspace por usuario. Sin selector post-login.
4. **Secretaría:** puede crear/editar pacientes, ver precios, marcar asistencia. No puede tocar
   disponibilidad, equipo, configuración ni perfil público.
5. **Conflictos:** la regla "un paciente = un turno activo por día" pasa a ser POR PROFESIONAL.
   El mismo paciente puede tener el mismo día turnos con dos profesionales distintos.
   Se mantiene: un horario de un profesional = un turno activo.
6. **Wizard público en consultorios:** se elige servicio primero → profesional que lo ofrece
   (con opción "cualquier profesional") → fecha/hora.
7. **Slug:** autogenerado del nombre del workspace al registrarse; editable UNA sola vez desde
   configuración.
8. **Cancelación/reprogramación del paciente:** campo `horas_minimas_cancelacion` en el workspace
   desde el día uno, default 24. La UI para configurarlo puede venir después, la regla se aplica ya.

## Estructura de carpetas objetivo (frontend/src/app/)

```
core/                        # singleton, sin UI
  models.ts                  # entidades en español, todas con workspace_id
  auth.service.ts            # sesión, usuario actual, rol (mock)
  workspace.service.ts       # workspace activo, miembros; expone esIndividual()
  api.interceptor.ts         # inyecta token + workspace (mock hoy, Sanctum mañana)
  guards/auth.guard.ts       # sin sesión → /auth/login
  guards/role.guard.ts       # canMatch por rol vía data.roles
  date-utils.ts, whatsapp.ts
auth/
  login/  registro/          # registro = alta de workspace, el que registra es dueño
  auth.routes.ts
admin/
  layout/                    # sidebar filtra links por rol y composición
  features/
    dashboard/ agenda/ pacientes/ servicios/ disponibilidad/
    perfil-publico/ equipo/ configuracion/     # equipo y configuracion: solo dueño
  admin.routes.ts
public/
  landing-saas/              # home B2B (/) — vende el sistema
  tenant-portal/             # /p/:slug — página pública del workspace
  booking-wizard/            # asistente de turnos
  mis-turnos/                # gestión del paciente por DNI
  public.routes.ts
shared/
  components/ directives/
```

**Migración desde lo actual:** `client/` → `public/` (`inicio` → `tenant-portal`,
`asistente-turnos` → `booking-wizard`); `landing/` raíz → base de `landing-saas`;
`admin/components/` → `admin/features/`. Borrar stubs `booking-wizard` y `landing-home` viejos.
`admin.service.ts` (god service) se parte: contexto transversal en `core/`, datos por feature.
Reemplazar el contador manual de cargas por `forkJoin`.

## Rutas

```
/                      landing-saas
/auth/login            login
/auth/registro         crea workspace + usuario dueño

/p/:slug               tenant-portal   ← resolver de workspace por slug AQUÍ (404 limpio si no existe)
/p/:slug/turnos        booking-wizard
/p/:slug/mis-turnos    gestión por DNI

/admin                 auth.guard en canMatch de todo el árbol → redirige a dashboard
/admin/dashboard
/admin/agenda/lista    /admin/agenda/calendario
/admin/pacientes       /admin/pacientes/:id
/admin/servicios
/admin/disponibilidad  # la propia (profesional) o por miembro (dueño/secretaría según regla 4)
/admin/perfil          # solo dueño (o el profesional en workspace individual)
/admin/equipo          # solo dueño
/admin/configuracion   # solo dueño
```

Claves: el workspace del admin sale de la SESIÓN (no de la URL); el público entra por slug.
La adaptación individual/consultorio NO son rutas distintas: `workspace.service.esIndividual()`
(computed sobre cantidad de miembros) oculta selectores de profesional, pestañas por miembro, etc.
El guard bloquea, el sidebar además esconde — ambas cosas.

## Modelo de datos (espejar tal cual en db.json y luego en MySQL)

```
workspaces
  id, nombre, slug (único), tipo ('individual'|'consultorio'),
  logo_url, banner_url, frase, biografia, whatsapp,
  horas_minimas_cancelacion (default 24), plan, activo, created_at

usuarios
  id, nombre, email (único), password, avatar_url, created_at

workspace_usuario                  # pivote membresía+rol
  id, workspace_id, usuario_id, rol ('duenio'|'profesional'|'secretaria'),
  activo, created_at               # UNIQUE (workspace_id, usuario_id)

perfiles_profesionales             # cara pública del profesional en el workspace
  id, workspace_id, usuario_id, titulo, matricula, frase, biografia,
  foto_url, modalidad              # UNIQUE (workspace_id, usuario_id)

especialidades
  id, workspace_id, profesional_id, nombre, descripcion, icono, detalle

lugares_atencion
  id, workspace_id, tipo, detalle, direccion, map_link, icono, activo

obras_sociales
  id, workspace_id, nombre, activo

servicios
  id, workspace_id, profesional_id (nullable: null = lo ofrecen todos),
  nombre, descripcion, duracion_minutos, precio (nullable), activo
  UNIQUE (workspace_id, nombre)

pacientes
  id, workspace_id, nombre, dni, email, telefono,
  obra_social_id (nullable), fecha_alta, notas
  UNIQUE (workspace_id, dni)       # DNI único POR workspace, no global

disponibilidades
  id, workspace_id, profesional_id, dia_semana (0-6), activo,
  slots JSON (['08:00',...])       # UNIQUE (workspace_id, profesional_id, dia_semana)

bloqueos_fechas
  id, workspace_id, profesional_id (nullable: null = cierra todo el consultorio),
  fecha_desde, fecha_hasta, motivo

series_turnos
  id, workspace_id, profesional_id, paciente_id, servicio_id,
  frecuencia ('semanal'|'quincenal'|'mensual'), cantidad_sesiones, created_at

turnos
  id, workspace_id, profesional_id, paciente_id, servicio_id,
  serie_id (nullable), fecha, hora,
  estado ('pendiente'|'confirmado'|'cancelado'|'asistio'|'no_asistio'),
  origen ('admin'|'portal'), lugar_id (nullable), obra_social_id (nullable),
  precio_congelado (nullable),     # snapshot del precio al reservar
  notas, motivo_cancelacion (nullable),
  reprogramado_de_id (nullable FK turnos),   # trazabilidad: el nuevo apunta al cancelado
  created_at, updated_at
```

Decisiones de diseño del modelo:
- Turnos 100% relacionales (adiós `patientName`/`serviceName` copiados). Únicos snapshots:
  `precio_congelado` y `obra_social_id` del turno (puede diferir de la actual del paciente).
- Estados amplían a 5: habilitan métricas reales de dashboard (pendiente funcional conocido).
- Pacientes pertenecen al workspace, no al profesional; quién atendió vive en cada turno.
- `perfiles_profesionales` separado de `usuarios`: cuenta ≠ cara pública; secretaría no tiene perfil.
- Obras sociales y lugares: tablas por workspace (hoy son strings sueltos).

## Orden de implementación acordado

1. **Modelo de datos:** reescribir `core/models.ts` + `seed.js` + `db.json` con la estructura de
   arriba. El seed genera DOS workspaces demo: uno individual y un consultorio con 3 miembros
   (dueño-profesional, profesional, secretaría), para probar todo contra ambos casos desde el día 1.
2. **Auth mock + guards:** `auth.service` (login contra `usuarios` de json-server, sesión en
   memoria/localStorage), `auth.guard`, `role.guard`, pantallas `auth/login` y `auth/registro`.
3. **Reestructura de carpetas** según el árbol de arriba + `workspace.service` + adaptación de los
   componentes existentes al nuevo modelo (queries con `workspace_id`/`profesional_id`).
4. **Tenant-portal por slug** (`/p/:slug` con resolver) + wizard con selección servicio→profesional.
5. **Features nuevas:** equipo, configuración, estados asistió/no asistió, regla de 24 hs.
6. Limpieza (stubs, `_to_delete/`) y tests de la lógica de turnos (turno-modal es el candidato #1).

## Reglas permanentes al codear

- Toda entidad nueva nace con `workspace_id` (y `profesional_id` donde aplique).
- Asumir siempre contexto workspace + rol en cada componente/servicio.
- Campos y colecciones en español/snake_case, espejo del Laravel futuro.
- json-server queries del estilo `/turnos?workspace_id=w1&profesional_id=u2&fecha=...` — misma
  forma que tendrá la API real.
