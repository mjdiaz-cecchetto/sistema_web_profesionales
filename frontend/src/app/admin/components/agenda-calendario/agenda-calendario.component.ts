import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminAppointment } from '../../services/admin.service';
import { AgendaTabsComponent } from '../agenda-tabs/agenda-tabs.component';
import { TurnoModalComponent } from '../turno-modal/turno-modal.component';
import { todayLocal } from '../../../core/date-utils';
import { linkWhatsapp } from '../../../core/whatsapp';

interface CeldaDia {
  date: string | null;
  dayNum: number | null;
  isToday: boolean;
  isSelected: boolean;
  confirmed: number;
  pending: number;
  cancelled: number;
  total: number;
}

type FiltroEstado = 'ALL' | 'CONFIRMED' | 'PENDING' | 'CANCELLED';

@Component({
  selector: 'app-agenda-calendario',
  standalone: true,
  imports: [CommonModule, FormsModule, AgendaTabsComponent, TurnoModalComponent],
  host: { class: 'block xl:h-full' },
  template: `
    <div class="xl:h-full flex flex-col gap-3 animate-fade-in min-h-0">

      <!-- Toast flotante (no empuja el layout) -->
      <div *ngIf="toastMensaje()"
           class="fixed top-24 left-1/2 -translate-x-1/2 z-[60] bg-emerald-100 border border-emerald-300 text-emerald-900 px-5 py-3 rounded-2xl text-sm font-bold flex items-center gap-2.5 animate-scale-in max-w-[calc(100vw-2rem)]">
        <svg class="w-5 h-5 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <span>{{ toastMensaje() }}</span>
        <button (click)="toastMensaje.set('')" class="text-emerald-500 hover:text-emerald-800 font-black leading-none ml-1">×</button>
      </div>

      <!-- Fila única de controles -->
      <div class="flex items-center justify-between gap-2.5 shrink-0">
        <app-agenda-tabs></app-agenda-tabs>
        <button (click)="abrirModal()" class="btn-primary !text-xs !py-2.5 flex items-center justify-center gap-2 shrink-0">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
          <span class="hidden sm:inline">Nuevo Turno</span>
          <span class="sm:hidden">Nuevo</span>
        </button>
      </div>

      <!-- Cuerpo: calendario + panel del día -->
      <div class="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-5 gap-4 items-stretch">

        <!-- ===== Calendario ===== -->
        <div class="xl:col-span-3 card p-4 flex flex-col min-h-0">

          <!-- Mes + filtros de estado -->
          <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 mb-3 shrink-0">
            <div class="flex items-center gap-1.5">
              <button type="button" (click)="changeMonth(-1)"
                      class="w-8 h-8 rounded-lg border border-stone-200 bg-white hover:bg-teal-50 hover:border-teal-300 text-stone-500 hover:text-teal-800 flex items-center justify-center transition-colors shrink-0">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"></path></svg>
              </button>
              <div class="text-center min-w-[140px] flex items-center justify-center gap-2">
                <span class="text-xs font-extrabold text-stone-800 uppercase tracking-wider">{{ monthName() }}</span>
                <button *ngIf="!esMesActual()" (click)="irAHoy()" class="text-[10px] font-bold text-teal-700 hover:underline">
                  Hoy
                </button>
              </div>
              <button type="button" (click)="changeMonth(1)"
                      class="w-8 h-8 rounded-lg border border-stone-200 bg-white hover:bg-teal-50 hover:border-teal-300 text-stone-500 hover:text-teal-800 flex items-center justify-center transition-colors shrink-0">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"></path></svg>
              </button>
            </div>

            <div class="flex flex-wrap items-center gap-1.5">
              <button *ngFor="let f of filtrosEstado"
                      (click)="setFiltro(f.value)"
                      [ngClass]="filtroEstado() === f.value
                        ? f.activeClass
                        : 'bg-white text-stone-500 border-stone-200 hover:text-stone-700 hover:bg-stone-50'"
                      class="px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-colors flex items-center gap-1.5">
                <span *ngIf="f.dotClass" class="w-1.5 h-1.5 rounded-full" [ngClass]="f.dotClass"></span>
                {{ f.label }}
                <span class="opacity-60">{{ contadorPorEstado()[f.value] }}</span>
              </button>
            </div>
          </div>

          <!-- Días de la semana -->
          <div class="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1.5 shrink-0">
            <span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span><span>Dom</span>
          </div>

          <!-- Celdas (se estiran para llenar el alto disponible en desktop) -->
          <div class="grid grid-cols-7 gap-1 xl:flex-1 xl:min-h-0 xl:auto-rows-fr xl:content-stretch">
            <div *ngFor="let cell of calendarCells()"
                 (click)="cell.date && seleccionarDia(cell.date)"
                 [class.pointer-events-none]="!cell.date"
                 [ngClass]="cell.isSelected
                   ? 'bg-teal-100 border-teal-300'
                   : cell.total > 0
                     ? 'bg-white border-stone-200 hover:border-teal-300 hover:bg-teal-50'
                     : 'bg-white border-transparent hover:bg-stone-50'"
                 class="aspect-square xl:aspect-auto rounded-lg border cursor-pointer transition-colors relative flex flex-col items-center justify-center gap-0.5 select-none min-h-0">

              <span [ngClass]="cell.isToday ? 'bg-teal-600 text-white w-5.5 h-5.5 w-6 h-6 rounded-full flex items-center justify-center' : cell.isSelected ? 'text-teal-900 font-extrabold' : 'text-stone-600'"
                    class="text-xs font-semibold leading-none">
                {{ cell.dayNum }}
              </span>

              <div *ngIf="cell.total > 0" class="flex items-center gap-0.5 sm:gap-1">
                <span *ngIf="cell.confirmed > 0" class="w-1.5 h-1.5 rounded-full bg-emerald-400" [title]="cell.confirmed + ' confirmados'"></span>
                <span *ngIf="cell.pending > 0" class="w-1.5 h-1.5 rounded-full bg-amber-400" [title]="cell.pending + ' pendientes'"></span>
                <span *ngIf="cell.cancelled > 0" class="w-1.5 h-1.5 rounded-full bg-rose-400" [title]="cell.cancelled + ' cancelados'"></span>
              </div>
              <span *ngIf="cell.total > 0" class="hidden xl:block text-[9px] font-bold text-stone-400 leading-none">
                {{ cell.total }}
              </span>
            </div>
          </div>

          <!-- Leyenda compacta -->
          <div class="flex flex-wrap items-center gap-3 mt-2 pt-2 border-t border-stone-100 text-[9px] font-bold text-stone-400 shrink-0">
            <span class="flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Confirmado</span>
            <span class="flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span> Pendiente</span>
            <span class="flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span> Cancelado</span>
            <span class="flex items-center gap-1 ml-auto"><span class="w-3.5 h-3.5 rounded-full bg-teal-600 text-white text-[8px] flex items-center justify-center">{{ diaHoyNum }}</span> Hoy</span>
          </div>
        </div>

        <!-- ===== Detalle del día ===== -->
        <div class="xl:col-span-2 card flex flex-col min-h-0 xl:h-full">

          <!-- Header del panel -->
          <div class="px-4 pt-4 pb-3 border-b border-stone-100 shrink-0 space-y-2.5">
            <div class="flex items-center justify-between gap-2">
              <h3 class="card-title !text-sm truncate">{{ tituloDia() }}</h3>
              <div class="flex items-center gap-1.5 shrink-0">
                <span class="text-[10px] text-stone-400 font-bold bg-stone-100 px-2 py-1 rounded-full">
                  {{ turnosDelDia().length }}
                </span>
                <!-- Filtro por nombre/DNI -->
                <button (click)="toggleFiltroDia()"
                        title="Filtrar por nombre o DNI"
                        [ngClass]="filtroDiaAbierto() || busquedaDia() ? 'bg-teal-100 text-teal-800 border-teal-300' : 'bg-white text-stone-400 border-stone-200 hover:text-teal-800 hover:border-teal-300'"
                        class="w-7 h-7 rounded-lg border flex items-center justify-center transition-colors">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
                </button>
                <!-- Nuevo turno en este día -->
                <button *ngIf="diaSeleccionado()" (click)="abrirModal(diaSeleccionado())"
                        title="Agendar turno en este día"
                        class="w-7 h-7 rounded-lg bg-teal-100 hover:bg-teal-200 text-teal-800 border border-teal-200 flex items-center justify-center transition-colors">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
                </button>
              </div>
            </div>

            <!-- Buscador del día -->
            <div *ngIf="filtroDiaAbierto()" class="relative animate-scale-in">
              <input type="text" [ngModel]="busquedaDia()" (ngModelChange)="busquedaDia.set($event)"
                     placeholder="Filtrar por nombre o DNI..."
                     class="input !pl-9 !py-2 !text-xs">
              <svg class="w-4 h-4 text-stone-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              <button *ngIf="busquedaDia()" (click)="busquedaDia.set('')"
                      class="absolute right-3 top-2 text-stone-400 hover:text-stone-600 font-black text-sm">×</button>
            </div>
          </div>

          <!-- Lista de turnos: ÚNICO scroll de la vista -->
          <div class="flex-1 min-h-0 overflow-y-auto px-4 py-3 max-h-[55vh] xl:max-h-none">
            <div *ngIf="turnosDelDia().length > 0; else diaVacio" class="space-y-2.5">
              <div *ngFor="let appt of turnosDelDia()"
                   class="border rounded-xl p-3.5 transition-colors animate-scale-in"
                   [ngClass]="appt.status === 'CONFIRMED' ? 'border-emerald-200 bg-emerald-50/60'
                            : appt.status === 'PENDING' ? 'border-amber-200 bg-amber-50/60'
                            : 'border-rose-200 bg-rose-50/50 opacity-75'">

                <div class="flex items-start justify-between gap-2">
                  <div class="flex items-center gap-2.5 min-w-0">
                    <div class="w-11 text-center py-1.5 bg-white border border-stone-200 rounded-lg shrink-0">
                      <p class="text-[11px] font-extrabold text-teal-800 leading-none">{{ appt.time }}</p>
                      <p class="text-[7px] text-stone-400 uppercase font-bold mt-0.5">hs</p>
                    </div>
                    <div class="min-w-0">
                      <h4 class="font-extrabold text-stone-800 text-[13px] truncate">{{ appt.patientName }}</h4>
                      <p class="text-[10px] text-stone-500 truncate">
                        <span *ngIf="adminService.esConsultorio()" class="font-bold text-teal-700">{{ adminService.nombreDe(appt.profesionalId) }} · </span>{{ appt.serviceName }} · {{ appt.location }}
                      </p>
                    </div>
                  </div>
                  <span class="chip shrink-0 !text-[9px]"
                        [class.chip-confirmed]="appt.status === 'CONFIRMED'"
                        [class.chip-pending]="appt.status === 'PENDING'"
                        [class.chip-cancelled]="appt.status === 'CANCELLED'">
                    {{ statusLabel(appt.status) }}
                  </span>
                </div>

                <p *ngIf="appt.notes" class="text-[10px] italic text-stone-500 mt-2 bg-white border border-stone-100 rounded-lg px-2.5 py-1.5 truncate" [title]="appt.notes">
                  "{{ appt.notes }}"
                </p>

                <div class="flex items-center justify-between gap-2 mt-2.5">
                  <p class="text-[9px] text-stone-400 truncate">
                    {{ appt.healthInsurance }} · DNI {{ appt.patientDni }}
                  </p>
                  <div class="flex gap-1.5 shrink-0">
                    <a [href]="linkWhatsappTurno(appt)" target="_blank" rel="noopener"
                       title="Enviar confirmación por WhatsApp"
                       class="bg-teal-100 hover:bg-teal-200 text-teal-900 border border-teal-200 w-7 h-7 rounded-lg transition-colors flex items-center justify-center">
                      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.497.1-.198.05-.371-.025-.52-.074-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    </a>
                    <button (click)="abrirEdicion(appt)"
                            title="Editar turno"
                            class="bg-white hover:bg-teal-50 hover:text-teal-800 border border-stone-200 hover:border-teal-300 text-stone-500 px-2 py-1 rounded-lg text-[9px] font-bold transition-colors flex items-center gap-1">
                      <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                      Editar
                    </button>
                    <button *ngIf="appt.status === 'PENDING'"
                            (click)="changeStatus(appt.id, 'CONFIRMED')"
                            class="bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-200 px-2 py-1 rounded-lg text-[9px] font-bold transition-colors">
                      Confirmar
                    </button>
                    <button *ngIf="appt.status !== 'CANCELLED'"
                            (click)="changeStatus(appt.id, 'CANCELLED')"
                            class="bg-white hover:bg-rose-50 hover:text-rose-700 border border-stone-200 hover:border-rose-200 text-stone-500 px-2 py-1 rounded-lg text-[9px] font-bold transition-colors">
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <ng-template #diaVacio>
              <div class="py-8 text-center space-y-2.5">
                <div class="w-11 h-11 mx-auto rounded-2xl bg-stone-100 flex items-center justify-center">
                  <svg class="w-5 h-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                </div>
                <p class="text-[11px] text-stone-400 px-4">
                  {{ busquedaDia()
                    ? 'Ningún turno de este día coincide con "' + busquedaDia() + '".'
                    : diaSeleccionado() ? 'Sin turnos para este día con el filtro actual.' : 'Tocá un día del calendario para ver sus turnos.' }}
                </p>
                <button *ngIf="busquedaDia()" (click)="busquedaDia.set('')" class="text-[10px] text-teal-700 font-bold hover:underline">
                  Limpiar búsqueda
                </button>
              </div>
            </ng-template>
          </div>
        </div>

      </div>

      <!-- Modal Nuevo Turno / Editar Turno -->
      <app-turno-modal *ngIf="modalAbierto()"
                       [fechaInicial]="fechaParaModal()"
                       [turnoEditar]="turnoEnEdicion()"
                       (cerrar)="cerrarModal()"
                       (creado)="onTurnosCreados($event)"
                       (actualizado)="onTurnoActualizado()">
      </app-turno-modal>
    </div>
  `
})
export class AgendaCalendarioComponent {
  adminService = inject(AdminService);

