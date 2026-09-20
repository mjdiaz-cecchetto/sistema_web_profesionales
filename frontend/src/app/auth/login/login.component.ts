import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { environment } from '../../../environments/environment';

interface CuentaDemo {
  etiqueta: string;
  detalle: string;
  /** Credencial de acceso: email (dueños/admin) o DNI (usuarios del equipo). */
  email: string;
  password: string;
  icono: 'consultorio' | 'profesional' | 'admin';
  /** Chip de rol que se muestra en la card. */
  rol: string;
  /** Clases del chip (fondo/texto/borde pastel). */
  rolClase: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  email = signal('');
  password = signal('');
  verPassword = signal(false);
  enviando = signal(false);
  error = signal<string | null>(null);

  /** Solo entorno de desarrollo: oculta las credenciales demo en producción. */
  readonly mostrarDemos = environment.demoCredenciales === true;

  /** Accesos de demostración (coinciden con el seed de la API local). */
  readonly demos: CuentaDemo[] = [
    {
      etiqueta: 'Centro Médico San Martín',
      detalle: 'Consultorio · 5 profesionales · varias especialidades',
      email: 'admin@centrosanmartin.com.ar',
      password: 'consultorio123',
      icono: 'consultorio',
      rol: 'Dueño',
      rolClase: 'bg-teal-100 text-teal-900 border-teal-200'
    },
    {
      etiqueta: 'Rocío Méndez · secretaría general',
      detalle: 'Entra con DNI · agendas y pacientes de todo el centro',
      email: '28456123',
      password: 'secretaria123',
      icono: 'consultorio',
      rol: 'Secretaría',
      rolClase: 'bg-violet-50 text-violet-800 border-violet-200'
    },
    {
      etiqueta: 'Valeria Suárez · secretaría de la Od. Ríos',
      detalle: 'Entra con DNI · solo la agenda de la Od. Paula Ríos',
      email: '33780415',
      password: 'valeria123',
      icono: 'consultorio',
      rol: 'Secretaría',
      rolClase: 'bg-violet-50 text-violet-800 border-violet-200'
    },
    {
      etiqueta: 'Lic. Carolina Funes (profesional)',
      detalle: 'Entra con DNI · solo su agenda y sus pacientes',
      email: '27912384',
      password: 'carolina123',
      icono: 'profesional',
      rol: 'Profesional',
      rolClase: 'bg-sky-50 text-sky-800 border-sky-200'
    },
    {
      etiqueta: 'Dra. Elena Ramos',
      detalle: 'Entra con DNI · profesional independiente · Psicología',
      email: '24853917',
      password: 'elena123',
      icono: 'profesional',
      rol: 'Independiente',
      rolClase: 'bg-amber-50 text-amber-800 border-amber-200'
    },
    {
      etiqueta: 'Administrador de la Plataforma',
      detalle: 'Back-office · gestión de cuentas',
      email: 'admin@plataforma.com',
      password: 'admin123',
      icono: 'admin',
      rol: 'Plataforma',
      rolClase: 'bg-stone-800 text-white border-stone-700'
    }
  ];

  usarDemo(demo: CuentaDemo): void {
    this.email.set(demo.email);
    this.password.set(demo.password);
    this.error.set(null);
  }

  // ---- Recuperación de cuenta (mock) ----
  modoRecuperar = signal(false);
  recuperarId = signal('');
  recuperarMsg = signal<string | null>(null);
  recuperando = signal(false);

  abrirRecuperar(): void {
    this.modoRecuperar.set(true);
    this.recuperarId.set(this.email());
    this.recuperarMsg.set(null);
    this.error.set(null);
  }

  async recuperar(): Promise<void> {
    if (this.recuperando()) return;
    this.recuperando.set(true);
    const r = await this.auth.recuperarCuenta(this.recuperarId());
    this.recuperando.set(false);
    this.recuperarMsg.set(r.detalle);
  }

  async ingresar(): Promise<void> {
    if (this.enviando()) return;
    if (!this.email().trim() || !this.password()) {
      this.error.set('Completá tu email o DNI y la contraseña.');
      return;
    }
    this.enviando.set(true);
    this.error.set(null);
    const err = await this.auth.login(this.email(), this.password());
    this.enviando.set(false);
    if (err) {
      this.error.set(err);
      return;
    }
    this.router.navigateByUrl(this.auth.destino());
  }
}
