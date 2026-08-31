import { Component, EventEmitter, Input, Output, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../services/admin.service';
import { Patient } from '../../../core/models';
import { todayLocal } from '../../../core/date-utils';

/**
 * Modal reutilizable para dar de alta o editar un paciente.
 * Valida datos obligatorios y DNI único dentro del padrón.
 */
@Component({
  selector: 'app-paciente-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Backdrop -->
    <div class="fixed inset-0 z-[70] bg-stone-500/40 backdrop-blur-sm animate-fade-in" (click)="cerrar.emit()"></div>

    <!-- Modal -->
    <div class="fixed inset-x-0 bottom-0 sm:inset-0 z-[80] sm:flex sm:items-center sm:justify-center pointer-events-none">
      <div class="pointer-events-auto bg-white w-full sm:max-w-lg sm:mx-4 rounded-t-3xl sm:rounded-3xl border border-stone-200 max-h-[92vh] flex flex-col animate-scale-in">

        <!-- Header -->
        <div class="px-5 sm:px-7 py-4 border-b border-stone-100 flex items-center justify-between shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-teal-100 border border-teal-200 text-teal-800 flex items-center justify-center">
              <svg *ngIf="!modoEdicion()" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
              <svg *ngIf="modoEdicion()" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
            </div>
            <div>
              <h3 class="font-extrabold text-stone-800 text-base leading-none">{{ modoEdicion() ? 'Editar Paciente' : 'Nuevo Paciente' }}</h3>
              <p class="text-[11px] text-stone-400 mt-1">
                {{ modoEdicion() ? 'Actualizá los datos de contacto y cobertura.' : 'Dalo de alta para poder asignarle turnos.' }}
              </p>
            </div>
          </div>
          <button (click)="cerrar.emit()" class="p-2 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <!-- Cuerpo -->
        <div class="flex-grow overflow-y-auto px-5 sm:px-7 py-5 space-y-3.5">

          <div class="space-y-1">
            <label class="field-label">Nombre y Apellido *</label>
            <input type="text" [ngModel]="nombre()" (ngModelChange)="nombre.set($event)"
                   placeholder="Ej. Ana García" class="input !text-xs"
                   [class.!border-rose-300]="mostrarErrores() && errorNombre()">
            <p *ngIf="mostrarErrores() && errorNombre()" class="text-[10px] font-bold text-rose-600">{{ errorNombre() }}</p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div class="space-y-1">
              <label class="field-label">DNI *</label>
              <input type="text" [ngModel]="dni()" (ngModelChange)="dni.set($event)"
                     placeholder="Solo números" class="input !text-xs"
                     [disabled]="modoEdicion()"
                     [class.!border-rose-300]="mostrarErrores() && errorDni()"
                     [class.opacity-60]="modoEdicion()">
              <p *ngIf="mostrarErrores() && errorDni()" class="text-[10px] font-bold text-rose-600">{{ errorDni() }}</p>
              <p *ngIf="modoEdicion()" class="text-[10px] text-stone-400">El DNI identifica al paciente y no se puede cambiar.</p>
            </div>

            <div class="space-y-1">
              <label class="field-label">Teléfono *</label>
              <input type="text" [ngModel]="telefono()" (ngModelChange)="telefono.set($event)"
                     placeholder="Ej. 1155667788" class="input !text-xs"
                     [class.!border-rose-300]="mostrarErrores() && errorTelefono()">
              <p *ngIf="mostrarErrores() && errorTelefono()" class="text-[10px] font-bold text-rose-600">{{ errorTelefono() }}</p>
            </div>
          </div>

          <div class="space-y-1">
            <label class="field-label">Email *</label>
            <input type="email" [ngModel]="email()" (ngModelChange)="email.set($event)"
                   placeholder="ejemplo@email.com" class="input !text-xs"
                   [class.!border-rose-300]="mostrarErrores() && errorEmail()">
            <p *ngIf="mostrarErrores() && errorEmail()" class="text-[10px] font-bold text-rose-600">{{ errorEmail() }}</p>
          </div>

          <div class="space-y-1">
            <label class="field-label">Obra Social / Cobertura *</label>
            <div class="relative">
              <select [ngModel]="obraSocial()" (ngModelChange)="obraSocial.set($event)"
                      class="input !text-xs appearance-none cursor-pointer !pr-8">
                <option *ngFor="let o of adminService.healthInsurances()" [value]="o">{{ o }}</option>
              </select>
              <svg class="w-4 h-4 text-stone-400 absolute right-3 top-3 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>

        </div>

        <!-- Footer -->
        <div class="px-5 sm:px-7 py-4 border-t border-stone-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0 bg-stone-50/60 rounded-b-3xl">
          <button (click)="cerrar.emit()" class="btn-ghost !py-2.5 text-center">Cancelar</button>
          <button (click)="guardar()" [disabled]="guardando()"
                  class="btn-primary !text-xs !py-3 text-center">
            {{ guardando() ? 'Guardando…' : modoEdicion() ? 'Guardar Cambios' : 'Dar de Alta' }}
          </button>
        </div>

      </div>
    </div>
  `
})
export class PacienteModalComponent {
  adminService = inject(AdminService);

  /** Paciente a editar: activa el modo edición con los campos precargados. */
  @Input() set pacienteEditar(pac: Patient | null) {
    if (!pac) return;
    this.original.set(pac);
    this.nombre.set(pac.nombre);
    this.dni.set(pac.dni);
    this.telefono.set(pac.telefono);
    this.email.set(pac.email);
    this.obraSocial.set(pac.obraSocial);
  }

  @Output() cerrar = new EventEmitter<void>();
  /** Emite el paciente creado o actualizado, y si fue un alta nueva. */
  @Output() guardado = new EventEmitter<{ paciente: Patient; esNuevo: boolean }>();

  original = signal<Patient | null>(null);
  modoEdicion = computed(() => this.original() !== null);

  nombre = signal('');
  dni = signal('');
  telefono = signal('');
  email = signal('');
  obraSocial = signal('');

  mostrarErrores = signal(false);
  guardando = signal(false);

  constructor() {
    // Default de obra social cuando llega la lista desde la API.
    effect(() => {
      const lista = this.adminService.healthInsurances();
      if (!this.obraSocial() && lista.length > 0) {
        this.obraSocial.set(lista[0]);
      }
    });
  }

  // ---- Validaciones ----
  errorNombre = computed(() => {
    const v = this.nombre().trim();
    if (!v) return 'El nombre es obligatorio.';
    if (v.length < 3) return 'El nombre es demasiado corto.';
    return '';
  });

  errorDni = computed(() => {
    const v = this.dni().trim();
    if (!v) return 'El DNI es obligatorio.';
    if (!/^[0-9]{7,9}$/.test(v)) return 'El DNI debe tener entre 7 y 9 números.';
    // Único en el padrón (salvo el propio paciente en edición)
    const idActual = this.original()?.id;
    const duplicado = this.adminService.patients().find(p => p.dni === v && p.id !== idActual);
    if (duplicado) return `Ya existe un paciente con ese DNI (${duplicado.nombre}).`;
    return '';
  });

  errorTelefono = computed(() => {
    const v = this.telefono().trim();
    if (!v) return 'El teléfono es obligatorio.';
    if (!/^[0-9]{8,15}$/.test(v)) return 'El teléfono debe tener entre 8 y 15 números.';
    return '';
  });

  errorEmail = computed(() => {
    const v = this.email().trim();
    if (!v) return 'El email es obligatorio.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'El email no tiene un formato válido.';
    return '';
  });

  esValido = computed(() =>
    !this.errorNombre() && !this.errorDni() && !this.errorTelefono() && !this.errorEmail() && !!this.obraSocial()
  );

  // ---- Guardar ----
  async guardar() {
    if (this.guardando()) return;

    if (!this.esValido()) {
      this.mostrarErrores.set(true);
      return;
    }

    this.guardando.set(true);
    const original = this.original();

    if (original) {
      const cambios: Partial<Patient> = {
        nombre: this.nombre().trim(),
        telefono: this.telefono().trim(),
        email: this.email().trim(),
        obraSocial: this.obraSocial()
      };
      const ok = await this.adminService.updatePatient(original.id, cambios);
      this.guardando.set(false);
      if (ok) this.guardado.emit({ paciente: { ...original, ...cambios } as Patient, esNuevo: false });
      return;
    }

    const creado = await this.adminService.addPatient({
      nombre: this.nombre().trim(),
      dni: this.dni().trim(),
      telefono: this.telefono().trim(),
      email: this.email().trim(),
      obraSocial: this.obraSocial(),
      fechaAlta: todayLocal()
    });
    this.guardando.set(false);
    if (creado) this.guardado.emit({ paciente: creado, esNuevo: true });
  }
}
