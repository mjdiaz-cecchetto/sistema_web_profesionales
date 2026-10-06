import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth.service';
import { HealthInsurance, ObraSocial, PARTICULAR, ProfessionalProfile } from '../../core/models';
import { AdminService } from './admin.service';
import { aceptaParticular, coberturasDeProfesional } from '../../core/coberturas';

/**
 * Obras sociales de la cuenta logueada y cuáles atiende cada profesional.
 *  - La CUENTA arma su lista (colección `obrasSociales`): desde el catálogo
 *    sugerido de la plataforma o agregando propias.
 *  - Cada PROFESIONAL marca cuáles atiende (`ProfessionalProfile.obrasSociales`)
 *    y si acepta particulares (`aceptaParticular`, por defecto sí).
 * Turnos y pacientes guardan el NOMBRE (mock); en Laravel serán claves foráneas.
 */
@Injectable({ providedIn: 'root' })
export class ObrasSocialesService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private admin = inject(AdminService);
  private api = environment.apiUrl;

  obrasSociales = signal<ObraSocial[]>([]);
  /** Catálogo sugerido de la plataforma (nombres, sin "Particular"). */
  private catalogo = signal<string[]>([]);
  cargando = signal(false);
  guardando = signal(false);

  ordenadas = computed(() =>
    [...this.obrasSociales()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')));

  activas = computed(() => this.ordenadas().filter(o => o.activo !== false));

  /** Sugerencias del catálogo que la cuenta todavía no agregó. */
  sugerencias = computed(() => {
    const usadas = new Set(this.obrasSociales().map(o => o.nombre.trim().toLowerCase()));
    return this.catalogo().filter(n => !usadas.has(n.toLowerCase()));
  });

  /** Opciones para el padrón de pacientes: todas las activas de la cuenta + particular. */
  opcionesCuenta = computed(() => [PARTICULAR, ...this.activas().map(o => o.nombre)]);

  constructor() {
    effect(() => {
      const id = this.auth.cuenta()?.id;
      untracked(() => (id ? this.cargar(id) : this.obrasSociales.set([])));
    });
  }

  async cargar(cuentaId: string): Promise<void> {
    this.cargando.set(true);
    try {
      const [propias, catalogo] = await Promise.all([
        firstValueFrom(this.http.get<ObraSocial[]>(`${this.api}/obrasSociales?cuentaId=${encodeURIComponent(cuentaId)}`)),
        firstValueFrom(this.http.get<HealthInsurance[]>(`${this.api}/healthInsurances`))
      ]);
      this.obrasSociales.set(propias);
      this.catalogo.set(catalogo.map(c => c.name).filter(n => n !== PARTICULAR).sort((a, b) => a.localeCompare(b, 'es')));
    } catch {
      this.admin.apiError.set(true);
    } finally {
      this.cargando.set(false);
    }
  }

  // ---- Profesionales ----

  aceptaParticular(p: ProfessionalProfile): boolean {
    return aceptaParticular(p);
  }

  atiende(p: ProfessionalProfile, obraSocialId: string): boolean {
    return (p.obrasSociales ?? []).includes(obraSocialId);
  }

  /** Cantidad de profesionales que atienden esa obra social. */
  usoEn(obraSocialId: string): number {
    return this.admin.professionals().filter(p => this.atiende(p, obraSocialId)).length;
  }

  /** Obras sociales activas que atiende un profesional (nombres). */
  nombresDe(profId: string): string[] {
    const p = this.admin.profesionalPorId(profId);
    if (!p) return [];
    return this.activas().filter(o => this.atiende(p, o.id)).map(o => o.nombre);
  }

  /** Opciones válidas para un turno con ese profesional: particular (si acepta) + sus obras sociales activas. */
  opcionesParaProfesional(profId: string): string[] {
    const p = this.admin.profesionalPorId(profId);
    return p ? coberturasDeProfesional(p, this.obrasSociales()) : [];
  }

  /** ¿Ese profesional atiende a un paciente con esa cobertura (nombre)? */
  atiendeCobertura(profId: string, cobertura: string): boolean {
    return this.opcionesParaProfesional(profId).includes(cobertura);
  }

  async toggleAtiende(p: ProfessionalProfile, obraSocialId: string): Promise<boolean> {
    const actuales = p.obrasSociales ?? [];
    const nuevas = actuales.includes(obraSocialId)
      ? actuales.filter(id => id !== obraSocialId)
      : [...actuales, obraSocialId];
    return this.admin.updateProfessional(p.id, { obrasSociales: nuevas });
  }

  async toggleParticular(p: ProfessionalProfile): Promise<boolean> {
    return this.admin.updateProfessional(p.id, { aceptaParticular: !this.aceptaParticular(p) });
  }

  // ---- Lista de la cuenta ----

  private nombreOcupado(nombre: string): boolean {
    const n = nombre.trim().toLowerCase();
    return n === PARTICULAR.toLowerCase() || n === 'particular' ||
      this.obrasSociales().some(o => o.nombre.trim().toLowerCase() === n);
  }

  /** Agrega una obra social a la cuenta. Devuelve un mensaje de error o null. */
  async agregar(nombre: string): Promise<string | null> {
    const limpio = nombre.trim().replace(/\s+/g, ' ');
    const cuentaId = this.auth.cuenta()?.id;
    if (!limpio) return 'Escribí el nombre de la obra social.';
    if (!cuentaId) return 'No hay una cuenta activa.';
    if (this.nombreOcupado(limpio)) return `"${limpio}" ya está en la lista.`;
    this.guardando.set(true);
    try {
      const creada = await firstValueFrom(this.http.post<ObraSocial>(`${this.api}/obrasSociales`, {
        id: 'os-' + Date.now().toString(36) + Math.floor(Math.random() * 1000),
        cuentaId,
        nombre: limpio,
        activo: true
      } satisfies ObraSocial));
      this.obrasSociales.update(l => [...l, creada]);
      return null;
    } catch {
      this.admin.apiError.set(true);
      return 'No se pudo guardar. ¿Está corriendo la API local?';
    } finally {
      this.guardando.set(false);
    }
  }

  /** Activa/desactiva: una inactiva deja de ofrecerse a pacientes, pero los profesionales la conservan marcada. */
  async setActivo(os: ObraSocial, activo: boolean): Promise<boolean> {
    try {
      const act = await firstValueFrom(this.http.patch<ObraSocial>(`${this.api}/obrasSociales/${os.id}`, { activo }));
      this.obrasSociales.update(l => l.map(o => (o.id === os.id ? act : o)));
      return true;
    } catch {
      this.admin.apiError.set(true);
      return false;
    }
  }

  /** Elimina una obra social que ningún profesional atiende. Devuelve error o null. */
  async eliminar(os: ObraSocial): Promise<string | null> {
    const uso = this.usoEn(os.id);
    if (uso > 0) return `${uso === 1 ? 'Un profesional la atiende' : uso + ' profesionales la atienden'}: desmarcala primero o desactivala.`;
    try {
      await firstValueFrom(this.http.delete(`${this.api}/obrasSociales/${os.id}`));
      this.obrasSociales.update(l => l.filter(o => o.id !== os.id));
      return null;
    } catch {
      this.admin.apiError.set(true);
      return 'No se pudo eliminar.';
    }
  }
}