  mesActual = signal<number>(new Date().getMonth());
  anioActual = signal<number>(new Date().getFullYear());
  diaSeleccionado = signal<string | null>(todayLocal());
  filtroEstado = signal<FiltroEstado>('ALL');

  // Filtro del panel del día
  filtroDiaAbierto = signal(false);
  busquedaDia = signal('');

  // Modal Nuevo Turno / Edición
  modalAbierto = signal(false);
  fechaParaModal = signal<string | null>(null);
  turnoEnEdicion = signal<AdminAppointment | null>(null);
  toastMensaje = signal('');

  readonly diaHoyNum = new Date().getDate();

  filtrosEstado: { label: string; value: FiltroEstado; dotClass: string; activeClass: string }[] = [
    { label: 'Todos', value: 'ALL', dotClass: '', activeClass: 'bg-teal-100 text-teal-900 border-teal-200' },
    { label: 'Confirmados', value: 'CONFIRMED', dotClass: 'bg-emerald-400', activeClass: 'bg-emerald-100 text-emerald-900 border-emerald-200' },
    { label: 'Pendientes', value: 'PENDING', dotClass: 'bg-amber-400', activeClass: 'bg-amber-100 text-amber-900 border-amber-200' },
    { label: 'Cancelados', value: 'CANCELLED', dotClass: 'bg-rose-400', activeClass: 'bg-rose-100 text-rose-800 border-rose-200' }
  ];

