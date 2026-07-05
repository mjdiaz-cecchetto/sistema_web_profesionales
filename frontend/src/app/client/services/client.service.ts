import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { Professional, Service, TimeSlot, Appointment } from '../interfaces/client.models';

@Injectable({
  providedIn: 'root'
})
export class ClientService {

  // Mocks
  private mockProfessional: Professional = {
    id: 'prof-1',
    name: 'Dra. Elena Ramos',
    title: 'Psicóloga Clínica',
    bio: 'Especialista en terapia cognitivo-conductual con más de 10 años de experiencia acompañando procesos de ansiedad, estrés y desarrollo personal.',
    avatarUrl: 'assets/images/dra-elena.jpg', // Asumimos que esta imagen existe o usaremos placeholder
    specialties: ['Ansiedad', 'Gestión del Estrés', 'Terapia de Pareja']
  };

  private mockServices: Service[] = [
    {
      id: 'srv-1',
      name: 'Consulta',
      description: 'Consulta general de psicología, ya sea primera vez o seguimiento.',
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

  // Helpers para generar fechas futuras en los mocks
  private getFutureDate(daysToAdd: number): string {
    const date = new Date();
    date.setDate(date.getDate() + daysToAdd);
    return date.toISOString().split('T')[0];
  }

  // Generador dinámico de turnos
  private generateMockTimeSlots(): TimeSlot[] {
    const slots: TimeSlot[] = [];
    let idCounter = 1;
    
    // Generar para los próximos 7 días
    for (let day = 1; day <= 7; day++) {
      const date = this.getFutureDate(day);
      const dayOfWeek = new Date(date + 'T00:00:00').getDay();
      
      // Omitir domingos por ejemplo
      if (dayOfWeek === 0) continue;

      // Turnos mañana: 8:00 a 12:00 (cada hora)
      for (let hour = 8; hour < 12; hour++) {
        slots.push({
          id: `ts-${idCounter++}`,
          date: date,
          startTime: `${hour.toString().padStart(2, '0')}:00`,
          endTime: `${(hour + 1).toString().padStart(2, '0')}:00`,
          isAvailable: Math.random() > 0.3 // 70% disponibilidad
        });
      }

      // Turnos tarde: 17:00 a 21:00 (cada hora)
      for (let hour = 17; hour < 21; hour++) {
        slots.push({
          id: `ts-${idCounter++}`,
          date: date,
          startTime: `${hour.toString().padStart(2, '0')}:00`,
          endTime: `${(hour + 1).toString().padStart(2, '0')}:00`,
          isAvailable: Math.random() > 0.3
        });
      }
    }
    return slots;
  }

  // Métodos
  getProfessionalInfo(): Observable<Professional> {
    return of(this.mockProfessional).pipe(delay(500)); // Simulando latencia de red
  }

  getHealthInsurances(): Observable<string[]> {
    return of(this.mockHealthInsurances).pipe(delay(200));
  }

  getServices(): Observable<Service[]> {
    return of(this.mockServices).pipe(delay(600));
  }

  getAvailableTimeSlots(serviceId: string, dateStart?: string, dateEnd?: string): Observable<TimeSlot[]> {
    // En un escenario real, filtraríamos por serviceId (duración) y fechas.
    const allSlots = this.generateMockTimeSlots();
    const available = allSlots.filter(t => t.isAvailable);
    return of(available).pipe(delay(800));
  }

  createAppointment(appointmentData: Appointment): Observable<Appointment> {
    const newAppointment: Appointment = {
      ...appointmentData,
      id: 'apt-' + Math.floor(Math.random() * 10000),
      status: 'CONFIRMED'
    };
    return of(newAppointment).pipe(delay(1000));
  }
}
