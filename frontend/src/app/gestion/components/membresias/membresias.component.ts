import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Plan } from '../../../core/models';
import { GestionService } from '../../services/gestion.service';

/** Planes de membresía de la plataforma: CRUD sobre la colección `planes`. */
@Component({
  selector: 'app-gestion-membresias',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './membresias.component.html',
  styleUrl: './membresias.component.scss'
})
export class MembresiasComponent {
  gestion = inject(GestionService);

  /** Plan en edición; 'nuevo' = alta; null = modal cerrado. */
  modal = signal<Plan | 'nuevo' | null>(null);
  nombre = signal('');
  precio = signal<number>(0);
  descripcion = signal('');
  maxProfesionales = signal<number>(1);
  activo = signal(true);
  error = signal<string | null>(null);
  toast = signal('');
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  abrir(plan: Plan | 'nuevo'): void {
    this.error.set(null);
    if (plan === 'nuevo') {
      this.nombre.set('');
      this.precio.set(0);
      this.descripcion.set('');
      this.maxProfesionales.set(1);
      this.activo.set(true);
    } else {
      this.nombre.set(plan.nombre);
      this.precio.set(plan.precioMensual);
      this.descripcion.set(plan.descripcion);
      this.maxProfesionales.set(plan.maxProfesionales);
      this.activo.set(plan.activo);
    }
    this.modal.set(plan);
  }

  monto(valor: number): string {
    return '$ ' + valor.toLocaleString('es-AR');
  }

  usos(planId: string): number {
    return this.gestion.cuentasConPlan(planId);
  }

  async guardar(): Promise<void> {
    if (this.gestion.saving()) return;
    if (!this.nombre().trim()) { this.error.set('Ingresá el nombre del plan.'); return; }
    if (this.precio() < 0) { this.error.set('El precio no puede ser negativo.'); return; }
    const m = this.modal();
    const nombreUsado = this.gestion.planes().some(p =>
      p.nombre.toLowerCase() === this.nombre().trim().toLowerCase() && (m === 'nuevo' || p.id !== m?.id));
    if (nombreUsado) { this.error.set('Ya existe un plan con ese nombre.'); return; }
    this.error.set(null);

    const datos = {
      nombre: this.nombre().trim(),
      precioMensual: this.precio(),
      descripcion: this.descripcion().trim(),
      maxProfesionales: this.maxProfesionales(),
      activo: this.activo()
    };
    const ok = m === 'nuevo'
      ? (await this.gestion.crearPlan(datos)) !== null
      : await this.gestion.actualizarPlan((m as Plan).id, datos);
    if (!ok) { this.error.set('No se pudo guardar. ¿Está corriendo la API local?'); return; }
    this.modal.set(null);
    this.mostrarToast(m === 'nuevo' ? `Plan "${datos.nombre}" creado.` : `Plan "${datos.nombre}" actualizado.`);
  }

  async toggleActivo(plan: Plan): Promise<void> {
    const ok = await this.gestion.actualizarPlan(plan.id, { activo: !plan.activo });
    if (ok) {
      this.mostrarToast(plan.activo
        ? `"${plan.nombre}" ya no se ofrece para cuentas nuevas (las existentes lo conservan).`
        : `"${plan.nombre}" vuelve a estar disponible.`);
    }
  }

  mostrarToast(msj: string): void {
    this.toast.set(msj);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set(''), 4500);
  }
}
