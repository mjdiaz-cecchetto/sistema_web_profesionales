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
  templateUrl: './disponibilidad.component.html',
  styleUrl: './disponibilidad.component.scss'
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
