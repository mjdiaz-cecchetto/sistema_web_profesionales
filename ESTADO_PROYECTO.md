# Resumen del Proyecto: Sistema Web para Profesionales

Este documento sirve como un registro vivo del estado del proyecto. Se actualizará periódicamente a medida que se implementen nuevas funcionalidades.

## 🛠️ Stack Tecnológico
- **Frontend:** Angular 21 (Standalone Components, Signals)
- **Estilos:** TailwindCSS 3 + fuente Plus Jakarta Sans (design system propio: `src/styles.scss` + `tailwind.config.js`)
- **Base de datos simulada (localhost):** json-server sobre `db.json` en `http://localhost:3000`
- **Backend definitivo:** Laravel + MySQL *(pendiente — la API local respeta la misma forma de recursos para migrar después)*

## ▶️ Cómo correr el proyecto (desde `frontend/`)

```bash
npm install        # una sola vez
npm run dev        # levanta API (localhost:3000) + Angular (localhost:4200) juntos
```

O por separado: `npm run api` (json-server) y `npm start` (Angular).
Otros scripts: `npm run seed` regenera `db.json` con datos de ejemplo y fechas relativas a hoy.

---

## ✅ Lo que tenemos listo

### 1. API local simulada (json-server)
- `db.json` con: `profile` (incluye `avatarUrl` y `bannerUrl`), `appointments`, `patients`, `availability`, `blockedDates`, `services`, `healthInsurances`.
- `seed.js` regenera los datos de ejemplo con fechas relativas al día actual.
- Toda la app (admin y cliente) lee y escribe contra esta API — **ya no se usa localStorage**.

### 2. Panel de Administración (`/admin`) — rediseñado
- **Layout:** sidebar oscuro con acentos teal, aviso con botón "Reintentar" si la API local no responde.
- **Dashboard:** tarjeta de bienvenida con gradiente, métricas, turnos de hoy con confirmar/cancelar.
- **Agenda:** filtros (búsqueda, rango de fechas, estado, lugar dinámico), paginación, acciones de estado persistidas en la API.
- **Pacientes:** búsqueda + paginación; los pacientes nuevos se crean automáticamente al reservar un turno.
- **Disponibilidad:** horarios semanales + bloqueo de rangos de fechas por calendario (persistido en API).
- **Mi Perfil Público:** editor completo + **subida de foto de perfil y banner** con vista previa en vivo (imágenes redimensionadas en el navegador y guardadas en la API como base64).

### 3. Página del Paciente (`/client`) — rediseñada
- Hero con **banner** (o gradiente si no hay banner cargado) y **avatar** superpuesto, datos 100% desde la API (se acabó el perfil hardcodeado).
- Secciones: sobre mí, áreas de acompañamiento (acordeón), lugares de atención, CTA de reserva, CTA fijo en móvil.
- **Asistente de turnos (4 pasos):** los horarios se generan desde la disponibilidad real del admin, respetando fechas bloqueadas y turnos ocupados (los cancelados liberan el horario). Los días laborables sin horarios libres se marcan como "Ocupados" (ya no está hardcodeado). La reserva se crea **PENDIENTE** y el profesional la confirma desde el panel. La duración del servicio se usa para calcular la hora de fin.

### 4. Correcciones de bugs
- Cliente y admin compartían claves distintas de localStorage → resuelto al centralizar en la API.
- Fechas calculadas en UTC (`toISOString`) → ahora en horario local (`src/app/core/date-utils.ts`).
- Modelos duplicados → unificados en `src/app/core/models.ts`.
- Eliminados componentes muertos sin rutas: `booking-wizard` y `landing-home` (duplicaban el flujo actual y rompían la compilación).

---

## 🚧 Próximos Pasos Sugeridos
- **Backend Laravel + MySQL** (stack definitivo): migraciones para professionals, services, patients, appointments, availabilities y blocked_date_ranges; API Resources con la misma forma que `db.json` para que el frontend casi no cambie (solo `environment.apiUrl`).
- **Autenticación** (Laravel Sanctum) + guard de Angular para proteger `/admin`.
- CRUD de servicios y precios desde el panel.
- Acciones reales para "Nuevo Turno" y "Nuevo Paciente" desde el admin.
