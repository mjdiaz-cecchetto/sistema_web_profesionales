import { Component, EventEmitter, Output, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, Patient } from '../../../services/admin.service';
import { DatePickerComponent } from '../../../../shared/components/date-picker/date-picker.component';

@Component({
  selector: 'app-appointment-form',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePickerComponent],
  template: `
    <form (ngSubmit)="onSubmit()" class="space-y-6">
      
      <!-- Paciente -->
      <div class="space-y-1.5">
        <label class="text-xs font-bold text-stone-700">Paciente *</label>
        <div class="relative">
          <select [(ngModel)]="formData.patientDni" name="patientDni" required
                  class="w-full bg-stone-50 border border-stone-200 rounded-xl pl-3 pr-8 py-2.5 text-sm focus:border-teal-500 focus:bg-white focus:outline-none transition-all appearance-none text-stone-700">
            <option value="" disabled selected>Seleccione un paciente...</option>
            <option value="NEW" class="font-bold text-teal-700">+ Crear Nuevo Paciente</option>
            <option *ngFor="let p of activePatients()" [value]="p.dni">{{ p.nombre }} ({{ p.dni }})</option>
          </select>
          <svg class="w-4 h-4 text-stone-400 absolute right-3 top-3 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
        </div>
      </div>

      <!-- Nuevo Paciente Form -->
      <div *ngIf="formData.patientDni === 'NEW'" class="bg-teal-50/50 p-4 rounded-xl border border-teal-100 space-y-4">
        <h4 class="text-xs font-bold text-teal-800">Datos del Nuevo Paciente</h4>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input type="text" [(ngModel)]="newPatientData.nombre" name="npNombre" placeholder="Nombre completo *" required class="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs focus:border-teal-500 focus:outline-none">
          <input type="text" [(ngModel)]="newPatientData.dni" name="npDni" placeholder="DNI *" required class="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs focus:border-teal-500 focus:outline-none">
          <input type="tel" [(ngModel)]="newPatientData.telefono" name="npTel" placeholder="Teléfono" class="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs focus:border-teal-500 focus:outline-none">
          <input type="email" [(ngModel)]="newPatientData.email" name="npEmail" placeholder="Email" class="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs focus:border-teal-500 focus:outline-none">
        </div>
      </div>

      <!-- Servicio y Ubicación -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="space-y-1.5">
          <label class="text-xs font-bold text-stone-700">Servicio *</label>
          <div class="relative">
            <select [(ngModel)]="formData.serviceName" name="serviceName" required
                    class="w-full bg-stone-50 border border-stone-200 rounded-xl pl-3 pr-8 py-2.5 text-sm focus:border-teal-500 focus:bg-white focus:outline-none transition-all appearance-none text-stone-700">
              <option value="" disabled selected>Seleccione...</option>
              <option *ngFor="let s of services()" [value]="s.nombre">{{ s.nombre }}</option>
              <option value="Consulta">Consulta (General)</option>
              <option value="Prescripción de Receta">Prescripción de Receta</option>
            </select>
            <svg class="w-4 h-4 text-stone-400 absolute right-3 top-3 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
          </div>
        </div>
        <div class="space-y-1.5">
          <label class="text-xs font-bold text-stone-700">Ubicación *</label>
          <div class="relative">
            <select [(ngModel)]="formData.location" name="location" required
                    class="w-full bg-stone-50 border border-stone-200 rounded-xl pl-3 pr-8 py-2.5 text-sm focus:border-teal-500 focus:bg-white focus:outline-none transition-all appearance-none text-stone-700">
              <option value="Consultorio Palermo">Consultorio Palermo</option>
              <option value="Consulta Online">Consulta Online</option>
            </select>
            <svg class="w-4 h-4 text-stone-400 absolute right-3 top-3 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
          </div>
        </div>
      </div>

      <!-- Fecha y Hora -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="space-y-1.5 relative z-10">
          <label class="text-xs font-bold text-stone-700">Fecha *</label>
          <app-date-picker 
            placeholder="Seleccione fecha..."
            [value]="formData.date" 
            (valueChange)="formData.date = $event">
          </app-date-picker>
        </div>
        <div class="space-y-1.5">
          <label class="text-xs font-bold text-stone-700">Hora *</label>
          <input type="time" [(ngModel)]="formData.time" name="time" required
                 class="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:border-teal-500 focus:bg-white focus:outline-none transition-all text-stone-700">
        </div>
      </div>

      <!-- Notas -->
      <div class="space-y-1.5">
        <label class="text-xs font-bold text-stone-700">Notas / Motivo (Opcional)</label>
        <textarea [(ngModel)]="formData.notes" name="notes" rows="2"
                  placeholder="Información relevante para la sesión..."
                  class="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:border-teal-500 focus:bg-white focus:outline-none transition-all text-stone-700"></textarea>
      </div>

      <!-- Recurrencia -->
      <div class="bg-stone-50 rounded-xl p-4 border border-stone-100 space-y-4">
        <label class="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" [(ngModel)]="isRecurring" name="isRecurring" class="w-4 h-4 text-teal-600 rounded border-stone-300 focus:ring-teal-500">
          <span class="text-sm font-bold text-stone-800">Agendar como Tratamiento Recurrente</span>
        </label>

        <div *ngIf="isRecurring" class="space-y-4 pt-2 border-t border-stone-200">
          <div class="flex gap-4">
            <label class="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
              <input type="radio" [(ngModel)]="recurrence.frequency" name="recFreq" value="weekly" class="text-teal-600 focus:ring-teal-500">
              Semanal
            </label>
            <label class="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
              <input type="radio" [(ngModel)]="recurrence.frequency" name="recFreq" value="biweekly" class="text-teal-600 focus:ring-teal-500">
              Quincenal
            </label>
            <label class="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
              <input type="radio" [(ngModel)]="recurrence.frequency" name="recFreq" value="monthly" class="text-teal-600 focus:ring-teal-500">
              Mensual
            </label>
          </div>

          <div class="space-y-2">
            <label class="text-xs font-bold text-stone-700">Termina:</label>
            <div class="flex gap-4 items-center">
              <select [(ngModel)]="recurrence.endType" name="recEndType" 
                      class="w-1/2 bg-white border border-stone-200 rounded-xl px-3 py-2 text-sm focus:border-teal-500 focus:outline-none transition-all text-stone-700">
                <option value="count">Después de N sesiones</option>
                <option value="date">En una fecha específica</option>
              </select>
              
              <input *ngIf="recurrence.endType === 'count'" type="number" [(ngModel)]="recurrence.count" name="recCount" min="2" max="50"
                     class="w-1/2 bg-white border border-stone-200 rounded-xl px-3 py-2 text-sm focus:border-teal-500 focus:outline-none transition-all text-stone-700"
                     placeholder="Sesiones">
                     
              <div *ngIf="recurrence.endType === 'date'" class="w-1/2">
                <app-date-picker 
                  placeholder="Hasta..."
                  [value]="recurrence.endDate"
                  (valueChange)="recurrence.endDate = $event">
                </app-date-picker>
              </div>
            </div>
            <p *ngIf="recurrence.endType === 'count'" class="text-[10px] text-stone-400 mt-1">Total de sesiones generadas: {{ recurrence.count }}</p>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="pt-4 flex gap-3">
        <button type="submit" [disabled]="!isValid()"
                class="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-xl font-bold shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          {{ isRecurring ? 'Agendar Tratamiento' : 'Agendar Turno' }}
        </button>
      </div>
    </form>
  `
})
export class AppointmentFormComponent {
  @Output() save = new EventEmitter<any>();
  adminService = inject(AdminService);

