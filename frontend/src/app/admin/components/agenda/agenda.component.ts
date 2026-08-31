import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminAppointment } from '../../services/admin.service';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';
import { AgendaTabsComponent } from '../agenda-tabs/agenda-tabs.component';
import { TurnoModalComponent } from '../turno-modal/turno-modal.component';
import { formatDMY, todayLocal, toLocalDateString } from '../../../core/date-utils';
import { linkWhatsapp } from '../../../core/whatsapp';

type RangoRapido = 'TODOS' | 'HOY' | 'SEMANA' | 'MES';

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DatePickerComponent,
    AgendaTabsComponent,
    TurnoModalComponent,
  ],
  host: { class: 'block xl:h-full' },
  template: `
    <div class="xl:h-full flex flex-col gap-3 animate-fade-in min-h-0">
      <!-- Toast flotante -->
      <div
        *ngIf="toastMensaje()"
        class="fixed top-24 left-1/2 -translate-x-1/2 z-[60] bg-emerald-100 border border-emerald-300 text-emerald-900 px-5 py-3 rounded-2xl text-sm font-bold flex items-center gap-2.5 animate-scale-in max-w-[calc(100vw-2rem)]"
      >
        <svg
          class="w-5 h-5 text-emerald-600 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          ></path>
        </svg>
        <span>{{ toastMensaje() }}</span>
        <button
          (click)="toastMensaje.set('')"
          class="text-emerald-500 hover:text-emerald-800 font-black leading-none ml-1"
        >
          ×
        </button>
      </div>

      <!-- Fila 1: tabs + Nuevo Turno -->
      <div class="flex items-center justify-between gap-2.5 shrink-0">
        <app-agenda-tabs></app-agenda-tabs>
        <button
          (click)="abrirModal()"
          class="btn-primary !text-xs !py-2.5 flex items-center justify-center gap-2 shrink-0"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2.5"
              d="M12 4v16m8-8H4"
            ></path>
          </svg>
          <span class="hidden sm:inline">Nuevo Turno</span>
          <span class="sm:hidden">Nuevo</span>
        </button>
      </div>

      <!-- Fila 2: búsqueda + estado (siempre visibles) + botón de filtros -->
      <div class="flex flex-col sm:flex-row sm:items-center gap-2 shrink-0">
        <div class="relative flex-1 sm:max-w-sm">
          <input
            type="text"
            [ngModel]="searchQuery()"
            (ngModelChange)="onSearchChange($event)"
            placeholder="Buscar por nombre, DNI o email..."
            class="input !pl-10 !py-2 !text-xs"
          />
          <svg
            class="w-4 h-4 text-stone-400 absolute left-3.5 top-2.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            ></path>
          </svg>
        </div>

        <div class="flex items-center gap-2">
          <div class="relative w-40">
            <select
              [ngModel]="statusFilter()"
              (ngModelChange)="onStatusChange($event)"
              class="input !py-2 !text-xs appearance-none cursor-pointer !pr-8"
            >
              <option value="ALL">Todos los estados</option>
              <option value="CONFIRMED">Confirmado</option>
              <option value="PENDING">Pendiente</option>
              <option value="CANCELLED">Cancelado</option>
            </select>
            <svg
              class="w-4 h-4 text-stone-400 absolute right-3 top-2.5 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 9l-7 7-7-7"
              ></path>
            </svg>
          </div>

          <!-- Botón de filtros avanzados -->
          <button
            (click)="filtrosAbiertos.set(!filtrosAbiertos())"
            [ngClass]="
              filtrosAbiertos() || filtrosAvanzadosCount() > 0
                ? 'bg-teal-100 text-teal-900 border-teal-300'
                : 'bg-white text-stone-500 border-stone-200 hover:text-teal-800 hover:border-teal-300'
            "
            class="px-3 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 shrink-0"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              ></path>
            </svg>
            Filtros
            <span
              *ngIf="filtrosAvanzadosCount() > 0"
              class="bg-white text-teal-900 border border-teal-300 px-1.5 py-0.5 rounded-full text-[9px]"
              >{{ filtrosAvanzadosCount() }}</span
            >
          </button>

          <span class="text-[11px] text-stone-400 font-semibold whitespace-nowrap ml-auto sm:ml-0">
            {{ totalItems() }} {{ totalItems() === 1 ? 'resultado' : 'resultados' }}
          </span>
        </div>
      </div>

      <!-- Panel de filtros avanzados -->
      <div *ngIf="filtrosAbiertos()" class="card p-4 shrink-0 animate-scale-in space-y-3">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <!-- Rango rápido -->
          <div class="space-y-1.5 sm:col-span-2 lg:col-span-1">
            <label class="field-label">Rango rápido</label>
            <div class="flex gap-1">
              <button
                *ngFor="let r of rangosRapidos"
                (click)="setRango(r.value)"
                [ngClass]="
                  rangoActivo() === r.value
                    ? 'bg-teal-100 text-teal-900 border-teal-200'
                    : 'bg-white text-stone-500 border-stone-200 hover:bg-stone-50'
                "
                class="flex-1 px-1.5 py-2 rounded-lg text-[9px] font-bold border transition-colors"
              >
                {{ r.label }}
              </button>
            </div>
          </div>

          <app-date-picker
            label="Fecha Desde"
            placeholder="Desde..."
            [value]="dateFromFilter()"
            (valueChange)="onDateFromChange($event)"
          >
          </app-date-picker>

          <app-date-picker
            label="Fecha Hasta"
            placeholder="Hasta..."
            [value]="dateToFilter()"
            (valueChange)="onDateToChange($event)"
          >
          </app-date-picker>

          <div class="space-y-1.5">
            <label class="field-label">Servicio</label>
            <div class="relative">
              <select
                [ngModel]="serviceFilter()"
                (ngModelChange)="onServiceChange($event)"
                class="input !py-2 !text-xs appearance-none cursor-pointer !pr-8"
              >
                <option value="ALL">Todos</option>
                <option *ngFor="let s of services()" [value]="s">{{ s }}</option>
              </select>
              <svg
                class="w-4 h-4 text-stone-400 absolute right-3 top-2.5 pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 9l-7 7-7-7"
                ></path>
              </svg>
            </div>
          </div>

          <div class="space-y-1.5">
            <label class="field-label">Obra Social</label>
            <div class="relative">
              <select
                [ngModel]="insuranceFilter()"
                (ngModelChange)="onInsuranceChange($event)"
                class="input !py-2 !text-xs appearance-none cursor-pointer !pr-8"
              >
                <option value="ALL">Todas</option>
                <option *ngFor="let o of insurances()" [value]="o">{{ o }}</option>
              </select>
              <svg
                class="w-4 h-4 text-stone-400 absolute right-3 top-2.5 pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 9l-7 7-7-7"
                ></path>
              </svg>
            </div>
          </div>
        </div>

        <div class="flex justify-between items-center gap-3 flex-wrap">
          <!-- Lugar -->
          <div class="flex items-center gap-2">
            <label class="field-label !normal-case">Lugar:</label>
            <div class="relative w-48">
              <select
                [ngModel]="locationFilter()"
                (ngModelChange)="onLocationChange($event)"
                class="input !py-1.5 !text-xs appearance-none cursor-pointer !pr-8"
              >
                <option value="ALL">Todos</option>
                <option *ngFor="let loc of locations()" [value]="loc">{{ loc }}</option>
              </select>
              <svg
                class="w-4 h-4 text-stone-400 absolute right-3 top-2 pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 9l-7 7-7-7"
                ></path>
              </svg>
            </div>
          </div>

          <button
            *ngIf="filtrosActivosCount() > 0"
            (click)="resetFilters()"
            class="text-xs font-bold text-teal-700 hover:text-teal-800 hover:underline flex items-center gap-1.5"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
            Limpiar {{ filtrosActivosCount() }}
            {{ filtrosActivosCount() === 1 ? 'filtro' : 'filtros' }}
          </button>
        </div>
      </div>

      <!-- ===== Listado (único scroll) ===== -->
      <div class="card flex-1 min-h-0 flex flex-col overflow-hidden">
        <!-- Header tabla (desktop) -->
        <div
          class="bg-stone-50 px-6 py-3 border-b border-stone-200 items-center gap-4 text-[10px] font-bold text-stone-400 uppercase tracking-wider hidden lg:flex shrink-0"
        >
          <div class="w-10 shrink-0"></div>
          <div class="flex-1 grid grid-cols-12 gap-4">
            <div class="col-span-4">Paciente y Servicio</div>
            <div class="col-span-4">Contacto y Cobertura</div>
            <div class="col-span-2 text-right">Fecha y Hora</div>
            <div class="col-span-2 text-right">Acciones</div>
          </div>
        </div>

        <!-- Cuerpo scrolleable -->
        <div class="flex-1 min-h-0 overflow-y-auto max-h-[60vh] xl:max-h-none">
          <div
            *ngIf="filteredAppointments().length > 0; else noResults"
            class="divide-y divide-stone-100"
          >
            <div
              *ngFor="let appt of paginatedAppointments()"
              class="px-4 sm:px-6 py-3.5 hover:bg-teal-50/60 transition-colors flex flex-col lg:flex-row lg:items-center gap-3"
              [class.opacity-60]="appt.status === 'CANCELLED'"
            >
              <div
                class="w-10 h-10 rounded-full bg-teal-100 text-teal-800 font-extrabold text-sm items-center justify-center shrink-0 border border-teal-200 hidden lg:flex"
              >
                {{ getInitials(appt.patientName) }}
              </div>

              <div class="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-y-2.5 gap-x-4 items-center">
                <div class="lg:col-span-4 space-y-1">
                  <div class="flex items-center gap-2 flex-wrap">
                    <h4
                      class="font-extrabold text-stone-800 text-sm truncate"
                      [title]="appt.patientName"
                    >
                      {{ appt.patientName }}
                    </h4>
                    <span
                      class="chip shrink-0"
                      [class.chip-confirmed]="appt.status === 'CONFIRMED'"
                      [class.chip-pending]="appt.status === 'PENDING'"
                      [class.chip-cancelled]="appt.status === 'CANCELLED'"
                    >
                      {{ statusLabel(appt.status) }}
                    </span>
                  </div>
                  <p
                    class="text-[11px] text-stone-500 truncate"
                    [title]="appt.serviceName + ' · ' + appt.location"
                  >
                    {{ appt.serviceName }} ·
                    <span class="font-semibold text-stone-600">{{ appt.location }}</span>
                  </p>
                  <p
                    *ngIf="appt.notes"
                    class="text-[10px] text-amber-800 truncate italic bg-amber-50 border border-amber-100 rounded-md px-2 py-0.5"
                    [title]="appt.notes"
                  >
                    "{{ appt.notes }}"
                  </p>
                </div>

                <div class="lg:col-span-4 text-[11px] text-stone-500 space-y-0.5">
                  <p class="truncate">
                    <span class="font-semibold text-stone-400">Tel:</span> {{ appt.patientPhone }}
                    <span class="mx-1 hidden lg:inline">•</span> <br class="lg:hidden" /><span
                      class="font-semibold text-stone-400"
                      >Email:</span
                    >
                    {{ appt.patientEmail }}
                  </p>
                  <p class="truncate">
                    <span class="font-semibold text-stone-400">DNI:</span> {{ appt.patientDni }}
                    <span class="mx-1 hidden lg:inline">•</span> <br class="lg:hidden" /><span
                      class="font-semibold text-stone-400"
                      >Cob.:</span
                    >&nbsp;<span class="font-semibold text-stone-600">{{
                      appt.healthInsurance
                    }}</span>
                  </p>
                </div>

                <div class="lg:col-span-2 text-left lg:text-right">
                  <p class="text-xs font-extrabold text-stone-700">{{ formatDate(appt.date) }}</p>
                  <p class="text-[11px] font-bold text-teal-700">{{ appt.time }} hs</p>
                </div>

                <div class="lg:col-span-2 flex justify-stretch lg:justify-end gap-1.5">
                  <a
                    [href]="linkWhatsappTurno(appt)"
                    target="_blank"
                    rel="noopener"
                    title="Enviar confirmación por WhatsApp"
                    class="bg-teal-100 hover:bg-teal-200 text-teal-900 border border-teal-200 px-2.5 py-1.5 rounded-lg transition-colors flex items-center justify-center shrink-0"
                  >
                    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path
                        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.497.1-.198.05-.371-.025-.52-.074-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
                      />
                    </svg>
                  </a>
                  <button
                    (click)="abrirEdicion(appt)"
                    title="Editar turno"
                    class="bg-white hover:bg-teal-50 hover:text-teal-800 border border-stone-200 hover:border-teal-300 text-stone-500 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-colors flex items-center gap-1 flex-1 lg:flex-initial justify-center"
                  >
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      ></path>
                    </svg>
                    Editar
                  </button>
                  <button
                    *ngIf="appt.status === 'PENDING'"
                    (click)="changeStatus(appt.id, 'CONFIRMED')"
                    class="bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-200 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-colors flex-1 lg:flex-initial text-center"
                  >
                    Confirmar
                  </button>
                  <button
                    *ngIf="appt.status !== 'CANCELLED'"
                    (click)="changeStatus(appt.id, 'CANCELLED')"
                    class="bg-white hover:bg-rose-50 hover:text-rose-700 border border-stone-200 hover:border-rose-200 text-stone-500 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-colors flex-1 lg:flex-initial text-center"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>

          <ng-template #noResults>
            <div class="py-14 text-center space-y-3">
              <div
                class="w-14 h-14 mx-auto rounded-2xl bg-stone-100 flex items-center justify-center"
              >
                <svg
                  class="w-7 h-7 text-stone-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.5"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  ></path>
                </svg>
              </div>
              <p class="text-sm text-stone-500">
                No se encontraron turnos con los filtros aplicados.
              </p>
              <button
                (click)="resetFilters()"
                class="text-xs text-teal-700 font-bold hover:underline"
              >
                Restablecer filtros
              </button>
            </div>
          </ng-template>
        </div>

        <!-- Paginación -->
        <div
          *ngIf="totalPages() > 1"
          class="bg-stone-50 px-4 sm:px-6 py-2.5 border-t border-stone-200 flex items-center justify-between text-xs shrink-0"
        >
          <p class="text-stone-500 hidden sm:block">
            <span class="font-bold text-stone-700">{{ startIndex() }}</span
            >–<span class="font-bold text-stone-700">{{ endIndex() }}</span> de
            <span class="font-bold text-stone-700">{{ totalItems() }}</span>
          </p>
          <p class="text-stone-500 sm:hidden">
            {{ startIndex() }}–{{ endIndex() }} de {{ totalItems() }}
          </p>

          <div class="flex items-center gap-1.5">
            <button
              (click)="prevPage()"
              [disabled]="currentPage() === 1"
              class="px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-stone-600 hover:text-teal-800 hover:bg-teal-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-semibold flex items-center gap-1"
            >
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2.5"
                  d="M15 19l-7-7 7-7"
                ></path>
              </svg>
              <span class="hidden sm:inline">Anterior</span>
            </button>
            <div class="flex items-center px-2 font-bold text-stone-500">
              <span class="text-stone-800 mx-1">{{ currentPage() }}</span> / {{ totalPages() }}
            </div>
            <button
              (click)="nextPage()"
              [disabled]="currentPage() === totalPages()"
              class="px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-stone-600 hover:text-teal-800 hover:bg-teal-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-semibold flex items-center gap-1"
            >
              <span class="hidden sm:inline">Siguiente</span>
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2.5"
                  d="M9 5l7 7-7 7"
                ></path>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Modal Nuevo Turno / Editar Turno -->
      <app-turno-modal
        *ngIf="modalAbierto()"
        [fechaInicial]="fechaParaModal()"
        [turnoEditar]="turnoEnEdicion()"
        (cerrar)="cerrarModal()"
        (creado)="onTurnosCreados($event)"
        (actualizado)="onTurnoActualizado()"
      >
      </app-turno-modal>
    </div>

    <!-- Modal Nuevo Turno -->
    <app-modal [isOpen]="isModalOpen()" title="Nuevo Turno" (closeModal)="isModalOpen.set(false)">
      <app-appointment-form (save)="onAppointmentSubmit($event)"></app-appointment-form>
    </app-modal>
  `,
})
export class AgendaComponent {
  private adminService = inject(AdminService);

