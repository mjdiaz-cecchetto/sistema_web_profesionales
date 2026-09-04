import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, DayAvailability } from '../../services/admin.service';
import { ProfesionalPickerComponent } from '../profesional-picker/profesional-picker.component';
import { formatDMY, todayLocal } from '../../../core/date-utils';

@Component({
  selector: 'app-disponibilidad',
  standalone: true,
  imports: [CommonModule, FormsModule, ProfesionalPickerComponent],
  template: `
    <div class="space-y-6 animate-fade-in">

      <!-- Encabezado -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 class="text-2xl font-extrabold text-stone-900 tracking-tight">Disponibilidad de Atención</h1>
          <p class="text-sm text-stone-500 mt-0.5">Definí tus horarios semanales y bloqueá períodos especiales cuando lo necesites.</p>
        </div>

        <button type="button" (click)="toggleBloqueador()"
                [class]="mostrarBloqueador() ? 'bg-stone-100 hover:bg-stone-200 !text-stone-700 border border-stone-200' : 'bg-teal-200 hover:bg-teal-300 !text-teal-900 border border-teal-300'"
                class="px-4 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
          {{ mostrarBloqueador() ? 'Ocultar Bloqueador de Fechas' : 'Bloquear Fechas (Vacaciones / Feriados)' }}
        </button>
      </div>

      <app-profesional-picker></app-profesional-picker>

      <!-- Alerta de éxito -->
      <div *ngIf="showSuccessAlert()" class="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-sm font-semibold flex items-center justify-between animate-scale-in">
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <span>Configuración guardada. Los cambios impactan en tiempo real en la agenda de tus pacientes.</span>
        </div>
        <button (click)="showSuccessAlert.set(false)" class="text-emerald-500 hover:text-emerald-700 font-bold text-lg leading-none">×</button>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        <!-- Horario semanal -->
        <div [class.lg:col-span-7]="mostrarBloqueador()"
             [class.lg:col-span-12]="!mostrarBloqueador()"
             class="card p-6 space-y-4 transition-all duration-300">
          <h3 class="card-title pb-3 border-b border-stone-100">Horario Semanal de Atención</h3>

          <div class="space-y-3">
            <div *ngFor="let item of availabilityList(); let dayIdx = index"
                 [class.border-teal-200]="item.active"
                 [class.bg-teal-50/20]="item.active"
                 class="rounded-xl border border-stone-200/70 p-4 transition-all duration-200">

              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <!-- Switch -->
                <div class="flex items-center gap-3 shrink-0 sm:w-44">
                  <label class="relative inline-flex items-center cursor-pointer select-none">
                    <input type="checkbox" [(ngModel)]="item.active" class="sr-only peer">
                    <div class="w-10 h-5.5 h-6 bg-stone-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-[18px] after:w-[18px] after:transition-all after:shadow-sm peer-checked:bg-teal-400"></div>
                  </label>
                  <div>
                    <h4 class="font-extrabold text-stone-900 text-sm">{{ item.day }}</h4>
                    <span *ngIf="item.active" class="text-[9px] text-teal-600 font-bold uppercase tracking-wider">Activo</span>
                    <span *ngIf="!item.active" class="text-[9px] text-stone-400 font-bold uppercase tracking-wider">Cerrado</span>
                  </div>
                </div>

                <!-- Slots -->
                <div *ngIf="item.active" class="flex-grow flex flex-col gap-2.5">
                  <div class="flex flex-wrap gap-1.5">
                    <span *ngFor="let slot of item.slots; let slotIdx = index"
                          class="inline-flex items-center gap-1.5 bg-white border border-stone-200 hover:border-red-300 rounded-lg px-2.5 py-1 text-[11px] font-bold text-stone-600 transition-all select-none shadow-sm">
                      {{ slot }} hs
                      <button type="button" (click)="removeSlot(dayIdx, slotIdx)" class="text-stone-300 hover:text-red-500 font-black text-xs shrink-0 transition-colors">×</button>
                    </span>
                    <span *ngIf="item.slots.length === 0" class="text-xs text-stone-400 italic py-1">Sin horarios cargados.</span>
                  </div>

                  <div class="flex items-center gap-2 flex-wrap">
                    <input type="time" [(ngModel)]="newSlotTimes[dayIdx]"
                           class="bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/10">
                    <button type="button" (click)="addSlot(dayIdx)"
                            class="bg-teal-200 hover:bg-teal-300 text-teal-900 border border-teal-300 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0">
                      Agregar
                    </button>
                    <div class="flex gap-1">
                      <button type="button" (click)="loadPreset(dayIdx, 'mañana')"
                              class="bg-stone-100 hover:bg-teal-50 text-[10px] font-bold px-2 py-1 rounded-md text-stone-500 hover:text-teal-700 border border-stone-200/70 transition-colors">
                        + Mañana
                      </button>
                      <button type="button" (click)="loadPreset(dayIdx, 'tarde')"
                              class="bg-stone-100 hover:bg-teal-50 text-[10px] font-bold px-2 py-1 rounded-md text-stone-500 hover:text-teal-700 border border-stone-200/70 transition-colors">
                        + Tarde
                      </button>
                    </div>
                  </div>
                </div>

                <div *ngIf="!item.active" class="text-xs text-stone-400 italic">Día no laborable.</div>
              </div>
            </div>
          </div>

          <!-- Guardar -->
          <div class="flex justify-between items-center pt-2 gap-4 flex-wrap">
            <div *ngIf="!mostrarBloqueador() && blockedDatesList().length > 0" class="text-xs text-stone-500 flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-red-500"></span>
              Tenés {{ blockedDatesList().length }} {{ blockedDatesList().length === 1 ? 'período bloqueado' : 'períodos bloqueados' }}.
              <button (click)="toggleBloqueador()" class="text-teal-600 hover:text-teal-700 font-bold hover:underline">Ver bloqueos</button>
            </div>
            <div *ngIf="!mostrarBloqueador() && blockedDatesList().length === 0" class="text-xs text-stone-400">Sin excepciones de fecha activas.</div>
            <div *ngIf="mostrarBloqueador()"></div>

            <button type="button" (click)="saveWeeklyAvailability()" class="btn-primary !text-xs">
              Guardar Horarios Semanales
            </button>
          </div>
        </div>

        <!-- Bloqueador por calendario -->
        <div *ngIf="mostrarBloqueador()" class="lg:col-span-5 card p-6 space-y-4 animate-scale-in">
          <h3 class="card-title pb-3 border-b border-stone-100">Bloqueo por Calendario</h3>

          <p class="text-xs text-stone-500 leading-relaxed">
            Hacé clic en el <span class="font-bold text-stone-700">día de inicio</span> y luego en el
            <span class="font-bold text-stone-700">día de fin</span> para seleccionar el rango a bloquear.
          </p>

          <div class="border border-stone-200 rounded-2xl p-4 bg-stone-50/60">
            <div class="flex justify-between items-center mb-4">
              <button type="button" (click)="changeMonth(-1)" class="p-1.5 rounded-lg hover:bg-stone-200 text-stone-600 transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
              </button>
              <span class="text-xs font-extrabold text-stone-800 uppercase tracking-wider">{{ monthName() }}</span>
              <button type="button" (click)="changeMonth(1)" class="p-1.5 rounded-lg hover:bg-stone-200 text-stone-600 transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
              </button>
            </div>

            <div class="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">
              <span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span><span>Dom</span>
            </div>

            <div class="grid grid-cols-7 gap-1">
              <div *ngFor="let cell of calendarCells()"
                   [class.pointer-events-none]="!cell.date"
                   (click)="cell.date && selectDateCell(cell.date)"
                   [class.bg-teal-400]="cell.isSelectedStart || cell.isSelectedEnd"
                   [class.text-white]="cell.isSelectedStart || cell.isSelectedEnd"
                   [class.bg-teal-100]="cell.isInSelectedRange && !cell.isSelectedStart && !cell.isSelectedEnd"
                   [class.text-teal-800]="cell.isInSelectedRange && !cell.isSelectedStart && !cell.isSelectedEnd"
                   [class.font-black]="cell.isSelectedStart || cell.isSelectedEnd"
                   [class.opacity-50]="cell.isAlreadyBlocked"
                   [class.line-through]="cell.isAlreadyBlocked"
                   [class.bg-red-50]="cell.isAlreadyBlocked && !cell.isInSelectedRange"
                   [class.text-red-600]="cell.isAlreadyBlocked && !cell.isInSelectedRange"
                   class="aspect-square flex flex-col items-center justify-center text-xs font-semibold rounded-lg cursor-pointer transition-all hover:bg-stone-200/70 relative">
                <span>{{ cell.dayNum }}</span>
                <span *ngIf="cell.isToday"
                      [class.bg-white]="cell.isSelectedStart || cell.isSelectedEnd"
                      [class.bg-teal-600]="!cell.isSelectedStart && !cell.isSelectedEnd"
                      class="absolute bottom-1 w-1 h-1 rounded-full"></span>
              </div>
            </div>
          </div>

          <!-- Rango seleccionado -->
          <div *ngIf="rangeStart()" class="bg-stone-50 p-4 border border-stone-200 rounded-xl space-y-3 animate-scale-in text-xs">
            <div class="flex justify-between items-center">
              <div>
                <p class="field-label">Período Seleccionado</p>
                <p class="font-extrabold text-stone-800 text-sm mt-0.5">{{ rangeText() }}</p>
              </div>
              <button (click)="clearSelection()" class="text-stone-400 hover:text-stone-700 font-bold hover:underline">Cancelar</button>
            </div>

            <div class="space-y-1.5">
              <label class="field-label">Motivo del Bloqueo</label>
              <input type="text" [(ngModel)]="blockReasonInput" placeholder="Ej. Congreso, Vacaciones..."
                     class="input !text-xs !py-2 !bg-white">
            </div>

            <button type="button" (click)="addBlockedDateRange()"
                    class="w-full bg-teal-200 hover:bg-teal-300 text-teal-900 border border-teal-300 px-4 py-2.5 rounded-xl font-bold transition-colors">
              Bloquear Rango Seleccionado
            </button>
          </div>
        </div>
      </div>

      <!-- Lista de bloqueos -->
      <div *ngIf="mostrarBloqueador()" class="card p-6 space-y-4 animate-scale-in">
        <h3 class="card-title pb-3 border-b border-stone-100">Bloqueos de Fechas Activos</h3>

        <div *ngIf="blockedDatesList().length > 0; else noBlockedDates" class="divide-y divide-stone-100 border border-stone-100 rounded-xl overflow-hidden">
          <div *ngFor="let item of blockedDatesList()" class="bg-stone-50/40 px-5 py-4 flex items-center justify-between text-xs gap-4">
            <div class="flex items-center gap-3 min-w-0">
              <span class="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0"></span>
              <div class="min-w-0">
                <span class="font-bold text-stone-800">{{ formatRangeText(item.startDate, item.endDate) }}</span>
                <span *ngIf="item.reason" class="text-stone-400 ml-2 italic truncate">({{ item.reason }})</span>
              </div>
            </div>
            <button type="button" (click)="unblockDate(item.id)"
                    class="text-red-500 hover:text-red-700 font-bold hover:underline shrink-0">
              Desbloquear
            </button>
          </div>
        </div>

        <ng-template #noBlockedDates>
          <p class="text-xs text-stone-400 italic py-2">No tenés ninguna fecha o rango bloqueado actualmente.</p>
        </ng-template>
      </div>

    </div>
  `
})
export class DisponibilidadComponent {
  adminService = inject(AdminService);

