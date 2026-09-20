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
  /** Email de la cuenta: avisos, recuperación y (si no hay dni) credencial de acceso. */
  email: string;
  /**
   * DNI como credencial de acceso (único en la plataforma, junto con los DNI
   * de usuarios). Las cuentas de PROFESIONAL independiente siempre lo tienen;
   * los CONSULTORIOS eligen al alta si acceden con email o con DNI.
   * null/ausente = accede solo con email.
   */
  dni?: string | null;
  password: string; // mock: en el backend real será un hash
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

/** Rol de un usuario dentro de una cuenta. El login de la cuenta (email de la Cuenta) es el DUEÑO. */
export type RolUsuario = 'duenio' | 'secretaria' | 'profesional';

/**
 * Usuario del equipo de una cuenta (colección `usuarios`), creado por el dueño.
 *  - secretaria: gestiona agendas y pacientes de todos; no toca configuración,
 *    equipo, disponibilidad, servicios ni perfiles públicos.
 *  - profesional: solo su agenda, sus pacientes (los que atendió), su
 *    disponibilidad, sus servicios y su perfil público. Requiere profesionalId.
 */
export interface Usuario {
  id: string;
  cuentaId: string;
  nombre: string;
  email: string;    // único (para avisos y recuperación de cuenta)
  /** DNI del usuario: es su credencial de login (único en la plataforma). */
  dni: string;
  password: string; // mock: hash en el backend real
  rol: 'secretaria' | 'profesional';
  /** Solo rol profesional: a qué profesional del equipo corresponde. */
  profesionalId?: string;
  /**
   * Solo rol secretaria: ids de los profesionales cuyas agendas gestiona.
   * Ausente o vacío = gestiona todo el centro.
   */
  profesionalesAsignados?: string[];
  /** false = no puede iniciar sesión. */
  activo: boolean;
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
  password: string; // mock: en el backend real será un hash
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
 * que la escribió. Dueño de consultorio y secretaría no acceden.
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

/**
 * Aviso de WhatsApp registrado por el sistema (colección `notificaciones`).
 * MOCK: acá solo se registra; el envío real lo hará el backend vía
 * WhatsApp Business API cuando se reprograme o cancele un turno.
 */
export interface Notificacion {
  id: string;
  cuentaId: string;
  turnoId: string;
  evento: 'reprogramado' | 'cancelado';
  /** Quién dispara el aviso: cambios del panel avisan al paciente y viceversa. */
  origen: 'panel' | 'paciente';
  canal: 'whatsapp';
  destinatario: string; // nombre de quien recibe
  telefono: string;
  mensaje: string;
  fecha: string; // ISO
  estado: 'simulada';
}

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
