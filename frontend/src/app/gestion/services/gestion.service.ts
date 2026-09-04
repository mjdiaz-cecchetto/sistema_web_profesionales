import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Appointment, Cuenta, MedioPago, Pago, Plan, ProfessionalAvailability, ProfessionalProfile } from '../../core/models';

/** Totales agregados de una cuenta — sin datos personales de pacientes/turnos. */
export interface MetricasCuenta {
  profesionales: number;
  pacientes: number;
  turnosMes: number;
  ultimoTurno: string; // YYYY-MM-DD ('' si nunca tuvo)
}

/** Estado de cobranza de una cuenta respecto del período actual. */
export type EstadoCobranza = 'al_dia' | 'vencida' | 'sin_cargo';

export interface AltaCuenta {
  tipo: 'consultorio' | 'profesional';
  nombre: string;
  email: string;
  password: string;
  descripcion: string;
  plan: string;
  slug: string;
  /** Solo alta de profesional independiente. */
  especialidad?: string;
}

/**
 * Servicio del back-office (/gestion). Gestiona CUENTAS, PLANES y COBROS.
 * LÍMITE DE PRIVACIDAD: este módulo nunca muestra pacientes ni turnos —
 * solo contadores agregados. (En el backend real será un endpoint de
 * agregados; sobre el mock se calculan en memoria y se descartan los datos.)
 */
