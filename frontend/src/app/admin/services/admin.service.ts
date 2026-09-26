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
  Especialidad,
  HistoriaClinicaEntry,
  Notificacion,
  Patient,
  Plan,
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
  Especialidad,
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
  /** Catálogo de especialidades de la cuenta (administrable en Mi Equipo). */
  especialidades = signal<Especialidad[]>([]);
  /** Plan de membresía de la cuenta (para aplicar sus límites). */
  plan = signal<Plan | null>(null);
  /** Historias clínicas de la cuenta (se exponen filtradas por profesional tratante). */
  private historias = signal<HistoriaClinicaEntry[]>([]);
  /** Avisos de WhatsApp registrados (mock: el backend hará el envío real). */
  notificaciones = signal<Notificacion[]>([]);

  /** Selector global del panel: 'ALL' (todos) o el id de un profesional. */
  seleccionId = signal<string>('ALL');

  loading = signal<boolean>(true);
  apiError = signal<boolean>(false);
  saving = signal<boolean>(false);

  // ---- Rol de quien está logueado ----
  rol = this.auth.rol;
  esAdministrador = this.auth.esAdministrador;
  esSecretaria = this.auth.esSecretaria;
  esProfesionalRol = this.auth.esProfesionalRol;

  // ---- Derivados multi-profesional ----
  profesionalesActivos = computed(() => this.professionals().filter(p => p.activo !== false));

  /** true cuando la cuenta logueada es un consultorio. */
  esConsultorio = computed(() => this.cuenta()?.tipo === 'consultorio');

  /**
   * Alcance de una SECRETARÍA ASIGNADA: set de ids de profesionales cuyas
   * agendas gestiona, o null si no hay restricción (administrador, secretaría
   * general del centro, o rol profesional que ya tiene su propio scoping).
   */
  alcanceSecretaria = computed<Set<string> | null>(() => {
    const m = this.auth.miembro();
    if (!m || m.rol !== 'secretaria' || !m.profesionalesAsignados?.length) return null;
    return new Set(m.profesionalesAsignados);
  });

  /** Profesionales que quien está logueado puede operar (selector, alta de turnos). */
  profesionalesOperables = computed(() => {
    const propio = this.auth.profesionalAtado();
    if (propio) return this.profesionalesActivos().filter(p => p.id === propio);
    const alcance = this.alcanceSecretaria();
    if (alcance) return this.profesionalesActivos().filter(p => alcance.has(p.id));
    return this.profesionalesActivos();
  });

  /** Profesional "en foco" para las vistas de configuración (si la selección es ALL, el primero activo).
   *  Un usuario con rol PROFESIONAL queda siempre clavado en su propio profesional. */
  focoId = computed(() => {
    const propio = this.auth.profesionalAtado();
    if (propio) return propio;
    const alcance = this.alcanceSecretaria();
    const sel = this.seleccionId();
    if (sel !== 'ALL' && this.professionals().some(p => p.id === sel) && (!alcance || alcance.has(sel))) return sel;
    if (alcance) return this.profesionalesOperables()[0]?.id ?? '';
    return this.profesionalesActivos()[0]?.id ?? this.professionals()[0]?.id ?? '';
  });

  /** Perfil del profesional en foco (compatibilidad con las vistas existentes). */
  profile = computed<ProfessionalProfile | null>(() =>
    this.professionals().find(p => p.id === this.focoId()) ?? null
  );

  /** Disponibilidad del profesional en foco. */
  availability = computed<DayAvailability[]>(() => this.disponibilidades()[this.focoId()] ?? []);

  /** Turnos dentro del ALCANCE de quien está logueado (sin aplicar el selector):
   *  propios para el rol profesional, los asignados para una secretaría asignada. */
  turnosAlcance = computed(() => {
    const list = this.appointments();
    const propio = this.auth.profesionalAtado();
    if (propio) return list.filter(a => a.profesionalId === propio);
    const alcance = this.alcanceSecretaria();
    if (alcance) return list.filter(a => alcance.has(a.profesionalId));
    return list;
  });

  /** Turnos visibles: el alcance del rol + el selector global. */
  turnosVisibles = computed(() => {
    const list = this.turnosAlcance();
    if (this.auth.profesionalAtado()) return list;
    const sel = this.seleccionId();
    return sel === 'ALL' ? list : list.filter(a => a.profesionalId === sel);
  });

  /**
   * Pacientes visibles según el rol: administrador y secretaría general ven el
   * padrón completo; el rol profesional solo a los pacientes que él atendió;
   * una secretaría asignada, a los pacientes de sus profesionales.
   */
  pacientesVisibles = computed(() => {
    if (!this.auth.profesionalAtado() && !this.alcanceSecretaria()) return this.patients();
    const dnis = new Set(this.turnosAlcance().map(a => a.patientDni));
    return this.patients().filter(p => dnis.has(p.dni));
  });

  // ---- Historia clínica (dato sensible: SOLO el profesional tratante) ----

  /**
   * Profesional "clínico" de la sesión: el profesional que ES la persona
   * logueada (rol profesional, o administrador que atiende — incluye al
   * titular de una cuenta independiente). null = sin acceso a historias
   * (administrador que no atiende, secretarías, impersonación de soporte).
   */
  profesionalClinico = computed<string | null>(() => {
    const propio = this.auth.profesionalPropio();
    return propio && this.professionals().some(p => p.id === propio) ? propio : null;
  });

  puedeVerHistoria = computed(() => this.profesionalClinico() !== null);

  /** Entradas de historia clínica de un paciente ESCRITAS por el profesional clínico. */
  historiasDe(pacienteId: string): HistoriaClinicaEntry[] {
    const prof = this.profesionalClinico();
    if (!prof) return [];
    return this.historias()
      .filter(h => h.pacienteId === pacienteId && h.profesionalId === prof)
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  }

  addHistoria(datos: Omit<HistoriaClinicaEntry, 'id' | 'cuentaId' | 'profesionalId'>): Promise<HistoriaClinicaEntry | null> {
    const prof = this.profesionalClinico();
    const cuentaId = this.cuenta()?.id ?? '';
    if (!prof || !cuentaId) return Promise.resolve(null);
    this.saving.set(true);
    const nueva: HistoriaClinicaEntry = {
      ...datos,
      cuentaId,
      profesionalId: prof,
      id: 'hc-' + Date.now().toString(36) + Math.floor(Math.random() * 1000)
    };
    return new Promise(resolve => {
      this.http.post<HistoriaClinicaEntry>(`${this.api}/historias`, nueva).subscribe({
        next: creada => {
          this.historias.set([...this.historias(), creada]);
          this.saving.set(false);
          resolve(creada);
        },
        error: () => { this.apiError.set(true); this.saving.set(false); resolve(null); }
      });
    });
  }

  /** Servicios del profesional en foco. */
  serviciosDelFoco = computed(() => this.services().filter(s => s.profesionalId === this.focoId()));

  /** Bloqueos del profesional en foco. */
  bloqueosDelFoco = computed(() => this.blockedDates().filter(b => b.profesionalId === this.focoId()));

  /** Especialidades ordenadas por nombre. */
  especialidadesOrdenadas = computed(() =>
    [...this.especialidades()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  );

  /** Especialidades ofrecidas para altas nuevas (activas). */
  especialidadesActivas = computed(() =>
    this.especialidadesOrdenadas().filter(e => e.activo !== false)
  );

  /** Máximo de profesionales activos que permite el plan (0 = sin límite). */
  limiteProfesionales = computed(() => this.plan()?.maxProfesionales ?? 0);

  /** true si el plan admite activar/sumar un profesional más. */
  puedeSumarProfesional = computed(() => {
    const limite = this.limiteProfesionales();
    return limite === 0 || this.profesionalesActivos().length < limite;
  });

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

    let pendientes = 11;
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
      next: list => { this.appointments.set(this.aplicarVencimientos(list)); done(); },
      error: fail
    });
    this.http.get<HistoriaClinicaEntry[]>(`${this.api}/historias?${q}`).subscribe({
      next: list => { this.historias.set(list); done(); },
      error: fail
    });
    this.http.get<Notificacion[]>(`${this.api}/notificaciones?${q}`).subscribe({
      next: list => { this.notificaciones.set(list); done(); },
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
    this.http.get<Especialidad[]>(`${this.api}/especialidades?${q}`).subscribe({
      next: list => { this.especialidades.set(list); done(); },
      error: fail
    });
    const planId = this.cuenta()?.plan;
    if (planId) {
      this.http.get<Plan>(`${this.api}/planes/${planId}`).subscribe({
        next: plan => { this.plan.set(plan); done(); },
        error: () => { this.plan.set(null); done(); } // plan borrado: sin límite
      });
    } else {
      this.plan.set(null);
      done();
    }
  }

  /**
   * VENCIMIENTO de turnos pendientes: un turno PENDING que nadie confirmó
   * hasta `horasVencimientoPendiente` horas antes del inicio pasa a EXPIRED
   * y libera el lugar. Acá se aplica al cargar (mock); en el backend real
   * lo hace un job programado. Los turnos pasados no se tocan (quedan para
   * marcar asistencia). Devuelve la lista con los vencidos ya aplicados.
   */
  private aplicarVencimientos(list: Appointment[]): Appointment[] {
    const horas = this.cuenta()?.horasVencimientoPendiente ?? 12;
    if (horas <= 0) return list;
    const ahora = Date.now();
    return list.map(a => {
      if (a.status !== 'PENDING') return a;
      const [y, m, d] = a.date.split('-').map(Number);
      const [hh, mm] = a.time.split(':').map(Number);
      const inicio = new Date(y, m - 1, d, hh, mm).getTime();
      if (inicio <= ahora) return a; // ya pasó: queda para asistencia
      if (inicio - ahora >= horas * 3600_000) return a; // todavía tiene tiempo
      // Venció: se persiste (fire-and-forget) y se refleja localmente.
      this.http.patch<Appointment>(`${this.api}/appointments/${a.id}`, { status: 'EXPIRED' }).subscribe({
        error: () => this.apiError.set(true)
      });
      return { ...a, status: 'EXPIRED' as const };
    });
  }

  // ---- Avisos de WhatsApp (mock: se registran; el backend hará el envío) ----

  /** Registra el aviso al PACIENTE cuando el panel reprograma o cancela su turno. */
  private notificarPaciente(turno: Appointment, evento: 'reprogramado' | 'cancelado', detalle: string): void {
    const cuentaId = this.cuenta()?.id ?? '';
    if (!cuentaId || !turno.patientPhone) return;
    const lugar = this.cuenta()?.nombre ?? 'el consultorio';
    const mensaje = evento === 'cancelado'
      ? `Hola ${turno.patientName}. Te avisamos desde ${lugar} que tu turno de ${turno.serviceName} del ${turno.date} a las ${turno.time} hs fue cancelado. ${detalle}`.trim()
      : `Hola ${turno.patientName}. Te avisamos desde ${lugar} que tu turno de ${turno.serviceName} fue reprogramado: ${detalle}`.trim();
    const aviso: Notificacion = {
      id: 'ntf-' + Date.now().toString(36) + Math.floor(Math.random() * 1000),
      cuentaId,
      turnoId: turno.id,
      evento,
      origen: 'panel',
      canal: 'whatsapp',
      destinatario: turno.patientName,
      telefono: turno.patientPhone,
      mensaje,
      fecha: new Date().toISOString(),
      estado: 'simulada'
    };
    this.http.post<Notificacion>(`${this.api}/notificaciones`, aviso).subscribe({
      next: creado => this.notificaciones.set([creado, ...this.notificaciones()]),
      error: () => this.apiError.set(true)
    });
  }

  /**
   * Mueve TODOS los turnos futuros activos de una serie a un nuevo día de
   * semana y horario, conservando el espaciado (cada turno pasa al día
   * elegido de su misma semana; si queda en el pasado, salta una semana).
   * Valida disponibilidad, bloqueos, solapamientos y paciente-por-día.
   * `omitirConflictos`: los turnos con conflicto quedan como estaban.
   */
  async reprogramarSerie(
    serieId: string,
    nuevoDow: number,
    nuevaHora: string,
    omitirConflictos: boolean
  ): Promise<{ ok: boolean; movidos: number; omitidos: number; motivo?: string }> {
    const hoy = new Date();
    const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

    const serie = this.appointments()
      .filter(a => a.serieId === serieId && (a.status === 'PENDING' || a.status === 'CONFIRMED') && a.date >= hoyStr)
      .sort((a, b) => a.date.localeCompare(b.date));
    if (serie.length === 0) return { ok: false, movidos: 0, omitidos: 0, motivo: 'La serie no tiene turnos futuros activos.' };

    const profId = serie[0].profesionalId;
    const dni = serie[0].patientDni;

    // El nuevo día/hora tiene que existir en la disponibilidad del profesional.
    const config = this.availabilityDe(profId).find(c => c.dayIndex === nuevoDow);
    if (!config || !config.active || !config.slots.includes(nuevaHora)) {
      return { ok: false, movidos: 0, omitidos: 0, motivo: 'El profesional no atiende ese día a esa hora.' };
    }

    const idsSerie = new Set(serie.map(a => a.id));
    const bloqueos = this.bloqueosDe(profId);
    // Turnos activos del profesional y del paciente FUERA de la serie (la serie entera se mueve).
    const activosProf = this.appointments().filter(a =>
      a.profesionalId === profId && (a.status === 'PENDING' || a.status === 'CONFIRMED') && !idsSerie.has(a.id));

    const aDia = (fecha: string) => {
      const [y, m, d] = fecha.split('-').map(Number);
      return new Date(y, m - 1, d);
    };
    const aStr = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    // Nueva fecha por turno + detección de conflictos.
    const plan: { turno: Appointment; nuevaFecha: string; conflicto: boolean }[] = [];
    for (const turno of serie) {
      const d = aDia(turno.date);
      d.setDate(d.getDate() + (nuevoDow - d.getDay()));
      if (aStr(d) <= hoyStr) d.setDate(d.getDate() + 7); // no mover al pasado ni a hoy
      const nuevaFecha = aStr(d);

      const bloqueado = bloqueos.some(b => b.startDate <= nuevaFecha && nuevaFecha <= b.endDate);
      const ocupado = activosProf.some(a => a.date === nuevaFecha && a.time === nuevaHora);
      const pacienteEseDia = activosProf.some(a => a.patientDni === dni && a.date === nuevaFecha);
      plan.push({ turno, nuevaFecha, conflicto: bloqueado || ocupado || pacienteEseDia });
    }

    const conflictivos = plan.filter(x => x.conflicto).length;
    if (conflictivos > 0 && !omitirConflictos) {
      return {
        ok: false, movidos: 0, omitidos: conflictivos,
        motivo: `${conflictivos} ${conflictivos === 1 ? 'turno tiene' : 'turnos tienen'} conflicto en el nuevo horario. Activá "omitir los que tengan conflicto" para mover el resto.`
      };
    }

    this.saving.set(true);
    let movidos = 0;
    for (const x of plan) {
      if (x.conflicto) continue;
      const notaBase = (x.turno.notes || '').replace(/\s*\[Serie movida[^\]]*\]/g, '').trim();
      const ok = await new Promise<boolean>(resolve => {
        this.http.patch<Appointment>(`${this.api}/appointments/${x.turno.id}`, {
          date: x.nuevaFecha,
          time: nuevaHora,
          notes: `${notaBase} [Serie movida: antes ${x.turno.date} ${x.turno.time} hs]`.trim()
        }).subscribe({
          next: act => {
            this.appointments.set(this.appointments().map(a => (a.id === x.turno.id ? act : a)));
            resolve(true);
          },
          error: () => { this.apiError.set(true); resolve(false); }
        });
      });
      if (ok) {
        movidos++;
        this.notificarPaciente(x.turno, 'reprogramado',
          `del ${x.turno.date} ${x.turno.time} hs al ${x.nuevaFecha} a las ${nuevaHora} hs (se movió la serie completa).`);
      }
    }
    this.saving.set(false);
    return { ok: true, movidos, omitidos: conflictivos };
  }

  /**
   * Cancela TODOS los turnos activos y futuros de una serie.
   * Devuelve cuántos canceló (los pasados o ya cancelados no se tocan).
   */
  async cancelarSerie(serieId: string): Promise<number> {
    const hoy = new Date();
    const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    const objetivo = this.appointments().filter(a =>
      a.serieId === serieId &&
      (a.status === 'PENDING' || a.status === 'CONFIRMED') &&
      a.date >= hoyStr
    );
    if (objetivo.length === 0) return 0;

    this.saving.set(true);
    const resultados = await Promise.all(objetivo.map(a => new Promise<boolean>(resolve => {
      this.http.patch<Appointment>(`${this.api}/appointments/${a.id}`, { status: 'CANCELLED' }).subscribe({
        next: act => {
          this.appointments.set(this.appointments().map(x => (x.id === a.id ? act : x)));
          this.notificarPaciente(a, 'cancelado', 'Se canceló la serie completa de turnos.');
          resolve(true);
        },
        error: () => { this.apiError.set(true); resolve(false); }
      });
    })));
    this.saving.set(false);
    return resultados.filter(Boolean).length;
  }

  // ---- Especialidades (catálogo de la cuenta) ----

  /** Cantidad de profesionales que tienen asignada la especialidad. */
  usoEspecialidad(nombre: string): number {
    return this.professionals().filter(p => p.especialidad === nombre).length;
  }

  private nombreEspecialidadOcupado(nombre: string, ignorarId?: string): boolean {
    const n = nombre.trim().toLowerCase();
    return this.especialidades().some(e => e.id !== ignorarId && e.nombre.trim().toLowerCase() === n);
  }

  /** Alta de especialidad. Devuelve la creada, o null (error o nombre repetido). */
  addEspecialidad(nombre: string): Promise<Especialidad | null> {
    const cuentaId = this.cuenta()?.id ?? '';
    const limpio = nombre.trim();
    if (!limpio || this.nombreEspecialidadOcupado(limpio)) return Promise.resolve(null);

    this.saving.set(true);
    const nueva: Especialidad = {
      id: 'esp-' + Date.now().toString(36) + Math.floor(Math.random() * 1000),
      cuentaId,
      nombre: limpio,
      activo: true
    };
    return new Promise(resolve => {
      this.http.post<Especialidad>(`${this.api}/especialidades`, nueva).subscribe({
        next: creada => {
          this.especialidades.set([...this.especialidades(), creada]);
          this.saving.set(false);
          resolve(creada);
        },
        error: () => { this.apiError.set(true); this.saving.set(false); resolve(null); }
      });
    });
  }

  /**
   * Renombra una especialidad y actualiza EN CASCADA a todos los
   * profesionales de la cuenta que la tenían asignada.
   */
  async renameEspecialidad(id: string, nuevoNombre: string): Promise<boolean> {
    const esp = this.especialidades().find(e => e.id === id);
    const limpio = nuevoNombre.trim();
    if (!esp || !limpio || this.nombreEspecialidadOcupado(limpio, id)) return false;
    if (esp.nombre === limpio) return true;

    this.saving.set(true);
    const ok = await new Promise<boolean>(resolve => {
      this.http.patch<Especialidad>(`${this.api}/especialidades/${id}`, { nombre: limpio }).subscribe({
        next: actualizada => {
          this.especialidades.set(this.especialidades().map(e => (e.id === id ? actualizada : e)));
          resolve(true);
        },
        error: () => { this.apiError.set(true); resolve(false); }
      });
    });

    if (ok) {
      // Cascada sobre los profesionales que usaban el nombre anterior.
      const afectados = this.professionals().filter(p => p.especialidad === esp.nombre);
      await Promise.all(afectados.map(p => new Promise<void>(done => {
        this.http.patch<ProfessionalProfile>(`${this.api}/professionals/${p.id}`, { especialidad: limpio }).subscribe({
          next: act => {
            this.professionals.set(this.professionals().map(x => (x.id === p.id ? act : x)));
            done();
          },
          error: () => { this.apiError.set(true); done(); }
        });
      })));
    }
    this.saving.set(false);
    return ok;
  }

  /** Activa/desactiva una especialidad (inactiva = no se ofrece en altas nuevas). */
  toggleEspecialidad(id: string, activo: boolean): Promise<boolean> {
    this.saving.set(true);
    return new Promise(resolve => {
      this.http.patch<Especialidad>(`${this.api}/especialidades/${id}`, { activo }).subscribe({
        next: act => {
          this.especialidades.set(this.especialidades().map(e => (e.id === id ? act : e)));
          this.saving.set(false);
          resolve(true);
        },
        error: () => { this.apiError.set(true); this.saving.set(false); resolve(false); }
      });
    });
  }

  /** Elimina una especialidad SOLO si ningún profesional la tiene asignada. */
  deleteEspecialidad(id: string): Promise<boolean> {
    const esp = this.especialidades().find(e => e.id === id);
    if (!esp || this.usoEspecialidad(esp.nombre) > 0) return Promise.resolve(false);
    this.saving.set(true);
    return new Promise(resolve => {
      this.http.delete(`${this.api}/especialidades/${id}`).subscribe({
        next: () => {
          this.especialidades.set(this.especialidades().filter(e => e.id !== id));
          this.saving.set(false);
          resolve(true);
        },
        error: () => { this.apiError.set(true); this.saving.set(false); resolve(false); }
      });
    });
  }

  // ---- Datos de la cuenta (nombre público, descripción) ----
  updateCuenta(datos: Partial<Pick<Cuenta, 'nombre' | 'descripcion' | 'bannerUrl' | 'horasMinimasCancelacion' | 'horasVencimientoPendiente'>>): Promise<boolean> {
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
    const anterior = this.appointments().find(a => a.id === id);
    this.saving.set(true);
    return new Promise(resolve => {
      this.http.patch<Appointment>(`${this.api}/appointments/${id}`, datos).subscribe({
        next: actualizado => {
          this.appointments.set(this.appointments().map(a => (a.id === id ? actualizado : a)));
          this.saving.set(false);
          // Cambió la fecha u hora de un turno activo → aviso al paciente.
          if (anterior && (anterior.status === 'PENDING' || anterior.status === 'CONFIRMED') &&
              ((datos.date && datos.date !== anterior.date) || (datos.time && datos.time !== anterior.time))) {
            this.notificarPaciente(anterior, 'reprogramado',
              `del ${anterior.date} ${anterior.time} hs al ${actualizado.date} a las ${actualizado.time} hs.`);
          }
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
    const turno = previo.find(a => a.id === id);
    this.appointments.set(previo.map(a => (a.id === id ? { ...a, status } : a)));

    this.http.patch<Appointment>(`${this.api}/appointments/${id}`, { status }).subscribe({
      next: () => {
        // Cancelación de un turno que estaba activo → aviso al paciente.
        if (status === 'CANCELLED' && turno && (turno.status === 'PENDING' || turno.status === 'CONFIRMED')) {
          this.notificarPaciente(turno, 'cancelado', 'Podés sacar un turno nuevo desde nuestra página.');
        }
      },
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
