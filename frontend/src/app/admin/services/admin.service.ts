import { Injectable, signal } from '@angular/core';
import { Observable, of } from 'rxjs';

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

export interface AdminProfile {
  nombre: string;
  titulo: string;
  avatarUrl: string;
  frasePrincipal: string;
  biografia: string;
  modalidad: string;
  direcciones: LocationConfig[];
  areas: SpecialtyConfig[];
}

export interface AdminAppointment {
  id: string;
  serviceName: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  patientDni: string;
  date: string;
  time: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  notes?: string;
  location: string;
  healthInsurance: string;
}

export interface DayAvailability {
  day: string; // 'Lunes', 'Martes', etc.
  dayIndex: number; // 1 to 5 (or 0 to 6)
  active: boolean;
  slots: string[]; // ['08:00', '09:00', ...]
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private STORAGE_PROFILE_KEY = 'profesional_data';
  private STORAGE_APPOINTMENTS_KEY = 'appointments_data';
  private STORAGE_AVAILABILITY_KEY = 'disponibilidad_data';

  // Default Mock Profile data
  private defaultProfile: AdminProfile = {
    nombre: 'Dra. Elena Ramos',
    titulo: 'Psicología Clínica · Adultos',
    avatarUrl: 'dra-elena.jpg',
    frasePrincipal: 'Un espacio seguro para tu bienestar emocional y mental',
    biografia: 'Soy psicóloga clínica con más de 10 años de experiencia, especializada en Terapia Cognitivo-Conductual (TCC). Mi objetivo es brindarte un espacio seguro, empático y libre de prejuicios donde podamos trabajar juntos para entender tus emociones, superar de la mejor manera tus dificultades y mejorar tu calidad de vida.',
    modalidad: 'Atención presencial en Palermo y Belgrano, y consultas Online para todo el mundo.',
    direcciones: [
      {
        tipo: 'Consultorio Palermo',
        detalle: 'Atención presencial - Lun, Mié y Vie',
        direccion: 'Av. Santa Fe 3200 (a metros de Av. Coronel Díaz), Palermo, CABA',
        mapLink: 'https://maps.google.com',
        icono: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z'
      },
      {
        tipo: 'Centro Médico Belgrano',
        detalle: 'Consultas presenciales - Mar y Jue',
        direccion: 'Av. Cabildo 1500 (cerca de Estación José Hernández), Belgrano, CABA',
        mapLink: 'https://maps.google.com',
        icono: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'
      },
      {
        tipo: 'Consulta Online',
        detalle: 'Videollamadas - Flexibilidad horaria',
        direccion: 'Enlace seguro mediante Google Meet / Zoom enviado antes de la sesión',
        mapLink: '',
        icono: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z'
      }
    ],
    areas: [
      {
        nombre: 'Ansiedad y Estrés',
        descripcion: 'Herramientas prácticas para manejar la sobrecarga emocional y ataques de pánico.',
        icono: 'M13 10V3L4 14h7v7l9-11h-7z',
        detalle: 'La terapia cognitivo-conductual ofrece tasas de éxito muy altas en ansiedad. Trabajamos identificando pensamientos distorsionados y desarrollando respuestas adaptativas.'
      },
      {
        nombre: 'Desarrollo Personal',
        descripcion: 'Trabajo focalizado en la autoestima, toma de decisiones difíciles y asertividad.',
        icono: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
        detalle: 'Ideal para personas que buscan conocerse mejor, potenciar sus habilidades interpersonales o reorientar su carrera.'
      },
      {
        nombre: 'Terapia de Pareja',
        descripcion: 'Resolución de conflictos y construcción de vínculos afectivos más saludables.',
        icono: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
        detalle: 'Brindo un espacio neutral de escucha activa para identificar patrones destructivos y mejorar la empatía.'
      }
    ]
  };

  // Seed default Appointments
  private getFutureDateString(daysToAdd: number): string {
    const d = new Date();
    d.setDate(d.getDate() + daysToAdd);
    return d.toISOString().split('T')[0];
  }

  private defaultAppointments: AdminAppointment[] = [
    {
      id: 'apt-mock-1',
      serviceName: 'Consulta',
      patientName: 'Martín Spinetta',
      patientEmail: 'martin.spin@gmail.com',
      patientPhone: '1123456789',
      patientDni: '38123456',
      date: this.getFutureDateString(0), // Hoy
      time: '17:00',
      status: 'CONFIRMED',
      notes: 'Paciente indica que está con picos de estrés laboral elevados.',
      location: 'Consultorio Palermo',
      healthInsurance: 'OSDE'
    },
    {
      id: 'apt-mock-2',
      serviceName: 'Consulta',
      patientName: 'Laura Giménez',
      patientEmail: 'laurag@live.com.ar',
      patientPhone: '1198765432',
      patientDni: '35987654',
      date: this.getFutureDateString(1), // Mañana
      time: '09:00',
      status: 'PENDING',
      notes: 'Primera visita presencial. Reintegro por prepaga Swiss Medical.',
      location: 'Centro Médico Belgrano',
      healthInsurance: 'Swiss Medical'
    },
    {
      id: 'apt-mock-3',
      serviceName: 'Prescripción de Receta',
      patientName: 'Andrés Mendoza',
      patientEmail: 'andres.men@outlook.com',
      patientPhone: '1133334444',
      patientDni: '40111222',
      date: this.getFutureDateString(2), // Pasado mañana
      time: '11:00',
      status: 'CONFIRMED',
      notes: 'Sesión online rápida para renovación de orden de reintegro.',
      location: 'Consulta Online',
      healthInsurance: 'Particular (Sin cobertura)'
    }
  ];

