import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../services/admin.service';
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
  imports: [CommonModule, FormsModule],
  host: { class: 'block xl:h-full' },
  template: `
    <div class="xl:h-full flex flex-col gap-3 animate-fade-in min-h-0">

      <!-- Toast flotante -->
      <div *ngIf="toastMensaje()"
           class="fixed top-24 left-1/2 -translate-x-1/2 z-[60] bg-emerald-100 border border-emerald-300 text-emerald-900 px-5 py-3 rounded-2xl text-sm font-bold flex items-center gap-2.5 animate-scale-in max-w-[calc(100vw-2rem)]">
        <svg class="w-5 h-5 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <span>{{ toastMensaje() }}</span>
        <button (click)="toastMensaje.set('')" class="text-emerald-500 hover:text-emerald-800 font-black leading-none ml-1">×</button>
      </div>

      <!-- Encabezado -->
      <div class="flex items-center justify-between gap-2.5 shrink-0">
        <div class="flex items-center gap-2">
          <h1 class="text-lg font-extrabold text-stone-800 tracking-tight">Servicios</h1>
          <span class="chip !text-[10px] bg-teal-100 text-teal-900 border-teal-200">{{ servicios().length }}</span>
        </div>
        <button (click)="abrirAlta()" class="btn-primary !text-xs !py-2.5 flex items-center justify-center gap-2 shrink-0">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
          <span class="hidden sm:inline">Nuevo Servicio</span>
          <span class="sm:hidden">Nuevo</span>
        </button>
      </div>

      <p class="text-xs text-stone-400 shrink-0 -mt-1">
        Estos son los motivos de consulta que ven tus pacientes al reservar. Los inactivos no se ofrecen para turnos nuevos.
      </p>

      <!-- Listado -->
      <div class="flex-1 min-h-0 overflow-y-auto max-h-[65vh] xl:max-h-none">
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 pb-2">
          <div *ngFor="let srv of servicios()"
               class="card p-4 flex flex-col gap-3 transition-colors"
               [ngClass]="esActivo(srv) ? 'hover:border-teal-300' : 'opacity-70 bg-stone-50'">

            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <h3 class="font-extrabold text-stone-800 text-sm truncate">{{ srv.name }}</h3>
                  <span class="chip !text-[9px]"
                        [ngClass]="esActivo(srv) ? 'chip-confirmed' : 'bg-stone-100 text-stone-500 border-stone-200'">
                    {{ esActivo(srv) ? 'Activo' : 'Inactivo' }}
                  </span>
                </div>
                <p class="text-[11px] text-stone-500 mt-1 line-clamp-2">{{ srv.description }}</p>
              </div>

              <!-- Switch activo -->
              <label class="relative inline-flex items-center cursor-pointer select-none shrink-0" [title]="esActivo(srv) ? 'Desactivar' : 'Activar'">
                <input type="checkbox" [checked]="esActivo(srv)" (change)="toggleActivo(srv)" class="sr-only peer">
                <div class="w-9 h-5 bg-stone-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-[14px] after:w-[14px] after:transition-all after:shadow-sm peer-checked:bg-teal-400"></div>
              </label>
            </div>

            <div class="flex items-center gap-2 flex-wrap">
              <span class="inline-flex items-center gap-1 bg-stone-100 text-stone-600 border border-stone-200 px-2 py-1 rounded-lg text-[10px] font-bold">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                {{ srv.durationMinutes }} min
              </span>
              <span *ngIf="srv.price" class="inline-flex items-center gap-1 bg-teal-50 text-teal-800 border border-teal-200 px-2 py-1 rounded-lg text-[10px] font-bold">
                $ {{ srv.price | number:'1.0-0':'es-AR' }}
              </span>
              <span class="text-[10px] text-stone-400 font-semibold ml-auto">
                {{ usosDe(srv.name) }} {{ usosDe(srv.name) === 1 ? 'turno' : 'turnos' }}
              </span>
            </div>

            <div class="flex gap-1.5 mt-auto pt-2 border-t border-stone-100">
              <button (click)="abrirEdicion(srv)"
                      class="flex-1 bg-white hover:bg-teal-50 hover:text-teal-800 border border-stone-200 hover:border-teal-300 text-stone-500 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-colors flex items-center justify-center gap-1">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                Editar
              </button>
              <button (click)="pedirEliminacion(srv)"
                      class="bg-white hover:bg-rose-50 hover:text-rose-700 border border-stone-200 hover:border-rose-200 text-stone-400 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-colors">
                Eliminar
              </button>
            </div>
          </div>

          <!-- Estado vacío -->
          <div *ngIf="servicios().length === 0" class="col-span-full py-14 text-center space-y-3">
            <div class="w-14 h-14 mx-auto rounded-2xl bg-stone-100 flex items-center justify-center">
              <svg class="w-7 h-7 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
            </div>
            <p class="text-sm text-stone-500">Todavía no tenés servicios cargados.</p>
            <button (click)="abrirAlta()" class="text-xs text-teal-700 font-bold hover:underline">Crear el primero</button>
          </div>
        </div>
      </div>

      <!-- ===== Modal alta/edición ===== -->
      <ng-container *ngIf="modalAbierto()">
        <div class="fixed inset-0 z-[70] bg-stone-500/40 backdrop-blur-sm animate-fade-in" (click)="cerrarModal()"></div>
        <div class="fixed inset-x-0 bottom-0 sm:inset-0 z-[80] sm:flex sm:items-center sm:justify-center pointer-events-none">
          <div class="pointer-events-auto bg-white w-full sm:max-w-lg sm:mx-4 rounded-t-3xl sm:rounded-3xl border border-stone-200 max-h-[92vh] flex flex-col animate-scale-in">

            <div class="px-5 sm:px-7 py-4 border-b border-stone-100 flex items-center justify-between shrink-0">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-teal-100 border border-teal-200 text-teal-800 flex items-center justify-center">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                </div>
                <div>
                  <h3 class="font-extrabold text-stone-800 text-base leading-none">{{ editando() ? 'Editar Servicio' : 'Nuevo Servicio' }}</h3>
                  <p class="text-[11px] text-stone-400 mt-1">Es lo que el paciente elige como motivo de consulta.</p>
                </div>
              </div>
              <button (click)="cerrarModal()" class="p-2 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            <div class="flex-grow overflow-y-auto px-5 sm:px-7 py-5 space-y-3.5">
              <div class="space-y-1">
                <label class="field-label">Nombre *</label>
                <input type="text" [ngModel]="formNombre()" (ngModelChange)="formNombre.set($event)"
                       placeholder="Ej. Consulta, Terapia de Pareja..." class="input !text-xs"
                       [class.!border-rose-300]="mostrarErrores() && errorNombre()">
                <p *ngIf="mostrarErrores() && errorNombre()" class="text-[10px] font-bold text-rose-600">{{ errorNombre() }}</p>
              </div>

              <div class="space-y-1">
                <label class="field-label">Descripción *</label>
                <textarea [ngModel]="formDescripcion()" (ngModelChange)="formDescripcion.set($event)" rows="2"
                          placeholder="El paciente la ve al elegir el motivo de consulta."
                          class="input !text-xs resize-none"
                          [class.!border-rose-300]="mostrarErrores() && errorDescripcion()"></textarea>
                <p *ngIf="mostrarErrores() && errorDescripcion()" class="text-[10px] font-bold text-rose-600">{{ errorDescripcion() }}</p>
              </div>

              <div class="grid grid-cols-2 gap-3.5">
                <div class="space-y-1">
                  <label class="field-label">Duración (minutos) *</label>
                  <div class="flex items-center gap-1.5">
                    <button (click)="ajustarDuracion(-15)" class="w-9 h-9 rounded-lg border border-stone-200 bg-white text-stone-600 font-black hover:bg-stone-50 transition-colors shrink-0">−</button>
                    <input type="number" [ngModel]="formDuracion()" (ngModelChange)="formDuracion.set(+$event)"
                           min="5" step="5" class="input !text-xs text-center"
                           [class.!border-rose-300]="mostrarErrores() && errorDuracion()">
                    <button (click)="ajustarDuracion(15)" class="w-9 h-9 rounded-lg border border-stone-200 bg-white text-stone-600 font-black hover:bg-stone-50 transition-colors shrink-0">+</button>
                  </div>
                  <p *ngIf="mostrarErrores() && errorDuracion()" class="text-[10px] font-bold text-rose-600">{{ errorDuracion() }}</p>
                </div>

                <div class="space-y-1">
                  <label class="field-label">Precio ($, opcional)</label>
                  <input type="number" [ngModel]="formPrecio()" (ngModelChange)="formPrecio.set($event === '' || $event === null ? null : +$event)"
                         min="0" placeholder="Ej. 25000" class="input !text-xs">
                  <p class="text-[10px] text-stone-400">Dejalo vacío si preferís no mostrarlo.</p>
                </div>
              </div>

              <label class="flex items-center gap-2.5 cursor-pointer select-none pt-1">
                <input type="checkbox" [ngModel]="formActivo()" (ngModelChange)="formActivo.set($event)"
                       class="w-4 h-4 rounded border-stone-300 text-teal-600 focus:ring-teal-200">
                <span class="text-xs font-semibold text-stone-600">Servicio activo (disponible para turnos nuevos)</span>
              </label>
            </div>

            <div class="px-5 sm:px-7 py-4 border-t border-stone-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0 bg-stone-50/60 rounded-b-3xl">
              <button (click)="cerrarModal()" class="btn-ghost !py-2.5 text-center">Cancelar</button>
              <button (click)="guardar()" [disabled]="guardando()" class="btn-primary !text-xs !py-3 text-center">
                {{ guardando() ? 'Guardando…' : editando() ? 'Guardar Cambios' : 'Crear Servicio' }}
              </button>
            </div>
          </div>
        </div>
      </ng-container>

      <!-- ===== Confirmación de eliminación ===== -->
      <ng-container *ngIf="servicioAEliminar() as srv">
        <div class="fixed inset-0 z-[70] bg-stone-500/40 backdrop-blur-sm animate-fade-in" (click)="servicioAEliminar.set(null)"></div>
        <div class="fixed inset-x-0 bottom-0 sm:inset-0 z-[80] sm:flex sm:items-center sm:justify-center pointer-events-none">
          <div class="pointer-events-auto bg-white w-full sm:max-w-md sm:mx-4 rounded-t-3xl sm:rounded-3xl border border-stone-200 p-6 space-y-4 animate-scale-in">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              </div>
              <div>
                <h3 class="font-extrabold text-stone-800 text-sm">¿Eliminar "{{ srv.name }}"?</h3>
                <p class="text-[11px] text-stone-500 mt-0.5">
                  {{ usosDe(srv.name) > 0
                    ? 'Hay ' + usosDe(srv.name) + ' turnos con este servicio: conservarán su información, pero no podrás volver a usarlo.'
                    : 'Esta acción no se puede deshacer.' }}
                </p>
              </div>
            </div>
            <p class="text-[11px] text-stone-500 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2">
              Sugerencia: si solo querés dejar de ofrecerlo, es mejor <span class="font-bold">desactivarlo</span> con el switch.
            </p>
            <div class="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
              <button (click)="servicioAEliminar.set(null)" class="btn-ghost !py-2.5 text-center">Cancelar</button>
              <button (click)="confirmarEliminacion()" [disabled]="guardando()"
                      class="bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 px-5 py-2.5 rounded-xl text-xs font-bold transition-colors">
                {{ guardando() ? 'Eliminando…' : 'Eliminar Definitivamente' }}
              </button>
            </div>
          </div>
        </div>
      </ng-container>

    </div>
  `
})
export class ServiciosComponent {
  private adminService = inject(AdminService);

  servicios = computed(() =>
    this.adminService.services().slice().sort((a, b) => a.name.localeCompare(b.name))
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

  /** Cantidad de turnos existentes que usan este servicio. */
  usosDe(nombre: string): number {
    return this.adminService.appointments().filter(a => a.serviceName === nombre).length;
  }

  // ---- Validaciones ----
  errorNombre = computed(() => {
    const v = this.formNombre().trim();
    if (!v) return 'El nombre es obligatorio.';
    const idActual = this.editando()?.id;
    if (this.adminService.services().some(s => s.name.toLowerCase() === v.toLowerCase() && s.id !== idActual)) {
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
