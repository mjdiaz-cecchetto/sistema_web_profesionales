import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth.service';
import {
  Appointment,
  AppointmentStatus,
  BlockedDateRange,
  Cuenta,
  DayAvailability,
  Patient,
  ProfessionalAvailability,
  ProfessionalProfile,
  Service,
  HealthInsurance
} from '../../core/models';

// Re-export para mantener compatibilidad con los imports existentes de los componentes.
export type {
  Appointment as AdminAppointment,
  ProfessionalProfile as AdminProfile,
  BlockedDateRange,
  Cuenta,
  DayAvailability,
  Patient
};
export type { LocationConfig, SpecialtyConfig } from '../../core/models';

/**
 * Servicio del panel de administración, atado a la CUENTA logueada.
 * Una cuenta puede ser un CONSULTORIO (varios profesionales) o un
 * PROFESIONAL independiente; todos los datos se cargan y se crean
 * filtrados por cuentaId. `seleccionId` es el selector global:
 * 'ALL' para la vista combinada, o el id de un profesional.
 * Persiste todo contra la API local (json-server en localhost:3000).
 */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private api = environment.apiUrl;

  // ---- Estado reactivo ----
  /** Cuenta logueada (el "tenant" del panel). */
  cuenta = this.auth.cuenta;
  professionals = signal<ProfessionalProfile[]>([]);
  private disponibilidades = signal<Record<string, DayAvailability[]>>({});
  appointments = signal<Appointment[]>([]);
  blockedDates = signal<BlockedDateRange[]>([]);
  patients = signal<Patient[]>([]);
  services = signal<Service[]>([]);
  healthInsurances = signal<string[]>([]);

  /** Selector global del panel: 'ALL' (todos) o el id de un profesional. */
  seleccionId = signal<string>('ALL');

  loading = signal<boolean>(true);
  apiError = signal<boolean>(false);
  saving = signal<boolean>(false);

  // ---- Derivados multi-profesional ----
  profesionalesActivos = computed(() => this.professionals().filter(p => p.activo !== false));

  /** true cuando la cuenta logueada es un consultorio. */
  esConsultorio = computed(() => this.cuenta()?.tipo === 'consultorio');

  /** Profesional "en foco" para las vistas de configuración (si la selección es ALL, el primero activo). */
  focoId = computed(() => {
    const sel = this.seleccionId();
    if (sel !== 'ALL' && this.professionals().some(p => p.id === sel)) return sel;
    return this.profesionalesActivos()[0]?.id ?? this.professionals()[0]?.id ?? '';
  });

  /** Perfil del profesional en foco (compatibilidad con las vistas existentes). */
  profile = computed<ProfessionalProfile | null>(() =>
    this.professionals().find(p => p.id === this.focoId()) ?? null
  );

  /** Disponibilidad del profesional en foco. */
  availability = computed<DayAvailability[]>(() => this.disponibilidades()[this.focoId()] ?? []);

  /** Turnos visibles según el selector global. */
  turnosVisibles = computed(() => {
    const sel = this.seleccionId();
    const list = this.appointments();
    return sel === 'ALL' ? list : list.filter(a => a.profesionalId === sel);
  });

  /** Servicios del profesional en foco. */
  serviciosDelFoco = computed(() => this.services().filter(s => s.profesionalId === this.focoId()));

  /** Bloqueos del profesional en foco. */
  bloqueosDelFoco = computed(() => this.blockedDates().filter(b => b.profesionalId === this.focoId()));

  /** Última cuenta cargada, para recargar al cambiar de sesión. */
  private cuentaCargada = '';

  constructor() {
    // Carga (y recarga) los datos cuando hay cuenta logueada.
    effect(() => {
      const c = this.cuenta();
      if (c && c.id !== this.cuentaCargada) {
        this.cuentaCargada = c.id;
        this.seleccionId.set('ALL');
        this.loadAll();
      }
      if (!c) this.cuentaCargada = '';
    });
  }

  // ---- Helpers ----
  profesionalPorId(id: string): ProfessionalProfile | undefined {
    return this.professionals().find(p => p.id === id);
  }

  nombreDe(id: string): string {
    return this.profesionalPorId(id)?.nombre ?? '';
  }

  availabilityDe(profId: string): DayAvailability[] {
    return this.disponibilidades()[profId] ?? [];
  }

  serviciosDe(profId: string): Service[] {
    return this.services().filter(s => s.profesionalId === profId);
  }

  bloqueosDe(profId: string): BlockedDateRange[] {
    return this.blockedDates().filter(b => b.profesionalId === profId);
  }

  /** Carga (o recarga) todos los datos de la cuenta logueada. */
  loadAll(): void {
    const cuentaId = this.cuenta()?.id;
    if (!cuentaId) return;
    const q = `cuentaId=${encodeURIComponent(cuentaId)}`;

    this.loading.set(true);
    this.apiError.set(false);

    let pendientes = 7;
    const done = () => { if (--pendientes === 0) this.loading.set(false); };
    const fail = () => { this.apiError.set(true); done(); };

    this.http.get<ProfessionalProfile[]>(`${this.api}/professionals?${q}`).subscribe({
      next: list => { this.professionals.set(list); done(); },
      error: fail
    });
    this.http.get<ProfessionalAvailability[]>(`${this.api}/availabilities?${q}`).subscribe({
      next: list => {
        const mapa: Record<string, DayAvailability[]> = {};
        for (const a of list) mapa[a.id] = a.days ?? [];
        this.disponibilidades.set(mapa);
        done();
      },
      error: fail
    });
    this.http.get<Appointment[]>(`${this.api}/appointments?${q}`).subscribe({
      next: list => { this.appointments.set(list); done(); },
      error: fail
    });
    this.http.get<BlockedDateRange[]>(`${this.api}/blockedDates?${q}`).subscribe({
      next: list => { this.blockedDates.set(list); done(); },
      error: fail
    });
    this.http.get<Patient[]>(`${this.api}/patients?${q}`).subscribe({
      next: list => { this.patients.set(list); done(); },
      error: fail
    });
    this.http.get<Service[]>(`${this.api}/services?${q}`).subscribe({
      next: list => { this.services.set(list); done(); },
      error: fail
    });
    this.http.get<HealthInsurance[]>(`${this.api}/healthInsurances`).subscribe({
      next: list => { this.healthInsurances.set(list.map(h => h.name)); done(); },
      error: fail
    });
  }

  // ---- Datos de la cuenta (nombre público, descripción) ----
  updateCuenta(datos: Partial<Pick<Cuenta, 'nombre' | 'descripcion' | 'bannerUrl'>>): Promise<boolean> {
    const id = this.cuenta()?.id;
    if (!id) return Promise.resolve(false);
    this.saving.set(true);
    return new Promise(resolve => {
      this.http.patch<Cuenta>(`${this.api}/cuentas/${id}`, datos).subscribe({
        next: c => { this.auth.cuenta.set(c); this.saving.set(false); resolve(true); },
        error: () => { this.apiError.set(true); this.saving.set(false); resolve(false); }
      });
    });
  }

  // ---- Profesionales ----
  /** Da de alta un profesional con su disponibilidad vacía. */
  addProfessional(datos: { nombre: string; titulo: string; especialidad: string; whatsapp?: string }): Promise<ProfessionalProfile | null> {
    const cuentaId = this.cuenta()?.id ?? '';
    this.saving.set(true);
    const id = 'prof-' + Date.now().toString(36);
    const nuevo: ProfessionalProfile = {
      id,
      cuentaId,
      activo: true,
      especialidad: datos.especialidad,
      nombre: datos.nombre,
      titulo: datos.titulo,
      whatsapp: datos.whatsapp || '',
      avatarUrl: '',
      bannerUrl: '',
      frasePrincipal: '',
      biografia: '',
      modalidad: '',
      direcciones: [],
      areas: []
    };
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const disponibilidadVacia: ProfessionalAvailability = {
      id,
      cuentaId,
      days: [1, 2, 3, 4, 5, 6, 0].map(idx => ({ day: dias[idx], dayIndex: idx, active: false, slots: [] }))
    };

    return new Promise(resolve => {
      this.http.post<ProfessionalProfile>(`${this.api}/professionals`, nuevo).subscribe({
        next: creado => {
          this.http.post<ProfessionalAvailability>(`${this.api}/availabilities`, disponibilidadVacia).subscribe({
            next: () => {
              this.professionals.set([...this.professionals(), creado]);
              this.disponibilidades.set({ ...this.disponibilidades(), [id]: disponibilidadVacia.days });
              this.saving.set(false);
              resolve(creado);
            },
            error: () => { this.apiError.set(true); this.saving.set(false); resolve(null); }
          });
        },
        error: () => { this.apiError.set(true); this.saving.set(false); resolve(null); }
      });
    });
  }

  updateProfessional(id: string, datos: Partial<ProfessionalProfile>): Promise<boolean> {
    this.saving.set(true);
    return new Promise(resolve => {
      this.http.patch<ProfessionalProfile>(`${this.api}/professionals/${id}`, datos).subscribe({
        next: actualizado => {
          this.professionals.set(this.professionals().map(p => (p.id === id ? actualizado : p)));
          this.saving.set(false);
          resolve(true);
        },
        error: () => { this.apiError.set(true); this.saving.set(false); resolve(false); }
      });
    });
  }

  // ---- Perfil (del profesional en foco) ----
  saveProfile(profileData: Partial<ProfessionalProfile>): void {
    const id = this.focoId();
    if (!id) return;
    this.saving.set(true);
    this.http.patch<ProfessionalProfile>(`${this.api}/professionals/${id}`, profileData).subscribe({
      next: p => {
        this.professionals.set(this.professionals().map(x => (x.id === id ? p : x)));
        this.saving.set(false);
      },
      error: () => { this.apiError.set(true); this.saving.set(false); }
    });
  }

  // ---- Turnos ----
  addAppointments(nuevos: Omit<Appointment, 'id' | 'cuentaId'>[]): Promise<number> {
    if (nuevos.length === 0) return Promise.resolve(0);
    this.saving.set(true);

    const cuentaId = this.cuenta()?.id ?? '';
    const posts = nuevos.map((a, i) => {
      const conId: Appointment = {
        ...a,
        cuentaId,
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
    const previo = this.appointments();
    this.appointments.set(previo.map(a => (a.id === id ? { ...a, status } : a)));

    this.http.patch<Appointment>(`${this.api}/appointments/${id}`, { status }).subscribe({
      error: () => { this.appointments.set(previo); this.apiError.set(true); }
    });
  }

  // ---- Pacientes (padrón compartido de la cuenta) ----
  addPatient(datos: Omit<Patient, 'id' | 'cuentaId'>): Promise<Patient | null> {
    const cuentaId = this.cuenta()?.id ?? '';
    this.saving.set(true);
    const nuevo: Patient = { ...datos, cuentaId, id: 'pat-' + cuentaId + '-' + datos.dni };
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

  // ---- Servicios (del profesional en foco, salvo que se indique otro) ----
  addService(datos: Omit<Service, 'id' | 'profesionalId' | 'cuentaId'>, profesionalId?: string): Promise<Service | null> {
    const profId = profesionalId ?? this.focoId();
    const cuentaId = this.cuenta()?.id ?? '';
    this.saving.set(true);
    const nuevo: Service = { ...datos, cuentaId, profesionalId: profId, id: 'srv-' + Date.now().toString(36) };
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

  // ---- Disponibilidad semanal (del profesional en foco) ----
  saveAvailability(days: DayAvailability[]): void {
    const id = this.focoId();
    if (!id) return;
    this.saving.set(true);
    const cuentaId = this.cuenta()?.id ?? '';
    this.http.put<ProfessionalAvailability>(`${this.api}/availabilities/${id}`, { id, cuentaId, days }).subscribe({
      next: a => {
        this.disponibilidades.set({ ...this.disponibilidades(), [id]: a.days ?? days });
        this.saving.set(false);
      },
      error: () => { this.apiError.set(true); this.saving.set(false); }
    });
  }

  // ---- Bloqueo de fechas (del profesional en foco) ----
  blockDateRange(startDate: string, endDate: string, reason: string): void {
    const profId = this.focoId();
    const actuales = this.bloqueosDe(profId);
    if (actuales.some(d => d.startDate === startDate && d.endDate === endDate)) return;

    const nuevo: BlockedDateRange = {
      id: 'blk-' + Date.now().toString(36) + Math.floor(Math.random() * 1000),
      cuentaId: this.cuenta()?.id ?? '',
      profesionalId: profId,
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
