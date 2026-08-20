import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AdminService } from '../../services/admin.service';
import { todayLocal } from '../../../core/date-utils';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="space-y-6 animate-fade-in">

      <!-- Bienvenida -->
      <div class="rounded-2xl bg-teal-100 border border-teal-200 p-6 sm:p-8">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5">
          <div>
            <p class="text-teal-700 text-xs font-bold uppercase tracking-[0.18em] mb-1">{{ todayFormatted }}</p>
            <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-teal-950">¡Hola, {{ doctorName() }}!</h1>
            <p class="text-sm text-teal-800 mt-1.5 max-w-md">
              Tenés <span class="font-extrabold">{{ todayApptsCount() }} {{ todayApptsCount() === 1 ? 'turno' : 'turnos' }}</span> para hoy
              y <span class="font-extrabold">{{ pendingCount() }}</span> por confirmar.
            </p>
          </div>

          <a routerLink="/admin/agenda"
             class="bg-white text-teal-900 border border-teal-200 px-5 py-3 rounded-xl text-xs font-extrabold hover:bg-teal-50 transition-colors flex items-center gap-2 shrink-0">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            Ver Agenda Completa
          </a>
        </div>
      </div>

      <!-- Métricas -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <div *ngFor="let stat of statCards()" class="card p-5 flex flex-col gap-3 hover:border-teal-300 transition-colors">
          <div class="flex items-center justify-between">
            <div [class]="'w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ' + stat.chipClass">
              <svg class="w-5.5 h-5.5 w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" [attr.d]="stat.icon"></path>
              </svg>
            </div>
          </div>
          <div>
            <p class="text-3xl font-extrabold text-stone-900 leading-none">{{ stat.value }}</p>
            <p class="text-[11px] text-stone-400 font-bold uppercase tracking-wider mt-1.5">{{ stat.label }}</p>
          </div>
        </div>
      </div>

      <!-- Grilla principal -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- Turnos de hoy -->
        <div class="lg:col-span-2 card p-6 space-y-4">
          <div class="flex justify-between items-center pb-3 border-b border-stone-100">
            <h3 class="card-title">Turnos para hoy</h3>
            <span class="text-[11px] text-stone-400 font-bold bg-stone-100 px-2.5 py-1 rounded-full">{{ todayAppts().length }} citas</span>
          </div>

          <div *ngIf="todayAppts().length > 0; else emptyAppts" class="divide-y divide-stone-100">
            <div *ngFor="let appt of todayAppts()" class="py-4 first:pt-1 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">

              <div class="flex items-start gap-4">
                <div class="w-16 text-center py-2.5 bg-stone-50 border border-stone-200/70 rounded-xl shrink-0">
                  <p class="text-sm font-extrabold text-teal-700 leading-none">{{ appt.time }}</p>
                  <p class="text-[9px] text-stone-400 uppercase font-bold mt-1">hs</p>
                </div>

                <div>
                  <div class="flex items-center gap-2 flex-wrap">
                    <h4 class="font-extrabold text-stone-900 text-sm">{{ appt.patientName }}</h4>
                    <span class="chip"
                          [class.chip-confirmed]="appt.status === 'CONFIRMED'"
                          [class.chip-pending]="appt.status === 'PENDING'"
                          [class.chip-cancelled]="appt.status === 'CANCELLED'">
                      {{ statusLabel(appt.status) }}
                    </span>
                  </div>
                  <p class="text-xs text-stone-500 mt-1">{{ appt.serviceName }} · {{ appt.location }}</p>
                  <p *ngIf="appt.notes" class="text-xs italic text-stone-500 mt-1.5 bg-amber-50/60 px-3 py-1.5 rounded-lg border border-amber-100">
                    "{{ appt.notes }}"
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-2 self-end sm:self-center shrink-0">
                <button *ngIf="appt.status === 'PENDING'"
                        (click)="changeStatus(appt.id, 'CONFIRMED')"
                        class="bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-200 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors">
                  Aceptar
                </button>
                <button *ngIf="appt.status !== 'CANCELLED'"
                        (click)="changeStatus(appt.id, 'CANCELLED')"
                        class="bg-white hover:bg-red-50 hover:text-red-700 border border-stone-200 hover:border-red-200 text-stone-500 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          </div>

          <ng-template #emptyAppts>
            <div class="py-10 text-center space-y-3">
              <div class="w-14 h-14 mx-auto rounded-2xl bg-stone-100 flex items-center justify-center">
                <svg class="w-7 h-7 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              </div>
              <p class="text-sm text-stone-500">No hay citas agendadas para hoy.</p>
              <a routerLink="/admin/agenda" class="inline-block text-xs text-teal-600 font-bold hover:underline">Ver agenda futura →</a>
            </div>
          </ng-template>
        </div>

        <!-- Accesos rápidos -->
        <div class="card p-6 space-y-4">
          <div class="pb-3 border-b border-stone-100">
            <h3 class="card-title">Atajos Rápidos</h3>
          </div>

          <div class="grid grid-cols-1 gap-3">
            <a routerLink="/admin/perfil"
               class="p-4 rounded-xl border border-stone-200/70 hover:border-teal-400 hover:bg-teal-50/50 transition-colors flex items-center gap-3.5 group">
              <div class="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
              </div>
              <div class="text-left">
                <h4 class="text-sm font-extrabold text-stone-900">Editar Perfil Público</h4>
                <p class="text-[11px] text-stone-400 mt-0.5">Foto, banner, biografía y especialidades.</p>
              </div>
            </a>

            <a routerLink="/admin/disponibilidad"
               class="p-4 rounded-xl border border-stone-200/70 hover:border-teal-400 hover:bg-teal-50/50 transition-colors flex items-center gap-3.5 group">
              <div class="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
              <div class="text-left">
                <h4 class="text-sm font-extrabold text-stone-900">Configurar Horarios</h4>
                <p class="text-[11px] text-stone-400 mt-0.5">Rangos semanales, feriados y vacaciones.</p>
              </div>
            </a>

            <a routerLink="/admin/pacientes"
               class="p-4 rounded-xl border border-stone-200/70 hover:border-teal-400 hover:bg-teal-50/50 transition-colors flex items-center gap-3.5 group">
              <div class="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
              </div>
              <div class="text-left">
                <h4 class="text-sm font-extrabold text-stone-900">Mis Pacientes</h4>
                <p class="text-[11px] text-stone-400 mt-0.5">Historial y datos de contacto.</p>
              </div>
            </a>

            <!-- Info API local -->
            <div class="p-4 rounded-xl bg-teal-50 border border-teal-200 flex flex-col gap-1.5 mt-1">
              <h4 class="text-xs font-extrabold flex items-center gap-1.5 text-teal-900">
                <svg class="w-4 h-4 text-teal-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"></path></svg>
                Base de datos local activa
              </h4>
              <p class="text-[11px] text-teal-800/80 leading-relaxed">
                Los datos se guardan en <code class="font-mono font-bold">db.json</code> vía la API en
                <code class="font-mono font-bold">localhost:3000</code>. Todo cambio persiste al refrescar.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  `
})
export class DashboardComponent {
  private adminService = inject(AdminService);

  todayDateString = todayLocal();
  todayFormatted = this.formatToday(new Date());

  doctorName = computed(() => {
    const nombre = this.adminService.profile()?.nombre ?? '';
    // Solo el primer nombre con título, ej. "Dra. Elena"
    return nombre.split(' ').slice(0, 2).join(' ') || '¡Bienvenida!';
  });

  todayAppts = computed(() =>
    this.adminService.appointments()
      .filter(a => a.date === this.todayDateString)
      .sort((a, b) => a.time.localeCompare(b.time))
  );

  todayApptsCount = computed(() => this.todayAppts().length);
  pendingCount = computed(() => this.adminService.appointments().filter(a => a.status === 'PENDING').length);
  totalReservationsCount = computed(() => this.adminService.appointments().filter(a => a.status !== 'CANCELLED').length);
  uniquePatientsCount = computed(() => this.adminService.patients().length);

  statCards = computed(() => [
    {
      label: 'Turnos de Hoy',
      value: this.todayApptsCount(),
      chipClass: 'bg-teal-50 text-teal-600',
      icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
    },
    {
      label: 'Por Confirmar',
      value: this.pendingCount(),
      chipClass: 'bg-amber-50 text-amber-600',
      icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
    },
    {
      label: 'Pacientes',
      value: this.uniquePatientsCount(),
      chipClass: 'bg-blue-50 text-blue-600',
      icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z'
    },
    {
      label: 'Reservas Activas',
      value: this.totalReservationsCount(),
      chipClass: 'bg-purple-50 text-purple-600',
      icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z'
    }
  ]);

  statusLabel(status: string): string {
    return status === 'CONFIRMED' ? 'Confirmado' : status === 'PENDING' ? 'Pendiente' : 'Cancelado';
  }

  private formatToday(d: Date): string {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${days[d.getDay()]} ${d.getDate()} de ${months[d.getMonth()]}`;
  }

  changeStatus(id: string, status: 'CONFIRMED' | 'CANCELLED') {
    this.adminService.updateAppointmentStatus(id, status);
  }
}
