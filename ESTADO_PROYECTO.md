# Sistema Web para Profesionales — Estado del Proyecto

Registro vivo del estado del proyecto. Última actualización: 30/08/2026.

## 🛠️ Stack
- **Frontend:** Angular 21 (standalone, signals) + TailwindCSS 3 · diseño flat pastel (blanco/gris/verde)
- **Base de datos simulada:** json-server sobre `frontend/db.json` en `localhost:3000`
- **Backend definitivo (próximo paso):** Laravel + MySQL · multi-profesional (SaaS) · tablas y atributos en español · auth con Sanctum

## ▶️ Cómo correr (desde `frontend/`)
```bash
npm install      # una sola vez
npm run dev      # API (localhost:3000) + web (localhost:4200)
npm run seed     # regenera db.json con datos de ejemplo (¡pisa los datos!)
```

---

## ✅ Lo que está hecho y verificado

### Panel del profesional (`/admin`)
- **Dashboard** compacto a pantalla completa: métricas, turnos de hoy con aceptar/cancelar, atajos.
- **Agenda · Lista:** búsqueda y estado siempre visibles, filtros avanzados tras botón (rango rápido, fechas, servicio, obra social, lugar), paginador, editar / confirmar / cancelar por fila y botón WhatsApp por turno.
- **Agenda · Calendario:** mes con indicadores por estado, filtro por estado, panel del día con scroll propio, filtro por nombre/DNI, alta y edición de turnos.
- **Modal de turno (compartido):** paciente con buscador + alta rápida inline, selector interactivo de fecha (mini calendario con disponibilidad real) y hora (chips, ocupados tachados, hora manual), estado inicial, notas, **series repetidas** (semanal / quincenal / mensual, N sesiones) con vista previa por fecha. Reglas: un horario = un turno activo · un paciente = un turno activo por día · en series se pueden omitir fechas con conflicto.
- **Servicios:** CRUD completo (nombre único, descripción, duración, precio opcional, activo/inactivo, eliminar con aviso de uso). Los inactivos no se ofrecen para turnos nuevos.
- **Mis Pacientes:** alta/edición con validaciones (DNI único e inmutable), historial completo por paciente, turno rápido con paciente precargado, filtros (obra social, con/sin próximo turno, orden), columna "Próximo turno".
- **Disponibilidad:** horarios semanales + bloqueo de rangos (vacaciones/feriados) por calendario.
- **Mi Perfil Público:** nombre, título, frase, bio, modalidad, WhatsApp, consultorios, especialidades y **subida de foto y banner** con vista previa.

### Página del paciente (`/client`)
- **Landing animada:** héroe con banner + avatar, entradas escalonadas, reveals al scroll, barra de progreso, navbar reactiva, servicios con **precios**, horarios de atención con día "HOY", ubicaciones, CTA con halo; en mobile: chips de navegación, carrusel de servicios deslizable, doble CTA fijo (Agendar / Mi turno).
- **Asistente de turnos (4 pasos):** disponibilidad real (horario semanal − bloqueos − ocupados), precios visibles, reserva queda **Pendiente**, comprobante por **WhatsApp** con mensaje pre-armado.
- **Gestionar mi turno (`/client/mis-turnos`):** búsqueda por **DNI**, próximos turnos con **reprogramar** (mini agenda + horarios al lado, vuelve a Pendiente con trazabilidad) y **Cancelar Turno**, historial anterior, aviso al profesional por WhatsApp.

### Técnica
- Modelos unificados en `core/models.ts` · fechas en horario local (`core/date-utils.ts`) · WhatsApp en `core/whatsapp.ts` · directiva `reveal` reutilizable · todo persiste vía HTTP en la API local.

---

## 🚧 Lo que falta

### Etapa Backend (siguiente)
1. **Laravel + MySQL** multi-profesional, tablas en español (`usuarios`, `perfiles`, `pacientes`, `turnos`, `servicios`, `disponibilidades`, `bloqueos_fechas`, `obras_sociales`, `lugares_atencion`, `especialidades`, `series_turnos`).
2. **Registro/Login** del profesional (Sanctum) + guard en `/admin` + pantalla de login ("Cerrar Sesión" hoy es decorativo).
3. **Validaciones server-side** de las reglas de negocio (hoy solo las valida el frontend).
4. **Notificaciones automáticas**: WhatsApp (Business API) y **email** al confirmar/reprogramar/cancelar (hoy es manual vía wa.me).
5. Subida real de imágenes a storage (hoy base64 en db.json).
6. Página pública por **slug** (`/p/{profesional}`) para el multi-tenant.

### Funcional pendiente (frontend)
- Estado **"Completado / Asistió / No asistió"** para turnos pasados (y métricas reales en dashboard).
- Gestión de **series como grupo** (cancelar/reprogramar toda la serie).
- Rediseño de la **landing B2B** (`/`) al nivel del resto.
- Requisitos de reprogramación/cancelación (ej. mínimo 24 hs antes) — hoy sin restricción.

### Limpieza
- Borrar carpetas `client/components/booking-wizard` y `landing-home` (stubs vacíos).
- Tests automatizados (unitarios/E2E).
