# Resumen del Proyecto: Sistema Web para Profesionales

Este documento sirve como un registro vivo del estado del proyecto. Se actualizará periódicamente a medida que se implementen nuevas funcionalidades.

## 🛠️ Stack Tecnológico
- **Frontend:** Angular 18 (Standalone Components)
- **Estilos:** TailwindCSS (diseño minimalista, glassmorphism, responsive)
- **Backend / Base de Datos:** *(Por definir / Pendiente)*

---

## ✅ Lo que tenemos listo (Progreso Actual)

### 1. Landing Page (Página Principal B2B)
Se construyó la página de inicio en la ruta `/` orientada a vender la plataforma a los profesionales, inspirada estética y estructuralmente en herramientas líderes del sector.
*   **Hero Section:** Propuesta de valor clara ("Agenda, pacientes y turnos online en un solo lugar") con botones de llamado a la acción.
*   **Sección de Funciones (Features):** Tarjetas explicando la historia clínica privada, la agenda y el link público.
*   **Demo Visual:** Un mockup atractivo que invita a probar la vista del paciente (`/client`).
*   **Preguntas Frecuentes (FAQ):** Sistema de acordeón interactivo para resolver dudas comunes.
*   **Diseño:** Estética limpia, fondos "stone-50", detalles en "teal-600", y desenfoques (*backdrop-blur*) en el navegador superior.

### 2. Flujo del Paciente (Turnero / Aplicación Cliente)
Se ha desarrollado completamente la interfaz de usuario para que un paciente pueda reservar un turno. El diseño está optimizado para dispositivos móviles (*Mobile-First*), ofreciendo una experiencia similar a una aplicación nativa.

El turnero consta de 4 pasos integrados en un único componente (`AsistenteTurnosComponent`):

*   **Paso 1: Selección de Motivo**
    *   Tarjetas minimalistas para elegir el servicio (ej. "Consulta").
*   **Paso 2: Disponibilidad (Calendario y Horarios)**
    *   Calendario interactivo mensual.
    *   Lógica para identificar días hábiles y fines de semana.
    *   Visualización de días "Ocupados" (ejemplo en color rojo).
    *   Selección de turnos en formato de píldoras responsivas.
*   **Paso 3: Datos Personales y Cobertura**
    *   Formulario limpio sin bordes pesados.
    *   Recolección de datos: Nombre, Apellido, Correo, Teléfono, Edad, Sexo.
    *   Selector dinámico de Obra Social / Prepaga.
    *   Checkbox de primera consulta y área de notas.
*   **Paso 4: Confirmación del Turno**
    *   Pantalla de éxito tipo comprobante.
    *   Resumen detallado de los datos ingresados y recordatorios para el paciente.

**UX/UI Destacados:**
- Botones de acción anclados al fondo (*sticky*) en celulares para facilitar el uso con una mano.
- Encabezado con difuminado semitransparente (*backdrop-blur*) siempre visible.
- Uso de `Signals` de Angular para una gestión de estado rápida y reactiva.
- Mockups (datos falsos) integrados en `ClientService` para simular la conexión a la base de datos mientras no haya backend.

---

## 🚧 Próximos Pasos Sugeridos

*   **Panel de Administración del Profesional (Dashboard):**
    *   Crear la interfaz donde el profesional iniciará sesión.
    *   Vista de agenda diaria/semanal.
    *   Configuración de servicios, duración y obras sociales.
    *   Configuración de días y horarios de atención.
*   **Autenticación y Seguridad:**
    *   Login y Registro para profesionales.
*   **Backend y Base de Datos:**
    *   Crear la API (Node.js/NestJS/Spring/etc.) y modelar la base de datos para almacenar servicios, usuarios, turnos reales y configuraciones.
