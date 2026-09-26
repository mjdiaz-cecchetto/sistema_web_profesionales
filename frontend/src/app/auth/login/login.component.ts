import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { MiembroConCuenta } from '../../core/models';
import { environment } from '../../../environments/environment';

interface CuentaDemo {
  etiqueta: string;
  detalle: string;
  /** Credencial de acceso: DNI (o email) de la persona; email para el admin de plataforma. */
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
      etiqueta: 'Laura Benítez · administración San Martín',
      detalle: 'Administra el centro · no atiende pacientes',
      email: '30112233',
      password: 'consultorio123',
      icono: 'consultorio',
      rol: 'Administrador',
      rolClase: 'bg-teal-100 text-teal-900 border-teal-200'
    },
    {
      etiqueta: 'Dr. Gustavo Lema · director',
      detalle: 'Administra San Martín y además atiende (psiquiatría)',
      email: '20345678',
      password: 'lema1234',
      icono: 'consultorio',
      rol: 'Admin + atiende',
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
      detalle: 'Su cuenta independiente + profesional en San Martín (elige centro)',
      email: '24853917',
      password: 'elena123',
      icono: 'profesional',
      rol: 'Multi-centro',
      rolClase: 'bg-amber-50 text-amber-800 border-amber-200'
    },
    {
      etiqueta: 'Julieta Paz · secretaria de la Dra. Ramos',
      detalle: 'Secretaría de una cuenta independiente',
      email: '36544210',
      password: 'julieta123',
      icono: 'profesional',
      rol: 'Secretaría',
      rolClase: 'bg-violet-50 text-violet-800 border-violet-200'
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

  // ---- Paso 2: selector de centro (personas con varias membresías) ----
  centros = signal<MiembroConCuenta[] | null>(null);

  etiquetaRol(m: MiembroConCuenta): string {
    switch (m.rol) {
      case 'secretaria': return 'Secretaría';
      case 'profesional': return 'Profesional';
      default: return m.profesionalId ? 'Administrador · atiende' : 'Administrador';
    }
  }

  elegirCentro(miembroId: string): void {
    if (this.auth.entrarEn(miembroId)) this.router.navigateByUrl(this.auth.destino());
  }

  volverAlLogin(): void {
    this.auth.logout();
    this.centros.set(null);
    this.password.set('');
  }

  async ingresar(): Promise<void> {
    if (this.enviando()) return;
    if (!this.email().trim() || !this.password()) {
      this.error.set('Completá tu email o DNI y la contraseña.');
      return;
    }
    this.enviando.set(true);
    this.error.set(null);
    const r = await this.auth.login(this.email(), this.password());
    this.enviando.set(false);
    if (r.error) {
      this.error.set(r.error);
      return;
    }
    if (r.elegir) {
      this.centros.set(r.elegir);
      return;
    }
    this.router.navigateByUrl(this.auth.destino());
  }
}
