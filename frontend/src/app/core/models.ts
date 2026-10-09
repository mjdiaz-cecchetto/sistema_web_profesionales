/**
 * Modelos de dominio compartidos entre el panel admin y la vista del cliente.
 * Única fuente de verdad: espeja la estructura de db.json (API local json-server).
 */

export interface LocationConfig {
  tipo: string;
  detalle: string;
  direccion: string;
  mapLink: string;
  icono: string;
}

export interface SpecialtyConfig {
  nombre: string;
  descripcion: string;
  icono: string;
  detalle: string;
}

/**
 * Cuenta del sistema (tenant): puede ser un CONSULTORIO (con varios
 * profesionales) o un PROFESIONAL independiente. Cada cuenta tiene su
 * login, su panel y su página pública propia (/c/{slug} o /p/{slug}).
 */
export interface Cuenta {
  id: string;
  tipo: 'consultorio' | 'profesional';
  /**
   * Email de CONTACTO de la organización (avisos de la plataforma).
   * Ya no es una credencial: quienes entran al panel son USUARIOS
   * (personas) con una membresía en la cuenta (colección `miembros`).
   */
  email: string;
  nombre: string;
  slug: string;
  descripcion: string;
  bannerUrl?: string;
  /** 'suspendida' bloquea el login de la cuenta y oculta su página pública. */
  estado: 'activa' | 'suspendida';
  /** Plan de membresía (la gestión de cobros llega más adelante). */
  plan: string;
  fechaAlta: string; // YYYY-MM-DD
  /** Horas mínimas de anticipación para que el paciente reprograme/cancele (default 24). */
  horasMinimasCancelacion?: number;
  /**
   * Un turno PENDIENTE que nadie confirmó hasta esta cantidad de horas antes
   * del inicio VENCE (estado EXPIRED) y libera el lugar. 0 = nunca vence.
   * Default 12. En el backend real lo aplica un job programado.
   */
  horasVencimientoPendiente?: number;
}

/** @deprecated alias temporal — usar Cuenta. */
export type Consultorio = Cuenta;

/**
 * Rol de una persona DENTRO de una cuenta (membresía):
 *  - administrador: todo (equipo, usuarios, configuración, servicios, perfiles).
 *    Puede haber varios por cuenta.
 *  - secretaria: agendas y pacientes (de todo el centro o de los profesionales
 *    asignados); no toca configuración, equipo, servicios ni perfiles.
 *  - profesional: solo lo suyo (agenda, pacientes que atendió, disponibilidad,
 *    servicios, perfil e historia clínica). Requiere profesionalId.
 */
export type RolUsuario = 'administrador' | 'secretaria' | 'profesional';

/**
 * PERSONA con acceso a la plataforma (colección `usuarios`). Una misma
 * persona puede pertenecer a varias cuentas (p. ej. un profesional que
 * atiende en dos centros): cada pertenencia es un `Miembro`.
 * Entra con DNI o email + contraseña.
 */
export interface Usuario {
  id: string;
  nombre: string;
  /** Único en la plataforma: credencial de login alternativa, avisos y recuperación. */
  email: string;
  /** Único en la plataforma: credencial de login principal. */
  dni: string;
  password: string; // mock: hash en el backend real
  /** false = la persona no puede iniciar sesión en ninguna cuenta. */
  activo: boolean;
}

/**
 * Membresía: une una PERSONA (usuario) con una CUENTA, con su rol
 * (colección `miembros`; en Laravel, tabla `miembros`).
 */
export interface Miembro {
  id: string;
  cuentaId: string;
  usuarioId: string;
  rol: RolUsuario;
  /**
   * Profesional del equipo que ES esta persona ("atiende").
   * Obligatorio para rol profesional; opcional para administrador (el dueño
   * que también atiende: ve la configuración Y sus historias clínicas).
   * Nunca para secretaría.
   */
  profesionalId?: string | null;
  /**
   * Solo secretaría: ids de los profesionales cuyas agendas gestiona.
   * Ausente o vacío = gestiona todo el centro.
   */
  profesionalesAsignados?: string[];
  /** false = sin acceso a ESTA cuenta (las demás membresías de la persona siguen). */
  activo: boolean;
}

/** Membresía con su persona resuelta (para listados de Mi Equipo → Usuarios). */
export interface MiembroConUsuario extends Miembro {
  usuario: Usuario;
}

