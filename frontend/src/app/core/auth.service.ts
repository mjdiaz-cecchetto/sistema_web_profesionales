import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Administrador, Cuenta } from './models';

const CLAVE_SESION = 'sp_sesion';

/** Lo que se persiste en localStorage. */
interface SesionGuardada {
  tipo: 'admin' | 'cuenta';
  id: string;
  /** Solo admin: cuenta que está viendo como soporte (impersonación). */
  cuentaId?: string;
}

/**
 * Autenticación mock contra json-server. Dos clases de sesión:
 *  - CUENTA (consultorio o profesional independiente): valida contra `cuentas`.
 *  - ADMINISTRADOR de la plataforma: valida contra `administradores` y entra
 *    al back-office /gestion; puede "entrar como" una cuenta (impersonación
 *    de soporte, con banner visible en el panel).
 * En el backend real (Laravel + Sanctum) esto se reemplaza por tokens;
 * la interfaz del servicio se mantiene.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  /** Administrador de plataforma logueado (null si la sesión es de una cuenta). */
  admin = signal<Administrador | null>(null);
  /** Cuenta activa: la logueada, o la que el administrador está impersonando. */
  cuenta = signal<Cuenta | null>(null);
  /** true mientras se restaura la sesión guardada al iniciar la app. */
  restaurando = signal<boolean>(true);

  esConsultorio = computed(() => this.cuenta()?.tipo === 'consultorio');
  esAdmin = computed(() => this.admin() !== null);
  /** true si un administrador está viendo una cuenta como soporte. */
  impersonando = computed(() => this.admin() !== null && this.cuenta() !== null);

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

    if ((s.tipo ?? 'cuenta') === 'admin') {
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
      const c = await this.get<Cuenta>(`${this.api}/cuentas/${s.id}`);
      if (c && c.estado !== 'suspendida') this.cuenta.set(c);
      else this.guardar(null);
    }
    this.restaurando.set(false);
  }

  /** Inicia sesión (administrador o cuenta). Devuelve un mensaje de error o null. */
  async login(email: string, password: string): Promise<string | null> {
    const mail = email.trim().toLowerCase();

    const admins = await this.get<Administrador[]>(`${this.api}/administradores?email=${encodeURIComponent(mail)}`);
    if (admins === null) return 'No se pudo conectar con el servidor. ¿Está corriendo la API local?';
    const adm = admins.find(a => a.email.toLowerCase() === mail);
    if (adm) {
      if (adm.password !== password) return 'Email o contraseña incorrectos.';
      this.admin.set(adm);
      this.cuenta.set(null);
      this.listo = Promise.resolve();
      this.guardar({ tipo: 'admin', id: adm.id });
      return null;
    }

    const cuentas = await this.get<Cuenta[]>(`${this.api}/cuentas?email=${encodeURIComponent(mail)}`);
    if (cuentas === null) return 'No se pudo conectar con el servidor. ¿Está corriendo la API local?';
    const cuenta = cuentas.find(c => c.email.toLowerCase() === mail);
    if (!cuenta || cuenta.password !== password) return 'Email o contraseña incorrectos.';
    if (cuenta.estado === 'suspendida') return 'Esta cuenta está suspendida. Contactate con el administrador de la plataforma.';

    this.admin.set(null);
    this.cuenta.set(cuenta);
    this.listo = Promise.resolve();
    this.guardar({ tipo: 'cuenta', id: cuenta.id });
    return null;
  }

  /** El administrador entra a ver una cuenta como soporte (banner visible en /admin). */
  impersonar(cuenta: Cuenta): void {
    const adm = this.admin();
    if (!adm) return;
    this.cuenta.set(cuenta);
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
    this.listo = Promise.resolve();
    this.guardar(null);
  }
}
