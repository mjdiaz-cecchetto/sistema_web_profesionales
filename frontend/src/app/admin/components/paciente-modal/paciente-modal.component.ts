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
  templateUrl: './paciente-modal.component.html',
  styleUrl: './paciente-modal.component.scss'
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
