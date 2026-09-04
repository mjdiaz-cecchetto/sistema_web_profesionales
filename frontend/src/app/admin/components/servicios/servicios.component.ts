import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../services/admin.service';
import { ProfesionalPickerComponent } from '../profesional-picker/profesional-picker.component';
import { Service } from '../../../core/models';

/**
 * Gestión de servicios del profesional: nombre, descripción,
 * duración, precio y estado (activo/inactivo). Los servicios
 * inactivos no se ofrecen para turnos nuevos, pero los turnos
 * ya creados conservan su información.
 */
@Component({
  selector: 'app-servicios',
  standalone: true,
  imports: [CommonModule, FormsModule, ProfesionalPickerComponent],
  host: { class: 'block xl:h-full' },
  templateUrl: './servicios.component.html',
  styleUrl: './servicios.component.scss'
})
export class ServiciosComponent {
  adminService = inject(AdminService);

  servicios = computed(() =>
    this.adminService.serviciosDelFoco().slice().sort((a, b) => a.name.localeCompare(b.name))
  );

  // Modal alta/edición
  modalAbierto = signal(false);
  editando = signal<Service | null>(null);
  formNombre = signal('');
  formDescripcion = signal('');
  formDuracion = signal(60);
  formPrecio = signal<number | null>(null);
  formActivo = signal(true);
  mostrarErrores = signal(false);
  guardando = signal(false);

  servicioAEliminar = signal<Service | null>(null);
  toastMensaje = signal('');

  esActivo(srv: Service): boolean {
    return srv.activo !== false;
  }

  /** Cantidad de turnos existentes que usan este servicio (del profesional en foco). */
  usosDe(nombre: string): number {
    const foco = this.adminService.focoId();
    return this.adminService.appointments().filter(a => a.serviceName === nombre && a.profesionalId === foco).length;
  }

  // ---- Validaciones ----
  errorNombre = computed(() => {
    const v = this.formNombre().trim();
    if (!v) return 'El nombre es obligatorio.';
    const idActual = this.editando()?.id;
    if (this.adminService.serviciosDelFoco().some(s => s.name.toLowerCase() === v.toLowerCase() && s.id !== idActual)) {
      return 'Ya existe un servicio con ese nombre.';
    }
    return '';
  });

  errorDescripcion = computed(() => this.formDescripcion().trim() ? '' : 'La descripción es obligatoria.');

  errorDuracion = computed(() => {
    const d = this.formDuracion();
    if (!d || d < 5) return 'Mínimo 5 minutos.';
    if (d > 480) return 'Máximo 8 horas.';
    return '';
  });

  esValido = computed(() => !this.errorNombre() && !this.errorDescripcion() && !this.errorDuracion());

  // ---- Acciones ----
  abrirAlta() {
    this.editando.set(null);
    this.formNombre.set('');
    this.formDescripcion.set('');
    this.formDuracion.set(60);
    this.formPrecio.set(null);
    this.formActivo.set(true);
    this.mostrarErrores.set(false);
    this.toastMensaje.set('');
    this.modalAbierto.set(true);
  }

  abrirEdicion(srv: Service) {
    this.editando.set(srv);
    this.formNombre.set(srv.name);
    this.formDescripcion.set(srv.description);
    this.formDuracion.set(srv.durationMinutes);
    this.formPrecio.set(srv.price ?? null);
    this.formActivo.set(this.esActivo(srv));
    this.mostrarErrores.set(false);
    this.toastMensaje.set('');
    this.modalAbierto.set(true);
  }

  cerrarModal() {
    this.modalAbierto.set(false);
    this.editando.set(null);
  }

  ajustarDuracion(delta: number) {
    this.formDuracion.set(Math.min(480, Math.max(5, (this.formDuracion() || 0) + delta)));
  }

  async guardar() {
    if (this.guardando()) return;
    if (!this.esValido()) {
      this.mostrarErrores.set(true);
      return;
    }

    const datos = {
      name: this.formNombre().trim(),
      description: this.formDescripcion().trim(),
      durationMinutes: this.formDuracion(),
      price: this.formPrecio() ?? undefined,
      activo: this.formActivo()
    };

    this.guardando.set(true);
    const editando = this.editando();
    if (editando) {
      const ok = await this.adminService.updateService(editando.id, datos);
      this.guardando.set(false);
      if (ok) {
        this.cerrarModal();
        this.mostrarToast(`"${datos.name}" se actualizó con éxito.`);
      }
    } else {
      const creado = await this.adminService.addService(datos);
      this.guardando.set(false);
      if (creado) {
        this.cerrarModal();
        this.mostrarToast(`"${creado.name}" se creó con éxito.`);
      }
    }
  }

  async toggleActivo(srv: Service) {
    const nuevoEstado = !this.esActivo(srv);
    const ok = await this.adminService.updateService(srv.id, { activo: nuevoEstado });
    if (ok) {
      this.mostrarToast(nuevoEstado
        ? `"${srv.name}" está activo nuevamente.`
        : `"${srv.name}" quedó inactivo: no se ofrece para turnos nuevos.`);
    }
  }

  pedirEliminacion(srv: Service) {
    this.servicioAEliminar.set(srv);
  }

  async confirmarEliminacion() {
    const srv = this.servicioAEliminar();
    if (!srv || this.guardando()) return;
    this.guardando.set(true);
    const ok = await this.adminService.deleteService(srv.id);
    this.guardando.set(false);
    this.servicioAEliminar.set(null);
    if (ok) this.mostrarToast(`"${srv.name}" fue eliminado.`);
  }

  private mostrarToast(mensaje: string) {
    this.toastMensaje.set(mensaje);
    setTimeout(() => this.toastMensaje.set(''), 5000);
  }
}
