import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Appointment,
  BlockedDateRange,
  BookingRequest,
  DayAvailability,
  HealthInsurance,
  ProfessionalProfile,
  Service,
  TimeSlot
} from '../../core/models';
import { addDaysLocal, addMinutes, parseLocalDate } from '../../core/date-utils';

/** Vista simplificada del profesional para la página pública. */
export interface Professional {
  id: string;
  name: string;
  title: string;
  bio: string;
  avatarUrl: string;
  bannerUrl: string;
  whatsapp: string;
  phrase: string;
  modality: string;
  specialties: string[];
}

/**
 * Servicio de la vista del paciente.
 * Consume la API local (json-server en localhost:3000).
 */
@Injectable({ providedIn: 'root' })
export class ClientService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  /** Días hacia adelante para los que se generan turnos disponibles. */
  private readonly DIAS_AGENDA = 21;

  getProfile(): Observable<ProfessionalProfile> {
    return this.http.get<ProfessionalProfile>(`${this.api}/profile`);
  }

  getProfessionalInfo(): Observable<Professional> {
    return this.getProfile().pipe(
      map(p => ({
        id: 'prof-1',
        name: p.nombre,
        title: p.titulo,
        bio: p.biografia,
        avatarUrl: p.avatarUrl,
        bannerUrl: p.bannerUrl,
        whatsapp: p.whatsapp || '',
        phrase: p.frasePrincipal,
        modality: p.modalidad,
        specialties: (p.areas ?? []).map(a => a.nombre)
      }))
    );
  }

  /** Disponibilidad semanal (para mostrar horarios de atención en la página pública). */
  getWeeklyAvailability(): Observable<DayAvailability[]> {
    return this.http.get<{ days: DayAvailability[] }>(`${this.api}/availability`).pipe(
      map(a => a.days ?? [])
    );
  }

  /** Servicios ofrecidos al paciente (solo los activos). */
  getServices(): Observable<Service[]> {
    return this.http.get<Service[]>(`${this.api}/services`).pipe(
      map(list => list.filter(s => s.activo !== false))
    );
  }

  getHealthInsurances(): Observable<string[]> {
    return this.http.get<HealthInsurance[]>(`${this.api}/healthInsurances`).pipe(
      map(list => list.map(h => h.name))
    );
  }

  /**
   * Genera los turnos disponibles combinando:
   * disponibilidad semanal + fechas bloqueadas + turnos ya reservados (no cancelados).
   */
  getAvailableTimeSlots(serviceId: string): Observable<TimeSlot[]> {
    return this.getBookingCalendar(serviceId).pipe(map(r => r.slots));
  }

  /**
   * Igual que getAvailableTimeSlots pero además informa qué días laborables
   * quedaron completamente ocupados (para pintarlos en el calendario).
   */
  getBookingCalendar(serviceId: string): Observable<{ slots: TimeSlot[]; fullyBookedDates: string[] }> {
    return forkJoin({
      avail: this.http.get<{ days: DayAvailability[] }>(`${this.api}/availability`),
      appts: this.http.get<Appointment[]>(`${this.api}/appointments`),
      blocked: this.http.get<BlockedDateRange[]>(`${this.api}/blockedDates`),
      services: this.getServices()
    }).pipe(
      map(({ avail, appts, blocked, services }) => {
        const config = avail.days ?? [];
        const duracion = services.find(s => s.id === serviceId)?.durationMinutes ?? 60;

        // Un turno cancelado libera su horario.
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
          const configDia = config.find(c => c.dayIndex === dayOfWeek);
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

          // Día laborable sin ningún horario libre → completamente ocupado
          if (libresEnElDia === 0) fullyBookedDates.push(fecha);
        }
        return { slots, fullyBookedDates };
      })
    );
  }

  /**
   * Crea el turno (estado PENDING: el profesional lo confirma desde su panel)
   * y da de alta al paciente si su DNI no existe todavía.
   */
  createAppointment(reserva: BookingRequest): Observable<Appointment> {
    return forkJoin({
      services: this.getServices(),
      profile: this.getProfile()
    }).pipe(
      switchMap(({ services, profile }) => {
        const servicio = services.find(s => s.id === reserva.serviceId);
        const p = reserva.patientData;

        const esParticular = p.healthInsurance.toLowerCase().includes('particular');
        const location = esParticular
          ? 'Consulta Online'
          : profile.direcciones?.[0]?.tipo || 'Consultorio';

        const nuevoTurno: Appointment = {
          id: 'apt-' + Date.now().toString(36) + Math.floor(Math.random() * 1000),
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

  /** Turnos del paciente identificado por DNI. */
  getTurnosPorDni(dni: string): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.api}/appointments?patientDni=${encodeURIComponent(dni.trim())}`);
  }

  /**
   * Reprograma un turno: nueva fecha y hora, vuelve a estado PENDING
   * para que el profesional lo re-confirme.
   */
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

  /** Cancela un turno del paciente. */
  cancelarTurno(turno: Appointment): Observable<Appointment> {
    const notaBase = (turno.notes || '').trim();
    const nota = `${notaBase} [Cancelado por el paciente]`.trim();
    return this.http.patch<Appointment>(`${this.api}/appointments/${turno.id}`, {
      status: 'CANCELLED',
      notes: nota
    });
  }

  /** Da de alta al paciente si su DNI no está registrado. */
  private ensurePatient(appt: Appointment): Observable<unknown> {
    return this.http.get<unknown[]>(`${this.api}/patients?dni=${appt.patientDni}`).pipe(
      switchMap(existentes => {
        if (existentes.length > 0) return of(null);
        return this.http.post(`${this.api}/patients`, {
          id: 'pat-' + appt.patientDni,
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