  monthName = computed(() => {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${meses[this.mesActual()]} ${this.anioActual()}`;
  });

  esMesActual = computed(() => {
    const hoy = new Date();
    return this.mesActual() === hoy.getMonth() && this.anioActual() === hoy.getFullYear();
  });

  private turnosFiltrados = computed(() => {
    const filtro = this.filtroEstado();
    const list = this.adminService.turnosVisibles();
    return filtro === 'ALL' ? list : list.filter(a => a.status === filtro);
  });

  contadorPorEstado = computed(() => {
    const list = this.adminService.turnosVisibles();
    return {
      ALL: list.length,
      CONFIRMED: list.filter(a => a.status === 'CONFIRMED').length,
      PENDING: list.filter(a => a.status === 'PENDING').length,
      CANCELLED: list.filter(a => a.status === 'CANCELLED').length
    };
  });

  private turnosPorFecha = computed(() => {
    const map = new Map<string, AdminAppointment[]>();
    for (const a of this.turnosFiltrados()) {
      const arr = map.get(a.date) ?? [];
      arr.push(a);
      map.set(a.date, arr);
    }
    return map;
  });

  calendarCells = computed<CeldaDia[]>(() => {
    const mes = this.mesActual();
    const anio = this.anioActual();
    const seleccionado = this.diaSeleccionado();
    const porFecha = this.turnosPorFecha();

    const primerDia = new Date(anio, mes, 1);
    const totalDias = new Date(anio, mes + 1, 0).getDate();

    let diaSemanaInicio = primerDia.getDay() - 1;
    if (diaSemanaInicio < 0) diaSemanaInicio = 6;

    const cells: CeldaDia[] = [];
    for (let i = 0; i < diaSemanaInicio; i++) {
      cells.push({ date: null, dayNum: null, isToday: false, isSelected: false, confirmed: 0, pending: 0, cancelled: 0, total: 0 });
    }

    const todayStr = todayLocal();

    for (let i = 1; i <= totalDias; i++) {
      const fechaStr = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const turnos = porFecha.get(fechaStr) ?? [];

      cells.push({
        date: fechaStr,
        dayNum: i,
        isToday: fechaStr === todayStr,
        isSelected: fechaStr === seleccionado,
        confirmed: turnos.filter(t => t.status === 'CONFIRMED').length,
        pending: turnos.filter(t => t.status === 'PENDING').length,
        cancelled: turnos.filter(t => t.status === 'CANCELLED').length,
        total: turnos.length
      });
    }

    return cells;
  });

  turnosDelDia = computed(() => {
    const dia = this.diaSeleccionado();
    if (!dia) return [];
    const q = this.busquedaDia().toLowerCase().trim();
    return (this.turnosPorFecha().get(dia) ?? [])
      .filter(a => !q || a.patientName.toLowerCase().includes(q) || a.patientDni.toLowerCase().includes(q))
      .slice()
      .sort((a, b) => a.time.localeCompare(b.time));
  });

  tituloDia = computed(() => {
    const dia = this.diaSeleccionado();
    if (!dia) return 'Turnos del día';
    const [y, m, d] = dia.split('-').map(Number);
    const fecha = new Date(y, m - 1, d);
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${dias[fecha.getDay()]} ${d} de ${meses[m - 1]}`;
  });

