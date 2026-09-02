import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Cuenta } from './models';

const CLAVE_SESION = 'sp_sesion';

/**
 * Autenticación mock contra json-server.
 * Valida email + contraseña contra la colección `cuentas` y guarda la
 * sesión en localStorage. En el backend real (Laravel + Sanctum) esto
 * se reemplaza por tokens; la interfaz del servicio se mantiene.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  /** Cuenta logueada (null si no hay sesión). */
  cuenta = signal<Cuenta | null>(null);
  /** true mientras se restaura la sesión guardada al iniciar la app. */
  restaurando = signal<boolean>(true);

  esConsultorio = computed(() => this.cuenta()?.tipo === 'consultorio');

  /** Promesa que resuelve cuando la sesión guardada terminó de restaurarse. */
  private listo: Promise<Cuenta | null>;

  constructor() {
    this.listo = this.restaurarSesion();
  }

  /** Espera a que la sesión esté restaurada y devuelve la cuenta (o null). */
  sesion(): Promise<Cuenta | null> {
    return this.listo;
  }

  private restaurarSesion(): Promise<Cuenta | null> {
    return new Promise(resolve => {
      let id = '';
      try {
        id = JSON.parse(localStorage.getItem(CLAVE_SESION) || '{}').id || '';
      } catch { /* sesión corrupta: se ignora */ }

      if (!id) {
        this.restaurando.set(false);
        resolve(null);
        return;
      }

      this.http.get<Cuenta>(`${this.api}/cuentas/${id}`).subscribe({
        next: c => {
          this.cuenta.set(c);
          this.restaurando.set(false);
          resolve(c);
        },
        error: () => {
          localStorage.removeItem(CLAVE_SESION);
          this.restaurando.set(false);
          resolve(null);
        }
      });
    });
  }

  /** Inicia sesión. Devuelve un mensaje de error o null si salió bien. */
  login(email: string, password: string): Promise<string | null> {
    const mail = email.trim().toLowerCase();
    return new Promise(resolve => {
      this.http.get<Cuenta[]>(`${this.api}/cuentas?email=${encodeURIComponent(mail)}`).subscribe({
        next: cuentas => {
          const cuenta = cuentas.find(c => c.email.toLowerCase() === mail);
          if (!cuenta || cuenta.password !== password) {
            resolve('Email o contraseña incorrectos.');
            return;
          }
          this.cuenta.set(cuenta);
          this.listo = Promise.resolve(cuenta);
          try { localStorage.setItem(CLAVE_SESION, JSON.stringify({ id: cuenta.id })); } catch { /* modo privado */ }
          resolve(null);
        },
        error: () => resolve('No se pudo conectar con el servidor. ¿Está corriendo la API local?')
      });
    });
  }

  logout(): void {
    this.cuenta.set(null);
    this.listo = Promise.resolve(null);
    try { localStorage.removeItem(CLAVE_SESION); } catch { /* noop */ }
  }
}