/** Membresía con su cuenta resuelta (selector de centro al iniciar sesión). */
export interface MiembroConCuenta extends Miembro {
  cuenta: Cuenta;
}

/**
 * Administrador de la PLATAFORMA (back-office /gestion): da de alta y
 * gestiona cuentas. Por diseño NO tiene acceso a pacientes ni turnos —
 * el módulo de gestión solo muestra contadores agregados sin datos personales.
 */
export interface Administrador {
  id: string;
  nombre: string;
  email: string;
  /** Credencial alternativa al email. */
  dni?: string | null;
  rol?: 'administrador' | 'soporte' | 'facturacion';
  /** Solo en el mock: el backend nunca devuelve la contraseña. */
  password?: string;
}

/** Plan de membresía de la plataforma (colección `planes`). */
export interface Plan {
  id: string;
  nombre: string;
  /** Precio mensual en ARS. 0 = gratuito. */
  precioMensual: number;
  descripcion: string;
  /** Máximo de profesionales activos (0 = sin límite). */
  maxProfesionales: number;
  activo: boolean;
}

export type MedioPago = 'transferencia' | 'efectivo' | 'mercadopago' | 'otro';

/**
 * Cobro registrado a una cuenta (colección `pagos`).
 * Mock manual: en el backend real vendrán de la pasarela de pagos.
 */
export interface Pago {
  id: string;
  cuentaId: string;
  /** Período que salda, formato YYYY-MM. */
  periodo: string;
  /** Fecha en que se registró el cobro. */
  fecha: string; // YYYY-MM-DD
  monto: number;
  medio: MedioPago;
  notas?: string;
}

/**
 * Especialidad del catálogo de una cuenta (colección `especialidades`).
 * Los profesionales se dan de alta eligiendo una de estas; el nombre
 * se copia en `ProfessionalProfile.especialidad` (se renombra en cascada).
 */
export interface Especialidad {
  id: string;
  cuentaId: string;
  nombre: string;
  /** false = no se ofrece para nuevos profesionales (las asignadas se conservan). */
  activo: boolean;
}

export interface ProfessionalProfile {
  /** Identificador del profesional. */
  id: string;
  /** Cuenta (consultorio o profesional independiente) a la que pertenece. */
  cuentaId: string;
  /** Especialidad/categoría (ej. Psicología, Odontología) — agrupa en la página del consultorio. */
  especialidad: string;
  /** false = no atiende actualmente (no aparece para pacientes ni turnos nuevos). */
  activo?: boolean;
  nombre: string;
  titulo: string;
  avatarUrl: string;
  bannerUrl: string;
  /** WhatsApp del profesional para recibir comprobantes/avisos de pacientes (formato con código de país, ej. 5491123456789). */
  whatsapp?: string;
  frasePrincipal: string;
  biografia: string;
  modalidad: string;
  direcciones: LocationConfig[];
  areas: SpecialtyConfig[];
  /** Ids de las obras sociales DE LA CUENTA que atiende este profesional. */
  obrasSociales?: string[];
  /** true (o ausente) = también atiende pacientes particulares, sin obra social. */
  aceptaParticular?: boolean;
}

/** Valor que se guarda en turnos y pacientes cuando no usan obra social. */
export const PARTICULAR = 'Particular (Sin cobertura)';

/**
 * Obra social con la que trabaja una cuenta (colección `obrasSociales`).
 * El centro arma su lista (desde el catálogo sugerido de la plataforma o
 * agregando propias, p. ej. una obra social provincial) y cada profesional
 * marca cuáles atiende (ProfessionalProfile.obrasSociales).
 */
export interface ObraSocial {
  id: string;
  cuentaId: string;
  nombre: string;
  /** false = la cuenta dejó de trabajar con ella: no se ofrece a pacientes ni en altas nuevas. */
  activo: boolean;
}

export interface Patient {
  id: string;
  /** Padrón por cuenta (compartido entre los profesionales del consultorio). */
  cuentaId: string;
  nombre: string;
  email: string;
  telefono: string;
  dni: string;
  obraSocial: string;
  fechaAlta: string; // YYYY-MM-DD
}

/**
 * Estados del turno. ATTENDED / NO_SHOW se marcan desde la agenda
 * cuando el turno ya pasó, y alimentan las métricas de asistencia.
 * EXPIRED: turno pendiente que nadie confirmó a tiempo — libera el lugar
 * (según Cuenta.horasVencimientoPendiente).
 */
