import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/auth.service';

interface CuentaDemo {
  etiqueta: string;
  detalle: string;
  email: string;
  password: string;
  icono: 'consultorio' | 'profesional';
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  email = signal('');
  password = signal('');
  verPassword = signal(false);
  enviando = signal(false);
  error = signal<string | null>(null);

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
      etiqueta: 'Dra. Elena Ramos',
      detalle: 'Profesional independiente · Psicología',
      email: 'elena.ramos@gmail.com',
      password: 'elena123',
      icono: 'profesional'
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
    this.router.navigate(['/admin']);
  }
}
