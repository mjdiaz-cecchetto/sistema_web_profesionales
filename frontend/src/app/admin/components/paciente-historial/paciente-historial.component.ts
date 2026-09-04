import { Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService, AdminAppointment } from '../../services/admin.service';
import { Patient } from '../../../core/models';
import { formatDMY, todayLocal } from '../../../core/date-utils';

/**
 * Historial completo de turnos de un paciente:
 * resumen por estado, próximas sesiones y sesiones anteriores.
 */
@Component({
  selector: 'app-paciente-historial',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './paciente-historial.component.html',
  styleUrl: './paciente-historial.component.scss'
})
export class PacienteHistorialComponent {
  adminService = inject(AdminService);

  pacienteActual = signal<Patient | null>(null);
  @Input() set paciente(pac: Patient | null) {
    this.pacienteActual.set(pac);
  }

  @Output() cerrar = new EventEmitter<void>();
  @Output() agendarTurno = new EventEmitter<void>();

  /** Todos los turnos del paciente, ordenados por fecha/hora. */
  turnos = computed<AdminAppointment[]>(() => {
    const dni = this.pacienteActual()?.dni;
    if (!dni) return [];
    return this.adminService.appointments()
      .filter(a => a.patientDni === dni)
      .slice()
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  });

  proximos = computed(() => {
    const hoy = todayLocal();
    return this.turnos().filter(t => t.date >= hoy);
  });

  anteriores = computed(() => {
    const hoy = todayLocal();
    // Más recientes primero
    return this.turnos().filter(t => t.date < hoy).reverse();
  });

  resumen = computed(() => {
    const list = this.turnos();
    return {
      confirmados: list.filter(t => t.status === 'CONFIRMED').length,
      pendientes: list.filter(t => t.status === 'PENDING').length,
      cancelados: list.filter(t => t.status === 'CANCELLED').length
    };
  });

  getInitials(name: string): string {
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }

  formatFecha = formatDMY;

  formatFechaCorta(fecha: string): string {
    const partes = fecha.split('-');
    return `${partes[2]}/${partes[1]}`;
  }

  statusLabel(status: string): string {
    return status === 'CONFIRMED' ? 'Confirmado' : status === 'PENDING' ? 'Pendiente' : 'Cancelado';
  }
}
