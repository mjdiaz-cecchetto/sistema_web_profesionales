import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, Patient } from '../../services/admin.service';

@Component({
  selector: 'app-pacientes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      
      <!-- Encabezado -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 class="text-2xl font-black text-stone-900 tracking-tight">Pacientes</h1>
          <p class="text-sm text-stone-500">Listado de todos tus pacientes registrados en el sistema.</p>
        </div>
        <!-- Botón decorativo de Nuevo Paciente -->
        <button class="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm transition-colors flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
          Nuevo Paciente
        </button>
      </div>

      <!-- Barra de Filtros y Búsqueda -->
      <div class="bg-white rounded-2xl border border-stone-200/60 p-5 shadow-sm">
        <div class="max-w-md space-y-1">
          <label class="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Buscar Paciente</label>
          <div class="relative">
            <input type="text" [ngModel]="searchQuery()" (ngModelChange)="onSearchChange($event)" 
                   placeholder="Nombre, DNI, email o teléfono..."
                   class="w-full bg-stone-50 border border-stone-200 rounded-xl pl-10 pr-4 py-2 text-xs focus:border-teal-500 focus:bg-white focus:outline-none transition-all">
            <svg class="w-4 h-4 text-stone-400 absolute left-3.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
        </div>
      </div>

      <!-- Listado de Resultados -->
      <div class="bg-white rounded-2xl border border-stone-200/60 shadow-sm overflow-hidden flex flex-col">
        
        <!-- Header Tabla/Lista -->
        <div class="bg-stone-50/80 px-6 py-3 border-b border-stone-200/60 flex items-center gap-4 text-[10px] font-bold text-stone-400 uppercase tracking-wider hidden sm:flex">
          <div class="w-10 shrink-0"></div> <!-- Espacio Avatar -->
          <div class="flex-1 grid grid-cols-12 gap-4">
            <div class="col-span-4">Datos del Paciente</div>
            <div class="col-span-4">Contacto</div>
            <div class="col-span-2">Cobertura</div>
            <div class="col-span-2 text-right">Fecha de Alta</div>
          </div>
        </div>

        <!-- Cuerpo de Pacientes -->
        <div *ngIf="filteredPatients().length > 0; else noResults" class="divide-y divide-stone-100 flex-1">
          <div *ngFor="let pat of paginatedPatients()" class="px-6 py-4 hover:bg-stone-50/50 transition-colors flex flex-col sm:flex-row sm:items-center gap-4 group">
            
            <!-- Avatar Iniciales -->
            <div class="w-10 h-10 rounded-full bg-teal-50 text-teal-700 font-bold text-sm flex items-center justify-center shrink-0 border border-teal-100 hidden sm:flex">
              {{ getInitials(pat.nombre) }}
            </div>
            
            <!-- Datos principales -->
            <div class="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-y-3 gap-x-4 items-center">
              
              <!-- Paciente (4 cols) -->
              <div class="sm:col-span-4 space-y-0.5">
                <h4 class="font-extrabold text-stone-900 text-sm truncate" [title]="pat.nombre">{{ pat.nombre }}</h4>
                <p class="text-[11px] text-stone-500 truncate" [title]="'DNI: ' + pat.dni">DNI: <span class="font-medium text-stone-700">{{ pat.dni }}</span></p>
              </div>

              <!-- Contacto (4 cols) -->
              <div class="sm:col-span-4 text-[11px] text-stone-500 space-y-1">
                <p class="truncate"><span class="font-semibold text-stone-400">Tel:</span> {{ pat.telefono }}</p>
                <p class="truncate"><span class="font-semibold text-stone-400">Email:</span> <span class="truncate">{{ pat.email }}</span></p>
              </div>

              <!-- Cobertura (2 cols) -->
              <div class="sm:col-span-2 text-[11px] text-stone-500">
                <span class="inline-flex items-center px-2 py-1 rounded-md bg-stone-100 text-stone-700 font-medium truncate max-w-full">
                  {{ pat.obraSocial }}
                </span>
              </div>

              <!-- Fecha de Alta (2 cols) -->
              <div class="sm:col-span-2 text-left sm:text-right border-t border-stone-100 sm:border-0 pt-2 sm:pt-0">
                <p class="text-xs font-black text-stone-800">{{ formatDate(pat.fechaAlta) }}</p>
              </div>
              
            </div>

          </div>
        </div>

        <ng-template #noResults>
          <div class="py-16 text-center space-y-2 flex-1">
            <p class="text-sm text-stone-400 italic">No se encontraron pacientes que coincidan con la búsqueda.</p>
            <button (click)="resetFilters()" class="text-xs text-teal-600 font-bold hover:underline">Limpiar búsqueda</button>
          </div>
        </ng-template>

        <!-- Paginación -->
        <div *ngIf="totalPages() > 1" class="bg-stone-50/50 px-6 py-3 border-t border-stone-200/60 flex items-center justify-between text-xs">
          <p class="text-stone-500 hidden sm:block">
            Mostrando <span class="font-bold text-stone-700">{{ startIndex() }}</span> a 
            <span class="font-bold text-stone-700">{{ endIndex() }}</span> de 
            <span class="font-bold text-stone-700">{{ totalItems() }}</span> pacientes
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
export class PacientesComponent {
  searchQuery = signal('');
  
  // Paginación
  currentPage = signal(1);
  readonly itemsPerPage = 10;

  constructor(private adminService: AdminService) {}

  filteredPatients = computed(() => {
    const list = this.adminService.patients();
    const query = this.searchQuery().toLowerCase().trim();

    return list.filter(p => {
      if (!query) return true;
      return p.nombre.toLowerCase().includes(query) ||
             p.dni.toLowerCase().includes(query) ||
             p.email.toLowerCase().includes(query) ||
             p.telefono.toLowerCase().includes(query);
    }).sort((a, b) => a.nombre.localeCompare(b.nombre)); // Orden alfabético por defecto
  });

  // Computed properties para paginación
  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredPatients().length / this.itemsPerPage)));
  
  paginatedPatients = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredPatients().slice(start, end);
  });

  totalItems = computed(() => this.filteredPatients().length);
  startIndex = computed(() => this.totalItems() === 0 ? 0 : (this.currentPage() - 1) * this.itemsPerPage + 1);
  endIndex = computed(() => Math.min(this.currentPage() * this.itemsPerPage, this.totalItems()));

  onSearchChange(val: string) {
    this.searchQuery.set(val);
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
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  resetFilters() {
    this.searchQuery.set('');
    this.currentPage.set(1);
  }
}
