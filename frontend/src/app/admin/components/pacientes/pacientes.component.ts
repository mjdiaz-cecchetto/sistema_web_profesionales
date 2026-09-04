import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, Patient } from '../../services/admin.service';
import { PacienteModalComponent } from '../paciente-modal/paciente-modal.component';
import { TurnoModalComponent } from '../turno-modal/turno-modal.component';
import { PacienteHistorialComponent } from '../paciente-historial/paciente-historial.component';
import { formatDMY, todayLocal } from '../../../core/date-utils';

type Orden = 'NOMBRE' | 'ALTA_RECIENTE' | 'PROXIMO_TURNO';

@Component({
  selector: 'app-pacientes',
  standalone: true,
  imports: [CommonModule, FormsModule, PacienteModalComponent, TurnoModalComponent, PacienteHistorialComponent],
  host: { class: 'block xl:h-full' },
  templateUrl: './pacientes.component.html',
  styleUrl: './pacientes.component.scss'
})
export class PacientesComponent {
  private adminService = inject(AdminService);

  searchQuery = signal('');
  insuranceFilter = signal('ALL');
  turnosFilter = signal<'ALL' | 'CON_PROXIMO' | 'SIN_PROXIMO'>('ALL');
  orden = signal<Orden>('NOMBRE');
  filtrosAbiertos = signal(false);

  currentPage = signal(1);
  readonly itemsPerPage = 8;

  // Modales
  modalPacienteAbierto = signal(false);
  pacienteEnEdicion = signal<Patient | null>(null);
  modalTurnoAbierto = signal(false);
  pacienteParaTurno = signal<Patient | null>(null);
  toastMensaje = signal('');

  readonly hoy = todayLocal();

  insurances = computed(() => [...new Set(this.adminService.pacientesVisibles().map(p => p.obraSocial))].sort());

  /** Mapa DNI → próximo turno activo (hoy en adelante). */
  private proximosTurnos = computed(() => {
    const hoy = todayLocal();
    const map = new Map<string, { date: string; time: string; status: string }>();
    const activos = this.adminService.appointments()
      .filter(a => a.status !== 'CANCELLED' && a.date >= hoy)
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    for (const a of activos) {
      if (!map.has(a.patientDni)) map.set(a.patientDni, { date: a.date, time: a.time, status: a.status });
    }
    return map;
  });

  proximoTurnoDe(dni: string) {
    return this.proximosTurnos().get(dni) ?? null;
  }

  filtrosActivosCount = computed(() => {
    let n = 0;
    if (this.insuranceFilter() !== 'ALL') n++;
    if (this.turnosFilter() !== 'ALL') n++;
    if (this.orden() !== 'NOMBRE') n++;
    return n;
  });

  filteredPatients = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const insurance = this.insuranceFilter();
    const turnos = this.turnosFilter();
    const proximos = this.proximosTurnos();

    const lista = this.adminService.pacientesVisibles().filter(p => {
      const matchesSearch = !query ||
        p.nombre.toLowerCase().includes(query) ||
        p.dni.toLowerCase().includes(query) ||
        p.email.toLowerCase().includes(query) ||
        p.telefono.toLowerCase().includes(query);

      const matchesInsurance = insurance === 'ALL' || p.obraSocial === insurance;

      const tieneProximo = proximos.has(p.dni);
      const matchesTurnos = turnos === 'ALL' ||
        (turnos === 'CON_PROXIMO' && tieneProximo) ||
        (turnos === 'SIN_PROXIMO' && !tieneProximo);

      return matchesSearch && matchesInsurance && matchesTurnos;
    });

