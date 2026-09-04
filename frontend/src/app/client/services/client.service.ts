import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Appointment,
  BlockedDateRange,
  BookingRequest,
  Cuenta,
  DayAvailability,
  HealthInsurance,
  ProfessionalAvailability,
  ProfessionalProfile,
  Service,
  TimeSlot
} from '../../core/models';
import { addDaysLocal, addMinutes, parseLocalDate } from '../../core/date-utils';

/**
 * Servicio de la vista del paciente (multi-profesional).
 * Consume la API local (json-server en localhost:3000).
 */
@Injectable({ providedIn: 'root' })
export class ClientService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  /** Días hacia adelante para los que se generan turnos disponibles. */
  private readonly DIAS_AGENDA = 21;

  /** Resuelve una cuenta pública por su slug (/c/{slug} o /p/{slug}). */
  getCuentaPorSlug(slug: string): Observable<Cuenta> {
    return this.http.get<Cuenta[]>(`${this.api}/cuentas?slug=${encodeURIComponent(slug)}`).pipe(
      map(list => {
        const cuenta = list[0];
        if (!cuenta) throw new Error('Cuenta no encontrada: ' + slug);
        return cuenta;
      })
    );
  }

  /** Profesionales activos de una cuenta. */
  getProfessionals(cuentaId: string): Observable<ProfessionalProfile[]> {
    return this.http.get<ProfessionalProfile[]>(`${this.api}/professionals?cuentaId=${encodeURIComponent(cuentaId)}`).pipe(
      map(list => list.filter(p => p.activo !== false))
    );
  }

  getProfessional(profId: string): Observable<ProfessionalProfile> {
    return this.http.get<ProfessionalProfile>(`${this.api}/professionals/${profId}`);
  }

  /** Disponibilidad semanal de un profesional. */
  getWeeklyAvailability(profId: string): Observable<DayAvailability[]> {
    return this.http.get<ProfessionalAvailability>(`${this.api}/availabilities/${profId}`).pipe(
      map(a => a.days ?? [])
    );
  }

  /** Servicios activos de un profesional. */
  getServices(profId: string): Observable<Service[]> {
    return this.http.get<Service[]>(`${this.api}/services?profesionalId=${encodeURIComponent(profId)}`).pipe(
      map(list => list.filter(s => s.activo !== false))
    );
  }

  getHealthInsurances(): Observable<string[]> {
    return this.http.get<HealthInsurance[]>(`${this.api}/healthInsurances`).pipe(
      map(list => list.map(h => h.name))
    );
  }

  /**
   * Turnos disponibles de un profesional:
   * su disponibilidad semanal − sus bloqueos − sus turnos activos.
   */
  getAvailableTimeSlots(profId: string, serviceId: string): Observable<TimeSlot[]> {
    return this.getBookingCalendar(profId, serviceId).pipe(map(r => r.slots));
  }

  getBookingCalendar(profId: string, serviceId: string): Observable<{ slots: TimeSlot[]; fullyBookedDates: string[] }> {
    return forkJoin({
      avail: this.getWeeklyAvailability(profId),
      appts: this.http.get<Appointment[]>(`${this.api}/appointments?profesionalId=${encodeURIComponent(profId)}`),
      blocked: this.http.get<BlockedDateRange[]>(`${this.api}/blockedDates?profesionalId=${encodeURIComponent(profId)}`),
      services: this.getServices(profId)
    }).pipe(
      map(({ avail, appts, blocked, services }) => {
        const duracion = services.find(s => s.id === serviceId)?.durationMinutes ?? 60;

        const ocupados = new Set(
          appts.filter(a => a.status !== 'CANCELLED').map(a => `${a.date}|${a.time}`)
        );

        const slots: TimeSlot[] = [];
        const fullyBookedDates: string[] = [];
        let contador = 1;

        for (let dia = 1; dia <= this.DIAS_AGENDA; dia++) {
          const fecha = addDaysLocal(dia);

          const bloqueada = blocked.some(r => r.startDate <= fecha && fecha <= r.endDate);
          if (bloqueada) continue;

          const dayOfWeek = parseLocalDate(fecha).getDay();
          const configDia = avail.find(c => c.dayIndex === dayOfWeek);
          if (!configDia || !configDia.active || configDia.slots.length === 0) continue;

          let libresEnElDia = 0;
          for (const hora of configDia.slots) {
            if (ocupados.has(`${fecha}|${hora}`)) continue;
            libresEnElDia++;
            slots.push({
              id: `ts-${contador++}`,
              date: fecha,
              startTime: hora,
              endTime: addMinutes(hora, duracion),
              isAvailable: true
            });
          }

          if (libresEnElDia === 0) fullyBookedDates.push(fecha);
        }
        return { slots, fullyBookedDates };
      })
    );
  }

  /**
   * Crea el turno (estado PENDING) con su profesional,
   * y da de alta al paciente si su DNI no existe todavía.
   */
  createAppointment(reserva: BookingRequest): Observable<Appointment> {
    const profId = reserva.professionalId;
    return forkJoin({
      services: this.getServices(profId),
      profesional: this.getProfessional(profId)
    }).pipe(
      switchMap(({ services, profesional }) => {
        const servicio = services.find(s => s.id === reserva.serviceId);
        const p = reserva.patientData;

        const location = profesional.direcciones?.[0]?.tipo || 'Consultorio';

        const nuevoTurno: Appointment = {
          id: 'apt-' + Date.now().toString(36) + Math.floor(Math.random() * 1000),
          cuentaId: profesional.cuentaId,
          profesionalId: profId,
          serviceName: servicio?.name || 'Consulta',
          patientName: `${p.firstName.trim()} ${p.lastName.trim()}`,
          patientEmail: p.email,
          patientPhone: p.phone,
          patientDni: p.dni,
          date: reserva.date,
          time: reserva.time,
          status: 'PENDING',
          notes: p.notes || '',
          location,
          healthInsurance: p.healthInsurance
        };

        return this.http.post<Appointment>(`${this.api}/appointments`, nuevoTurno).pipe(
          switchMap(creado => this.ensurePatient(creado).pipe(map(() => creado)))
        );
      })
    );
  }

  // ===== Gestión de turnos por DNI (autogestión del paciente) =====

  /** Turnos de un DNI dentro de una cuenta (cada centro/profesional ve solo los suyos). */
  getTurnosPorDni(cuentaId: string, dni: string): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(
      `${this.api}/appointments?cuentaId=${encodeURIComponent(cuentaId)}&patientDni=${encodeURIComponent(dni.trim())}`
    );
  }

  reprogramarTurno(turno: Appointment, nuevaFecha: string, nuevaHora: string): Observable<Appointment> {
    const notaBase = (turno.notes || '').replace(/\s*\[Reprogramado por el paciente[^\]]*\]/g, '').trim();
    const nota = `${notaBase} [Reprogramado por el paciente: antes ${turno.date} ${turno.time} hs]`.trim();
    return this.http.patch<Appointment>(`${this.api}/appointments/${turno.id}`, {
      date: nuevaFecha,
      time: nuevaHora,
      status: 'PENDING',
      notes: nota
    });
  }

  cancelarTurno(turno: Appointment): Observable<Appointment> {
    const notaBase = (turno.notes || '').trim();
    const nota = `${notaBase} [Cancelado por el paciente]`.trim();
    return this.http.patch<Appointment>(`${this.api}/appointments/${turno.id}`, {
      status: 'CANCELLED',
      notes: nota
    });
  }

  /** Da de alta al paciente si su DNI no está registrado en la cuenta (padrón por cuenta). */
  private ensurePatient(appt: Appointment): Observable<unknown> {
    return this.http.get<unknown[]>(`${this.api}/patients?cuentaId=${encodeURIComponent(appt.cuentaId)}&dni=${appt.patientDni}`).pipe(
      switchMap(existentes => {
        if (existentes.length > 0) return of(null);
        return this.http.post(`${this.api}/patients`, {
          id: 'pat-' + appt.cuentaId + '-' + appt.patientDni,
          cuentaId: appt.cuentaId,
          nombre: appt.patientName,
          email: appt.patientEmail,
          telefono: appt.patientPhone,
          dni: appt.patientDni,
          obraSocial: appt.healthInsurance,
          fechaAlta: appt.date
        });
      })
    );
  }
}
