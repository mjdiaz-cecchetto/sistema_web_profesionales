import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { Professional, Service, TimeSlot, Appointment } from '../interfaces/client.models';

@Injectable({
  providedIn: 'root'
})
export class ClientService {
  private STORAGE_PROFILE_KEY = 'profesional_data';
  private STORAGE_APPOINTMENTS_KEY = 'appointments_data';
  private STORAGE_AVAILABILITY_KEY = 'disponibilidad_data';

  // Default Fallbacks
  private fallbackProfessional: Professional = {
    id: 'prof-1',
    name: 'Dra. Elena Ramos',
    title: 'Psicóloga Clínica',
    bio: 'Especialista en terapia cognitivo-conductual con más de 10 años de experiencia acompañando procesos de ansiedad, estrés y desarrollo personal.',
    avatarUrl: 'dra-elena.jpg',
    specialties: ['Ansiedad', 'Gestión del Estrés', 'Terapia de Pareja']
  };

  private mockServices: Service[] = [
    {
      id: 'srv-1',
      name: 'Consulta',
      description: 'Consulta general de psicología, ya sea primera vez o de seguimiento.',
      durationMinutes: 60,
      price: 50
    },
    {
      id: 'srv-2',
      name: 'Prescripción de Receta',
      description: 'Sesión breve orientada a la evaluación y prescripción de medicación.',
      durationMinutes: 30,
      price: 30
    }
  ];

  private mockHealthInsurances: string[] = [
    'Particular (Sin cobertura)',
    'OSDE',
    'Swiss Medical',
    'Galeno',
    'Sancor Salud',
    'Medifé',
    'IOMA'
  ];

  constructor() { }

  private getLocalStorageProfile(): Professional {
    const raw = localStorage.getItem(this.STORAGE_PROFILE_KEY);
    if (!raw) return this.fallbackProfessional;
    try {
      const parsed = JSON.parse(raw);
      return {
        id: 'prof-1',
        name: parsed.nombre || this.fallbackProfessional.name,
        title: parsed.titulo || this.fallbackProfessional.title,
        bio: parsed.biografia || this.fallbackProfessional.bio,
        avatarUrl: parsed.avatarUrl || this.fallbackProfessional.avatarUrl,
        specialties: (parsed.areas || []).map((a: any) => a.nombre)
      };
    } catch {
      return this.fallbackProfessional;
    }
  }

  // Helpers para generar fechas futuras
  private getFutureDate(daysToAdd: number): string {
    const date = new Date();
    date.setDate(date.getDate() + daysToAdd);
    return date.toISOString().split('T')[0];
  }

  // Generador dinámico de turnos leyendo de la disponibilidad del admin en localStorage
  private generateMockTimeSlots(): TimeSlot[] {
    const slots: TimeSlot[] = [];
    let idCounter = 1;

    // Obtener la disponibilidad de localStorage
    const rawAvail = localStorage.getItem(this.STORAGE_AVAILABILITY_KEY);
    let availConfig = [];
    if (rawAvail) {
      availConfig = JSON.parse(rawAvail);
    }

    // Obtener turnos ya agendados en localStorage para no mostrarlos como disponibles
    const rawAppts = localStorage.getItem(this.STORAGE_APPOINTMENTS_KEY);
    let reservedSlots: { date: string, time: string }[] = [];
    if (rawAppts) {
      reservedSlots = JSON.parse(rawAppts).map((a: any) => ({ date: a.date, time: a.time }));
    }

    // Obtener días bloqueados (excepciones de agenda)
    const rawBlocked = localStorage.getItem('dias_bloqueados_data');
    let blockedRanges: { startDate: string, endDate: string }[] = [];
    if (rawBlocked) {
      blockedRanges = JSON.parse(rawBlocked);
    }
    
    // Generar para los próximos 14 días
    for (let day = 1; day <= 14; day++) {
      const date = this.getFutureDate(day);

      // Si la fecha está dentro de algún rango bloqueado, omitir por completo
      const isBlocked = blockedRanges.some(r => r.startDate <= date && date <= r.endDate);
      if (isBlocked) continue;

      const d = new Date(date + 'T00:00:00');
      const dayOfWeek = d.getDay(); // 0 = Domingo, 1 = Lunes, etc.

      // Buscar configuración para este día de la semana
      const configForDay = availConfig.find((c: any) => c.dayIndex === dayOfWeek);

      // Si el día no está configurado o no está activo, omitir
      if (!configForDay || !configForDay.active) continue;

      // Generar slots basados en la configuración del admin
      for (const time of configForDay.slots) {
        // Verificar si este turno ya está reservado por un paciente
        const isReserved = reservedSlots.some(r => r.date === date && r.time === time);

        if (!isReserved) {
          slots.push({
            id: `ts-${idCounter++}`,
            date: date,
            startTime: time,
            endTime: this.calculateEndTime(time),
            isAvailable: true
          });
        }
      }
    }
    return slots;
  }