@Injectable({ providedIn: 'root' })
export class GestionService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  cuentas = signal<Cuenta[]>([]);
  planes = signal<Plan[]>([]);
  pagos = signal<Pago[]>([]);
  metricas = signal<Record<string, MetricasCuenta>>({});
  loading = signal<boolean>(true);
  apiError = signal<boolean>(false);
  saving = signal<boolean>(false);

  // ---- Derivados de la plataforma (para el dashboard) ----
  cuentasActivas = computed(() => this.cuentas().filter(c => c.estado !== 'suspendida'));
  cuentasSuspendidas = computed(() => this.cuentas().filter(c => c.estado === 'suspendida'));
  totalProfesionales = computed(() =>
    Object.values(this.metricas()).reduce((acc, m) => acc + m.profesionales, 0));
  totalPacientes = computed(() =>
    Object.values(this.metricas()).reduce((acc, m) => acc + m.pacientes, 0));
  turnosMesPlataforma = computed(() =>
    Object.values(this.metricas()).reduce((acc, m) => acc + m.turnosMes, 0));
  /** Cobros registrados del período actual (ingresos del mes). */
  ingresosMes = computed(() => {
    const per = this.periodoActual();
    return this.pagos().filter(p => p.periodo === per).reduce((acc, p) => acc + p.monto, 0);
  });
  /** Cuentas activas con plan pago que NO registran cobro del período actual. */
  cuentasVencidas = computed(() =>
    this.cuentasActivas().filter(c => this.cobranza(c) === 'vencida'));

  planesActivos = computed(() => this.planes().filter(p => p.activo));

  // ---- Helpers de período/plan ----
  periodoActual(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  hoy(): string {
    const d = new Date();
    return `${this.periodoActual()}-${String(d.getDate()).padStart(2, '0')}`;
  }

  planPorId(id: string): Plan | undefined {
    return this.planes().find(p => p.id === id);
  }

  nombrePlan(id: string): string {
    return this.planPorId(id)?.nombre ?? id;
  }

  /** Estado de cobranza de una cuenta respecto del período actual. */
  cobranza(cuenta: Cuenta): EstadoCobranza {
    const plan = this.planPorId(cuenta.plan);
    if (!plan || plan.precioMensual === 0) return 'sin_cargo';
    const per = this.periodoActual();
    return this.pagos().some(p => p.cuentaId === cuenta.id && p.periodo === per) ? 'al_dia' : 'vencida';
  }

  /** Carga cuentas, planes, cobros y totales agregados. */
  cargar(): void {
    this.loading.set(true);
    this.apiError.set(false);
    forkJoin({
      cuentas: this.http.get<Cuenta[]>(`${this.api}/cuentas`),
      planes: this.http.get<Plan[]>(`${this.api}/planes`),
      pagos: this.http.get<Pago[]>(`${this.api}/pagos`),
      profesionales: this.http.get<ProfessionalProfile[]>(`${this.api}/professionals`),
      turnos: this.http.get<Appointment[]>(`${this.api}/appointments`),
      pacientes: this.http.get<{ id: string; cuentaId: string }[]>(`${this.api}/patients`)
    }).subscribe({
      next: ({ cuentas, planes, pagos, profesionales, turnos, pacientes }) => {
        const mes = this.periodoActual();
        const m: Record<string, MetricasCuenta> = {};
        for (const c of cuentas) {
          const t = turnos.filter(a => a.cuentaId === c.id);
          m[c.id] = {
            profesionales: profesionales.filter(p => p.cuentaId === c.id && p.activo !== false).length,
            pacientes: pacientes.filter(p => p.cuentaId === c.id).length,
            turnosMes: t.filter(a => a.date.startsWith(mes)).length,
            ultimoTurno: t.map(a => a.date).sort().at(-1) ?? ''
          };
        }
        this.cuentas.set(cuentas);
        this.planes.set(planes);
        this.pagos.set(pagos);
        this.metricas.set(m);
        this.loading.set(false);
      },
      error: () => {
        this.apiError.set(true);
        this.loading.set(false);
      }
    });
  }

  /** Slug único a partir del nombre (editable por el admin antes de guardar). */
  generarSlug(nombre: string, ignorarId?: string): string {
    const base = nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'cuenta';
    const usados = new Set(this.cuentas().filter(c => c.id !== ignorarId).map(c => c.slug));
    let slug = base;
    let i = 2;
    while (usados.has(slug)) slug = `${base}-${i++}`;
    return slug;
  }

  slugDisponible(slug: string, ignorarId?: string): boolean {
    return !this.cuentas().some(c => c.slug === slug && c.id !== ignorarId);
  }

  /**
   * Alta de cuenta. Para un profesional independiente crea además su perfil
   * profesional y su disponibilidad vacía (para que el panel y la página
   * pública funcionen desde el primer login).
   */
  crearCuenta(datos: AltaCuenta): Promise<Cuenta | null> {
    this.saving.set(true);
    const nueva: Cuenta = {
      id: 'cta-' + Date.now().toString(36),
      tipo: datos.tipo,
      email: datos.email.trim().toLowerCase(),
      password: datos.password,
      nombre: datos.nombre.trim(),
      slug: datos.slug,
      descripcion: datos.descripcion.trim(),
      bannerUrl: '',
      estado: 'activa',
      plan: datos.plan,
      fechaAlta: this.hoy()
    };
    return new Promise(resolve => {
      this.http.post<Cuenta>(`${this.api}/cuentas`, nueva).subscribe({
        next: creada => {
          this.cuentas.update(l => [...l, creada]);
          this.metricas.update(m => ({ ...m, [creada.id]: { profesionales: 0, pacientes: 0, turnosMes: 0, ultimoTurno: '' } }));
          if (datos.tipo === 'profesional') {
            this.crearPerfilInicial(creada, datos.especialidad || 'General', () => {
              this.saving.set(false);
              resolve(creada);
            });
          } else {
            this.saving.set(false);
            resolve(creada);
          }
        },
        error: () => {
          this.saving.set(false);
          resolve(null);
        }
      });
    });
  }

  private crearPerfilInicial(cuenta: Cuenta, especialidad: string, done: () => void): void {
    const id = 'prof-' + Date.now().toString(36);
    const perfil: ProfessionalProfile = {
      id,
      cuentaId: cuenta.id,
      activo: true,
      especialidad,
      nombre: cuenta.nombre,
      titulo: '',
      whatsapp: '',
      avatarUrl: '',
      bannerUrl: '',
      frasePrincipal: '',
      biografia: '',
      modalidad: '',
      direcciones: [],
      areas: []
    };
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const disponibilidad: ProfessionalAvailability = {
      id,
      cuentaId: cuenta.id,
      days: [1, 2, 3, 4, 5, 6, 0].map(idx => ({ day: dias[idx], dayIndex: idx, active: false, slots: [] }))
    };
    this.http.post<ProfessionalProfile>(`${this.api}/professionals`, perfil).subscribe({
      next: () => {
        this.metricas.update(m => ({ ...m, [cuenta.id]: { ...m[cuenta.id], profesionales: 1 } }));
        this.http.post<ProfessionalAvailability>(`${this.api}/availabilities`, disponibilidad).subscribe({
          next: done,
          error: done
        });
      },
      error: done
    });
  }

  /** Actualiza datos de una cuenta (edición, suspensión, reset de contraseña). */
  actualizarCuenta(id: string, cambios: Partial<Cuenta>): Promise<boolean> {
    this.saving.set(true);
    return new Promise(resolve => {
      this.http.patch<Cuenta>(`${this.api}/cuentas/${id}`, cambios).subscribe({
        next: actualizada => {
          this.cuentas.update(l => l.map(c => (c.id === id ? actualizada : c)));
          this.saving.set(false);
          resolve(true);
        },
        error: () => {
          this.saving.set(false);
          resolve(false);
        }
      });
    });
  }

  // ---- Planes de membresía ----

  crearPlan(datos: Omit<Plan, 'id'>): Promise<Plan | null> {
    this.saving.set(true);
    const nuevo: Plan = { ...datos, id: 'plan-' + Date.now().toString(36) };
    return new Promise(resolve => {
      this.http.post<Plan>(`${this.api}/planes`, nuevo).subscribe({
        next: creado => {
          this.planes.update(l => [...l, creado]);
          this.saving.set(false);
          resolve(creado);
        },
        error: () => { this.saving.set(false); resolve(null); }
      });
    });
  }

  actualizarPlan(id: string, cambios: Partial<Plan>): Promise<boolean> {
    this.saving.set(true);
    return new Promise(resolve => {
      this.http.patch<Plan>(`${this.api}/planes/${id}`, cambios).subscribe({
        next: actualizado => {
          this.planes.update(l => l.map(p => (p.id === id ? actualizado : p)));
          this.saving.set(false);
          resolve(true);
        },
        error: () => { this.saving.set(false); resolve(false); }
      });
    });
  }

  /** Cuántas cuentas usan un plan (para avisar antes de desactivarlo). */
  cuentasConPlan(planId: string): number {
    return this.cuentas().filter(c => c.plan === planId).length;
  }

  // ---- Cobros ----

  registrarPago(datos: { cuentaId: string; periodo: string; monto: number; medio: MedioPago; notas?: string }): Promise<Pago | null> {
    this.saving.set(true);
    const nuevo: Pago = { ...datos, id: 'pago-' + Date.now().toString(36), fecha: this.hoy() };
    return new Promise(resolve => {
      this.http.post<Pago>(`${this.api}/pagos`, nuevo).subscribe({
        next: creado => {
          this.pagos.update(l => [...l, creado]);
          this.saving.set(false);
          resolve(creado);
        },
        error: () => { this.saving.set(false); resolve(null); }
      });
    });
  }

  pagosDeCuenta(cuentaId: string): Pago[] {
    return this.pagos().filter(p => p.cuentaId === cuentaId)
      .sort((a, b) => b.periodo.localeCompare(a.periodo));
  }
}
