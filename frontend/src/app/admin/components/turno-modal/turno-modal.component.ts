import { Component, EventEmitter, Input, Output, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../services/admin.service';
import { Appointment, AppointmentStatus, Patient } from '../../../core/models';
import { addDaysTo, addMonthsClamped, formatDMY, parseLocalDate, todayLocal } from '../../../core/date-utils';

type Frecuencia = 'SEMANAL' | 'QUINCENAL' | 'MENSUAL';
type EstadoDia = 'LIBRE' | 'COMPLETO' | 'CERRADO' | 'BLOQUEADO';

interface Conflicto {
  turno: Appointment;
  /** HORARIO: el horario ya está ocupado · PACIENTE: el paciente ya tiene turno ese día. */
  motivo: 'HORARIO' | 'PACIENTE';
}

interface FechaGenerada {
  date: string;
  conflicto: Conflicto | null;
  fueraDeHorario: boolean;
}

interface CeldaMini {
  date: string | null;
  dayNum: number | null;
  estado: EstadoDia;
  libres: number;
  isToday: boolean;
  isSelected: boolean;
  deshabilitado: boolean;
}

/**
 * Modal reutilizable para crear y editar turnos desde el panel.
 * Selección interactiva de fecha (mini-calendario con disponibilidad)
 * y hora (horarios del día, con los ocupados marcados).
 * Reglas: un horario no admite dos turnos activos, y un paciente
 * no puede tener dos turnos activos el mismo día.
 */
@Component({
  selector: 'app-turno-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Backdrop -->
    <div class="fixed inset-0 z-[70] bg-stone-500/40 backdrop-blur-sm animate-fade-in" (click)="cerrar.emit()"></div>

    <!-- Modal -->
    <div class="fixed inset-x-0 bottom-0 sm:inset-0 z-[80] sm:flex sm:items-center sm:justify-center pointer-events-none">
      <div class="pointer-events-auto bg-white w-full sm:max-w-3xl sm:mx-4 rounded-t-3xl sm:rounded-3xl border border-stone-200 max-h-[92vh] sm:max-h-[90vh] flex flex-col animate-scale-in">

        <!-- Header -->
        <div class="px-5 sm:px-7 py-4 border-b border-stone-100 flex items-center justify-between shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-teal-100 border border-teal-200 text-teal-800 flex items-center justify-center">
              <svg *ngIf="!modoEdicion()" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
              <svg *ngIf="modoEdicion()" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
            </div>
            <div>
              <h3 class="font-extrabold text-stone-800 text-base leading-none">{{ modoEdicion() ? 'Editar Turno' : 'Nuevo Turno' }}</h3>
              <p class="text-[11px] text-stone-400 mt-1">
                {{ modoEdicion() ? 'Modificá los datos del turno con las mismas validaciones.' : 'Agendá un turno para un paciente existente.' }}
              </p>
            </div>
          </div>
          <button (click)="cerrar.emit()" class="p-2 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <!-- Cuerpo scrolleable -->
        <div class="flex-grow overflow-y-auto px-5 sm:px-7 py-5 space-y-5">

          <!-- ===== Profesional (solo en modo consultorio) ===== -->
          <div *ngIf="adminService.esConsultorio()" class="space-y-2">
            <label class="field-label">Profesional</label>
            <div class="flex gap-1.5 overflow-x-auto no-scrollbar snap-x pb-0.5">
              <button *ngFor="let p of adminService.profesionalesActivos()"
                      (click)="cambiarProfesional(p.id)"
                      [ngClass]="profId() === p.id
                        ? 'bg-teal-100 text-teal-900 border-teal-300'
                        : 'bg-white text-stone-500 border-stone-200 hover:border-teal-300 hover:text-teal-800'"
                      class="snap-start shrink-0 flex items-center gap-2 pl-1.5 pr-3.5 py-1.5 rounded-full border text-[11px] font-bold transition-colors">
                <span class="w-6 h-6 rounded-full overflow-hidden bg-teal-200 border border-teal-300 flex items-center justify-center text-[8px] font-extrabold text-teal-900 shrink-0">
                  <img *ngIf="p.avatarUrl" [src]="p.avatarUrl" class="w-full h-full object-cover">
                  <ng-container *ngIf="!p.avatarUrl">{{ inicialesDe(p.nombre) }}</ng-container>
                </span>
                {{ p.nombre }}
              </button>
            </div>
          </div>

          <!-- ===== 1. Paciente ===== -->
          <div class="space-y-2">
            <label class="field-label">1 · Paciente</label>

            <div *ngIf="pacienteSeleccionado() as pac; else buscador"
                 class="flex items-center gap-3 bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 animate-scale-in">
              <div class="w-9 h-9 rounded-full bg-white border border-teal-200 text-teal-800 font-extrabold text-xs flex items-center justify-center shrink-0">
                {{ getInitials(pac.nombre) }}
              </div>
              <div class="min-w-0 flex-grow">
                <p class="font-extrabold text-stone-800 text-sm truncate">{{ pac.nombre }}</p>
                <p class="text-[11px] text-stone-500 truncate">DNI {{ pac.dni }} · {{ pac.obraSocial }}</p>
              </div>
              <button (click)="quitarPaciente()" class="text-xs font-bold text-teal-800 hover:underline shrink-0">Cambiar</button>
            </div>

            <ng-template #buscador>

              <!-- Buscar existente -->
              <div *ngIf="!altaRapidaAbierta()" class="space-y-2 animate-scale-in">
                <div class="flex gap-2">
                  <div class="relative flex-1">
                    <input type="text" [ngModel]="busquedaPaciente()" (ngModelChange)="busquedaPaciente.set($event)"
                           placeholder="Buscá por nombre, DNI o email..."
                           class="input !pl-10 !text-xs">
                    <svg class="w-4 h-4 text-stone-400 absolute left-3.5 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                  </div>
                  <button (click)="abrirAltaRapida()"
                          class="bg-teal-100 hover:bg-teal-200 text-teal-900 border border-teal-200 px-3.5 rounded-xl text-[11px] font-bold transition-colors flex items-center gap-1.5 shrink-0">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
                    Nuevo
                  </button>
                </div>

                <div class="border border-stone-200 rounded-xl overflow-hidden divide-y divide-stone-100 max-h-40 overflow-y-auto">
                  <button *ngFor="let pac of pacientesFiltrados()"
                          (click)="seleccionarPaciente(pac)"
                          class="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-teal-50 transition-colors text-left">
                    <div class="w-8 h-8 rounded-full bg-teal-100 border border-teal-200 text-teal-800 font-extrabold text-[10px] flex items-center justify-center shrink-0">
                      {{ getInitials(pac.nombre) }}
                    </div>
                    <div class="min-w-0">
                      <p class="font-bold text-stone-800 text-xs truncate">{{ pac.nombre }}</p>
                      <p class="text-[10px] text-stone-400 truncate">DNI {{ pac.dni }} · {{ pac.obraSocial }}</p>
                    </div>
                  </button>
                  <div *ngIf="pacientesFiltrados().length === 0" class="px-4 py-3 space-y-1.5">
                    <p class="text-xs text-stone-400 italic">No se encontraron pacientes con esa búsqueda.</p>
                    <button (click)="abrirAltaRapida()" class="text-[11px] text-teal-700 font-bold hover:underline">
                      + Darlo de alta ahora
                    </button>
                  </div>
                </div>
              </div>

              <!-- Alta rápida inline -->
              <div *ngIf="altaRapidaAbierta()" class="bg-teal-50/60 border border-teal-200 rounded-xl p-4 space-y-3 animate-scale-in">
                <div class="flex items-center justify-between">
                  <p class="text-[11px] font-extrabold text-teal-900 flex items-center gap-1.5">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
                    Alta rápida de paciente
                  </p>
                  <button (click)="cerrarAltaRapida()" class="text-[11px] font-bold text-stone-400 hover:text-stone-600 hover:underline">
                    Volver a buscar
                  </button>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div class="space-y-0.5">
                    <input type="text" [ngModel]="npNombre()" (ngModelChange)="npNombre.set($event)"
                           placeholder="Nombre y apellido *" class="input !text-xs !bg-white"
                           [class.!border-rose-300]="npMostrarErrores() && npErrorNombre()">
                    <p *ngIf="npMostrarErrores() && npErrorNombre()" class="text-[9px] font-bold text-rose-600">{{ npErrorNombre() }}</p>
                  </div>
                  <div class="space-y-0.5">
                    <input type="text" [ngModel]="npDni()" (ngModelChange)="npDni.set($event)"
                           placeholder="DNI (solo números) *" class="input !text-xs !bg-white"
                           [class.!border-rose-300]="npMostrarErrores() && npErrorDni()">
                    <p *ngIf="npMostrarErrores() && npErrorDni()" class="text-[9px] font-bold text-rose-600">{{ npErrorDni() }}</p>
                  </div>
                  <div class="space-y-0.5">
                    <input type="text" [ngModel]="npTelefono()" (ngModelChange)="npTelefono.set($event)"
                           placeholder="Teléfono *" class="input !text-xs !bg-white"
                           [class.!border-rose-300]="npMostrarErrores() && npErrorTelefono()">
                    <p *ngIf="npMostrarErrores() && npErrorTelefono()" class="text-[9px] font-bold text-rose-600">{{ npErrorTelefono() }}</p>
                  </div>
                  <div class="space-y-0.5">
                    <input type="email" [ngModel]="npEmail()" (ngModelChange)="npEmail.set($event)"
                           placeholder="Email *" class="input !text-xs !bg-white"
                           [class.!border-rose-300]="npMostrarErrores() && npErrorEmail()">
                    <p *ngIf="npMostrarErrores() && npErrorEmail()" class="text-[9px] font-bold text-rose-600">{{ npErrorEmail() }}</p>
                  </div>
                </div>

                <div class="flex gap-2">
                  <div class="relative flex-1">
                    <select [ngModel]="npObraSocial()" (ngModelChange)="npObraSocial.set($event)"
                            class="input !text-xs !bg-white appearance-none cursor-pointer !pr-8">
                      <option *ngFor="let o of adminService.healthInsurances()" [value]="o">{{ o }}</option>
                    </select>
                    <svg class="w-4 h-4 text-stone-400 absolute right-3 top-3 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                  <button (click)="crearPacienteRapido()" [disabled]="npGuardando()"
                          class="btn-primary !text-[11px] !py-2 !px-4 shrink-0">
                    {{ npGuardando() ? 'Creando…' : 'Crear y Seleccionar' }}
                  </button>
                </div>
              </div>
            </ng-template>
          </div>

          <!-- ===== 2. Fecha y hora (selector interactivo) ===== -->
          <div class="space-y-2">
            <label class="field-label">2 · {{ modoEdicion() ? 'Fecha y hora' : 'Fecha y hora (primera sesión)' }}</label>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">

              <!-- Mini calendario -->
              <div class="border border-stone-200 rounded-xl p-3 bg-stone-50/60">
                <div class="flex justify-between items-center mb-2">
                  <button type="button" (click)="cambiarMesMini(-1)" class="w-7 h-7 rounded-lg hover:bg-stone-200 text-stone-500 flex items-center justify-center transition-colors">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"></path></svg>
                  </button>
                  <span class="text-[11px] font-extrabold text-stone-700 uppercase tracking-wider">{{ nombreMesMini() }}</span>
                  <button type="button" (click)="cambiarMesMini(1)" class="w-7 h-7 rounded-lg hover:bg-stone-200 text-stone-500 flex items-center justify-center transition-colors">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"></path></svg>
                  </button>
                </div>

                <div class="grid grid-cols-7 gap-0.5 text-center text-[8px] font-bold text-stone-400 uppercase tracking-widest mb-1">
                  <span>Lu</span><span>Ma</span><span>Mi</span><span>Ju</span><span>Vi</span><span>Sá</span><span>Do</span>
                </div>

                <div class="grid grid-cols-7 gap-0.5">
                  <div *ngFor="let c of celdasMini()"
                       (click)="c.date && !c.deshabilitado && elegirFecha(c.date)"
                       [class.pointer-events-none]="!c.date || c.deshabilitado"
                       [ngClass]="!c.date ? '' :
                         c.isSelected ? 'bg-teal-200 border-teal-400 font-extrabold text-teal-950' :
                         c.deshabilitado ? 'opacity-30' :
                         c.estado === 'BLOQUEADO' ? 'bg-rose-50 text-rose-400 line-through border-transparent' :
                         c.estado === 'COMPLETO' ? 'bg-rose-50/70 text-rose-500 border-transparent hover:border-rose-200' :
                         c.estado === 'CERRADO' ? 'text-stone-300 border-transparent hover:bg-stone-100' :
                         'bg-white text-stone-700 border-stone-200 hover:border-teal-400 hover:bg-teal-50'"
                       class="h-8 rounded-lg border text-[10px] font-semibold cursor-pointer transition-colors flex flex-col items-center justify-center gap-0 select-none relative">
                    <span [ngClass]="c.isToday && !c.isSelected ? 'text-teal-700 font-extrabold' : ''">{{ c.dayNum }}</span>
                    <span *ngIf="c.estado === 'LIBRE' && c.date && !c.deshabilitado" class="w-1 h-1 rounded-full bg-emerald-400"></span>
                  </div>
                </div>

                <div class="flex flex-wrap gap-x-3 gap-y-1 mt-2 pt-2 border-t border-stone-200/70 text-[8px] font-bold text-stone-400">
                  <span class="flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Con horarios libres</span>
                  <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-sm bg-rose-100"></span> Completo / bloqueado</span>
                  <span class="text-stone-300">Gris: día sin atención</span>
                </div>
              </div>

              <!-- Horarios del día -->
              <div class="border border-stone-200 rounded-xl p-3.5 flex flex-col gap-2.5">
                <div class="flex items-center justify-between gap-2">
                  <p class="text-[11px] font-extrabold text-stone-700">
                    {{ fecha() ? (nombreDia(fecha()) | titlecase) + ' ' + formatFecha(fecha()) : 'Elegí un día' }}
                  </p>
                  <span *ngIf="hora()" class="chip !text-[10px] bg-teal-100 text-teal-900 border-teal-200">{{ hora() }} hs</span>
                </div>

                <ng-container *ngIf="fecha()">
                  <div *ngIf="slotsSugeridos().length > 0; else sinHorarios" class="flex flex-wrap gap-1.5 content-start">
                    <button *ngFor="let slot of slotsSugeridos()"
                            (click)="!slot.ocupado && hora.set(slot.time)"
                            [disabled]="slot.ocupado"
                            [ngClass]="slot.ocupado
                              ? 'bg-rose-50 text-rose-400 border-rose-200 line-through cursor-not-allowed'
                              : hora() === slot.time
                                ? 'bg-teal-200 text-teal-900 border-teal-400'
                                : 'bg-white text-stone-600 border-stone-200 hover:border-teal-300 hover:bg-teal-50'"
                            class="px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors">
                      {{ slot.time }}
                    </button>
                  </div>
                  <ng-template #sinHorarios>
                    <p class="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      El {{ nombreDia(fecha()) }} no tenés horarios configurados. Podés cargar una hora manual.
                    </p>
                  </ng-template>

                  <!-- Hora manual -->
                  <div class="mt-auto pt-2 border-t border-stone-100 flex items-center gap-2">
                    <span class="text-[10px] font-bold text-stone-400 uppercase tracking-wider shrink-0">Otra hora</span>
                    <input type="time" [ngModel]="hora()" (ngModelChange)="hora.set($event)"
                           class="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100 flex-1">
                  </div>
                </ng-container>

                <p *ngIf="!fecha()" class="text-[11px] text-stone-400 italic my-auto text-center">
                  Seleccioná un día en el calendario para ver sus horarios.
                </p>
              </div>
            </div>
          </div>

          <!-- ===== 3. Detalles ===== -->
          <div class="space-y-3">
            <label class="field-label">3 · Detalles del turno</label>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="space-y-1">
                <label class="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Servicio</label>
                <div class="relative">
                  <select [ngModel]="servicioNombre()" (ngModelChange)="servicioNombre.set($event)"
                          class="input !py-2 !text-xs appearance-none cursor-pointer !pr-8">
                    <option *ngFor="let s of serviciosActivos()" [value]="s.name">{{ s.name }} ({{ s.durationMinutes }} min{{ s.price ? ' · $' + s.price : '' }})</option>
                    <option *ngIf="servicioFueraDeLista()" [value]="servicioNombre()">{{ servicioNombre() }} (inactivo)</option>
                  </select>
                  <svg class="w-4 h-4 text-stone-400 absolute right-3 top-2.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>

              <div class="space-y-1">
                <label class="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Lugar</label>
                <div class="relative">
                  <select [ngModel]="lugar()" (ngModelChange)="lugar.set($event)"
                          class="input !py-2 !text-xs appearance-none cursor-pointer !pr-8">
                    <option *ngFor="let l of lugares()" [value]="l">{{ l }}</option>
                  </select>
                  <svg class="w-4 h-4 text-stone-400 absolute right-3 top-2.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>

              <div class="space-y-1">
                <label class="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Estado</label>
                <div class="flex gap-1.5">
                  <button (click)="estadoInicial.set('CONFIRMED')"
                          [ngClass]="estadoInicial() === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-white text-stone-500 border-stone-200'"
                          class="flex-1 px-3 py-2 rounded-lg text-[11px] font-bold border transition-colors">
                    Confirmado
                  </button>
                  <button (click)="estadoInicial.set('PENDING')"
                          [ngClass]="estadoInicial() === 'PENDING' ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-white text-stone-500 border-stone-200'"
                          class="flex-1 px-3 py-2 rounded-lg text-[11px] font-bold border transition-colors">
                    Pendiente
                  </button>
                </div>
              </div>

              <div class="space-y-1">
                <label class="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Notas (opcional)</label>
                <input type="text" [ngModel]="notas()" (ngModelChange)="notas.set($event)"
                       placeholder="Ej. Autorización OS N° 1234..."
                       class="input !py-2 !text-xs">
              </div>
            </div>
          </div>

          <!-- ===== 4. Repetición (solo alta) ===== -->
          <div *ngIf="!modoEdicion()" class="space-y-3">
            <div class="flex items-center justify-between">
              <label class="field-label">4 · Repetición</label>
              <label class="relative inline-flex items-center cursor-pointer select-none gap-2">
                <span class="text-[11px] font-bold" [ngClass]="repetir() ? 'text-teal-800' : 'text-stone-400'">
                  {{ repetir() ? 'Serie de sesiones' : 'Turno único' }}
                </span>
                <input type="checkbox" [ngModel]="repetir()" (ngModelChange)="repetir.set($event)" class="sr-only peer">
                <div class="w-10 h-6 bg-stone-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[3px] after:right-[19px] after:bg-white after:rounded-full after:h-[18px] after:w-[18px] after:transition-all after:shadow-sm peer-checked:bg-teal-400"></div>
              </label>
            </div>

            <div *ngIf="repetir()" class="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-3 animate-scale-in">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div class="space-y-1">
                  <label class="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Frecuencia</label>
                  <div class="flex gap-1.5">
                    <button *ngFor="let f of frecuencias"
                            (click)="frecuencia.set(f.value)"
                            [ngClass]="frecuencia() === f.value ? 'bg-teal-200 text-teal-900 border-teal-300' : 'bg-white text-stone-500 border-stone-200 hover:bg-stone-50'"
                            class="flex-1 px-2 py-2 rounded-lg text-[10px] font-bold border transition-colors">
                      {{ f.label }}
                    </button>
                  </div>
                </div>

                <div class="space-y-1">
                  <label class="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Cantidad de sesiones</label>
                  <div class="flex items-center gap-2">
                    <button (click)="ajustarSesiones(-1)" class="w-9 h-9 rounded-lg border border-stone-200 bg-white text-stone-600 font-black hover:bg-stone-50 transition-colors">−</button>
                    <span class="flex-1 text-center font-extrabold text-stone-800 text-lg">{{ sesiones() }}</span>
                    <button (click)="ajustarSesiones(1)" class="w-9 h-9 rounded-lg border border-stone-200 bg-white text-stone-600 font-black hover:bg-stone-50 transition-colors">+</button>
                  </div>
                </div>
              </div>
              <p class="text-[11px] text-stone-500">{{ descripcionSerie() }}</p>
            </div>
          </div>

          <!-- ===== 5. Vista previa ===== -->
          <div *ngIf="fecha() && hora()" class="space-y-2">
            <div class="flex items-center justify-between">
              <label class="field-label">{{ modoEdicion() ? '4 · Verificación' : repetir() ? '5 · Vista previa de la serie' : '5 · Vista previa' }}</label>
              <span *ngIf="cantidadConflictos() > 0" class="chip chip-cancelled !text-[10px]">
                {{ cantidadConflictos() }} {{ cantidadConflictos() === 1 ? 'conflicto' : 'conflictos' }}
              </span>
            </div>

            <div class="border border-stone-200 rounded-xl overflow-hidden divide-y divide-stone-100">
              <div *ngFor="let fg of fechasGeneradas(); let i = index"
                   class="px-4 py-2.5 flex items-center justify-between gap-3"
                   [ngClass]="fg.conflicto ? 'bg-rose-50/70' : ''">
                <div class="flex items-center gap-3 min-w-0">
                  <span class="w-6 h-6 rounded-lg text-[10px] font-extrabold flex items-center justify-center shrink-0"
                        [ngClass]="fg.conflicto ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-teal-100 text-teal-800 border border-teal-200'">
                    {{ i + 1 }}
                  </span>
                  <div class="min-w-0">
                    <p class="text-xs font-bold text-stone-700">{{ nombreDia(fg.date) }} {{ formatFecha(fg.date) }} · {{ hora() }} hs</p>
                    <p *ngIf="fg.conflicto?.motivo === 'HORARIO'" class="text-[10px] text-rose-600 font-semibold truncate">
                      Horario ocupado por {{ fg.conflicto?.turno?.patientName }} ({{ statusLabel(fg.conflicto?.turno?.status || '') }})
                    </p>
                    <p *ngIf="fg.conflicto?.motivo === 'PACIENTE'" class="text-[10px] text-rose-600 font-semibold truncate">
                      El paciente ya tiene un turno ese día a las {{ fg.conflicto?.turno?.time }} hs
                    </p>
                    <p *ngIf="!fg.conflicto && fg.fueraDeHorario" class="text-[10px] text-amber-600 font-semibold">
                      Fuera de tu horario habitual
                    </p>
                  </div>
                </div>
                <span *ngIf="!fg.conflicto" class="chip chip-confirmed !text-[9px] shrink-0">Libre</span>
                <span *ngIf="fg.conflicto" class="chip chip-cancelled !text-[9px] shrink-0">
                  {{ fg.conflicto.motivo === 'HORARIO' ? 'Ocupado' : 'Duplicado' }}
                </span>
              </div>
            </div>

            <div *ngIf="cantidadConflictos() > 0" class="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 space-y-2 animate-scale-in">
              <p class="text-xs font-bold text-rose-700 flex items-center gap-2">
                <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                {{ mensajeConflictos() }}
              </p>
              <label *ngIf="fechasGeneradas().length > 1 && cantidadLibres() > 0" class="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" [ngModel]="omitirConflictos()" (ngModelChange)="omitirConflictos.set($event)"
                       class="w-4 h-4 rounded border-stone-300 text-teal-600 focus:ring-teal-200">
                <span class="text-[11px] font-semibold text-stone-600">
                  Omitir las fechas con conflicto y crear solo las {{ cantidadLibres() }} libres
                </span>
              </label>
              <p *ngIf="fechasGeneradas().length === 1" class="text-[11px] text-stone-500">
                Cambiá la fecha o la hora para resolver el conflicto.
              </p>
            </div>
          </div>

        </div>

        <!-- Footer -->
        <div class="px-5 sm:px-7 py-4 border-t border-stone-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0 bg-stone-50/60 rounded-b-3xl">
          <button (click)="cerrar.emit()" class="btn-ghost !py-2.5 text-center">Cancelar</button>
          <button (click)="guardar()" [disabled]="!puedeGuardar() || guardando()"
                  class="btn-primary !text-xs !py-3 text-center">
            {{ guardando() ? 'Guardando…' : textoBotonGuardar() }}
          </button>
        </div>

      </div>
    </div>
  `
})
export class TurnoModalComponent {
  adminService = inject(AdminService);

  /** Fecha con la que se abre el modal (ej. día seleccionado en el calendario). */
  @Input() set fechaInicial(valor: string | null) {
    if (valor && !this.modoEdicion()) this.elegirFecha(valor);
  }
  /** Paciente preseleccionado (ej. al abrir desde Mis Pacientes). */
  @Input() set pacienteInicial(pac: Patient | null) {
    if (pac) this.pacienteSeleccionado.set(pac);
  }
  /** Turno a editar: activa el modo edición con todos los campos precargados. */
  @Input() set turnoEditar(turno: Appointment | null) {
    if (!turno) return;
    this.turnoOriginal.set(turno);
    this.profId.set(turno.profesionalId);
    this.elegirFecha(turno.date);
    this.hora.set(turno.time);
    this.servicioNombre.set(turno.serviceName);
    this.lugar.set(turno.location);
    this.notas.set(turno.notes || '');
    this.estadoInicial.set(turno.status === 'CANCELLED' ? 'PENDING' : turno.status);
    this.repetir.set(false);

    const pac = this.adminService.patients().find(p => p.dni === turno.patientDni);
    this.pacienteSeleccionado.set(pac ?? {
      id: 'pat-' + turno.cuentaId + '-' + turno.patientDni,
      cuentaId: turno.cuentaId,
      nombre: turno.patientName,
      email: turno.patientEmail,
      telefono: turno.patientPhone,
      dni: turno.patientDni,
      obraSocial: turno.healthInsurance,
      fechaAlta: turno.date
    });
  }

  @Output() cerrar = new EventEmitter<void>();
  @Output() creado = new EventEmitter<number>();
  @Output() actualizado = new EventEmitter<void>();

  // ---- Estado del formulario ----
  turnoOriginal = signal<Appointment | null>(null);
  modoEdicion = computed(() => this.turnoOriginal() !== null);

  /** Profesional del turno (independiente del selector global del panel). */
  profId = signal<string>('');

  busquedaPaciente = signal('');
  pacienteSeleccionado = signal<Patient | null>(null);

  servicioNombre = signal('Consulta');
  lugar = signal('');
  fecha = signal(todayLocal());
  hora = signal('');
  notas = signal('');
  estadoInicial = signal<AppointmentStatus>('CONFIRMED');

  repetir = signal(false);
  frecuencia = signal<Frecuencia>('SEMANAL');
  sesiones = signal(4);
  omitirConflictos = signal(false);

  guardando = signal(false);

  // Mini calendario
  mesMini = signal<number>(new Date().getMonth());
  anioMini = signal<number>(new Date().getFullYear());

  frecuencias: { label: string; value: Frecuencia }[] = [
    { label: 'Semanal', value: 'SEMANAL' },
    { label: 'Quincenal', value: 'QUINCENAL' },
    { label: 'Mensual', value: 'MENSUAL' }
  ];

  // ---- Datos derivados ----
  pacientesFiltrados = computed(() => {
    const q = this.busquedaPaciente().toLowerCase().trim();
    const list = this.adminService.patients()
      .filter(p => !q ||
        p.nombre.toLowerCase().includes(q) ||
        p.dni.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
    return list.slice(0, 6);
  });

  /** Profesional elegido en el modal (objeto completo). */
  profesional = computed(() => this.adminService.profesionalPorId(this.profId()));

  lugares = computed(() => {
    const dirs = (this.profesional()?.direcciones ?? []).map(d => d.tipo);
    return dirs.length > 0 ? dirs : ['Consultorio'];
  });

  /** Solo servicios activos DEL profesional elegido. */
  serviciosActivos = computed(() =>
    this.adminService.serviciosDe(this.profId()).filter(s => s.activo !== false)
  );

  /** true si el turno en edición usa un servicio inactivo o eliminado (se muestra igual). */
  servicioFueraDeLista = computed(() =>
    !!this.servicioNombre() && !this.serviciosActivos().some(s => s.name === this.servicioNombre())
  );

  /** Turnos activos del profesional elegido (excluye cancelados y el que se edita).
   *  Las reglas de solapamiento y paciente-único-por-día aplican POR PROFESIONAL. */
  private turnosActivos = computed(() => {
    const editandoId = this.turnoOriginal()?.id;
    const prof = this.profId();
    return this.adminService.appointments()
      .filter(a => a.status !== 'CANCELLED' && a.id !== editandoId && a.profesionalId === prof);
  });

  nombreMesMini = computed(() => {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${meses[this.mesMini()]} ${this.anioMini()}`;
  });

  /** Celdas del mini calendario con estado de disponibilidad por día. */
  celdasMini = computed<CeldaMini[]>(() => {
    const mes = this.mesMini();
    const anio = this.anioMini();
    const seleccionada = this.fecha();
    const activos = this.turnosActivos();
    const avail = this.adminService.availabilityDe(this.profId());
    const bloqueos = this.adminService.bloqueosDe(this.profId());
    const hoy = todayLocal();
    const fechaOriginal = this.turnoOriginal()?.date;

    const primerDia = new Date(anio, mes, 1);
    const totalDias = new Date(anio, mes + 1, 0).getDate();
    let inicio = primerDia.getDay() - 1;
    if (inicio < 0) inicio = 6;

    const celdas: CeldaMini[] = [];
    for (let i = 0; i < inicio; i++) {
      celdas.push({ date: null, dayNum: null, estado: 'CERRADO', libres: 0, isToday: false, isSelected: false, deshabilitado: true });
    }

    for (let i = 1; i <= totalDias; i++) {
      const fechaStr = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dow = parseLocalDate(fechaStr).getDay();
      const config = avail.find(c => c.dayIndex === dow);
      const bloqueado = bloqueos.some(b => b.startDate <= fechaStr && fechaStr <= b.endDate);

      let estado: EstadoDia;
      let libres = 0;
      if (bloqueado) {
        estado = 'BLOQUEADO';
      } else if (!config || !config.active || config.slots.length === 0) {
        estado = 'CERRADO';
      } else {
        const ocupadas = new Set(activos.filter(a => a.date === fechaStr).map(a => a.time));
        libres = config.slots.filter(s => !ocupadas.has(s)).length;
        estado = libres > 0 ? 'LIBRE' : 'COMPLETO';
      }

      // Días pasados deshabilitados, salvo la fecha original del turno en edición.
      const esPasado = fechaStr < hoy && fechaStr !== fechaOriginal;

      celdas.push({
        date: fechaStr,
        dayNum: i,
        estado,
        libres,
        isToday: fechaStr === hoy,
        isSelected: fechaStr === seleccionada,
        deshabilitado: esPasado
      });
    }

    return celdas;
  });

  /** Horarios configurados del día elegido, marcando ocupados. */
  slotsSugeridos = computed(() => {
    const f = this.fecha();
    if (!f) return [];
    const dow = parseLocalDate(f).getDay();
    const config = this.adminService.availabilityDe(this.profId()).find(c => c.dayIndex === dow);
    if (!config || !config.active) return [];

    const ocupados = new Set(
      this.turnosActivos().filter(a => a.date === f).map(a => a.time)
    );
    return config.slots.map(time => ({ time, ocupado: ocupados.has(time) }));
  });

  /** Serie de fechas generadas con su estado de conflicto. */
  fechasGeneradas = computed<FechaGenerada[]>(() => {
    const inicio = this.fecha();
    const hora = this.hora();
    if (!inicio || !hora) return [];

    const cantidad = this.repetir() && !this.modoEdicion() ? this.sesiones() : 1;
    const freq = this.frecuencia();
    const activos = this.turnosActivos();
    const avail = this.adminService.availabilityDe(this.profId());
    const dniPaciente = this.pacienteSeleccionado()?.dni;

    const fechas: FechaGenerada[] = [];
    let actual = inicio;

    for (let i = 0; i < cantidad; i++) {
      const ocupaHorario = activos.find(a => a.date === actual && a.time === hora);
      const duplicaPaciente = dniPaciente
        ? activos.find(a => a.date === actual && a.patientDni === dniPaciente)
        : undefined;

      const conflicto: Conflicto | null = ocupaHorario
        ? { turno: ocupaHorario, motivo: 'HORARIO' }
        : duplicaPaciente
          ? { turno: duplicaPaciente, motivo: 'PACIENTE' }
          : null;

      const dow = parseLocalDate(actual).getDay();
      const config = avail.find(c => c.dayIndex === dow);
      const fueraDeHorario = !config || !config.active || !config.slots.includes(hora);

      fechas.push({ date: actual, conflicto, fueraDeHorario });

      if (freq === 'SEMANAL') actual = addDaysTo(actual, 7);
      else if (freq === 'QUINCENAL') actual = addDaysTo(actual, 14);
      else actual = addMonthsClamped(actual, 1);
    }
    return fechas;
  });

  cantidadConflictos = computed(() => this.fechasGeneradas().filter(f => f.conflicto).length);
  cantidadLibres = computed(() => this.fechasGeneradas().filter(f => !f.conflicto).length);

  puedeGuardar = computed(() =>
    !!this.pacienteSeleccionado() &&
    !!this.fecha() &&
    !!this.hora() &&
    this.fechasGeneradas().length > 0 &&
    (this.cantidadConflictos() === 0 ||
      (!this.modoEdicion() && this.omitirConflictos() && this.cantidadLibres() > 0 && this.fechasGeneradas().length > 1))
  );

  mensajeConflictos = computed(() => {
    const conflictos = this.fechasGeneradas().filter(f => f.conflicto);
    const horario = conflictos.filter(c => c.conflicto!.motivo === 'HORARIO').length;
    const paciente = conflictos.filter(c => c.conflicto!.motivo === 'PACIENTE').length;
    const partes: string[] = [];
    if (horario > 0) partes.push(`${horario} ${horario === 1 ? 'horario ocupado' : 'horarios ocupados'}`);
    if (paciente > 0) partes.push(`${paciente} ${paciente === 1 ? 'turno duplicado del paciente en el mismo día' : 'turnos duplicados del paciente en el mismo día'}`);
    return 'Se detectó: ' + partes.join(' y ') + '.';
  });

  descripcionSerie = computed(() => {
    const n = this.sesiones();
    const f = this.frecuencia();
    const detalle = f === 'SEMANAL' ? 'una por semana' : f === 'QUINCENAL' ? 'una cada dos semanas' : 'una por mes';
    const dia = this.fecha() ? `, todos los ${this.nombreDia(this.fecha())} a las ${this.hora() || '—'} hs` : '';
    return `Se crearán ${n} sesiones (${detalle})${dia}, empezando por la fecha elegida.`;
  });

  textoBotonGuardar = computed(() => {
    if (this.modoEdicion()) return 'Guardar Cambios';
    const total = this.fechasGeneradas().length;
    if (total <= 1) return 'Crear Turno';
    const aCrear = this.omitirConflictos() ? this.cantidadLibres() : total;
    return `Crear ${aCrear} Turnos`;
  });

  constructor() {
    // Profesional inicial: el del selector global (o el primero activo).
    effect(() => {
      if (!this.profId() && this.adminService.focoId()) {
        this.profId.set(this.adminService.focoId());
      }
    });

    // Defaults de lugar y servicio según el profesional elegido.
    effect(() => {
      const lugares = this.lugares();
      if (lugares.length > 0 && !lugares.includes(this.lugar())) this.lugar.set(lugares[0]);

      const servicios = this.serviciosActivos();
      if (!this.modoEdicion() && servicios.length > 0 && !servicios.some(s => s.name === this.servicioNombre())) {
        this.servicioNombre.set(servicios[0].name);
      }
    });
  }

  /** Cambiar el profesional del turno: resetea la hora (los horarios difieren). */
  cambiarProfesional(id: string) {
    if (id === this.profId()) return;
    this.profId.set(id);
    this.hora.set('');
  }

  inicialesDe(nombre: string): string {
    const partes = nombre.split(' ').filter(Boolean);
    if (partes.length >= 2) return (partes[0][0] + partes[1][0]).toUpperCase();
    return nombre.slice(0, 2).toUpperCase();
  }

  // ---- Alta rápida de paciente ----
  altaRapidaAbierta = signal(false);
  npNombre = signal('');
  npDni = signal('');
  npTelefono = signal('');
  npEmail = signal('');
  npObraSocial = signal('');
  npMostrarErrores = signal(false);
  npGuardando = signal(false);

  npErrorNombre = computed(() => {
    const v = this.npNombre().trim();
    if (!v) return 'El nombre es obligatorio.';
    if (v.length < 3) return 'El nombre es demasiado corto.';
    return '';
  });

  npErrorDni = computed(() => {
    const v = this.npDni().trim();
    if (!v) return 'El DNI es obligatorio.';
    if (!/^[0-9]{7,9}$/.test(v)) return 'Entre 7 y 9 números.';
    const dup = this.adminService.patients().find(p => p.dni === v);
    if (dup) return `Ya existe: ${dup.nombre}.`;
    return '';
  });

  npErrorTelefono = computed(() => {
    const v = this.npTelefono().trim();
    if (!v) return 'El teléfono es obligatorio.';
    if (!/^[0-9]{8,15}$/.test(v)) return 'Entre 8 y 15 números.';
    return '';
  });

  npErrorEmail = computed(() => {
    const v = this.npEmail().trim();
    if (!v) return 'El email es obligatorio.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Formato inválido.';
    return '';
  });

  npEsValido = computed(() =>
    !this.npErrorNombre() && !this.npErrorDni() && !this.npErrorTelefono() && !this.npErrorEmail() && !!this.npObraSocial()
  );

  abrirAltaRapida() {
    // Si lo que se buscó parece un DNI o un nombre, precargarlo.
    const q = this.busquedaPaciente().trim();
    if (/^[0-9]{7,9}$/.test(q)) this.npDni.set(q);
    else if (q) this.npNombre.set(q);

    if (!this.npObraSocial() && this.adminService.healthInsurances().length > 0) {
      this.npObraSocial.set(this.adminService.healthInsurances()[0]);
    }
    this.npMostrarErrores.set(false);
    this.altaRapidaAbierta.set(true);
  }

  cerrarAltaRapida() {
    this.altaRapidaAbierta.set(false);
  }

  async crearPacienteRapido() {
    if (this.npGuardando()) return;
    if (!this.npEsValido()) {
      this.npMostrarErrores.set(true);
      return;
    }

    this.npGuardando.set(true);
    const creado = await this.adminService.addPatient({
      nombre: this.npNombre().trim(),
      dni: this.npDni().trim(),
      telefono: this.npTelefono().trim(),
      email: this.npEmail().trim(),
      obraSocial: this.npObraSocial(),
      fechaAlta: todayLocal()
    });
    this.npGuardando.set(false);

    if (creado) {
      this.seleccionarPaciente(creado);
      this.altaRapidaAbierta.set(false);
      this.npNombre.set(''); this.npDni.set(''); this.npTelefono.set(''); this.npEmail.set('');
      this.npMostrarErrores.set(false);
    }
  }

  // ---- Acciones ----
  elegirFecha(fechaStr: string) {
    this.fecha.set(fechaStr);
    const d = parseLocalDate(fechaStr);
    this.mesMini.set(d.getMonth());
    this.anioMini.set(d.getFullYear());
  }

  cambiarMesMini(delta: number) {
    let m = this.mesMini() + delta;
    let y = this.anioMini();
    if (m > 11) { m = 0; y++; }
    if (m < 0) { m = 11; y--; }
    this.mesMini.set(m);
    this.anioMini.set(y);
  }

  seleccionarPaciente(pac: Patient) {
    this.pacienteSeleccionado.set(pac);
    this.busquedaPaciente.set('');
  }

  quitarPaciente() {
    this.pacienteSeleccionado.set(null);
  }

  ajustarSesiones(delta: number) {
    this.sesiones.set(Math.min(24, Math.max(2, this.sesiones() + delta)));
  }

  async guardar() {
    const pac = this.pacienteSeleccionado();
    if (!pac || !this.puedeGuardar() || this.guardando()) return;

    // ---- Edición ----
    const original = this.turnoOriginal();
    if (original) {
      this.guardando.set(true);
      const ok = await this.adminService.updateAppointment(original.id, {
        profesionalId: this.profId(),
        serviceName: this.servicioNombre(),
        patientName: pac.nombre,
        patientEmail: pac.email,
        patientPhone: pac.telefono,
        patientDni: pac.dni,
        date: this.fecha(),
        time: this.hora(),
        status: this.estadoInicial(),
        notes: this.notas().trim(),
        location: this.lugar() || this.lugares()[0],
        healthInsurance: pac.obraSocial
      });
      this.guardando.set(false);
      if (ok) this.actualizado.emit();
      return;
    }

    // ---- Alta (única o serie) ----
    const fechasACrear = this.fechasGeneradas().filter(f => !f.conflicto);
    if (fechasACrear.length === 0) return;

    const serieNota = this.repetir() && fechasACrear.length > 1
      ? ` [Serie: sesión de ${fechasACrear.length}]`
      : '';

    const nuevos = fechasACrear.map(fg => ({
      profesionalId: this.profId(),
      serviceName: this.servicioNombre(),
      patientName: pac.nombre,
      patientEmail: pac.email,
      patientPhone: pac.telefono,
      patientDni: pac.dni,
      date: fg.date,
      time: this.hora(),
      status: this.estadoInicial(),
      notes: (this.notas().trim() + serieNota).trim(),
      location: this.lugar() || this.lugares()[0],
      healthInsurance: pac.obraSocial
    }));

    this.guardando.set(true);
    const creados = await this.adminService.addAppointments(nuevos);
    this.guardando.set(false);

    if (creados > 0) {
      this.creado.emit(creados);
    }
  }

  // ---- Helpers ----
  getInitials(name: string): string {
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }

  nombreDia(fechaStr: string): string {
    const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    return dias[parseLocalDate(fechaStr).getDay()];
  }

  formatFecha = formatDMY;

  statusLabel(status: string): string {
    return status === 'CONFIRMED' ? 'Confirmado' : status === 'PENDING' ? 'Pendiente' : 'Cancelado';
  }
}
