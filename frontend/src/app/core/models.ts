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

export interface ProfessionalProfile {
  nombre: string;
  titulo: string;
  avatarUrl: string;
  bannerUrl: string;
  frasePrincipal: string;
  biografia: string;
  modalidad: string;
  direcciones: LocationConfig[];
  areas: SpecialtyConfig[];
}

export interface Patient {
  id: string;
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

export interface DayAvailability {
  day: string;      // 'Lunes', 'Martes', ...
  dayIndex: number; // 0 (Domingo) a 6 (Sábado)
  active: boolean;
  slots: string[];  // ['08:00', '09:00', ...]
}

export interface BlockedDateRange {
  id: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  reason: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  price?: number;
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
