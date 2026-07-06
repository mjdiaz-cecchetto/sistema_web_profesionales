import { Component, computed, signal, effect } from '@angular/core';
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
            <input type="text" [ngModel]="searchQuery()" (ngModelChange)="onSearchChange($event)" 
                   placeholder="Nombre, DNI o email..."
                   class="w-full bg-stone-50 border border-stone-200 rounded-xl pl-10 pr-4 py-2 text-xs focus:border-teal-500 focus:bg-white focus:outline-none transition-all">
            <svg class="w-4 h-4 text-stone-400 absolute left-3.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
        </div>

        <!-- Filtro por Estado -->
        <div class="space-y-1">
          <label class="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Estado del Turno</label>
          <select [ngModel]="statusFilter()" (ngModelChange)="onStatusChange($event)" 
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
          <select [ngModel]="locationFilter()" (ngModelChange)="onLocationChange($event)" 
                  class="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs focus:border-teal-500 focus:bg-white focus:outline-none transition-all">
            <option value="ALL">Todas las ubicaciones</option>
            <option value="Palermo">Consultorio Palermo</option>
            <option value="Belgrano">Centro Belgrano</option>
            <option value="Online">Consulta Online</option>
          </select>
        </div>
      </div>

      <!-- Listado de Resultados -->
      <div class="bg-white rounded-2xl border border-stone-200/60 shadow-sm overflow-hidden flex flex-col">
        
        <!-- Header Tabla/Lista -->
        <div class="bg-stone-50/80 px-6 py-3 border-b border-stone-200/60 flex items-center gap-4 text-[10px] font-bold text-stone-400 uppercase tracking-wider hidden sm:flex">
          <div class="w-10 shrink-0"></div> <!-- Espacio Avatar -->
          <div class="flex-1 grid grid-cols-12 gap-4">
            <div class="col-span-4">Paciente y Servicio</div>
            <div class="col-span-4">Contacto y Cobertura</div>
            <div class="col-span-2 text-right">Fecha y Hora</div>
            <div class="col-span-2 text-right">Acciones</div>
          </div>
        </div>

        <!-- Cuerpo de Citas -->
        <div *ngIf="filteredAppointments().length > 0; else noResults" class="divide-y divide-stone-100 flex-1">
          <div *ngFor="let appt of paginatedAppointments()" class="px-6 py-4 hover:bg-stone-50/50 transition-colors flex flex-col sm:flex-row sm:items-center gap-4 group">
            
            <!-- Avatar Iniciales -->
            <div class="w-10 h-10 rounded-full bg-teal-50 text-teal-700 font-bold text-sm flex items-center justify-center shrink-0 border border-teal-100 hidden sm:flex">
              {{ getInitials(appt.patientName) }}
            </div>
            
            <!-- Datos principales -->
            <div class="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-y-3 gap-x-4 items-center">
              
              <!-- Paciente y Servicio (4 cols) -->
              <div class="sm:col-span-4 space-y-0.5">
                <div class="flex items-center gap-2">
                  <h4 class="font-extrabold text-stone-900 text-sm truncate" [title]="appt.patientName">{{ appt.patientName }}</h4>
                  <span [class.bg-emerald-50]="appt.status === 'CONFIRMED'"
                        [class.text-emerald-700]="appt.status === 'CONFIRMED'"
                        [class.border-emerald-200]="appt.status === 'CONFIRMED'"
                        [class.bg-amber-50]="appt.status === 'PENDING'"
                        [class.text-amber-700]="appt.status === 'PENDING'"
                        [class.border-amber-200]="appt.status === 'PENDING'"
                        [class.bg-red-50]="appt.status === 'CANCELLED'"
                        [class.text-red-700]="appt.status === 'CANCELLED'"
                        [class.border-red-200]="appt.status === 'CANCELLED'"
                        class="px-1.5 py-0.5 text-[9px] font-bold rounded-full border whitespace-nowrap shrink-0">
                    {{ appt.status === 'CONFIRMED' ? 'Confirmado' : appt.status === 'PENDING' ? 'Pendiente' : 'Cancelado' }}
                  </span>
                </div>
                <p class="text-[11px] text-stone-500 truncate" [title]="appt.serviceName + ' · ' + appt.location">
                  {{ appt.serviceName }} · <span class="font-medium text-stone-700">{{ appt.location }}</span>
                </p>
                <p *ngIf="appt.notes" class="text-[10px] text-amber-600 truncate mt-1 italic" [title]="appt.notes">
                  <span class="font-semibold">Nota:</span> "{{ appt.notes }}"
                </p>
              </div>

              <!-- Contacto y Cobertura (4 cols) -->
              <div class="sm:col-span-4 text-[11px] text-stone-500 space-y-1">
                <p class="truncate"><span class="font-semibold text-stone-400">Tel:</span> {{ appt.patientPhone }} <span class="mx-1 hidden sm:inline">•</span> <br class="sm:hidden"/><span class="font-semibold text-stone-400">Email:</span> <span class="truncate">{{ appt.patientEmail }}</span></p>
                <p class="truncate"><span class="font-semibold text-stone-400">DNI:</span> {{ appt.patientDni }} <span class="mx-1 hidden sm:inline">•</span> <br class="sm:hidden"/><span class="font-semibold text-stone-400">Cob:</span> <span class="font-medium text-stone-600">{{ appt.healthInsurance }}</span></p>
              </div>

              <!-- Fecha y Hora (2 cols) -->
              <div class="sm:col-span-2 text-left sm:text-right border-t border-stone-100 sm:border-0 pt-2 sm:pt-0">
                <p class="text-xs font-black text-stone-800">{{ formatDate(appt.date) }}</p>
                <p class="text-[11px] font-bold text-teal-600">{{ appt.time }} hs</p>
              </div>

              <!-- Acciones (2 cols) -->
              <div class="sm:col-span-2 flex justify-start sm:justify-end gap-1.5 mt-2 sm:mt-0">
                <button *ngIf="appt.status === 'PENDING'" 
                        (click)="changeStatus(appt.id, 'CONFIRMED')" 
                        class="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1.5 rounded text-[10px] font-bold transition-colors shadow-sm w-full sm:w-auto text-center">
                  Confirmar
                </button>
                <button *ngIf="appt.status !== 'CANCELLED'" 
                        (click)="changeStatus(appt.id, 'CANCELLED')" 
                        class="bg-stone-50 hover:bg-red-50 hover:text-red-700 border border-stone-200 hover:border-red-200 text-stone-500 px-2 py-1.5 rounded text-[10px] font-bold transition-colors w-full sm:w-auto text-center">
                  Cancelar
                </button>
              </div>
              
            </div>

          </div>
        </div>

        <ng-template #noResults>
          <div class="py-16 text-center space-y-2 flex-1">
            <p class="text-sm text-stone-400 italic">No se encontraron turnos que coincidan con los filtros aplicados.</p>
            <button (click)="resetFilters()" class="text-xs text-teal-600 font-bold hover:underline">Restablecer filtros</button>
          </div>
        </ng-template>

        <!-- Paginación -->
        <div *ngIf="totalPages() > 1" class="bg-stone-50/50 px-6 py-3 border-t border-stone-200/60 flex items-center justify-between text-xs">
          <p class="text-stone-500 hidden sm:block">
            Mostrando <span class="font-bold text-stone-700">{{ startIndex() }}</span> a 
            <span class="font-bold text-stone-700">{{ endIndex() }}</span> de 
            <span class="font-bold text-stone-700">{{ totalItems() }}</span> turnos
          </p>
          <p class="text-stone-500 sm:hidden">
            {{ startIndex() }} - {{ endIndex() }} de {{ totalItems() }}
          </p>
          
          <div class="flex items-center gap-1.5">
            <button (click)="prevPage()" [disabled]="currentPage() === 1" 
                    class="px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 hover:text-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold flex items-center gap-1">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"></path></svg>
              <span class="hidden sm:inline">Anterior</span>
            </button>
            <div class="flex items-center px-2 font-bold text-stone-500">
              Página <span class="text-stone-800 mx-1">{{ currentPage() }}</span> de {{ totalPages() }}
            </div>
            <button (click)="nextPage()" [disabled]="currentPage() === totalPages()" 
                    class="px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 hover:text-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold flex items-center gap-1">
              <span class="hidden sm:inline">Siguiente</span>
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"></path></svg>
            </button>
          </div>
        </div>

      </div>

    </div>
  `
})
export class AgendaComponent {
  searchQuery = signal('');
  statusFilter = signal('ALL');
  locationFilter = signal('ALL');
  
  // Paginación
  currentPage = signal(1);
  readonly itemsPerPage = 10;

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

  // Computed properties para paginación
  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredAppointments().length / this.itemsPerPage)));
  
  paginatedAppointments = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredAppointments().slice(start, end);
  });

  totalItems = computed(() => this.filteredAppointments().length);
  startIndex = computed(() => this.totalItems() === 0 ? 0 : (this.currentPage() - 1) * this.itemsPerPage + 1);
  endIndex = computed(() => Math.min(this.currentPage() * this.itemsPerPage, this.totalItems()));

  // Handlers para resetear página cuando cambian los filtros
  onSearchChange(val: string) {
    this.searchQuery.set(val);
    this.currentPage.set(1);
  }

  onStatusChange(val: string) {
    this.statusFilter.set(val);
    this.currentPage.set(1);
  }

  onLocationChange(val: string) {
    this.locationFilter.set(val);
    this.currentPage.set(1);
  }

  // Navegación paginación
  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
    }
  }

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
    this.currentPage.set(1);
  }
}
