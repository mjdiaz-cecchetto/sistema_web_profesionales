import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth.service';
import { Miembro, MiembroConUsuario, RolUsuario, Usuario } from '../../core/models';

/** Datos del alta de un miembro. Si la persona ya existe (por DNI) solo se usa dni + rol. */
export interface AltaMiembro {
  dni: string;
  nombre: string;
  email: string;
  password: string;
  rol: RolUsuario;
  profesionalId: string | null;
  profesionalesAsignados: string[];
}

/** Cambios editables de una membresía. */
export type CambiosMiembro = Partial<Pick<Miembro, 'rol' | 'profesionalId' | 'profesionalesAsignados' | 'activo'>>;

/** Resultado de buscar una persona por DNI antes del alta. */
export type BusquedaPersona =
  | { estado: 'nueva' }
  | { estado: 'existe'; usuario: Usuario }
  | { estado: 'ya-es-miembro'; usuario: Usuario }
  | { estado: 'error' };

/**
 * Usuarios y accesos de la cuenta logueada (Mi Equipo → Usuarios).
 * Modelo: PERSONAS (`usuarios`, login único en la plataforma) con
 * MEMBRESÍAS (`miembros`) en cada cuenta. Solo lo usa el rol administrador.
 *
 * Reglas (en Laravel se validan server-side con Policies):
 *  - siempre queda al menos un administrador activo;
 *  - nadie cambia su propio rol ni se quita su propio acceso;
 *  - un profesional del equipo se vincula a una sola persona;
 *  - la contraseña de una persona que también trabaja en OTRA cuenta no la
 *    resetea este centro (la gestiona ella con "¿Olvidaste tu contraseña?").
 */