  changeMonth(delta: number) {
    let m = this.mesActual() + delta;
    let y = this.anioActual();
    if (m > 11) { m = 0; y++; }
    if (m < 0) { m = 11; y--; }
    this.mesActual.set(m);
    this.anioActual.set(y);
  }

  irAHoy() {
    const hoy = new Date();
    this.mesActual.set(hoy.getMonth());
    this.anioActual.set(hoy.getFullYear());
    this.diaSeleccionado.set(todayLocal());
  }

  seleccionarDia(fecha: string) {
    this.diaSeleccionado.set(fecha);
  }

  setFiltro(f: FiltroEstado) {
    this.filtroEstado.set(f);
  }

  toggleFiltroDia() {
    const abierto = !this.filtroDiaAbierto();
    this.filtroDiaAbierto.set(abierto);
    if (!abierto) this.busquedaDia.set('');
  }

  abrirModal(fecha: string | null = null) {
    this.turnoEnEdicion.set(null);
    this.fechaParaModal.set(fecha ?? this.diaSeleccionado() ?? todayLocal());
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
    this.mostrarToast(cantidad === 1 ? 'Turno creado con éxito.' : `Se crearon ${cantidad} turnos de la serie con éxito.`);
  }

  onTurnoActualizado() {
    this.cerrarModal();
    this.mostrarToast('Turno actualizado con éxito.');
  }

  private mostrarToast(mensaje: string) {
    this.toastMensaje.set(mensaje);
    setTimeout(() => this.toastMensaje.set(''), 5000);
  }

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
    const profesional = this.adminService.nombreDe(appt.profesionalId);
    const estado = appt.status === 'CONFIRMED' ? 'Te confirmo' : 'Te recuerdo';
    const mensaje = `Hola ${appt.patientName}! ${estado} tu turno de ${appt.serviceName} el ${dia} ${fecha} a las ${appt.time} hs en ${appt.location}. Cualquier cambio avisame por acá. ${profesional}`;
    return linkWhatsapp(appt.patientPhone, mensaje);
  }
}
