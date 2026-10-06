import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Appointment,
  BlockedDateRange,
  BookingRequest,
  Cuenta,
  DayAvailability,
  Miembro,
  ObraSocial,
  Notificacion,
  ProfessionalAvailability,
  ProfessionalProfile,
  Service,
  TimeSlot,
  Usuario
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
        // Una cuenta suspendida se comporta como inexistente para el público.
        if (!cuenta || cuenta.estado === 'suspendida') throw new Error('Cuenta no disponible: ' + slug);
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

  /**
   * Obras sociales ACTIVAS con las que trabaja una cuenta. Si no se pueden
   * leer, devuelve una lista vacía para que la página siga funcionando
   * (el paciente igual puede reservar como particular).
   */
  getObrasSociales(cuentaId: string): Observable<ObraSocial[]> {
    return this.http.get<ObraSocial[]>(`${this.api}/obrasSociales?cuentaId=${encodeURIComponent(cuentaId)}`).pipe(
      map(list => list.filter(o => o.activo !== false).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))),
      catchError(() => of([] as ObraSocial[]))
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
          appts.filter(a => a.status !== 'CANCELLED' && a.status !== 'EXPIRED').map(a => `${a.date}|${a.time}`)
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
          switchMap(creado => this.ensurePatient(creado).pipe(map(() => creado))),
          switchMap(creado => this.avisarSolicitudNueva(creado, profesional).pipe(map(() => creado)))
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
    }).pipe(
      switchMap(act => this.notificarProfesional(act, 'reprogramado',
        `${act.patientName} (DNI ${act.patientDni}) reprogramó su turno de ${act.serviceName}: del ${turno.date} ${turno.time} hs al ${act.date} a las ${act.time} hs. Queda pendiente de confirmación.`
      ).pipe(map(() => act)))
    );
  }

  cancelarTurno(turno: Appointment): Observable<Appointment> {
    const notaBase = (turno.notes || '').trim();
    const nota = `${notaBase} [Cancelado por el paciente]`.trim();
    return this.http.patch<Appointment>(`${this.api}/appointments/${turno.id}`, {
      status: 'CANCELLED',
      notes: nota
    }).pipe(
      switchMap(act => this.notificarProfesional(act, 'cancelado',
        `${act.patientName} (DNI ${act.patientDni}) canceló su turno de ${act.serviceName} del ${act.date} a las ${act.time} hs. El horario quedó libre.`
      ).pipe(map(() => act)))
    );
  }

  /**
   * Registra el aviso de WhatsApp al PROFESIONAL cuando el paciente
   * reprograma o cancela online (MOCK: el envío real lo hace el backend).
   */
  private notificarProfesional(turno: Appointment, evento: 'reprogramado' | 'cancelado', mensaje: string): Observable<unknown> {
    return this.getProfessional(turno.profesionalId).pipe(
      switchMap(prof => {
        const aviso: Notificacion = {
          id: 'ntf-' + Date.now().toString(36) + Math.floor(Math.random() * 1000),
          cuentaId: turno.cuentaId,
          turnoId: turno.id,
          evento,
          origen: 'paciente',
          canal: 'whatsapp',
          destinatarioTipo: 'profesional',
          destinatario: prof.nombre,
          telefono: prof.whatsapp || '',
          mensaje,
          fecha: new Date().toISOString(),
          estado: 'simulada'
        };
        return this.http.post<Notificacion>(`${this.api}/notificaciones`, aviso);
      })
    );
  }

  /**
   * SOLICITUD NUEVA: registra el aviso al PROFESIONAL (WhatsApp) y a cada
   * SECRETARÍA activa que gestiona su agenda (email; una secretaría sin
   * agendas asignadas gestiona todo el centro).
   * MOCK: el cliente público lee miembros/usuarios solo para simular el
   * envío; en Laravel lo resuelve el backend al crear el turno y la página
   * pública nunca ve datos del equipo. Si el aviso falla, la reserva sigue.
   */
  private avisarSolicitudNueva(turno: Appointment, prof: ProfessionalProfile): Observable<unknown> {
    const detalle = `${turno.patientName} (DNI ${turno.patientDni}) pidió un turno de ${turno.serviceName} con ${prof.nombre} para el ${turno.date} a las ${turno.time} hs. Está pendiente de confirmación.`;
    const base = {
      cuentaId: turno.cuentaId,
      turnoId: turno.id,
      evento: 'solicitud_nueva' as const,
      origen: 'paciente' as const,
      fecha: new Date().toISOString(),
      estado: 'simulada' as const
    };
    const id = (i: number) => 'ntf-' + Date.now().toString(36) + i + Math.floor(Math.random() * 1000);

    return this.http.get<Miembro[]>(`${this.api}/miembros?cuentaId=${encodeURIComponent(turno.cuentaId)}&rol=secretaria`).pipe(
      map(miembros => miembros.filter(m =>
        m.activo !== false && (!m.profesionalesAsignados?.length || m.profesionalesAsignados.includes(turno.profesionalId)))),
      switchMap(secretarias => {
        if (!secretarias.length) return of([] as Usuario[]);
        const q = secretarias.map(m => `id=${encodeURIComponent(m.usuarioId)}`).join('&');
        return this.http.get<Usuario[]>(`${this.api}/usuarios?${q}`);
      }),
      switchMap(personas => {
        const avisos: Notificacion[] = [
          {
            ...base, id: id(0), canal: 'whatsapp', destinatarioTipo: 'profesional',
            destinatario: prof.nombre, telefono: prof.whatsapp || '',
            mensaje: `Nueva solicitud de turno: ${detalle} Confirmalo desde tu panel.`
          },
          ...personas.filter(u => u.activo !== false).map((u, i): Notificacion => ({
            ...base, id: id(i + 1), canal: 'email', destinatarioTipo: 'secretaria', usuarioId: u.id,
            destinatario: u.nombre, telefono: '', email: u.email,
            mensaje: `Nueva solicitud de turno en la agenda de ${prof.nombre}: ${detalle}`
          }))
        ];
        return forkJoin(avisos.map(a => this.http.post<Notificacion>(`${this.api}/notificaciones`, a)));
      }),
      catchError(() => of(null))
    );
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