@Injectable({ providedIn: 'root' })
export class EquipoUsuariosService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private api = environment.apiUrl;

  miembros = signal<MiembroConUsuario[]>([]);
  /** usuarioId → cantidad de membresías de esa persona en TODA la plataforma. */
  private membresiasPorPersona = signal<Record<string, number>>({});
  cargando = signal(false);
  error = signal(false);
  guardando = signal(false);

  /** Orden: administradores, profesionales, secretarías; luego por nombre. */
  ordenados = computed(() => {
    const peso: Record<RolUsuario, number> = { administrador: 0, profesional: 1, secretaria: 2 };
    return [...this.miembros()].sort((a, b) =>
      peso[a.rol] - peso[b.rol] || a.usuario.nombre.localeCompare(b.usuario.nombre, 'es'));
  });

  administradoresActivos = computed(() =>
    this.miembros().filter(m => m.rol === 'administrador' && m.activo !== false));

  /** Profesionales del equipo que ya están vinculados a una persona con acceso activo. */
  profesionalesVinculados = computed(() => new Set(
    this.miembros().filter(m => m.activo !== false && m.profesionalId).map(m => m.profesionalId as string)
  ));

  private cuentaId(): string {
    return this.auth.cuenta()?.id ?? '';
  }

  /** true si la membresía es la de quien está logueado. */
  esYo(m: Miembro): boolean {
    return this.auth.miembro()?.id === m.id;
  }

  /** true si la persona también tiene acceso a otra cuenta de la plataforma. */
  esCompartida(usuarioId: string): boolean {
    return (this.membresiasPorPersona()[usuarioId] ?? 1) > 1;
  }

  async cargar(): Promise<void> {
    const cuentaId = this.cuentaId();
    if (!cuentaId) return;
    this.cargando.set(true);
    this.error.set(false);
    try {
      const miembros = await firstValueFrom(
        this.http.get<Miembro[]>(`${this.api}/miembros?cuentaId=${encodeURIComponent(cuentaId)}`));
      const ids = [...new Set(miembros.map(m => m.usuarioId))];
      const q = (campo: string) => ids.map(id => `${campo}=${encodeURIComponent(id)}`).join('&');
      const [usuarios, todas] = ids.length
        ? await Promise.all([
            firstValueFrom(this.http.get<Usuario[]>(`${this.api}/usuarios?${q('id')}`)),
            firstValueFrom(this.http.get<Miembro[]>(`${this.api}/miembros?${q('usuarioId')}`))
          ])
        : [[], []];
      const conteo: Record<string, number> = {};
      for (const m of todas) conteo[m.usuarioId] = (conteo[m.usuarioId] ?? 0) + 1;
      this.membresiasPorPersona.set(conteo);
      this.miembros.set(miembros
        .map(m => ({ ...m, usuario: usuarios.find(u => u.id === m.usuarioId)! }))
        .filter(m => !!m.usuario));
    } catch {
      this.error.set(true);
    } finally {
      this.cargando.set(false);
    }
  }

  /** Busca por DNI si la persona ya tiene usuario en la plataforma (para vincularla sin duplicarla). */
  async buscarPorDni(dni: string): Promise<BusquedaPersona> {
    try {
      const lista = await firstValueFrom(this.http.get<Usuario[]>(`${this.api}/usuarios?dni=${encodeURIComponent(dni)}`));
      const u = lista.find(x => x.dni === dni);
      if (!u) return { estado: 'nueva' };
      return this.miembros().some(m => m.usuarioId === u.id)
        ? { estado: 'ya-es-miembro', usuario: u }
        : { estado: 'existe', usuario: u };
    } catch {
      return { estado: 'error' };
    }
  }

  /** Reglas de rol ↔ profesional. Devuelve un mensaje de error o null. */
  private validarRol(rol: RolUsuario, profesionalId: string | null, ignorarMiembroId?: string): string | null {
    if (rol === 'profesional' && !profesionalId) return 'Elegí qué profesional del equipo es esta persona.';
    if (profesionalId) {
      const ocupado = this.miembros().some(m =>
        m.id !== ignorarMiembroId && m.activo !== false && m.profesionalId === profesionalId);
      if (ocupado) return 'Ese profesional ya está vinculado a otra persona del equipo.';
    }
    return null;
  }

  /**
   * Alta de un miembro. Si el DNI ya tiene usuario en la plataforma se lo
   * VINCULA (nueva membresía, sin tocar su contraseña); si no, se crea la
   * persona y su membresía.
   */
  async agregar(datos: AltaMiembro): Promise<{ error?: string; vinculada?: boolean }> {
    const cuentaId = this.cuentaId();
    const dni = datos.dni.trim();
    if (!/^[0-9]{7,9}$/.test(dni)) return { error: 'El DNI debe tener entre 7 y 9 números (es la credencial de ingreso).' };
    const profesionalId = datos.rol === 'secretaria' ? null : (datos.profesionalId || null);
    const errRol = this.validarRol(datos.rol, profesionalId);
    if (errRol) return { error: errRol };

    const busqueda = await this.buscarPorDni(dni);
    if (busqueda.estado === 'error') return { error: 'No se pudo conectar con el servidor.' };
    if (busqueda.estado === 'ya-es-miembro') return { error: `${busqueda.usuario.nombre} ya forma parte del equipo.` };

    this.guardando.set(true);
    try {
      let usuario: Usuario;
      if (busqueda.estado === 'existe') {
        usuario = busqueda.usuario;
      } else {
        const nombre = datos.nombre.trim();
        const email = datos.email.trim().toLowerCase();
        if (!nombre) return { error: 'Ingresá el nombre de la persona.' };
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: 'El email no es válido.' };
        if (datos.password.length < 6) return { error: 'La contraseña inicial debe tener al menos 6 caracteres.' };
        const conEmail = await firstValueFrom(this.http.get<Usuario[]>(`${this.api}/usuarios?email=${encodeURIComponent(email)}`));
        if (conEmail.some(u => u.email.toLowerCase() === email)) return { error: 'Ese email ya pertenece a otro usuario de la plataforma.' };
        usuario = await firstValueFrom(this.http.post<Usuario>(`${this.api}/usuarios`, {
          id: 'usr-' + Date.now().toString(36) + Math.floor(Math.random() * 1000),
          nombre, email, dni, password: datos.password, activo: true
        } satisfies Usuario));
      }

      const miembro: Miembro = {
        id: 'mbr-' + Date.now().toString(36) + Math.floor(Math.random() * 1000),
        cuentaId,
        usuarioId: usuario.id,
        rol: datos.rol,
        profesionalId,
        profesionalesAsignados: datos.rol === 'secretaria' ? datos.profesionalesAsignados : [],
        activo: true
      };
      const creado = await firstValueFrom(this.http.post<Miembro>(`${this.api}/miembros`, miembro));
      this.miembros.update(l => [...l, { ...creado, usuario }]);
      this.membresiasPorPersona.update(c => ({ ...c, [usuario.id]: (c[usuario.id] ?? 0) + 1 }));
      return { vinculada: busqueda.estado === 'existe' };
    } catch {
      this.error.set(true);
      return { error: 'No se pudo guardar. ¿Está corriendo la API local?' };
    } finally {
      this.guardando.set(false);
    }
  }

  /** Edita rol / profesional / agendas / acceso de una membresía. Devuelve error o null. */
  async actualizar(miembroId: string, cambios: CambiosMiembro): Promise<string | null> {
    const actual = this.miembros().find(m => m.id === miembroId);
    if (!actual) return 'No se encontró el miembro.';
    const final = { ...actual, ...cambios };

    if (this.esYo(actual) && (final.rol !== actual.rol || final.activo === false)) {
      return 'No podés cambiar tu propio rol ni quitarte el acceso. Pedíselo a otro administrador.';
    }
    const dejaDeSerAdmin = actual.rol === 'administrador' && actual.activo !== false &&
      (final.rol !== 'administrador' || final.activo === false);
    if (dejaDeSerAdmin && this.administradoresActivos().length <= 1) {
      return 'Tiene que quedar al menos un administrador activo en la cuenta.';
    }
    if (final.rol === 'secretaria') final.profesionalId = null;
    if (final.rol !== 'secretaria') final.profesionalesAsignados = [];
    if (final.activo !== false) {
      const errRol = this.validarRol(final.rol, final.profesionalId ?? null, miembroId);
      if (errRol) return errRol;
    }

    const payload: CambiosMiembro = {
      rol: final.rol,
      profesionalId: final.profesionalId ?? null,
      profesionalesAsignados: final.profesionalesAsignados ?? [],
      activo: final.activo !== false
    };
    this.guardando.set(true);
    try {
      const act = await firstValueFrom(this.http.patch<Miembro>(`${this.api}/miembros/${miembroId}`, payload));
      this.miembros.update(l => l.map(m => (m.id === miembroId ? { ...act, usuario: m.usuario } : m)));
      if (this.esYo(act)) this.auth.actualizarMiembroLocal(act);
      return null;
    } catch {
      this.error.set(true);
      return 'No se pudo guardar. ¿Está corriendo la API local?';
    } finally {
      this.guardando.set(false);
    }
  }

  /** Reset de contraseña de una persona que SOLO trabaja en esta cuenta. */
  async resetearPassword(usuarioId: string, password: string): Promise<string | null> {
    if (password.length < 6) return 'La contraseña nueva debe tener al menos 6 caracteres.';
    if (this.esCompartida(usuarioId)) {
      return 'Esta persona también trabaja en otra cuenta: su contraseña la gestiona ella con "¿Olvidaste tu contraseña?".';
    }
    this.guardando.set(true);
    try {
      await firstValueFrom(this.http.patch<Usuario>(`${this.api}/usuarios/${usuarioId}`, { password }));
      return null;
    } catch {
      this.error.set(true);
      return 'No se pudo guardar. ¿Está corriendo la API local?';
    } finally {
      this.guardando.set(false);
    }
  }
}
