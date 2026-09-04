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
  templateUrl: './mis-turnos.component.html',
  styleUrl: './mis-turnos.component.scss'
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

  /** Horas mínimas de anticipación para cambios (configuradas por la cuenta; default 24). */
  horasMinimas(): number {
    return this.cuenta()?.horasMinimasCancelacion ?? 24;
  }

  /** true si el turno todavía puede reprogramarse/cancelarse online. */
  puedeGestionar(turno: Appointment): boolean {
    const [y, m, d] = turno.date.split('-').map(Number);
    const [hh, mm] = turno.time.split(':').map(Number);
    const inicio = new Date(y, m - 1, d, hh, mm).getTime();
    return inicio - Date.now() >= this.horasMinimas() * 60 * 60 * 1000;
  }

  nombreProfesionalDe(turno: Appointment): string {
    return this.profesionales().find(p => p.id === turno.profesionalId)?.nombre ?? '';
  }

  esConsultorio(): boolean {
    return this.cuenta()?.tipo === 'consultorio';
  }

  // ---- Reprogramación ----
  abrirReprogramacion(turno: Appointment): void {
    if (!this.puedeGestionar(turno)) return;
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
    if (!this.puedeGestionar(turno)) return;
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
