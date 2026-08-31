import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ClientService } from '../../services/client.service';
import { Service, TimeSlot, BookingRequest } from '../../interfaces/client.models';
import { linkWhatsapp } from '../../../core/whatsapp';
import { formatDMY, parseLocalDate } from '../../../core/date-utils';

@Component({
  selector: 'app-asistente-turnos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './asistente-turnos.component.html',
  styleUrl: './asistente-turnos.component.scss'
})
export class AsistenteTurnosComponent implements OnInit {
  private clientService = inject(ClientService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  // State Signals
  pasoActual = signal<number>(1);
  cargando = signal<boolean>(true);
  enviando = signal<boolean>(false);
  errorCarga = signal<boolean>(false);

  // Data Signals
  servicios = signal<Service[]>([]);
  turnos = signal<TimeSlot[]>([]);
  diasOcupados = signal<string[]>([]);
  obrasSociales = signal<string[]>([]);
  nombreProfesional = signal<string>('');
  whatsappProfesional = signal<string>('');

  // Selection Signals
  servicioSeleccionado = signal<Service | null>(null);
  fechaSeleccionada = signal<string | null>(null);
  turnoSeleccionado = signal<TimeSlot | null>(null);

  // Calendar State
  mesActual = signal<number>(new Date().getMonth());
  anioActual = signal<number>(new Date().getFullYear());

  // Form
  formularioPaciente: FormGroup;

  // Computed
  fechasUnicas = computed(() => {
    const fechas = this.turnos().map(t => t.date);
    return [...new Set(fechas)].sort();
  });

  turnosDisponiblesParaFecha = computed(() => {
    const fecha = this.fechaSeleccionada();
    if (!fecha) return [];
    return this.turnos().filter(t => t.date === fecha);
  });

  nombreMesActual = computed(() => {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${meses[this.mesActual()]} ${this.anioActual()}`;
  });

  diasCalendario = computed(() => {
    const mes = this.mesActual();
    const anio = this.anioActual();

    const primerDia = new Date(anio, mes, 1);
    const ultimoDia = new Date(anio, mes + 1, 0);

    const totalDias = ultimoDia.getDate();
    const diaSemanaInicio = primerDia.getDay(); // 0 (Dom) a 6 (Sab)

    const dias: { date: string | null, num: number | null, available: boolean, isFullyBooked?: boolean }[] = [];

    for (let i = 0; i < diaSemanaInicio; i++) {
      dias.push({ date: null, num: null, available: false });
    }

    const disponibles = this.fechasUnicas();
    const ocupados = this.diasOcupados();

    for (let i = 1; i <= totalDias; i++) {
      const mesStr = String(mes + 1).padStart(2, '0');
      const diaStr = String(i).padStart(2, '0');
      const fechaStr = `${anio}-${mesStr}-${diaStr}`;

      dias.push({
        date: fechaStr,
        num: i,
        available: disponibles.includes(fechaStr),
        // Días laborables realmente completos (calculado desde la API, no hardcodeado)
        isFullyBooked: ocupados.includes(fechaStr)
      });
    }
    return dias;
  });

  constructor() {
    this.formularioPaciente = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2), Validators.pattern('^[a-zA-ZÀ-ÿ\\u00f1\\u00d1\\s]+$')]],
      lastName: ['', [Validators.required, Validators.minLength(2), Validators.pattern('^[a-zA-ZÀ-ÿ\\u00f1\\u00d1\\s]+$')]],
      dni: ['', [Validators.required, Validators.pattern('^[0-9]{7,9}$')]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern('^[0-9]{8,15}$')]],
      healthInsurance: ['', Validators.required],
      isFirstVisit: [true],
      age: ['', [Validators.required, Validators.min(0), Validators.max(120)]],
      sex: ['', Validators.required],
      notes: ['']
    });
  }

  ngOnInit(): void {
    this.cargarDatosIniciales();
  }

  cambiarMes(delta: number) {
    let m = this.mesActual() + delta;
    let y = this.anioActual();
    if (m > 11) { m = 0; y++; }
    if (m < 0) { m = 11; y--; }
    this.mesActual.set(m);
    this.anioActual.set(y);
  }

  private cargarDatosIniciales() {
    this.cargando.set(true);
    this.errorCarga.set(false);

    this.clientService.getServices().subscribe({
      next: (datos) => {
        this.servicios.set(datos);
        this.clientService.getHealthInsurances().subscribe({
          next: obras => {
            this.obrasSociales.set(obras);
            this.cargando.set(false);
          },
          error: () => { this.errorCarga.set(true); this.cargando.set(false); }
        });
      },
      error: () => { this.errorCarga.set(true); this.cargando.set(false); }
    });

    this.clientService.getProfessionalInfo().subscribe({
      next: prof => {
        this.nombreProfesional.set(prof.name);
        this.whatsappProfesional.set(prof.whatsapp);
      }
    });
  }

  seleccionarServicio(servicio: Service) {
    this.servicioSeleccionado.set(servicio);
  }

  seleccionarTurno(turno: TimeSlot) {
    this.turnoSeleccionado.set(turno);
  }

  pasoSiguiente() {
    const paso = this.pasoActual();

    if (paso === 1 && this.servicioSeleccionado()) {
      this.cargarTurnos();
    } else if (paso === 2 && this.turnoSeleccionado()) {
      this.pasoActual.set(3);
    }
  }

  pasoAnterior() {
    if (this.pasoActual() > 1) {
      this.pasoActual.set(this.pasoActual() - 1);
    } else {
      this.router.navigate(['/client']);
    }
  }

  private cargarTurnos() {
    this.cargando.set(true);
    this.clientService.getBookingCalendar(this.servicioSeleccionado()!.id).subscribe({
      next: ({ slots, fullyBookedDates }) => {
        this.turnos.set(slots);
        this.diasOcupados.set(fullyBookedDates);

        if (slots.length > 0) {
          const primera = this.fechasUnicas()[0];
          const [y, m] = primera.split('-').map(Number);
          this.mesActual.set(m - 1);
          this.anioActual.set(y);
          this.fechaSeleccionada.set(primera);
        }
        this.cargando.set(false);
        this.pasoActual.set(2);
      },
      error: () => { this.errorCarga.set(true); this.cargando.set(false); }
    });
  }

  confirmarReserva() {
    if (this.formularioPaciente.invalid) return;

    this.enviando.set(true);

    const reserva: BookingRequest = {
      serviceId: this.servicioSeleccionado()!.id,
      professionalId: 'prof-1',
      date: this.turnoSeleccionado()!.date,
      time: this.turnoSeleccionado()!.startTime,
      patientData: this.formularioPaciente.value
    };

    this.clientService.createAppointment(reserva).subscribe({
      next: () => {
        this.enviando.set(false);
        this.pasoActual.set(4);
      },
      error: () => {
        this.enviando.set(false);
        this.errorCarga.set(true);
      }
    });
  }

  reiniciarTurnero() {
    this.pasoActual.set(1);
    this.servicioSeleccionado.set(null);
    this.fechaSeleccionada.set(null);
    this.turnoSeleccionado.set(null);
    this.formularioPaciente.reset({ isFirstVisit: true });
  }

  /** Link de WhatsApp con el comprobante de la reserva, dirigido al profesional. */
  linkComprobanteWhatsapp(): string {
    const turno = this.turnoSeleccionado();
    const servicio = this.servicioSeleccionado();
    const f = this.formularioPaciente.value;
    if (!turno || !servicio || !this.whatsappProfesional()) return '';

    const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const dia = dias[parseLocalDate(turno.date).getDay()];
    const mensaje = `Hola! Soy ${f.firstName} ${f.lastName} (DNI ${f.dni}). ` +
      `Acabo de reservar un turno de ${servicio.name} para el ${dia} ${formatDMY(turno.date)} a las ${turno.startTime} hs. ` +
      `Te dejo mi comprobante por acá. ¡Gracias!`;
    return linkWhatsapp(this.whatsappProfesional(), mensaje);
  }

  obtenerNombreDia(fechaStr: string): string {
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const [y, m, d] = fechaStr.split('-').map(Number);
    return dias[new Date(y, m - 1, d).getDay()];
  }

  obtenerNumeroDia(fechaStr: string): string {
    return fechaStr.split('-')[2];
  }
}
