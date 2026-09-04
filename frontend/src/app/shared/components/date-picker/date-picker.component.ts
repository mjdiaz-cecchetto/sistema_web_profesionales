import { Component, Input, Output, EventEmitter, signal, computed, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-date-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './date-picker.component.html',
  styleUrl: './date-picker.component.scss'
})
export class DatePickerComponent {
  @Input() label = 'Fecha';
  @Input() placeholder = 'dd/mm/aaaa';
  
  _value = signal('');
  @Input() set value(val: string) {
    this._value.set(val);
    if (val && typeof val === 'string' && val.includes('-')) {
      const [y, m, d] = val.split('-');
      this.currentMonth.set(new Date(parseInt(y), parseInt(m) - 1, 1));
    }
  }
  @Output() valueChange = new EventEmitter<string>();

  isOpen = signal(false);
  currentMonth = signal(new Date());

  constructor(private eRef: ElementRef) {}

  @HostListener('document:click', ['$event'])
  clickout(event: any) {
    if (!this.eRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }

  daysOfWeek = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];
  
  monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  currentMonthName = computed(() => this.monthNames[this.currentMonth().getMonth()]);
  currentYear = computed(() => this.currentMonth().getFullYear());

  calendarDays = computed(() => {
    const year = this.currentMonth().getFullYear();
    const month = this.currentMonth().getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  });

  prevMonth() {
    const d = this.currentMonth();
    this.currentMonth.set(new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }

  nextMonth() {
    const d = this.currentMonth();
    this.currentMonth.set(new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  goToToday() {
    const today = new Date();
    this.currentMonth.set(new Date(today.getFullYear(), today.getMonth(), 1));
    this.selectDate(today.getDate());
  }

  selectDate(day: number | null) {
    if (!day) return;
    const y = this.currentMonth().getFullYear();
    const m = (this.currentMonth().getMonth() + 1).toString().padStart(2, '0');
    const d = day.toString().padStart(2, '0');
    const selectedStr = `${y}-${m}-${d}`;
    this._value.set(selectedStr);
    this.valueChange.emit(selectedStr);
    this.isOpen.set(false);
  }

  isSelected(day: number): boolean {
    if (!this._value() || typeof this._value() !== 'string' || !this._value().includes('-')) return false;
    const [y, m, d] = this._value().split('-');
    return parseInt(y) === this.currentMonth().getFullYear() &&
           parseInt(m) === this.currentMonth().getMonth() + 1 &&
           parseInt(d) === day;
  }

  get formattedValue() {
    const val = this._value();
    if (!val || typeof val !== 'string' || !val.includes('-')) return val || '';
    const [y, m, d] = val.split('-');
    return `${d}/${m}/${y}`;
  }
}
