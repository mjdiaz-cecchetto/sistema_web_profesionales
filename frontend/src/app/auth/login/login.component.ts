import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { environment } from '../../../environments/environment';

interface CuentaDemo {
  etiqueta: string;
  detalle: string;
  email: string;
  password: string;
  icono: 'consultorio' | 'profesional' | 'admin';
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
      icono: 'consultorio'
    },
    {
      etiqueta: 'Secretaría · Centro San Martín',
      detalle: 'Rol secretaría: agendas y pacientes de todo el equipo',
      email: 'secretaria@centrosanmartin.com.ar',
      password: 'secretaria123',
      icono: 'consultorio'
    },
    {
      etiqueta: 'Lic. Carolina Funes (profesional)',
      detalle: 'Rol profesional: solo su agenda y sus pacientes',
      email: 'carolina.funes@centrosanmartin.com.ar',
      password: 'carolina123',
      icono: 'profesional'
    },
    {
      etiqueta: 'Dra. Elena Ramos',
      detalle: 'Profesional independiente · Psicología',
      email: 'elena.ramos@gmail.com',
      password: 'elena123',
      icono: 'profesional'
    },
    {
      etiqueta: 'Administrador de la Plataforma',
      detalle: 'Back-office · gestión de cuentas',
      email: 'admin@plataforma.com',
      password: 'admin123',
      icono: 'admin'
    }
  ];

  usarDemo(demo: CuentaDemo): void {
    this.email.set(demo.email);
    this.password.set(demo.password);
    this.error.set(null);
  }

  async ingresar(): Promise<void> {
    if (this.enviando()) return;
    if (!this.email().trim() || !this.password()) {
      this.error.set('Completá el email y la contraseña.');
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