  private calculateEndTime(startTime: string): string {
    const parts = startTime.split(':');
    const hours = parseInt(parts[0]);
    const minutes = parseInt(parts[1]);
    const d = new Date();
    d.setHours(hours);
    d.setMinutes(minutes + 60); // Asumimos turnos de 60 minutos por defecto
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }

  // Métodos
  getProfessionalInfo(): Observable<Professional> {
    return of(this.getLocalStorageProfile()).pipe(delay(200));
  }

  getHealthInsurances(): Observable<string[]> {
    return of(this.mockHealthInsurances).pipe(delay(100));
  }

  getServices(): Observable<Service[]> {
    return of(this.mockServices).pipe(delay(200));
  }

  getAvailableTimeSlots(serviceId: string, dateStart?: string, dateEnd?: string): Observable<TimeSlot[]> {
    const available = this.generateMockTimeSlots();
    return of(available).pipe(delay(300));
  }

  createAppointment(appointmentData: Appointment): Observable<Appointment> {
    const newAppointment: Appointment = {
      ...appointmentData,
      id: 'apt-' + Math.floor(Math.random() * 10000),
      status: 'CONFIRMED'
    };

    // Registrar en localStorage para que el admin lo vea en su agenda
    const rawAppts = localStorage.getItem(this.STORAGE_APPOINTMENTS_KEY);
    let apptList = [];
    if (rawAppts) {
      apptList = JSON.parse(rawAppts);
    }

    // Adaptar al formato de AdminAppointment
    const mappedService = this.mockServices.find(s => s.id === appointmentData.serviceId);
    
    // Buscar la dirección correspondiente en el profesional
    const rawProf = localStorage.getItem(this.STORAGE_PROFILE_KEY);
    let locationName = 'Consulta Online';
    if (rawProf) {
      const prof = JSON.parse(rawProf);
      // Usar Palermo por defecto para presencial o asignar según mock
      if (appointmentData.patientData.healthInsurance !== 'Particular (Sin cobertura)') {
        locationName = prof.direcciones[0]?.tipo || 'Consultorio Palermo';
      }
    }

    const adminAppt = {
      id: newAppointment.id,
      serviceName: mappedService?.name || 'Consulta',
      patientName: `${appointmentData.patientData.firstName} ${appointmentData.patientData.lastName}`,
      patientEmail: appointmentData.patientData.email,
      patientPhone: appointmentData.patientData.phone,
      patientDni: (appointmentData.patientData as any).dni || 'S/D', // Capturar DNI
      date: appointmentData.date,
      time: appointmentData.time,
      status: 'CONFIRMED',
      notes: appointmentData.patientData.notes || '',
      location: locationName,
      healthInsurance: appointmentData.patientData.healthInsurance
    };

    apptList.push(adminAppt);
    localStorage.setItem(this.STORAGE_APPOINTMENTS_KEY, JSON.stringify(apptList));

    return of(newAppointment).pipe(delay(400));
  }
}
