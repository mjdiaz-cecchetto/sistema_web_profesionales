import { Component, Input, Output, EventEmitter, signal, computed, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-date-picker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-1 relative">
      <label *ngIf="label" class="text-[10px] font-bold text-stone-400 uppercase tracking-wider">{{ label }}</label>
      
      <!-- Trigger -->
      <div class="relative cursor-pointer group" (click)="isOpen.set(!isOpen())">
        <div class="w-full bg-stone-50 border border-stone-200 rounded-xl pl-10 pr-4 py-2 text-xs focus-within:border-teal-500 focus-within:bg-white transition-all text-stone-600 flex items-center min-h-[36px]">
          <span *ngIf="_value()" class="font-medium">{{ formattedValue }}</span>
          <span *ngIf="!_value()" class="text-stone-400">{{ placeholder }}</span>
        </div>
        <svg class="w-4 h-4 text-stone-400 group-hover:text-teal-500 transition-colors absolute left-3.5 top-2.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
      </div>

      <!-- Dropdown -->
      <div *ngIf="isOpen()" class="absolute z-50 top-[calc(100%+4px)] left-0 bg-white border border-stone-100 rounded-2xl shadow-xl shadow-stone-200/50 p-4 w-64 origin-top-left" style="animation: drop-in 0.15s ease-out;">
        
        <!-- Header -->
        <div class="flex items-center justify-between mb-4">
          <button (click)="prevMonth(); $event.stopPropagation()" class="p-1.5 hover:bg-stone-100 rounded-lg text-stone-500 transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"></path></svg>
          </button>
          <div class="font-bold text-stone-800 text-sm tracking-tight">{{ currentMonthName() }} {{ currentYear() }}</div>
          <button (click)="nextMonth(); $event.stopPropagation()" class="p-1.5 hover:bg-stone-100 rounded-lg text-stone-500 transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"></path></svg>
          </button>
        </div>

        <!-- Days Header -->
        <div class="grid grid-cols-7 gap-1 mb-2">
          <div *ngFor="let d of daysOfWeek" class="text-center text-[10px] font-black text-stone-400">{{ d }}</div>
        </div>

        <!-- Grid -->
        <div class="grid grid-cols-7 gap-1">
          <div *ngFor="let day of calendarDays()" class="aspect-square flex items-center justify-center">
            <button *ngIf="day" 
                    (click)="selectDate(day); $event.stopPropagation()"
                    [class.bg-teal-500]="isSelected(day)"
                    [class.text-white]="isSelected(day)"
                    [class.font-bold]="isSelected(day)"
                    [class.shadow-md]="isSelected(day)"
                    [class.shadow-teal-500/30]="isSelected(day)"
                    [class.text-stone-700]="!isSelected(day)"
                    [class.hover:bg-stone-100]="!isSelected(day)"
                    class="w-full h-full rounded-lg text-xs transition-all flex items-center justify-center">
              {{ day }}
            </button>
          </div>
        </div>

        <!-- Clear Button -->
        <div class="mt-4 pt-3 border-t border-stone-100 flex justify-between items-center">
          <button (click)="goToToday(); $event.stopPropagation()" class="text-xs font-bold text-stone-500 hover:text-stone-700 transition-colors">
            Hoy
          </button>
          <button (click)="_value.set(''); valueChange.emit(''); isOpen.set(false); $event.stopPropagation()" class="text-xs font-bold text-teal-600 hover:text-teal-700 transition-colors">
            Limpiar
          </button>
        </div>

      </div>
    </div>
  `,
  styles: [`
    @keyframes drop-in {
      from { opacity: 0; transform: scale(0.95) translateY(-5px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
  `]
})
export class DatePickerComponent {
  @Input() label = 'Fecha';
  @Input() placeholder = 'dd/mm/aaaa';
  
  _value = signal('');
  @Input() set value(val: string) {
    this._value.set(val);
    if (val) {
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
    if (!this._value()) return false;
    const [y, m, d] = this._value().split('-');
    return parseInt(y) === this.currentMonth().getFullYear() &&
           parseInt(m) === this.currentMonth().getMonth() + 1 &&
           parseInt(d) === day;
  }

  get formattedValue() {
    const val = this._value();
    if (!val) return '';
    const [y, m, d] = val.split('-');
    return `${d}/${m}/${y}`;
  }
}
