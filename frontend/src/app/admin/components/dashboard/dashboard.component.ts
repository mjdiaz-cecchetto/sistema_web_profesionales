import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AdminService, AdminAppointment } from '../../services/admin.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="space-y-6">
      
      <!-- Seccion de Bienvenida -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 class="text-2xl font-black text-stone-900 tracking-tight">¡Hola, {{ doctorName() }}!</h1>
          <p class="text-sm text-stone-500">Este es el resumen de tu consultorio para hoy, {{ todayFormatted }}.</p>
        </div>
        
        <div class="flex gap-3">
          <a routerLink="/admin/agenda" 
             class="bg-teal-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-teal-700 shadow-sm transition-all flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            Ver Agenda Completa
          </a>
        </div>
      </div>

      <!-- Tarjetas de Métricas -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        <!-- Tarjeta 1: Turnos de Hoy -->
        <div class="bg-white p-5 rounded-2xl border border-stone-200/60 shadow-sm flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <div>
            <p class="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Turnos de Hoy</p>
            <p class="text-2xl font-black text-stone-900">{{ todayApptsCount() }}</p>
          </div>
        </div>

        <!-- Tarjeta 2: Pendientes -->
        <div class="bg-white p-5 rounded-2xl border border-stone-200/60 shadow-sm flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          </div>
          <div>
            <p class="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Pendientes</p>
            <p class="text-2xl font-black text-stone-900">{{ pendingCount() }}</p>
          </div>
        </div>

        <!-- Tarjeta 3: Pacientes Activos -->
        <div class="bg-white p-5 rounded-2xl border border-stone-200/60 shadow-sm flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
          </div>
          <div>
            <p class="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Pacientes Únicos</p>
            <p class="text-2xl font-black text-stone-900">{{ uniquePatientsCount() }}</p>
          </div>
        </div>

        <!-- Tarjeta 4: Sesiones Completas -->
        <div class="bg-white p-5 rounded-2xl border border-stone-200/60 shadow-sm flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path></svg>
          </div>
          <div>
            <p class="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Total Reservas</p>
            <p class="text-2xl font-black text-stone-900">{{ totalReservationsCount() }}</p>
          </div>
        </div>

      </div>

      <!-- Grilla Principal -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <!-- Próximos Turnos de Hoy (Izquierda - Col 2) -->
        <div class="lg:col-span-2 bg-white rounded-2xl border border-stone-200/60 shadow-sm p-6 space-y-4">
          <div class="flex justify-between items-center pb-2 border-b border-stone-100">
            <h3 class="font-bold text-stone-900 text-lg flex items-center gap-2">
              <span class="w-1 h-5 bg-teal-600 rounded-full"></span>
              Turnos para el día de hoy
            </h3>
            <span class="text-xs text-stone-400 font-semibold">{{ todayAppts().length }} citas</span>
          </div>

          <div *ngIf="todayAppts().length > 0; else emptyAppts" class="divide-y divide-stone-100">
            <div *ngFor="let appt of todayAppts()" class="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              
              <div class="flex items-start gap-3">
                <!-- Time Badge -->
                <div class="w-14 text-center py-2 bg-stone-50 border border-stone-100 rounded-xl shrink-0">
                  <p class="text-xs font-bold text-teal-700">{{ appt.time }}</p>
                  <p class="text-[9px] text-stone-400 uppercase font-bold">hs</p>
                </div>
                
                <div>
                  <div class="flex items-center gap-2">
                    <h4 class="font-bold text-stone-900 text-sm">{{ appt.patientName }}</h4>
                    <span [class.bg-emerald-50]="appt.status === 'CONFIRMED'"
                          [class.text-emerald-700]="appt.status === 'CONFIRMED'"
                          [class.border-emerald-200]="appt.status === 'CONFIRMED'"
                          [class.bg-amber-50]="appt.status === 'PENDING'"
                          [class.text-amber-700]="appt.status === 'PENDING'"
                          [class.border-amber-200]="appt.status === 'PENDING'"
                          [class.bg-red-50]="appt.status === 'CANCELLED'"
                          [class.text-red-700]="appt.status === 'CANCELLED'"
                          [class.border-red-200]="appt.status === 'CANCELLED'"
                          class="px-2 py-0.5 text-[9px] font-bold rounded-full border">
                      {{ appt.status === 'CONFIRMED' ? 'Confirmado' : appt.status === 'PENDING' ? 'Pendiente' : 'Cancelado' }}
                    </span>
                  </div>
                  
                  <p class="text-xs text-stone-500 mt-0.5">{{ appt.serviceName }} · {{ appt.location }}</p>
                  <p *ngIf="appt.notes" class="text-xs italic text-stone-400 mt-1 bg-stone-50 p-2 rounded-lg border border-stone-100">"{{ appt.notes }}"</p>
                </div>
              </div>

              <!-- Acciones del Profesional -->
              <div class="flex items-center gap-2 self-end sm:self-center">
                <button *ngIf="appt.status === 'PENDING'" 
                        (click)="changeStatus(appt.id, 'CONFIRMED')" 
                        class="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm">
                  Aceptar
                </button>
                
                <button *ngIf="appt.status !== 'CANCELLED'" 
                        (click)="changeStatus(appt.id, 'CANCELLED')" 
                        class="bg-stone-50 hover:bg-red-50 hover:text-red-700 border border-stone-200 hover:border-red-200 text-stone-500 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
                  Cancelar
                </button>
              </div>

            </div>
          </div>
          
          <ng-template #emptyAppts>
            <div class="py-8 text-center space-y-2">
              <p class="text-sm text-stone-500 italic">No hay citas agendadas para el día de hoy.</p>
              <a routerLink="/admin/agenda" class="text-xs text-teal-600 font-bold hover:underline">Ver agenda futura →</a>
            </div>
          </ng-template>
        </div>

        <!-- Accesos Rápidos (Derecha - Col 1) -->
        <div class="bg-white rounded-2xl border border-stone-200/60 shadow-sm p-6 space-y-4">
          <div class="pb-2 border-b border-stone-100">
            <h3 class="font-bold text-stone-900 text-lg flex items-center gap-2">
              <span class="w-1 h-5 bg-teal-600 rounded-full"></span>
              Atajos Rápidos
            </h3>
          </div>
          
          <div class="grid grid-cols-1 gap-3">
            <a routerLink="/admin/perfil" 
               class="p-4 rounded-xl border border-stone-200/60 hover:border-teal-500/50 hover:bg-teal-50/5 transition-all flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
              </div>
              <div class="text-left">
                <h4 class="text-sm font-bold text-stone-900">Editar Perfil Público</h4>
                <p class="text-[11px] text-stone-400">Modificá tu biografía, fotos y especialidades.</p>
              </div>
            </a>

            <a routerLink="/admin/disponibilidad" 
               class="p-4 rounded-xl border border-stone-200/60 hover:border-teal-500/50 hover:bg-teal-50/5 transition-all flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
              <div class="text-left">
                <h4 class="text-sm font-bold text-stone-900">Configurar Horarios</h4>
                <p class="text-[11px] text-stone-400">Ajustá tus rangos semanales y días hábiles.</p>
              </div>
            </a>

            <!-- Tarjeta Informativa de LocalStorage -->
            <div class="p-4 rounded-xl bg-teal-50/40 border border-teal-100 flex flex-col gap-2">
              <h4 class="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                <svg class="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                Persistencia Activa
              </h4>
              <p class="text-[11px] text-teal-800 leading-relaxed">
                Todos los cambios que realices en el panel se guardarán de forma simulada en tu navegador. Al refrescar, se mantendrán sincronizados.
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  `
})
export class DashboardComponent {
  doctorName = signal('Dra. Elena Ramos');
  
  todayDateString = new Date().toISOString().split('T')[0];
  todayFormatted = this.formatToday(new Date());

  // Métodos de cálculo dinámico basados en los signals del admin
  todayAppts = computed(() => {
    return this.adminService.appointments()
      .filter(a => a.date === this.todayDateString)
      .sort((a, b) => a.time.localeCompare(b.time));
  });

  todayApptsCount = computed(() => this.todayAppts().length);

  pendingCount = computed(() => {
    return this.adminService.appointments().filter(a => a.status === 'PENDING').length;
  });

  totalReservationsCount = computed(() => {
    return this.adminService.appointments().filter(a => a.status !== 'CANCELLED').length;
  });

  uniquePatientsCount = computed(() => {
    const list = this.adminService.appointments().map(a => a.patientName.trim());
    return new Set(list).size;
  });

  constructor(private adminService: AdminService) {
    this.doctorName.set(this.adminService.profile().nombre);
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
