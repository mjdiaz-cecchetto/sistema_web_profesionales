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
  email: string;
  password: string; // mock: en el backend real será un hash
  nombre: string;
  slug: string;
  descripcion: string;
  bannerUrl?: string;
}

/** @deprecated alias temporal — usar Cuenta. */
export type Consultorio = Cuenta;

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

export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

export interface Appointment {
  id: string;
  cuentaId: string;
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
