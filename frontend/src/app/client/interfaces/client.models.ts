/**
 * Re-export de los modelos compartidos (src/app/core/models.ts)
 * para mantener compatibilidad con los imports existentes.
 */
export type {
  Service,
  TimeSlot,
  BookingRequest,
  BookingPatientData,
  Appointment
} from '../../core/models';

export type { Professional } from '../services/client.service';
