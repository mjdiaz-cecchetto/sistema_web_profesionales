import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Administrador, Cuenta, Miembro, MiembroConCuenta, RolUsuario, Usuario } from './models';

/** Solo se guarda en el navegador la cuenta que el admin está viendo como soporte. */
const CLAVE_IMPERSONACION = 'sp_impersonando';
const ERROR_CONEXION = 'No se pudo conectar con el servidor. ¿Está levantado el backend (make up)?';

/** Sesión que devuelve el backend (GET/POST /api/auth/...). */
type SesionApi =
  | { tipo: 'admin'; admin: Administrador }
  | { tipo: 'usuario'; usuario: Usuario; membresias: MiembroConCuenta[]; miembroId: string | null };

interface RespuestaSesion {
  sesion: SesionApi | null;
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
 * Autenticación contra el backend Laravel (sesión por cookie, mismo dominio:
 * el frontend llama a /api y en desarrollo el proxy de `ng serve` lo pasa a
 * Laravel). Angular agrega solo el header X-XSRF-TOKEN en los POST.
 *
 * Dos clases de sesión:
 *  - USUARIO (persona): entra con DNI o email y trabaja en UNA cuenta a la
 *    vez a través de una membresía (cuenta + rol). Si tiene varias, elige centro.
 *  - ADMINISTRADOR de la plataforma: back-office /gestion; puede "entrar
 *    como" una cuenta (impersonación de soporte, sin acceso clínico).
 *
 * El resto de los datos del panel todavía sale de la API simulada
 * (environment.apiUrl) hasta que cada pantalla se conecte a Laravel.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  /** API simulada (json-server): la usa solo la impersonación mientras /gestion siga en el mock. */
  private api = environment.apiUrl;
  /** API real (Laravel). */
  private backend = environment.backendUrl;

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
  /** true mientras se restaura la sesión al iniciar la app. */
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

  /** Promesa que resuelve cuando la sesión terminó de restaurarse. */
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

  // ---------------------------------------------------------------- backend

  private consultarSesion(): Promise<RespuestaSesion> {
    return firstValueFrom(this.http.get<RespuestaSesion>(`${this.backend}/auth/sesion`));
  }

  /**
   * POST al backend. Si la cookie CSRF venció (419), pide una nueva con
   * GET /auth/sesion y reintenta una sola vez.
   */
  private async post(ruta: string, cuerpo: object = {}): Promise<RespuestaSesion> {
    const url = `${this.backend}/auth/${ruta}`;
    try {
      return await firstValueFrom(this.http.post<RespuestaSesion>(url, cuerpo));
    } catch (e) {
      if (e instanceof HttpErrorResponse && e.status === 419) {
        await this.consultarSesion();
        return await firstValueFrom(this.http.post<RespuestaSesion>(url, cuerpo));
      }
      throw e;
    }
  }

  /** Mensaje para mostrar a partir de un error HTTP del backend. */
  private mensajeError(e: unknown): string {
    if (e instanceof HttpErrorResponse) {
      const msg = typeof e.error?.message === 'string' ? e.error.message : '';
      // 0 = sin conexión; 502/503/504 o 500 sin cuerpo = el proxy no llega a Laravel.
      if (e.status === 0 || e.status >= 502 || (e.status === 500 && !msg)) return ERROR_CONEXION;
      if (msg) return msg;
    }
    return 'Ocurrió un error inesperado. Probá de nuevo.';
  }

  /** Aplica en las señales la sesión que devolvió el backend. */
  private aplicar(s: SesionApi | null): void {
    this.limpiar();
    if (!s) return;
    if (s.tipo === 'admin') {
      this.admin.set(s.admin);
      return;
    }
    this.usuario.set(s.usuario);
    this.membresias.set(s.membresias);
    const actual = s.membresias.find(m => m.id === s.miembroId);
    if (actual) this.activarMembresia(actual);
  }

  private activarMembresia(m: MiembroConCuenta): void {
    const { cuenta, ...miembro } = m;
    this.miembro.set(miembro);
    this.cuenta.set(cuenta);
  }