  availabilityList = signal<DayAvailability[]>([]);
  newSlotTimes: string[] = Array(7).fill('08:00');

  mostrarBloqueador = signal(false);

  rangeStart = signal<string | null>(null);
  rangeEnd = signal<string | null>(null);
  blockReasonInput = '';

  mesActual = signal<number>(new Date().getMonth());
  anioActual = signal<number>(new Date().getFullYear());

  showSuccessAlert = signal(false);

  blockedDatesList = computed(() => this.adminService.bloqueosDelFoco());

  monthName = computed(() => {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${meses[this.mesActual()]} ${this.anioActual()}`;
  });

  calendarCells = computed(() => {
    const mes = this.mesActual();
    const anio = this.anioActual();
    const start = this.rangeStart();
    const end = this.rangeEnd();
    const activeBlocks = this.blockedDatesList();

    const primerDia = new Date(anio, mes, 1);
    const ultimoDia = new Date(anio, mes + 1, 0);

    const totalDias = ultimoDia.getDate();
    let diaSemanaInicio = primerDia.getDay() - 1;
    if (diaSemanaInicio < 0) diaSemanaInicio = 6;

    const cells: {
      date: string | null,
      dayNum: number | null,
      isToday: boolean,
      isAlreadyBlocked: boolean,
      isSelectedStart: boolean,
      isSelectedEnd: boolean,
      isInSelectedRange: boolean
    }[] = [];

    for (let i = 0; i < diaSemanaInicio; i++) {
      cells.push({ date: null, dayNum: null, isToday: false, isAlreadyBlocked: false, isSelectedStart: false, isSelectedEnd: false, isInSelectedRange: false });
    }

    const todayStr = todayLocal();

    for (let i = 1; i <= totalDias; i++) {
      const mesStr = String(mes + 1).padStart(2, '0');
      const diaStr = String(i).padStart(2, '0');
      const fechaStr = `${anio}-${mesStr}-${diaStr}`;

      cells.push({
        date: fechaStr,
        dayNum: i,
        isToday: fechaStr === todayStr,
        isAlreadyBlocked: activeBlocks.some(b => b.startDate <= fechaStr && fechaStr <= b.endDate),
        isSelectedStart: start === fechaStr,
        isSelectedEnd: end === fechaStr,
        isInSelectedRange: !!(start && end && start <= fechaStr && fechaStr <= end)
      });
    }

    return cells;
  });

  rangeText = computed(() => {
    const start = this.rangeStart();
    const end = this.rangeEnd();
    if (!start) return '';
    if (!end || start === end) return formatDMY(start);
    return `${formatDMY(start)} al ${formatDMY(end)}`;
  });

  constructor() {
    // Copiar la disponibilidad del profesional en foco al estado editable,
    // y volver a copiarla cada vez que cambia el profesional seleccionado.
    let focoAnterior = '';
    effect(() => {
      const foco = this.adminService.focoId();
      const data = this.adminService.availability();
      if (foco && foco !== focoAnterior && data.length > 0) {
        focoAnterior = foco;
        this.availabilityList.set(JSON.parse(JSON.stringify(data)));
      }
    });
  }

  toggleBloqueador() {
    this.mostrarBloqueador.set(!this.mostrarBloqueador());
  }

  changeMonth(delta: number) {
    let m = this.mesActual() + delta;
    let y = this.anioActual();
    if (m > 11) { m = 0; y++; }
    if (m < 0) { m = 11; y--; }
    this.mesActual.set(m);
    this.anioActual.set(y);
  }

  selectDateCell(dateStr: string) {
    const start = this.rangeStart();
    const end = this.rangeEnd();

    if (!start || (start && end)) {
      this.rangeStart.set(dateStr);
      this.rangeEnd.set(null);
    } else if (dateStr < start) {
      this.rangeStart.set(dateStr);
      this.rangeEnd.set(null);
    } else {
      this.rangeEnd.set(dateStr);
    }
  }

  clearSelection() {
    this.rangeStart.set(null);
    this.rangeEnd.set(null);
    this.blockReasonInput = '';
  }

  addBlockedDateRange() {
    const start = this.rangeStart();
    if (!start) return;
    const end = this.rangeEnd() || start;
    this.adminService.blockDateRange(start, end, this.blockReasonInput.trim());
    this.clearSelection();
  }

  addSlot(dayIdx: number) {
    const time = this.newSlotTimes[dayIdx];
    if (!time) return;

    this.availabilityList.update(list =>
      list.map((d, i) => {
        if (i !== dayIdx || d.slots.includes(time)) return d;
        return { ...d, slots: [...d.slots, time].sort() };
      })
    );
  }

  removeSlot(dayIdx: number, slotIdx: number) {
    this.availabilityList.update(list =>
      list.map((d, i) => i === dayIdx ? { ...d, slots: d.slots.filter((_, s) => s !== slotIdx) } : d)
    );
  }

  loadPreset(dayIdx: number, type: 'mañana' | 'tarde') {
    const preset = type === 'mañana'
      ? ['08:00', '09:00', '10:00', '11:00']
      : ['17:00', '18:00', '19:00', '20:00'];

    this.availabilityList.update(list =>
      list.map((d, i) => {
        if (i !== dayIdx) return d;
        const nuevos = preset.filter(t => !d.slots.includes(t));
        return { ...d, slots: [...d.slots, ...nuevos].sort() };
      })
    );
  }

  saveWeeklyAvailability() {
    this.adminService.saveAvailability(this.availabilityList());
    this.showSuccessAlert.set(true);
    setTimeout(() => this.showSuccessAlert.set(false), 4000);
  }

  unblockDate(id: string) {
    this.adminService.unblockDateRange(id);
  }

  formatRangeText(start: string, end: string): string {
    if (start === end) return formatDMY(start);
    return `${formatDMY(start)} al ${formatDMY(end)}`;
  }
}