  activePatients = computed(() => this.adminService.patients());
  services = computed(() => this.adminService.profile().areas);

  formData = {
    patientDni: '',
    serviceName: '',
    location: 'Consultorio Palermo',
    date: '',
    time: '',
    notes: ''
  };

  newPatientData = {
    nombre: '',
    dni: '',
    telefono: '',
    email: '',
    obraSocial: 'Particular'
  };

  isRecurring = false;
  recurrence = {
    frequency: 'weekly',
    endType: 'count', // 'count' or 'date'
    count: 4,
    endDate: ''
  };

  isValid(): boolean {
    if (!this.formData.patientDni || !this.formData.serviceName || !this.formData.location || !this.formData.date || !this.formData.time) {
      return false;
    }
    if (this.formData.patientDni === 'NEW' && (!this.newPatientData.nombre || !this.newPatientData.dni)) {
      return false;
    }
    if (this.isRecurring) {
      if (this.recurrence.endType === 'count' && (!this.recurrence.count || this.recurrence.count < 2)) return false;
      if (this.recurrence.endType === 'date' && !this.recurrence.endDate) return false;
    }
    return true;
  }

  onSubmit() {
    if (!this.isValid()) return;
    
    let patient: Patient | undefined;
    let newPatient: Patient | undefined;

    if (this.formData.patientDni === 'NEW') {
      newPatient = {
        id: 'pat-' + this.newPatientData.dni,
        ...this.newPatientData,
        fechaAlta: new Date().toISOString().split('T')[0]
      };
      patient = newPatient;
    } else {
      patient = this.activePatients().find(p => p.dni === this.formData.patientDni);
    }
    
    if (!patient) return;

    const result = {
      appointment: {
        ...this.formData,
        type: this.formData.serviceName,
        patientName: patient.nombre,
        patientEmail: patient.email,
        patientPhone: patient.telefono,
        healthInsurance: patient.obraSocial
      },
      recurrence: this.isRecurring ? this.recurrence : null,
      newPatient: newPatient
    };

    this.save.emit(result);
  }
}