    const orden = this.orden();
    return lista.sort((a, b) => {
      if (orden === 'ALTA_RECIENTE') return (b.fechaAlta || '').localeCompare(a.fechaAlta || '');
      if (orden === 'PROXIMO_TURNO') {
        const pa = proximos.get(a.dni);
        const pb = proximos.get(b.dni);
        if (pa && pb) return (pa.date + pa.time).localeCompare(pb.date + pb.time);
        if (pa) return -1;
        if (pb) return 1;
        return a.nombre.localeCompare(b.nombre);
      }
      return a.nombre.localeCompare(b.nombre);
    });
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredPatients().length / this.itemsPerPage)));

  paginatedPatients = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    return this.filteredPatients().slice(start, start + this.itemsPerPage);
  });

  totalItems = computed(() => this.filteredPatients().length);
  startIndex = computed(() => this.totalItems() === 0 ? 0 : (this.currentPage() - 1) * this.itemsPerPage + 1);
  endIndex = computed(() => Math.min(this.currentPage() * this.itemsPerPage, this.totalItems()));

  onSearchChange(val: string) { this.searchQuery.set(val); this.currentPage.set(1); }
  onInsuranceChange(val: string) { this.insuranceFilter.set(val); this.currentPage.set(1); }
  onTurnosChange(val: 'ALL' | 'CON_PROXIMO' | 'SIN_PROXIMO') { this.turnosFilter.set(val); this.currentPage.set(1); }
  onOrdenChange(val: Orden) { this.orden.set(val); this.currentPage.set(1); }

  prevPage() { if (this.currentPage() > 1) this.currentPage.update(p => p - 1); }
  nextPage() { if (this.currentPage() < this.totalPages()) this.currentPage.update(p => p + 1); }

  // ---- Modales ----
  abrirAltaPaciente() {
    this.pacienteEnEdicion.set(null);
    this.toastMensaje.set('');
    this.modalPacienteAbierto.set(true);
  }

  abrirEdicionPaciente(pac: Patient) {
    this.pacienteEnEdicion.set(pac);
    this.toastMensaje.set('');
    this.modalPacienteAbierto.set(true);
  }

  cerrarModalPaciente() {
    this.modalPacienteAbierto.set(false);
    this.pacienteEnEdicion.set(null);
  }

  onPacienteGuardado(evento: { paciente: Patient; esNuevo: boolean }) {
    this.cerrarModalPaciente();
    this.mostrarToast(evento.esNuevo
      ? `${evento.paciente.nombre} fue dado de alta con éxito.`
      : `Los datos de ${evento.paciente.nombre} se actualizaron con éxito.`);
  }

  // ---- Historial ----
  historialAbierto = signal(false);
  pacienteHistorial = signal<Patient | null>(null);

  abrirHistorial(pac: Patient) {
    this.pacienteHistorial.set(pac);
    this.toastMensaje.set('');
    this.historialAbierto.set(true);
  }

  cerrarHistorial() {
    this.historialAbierto.set(false);
    this.pacienteHistorial.set(null);
  }

  /** Desde el historial: cierra y abre el modal de turno con el paciente precargado. */
  agendarDesdeHistorial() {
    const pac = this.pacienteHistorial();
    this.cerrarHistorial();
    if (pac) this.abrirTurnoRapido(pac);
  }

  abrirTurnoRapido(pac: Patient) {
    this.pacienteParaTurno.set(pac);
    this.toastMensaje.set('');
    this.modalTurnoAbierto.set(true);
  }

  onTurnosCreados(cantidad: number) {
    this.modalTurnoAbierto.set(false);
    this.mostrarToast(cantidad === 1 ? 'Turno creado con éxito.' : `Se crearon ${cantidad} turnos de la serie con éxito.`);
  }

  private mostrarToast(mensaje: string) {
    this.toastMensaje.set(mensaje);
    setTimeout(() => this.toastMensaje.set(''), 5000);
  }

  // ---- Helpers ----
  getInitials(name: string): string {
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }

  formatDate = formatDMY;

  resetFilters() {
    this.searchQuery.set('');
    this.insuranceFilter.set('ALL');
    this.turnosFilter.set('ALL');
    this.orden.set('NOMBRE');
    this.currentPage.set(1);
  }
}
