import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Administrador, Cuenta, RolUsuario, Usuario } from './models';

const CLAVE_SESION = 'sp_sesion';

/** Lo que se persiste en localStorage. */
interface SesionGuardada {
  tipo: 'admin' | 'cuenta' | 'usuario';
  id: string;
  /** Solo admin: cuenta que está viendo como soporte (impersonación). */
  cuentaId?: string;
}

/**
 * Autenticación mock contra json-server. Tres clases de sesión:
 *  - CUENTA (email de la Cuenta): es el DUEÑO del consultorio/cuenta.
 *  - USUARIO del equipo (colección `usuarios`): secretaría o profesional,
 *    creado por el dueño. Entra al mismo /admin con permisos por rol.
 *  - ADMINISTRADOR de la plataforma: back-office /gestion; puede
 *    "entrar como" una cuenta (impersonación de soporte, rol dueño).
 * En el backend real (Laravel + Sanctum) esto se reemplaza por tokens;
 * la interfaz del servicio se mantiene.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  /** Administrador de plataforma logueado (null si la sesión es de una cuenta). */
  admin = signal<Administrador | null>(null);
  /** Cuenta activa: la del dueño logueado, la del usuario del equipo, o la impersonada. */
  cuenta = signal<Cuenta | null>(null);
  /** Usuario del equipo logueado (null si entró el dueño o un admin). */
  usuario = signal<Usuario | null>(null);
  /** true mientras se restaura la sesión guardada al iniciar la app. */
  restaurando = signal<boolean>(true);

  esConsultorio = computed(() => this.cuenta()?.tipo === 'consultorio');
  esAdmin = computed(() => this.admin() !== null);
  /** true si un administrador está viendo una cuenta como soporte. */
  impersonando = computed(() => this.admin() !== null && this.cuenta() !== null);

  /** Rol dentro del panel: dueño (login de la cuenta o impersonación) o el rol del usuario. */
  rol = computed<RolUsuario>(() => this.usuario()?.rol ?? 'duenio');
  esDuenio = computed(() => this.rol() === 'duenio');
  esSecretaria = computed(() => this.rol() === 'secretaria');
  esProfesionalRol = computed(() => this.rol() === 'profesional');
  /** Id del profesional al que está atado el usuario (solo rol profesional). */
  profesionalIdUsuario = computed(() => this.usuario()?.profesionalId ?? null);

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

  /** Ruta inicial según la sesión: gestión para el admin, panel para las cuentas. */
  destino(): string {
    return this.esAdmin() && !this.impersonando() ? '/gestion' : '/admin';
  }

  private leerGuardada(): SesionGuardada | null {
    try {
      const s = JSON.parse(localStorage.getItem(CLAVE_SESION) || 'null');
      return s && s.id ? s : null;
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

  private async restaurarSesion(): Promise<void> {
    const s = this.leerGuardada();
    if (!s) { this.restaurando.set(false); return; }

    const tipo = s.tipo ?? 'cuenta';
    if (tipo === 'admin') {
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
    } else if (tipo === 'usuario') {
      const u = await this.get<Usuario>(`${this.api}/usuarios/${s.id}`);
      const c = u ? await this.get<Cuenta>(`${this.api}/cuentas/${u.cuentaId}`) : null;
      if (u && u.activo !== false && c && c.estado !== 'suspendida') {
        this.usuario.set(u);
        this.cuenta.set(c);
      } else {
        this.guardar(null);
      }
    } else {
      const c = await this.get<Cuenta>(`${this.api}/cuentas/${s.id}`);
      if (c && c.estado !== 'suspendida') this.cuenta.set(c);
      else this.guardar(null);
    }
    this.restaurando.set(false);
  }

  /** Inicia sesión (administrador, dueño de cuenta o usuario del equipo). Devuelve un mensaje de error o null. */
  async login(email: string, password: string): Promise<string | null> {
    const mail = email.trim().toLowerCase();
    const ERROR_CONEXION = 'No se pudo conectar con el servidor. ¿Está corriendo la API local?';

    // 1) Administradores de la plataforma
    const admins = await this.get<Administrador[]>(`${this.api}/administradores?email=${encodeURIComponent(mail)}`);
    if (admins === null) return ERROR_CONEXION;
    const adm = admins.find(a => a.email.toLowerCase() === mail);
    if (adm) {
      if (adm.password !== password) return 'Email o contraseña incorrectos.';
      this.setSesion({ admin: adm });
      this.guardar({ tipo: 'admin', id: adm.id });
      return null;
    }

    // 2) Dueños (el email de la Cuenta)
    const cuentas = await this.get<Cuenta[]>(`${this.api}/cuentas?email=${encodeURIComponent(mail)}`);
    if (cuentas === null) return ERROR_CONEXION;
    const cuenta = cuentas.find(c => c.email.toLowerCase() === mail);
    if (cuenta) {
      if (cuenta.password !== password) return 'Email o contraseña incorrectos.';
      if (cuenta.estado === 'suspendida') return 'Esta cuenta está suspendida. Contactate con el administrador de la plataforma.';
      this.setSesion({ cuenta });
      this.guardar({ tipo: 'cuenta', id: cuenta.id });
      return null;
    }

    // 3) Usuarios del equipo (secretaría / profesional)
    const usuarios = await this.get<Usuario[]>(`${this.api}/usuarios?email=${encodeURIComponent(mail)}`);
    if (usuarios === null) return ERROR_CONEXION;
    const usuario = usuarios.find(u => u.email.toLowerCase() === mail);
    if (!usuario || usuario.password !== password) return 'Email o contraseña incorrectos.';
    if (usuario.activo === false) return 'Tu usuario está desactivado. Hablá con el administrador del consultorio.';

    const cuentaUsuario = await this.get<Cuenta>(`${this.api}/cuentas/${usuario.cuentaId}`);
    if (!cuentaUsuario) return ERROR_CONEXION;
    if (cuentaUsuario.estado === 'suspendida') return 'La cuenta del consultorio está suspendida. Contactate con el administrador de la plataforma.';

    this.setSesion({ cuenta: cuentaUsuario, usuario });
    this.guardar({ tipo: 'usuario', id: usuario.id });
    return null;
  }

  private setSesion(s: { admin?: Administrador; cuenta?: Cuenta; usuario?: Usuario }): void {
    this.admin.set(s.admin ?? null);
    this.cuenta.set(s.cuenta ?? null);
    this.usuario.set(s.usuario ?? null);
    this.listo = Promise.resolve();
  }

  /** El administrador entra a ver una cuenta como soporte (banner visible en /admin, rol dueño). */
  impersonar(cuenta: Cuenta): void {
    const adm = this.admin();
    if (!adm) return;
    this.cuenta.set(cuenta);
    this.usuario.set(null);
    this.guardar({ tipo: 'admin', id: adm.id, cuentaId: cuenta.id });
  }

  /** Sale de la impersonación (vuelve al back-office). */
  dejarDeImpersonar(): void {
    const adm = this.admin();
    if (!adm) return;
    this.cuenta.set(null);
    this.guardar({ tipo: 'admin', id: adm.id });
  }

  logout(): void {
    this.admin.set(null);
    this.cuenta.set(null);
    this.usuario.set(null);
    this.listo = Promise.resolve();
    this.guardar(null);
  }
}
