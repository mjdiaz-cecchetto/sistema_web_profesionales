import { Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminAppointment } from '../../services/admin.service';
import { Patient } from '../../../core/models';
import { formatDMY, todayLocal } from '../../../core/date-utils';

/**
 * Historial completo de turnos de un paciente:
 * resumen por estado, próximas sesiones y sesiones anteriores.
 * Además, la HISTORIA CLÍNICA del paciente (solo para el profesional
 * tratante logueado: cada profesional ve únicamente sus propias entradas).
 */
@Component({
  selector: 'app-paciente-historial',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

  /** Turnos del paciente dentro del alcance de quien mira, ordenados por fecha/hora. */
  turnos = computed<AdminAppointment[]>(() => {
    const dni = this.pacienteActual()?.dni;
    if (!dni) return [];
    return this.adminService.turnosAlcance()
      .filter(a => a.patientDni === dni)
      .slice()
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  });

  // ===== Historia clínica (solo profesional tratante) =====
  hcFormAbierto = signal(false);
  hcFecha = signal(todayLocal());
  hcMotivo = signal('');
  hcDiagnostico = signal('');
  hcTratamiento = signal('');
  hcError = signal('');
  hcGuardando = signal(false);

  /** Entradas del profesional logueado para este paciente (las de otros no se ven). */
  historias = computed(() => {
    const pac = this.pacienteActual();
    // La dependencia reactiva la aporta el service (signal historias interno vía historiasDe).
    return pac ? this.adminService.historiasDe(pac.id) : [];
  });

  abrirHcForm() {
    this.hcFormAbierto.set(true);
    this.hcFecha.set(todayLocal());
    this.hcMotivo.set('');
    this.hcDiagnostico.set('');
    this.hcTratamiento.set('');
    this.hcError.set('');
  }

  async guardarHistoria() {
    if (this.hcGuardando()) return;
    const pac = this.pacienteActual();
    if (!pac) return;
    this.hcError.set('');
    if (!this.hcFecha() || !this.hcMotivo().trim() || !this.hcDiagnostico().trim() || !this.hcTratamiento().trim()) {
      this.hcError.set('Completá fecha, motivo, diagnóstico y tratamiento.');
      return;
    }
    this.hcGuardando.set(true);
    const creada = await this.adminService.addHistoria({
      pacienteId: pac.id,
      fecha: this.hcFecha(),
      motivo: this.hcMotivo().trim(),
      diagnostico: this.hcDiagnostico().trim(),
      tratamiento: this.hcTratamiento().trim()
    });
    this.hcGuardando.set(false);
    if (creada) this.hcFormAbierto.set(false);
    else this.hcError.set('No se pudo guardar la entrada.');
  }

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
    switch (status) {
      case 'CONFIRMED': return 'Confirmado';
      case 'PENDING': return 'Pendiente';
      case 'ATTENDED': return 'Asistió';
      case 'NO_SHOW': return 'No asistió';
      case 'EXPIRED': return 'Vencido';
      default: return 'Cancelado';
    }
  }
}
