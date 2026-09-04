import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ClientService } from '../../services/client.service';
import { Cuenta } from '../../../core/models';
import { Appointment, ProfessionalProfile, TimeSlot } from '../../../core/models';
import { formatDMY, parseLocalDate, todayLocal } from '../../../core/date-utils';
import { linkWhatsapp } from '../../../core/whatsapp';

interface CeldaAgenda {
  date: string | null;
  dayNum: number | null;
  disponible: boolean;
  isSelected: boolean;
  isToday: boolean;
}

/**
 * Autogestión del paciente: busca sus turnos por DNI y puede
 * reprogramar (mini agenda + horarios) o cancelar. Simple y en un solo lugar.
 */
@Component({
  selector: 'app-mis-turnos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="min-h-screen bg-stone-50 font-sans text-stone-800">

      <!-- Header simple -->
      <header class="bg-white/80 backdrop-blur-xl border-b border-stone-200/60 sticky top-0 z-40">
        <div class="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex justify-between items-center">
          <a [routerLink]="linkInicio()" class="flex items-center gap-2 text-stone-500 hover:text-teal-800 transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"></path></svg>
            <span class="text-xs font-bold">Volver</span>
          </a>
          <span class="font-extrabold text-stone-900 text-sm">Gestionar mi turno</span>
          <a [routerLink]="linkTurnos()" class="text-xs font-bold text-teal-700 hover:underline">Nuevo turno</a>
        </div>
      </header>

      <main class="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6 pb-24">

        <!-- ===== Buscador por DNI ===== -->
        <div class="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 text-center anim-entrada">
          <div class="w-14 h-14 mx-auto rounded-2xl bg-teal-100 border border-teal-200 text-teal-800 flex items-center justify-center mb-4">
            <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"></path></svg>
          </div>
          <h1 class="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight">Gestioná tu turno</h1>
          <p class="text-sm text-stone-500 mt-1.5 max-w-sm mx-auto">Ingresá tu DNI para ver tus turnos, cambiar la fecha y hora, o cancelarlos.</p>

          <div class="flex gap-2 max-w-sm mx-auto mt-5">
            <input type="text" inputmode="numeric" [ngModel]="dni()" (ngModelChange)="dni.set($event)"
                   (keyup.enter)="buscar()"
                   placeholder="Tu DNI (solo números)"
                   class="input !text-sm text-center font-bold tracking-widest flex-1">
            <button (click)="buscar()" [disabled]="buscando()" class="btn-primary !text-xs !px-5 shrink-0">
              {{ buscando() ? 'Buscando…' : 'Buscar' }}
            </button>
          </div>
          <p *ngIf="errorDni()" class="text-[11px] font-bold text-rose-600 mt-2.5">{{ errorDni() }}</p>
        </div>

        <!-- ===== Mensaje de éxito ===== -->
        <div *ngIf="mensajeExito()" class="bg-emerald-100 border border-emerald-300 text-emerald-900 px-5 py-4 rounded-2xl text-sm font-bold flex items-start justify-between gap-3 animate-scale-in">
          <div class="flex items-start gap-2.5">
            <svg class="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <div>
              <p>{{ mensajeExito() }}</p>
              <a *ngIf="linkAvisoWhatsapp()" [href]="linkAvisoWhatsapp()" target="_blank" rel="noopener"
                 class="inline-flex items-center gap-1.5 mt-2 bg-white text-emerald-800 border border-emerald-300 px-3.5 py-2 rounded-xl text-[11px] font-extrabold hover:bg-emerald-50 transition-colors">
                <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.497.1-.198.05-.371-.025-.52-.074-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Avisar al profesional por WhatsApp
              </a>
            </div>
          </div>
          <button (click)="mensajeExito.set('')" class="text-emerald-600 hover:text-emerald-900 font-black shrink-0">×</button>
        </div>

        <!-- ===== Resultados ===== -->
        <ng-container *ngIf="busquedaHecha()">

          <div *ngIf="turnosFuturos().length > 0" class="space-y-3">
            <p class="field-label px-1">Tus próximos turnos</p>

            <div *ngFor="let turno of turnosFuturos()" class="bg-white rounded-2xl border border-stone-200 overflow-hidden animate-scale-in">

              <!-- Datos del turno (sin recuadro, en línea) -->
              <div class="p-5 flex items-start gap-3.5">
                <div class="w-10 h-10 rounded-xl bg-teal-100 border border-teal-200 text-teal-800 flex items-center justify-center shrink-0">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                </div>
                <div class="min-w-0">
                  <p class="font-extrabold text-stone-900 text-base leading-tight">
                    {{ nombreDia(turno.date) | titlecase }} {{ formatFecha(turno.date) }} · <span class="text-teal-700">{{ turno.time }} hs</span>
                  </p>
                  <p class="text-xs text-stone-500 mt-1">
                    <span *ngIf="esConsultorio()" class="font-bold text-teal-700">{{ nombreProfesionalDe(turno) }} · </span>{{ turno.serviceName }} · {{ turno.location }}
                  </p>
                  <span class="chip mt-2 !text-[9px]"
                        [class.chip-confirmed]="turno.status === 'CONFIRMED'"
                        [class.chip-pending]="turno.status === 'PENDING'">
                    {{ turno.status === 'CONFIRMED' ? 'Confirmado' : 'Pendiente de confirmación' }}
                  </span>
                </div>
              </div>

              <!-- Acciones (mismo tamaño) -->
              <div *ngIf="turnoEnGestion() !== turno.id" class="px-5 pb-4 flex gap-2">
                <button (click)="abrirReprogramacion(turno)"
                        class="flex-1 bg-teal-100 hover:bg-teal-200 text-teal-900 border border-teal-200 px-3 py-3 rounded-xl text-xs font-extrabold transition-colors flex items-center justify-center gap-1.5">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                  Cambiar fecha y hora
                </button>
                <button (click)="abrirCancelacion(turno)"
                        class="flex-1 bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-200 px-3 py-3 rounded-xl text-xs font-extrabold transition-colors flex items-center justify-center gap-1.5">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  Cancelar Turno
                </button>
              </div>

              <!-- ===== Panel de reprogramación: mini agenda + horas ===== -->
              <div *ngIf="turnoEnGestion() === turno.id && modoGestion() === 'REPROGRAMAR'" class="border-t border-stone-100 bg-stone-50/60 p-5 space-y-4 animate-scale-in">
                <div class="flex items-center justify-between">
                  <p class="text-xs font-extrabold text-stone-700">Elegí el nuevo día y horario</p>
                  <button (click)="cerrarGestion()" class="text-[11px] font-bold text-stone-400 hover:text-stone-600 hover:underline">Cancelar</button>
                </div>

                <div *ngIf="cargandoSlots()" class="py-6 text-center">
                  <div class="animate-spin rounded-full h-7 w-7 border-b-2 border-teal-600 mx-auto"></div>
                </div>

                <ng-container *ngIf="!cargandoSlots()">
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

                    <!-- Mini agenda -->
                    <div class="border border-stone-200 rounded-xl p-3 bg-white">
                      <div class="flex justify-between items-center mb-2">
                        <button type="button" (click)="cambiarMesAgenda(-1)" class="w-7 h-7 rounded-lg hover:bg-stone-100 text-stone-500 flex items-center justify-center transition-colors">
                          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"></path></svg>
                        </button>
                        <span class="text-[11px] font-extrabold text-stone-700 uppercase tracking-wider">{{ nombreMesAgenda() }}</span>
                        <button type="button" (click)="cambiarMesAgenda(1)" class="w-7 h-7 rounded-lg hover:bg-stone-100 text-stone-500 flex items-center justify-center transition-colors">
                          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"></path></svg>
                        </button>
                      </div>

                      <div class="grid grid-cols-7 gap-0.5 text-center text-[8px] font-bold text-stone-400 uppercase tracking-widest mb-1">
                        <span>Lu</span><span>Ma</span><span>Mi</span><span>Ju</span><span>Vi</span><span>Sá</span><span>Do</span>
                      </div>

                      <div class="grid grid-cols-7 gap-0.5">
                        <div *ngFor="let c of celdasAgenda()"
                             (click)="c.date && c.disponible && elegirNuevaFecha(c.date)"
                             [class.pointer-events-none]="!c.date || !c.disponible"
                             [ngClass]="!c.date ? 'border-transparent' :
                               c.isSelected ? 'bg-teal-200 border-teal-400 font-extrabold text-teal-950' :
                               c.disponible ? 'bg-white text-stone-700 border-stone-200 hover:border-teal-400 hover:bg-teal-50 cursor-pointer' :
                               'text-stone-300 border-transparent'"
                             class="h-8 rounded-lg border text-[10px] font-semibold transition-colors flex flex-col items-center justify-center select-none">
                          <span [ngClass]="c.isToday && !c.isSelected ? 'text-teal-700 font-extrabold' : ''">{{ c.dayNum }}</span>
                          <span *ngIf="c.disponible && !c.isSelected" class="w-1 h-1 rounded-full bg-emerald-400"></span>
                        </div>
                      </div>

                      <p class="text-[8px] font-bold text-stone-400 mt-2 pt-2 border-t border-stone-100 flex items-center gap-1">
                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Días con horarios libres
                      </p>
                    </div>

                    <!-- Horarios del día elegido -->
                    <div class="border border-stone-200 rounded-xl p-3.5 bg-white flex flex-col gap-2.5">
                      <div class="flex items-center justify-between gap-2">
                        <p class="text-[11px] font-extrabold text-stone-700">
                          {{ nuevaFecha() ? (nombreDia(nuevaFecha()) | titlecase) + ' ' + formatFecha(nuevaFecha()) : 'Elegí un día' }}
                        </p>
                        <span *ngIf="nuevaHora()" class="chip !text-[10px] bg-teal-100 text-teal-900 border-teal-200">{{ nuevaHora() }} hs</span>
                      </div>

                      <div *ngIf="nuevaFecha()" class="flex flex-wrap gap-1.5 content-start">
                        <button *ngFor="let slot of horariosDeNuevaFecha()"
                                (click)="nuevaHora.set(slot.startTime)"
                                [ngClass]="nuevaHora() === slot.startTime ? 'bg-teal-200 text-teal-900 border-teal-400' : 'bg-white text-stone-600 border-stone-200 hover:border-teal-300 hover:bg-teal-50'"
                                class="px-3.5 py-2 rounded-lg text-xs font-bold border transition-colors">
                          {{ slot.startTime }}
                        </button>
                      </div>

                      <p *ngIf="!nuevaFecha()" class="text-[11px] text-stone-400 italic my-auto text-center">
                        Seleccioná un día con punto verde para ver sus horarios.
                      </p>
                    </div>
                  </div>

                  <p *ngIf="fechasDisponibles().length === 0" class="text-xs text-stone-400 italic text-center py-2">
                    No hay horarios disponibles en los próximos días.
                  </p>

                  <button (click)="confirmarReprogramacion(turno)"
                          [disabled]="!nuevaFecha() || !nuevaHora() || guardando()"
                          class="btn-primary w-full !text-xs !py-3">
                    {{ guardando() ? 'Guardando…' : nuevaFecha() && nuevaHora()
                        ? 'Confirmar cambio: ' + nombreDia(nuevaFecha()) + ' ' + formatFecha(nuevaFecha()) + ' · ' + nuevaHora() + ' hs'
                        : 'Elegí día y horario' }}
                  </button>
                  <p class="text-[10px] text-stone-400 text-center">El profesional deberá volver a confirmar el turno.</p>
                </ng-container>
              </div>

              <!-- ===== Panel de cancelación ===== -->
              <div *ngIf="turnoEnGestion() === turno.id && modoGestion() === 'CANCELAR'" class="border-t border-stone-100 bg-rose-50/50 p-5 space-y-3 animate-scale-in">
                <p class="text-xs font-extrabold text-rose-800">¿Seguro que querés cancelar este turno?</p>
                <p class="text-[11px] text-stone-500">Esta acción no se puede deshacer. Si preferís otro horario, usá "Cambiar fecha y hora".</p>
                <div class="flex gap-2">
                  <button (click)="cerrarGestion()" class="flex-1 btn-ghost !py-2.5 text-center">No, mantener</button>
                  <button (click)="confirmarCancelacion(turno)" [disabled]="guardando()"
                          class="flex-1 bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-colors">
                    {{ guardando() ? 'Cancelando…' : 'Sí, cancelar turno' }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Sin turnos futuros -->
          <div *ngIf="turnosFuturos().length === 0" class="bg-white rounded-3xl border border-stone-200 p-8 text-center space-y-3 animate-scale-in">
            <div class="w-12 h-12 mx-auto rounded-2xl bg-stone-100 flex items-center justify-center">
              <svg class="w-6 h-6 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            </div>
            <p class="text-sm text-stone-500">No encontramos turnos próximos para el DNI <span class="font-bold text-stone-700">{{ dniBuscado() }}</span>.</p>
            <a [routerLink]="linkTurnos()" class="inline-flex btn-primary !text-xs">Reservar un turno</a>
          </div>

          <!-- Historial pasado (informativo) -->
          <div *ngIf="turnosPasados().length > 0" class="space-y-2">
            <p class="field-label px-1">Turnos anteriores</p>
            <div class="bg-white rounded-2xl border border-stone-200 divide-y divide-stone-100 overflow-hidden">
              <div *ngFor="let t of turnosPasados()" class="px-5 py-3 flex items-center justify-between gap-3 text-[11px]"
                   [class.opacity-60]="t.status === 'CANCELLED'">
                <span class="font-bold text-stone-600">{{ formatFecha(t.date) }} · {{ t.time }} hs</span>
                <span class="text-stone-500 truncate flex-1 text-center">
                  <span *ngIf="esConsultorio()" class="font-bold text-teal-700">{{ nombreProfesionalDe(t) }} · </span>{{ t.serviceName }}
                </span>
                <span class="chip !text-[9px] shrink-0"
                      [class.chip-confirmed]="t.status === 'CONFIRMED'"
                      [class.chip-pending]="t.status === 'PENDING'"
                      [class.chip-cancelled]="t.status === 'CANCELLED'">
                  {{ t.status === 'CONFIRMED' ? 'Realizado' : t.status === 'PENDING' ? 'Pendiente' : 'Cancelado' }}
                </span>
              </div>
            </div>
          </div>

        </ng-container>
      </main>
    </div>
  `
})
export class MisTurnosComponent implements OnInit {
  private clientService = inject(ClientService);
  private route = inject(ActivatedRoute);

  /** Cuenta pública (consultorio o profesional) resuelta por el :slug de la URL. */
  cuenta = signal<Cuenta | null>(null);
  slug = signal('');

  linkInicio = computed(() => [this.tipoRuta(), this.slug()]);
  linkTurnos = computed(() => [this.tipoRuta(), this.slug(), 'turnos']);
  private tipoRuta(): string {
    return this.cuenta()?.tipo === 'consultorio' ? '/c' : '/p';
  }

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug') ?? '';
    this.slug.set(slug);
    this.clientService.getCuentaPorSlug(slug).subscribe({
      next: cuenta => {
        this.cuenta.set(cuenta);
        this.clientService.getProfessionals(cuenta.id).subscribe({ next: p => this.profesionales.set(p) });
      }
    });
  }

  dni = signal('');
  dniBuscado = signal('');
  errorDni = signal('');
  buscando = signal(false);
  busquedaHecha = signal(false);

  turnos = signal<Appointment[]>([]);
  profesionales = signal<ProfessionalProfile[]>([]);

  // Gestión (reprogramar / cancelar)
  turnoEnGestion = signal<string | null>(null);
  modoGestion = signal<'REPROGRAMAR' | 'CANCELAR' | null>(null);
  slotsDisponibles = signal<TimeSlot[]>([]);
  cargandoSlots = signal(false);
  nuevaFecha = signal('');
  nuevaHora = signal('');
  guardando = signal(false);

  // Mini agenda
  mesAgenda = signal<number>(new Date().getMonth());
  anioAgenda = signal<number>(new Date().getFullYear());

  mensajeExito = signal('');
  linkAvisoWhatsapp = signal('');

  turnosFuturos = computed(() => {
    const hoy = todayLocal();
    return this.turnos()
      .filter(t => t.status !== 'CANCELLED' && t.date >= hoy)
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  });

  turnosPasados = computed(() => {
    const hoy = todayLocal();
    return this.turnos()
      .filter(t => t.date < hoy || t.status === 'CANCELLED')
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
      .slice(0, 5);
  });

  fechasDisponibles = computed(() => {
    const fechas = this.slotsDisponibles().map(s => s.date);
    return [...new Set(fechas)].sort();
  });

  horariosDeNuevaFecha = computed(() =>
    this.slotsDisponibles().filter(s => s.date === this.nuevaFecha())
  );

  nombreMesAgenda = computed(() => {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${meses[this.mesAgenda()]} ${this.anioAgenda()}`;
  });

  /** Celdas de la mini agenda: solo los días con horarios libres son seleccionables. */
  celdasAgenda = computed<CeldaAgenda[]>(() => {
    const mes = this.mesAgenda();
    const anio = this.anioAgenda();
    const disponibles = new Set(this.fechasDisponibles());
    const seleccionada = this.nuevaFecha();
    const hoy = todayLocal();

    const primerDia = new Date(anio, mes, 1);
    const totalDias = new Date(anio, mes + 1, 0).getDate();
    let inicio = primerDia.getDay() - 1; // semana inicia lunes
    if (inicio < 0) inicio = 6;

    const celdas: CeldaAgenda[] = [];
    for (let i = 0; i < inicio; i++) {
      celdas.push({ date: null, dayNum: null, disponible: false, isSelected: false, isToday: false });
    }
    for (let i = 1; i <= totalDias; i++) {
      const fecha = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      celdas.push({
        date: fecha,
        dayNum: i,
        disponible: disponibles.has(fecha),
        isSelected: fecha === seleccionada,
        isToday: fecha === hoy
      });
    }
    return celdas;
  });

  buscar(): void {
    const dni = this.dni().trim();
    this.errorDni.set('');
    this.mensajeExito.set('');
    if (!/^[0-9]{7,9}$/.test(dni)) {
      this.errorDni.set('Ingresá un DNI válido (entre 7 y 9 números).');
      return;
    }

    const cuentaId = this.cuenta()?.id;
    if (!cuentaId) {
      this.errorDni.set('No pudimos cargar la página. Recargá e intentá de nuevo.');
      return;
    }

    this.buscando.set(true);
    this.clientService.getTurnosPorDni(cuentaId, dni).subscribe({
      next: turnos => {
        this.turnos.set(turnos);
        this.dniBuscado.set(dni);
        this.busquedaHecha.set(true);
        this.buscando.set(false);
        this.cerrarGestion();
      },
      error: () => {
        this.errorDni.set('No pudimos buscar tus turnos. Probá de nuevo en unos segundos.');
        this.buscando.set(false);
      }
    });

  }

  nombreProfesionalDe(turno: Appointment): string {
    return this.profesionales().find(p => p.id === turno.profesionalId)?.nombre ?? '';
  }

  esConsultorio(): boolean {
    return this.cuenta()?.tipo === 'consultorio';
  }

  // ---- Reprogramación ----
  abrirReprogramacion(turno: Appointment): void {
    this.turnoEnGestion.set(turno.id);
    this.modoGestion.set('REPROGRAMAR');
    this.nuevaFecha.set('');
    this.nuevaHora.set('');
    this.mensajeExito.set('');

    this.cargandoSlots.set(true);
    this.clientService.getServices(turno.profesionalId).subscribe({
      next: serviciosProf => {
        const servicio = serviciosProf.find(s => s.name === turno.serviceName);
        this.buscarSlots(turno, servicio?.id ?? '');
      },
      error: () => this.buscarSlots(turno, '')
    });
  }

  private buscarSlots(turno: Appointment, servicioId: string): void {
    this.clientService.getAvailableTimeSlots(turno.profesionalId, servicioId).subscribe({
      next: slots => {
        this.slotsDisponibles.set(slots);
        this.cargandoSlots.set(false);
        // Posicionar la mini agenda en el primer día disponible
        const primera = [...new Set(slots.map(s => s.date))].sort()[0];
        if (primera) {
          const d = parseLocalDate(primera);
          this.mesAgenda.set(d.getMonth());
          this.anioAgenda.set(d.getFullYear());
        }
      },
      error: () => this.cargandoSlots.set(false)
    });
  }

  cambiarMesAgenda(delta: number): void {
    let m = this.mesAgenda() + delta;
    let y = this.anioAgenda();
    if (m > 11) { m = 0; y++; }
    if (m < 0) { m = 11; y--; }
    this.mesAgenda.set(m);
    this.anioAgenda.set(y);
  }

  elegirNuevaFecha(fecha: string): void {
    this.nuevaFecha.set(fecha);
    this.nuevaHora.set('');
  }

  confirmarReprogramacion(turno: Appointment): void {
    if (!this.nuevaFecha() || !this.nuevaHora() || this.guardando()) return;
    this.guardando.set(true);

    this.clientService.reprogramarTurno(turno, this.nuevaFecha(), this.nuevaHora()).subscribe({
      next: actualizado => {
        this.turnos.set(this.turnos().map(t => (t.id === turno.id ? actualizado : t)));
        this.guardando.set(false);
        this.cerrarGestion();
        this.mensajeExito.set(`Tu turno se movió al ${this.nombreDia(actualizado.date)} ${formatDMY(actualizado.date)} a las ${actualizado.time} hs. Queda pendiente de confirmación.`);
        this.armarAvisoWhatsapp(actualizado, `Hola! Soy ${actualizado.patientName} (DNI ${actualizado.patientDni}). Reprogramé mi turno de ${actualizado.serviceName} para el ${this.nombreDia(actualizado.date)} ${formatDMY(actualizado.date)} a las ${actualizado.time} hs. Quedo a la espera de tu confirmación. ¡Gracias!`);
      },
      error: () => this.guardando.set(false)
    });
  }

  // ---- Cancelación ----
  abrirCancelacion(turno: Appointment): void {
    this.turnoEnGestion.set(turno.id);
    this.modoGestion.set('CANCELAR');
    this.mensajeExito.set('');
  }

  confirmarCancelacion(turno: Appointment): void {
    if (this.guardando()) return;
    this.guardando.set(true);

    this.clientService.cancelarTurno(turno).subscribe({
      next: actualizado => {
        this.turnos.set(this.turnos().map(t => (t.id === turno.id ? actualizado : t)));
        this.guardando.set(false);
        this.cerrarGestion();
        this.mensajeExito.set(`Tu turno del ${formatDMY(turno.date)} a las ${turno.time} hs fue cancelado.`);
        this.armarAvisoWhatsapp(turno, `Hola! Soy ${turno.patientName} (DNI ${turno.patientDni}). Tuve que cancelar mi turno de ${turno.serviceName} del ${formatDMY(turno.date)} a las ${turno.time} hs. Disculpá las molestias.`);
      },
      error: () => this.guardando.set(false)
    });
  }

  cerrarGestion(): void {
    this.turnoEnGestion.set(null);
    this.modoGestion.set(null);
    this.nuevaFecha.set('');
    this.nuevaHora.set('');
  }

  private armarAvisoWhatsapp(turno: Appointment, mensaje: string): void {
    const whatsapp = this.profesionales().find(p => p.id === turno.profesionalId)?.whatsapp;
    this.linkAvisoWhatsapp.set(whatsapp ? linkWhatsapp(whatsapp, mensaje) : '');
  }

  // ---- Helpers de presentación ----
  formatFecha = formatDMY;

  nombreDia(fecha: string): string {
    const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    return dias[parseLocalDate(fecha).getDay()];
  }
}