  searchQuery = signal('');
  statusFilter = signal('ALL');
  locationFilter = signal('ALL');
  serviceFilter = signal('ALL');
  insuranceFilter = signal('ALL');
  dateFromFilter = signal('');
  dateToFilter = signal('');
  rangoActivo = signal<RangoRapido>('TODOS');

  filtrosAbiertos = signal(false);

  currentPage = signal(1);
  readonly itemsPerPage = 8;

  // Modal Nuevo Turno / Edición
  modalAbierto = signal(false);
  fechaParaModal = signal<string | null>(null);
  turnoEnEdicion = signal<AdminAppointment | null>(null);
  toastMensaje = signal('');

  rangosRapidos: { label: string; value: RangoRapido }[] = [
    { label: 'Todos', value: 'TODOS' },
    { label: 'Hoy', value: 'HOY' },
    { label: 'Semana', value: 'SEMANA' },
    { label: 'Mes', value: 'MES' },
  ];

  locations = computed(() =>
    [...new Set(this.adminService.appointments().map((a) => a.location))].sort(),
  );
  services = computed(() =>
    [...new Set(this.adminService.appointments().map((a) => a.serviceName))].sort(),
  );
  insurances = computed(() =>
    [...new Set(this.adminService.appointments().map((a) => a.healthInsurance))].sort(),
  );

