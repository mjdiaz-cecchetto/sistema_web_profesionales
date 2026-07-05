import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, DayAvailability } from '../../services/admin.service';

@Component({
  selector: 'app-disponibilidad',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      
      <!-- Encabezado con Botón de Toggle -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 class="text-2xl font-black text-stone-900 tracking-tight">Disponibilidad de Atención</h1>
          <p class="text-sm text-stone-500">Definí tus horarios repetitivos semanales de atención y bloqueá períodos especiales cuando lo necesites.</p>
        </div>
        
        <button type="button" (click)="toggleBloqueador()" 
                [class.bg-teal-600]="!mostrarBloqueador()"
                [class.hover:bg-teal-700]="!mostrarBloqueador()"
                [class.bg-stone-900]="mostrarBloqueador()"
                [class.hover:bg-stone-850]="mostrarBloqueador()"
                class="text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
          {{ mostrarBloqueador() ? 'Ocultar Bloqueador de Fechas' : 'Bloquear Fechas (Vacaciones/Feriados)' }}
        </button>
      </div>

      <!-- Alertas de Éxito -->
      <div *ngIf="showSuccessAlert()" class="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-sm font-semibold flex items-center justify-between animate-fade-in">
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <span>Configuración guardada con éxito. Los cambios impactarán en tiempo real en la agenda de tus pacientes.</span>
        </div>
        <button (click)="showSuccessAlert.set(false)" class="text-emerald-500 hover:text-emerald-700 font-bold">×</button>
      </div>

      <!-- Grid Principal Dinámico -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        <!-- COLUMNA IZQUIERDA: Horario Semanal Base (Ocupa ancho completo si el bloqueador está oculto) -->
        <div [class.lg:col-span-7]="mostrarBloqueador()" 
             [class.lg:col-span-12]="!mostrarBloqueador()"
             class="bg-white rounded-2xl border border-stone-200/60 p-6 shadow-sm space-y-4 transition-all duration-300">
          <h3 class="font-bold text-stone-900 text-base pb-2 border-b border-stone-100 flex items-center gap-2">
            <span class="w-1.5 h-5 bg-teal-600 rounded-full"></span>
            Horario Semanal de Atención
          </h3>
          
          <div class="space-y-3.5">
            <div *ngFor="let item of availabilityList(); let dayIdx = index" 
                 [class.border-teal-100]="item.active"
                 [class.bg-teal-50/5]="item.active"
                 class="rounded-xl border border-stone-200/60 p-4 transition-all duration-200">
              
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <!-- Switch -->
                <div class="flex items-center gap-3 shrink-0">
                  <label class="relative inline-flex items-center cursor-pointer select-none">
                    <input type="checkbox" [(ngModel)]="item.active" class="sr-only peer">
                    <div class="w-9 h-5 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-600"></div>
                  </label>
                  <div>
                    <h4 class="font-bold text-stone-900 text-sm flex items-center gap-1.5">
                      {{ item.day }}
                      <span *ngIf="item.active" class="text-[9px] text-teal-600 font-bold bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">Activo</span>
                      <span *ngIf="!item.active" class="text-[9px] text-stone-400 font-bold bg-stone-50 px-2 py-0.5 rounded-full border border-stone-150">Cerrado</span>
                    </h4>
                  </div>
                </div>

                <!-- Slots -->
                <div *ngIf="item.active" 
                     [class.sm:max-w-xl]="!mostrarBloqueador()"
                     [class.sm:max-w-md]="mostrarBloqueador()"
                     class="flex-grow flex flex-col gap-2 transition-all duration-300">
                  <!-- Píldoras de Horas -->
                  <div class="flex flex-wrap gap-1.5">
                    <span *ngFor="let slot of item.slots; let slotIdx = index" 
                          class="inline-flex items-center gap-1 bg-stone-50 border border-stone-200 hover:border-red-200 hover:text-red-700 rounded-lg px-2 py-0.5 text-[10px] font-bold text-stone-600 transition-all select-none">
                      {{ slot }} hs
                      <button type="button" (click)="removeSlot(dayIdx, slotIdx)" class="text-stone-400 hover:text-red-600 font-black text-xs shrink-0">×</button>
                    </span>
                    <span *ngIf="item.slots.length === 0" class="text-xs text-stone-450 italic">Sin horarios.</span>
                  </div>

                  <!-- Añadir hora -->
                  <div class="flex items-center gap-2">
                    <input type="time" [(ngModel)]="newSlotTimes[dayIdx]" 
                           class="bg-stone-50 border border-stone-200 rounded-lg px-2 py-1 text-xs focus:border-teal-500 focus:outline-none">
                    <button type="button" (click)="addSlot(dayIdx)" 
                            class="bg-teal-600 hover:bg-teal-700 text-white px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0">
                      Agregar
                    </button>
                    <div class="flex gap-1">
                      <button type="button" (click)="loadPreset(dayIdx, 'mañana')" 
                              class="bg-stone-100 hover:bg-teal-50 text-[9px] font-bold px-1.5 py-0.5 rounded text-stone-500 hover:text-teal-700 border border-stone-200/50">
                        Mañ
                      </button>
                      <button type="button" (click)="loadPreset(dayIdx, 'tarde')" 
                              class="bg-stone-100 hover:bg-teal-50 text-[9px] font-bold px-1.5 py-0.5 rounded text-stone-500 hover:text-teal-700 border border-stone-200/50">
                        Tard
                      </button>
                    </div>
                  </div>
                </div>
                
                <div *ngIf="!item.active" class="text-xs text-stone-400 italic">Día no laborable.</div>
              </div>

            </div>
          </div>

          <!-- Guardar Base -->
          <div class="flex justify-between items-center pt-2">
            <!-- Informativo compacto si hay fechas bloqueadas y el panel está oculto -->
            <div *ngIf="!mostrarBloqueador() && blockedDatesList().length > 0" class="text-xs text-stone-500 flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-red-500"></span>
              Tenés {{ blockedDatesList().length }} períodos bloqueados en la agenda. 
              <button (click)="toggleBloqueador()" class="text-teal-600 hover:text-teal-700 font-bold hover:underline">Ver bloqueos</button>
            </div>
            <div *ngIf="!mostrarBloqueador() && blockedDatesList().length === 0" class="text-xs text-stone-400">Sin excepciones de fecha activas.</div>
            <div *ngIf="mostrarBloqueador()"></div>

            <button type="button" (click)="saveWeeklyAvailability()" 
                    class="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all">
              Guardar Horarios Semanales
            </button>
          </div>
        </div>

        <!-- COLUMNA DERECHA: Calendario Selector de Rangos Excepción (Sólo visible si mostrarBloqueador es TRUE) -->
        <div *ngIf="mostrarBloqueador()" 
             class="lg:col-span-5 bg-white rounded-2xl border border-stone-200/60 p-6 shadow-sm space-y-4 animate-fade-in">
          <h3 class="font-bold text-stone-900 text-base pb-2 border-b border-stone-100 flex items-center gap-2">
            <span class="w-1.5 h-5 bg-teal-600 rounded-full"></span>
            Bloqueo por Calendario
          </h3>

          <p class="text-xs text-stone-450 leading-relaxed">
            Hacé clic en el **día de inicio** y luego en el **día de fin** en el calendario para seleccionar el rango a bloquear.
          </p>

          <!-- Widget de Calendario Mensual -->
          <div class="border border-stone-200 rounded-2xl p-4 bg-stone-50/50">
            <!-- Header Mes -->
            <div class="flex justify-between items-center mb-4">
              <button type="button" (click)="changeMonth(-1)" class="p-1 rounded-lg hover:bg-stone-200 text-stone-600 transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
              </button>
              <span class="text-xs font-extrabold text-stone-800 uppercase tracking-wider">{{ monthName() }}</span>
              <button type="button" (click)="changeMonth(1)" class="p-1 rounded-lg hover:bg-stone-200 text-stone-600 transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
              </button>
            </div>

            <!-- Días de la semana -->
            <div class="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">
              <span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span><span>Dom</span>
            </div>

            <!-- Celdas del Calendario -->
            <div class="grid grid-cols-7 gap-1">
              <div *ngFor="let cell of calendarCells()" 
                   [class.pointer-events-none]="!cell.date"
                   (click)="cell.date && selectDateCell(cell.date)"
                   [class.bg-teal-600]="cell.isSelectedStart || cell.isSelectedEnd"
                   [class.text-white]="cell.isSelectedStart || cell.isSelectedEnd"
                   [class.bg-teal-50]="cell.isInSelectedRange"
                   [class.text-teal-700]="cell.isInSelectedRange"
                   [class.font-black]="cell.isSelectedStart || cell.isSelectedEnd"
                   [class.opacity-40]="cell.isAlreadyBlocked"
                   [class.line-through]="cell.isAlreadyBlocked"
                   [class.bg-red-50]="cell.isAlreadyBlocked && !cell.isInSelectedRange"
                   [class.text-red-700]="cell.isAlreadyBlocked && !cell.isInSelectedRange"
                   class="aspect-square flex flex-col items-center justify-center text-xs font-semibold rounded-lg border border-transparent cursor-pointer transition-all hover:bg-stone-200/60 relative">
                
                <span>{{ cell.dayNum }}</span>
                
                <!-- Dot Indicador de hoy -->
                <span *ngIf="cell.isToday" 
                      [class.bg-white]="cell.isSelectedStart || cell.isSelectedEnd"
                      [class.bg-teal-600]="!cell.isSelectedStart && !cell.isSelectedEnd"
                      class="absolute bottom-1 w-1 h-1 rounded-full"></span>
              </div>
            </div>
          </div>

          <!-- Rango Seleccionado e Input de Motivo -->
          <div *ngIf="rangeStart()" class="bg-stone-50 p-4 border border-stone-200 rounded-xl space-y-3 animate-fade-in text-xs">
            <div class="flex justify-between items-center">
              <div>
                <p class="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Período Seleccionado</p>
                <p class="font-extrabold text-stone-800 text-sm">
                  {{ rangeText() }}
                </p>
              </div>
              <button (click)="clearSelection()" class="text-stone-400 hover:text-stone-700 font-bold hover:underline">
                Cancelar
              </button>
            </div>

            <div class="space-y-1">
              <label class="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Motivo del Bloqueo</label>
              <input type="text" [(ngModel)]="blockReasonInput" placeholder="Ej. Congreso, Vacaciones..."
                     class="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs focus:border-teal-500 focus:outline-none">
            </div>

            <button type="button" (click)="addBlockedDateRange()" 
                    class="w-full bg-stone-900 hover:bg-stone-850 text-white px-4 py-2.5 rounded-lg font-bold transition-all shadow-sm">
              Bloquear Rango Seleccionado
            </button>
          </div>
        </div>

      </div>

      <!-- Sección 3: Listado de Fechas Bloqueadas (Sólo visible si mostrarBloqueador es TRUE) -->
      <div *ngIf="mostrarBloqueador()" 
           class="bg-white rounded-2xl border border-stone-200/60 p-6 shadow-sm space-y-4 animate-fade-in">
        <h3 class="font-bold text-stone-900 text-base pb-2 border-b border-stone-100 flex items-center gap-2">
          <span class="w-1.5 h-5 bg-teal-600 rounded-full"></span>
          Bloqueos de Fechas Activos (Lista Completa)
        </h3>
        
        <div *ngIf="blockedDatesList().length > 0; else noBlockedDates" class="divide-y divide-stone-100 border border-stone-100 rounded-xl overflow-hidden">
          <div *ngFor="let item of blockedDatesList()" class="bg-stone-50/30 px-6 py-4 flex items-center justify-between text-xs">
            <div class="flex items-center gap-3">
              <span class="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0"></span>
              <div>
                <span class="font-bold text-stone-850">
                  {{ formatRangeText(item.startDate, item.endDate) }}
                </span>
                <span *ngIf="item.reason" class="text-stone-450 ml-2.5 italic">({{ item.reason }})</span>
              </div>
            </div>
            <button type="button" (click)="unblockDate(item.id)" 
                    class="text-red-500 hover:text-red-700 font-bold hover:underline">
              Desbloquear Período
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
export class DisponibilidadComponent implements OnInit {
  availabilityList = signal<DayAvailability[]>([]);
  newSlotTimes: string[] = Array(7).fill('08:00');
  
  // Toggles de visualización
  mostrarBloqueador = signal(false);

  // Variables de Selección de Excepciones por Calendario
  rangeStart = signal<string | null>(null);
  rangeEnd = signal<string | null>(null);
  blockReasonInput = '';

  // Control del Mes en el Calendario
  mesActual = signal<number>(new Date().getMonth());
  anioActual = signal<number>(new Date().getFullYear());

  showSuccessAlert = signal(false);

  blockedDatesList = computed(() => this.adminService.blockedDates());

  // Nombre del mes formateado para el header
  monthName = computed(() => {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${meses[this.mesActual()]} ${this.anioActual()}`;
  });

  // Generar las celdas del mes
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
      cells.push({ 
        date: null, 
        dayNum: null, 
        isToday: false, 
        isAlreadyBlocked: false,
        isSelectedStart: false,
        isSelectedEnd: false,
        isInSelectedRange: false
      });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    for (let i = 1; i <= totalDias; i++) {
      const mesStr = String(mes + 1).padStart(2, '0');
      const diaStr = String(i).padStart(2, '0');
      const fechaStr = `${anio}-${mesStr}-${diaStr}`;

      const isToday = fechaStr === todayStr;
      const isAlreadyBlocked = activeBlocks.some(b => b.startDate <= fechaStr && fechaStr <= b.endDate);

      const isSelectedStart = start === fechaStr;
      const isSelectedEnd = end === fechaStr;
      const isInSelectedRange = !!(start && end && start <= fechaStr && fechaStr <= end);

      cells.push({
        date: fechaStr,
        dayNum: i,
        isToday,
        isAlreadyBlocked,
        isSelectedStart,
        isSelectedEnd,
        isInSelectedRange
      });
    }

    return cells;
  });

  rangeText = computed(() => {
    const start = this.rangeStart();
    const end = this.rangeEnd();
    if (!start) return '';
    if (!end || start === end) return this.formatDisplayDate(start);
    return `${this.formatDisplayDate(start)} al ${this.formatDisplayDate(end)}`;
  });

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    const data = JSON.parse(JSON.stringify(this.adminService.availability()));
    this.availabilityList.set(data);
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
    const list = this.availabilityList();
    const time = this.newSlotTimes[dayIdx];
    
    if (!time) return;
    if (list[dayIdx].slots.includes(time)) return;

    list[dayIdx].slots.push(time);
    list[dayIdx].slots.sort();
    this.availabilityList.set([...list]);
  }

  removeSlot(dayIdx: number, slotIdx: number) {
    const list = this.availabilityList();
    list[dayIdx].slots.splice(slotIdx, 1);
    this.availabilityList.set([...list]);
  }

  loadPreset(dayIdx: number, type: 'mañana' | 'tarde') {
    const list = this.availabilityList();
    const morning = ['08:00', '09:00', '10:00', '11:00'];
    const afternoon = ['17:00', '18:00', '19:00', '20:00'];
    
    const preset = type === 'mañana' ? morning : afternoon;
    
    preset.forEach(time => {
      if (!list[dayIdx].slots.includes(time)) {
        list[dayIdx].slots.push(time);
      }
    });

    list[dayIdx].slots.sort();
    this.availabilityList.set([...list]);
  }

  saveWeeklyAvailability() {
    this.adminService.saveAvailability(this.availabilityList());
    this.showSuccessAlert.set(true);
    
    setTimeout(() => {
      this.showSuccessAlert.set(false);
    }, 4000);
  }

  unblockDate(id: string) {
    this.adminService.unblockDateRange(id);
  }

  formatDisplayDate(dateStr: string): string {
    const parts = dateStr.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  formatRangeText(start: string, end: string): string {
    if (start === end) {
      return this.formatDisplayDate(start);
    }
    return `${this.formatDisplayDate(start)} al ${this.formatDisplayDate(end)}`;
  }
}
