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
  template: `
    <!-- Backdrop -->
    <div class="fixed inset-0 z-[70] bg-stone-500/40 backdrop-blur-sm animate-fade-in" (click)="cerrar.emit()"></div>

    <!-- Modal -->
    <div class="fixed inset-x-0 bottom-0 sm:inset-0 z-[80] sm:flex sm:items-center sm:justify-center pointer-events-none">
      <div class="pointer-events-auto bg-white w-full sm:max-w-2xl sm:mx-4 rounded-t-3xl sm:rounded-3xl border border-stone-200 max-h-[92vh] sm:max-h-[88vh] flex flex-col animate-scale-in">

        <!-- Header con datos del paciente -->
        <div class="px-5 sm:px-7 py-4 border-b border-stone-100 shrink-0">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-11 h-11 rounded-full bg-teal-100 border border-teal-200 text-teal-800 font-extrabold text-sm flex items-center justify-center shrink-0">
                {{ getInitials(pacienteActual()?.nombre || '') }}
              </div>
              <div class="min-w-0">
                <h3 class="font-extrabold text-stone-800 text-base leading-none truncate">{{ pacienteActual()?.nombre }}</h3>
                <p class="text-[11px] text-stone-400 mt-1 truncate">
                  DNI {{ pacienteActual()?.dni }} · {{ pacienteActual()?.obraSocial }} · Tel {{ pacienteActual()?.telefono }}
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <button (click)="agendarTurno.emit()" class="btn-primary !text-[11px] !py-2 !px-3.5 flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
                Agendar
              </button>
              <button (click)="cerrar.emit()" class="p-2 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
          </div>

          <!-- Resumen -->
          <div class="flex flex-wrap items-center gap-1.5 mt-3">
            <span class="chip bg-stone-100 text-stone-600 border-stone-200 !text-[10px]">{{ turnos().length }} en total</span>
            <span *ngIf="resumen().confirmados > 0" class="chip chip-confirmed !text-[10px]">{{ resumen().confirmados }} confirmados</span>
            <span *ngIf="resumen().pendientes > 0" class="chip chip-pending !text-[10px]">{{ resumen().pendientes }} pendientes</span>
            <span *ngIf="resumen().cancelados > 0" class="chip chip-cancelled !text-[10px]">{{ resumen().cancelados }} cancelados</span>
            <span *ngIf="pacienteActual()?.fechaAlta" class="text-[10px] text-stone-400 font-semibold ml-auto">
              Alta: {{ formatFecha(pacienteActual()?.fechaAlta || '') }}
            </span>
          </div>
        </div>

        <!-- Cuerpo scrolleable -->
        <div class="flex-grow overflow-y-auto px-5 sm:px-7 py-4 space-y-5">

          <!-- Próximos -->
          <div *ngIf="proximos().length > 0" class="space-y-2">
            <p class="field-label">Próximas sesiones ({{ proximos().length }})</p>
            <div class="space-y-2">
              <div *ngFor="let t of proximos()" class="border rounded-xl px-4 py-3 flex items-center justify-between gap-3"
                   [ngClass]="t.status === 'CONFIRMED' ? 'border-emerald-200 bg-emerald-50/60' : t.status === 'PENDING' ? 'border-amber-200 bg-amber-50/60' : 'border-rose-200 bg-rose-50/50 opacity-75'">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="w-14 text-center py-1.5 bg-white border border-stone-200 rounded-lg shrink-0">
                    <p class="text-[11px] font-extrabold text-stone-700 leading-none">{{ formatFechaCorta(t.date) }}</p>
                    <p class="text-[10px] font-bold text-teal-700 mt-0.5">{{ t.time }} hs</p>
                  </div>
                  <div class="min-w-0">
                    <p class="text-xs font-bold text-stone-700 truncate">{{ t.serviceName }} · {{ t.location }}</p>
                    <p *ngIf="t.notes" class="text-[10px] italic text-stone-400 truncate" [title]="t.notes">"{{ t.notes }}"</p>
                  </div>
                </div>
                <span class="chip shrink-0 !text-[9px]"
                      [class.chip-confirmed]="t.status === 'CONFIRMED'"
                      [class.chip-pending]="t.status === 'PENDING'"
                      [class.chip-cancelled]="t.status === 'CANCELLED'">
                  {{ statusLabel(t.status) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Anteriores -->
          <div *ngIf="anteriores().length > 0" class="space-y-2">
            <p class="field-label">Sesiones anteriores ({{ anteriores().length }})</p>
            <div class="border border-stone-200 rounded-xl divide-y divide-stone-100 overflow-hidden">
              <div *ngFor="let t of anteriores()" class="px-4 py-2.5 flex items-center justify-between gap-3 bg-white"
                   [class.opacity-60]="t.status === 'CANCELLED'">
                <div class="flex items-center gap-3 min-w-0">
                  <p class="text-[11px] font-extrabold text-stone-600 w-20 shrink-0">{{ formatFecha(t.date) }}</p>
                  <p class="text-[11px] font-bold text-teal-700 w-14 shrink-0">{{ t.time }} hs</p>
                  <p class="text-[11px] text-stone-500 truncate">{{ t.serviceName }} · {{ t.location }}</p>
                </div>
                <span class="chip shrink-0 !text-[9px]"
                      [class.chip-confirmed]="t.status === 'CONFIRMED'"
                      [class.chip-pending]="t.status === 'PENDING'"
                      [class.chip-cancelled]="t.status === 'CANCELLED'">
                  {{ statusLabel(t.status) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Vacío -->
          <div *ngIf="turnos().length === 0" class="py-10 text-center space-y-3">
            <div class="w-12 h-12 mx-auto rounded-2xl bg-stone-100 flex items-center justify-center">
              <svg class="w-6 h-6 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            </div>
            <p class="text-xs text-stone-400">Este paciente todavía no tiene turnos registrados.</p>
            <button (click)="agendarTurno.emit()" class="text-[11px] text-teal-700 font-bold hover:underline">Agendar el primero</button>
          </div>

        </div>
      </div>
    </div>
  `
})
export class PacienteHistorialComponent {
  private adminService = inject(AdminService);

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