  private limpiar(): void {
    this.admin.set(null);
    this.usuario.set(null);
    this.miembro.set(null);
    this.membresias.set([]);
    this.cuenta.set(null);
  }

  private async restaurarSesion(): Promise<void> {
    try {
      const r = await this.consultarSesion();
      this.aplicar(r.sesion);
      // Un admin que estaba viendo una cuenta como soporte vuelve a ella.
      const cuentaId = this.admin() ? this.leerImpersonacion() : null;
      if (cuentaId) {
        const c = await firstValueFrom(this.http.get<Cuenta>(`${this.api}/cuentas/${cuentaId}`)).catch(() => null);
        if (c) this.cuenta.set(c);
        else this.guardarImpersonacion(null);
      }
    } catch {
      // Backend caído: se arranca sin sesión (el login muestra el error al intentar entrar).
      this.limpiar();
    } finally {
      this.restaurando.set(false);
    }
  }

  // ------------------------------------------------------------ API pública

  /** Inicia sesión con DNI o email (personas y administradores de la plataforma). */
  async login(identificador: string, password: string): Promise<ResultadoLogin> {
    let r: RespuestaSesion;
    try {
      r = await this.post('login', { identificador: identificador.trim(), password });
    } catch (e) {
      return { error: this.mensajeError(e) };
    }
    this.guardarImpersonacion(null);
    this.aplicar(r.sesion);
    this.listo = Promise.resolve();

    const s = r.sesion;
    if (s?.tipo === 'usuario' && !s.miembroId) return { elegir: s.membresias };
    return {};
  }

  /**
   * Abre (o cambia) la cuenta de trabajo de la persona logueada. Cambia la
   * vista al instante y le avisa al backend, que guarda la elección en la sesión.
   * Devuelve false si la membresía no pertenece a la sesión.
   */
  entrarEn(miembroId: string): boolean {
    const m = this.membresias().find(x => x.id === miembroId);
    if (!this.usuario() || !m) return false;
    this.activarMembresia(m);
    this.listo = Promise.resolve();
    this.post('centro', { miembroId }).catch(() => { /* la próxima consulta de sesión lo corrige */ });
    return true;
  }

  /**
   * Recuperación de cuenta (todavía simulada): siempre responde neutro para
   * no revelar si la cuenta existe. El envío real lo hará el backend.
   */
  async recuperarCuenta(identificador: string): Promise<{ ok: boolean; detalle: string }> {
    const id = identificador.trim().toLowerCase();
    if (!id) return { ok: false, detalle: 'Ingresá tu DNI o tu email.' };
    return {
      ok: true,
      detalle: 'Si el DNI o email corresponde a un usuario, vas a recibir un mensaje con los pasos para crear una contraseña nueva. (Simulado: el envío real por email/WhatsApp lo hace el backend.)'
    };
  }

  /** El administrador entra a ver una cuenta como soporte (banner visible en /admin). */
  impersonar(cuenta: Cuenta): void {
    if (!this.admin()) return;
    this.cuenta.set(cuenta);
    this.usuario.set(null);
    this.miembro.set(null);
    this.guardarImpersonacion(cuenta.id);
  }

  /** Sale de la impersonación (vuelve al back-office). */
  dejarDeImpersonar(): void {
    if (!this.admin()) return;
    this.cuenta.set(null);
    this.guardarImpersonacion(null);
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

  /** Cierra la sesión en el backend y limpia la vista al instante. */
  logout(): void {
    this.limpiar();
    this.listo = Promise.resolve();
    this.guardarImpersonacion(null);
    this.post('logout').catch(() => { /* si el backend no responde, la sesión vence sola */ });
  }

  // ------------------------------------------------------- impersonación

  private leerImpersonacion(): string | null {
    try {
      return localStorage.getItem(CLAVE_IMPERSONACION);
    } catch {
      return null;
    }
  }

  private guardarImpersonacion(cuentaId: string | null): void {
    try {
      if (cuentaId) localStorage.setItem(CLAVE_IMPERSONACION, cuentaId);
      else localStorage.removeItem(CLAVE_IMPERSONACION);
      localStorage.removeItem('sp_sesion'); // formato anterior (sesión mock)
    } catch { /* modo privado */ }
  }
}
