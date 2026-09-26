import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Administrador, Cuenta, Miembro, MiembroConCuenta, RolUsuario, Usuario } from './models';

const CLAVE_SESION = 'sp_sesion';
const ERROR_CONEXION = 'No se pudo conectar con el servidor. ¿Está corriendo la API local?';

/** Lo que se persiste en localStorage. */
interface SesionGuardada {
  tipo: 'admin' | 'usuario';
  id: string;
  /** Solo usuario: membresía (cuenta + rol) con la que está trabajando. */
  miembroId?: string;
  /** Solo admin: cuenta que está viendo como soporte (impersonación). */
  cuentaId?: string;
}

/**
 * Resultado de un login:
 *  - `error`: mensaje para mostrar.
 *  - `elegir`: la persona tiene acceso a VARIAS cuentas → la UI muestra el
 *    selector de centro y llama a `entrarEn(miembroId)`.
 *  - vacío: sesión abierta, navegar a `destino()`.
 */
export interface ResultadoLogin {
  error?: string;
  elegir?: MiembroConCuenta[];
}

/**
 * Autenticación mock contra json-server. Dos clases de sesión:
 *  - USUARIO (persona, colección `usuarios`): entra con DNI o email y trabaja
 *    en UNA cuenta a la vez a través de una membresía (`miembros`: cuenta +
 *    rol + profesional que atiende). Si tiene varias, elige centro.
 *  - ADMINISTRADOR de la plataforma: back-office /gestion; puede "entrar
 *    como" una cuenta (impersonación de soporte, rol administrador sin
 *    acceso clínico).
 * En el backend real (Laravel + Sanctum) esto se reemplaza por tokens;
 * la interfaz del servicio se mantiene.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  /** Administrador de plataforma logueado (null si la sesión es de un usuario). */
  admin = signal<Administrador | null>(null);
  /** Persona logueada (null si entró un administrador de plataforma). */
  usuario = signal<Usuario | null>(null);
  /** Membresía activa de la persona (cuenta + rol con el que trabaja ahora). */
  miembro = signal<Miembro | null>(null);
  /** Todas las membresías utilizables de la persona (para "Cambiar de centro"). */
  membresias = signal<MiembroConCuenta[]>([]);
  /** Cuenta activa: la de la membresía elegida, o la impersonada por un admin. */
  cuenta = signal<Cuenta | null>(null);
  /** true mientras se restaura la sesión guardada al iniciar la app. */
  restaurando = signal<boolean>(true);

  esConsultorio = computed(() => this.cuenta()?.tipo === 'consultorio');
  esAdmin = computed(() => this.admin() !== null);
  /** true si un administrador está viendo una cuenta como soporte. */
  impersonando = computed(() => this.admin() !== null && this.cuenta() !== null);
  /** true si la persona puede cambiar de centro (tiene más de una membresía). */
  multiCentro = computed(() => this.membresias().length > 1);

  /** Rol dentro del panel: el de la membresía, o administrador en impersonación. */
  rol = computed<RolUsuario>(() => this.miembro()?.rol ?? 'administrador');
  esAdministrador = computed(() => this.rol() === 'administrador');
  esSecretaria = computed(() => this.rol() === 'secretaria');
  esProfesionalRol = computed(() => this.rol() === 'profesional');

  /**
   * Profesional al que queda ATADO el alcance del panel: solo el rol
   * profesional (ve únicamente lo suyo). Un administrador que atiende NO
   * queda atado: sigue viendo todo el centro.
   */
  profesionalAtado = computed<string | null>(() =>
    this.miembro()?.rol === 'profesional' ? (this.miembro()?.profesionalId ?? null) : null
  );

  /**
   * Profesional que ES la persona logueada (rol profesional, o administrador
   * que atiende). Define el acceso a historias clínicas. La impersonación de
   * soporte nunca tiene acceso clínico.
   */
  profesionalPropio = computed<string | null>(() => {
    const m = this.miembro();
    if (!m || this.esAdmin() || m.rol === 'secretaria') return null;
    return m.profesionalId ?? null;
  });

  /** Promesa que resuelve cuando la sesión guardada terminó de restaurarse. */
  private listo: Promise<void>;

  constructor() {
    this.listo = this.restaurarSesion();
  }

  /** Espera la restauración y devuelve la cuenta activa (o null). */
  async sesion(): Promise<Cuenta | null> {
    await this.listo;
    return this.cuenta();
  }

  /** Espera la restauración y devuelve el administrador (o null). */
  async sesionAdmin(): Promise<Administrador | null> {
    await this.listo;
    return this.admin();
  }

  /** Ruta inicial según la sesión: gestión para el admin, panel para los usuarios. */
  destino(): string {
    return this.esAdmin() && !this.impersonando() ? '/gestion' : '/admin';
  }

  private leerGuardada(): SesionGuardada | null {
    try {
      const s = JSON.parse(localStorage.getItem(CLAVE_SESION) || 'null');
      return s && s.id && (s.tipo === 'admin' || s.tipo === 'usuario') ? s : null;
    } catch {
      return null;
    }
  }

  private guardar(s: SesionGuardada | null): void {
    try {
      if (s) localStorage.setItem(CLAVE_SESION, JSON.stringify(s));
      else localStorage.removeItem(CLAVE_SESION);
    } catch { /* modo privado */ }
  }

  private get<T>(url: string): Promise<T | null> {
    return new Promise(resolve =>
      this.http.get<T>(url).subscribe({ next: v => resolve(v), error: () => resolve(null) })
    );
  }

  /**
   * Membresías UTILIZABLES de una persona: activas y de cuentas no
   * suspendidas, con su cuenta resuelta. null = error de conexión.
   */
  private async membresiasDe(usuarioId: string): Promise<MiembroConCuenta[] | null> {
    const miembros = await this.get<Miembro[]>(`${this.api}/miembros?usuarioId=${encodeURIComponent(usuarioId)}`);
    if (miembros === null) return null;
    const activos = miembros.filter(m => m.usuarioId === usuarioId && m.activo !== false);
    if (!activos.length) return [];
    const q = activos.map(m => `id=${encodeURIComponent(m.cuentaId)}`).join('&');
    const cuentas = await this.get<Cuenta[]>(`${this.api}/cuentas?${q}`);
    if (cuentas === null) return null;
    return activos
      .map(m => ({ ...m, cuenta: cuentas.find(c => c.id === m.cuentaId)! }))
      .filter(m => m.cuenta && m.cuenta.estado !== 'suspendida')
      .sort((a, b) => a.cuenta.nombre.localeCompare(b.cuenta.nombre, 'es'));
  }

  private async restaurarSesion(): Promise<void> {
    const s = this.leerGuardada();
    if (!s) { this.restaurando.set(false); return; }

    if (s.tipo === 'admin') {
      const adm = await this.get<Administrador>(`${this.api}/administradores/${s.id}`);
      if (adm) {
        this.admin.set(adm);
        if (s.cuentaId) {
          const c = await this.get<Cuenta>(`${this.api}/cuentas/${s.cuentaId}`);
          if (c) this.cuenta.set(c);
        }
      } else {
        this.guardar(null);
      }
    } else {
      const u = await this.get<Usuario>(`${this.api}/usuarios/${s.id}`);
      const membresias = u && u.activo !== false ? await this.membresiasDe(u.id) : null;
      const actual = membresias?.find(m => m.id === s.miembroId);
      if (u && membresias && actual) {
        this.abrirSesionUsuario(u, actual, membresias);
      } else {
        this.guardar(null);
      }
    }
    this.restaurando.set(false);
  }

  /**
   * Inicia sesión. El identificador puede ser un DNI (usuarios) o un EMAIL
   * (usuarios o administradores de la plataforma).
   */
  async login(identificador: string, password: string): Promise<ResultadoLogin> {
    const id = identificador.trim().toLowerCase();
    const esDni = /^[0-9]{7,9}$/.test(id);

    // 1) Administradores de la plataforma (solo email)
    if (!esDni) {
      const admins = await this.get<Administrador[]>(`${this.api}/administradores?email=${encodeURIComponent(id)}`);
      if (admins === null) return { error: ERROR_CONEXION };
      const adm = admins.find(a => a.email.toLowerCase() === id);
      if (adm) {
        if (adm.password !== password) return { error: 'Email o contraseña incorrectos.' };
        this.setSesion({ admin: adm });
        this.guardar({ tipo: 'admin', id: adm.id });
        return {};
      }
    }

    // 2) Personas (DNI o email)
    const campo = esDni ? 'dni' : 'email';
    const lista = await this.get<Usuario[]>(`${this.api}/usuarios?${campo}=${encodeURIComponent(id)}`);
    if (lista === null) return { error: ERROR_CONEXION };
    const u = lista.find(x => (esDni ? x.dni === id : x.email.toLowerCase() === id));
    const credencialMal = esDni ? 'DNI o contraseña incorrectos.' : 'Email o contraseña incorrectos.';
    if (!u || u.password !== password) return { error: credencialMal };
    if (u.activo === false) return { error: 'Tu usuario está desactivado. Contactate con el administrador de la plataforma.' };

    const membresias = await this.membresiasDe(u.id);
    if (membresias === null) return { error: ERROR_CONEXION };
    if (!membresias.length) {
      return { error: 'Tu usuario no tiene acceso activo a ningún consultorio. Hablá con el administrador del centro.' };
    }

    this.usuario.set(u);
    this.membresias.set(membresias);
    if (membresias.length === 1) {
      this.entrarEn(membresias[0].id);
      return {};
    }
    return { elegir: membresias };
  }

  /**
   * Abre (o cambia) la cuenta de trabajo de la persona logueada.
   * Devuelve false si la membresía no pertenece a la sesión.
   */
  entrarEn(miembroId: string): boolean {
    const u = this.usuario();
    const m = this.membresias().find(x => x.id === miembroId);
    if (!u || !m) return false;
    this.abrirSesionUsuario(u, m, this.membresias());
    this.guardar({ tipo: 'usuario', id: u.id, miembroId: m.id });
    return true;
  }

  private abrirSesionUsuario(u: Usuario, m: MiembroConCuenta, todas: MiembroConCuenta[]): void {
    const { cuenta, ...miembro } = m;
    this.admin.set(null);
    this.usuario.set(u);
    this.membresias.set(todas);
    this.miembro.set(miembro);
    this.cuenta.set(cuenta);
    this.listo = Promise.resolve();
  }

  /**
   * Recuperación de cuenta (MOCK): simula el envío de instrucciones. En el
   * backend real: token de un solo uso por email/WhatsApp. Siempre responde
   * neutro para no revelar si la cuenta existe.
   */
  async recuperarCuenta(identificador: string): Promise<{ ok: boolean; detalle: string }> {
    const id = identificador.trim().toLowerCase();
    if (!id) return { ok: false, detalle: 'Ingresá tu DNI o tu email.' };
    return {
      ok: true,
      detalle: 'Si el DNI o email corresponde a un usuario, vas a recibir un mensaje con los pasos para crear una contraseña nueva. (Simulado: el envío real por email/WhatsApp lo hace el backend.)'
    };
  }

  private setSesion(s: { admin?: Administrador }): void {
    this.admin.set(s.admin ?? null);
    this.cuenta.set(null);
    this.usuario.set(null);
    this.miembro.set(null);
    this.membresias.set([]);
    this.listo = Promise.resolve();
  }

  /** El administrador entra a ver una cuenta como soporte (banner visible en /admin). */
  impersonar(cuenta: Cuenta): void {
    const adm = this.admin();
    if (!adm) return;
    this.cuenta.set(cuenta);
    this.usuario.set(null);
    this.miembro.set(null);
    this.guardar({ tipo: 'admin', id: adm.id, cuentaId: cuenta.id });
  }

  /** Sale de la impersonación (vuelve al back-office). */
  dejarDeImpersonar(): void {
    const adm = this.admin();
    if (!adm) return;
    this.cuenta.set(null);
    this.guardar({ tipo: 'admin', id: adm.id });
  }

  /** Refleja en la sesión cambios hechos sobre la propia membresía (p. ej. "atiende"). */
  actualizarMiembroLocal(m: Miembro): void {
    if (this.miembro()?.id !== m.id) return;
    this.miembro.set(m);
    this.membresias.update(l => l.map(x => (x.id === m.id ? { ...m, cuenta: x.cuenta } : x)));
  }

  /** Refleja en la sesión cambios hechos sobre la propia persona (p. ej. su nombre). */
  actualizarUsuarioLocal(u: Usuario): void {
    if (this.usuario()?.id === u.id) this.usuario.set(u);
  }

  logout(): void {
    this.admin.set(null);
    this.cuenta.set(null);
    this.usuario.set(null);
    this.miembro.set(null);
    this.membresias.set([]);
    this.listo = Promise.resolve();
    this.guardar(null);
  }
}
