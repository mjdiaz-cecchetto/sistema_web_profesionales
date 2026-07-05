import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ClientService } from '../../services/client.service';
import { Service, TimeSlot, Appointment } from '../../interfaces/client.models';

@Component({
  selector: 'app-booking-wizard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="min-h-screen bg-stone-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div class="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
        
        <!-- Header / Progress Bar -->
        <div class="bg-stone-100/50 px-6 py-4 border-b border-stone-100 flex justify-between items-center">
          <h2 class="text-xl font-medium text-stone-800">Agendar Turno</h2>
          <span class="text-sm font-medium text-teal-600">Paso {{ currentStep() }} de 4</span>
        </div>

        <div class="p-6 sm:p-8">
          
          <!-- Loading state -->
          <div *ngIf="isLoading()" class="flex flex-col items-center justify-center py-12">
            <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600 mb-4"></div>
            <p class="text-stone-500 text-sm">Cargando información...</p>
          </div>

          <!-- Content (Only visible if not loading) -->
          <div *ngIf="!isLoading()">
            
            <!-- STEP 1: Servicios -->
            <div *ngIf="currentStep() === 1" class="animate-fade-in">
              <h3 class="text-lg font-medium text-stone-800 mb-6">Selecciona el motivo de tu consulta</h3>
              <div class="space-y-4">
                <div *ngFor="let service of services()" 
                     (click)="selectService(service)"
                     [class.border-teal-500]="selectedService()?.id === service.id"
                     [class.ring-1]="selectedService()?.id === service.id"
                     [class.ring-teal-500]="selectedService()?.id === service.id"
                     [class.bg-teal-50]="selectedService()?.id === service.id"
                     class="border border-stone-200 rounded-xl p-5 cursor-pointer hover:border-teal-300 transition-all duration-200 group">
                  <div class="flex justify-between items-start">
                    <div>
                      <h4 class="font-medium text-stone-900 group-hover:text-teal-700 transition-colors">{{ service.name }}</h4>
                      <p class="text-sm text-stone-500 mt-1">{{ service.description }}</p>
                    </div>
                    <span class="text-sm font-medium bg-stone-100 text-stone-600 px-3 py-1 rounded-full whitespace-nowrap ml-4">
                      {{ service.durationMinutes }} min
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- STEP 2: Fecha y Hora -->
            <div *ngIf="currentStep() === 2" class="animate-fade-in">
              <h3 class="text-lg font-medium text-stone-800 mb-6">Elige tu disponibilidad</h3>
              
              <div class="mb-6">
                <p class="text-sm font-medium text-stone-600 mb-3">Días disponibles</p>
                <div class="flex space-x-3 overflow-x-auto pb-2 scrollbar-hide">
                  <!-- Mocks de fechas únicas. En un caso real usaríamos un datepicker o listaríamos los días con turnos -->
                  <div *ngFor="let date of uniqueDates()" 
                       (click)="selectedDate.set(date)"
                       [class.bg-teal-600]="selectedDate() === date"
                       [class.text-white]="selectedDate() === date"
                       [class.border-teal-600]="selectedDate() === date"
                       [class.bg-white]="selectedDate() !== date"
                       [class.text-stone-700]="selectedDate() !== date"
                       class="flex-shrink-0 border border-stone-200 rounded-lg p-3 text-center cursor-pointer hover:border-teal-500 transition-colors min-w-[80px]">
                    <p class="text-xs uppercase mb-1 opacity-80">{{ getDayName(date) }}</p>
                    <p class="text-lg font-semibold">{{ getDayNumber(date) }}</p>
                  </div>
                </div>
              </div>

              <div>
                <p class="text-sm font-medium text-stone-600 mb-3">Horarios ({{ selectedDate() | date:'mediumDate' }})</p>
                <div *ngIf="availableSlotsForDate().length > 0; else noSlots" class="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  <button *ngFor="let slot of availableSlotsForDate()" 
                          (click)="selectTimeSlot(slot)"
                          [class.bg-teal-600]="selectedTimeSlot()?.id === slot.id"
                          [class.text-white]="selectedTimeSlot()?.id === slot.id"
                          [class.border-transparent]="selectedTimeSlot()?.id === slot.id"
                          [class.bg-white]="selectedTimeSlot()?.id !== slot.id"
                          [class.text-stone-700]="selectedTimeSlot()?.id !== slot.id"
                          class="border border-stone-200 rounded-lg py-2 text-sm font-medium hover:border-teal-500 hover:text-teal-700 transition-colors">
                    {{ slot.startTime }}
                  </button>
                </div>
                <ng-template #noSlots>
                  <p class="text-sm text-stone-500 italic py-4">No hay turnos disponibles para esta fecha.</p>
                </ng-template>
              </div>
            </div>

            <!-- STEP 3: Datos Personales -->
            <div *ngIf="currentStep() === 3" class="animate-fade-in">
              <h3 class="text-lg font-medium text-stone-800 mb-2">Tus datos personales</h3>
              <p class="text-sm text-stone-500 mb-6">Completa tus datos para confirmar el turno de <span class="font-medium text-stone-700">{{ selectedService()?.name }}</span>.</p>
              
              <form [formGroup]="patientForm" class="space-y-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-stone-700 mb-1">Nombre</label>
                    <input type="text" formControlName="firstName" 
                           class="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-shadow">
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-stone-700 mb-1">Apellido</label>
                    <input type="text" formControlName="lastName" 
                           class="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-shadow">
                  </div>
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-stone-700 mb-1">Correo Electrónico</label>
                  <input type="email" formControlName="email" 
                         class="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-shadow">
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-stone-700 mb-1">Teléfono</label>
                  <input type="tel" formControlName="phone" 
                         class="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-shadow">
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-stone-700 mb-1">Notas adicionales (opcional)</label>
                  <textarea formControlName="notes" rows="3" 
                            class="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-shadow resize-none"></textarea>
                </div>
              </form>
            </div>

            <!-- STEP 4: Confirmación -->
            <div *ngIf="currentStep() === 4" class="animate-fade-in text-center py-8">
              <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-teal-100 mb-6">
                <svg class="h-8 w-8 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 class="text-2xl font-medium text-stone-900 mb-2">¡Turno Confirmado!</h3>
              <p class="text-stone-500 mb-6">Hemos enviado los detalles a tu correo electrónico.</p>
              
              <div class="bg-stone-50 rounded-xl p-6 text-left max-w-sm mx-auto border border-stone-100">
                <p class="text-sm text-stone-500 mb-1">Servicio</p>
                <p class="font-medium text-stone-800 mb-4">{{ selectedService()?.name }}</p>
                
                <p class="text-sm text-stone-500 mb-1">Fecha y Hora</p>
                <p class="font-medium text-stone-800">{{ selectedTimeSlot()?.date | date:'longDate' }} a las {{ selectedTimeSlot()?.startTime }}</p>
              </div>
            </div>

          </div>
        </div>
        
        <!-- Navigation Footer -->
        <div *ngIf="!isLoading() && currentStep() < 4" class="bg-stone-50 px-6 py-4 border-t border-stone-100 flex justify-between items-center">
          <button *ngIf="currentStep() > 1" 
                  (click)="prevStep()"
                  class="px-5 py-2 text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors">
            Atrás
          </button>
          <div *ngIf="currentStep() === 1"></div> <!-- Spacer if no back button -->
          
          <button *ngIf="currentStep() === 1" 
                  (click)="nextStep()" 
                  [disabled]="!selectedService()"
                  [class.opacity-50]="!selectedService()"
                  [class.cursor-not-allowed]="!selectedService()"
                  class="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
            Continuar
          </button>
          
          <button *ngIf="currentStep() === 2" 
                  (click)="nextStep()" 
                  [disabled]="!selectedTimeSlot()"
                  [class.opacity-50]="!selectedTimeSlot()"
                  [class.cursor-not-allowed]="!selectedTimeSlot()"
                  class="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
            Continuar
          </button>
          
          <button *ngIf="currentStep() === 3" 
                  (click)="confirmBooking()" 
                  [disabled]="patientForm.invalid || isSubmitting()"
                  [class.opacity-50]="patientForm.invalid || isSubmitting()"
                  [class.cursor-not-allowed]="patientForm.invalid || isSubmitting()"
                  class="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center">
            <span *ngIf="isSubmitting()" class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
            Confirmar Turno
          </button>
        </div>

        <!-- Botón Volver al inicio en paso 4 -->
        <div *ngIf="currentStep() === 4" class="bg-stone-50 px-6 py-4 border-t border-stone-100 flex justify-center">
          <button (click)="resetWizard()" class="text-teal-600 hover:text-teal-800 font-medium text-sm transition-colors">
            Volver al inicio
          </button>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .animate-fade-in {
      animation: fadeIn 0.4s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(5px); }
      to { opacity: 1; transform: translateY(0); }
    }
    /* Ocultar scrollbar en contenedor de fechas */
    .scrollbar-hide::-webkit-scrollbar {
      display: none;
    }
    .scrollbar-hide {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
  `]
})
export class BookingWizardComponent implements OnInit {
  
  // State Signals
  currentStep = signal<number>(1);
  isLoading = signal<boolean>(true);
  isSubmitting = signal<boolean>(false);
  
  // Data Signals
  services = signal<Service[]>([]);
  timeSlots = signal<TimeSlot[]>([]);
  
  // Selection Signals
  selectedService = signal<Service | null>(null);
  selectedDate = signal<string | null>(null);
  selectedTimeSlot = signal<TimeSlot | null>(null);
  
  // Form
  patientForm: FormGroup;

  // Computed Values
  uniqueDates = computed(() => {
    const dates = this.timeSlots().map(ts => ts.date);
    return [...new Set(dates)].sort();
  });

  availableSlotsForDate = computed(() => {
    const date = this.selectedDate();
    if (!date) return [];
    return this.timeSlots().filter(ts => ts.date === date);
  });

  constructor(
    private clientService: ClientService,
    private fb: FormBuilder
  ) {
    this.patientForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      notes: ['']
    });
  }

  ngOnInit(): void {
    this.loadInitialData();
  }

  private loadInitialData() {
    this.isLoading.set(true);
    this.clientService.getServices().subscribe({
      next: (data) => {
        this.services.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  selectService(service: Service) {
    this.selectedService.set(service);
  }

  selectTimeSlot(slot: TimeSlot) {
    this.selectedTimeSlot.set(slot);
  }

  nextStep() {
    const step = this.currentStep();
    
    if (step === 1 && this.selectedService()) {
      this.loadTimeSlots();
    } else if (step === 2 && this.selectedTimeSlot()) {
      this.currentStep.set(3);
    }
  }

  prevStep() {
    if (this.currentStep() > 1) {
      this.currentStep.set(this.currentStep() - 1);
    }
  }

  private loadTimeSlots() {
    this.isLoading.set(true);
    // Simular carga de horarios para el servicio seleccionado
    this.clientService.getAvailableTimeSlots(this.selectedService()!.id).subscribe({
      next: (slots) => {
        this.timeSlots.set(slots);
        // Pre-seleccionar la primera fecha disponible
        if (slots.length > 0) {
          this.selectedDate.set(this.uniqueDates()[0]);
        }
        this.isLoading.set(false);
        this.currentStep.set(2);
      },
      error: () => this.isLoading.set(false)
    });
  }

  confirmBooking() {
    if (this.patientForm.invalid) return;
    
    this.isSubmitting.set(true);
    
    const appointmentData: Appointment = {
      serviceId: this.selectedService()!.id,
      professionalId: 'prof-1', // Idealmente viene de contexto o ruta
      date: this.selectedTimeSlot()!.date,
      time: this.selectedTimeSlot()!.startTime,
      patientData: this.patientForm.value,
      status: 'PENDING'
    };

    this.clientService.createAppointment(appointmentData).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.currentStep.set(4);
      },
      error: () => {
        this.isSubmitting.set(false);
        // Handle error (show toast/alert)
      }
    });
  }

  resetWizard() {
    this.currentStep.set(1);
    this.selectedService.set(null);
    this.selectedDate.set(null);
    this.selectedTimeSlot.set(null);
    this.patientForm.reset();
  }

  // Utilidades para las fechas en la UI
  getDayName(dateStr: string): string {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    // Añadimos 'T00:00:00' para asegurar zona horaria correcta o parsear manualmente
    const d = new Date(dateStr + 'T00:00:00');
    return days[d.getDay()];
  }

  getDayNumber(dateStr: string): string {
    return dateStr.split('-')[2];
  }
}