  /** Filtros avanzados activos (los que viven dentro del panel). */
  filtrosAvanzadosCount = computed(() => {
    let n = 0;
    if (this.locationFilter() !== 'ALL') n++;
    if (this.serviceFilter() !== 'ALL') n++;
    if (this.insuranceFilter() !== 'ALL') n++;
    if (this.dateFromFilter()) n++;
    if (this.dateToFilter()) n++;
    return n;
  });

  /** Todos los filtros activos (incluye búsqueda y estado). */
  filtrosActivosCount = computed(() => {
    let n = this.filtrosAvanzadosCount();
    if (this.searchQuery().trim()) n++;
    if (this.statusFilter() !== 'ALL') n++;
    return n;
  });

  filteredAppointments = computed(() => {
    const list = this.adminService.appointments();
    const query = this.searchQuery().toLowerCase().trim();
    const status = this.statusFilter();
    const location = this.locationFilter();
    const service = this.serviceFilter();
    const insurance = this.insuranceFilter();
    const fromDate = this.dateFromFilter();
    const toDate = this.dateToFilter();

    return list
      .filter((a) => {
        const matchesSearch =
          !query ||
          a.patientName.toLowerCase().includes(query) ||
          a.patientDni.toLowerCase().includes(query) ||
          a.patientEmail.toLowerCase().includes(query);

        const matchesStatus = status === 'ALL' || a.status === status;
        const matchesLocation = location === 'ALL' || a.location === location;
        const matchesService = service === 'ALL' || a.serviceName === service;
        const matchesInsurance = insurance === 'ALL' || a.healthInsurance === insurance;

        let matchesDate = true;
        if (fromDate) matchesDate = matchesDate && a.date >= fromDate;
        if (toDate) matchesDate = matchesDate && a.date <= toDate;

        return (
          matchesSearch &&
          matchesStatus &&
          matchesLocation &&
          matchesService &&
          matchesInsurance &&
          matchesDate
        );
      })
      .sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return (a.time || '').localeCompare(b.time || '');
      });
  });

  totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredAppointments().length / this.itemsPerPage)),
  );

  paginatedAppointments = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    return this.filteredAppointments().slice(start, start + this.itemsPerPage);
  });

  totalItems = computed(() => this.filteredAppointments().length);
  startIndex = computed(() =>
    this.totalItems() === 0 ? 0 : (this.currentPage() - 1) * this.itemsPerPage + 1,
  );
  endIndex = computed(() => Math.min(this.currentPage() * this.itemsPerPage, this.totalItems()));

  setRango(rango: RangoRapido) {
    this.rangoActivo.set(rango);
    const hoy = new Date();

    if (rango === 'TODOS') {
      this.dateFromFilter.set('');
      this.dateToFilter.set('');
    } else if (rango === 'HOY') {
      const t = todayLocal();
      this.dateFromFilter.set(t);
      this.dateToFilter.set(t);
    } else if (rango === 'SEMANA') {
      const dow = hoy.getDay() === 0 ? 7 : hoy.getDay();
      const lunes = new Date(hoy);
      lunes.setDate(hoy.getDate() - (dow - 1));
      const domingo = new Date(lunes);
      domingo.setDate(lunes.getDate() + 6);
      this.dateFromFilter.set(toLocalDateString(lunes));
      this.dateToFilter.set(toLocalDateString(domingo));
    } else if (rango === 'MES') {
      const primero = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      const ultimo = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
      this.dateFromFilter.set(toLocalDateString(primero));
      this.dateToFilter.set(toLocalDateString(ultimo));
    }
    this.currentPage.set(1);
  }

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
  onServiceChange(val: string) {
    this.serviceFilter.set(val);
    this.currentPage.set(1);
  }
  onInsuranceChange(val: string) {
    this.insuranceFilter.set(val);
    this.currentPage.set(1);
  }
  onDateFromChange(val: string) {
    this.dateFromFilter.set(val);
    this.rangoActivo.set('TODOS');
    this.currentPage.set(1);
  }
  onDateToChange(val: string) {
    this.dateToFilter.set(val);
    this.rangoActivo.set('TODOS');
    this.currentPage.set(1);
  }

  prevPage() {
    if (this.currentPage() > 1) this.currentPage.update((p) => p - 1);
  }
  nextPage() {
    if (this.currentPage() < this.totalPages()) this.currentPage.update((p) => p + 1);
  }

  // ---- Modal ----
  abrirModal() {
    this.turnoEnEdicion.set(null);
    this.fechaParaModal.set(todayLocal());
    this.toastMensaje.set('');
    this.modalAbierto.set(true);
  }

  abrirEdicion(turno: AdminAppointment) {
    this.fechaParaModal.set(null);
    this.turnoEnEdicion.set(turno);
    this.toastMensaje.set('');
    this.modalAbierto.set(true);
  }

  cerrarModal() {
    this.modalAbierto.set(false);
    this.turnoEnEdicion.set(null);
  }

  onTurnosCreados(cantidad: number) {
    this.cerrarModal();
    this.mostrarToast(
      cantidad === 1
        ? 'Turno creado con éxito.'
        : `Se crearon ${cantidad} turnos de la serie con éxito.`,
    );
  }

  onTurnoActualizado() {
    this.cerrarModal();
    this.mostrarToast('Turno actualizado con éxito.');
  }

  private mostrarToast(mensaje: string) {
    this.toastMensaje.set(mensaje);
    setTimeout(() => this.toastMensaje.set(''), 5000);
  }

  // ---- Helpers ----
  getInitials(name: string): string {
    if (!name) return '';
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }

  formatDate = formatDMY;

  statusLabel(status: string): string {
    return status === 'CONFIRMED' ? 'Confirmado' : status === 'PENDING' ? 'Pendiente' : 'Cancelado';
  }

  changeStatus(id: string, status: 'CONFIRMED' | 'CANCELLED') {
    this.adminService.updateAppointmentStatus(id, status);
  }

  /** Link wa.me al paciente con la confirmación/recordatorio del turno pre-escrito. */
  linkWhatsappTurno(appt: AdminAppointment): string {
    const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const [y, m, d] = appt.date.split('-').map(Number);
    const dia = dias[new Date(y, m - 1, d).getDay()];
    const fecha = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
    const profesional = this.adminService.profile()?.nombre ?? '';
    const estado = appt.status === 'CONFIRMED' ? 'Te confirmo' : 'Te recuerdo';
    const mensaje = `Hola ${appt.patientName}! ${estado} tu turno de ${appt.serviceName} el ${dia} ${fecha} a las ${appt.time} hs en ${appt.location}. Cualquier cambio avisame por acá. ${profesional}`;
    return linkWhatsapp(appt.patientPhone, mensaje);
  }

  resetFilters() {
    this.searchQuery.set('');
    this.statusFilter.set('ALL');
    this.locationFilter.set('ALL');
    this.serviceFilter.set('ALL');
    this.insuranceFilter.set('ALL');
    this.dateFromFilter.set('');
    this.dateToFilter.set('');
    this.rangoActivo.set('TODOS');
    this.currentPage.set(1);
  }
}
