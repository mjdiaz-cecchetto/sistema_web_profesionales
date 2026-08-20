import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../services/admin.service';
import { formatDMY } from '../../../core/date-utils';

@Component({
  selector: 'app-pacientes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6 animate-fade-in">

      <!-- Encabezado -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 class="text-2xl font-extrabold text-stone-900 tracking-tight">Pacientes</h1>
          <p class="text-sm text-stone-500 mt-0.5">Listado de todos tus pacientes registrados en el sistema.</p>
        </div>
        <span class="chip !text-[11px] !px-3 !py-1.5 bg-teal-50 text-teal-700 border-teal-200">
          {{ totalItems() }} en total
        </span>
      </div>

      <!-- Búsqueda -->
      <div class="card p-5">
        <div class="max-w-md space-y-1.5">
          <label class="field-label">Buscar Paciente</label>
          <div class="relative">
            <input type="text" [ngModel]="searchQuery()" (ngModelChange)="onSearchChange($event)"
                   placeholder="Nombre, DNI, email o teléfono..."
                   class="input !pl-10 !py-2 !text-xs">
            <svg class="w-4 h-4 text-stone-400 absolute left-3.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
        </div>
      </div>

      <!-- Listado -->
      <div class="card overflow-hidden flex flex-col">

        <div class="bg-stone-50/80 px-6 py-3 border-b border-stone-200/70 items-center gap-4 text-[10px] font-bold text-stone-400 uppercase tracking-wider hidden sm:flex">
          <div class="w-10 shrink-0"></div>
          <div class="flex-1 grid grid-cols-12 gap-4">
            <div class="col-span-4">Datos del Paciente</div>
            <div class="col-span-4">Contacto</div>
            <div class="col-span-2">Cobertura</div>
            <div class="col-span-2 text-right">Fecha de Alta</div>
          </div>
        </div>

        <div *ngIf="filteredPatients().length > 0; else noResults" class="divide-y divide-stone-100 flex-1">
          <div *ngFor="let pat of paginatedPatients()"
               class="px-6 py-4 hover:bg-teal-50/30 transition-colors flex flex-col sm:flex-row sm:items-center gap-4">

            <div class="w-10 h-10 rounded-full bg-teal-100 text-teal-700 font-extrabold text-sm items-center justify-center shrink-0 border border-teal-100 hidden sm:flex">
              {{ getInitials(pat.nombre) }}
            </div>

            <div class="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-y-3 gap-x-4 items-center">

              <div class="sm:col-span-4 space-y-0.5">
                <h4 class="font-extrabold text-stone-900 text-sm truncate" [title]="pat.nombre">{{ pat.nombre }}</h4>
                <p class="text-[11px] text-stone-500 truncate">DNI: <span class="font-semibold text-stone-700">{{ pat.dni }}</span></p>
              </div>

              <div class="sm:col-span-4 text-[11px] text-stone-500 space-y-1">
                <p class="truncate"><span class="font-semibold text-stone-400">Tel:</span> {{ pat.telefono }}</p>
                <p class="truncate"><span class="font-semibold text-stone-400">Email:</span> {{ pat.email }}</p>
              </div>

              <div class="sm:col-span-2 text-[11px]">
                <span class="inline-flex items-center px-2.5 py-1 rounded-lg bg-stone-100 text-stone-700 font-semibold truncate max-w-full">
                  {{ pat.obraSocial }}
                </span>
              </div>

              <div class="sm:col-span-2 text-left sm:text-right border-t border-stone-100 sm:border-0 pt-2 sm:pt-0">
                <p class="text-xs font-extrabold text-stone-800">{{ formatDate(pat.fechaAlta) }}</p>
              </div>

            </div>
          </div>
        </div>

        <ng-template #noResults>
          <div class="py-16 text-center space-y-3 flex-1">
            <div class="w-14 h-14 mx-auto rounded-2xl bg-stone-100 flex items-center justify-center">
              <svg class="w-7 h-7 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            </div>
            <p class="text-sm text-stone-500">No se encontraron pacientes con esa búsqueda.</p>
            <button (click)="resetFilters()" class="text-xs text-teal-600 font-bold hover:underline">Limpiar búsqueda</button>
          </div>
        </ng-template>

        <!-- Paginación -->
        <div *ngIf="totalPages() > 1" class="bg-stone-50/60 px-6 py-3 border-t border-stone-200/70 flex items-center justify-between text-xs">
          <p class="text-stone-500 hidden sm:block">
            Mostrando <span class="font-bold text-stone-700">{{ startIndex() }}</span> a
            <span class="font-bold text-stone-700">{{ endIndex() }}</span> de
            <span class="font-bold text-stone-700">{{ totalItems() }}</span> pacientes
          </p>
          <p class="text-stone-500 sm:hidden">{{ startIndex() }} - {{ endIndex() }} de {{ totalItems() }}</p>

          <div class="flex items-center gap-1.5">
            <button (click)="prevPage()" [disabled]="currentPage() === 1"
                    class="px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-stone-600 hover:text-teal-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-semibold flex items-center gap-1">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"></path></svg>
              <span class="hidden sm:inline">Anterior</span>
            </button>
            <div class="flex items-center px-2 font-bold text-stone-500">
              Página <span class="text-stone-800 mx-1">{{ currentPage() }}</span> de {{ totalPages() }}
            </div>
            <button (click)="nextPage()" [disabled]="currentPage() === totalPages()"
                    class="px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-stone-600 hover:text-teal-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-semibold flex items-center gap-1">
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
  private adminService = inject(AdminService);

  searchQuery = signal('');
  currentPage = signal(1);
  readonly itemsPerPage = 10;

  filteredPatients = computed(() => {
    const list = this.adminService.patients();
    const query = this.searchQuery().toLowerCase().trim();

    return list.filter(p => {
      if (!query) return true;
      return p.nombre.toLowerCase().includes(query) ||
             p.dni.toLowerCase().includes(query) ||
             p.email.toLowerCase().includes(query) ||
             p.telefono.toLowerCase().includes(query);
    }).sort((a, b) => a.nombre.localeCompare(b.nombre));
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
  prevPage() { if (this.currentPage() > 1) this.currentPage.update(p => p - 1); }
  nextPage() { if (this.currentPage() < this.totalPages()) this.currentPage.update(p => p + 1); }

  getInitials(name: string): string {
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }

  formatDate = formatDMY;

  resetFilters() {
    this.searchQuery.set('');
    this.currentPage.set(1);
  }
}
