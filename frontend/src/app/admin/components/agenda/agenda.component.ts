import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminAppointment } from '../../services/admin.service';

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      
      <!-- Encabezado -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 class="text-2xl font-black text-stone-900 tracking-tight">Agenda de Turnos</h1>
          <p class="text-sm text-stone-500">Visualizá y gestioná las reservas solicitadas por tus pacientes.</p>
        </div>
      </div>

      <!-- Barra de Filtros y Búsqueda -->
      <div class="bg-white rounded-2xl border border-stone-200/60 p-5 shadow-sm grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
        <!-- Búsqueda -->
        <div class="sm:col-span-2 space-y-1">
          <label class="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Buscar Paciente</label>
          <div class="relative">
            <input type="text" [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event)" 
                   placeholder="Nombre, DNI o email..."
                   class="w-full bg-stone-50 border border-stone-200 rounded-xl pl-10 pr-4 py-2 text-xs focus:border-teal-500 focus:bg-white focus:outline-none transition-all">
            <svg class="w-4 h-4 text-stone-400 absolute left-3.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
        </div>

        <!-- Filtro por Estado -->
        <div class="space-y-1">
          <label class="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Estado del Turno</label>
          <select [ngModel]="statusFilter()" (ngModelChange)="statusFilter.set($event)" 
                  class="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs focus:border-teal-500 focus:bg-white focus:outline-none transition-all">
            <option value="ALL">Todos los estados</option>
            <option value="CONFIRMED">Confirmado</option>
            <option value="PENDING">Pendiente</option>
            <option value="CANCELLED">Cancelado</option>
          </select>
        </div>

        <!-- Filtro por Ubicación -->
        <div class="space-y-1">
          <label class="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Lugar de Atención</label>
          <select [ngModel]="locationFilter()" (ngModelChange)="locationFilter.set($event)" 
                  class="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs focus:border-teal-500 focus:bg-white focus:outline-none transition-all">
            <option value="ALL">Todas las ubicaciones</option>
            <option value="Palermo">Consultorio Palermo</option>
            <option value="Belgrano">Centro Belgrano</option>
            <option value="Online">Consulta Online</option>
          </select>
        </div>
      </div>

      <!-- Listado de Resultados -->
      <div class="bg-white rounded-2xl border border-stone-200/60 shadow-sm overflow-hidden">
        
        <!-- Header Tabla/Lista -->
        <div class="bg-stone-50/50 px-6 py-4 border-b border-stone-200/60 flex justify-between items-center text-xs font-bold text-stone-400 uppercase tracking-wider">
          <span>Detalle del Paciente y Cita</span>
          <span class="hidden sm:inline">Fecha y Hora</span>
        </div>

        <!-- Cuerpo de Citas -->
        <div *ngIf="filteredAppointments().length > 0; else noResults" class="divide-y divide-stone-100">
          <div *ngFor="let appt of filteredAppointments()" class="p-6 hover:bg-stone-50/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            
            <!-- Datos Paciente y Lugar -->
            <div class="flex items-start gap-4">
              <!-- Avatar Iniciales -->
              <div class="w-10 h-10 rounded-full bg-teal-50 text-teal-700 font-bold text-sm flex items-center justify-center shrink-0 border border-teal-100">
                {{ getInitials(appt.patientName) }}
              </div>
              
              <div class="space-y-1">
                <div class="flex items-center gap-2.5">
                  <h4 class="font-extrabold text-stone-900 text-sm">{{ appt.patientName }}</h4>
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
                
                <p class="text-xs text-stone-500">
                  {{ appt.serviceName }} · <span class="font-medium text-stone-700">{{ appt.location }}</span>
                </p>

                <!-- Ficha detallada colapsable / siempre visible en agenda -->
                <div class="pt-2 text-xs space-y-1 text-stone-400 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                  <p><span class="font-semibold text-stone-500">DNI:</span> {{ appt.patientDni }}</p>
                  <p><span class="font-semibold text-stone-500">Teléfono:</span> {{ appt.patientPhone }}</p>
                  <p class="sm:col-span-2"><span class="font-semibold text-stone-500">Email:</span> {{ appt.patientEmail }}</p>
                  <p class="sm:col-span-2"><span class="font-semibold text-stone-500">Cobertura:</span> {{ appt.healthInsurance }}</p>
                  <p *ngIf="appt.notes" class="sm:col-span-2 mt-1.5 bg-stone-50 p-2.5 rounded-lg border border-stone-100 italic text-stone-500">
                    "{{ appt.notes }}"
                  </p>
                </div>
              </div>
            </div>

            <!-- Fecha, Hora y Acciones -->
            <div class="flex sm:flex-col items-end justify-between sm:justify-center gap-4 shrink-0 border-t sm:border-t-0 pt-4 sm:pt-0">
              <!-- Info Horario -->
              <div class="text-left sm:text-right space-y-1">
                <p class="text-xs text-stone-400 font-bold uppercase tracking-wider">Fecha y Hora</p>
                <p class="text-sm font-black text-stone-800">{{ formatDate(appt.date) }}</p>
                <p class="text-xs font-bold text-teal-600">{{ appt.time }} hs</p>
              </div>

              <!-- Acciones de Estado -->
              <div class="flex gap-2">
                <button *ngIf="appt.status === 'PENDING'" 
                        (click)="changeStatus(appt.id, 'CONFIRMED')" 
                        class="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm">
                  Confirmar
                </button>
                <button *ngIf="appt.status !== 'CANCELLED'" 
                        (click)="changeStatus(appt.id, 'CANCELLED')" 
                        class="bg-stone-50 hover:bg-red-50 hover:text-red-700 border border-stone-200 hover:border-red-200 text-stone-500 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
                  Cancelar
                </button>
              </div>
            </div>

          </div>
        </div>

        <ng-template #noResults>
          <div class="py-16 text-center space-y-2">
            <p class="text-sm text-stone-400 italic">No se encontraron turnos que coincidan con los filtros aplicados.</p>
            <button (click)="resetFilters()" class="text-xs text-teal-600 font-bold hover:underline">Restablecer filtros</button>
          </div>
        </ng-template>

      </div>

    </div>
  `
})
export class AgendaComponent {
  searchQuery = signal('');
  statusFilter = signal('ALL');
  locationFilter = signal('ALL');

  constructor(private adminService: AdminService) {}

  filteredAppointments = computed(() => {
    const list = this.adminService.appointments();
    const query = this.searchQuery().toLowerCase().trim();
    const status = this.statusFilter();
    const location = this.locationFilter();

    return list.filter(a => {
      // 1. Filtro búsqueda
      const matchesSearch = !query || 
                            a.patientName.toLowerCase().includes(query) ||
                            a.patientDni.toLowerCase().includes(query) ||
                            a.patientEmail.toLowerCase().includes(query);
      
      // 2. Filtro Estado
      const matchesStatus = status === 'ALL' || a.status === status;

      // 3. Filtro Ubicación
      const matchesLocation = location === 'ALL' || a.location.includes(location);

      return matchesSearch && matchesStatus && matchesLocation;
    }).sort((a, b) => {
      // Ordenar por fecha y hora ascendente (las citas más cercanas primero)
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.time.localeCompare(b.time);
    });
  });

  getInitials(name: string): string {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  formatDate(dateStr: string): string {
    const parts = dateStr.split('-');
    // Formato local D/M/AAAA
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  changeStatus(id: string, status: 'CONFIRMED' | 'CANCELLED') {
    this.adminService.updateAppointmentStatus(id, status);
  }

  resetFilters() {
    this.searchQuery.set('');
    this.statusFilter.set('ALL');
    this.locationFilter.set('ALL');
  }
}