export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'ATTENDED' | 'NO_SHOW' | 'EXPIRED';

export interface Appointment {
  id: string;
  cuentaId: string;
  /** Turnos creados como serie repetida comparten este id (permite cancelar la serie completa). */
  serieId?: string;
  /** Profesional que atiende el turno. */
  profesionalId: string;
  serviceName: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  patientDni: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  status: AppointmentStatus;
  notes?: string;
  location: string;
  healthInsurance: string;
}

/** Disponibilidad semanal de UN profesional (colección `availabilities`, id = id del profesional). */
export interface ProfessionalAvailability {
  id: string; // = id del profesional
  cuentaId: string;
  days: DayAvailability[];
}

export interface DayAvailability {
  day: string;      // 'Lunes', 'Martes', ...
  dayIndex: number; // 0 (Domingo) a 6 (Sábado)
  active: boolean;
  slots: string[];  // ['08:00', '09:00', ...]
}

export interface BlockedDateRange {
  id: string;
  cuentaId: string;
  /** Profesional al que aplica el bloqueo. */
  profesionalId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  reason: string;
}

export interface Service {
  id: string;
  cuentaId: string;
  /** Profesional que ofrece este servicio. */
  profesionalId: string;
  name: string;
  description: string;
  durationMinutes: number;
  price?: number;
  /** false = oculto para nuevos turnos (los turnos ya creados no se tocan). Ausente = activo. */
  activo?: boolean;
}

/**
 * Entrada de HISTORIA CLÍNICA (colección `historias`). Dato sensible
 * (Ley 26.529): la carga y la lee ÚNICAMENTE el profesional tratante
 * que la escribió. Un administrador que no atiende y la secretaría no acceden.
 */
export interface HistoriaClinicaEntry {
  id: string;
  cuentaId: string;
  pacienteId: string;
  /** Profesional tratante: único que ve y edita esta entrada. */
  profesionalId: string;
  /** Turno asociado, si la entrada nace de una consulta puntual. */
  turnoId?: string;
  fecha: string; // YYYY-MM-DD
  motivo: string;
  diagnostico: string;
  tratamiento: string;
}

/** Evento que dispara un aviso. */
export type EventoNotificacion = 'solicitud_nueva' | 'reprogramado' | 'cancelado';

/** A quién va dirigido el aviso. */
export type DestinatarioNotificacion = 'paciente' | 'profesional' | 'secretaria';

/**
 * Aviso registrado por el sistema (colección `notificaciones`).
 * MOCK: acá solo se registra; el envío real lo hará el backend
 * (WhatsApp Business API y email). Eventos:
 *  - solicitud_nueva: un paciente reservó online → WhatsApp al profesional
 *    y email a cada secretaría activa que gestiona esa agenda.
 *  - reprogramado / cancelado: cambios del panel avisan al paciente y
 *    los del paciente avisan al profesional.
 */
export interface Notificacion {
  id: string;
  cuentaId: string;
  turnoId: string;
  evento: EventoNotificacion;
  /** Quién dispara el aviso. */
  origen: 'panel' | 'paciente';
  canal: 'whatsapp' | 'email';
  destinatarioTipo?: DestinatarioNotificacion;
  /** Persona destinataria cuando es una secretaría (usuarios.id). */
  usuarioId?: string;
  destinatario: string; // nombre de quien recibe
  telefono: string;     // vacío si el canal es email
  email?: string;       // solo canal email
  mensaje: string;
  fecha: string; // ISO
  estado: 'simulada';
}

/** Catálogo SUGERIDO de obras sociales de la plataforma (colección `healthInsurances`). */
export interface HealthInsurance {
  id: string;
  name: string;
}

export interface TimeSlot {
  id: string;
  date: string;      // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  isAvailable: boolean;
}

/** Datos que completa el paciente en el asistente de turnos. */
export interface BookingPatientData {
  firstName: string;
  lastName: string;
  dni: string;
  email: string;
  phone: string;
  healthInsurance: string;
  isFirstVisit: boolean;
  age: number;
  sex: string;
  notes?: string;
}

export interface BookingRequest {
  serviceId: string;
  professionalId: string;
  date: string;
  time: string;
  patientData: BookingPatientData;
}
