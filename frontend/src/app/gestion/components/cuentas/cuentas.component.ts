import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Cuenta } from '../../../core/models';
import { AuthService } from '../../../core/auth.service';
import { GestionService } from '../../services/gestion.service';
import { CuentaModalComponent } from '../cuenta-modal/cuenta-modal.component';

/**
 * Listado y gestión de cuentas (tenants) de la plataforma.
 * Muestra solo totales agregados: nunca datos de pacientes ni turnos.
 */
@Component({
  selector: 'app-gestion-cuentas',
  standalone: true,
  imports: [CommonModule, CuentaModalComponent],
  templateUrl: './cuentas.component.html',
  styleUrl: './cuentas.component.scss'
})
export class CuentasComponent implements OnInit {
  gestion = inject(GestionService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  /** Cuenta en edición en el modal; 'nueva' = alta. */
  modal = signal<Cuenta | 'nueva' | null>(null);
  /** id de la cuenta cuya suspensión espera confirmación (doble clic). */
  confirmandoId = signal<string>('');
  toast = signal<string>('');
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private confirmTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    // El layout de gestión ya dispara la carga; acá solo recargamos si se entró directo.
    if (this.gestion.cuentas().length === 0 && !this.gestion.loading()) this.gestion.cargar();
    if (this.route.snapshot.queryParamMap.get('nueva')) this.modal.set('nueva');
  }

  nombrePlan(id: string): string {
    return this.gestion.nombrePlan(id);
  }

  pagoPendiente(c: Cuenta): boolean {
    return this.gestion.cobranza(c) === 'vencida';
  }

  urlPublica(c: Cuenta): string {
    return (c.tipo === 'consultorio' ? '/c/' : '/p/') + c.slug;
  }

  metrica(id: string) {
    return this.gestion.metricas()[id] ?? { profesionales: 0, pacientes: 0, turnosMes: 0, ultimoTurno: '' };
  }

  fechaCorta(iso: string): string {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y.slice(2)}`;
  }

  entrarComo(c: Cuenta): void {
    this.auth.impersonar(c);
    this.router.navigate(['/admin']);
  }

  /** Suspender/reactivar con confirmación en el mismo botón (dos clics). */
  async toggleEstado(c: Cuenta): Promise<void> {
    if (c.estado !== 'suspendida' && this.confirmandoId() !== c.id) {
      this.confirmandoId.set(c.id);
      if (this.confirmTimer) clearTimeout(this.confirmTimer);
      this.confirmTimer = setTimeout(() => this.confirmandoId.set(''), 4000);
      return;
    }
    this.confirmandoId.set('');
    const nuevo = c.estado === 'suspendida' ? 'activa' : 'suspendida';
    const ok = await this.gestion.actualizarCuenta(c.id, { estado: nuevo });
    this.mostrarToast(ok
      ? (nuevo === 'suspendida'
          ? `${c.nombre} quedó suspendida: no puede ingresar y su página pública está oculta.`
          : `${c.nombre} fue reactivada.`)
      : 'No se pudo actualizar la cuenta.');
  }

  onGuardada(evento: { cuenta: Cuenta; esNueva: boolean }): void {
    this.modal.set(null);
    this.mostrarToast(evento.esNueva
      ? `Cuenta "${evento.cuenta.nombre}" creada. Ya puede ingresar con ${evento.cuenta.email}.`
      : `Los datos de "${evento.cuenta.nombre}" se actualizaron.`);
  }

  mostrarToast(msj: string): void {
    this.toast.set(msj);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set(''), 4500);
  }
}
