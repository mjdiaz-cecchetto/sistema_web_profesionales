import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  Appointment,
  AppointmentStatus,
  BlockedDateRange,
  DayAvailability,
  Patient,
  ProfessionalProfile,
  Service,
  HealthInsurance
} from '../../core/models';

// Re-export para mantener compatibilidad con los imports existentes de los componentes.
export type {
  Appointment as AdminAppointment,
  ProfessionalProfile as AdminProfile,
  BlockedDateRange,
  DayAvailability,
  Patient
};
export type { LocationConfig, SpecialtyConfig } from '../../core/models';

/**
 * Servicio del panel de administración.
 * Persiste todo contra la API local (json-server en localhost:3000).
 * Ejecutar `npm run api` para levantar la base de datos simulada.
 */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  // ---- Estado reactivo ----
  profile = signal<ProfessionalProfile | null>(null);
  appointments = signal<Appointment[]>([]);
  availability = signal<DayAvailability[]>([]);
  blockedDates = signal<BlockedDateRange[]>([]);
  patients = signal<Patient[]>([]);
  services = signal<Service[]>([]);
  healthInsurances = signal<string[]>([]);

  loading = signal<boolean>(true);
  /** true si la API local no responde (ej. falta ejecutar `npm run api`). */
  apiError = signal<boolean>(false);
  /** true mientras hay una escritura en curso. */
  saving = signal<boolean>(false);

  constructor() {
    this.loadAll();
  }

  /** Carga (o recarga) todos los datos del panel. */
  loadAll(): void {
    this.loading.set(true);
    this.apiError.set(false);

    let pendientes = 7;
    const done = () => { if (--pendientes === 0) this.loading.set(false); };
    const fail = () => { this.apiError.set(true); done(); };

    this.http.get<ProfessionalProfile>(`${this.api}/profile`).subscribe({
      next: p => { this.profile.set(p); done(); },
      error: fail
    });
    this.http.get<Appointment[]>(`${this.api}/appointments`).subscribe({
      next: list => { this.appointments.set(list); done(); },
      error: fail
    });
    this.http.get<{ days: DayAvailability[] }>(`${this.api}/availability`).subscribe({
      next: a => { this.availability.set(a.days ?? []); done(); },
      error: fail
    });
    this.http.get<BlockedDateRange[]>(`${this.api}/blockedDates`).subscribe({
      next: list => { this.blockedDates.set(list); done(); },
      error: fail
    });
    this.http.get<Patient[]>(`${this.api}/patients`).subscribe({
      next: list => { this.patients.set(list); done(); },
      error: fail
    });
    this.http.get<Service[]>(`${this.api}/services`).subscribe({
      next: list => { this.services.set(list); done(); },
      error: fail
    });
    this.http.get<HealthInsurance[]>(`${this.api}/healthInsurances`).subscribe({
      next: list => { this.healthInsurances.set(list.map(h => h.name)); done(); },
      error: fail
    });
  }

  // ---- Perfil ----
  saveProfile(profileData: ProfessionalProfile): void {
    this.saving.set(true);
    this.http.put<ProfessionalProfile>(`${this.api}/profile`, profileData).subscribe({
      next: p => { this.profile.set(p); this.saving.set(false); },
      error: () => { this.apiError.set(true); this.saving.set(false); }
    });
  }

  // ---- Turnos ----
  /**
   * Crea uno o varios turnos (series repetidas) contra la API
   * y actualiza el estado local al confirmarse cada alta.
   * Devuelve una promesa con la cantidad creada, para que la UI reaccione.
   */
  addAppointments(nuevos: Omit<Appointment, 'id'>[]): Promise<number> {
    if (nuevos.length === 0) return Promise.resolve(0);
    this.saving.set(true);

    const posts = nuevos.map((a, i) => {
      const conId: Appointment = {
        ...a,
        id: 'apt-' + Date.now().toString(36) + '-' + i + '-' + Math.floor(Math.random() * 1000)
      };
      return new Promise<Appointment | null>(resolve => {
        this.http.post<Appointment>(`${this.api}/appointments`, conId).subscribe({
          next: creado => resolve(creado),
          error: () => { this.apiError.set(true); resolve(null); }
        });
      });
    });

    return Promise.all(posts).then(resultados => {
      const creados = resultados.filter((r): r is Appointment => r !== null);
      if (creados.length > 0) {
        this.appointments.set([...this.appointments(), ...creados]);
      }
      this.saving.set(false);
      return creados.length;
    });
  }

  /** Modifica un turno existente (edición completa) y actualiza el estado local. */
  updateAppointment(id: string, datos: Partial<Appointment>): Promise<boolean> {
    this.saving.set(true);
    return new Promise(resolve => {
      this.http.patch<Appointment>(`${this.api}/appointments/${id}`, datos).subscribe({
        next: actualizado => {
          this.appointments.set(this.appointments().map(a => (a.id === id ? actualizado : a)));
          this.saving.set(false);
          resolve(true);
        },
        error: () => {
          this.apiError.set(true);
          this.saving.set(false);
          resolve(false);
        }
      });
    });
  }

  updateAppointmentStatus(id: string, status: AppointmentStatus): void {
    // Actualización optimista + persistencia en la API
    const previo = this.appointments();
    this.appointments.set(previo.map(a => (a.id === id ? { ...a, status } : a)));

    this.http.patch<Appointment>(`${this.api}/appointments/${id}`, { status }).subscribe({
      error: () => { this.appointments.set(previo); this.apiError.set(true); }
    });
  }

  // ---- Pacientes ----
  /** Da de alta un paciente y actualiza el estado local. */
  addPatient(datos: Omit<Patient, 'id'>): Promise<Patient | null> {
    this.saving.set(true);
    const nuevo: Patient = { ...datos, id: 'pat-' + datos.dni };
    return new Promise(resolve => {
      this.http.post<Patient>(`${this.api}/patients`, nuevo).subscribe({
        next: creado => {
          this.patients.set([...this.patients(), creado]);
          this.saving.set(false);
          resolve(creado);
        },
        error: () => { this.apiError.set(true); this.saving.set(false); resolve(null); }
      });
    });
  }

  /** Modifica un paciente existente y actualiza el estado local. */
  updatePatient(id: string, datos: Partial<Patient>): Promise<boolean> {
    this.saving.set(true);
    return new Promise(resolve => {
      this.http.patch<Patient>(`${this.api}/patients/${id}`, datos).subscribe({
        next: actualizado => {
          this.patients.set(this.patients().map(p => (p.id === id ? actualizado : p)));
          this.saving.set(false);
          resolve(true);
        },
        error: () => { this.apiError.set(true); this.saving.set(false); resolve(false); }
      });
    });
  }

  // ---- Servicios ----
  /** Da de alta un servicio. */
  addService(datos: Omit<Service, 'id'>): Promise<Service | null> {
    this.saving.set(true);
    const nuevo: Service = { ...datos, id: 'srv-' + Date.now().toString(36) };
    return new Promise(resolve => {
      this.http.post<Service>(`${this.api}/services`, nuevo).subscribe({
        next: creado => {
          this.services.set([...this.services(), creado]);
          this.saving.set(false);
          resolve(creado);
        },
        error: () => { this.apiError.set(true); this.saving.set(false); resolve(null); }
      });
    });
  }

  /** Modifica un servicio (incluye activar/desactivar). */
  updateService(id: string, datos: Partial<Service>): Promise<boolean> {
    this.saving.set(true);
    return new Promise(resolve => {
      this.http.patch<Service>(`${this.api}/services/${id}`, datos).subscribe({
        next: actualizado => {
          this.services.set(this.services().map(s => (s.id === id ? actualizado : s)));
          this.saving.set(false);
          resolve(true);
        },
        error: () => { this.apiError.set(true); this.saving.set(false); resolve(false); }
      });
    });
  }

  /** Elimina un servicio definitivamente (los turnos ya creados conservan su nombre). */
  deleteService(id: string): Promise<boolean> {
    this.saving.set(true);
    return new Promise(resolve => {
      this.http.delete(`${this.api}/services/${id}`).subscribe({
        next: () => {
          this.services.set(this.services().filter(s => s.id !== id));
          this.saving.set(false);
          resolve(true);
        },
        error: () => { this.apiError.set(true); this.saving.set(false); resolve(false); }
      });
    });
  }

  // ---- Disponibilidad semanal ----
  saveAvailability(days: DayAvailability[]): void {
    this.saving.set(true);
    this.http.put<{ days: DayAvailability[] }>(`${this.api}/availability`, { days }).subscribe({
      next: a => { this.availability.set(a.days ?? days); this.saving.set(false); },
      error: () => { this.apiError.set(true); this.saving.set(false); }
    });
  }

  // ---- Bloqueo de fechas ----
  blockDateRange(startDate: string, endDate: string, reason: string): void {
    const actuales = this.blockedDates();
    if (actuales.some(d => d.startDate === startDate && d.endDate === endDate)) return;

    const nuevo: BlockedDateRange = {
      id: 'blk-' + Date.now().toString(36) + Math.floor(Math.random() * 1000),
      startDate,
      endDate: endDate || startDate,
      reason
    };

    this.http.post<BlockedDateRange>(`${this.api}/blockedDates`, nuevo).subscribe({
      next: creado => {
        const lista = [...this.blockedDates(), creado].sort((a, b) => a.startDate.localeCompare(b.startDate));
        this.blockedDates.set(lista);
      },
      error: () => this.apiError.set(true)
    });
  }

  unblockDateRange(id: string): void {
    const previo = this.blockedDates();
    this.blockedDates.set(previo.filter(d => d.id !== id));
    this.http.delete(`${this.api}/blockedDates/${id}`).subscribe({
      error: () => { this.blockedDates.set(previo); this.apiError.set(true); }
    });
  }
}