  private STORAGE_BLOCKED_DATES_KEY = 'dias_bloqueados_data';

  // Default Availability Config
  private defaultAvailability: DayAvailability[] = [
    { day: 'Lunes', dayIndex: 1, active: true, slots: ['08:00', '09:00', '10:00', '11:00', '17:00', '18:00', '19:00', '20:00'] },
    { day: 'Martes', dayIndex: 2, active: true, slots: ['17:00', '18:00', '19:00', '20:00'] },
    { day: 'Miércoles', dayIndex: 3, active: true, slots: ['08:00', '09:00', '10:00', '11:00', '17:00', '18:00', '19:00', '20:00'] },
    { day: 'Jueves', dayIndex: 4, active: true, slots: ['17:00', '18:00', '19:00', '20:00'] },
    { day: 'Viernes', dayIndex: 5, active: true, slots: ['08:00', '09:00', '10:00', '11:00', '17:00', '18:00', '19:00', '20:00'] },
    { day: 'Sábado', dayIndex: 6, active: false, slots: [] },
    { day: 'Domingo', dayIndex: 0, active: false, slots: [] }
  ];

  // State signals
  profile = signal<AdminProfile>(this.defaultProfile);
  appointments = signal<AdminAppointment[]>(this.defaultAppointments);
  availability = signal<DayAvailability[]>(this.defaultAvailability);
  blockedDates = signal<{ id: string, startDate: string, endDate: string, reason: string }[]>([]);

  constructor() {
    this.initLocalStorageData();
  }

  private initLocalStorageData() {
    // 1. Profile
    const savedProfile = localStorage.getItem(this.STORAGE_PROFILE_KEY);
    if (savedProfile) {
      this.profile.set(JSON.parse(savedProfile));
    } else {
      this.saveProfile(this.defaultProfile);
    }

    // 2. Appointments
    const savedAppts = localStorage.getItem(this.STORAGE_APPOINTMENTS_KEY);
    if (savedAppts) {
      this.appointments.set(JSON.parse(savedAppts));
    } else {
      this.saveAppointmentsDirect(this.defaultAppointments);
    }

    // 3. Availability
    const savedAvail = localStorage.getItem(this.STORAGE_AVAILABILITY_KEY);
    if (savedAvail) {
      this.availability.set(JSON.parse(savedAvail));
    } else {
      this.saveAvailability(this.defaultAvailability);
    }

    // 4. Blocked Dates
    const savedBlocked = localStorage.getItem(this.STORAGE_BLOCKED_DATES_KEY);
    if (savedBlocked) {
      try {
        const parsed = JSON.parse(savedBlocked);
        // Validar si es formato antiguo (array de {date, reason} en vez de {id, startDate, endDate, reason})
        if (Array.isArray(parsed) && parsed.length > 0 && !parsed[0].startDate) {
          localStorage.removeItem(this.STORAGE_BLOCKED_DATES_KEY);
          this.blockedDates.set([]);
        } else {
          this.blockedDates.set(parsed);
        }
      } catch {
        this.blockedDates.set([]);
      }
    } else {
      this.saveBlockedDatesDirect([]);
    }
  }

  // Profile Methods
  saveProfile(profileData: AdminProfile) {
    localStorage.setItem(this.STORAGE_PROFILE_KEY, JSON.stringify(profileData));
    this.profile.set(profileData);
  }

  // Appointments Methods
  private saveAppointmentsDirect(list: AdminAppointment[]) {
    localStorage.setItem(this.STORAGE_APPOINTMENTS_KEY, JSON.stringify(list));
    this.appointments.set(list);
  }

  addAppointment(appt: AdminAppointment) {
    const current = this.appointments();
    const updated = [...current, appt];
    this.saveAppointmentsDirect(updated);
  }

  updateAppointmentStatus(id: string, status: 'PENDING' | 'CONFIRMED' | 'CANCELLED') {
    const updated = this.appointments().map(a => a.id === id ? { ...a, status } : a);
    this.saveAppointmentsDirect(updated);
  }

  // Availability Methods
  saveAvailability(availData: DayAvailability[]) {
    localStorage.setItem(this.STORAGE_AVAILABILITY_KEY, JSON.stringify(availData));
    this.availability.set(availData);
  }

  // Blocked Dates Methods
  private saveBlockedDatesDirect(list: { id: string, startDate: string, endDate: string, reason: string }[]) {
    localStorage.setItem(this.STORAGE_BLOCKED_DATES_KEY, JSON.stringify(list));
    this.blockedDates.set(list);
  }

  blockDateRange(startDate: string, endDate: string, reason: string) {
    const current = this.blockedDates();
    // Evitar rangos duplicados exactos
    if (current.some(d => d.startDate === startDate && d.endDate === endDate)) return;
    
    const newBlock = {
      id: 'blk-' + Math.floor(Math.random() * 1000000),
      startDate,
      endDate: endDate || startDate, // Si es un solo día, endDate es igual a startDate
      reason
    };
    
    const updated = [...current, newBlock].sort((a, b) => a.startDate.localeCompare(b.startDate));
    this.saveBlockedDatesDirect(updated);
  }

  unblockDateRange(id: string) {
    const updated = this.blockedDates().filter(d => d.id !== id);
    this.saveBlockedDatesDirect(updated);
  }
}
