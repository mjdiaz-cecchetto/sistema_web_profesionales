import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ClientService } from '../../services/client.service';
import { Service, TimeSlot, Appointment } from '../../interfaces/client.models';

@Component({
  selector: 'app-asistente-turnos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './asistente-turnos.component.html',
  styleUrl: './asistente-turnos.component.scss'
})
export class AsistenteTurnosComponent implements OnInit {
  
  // State Signals
  pasoActual = signal<number>(1);
  cargando = signal<boolean>(true);
  enviando = signal<boolean>(false);
  
  // Data Signals
  servicios = signal<Service[]>([]);
  turnos = signal<TimeSlot[]>([]);
  obrasSociales = signal<string[]>([]);
  
  // Selection Signals
  servicioSeleccionado = signal<Service | null>(null);
  fechaSeleccionada = signal<string | null>(null);
  turnoSeleccionado = signal<TimeSlot | null>(null);
  
  // Calendar State
  mesActual = signal<number>(new Date().getMonth());
  anioActual = signal<number>(new Date().getFullYear());
  
  // Form
  formularioPaciente: FormGroup;

  // Computed Values
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
    
    // Relleno inicial
    for (let i = 0; i < diaSemanaInicio; i++) {
      dias.push({ date: null, num: null, available: false });
    }
    
    // Dias del mes
    const disponibles = this.fechasUnicas();
    for (let i = 1; i <= totalDias; i++) {
      // Formateamos mes y día a 2 dígitos respetando timezone local
      const mesStr = String(mes + 1).padStart(2, '0');
      const diaStr = String(i).padStart(2, '0');
      const fechaStr = `${anio}-${mesStr}-${diaStr}`;
      
      const isAvailable = disponibles.includes(fechaStr);
      
      // Mock: Marcar explícitamente un par de días hábiles como "ocupados" (rojos)
      const dayOfWeek = new Date(anio, mes, i).getDay();
      const isWeekday = dayOfWeek !== 0 && dayOfWeek !== 6;
      // Por ejemplo, el día 10, 15 o 22 si son hábiles y no tienen turnos
      const isFullyBooked = !isAvailable && isWeekday && (i === 12 || i === 15 || i === 22);

      dias.push({
        date: fechaStr,
        num: i,
        available: isAvailable,
        isFullyBooked: isFullyBooked
      });
    }
    return dias;
  });

  cambiarMes(delta: number) {
    let m = this.mesActual() + delta;
    let y = this.anioActual();
    if (m > 11) { m = 0; y++; }
    if (m < 0) { m = 11; y--; }
    this.mesActual.set(m);
    this.anioActual.set(y);
  }

  constructor(
    private clientService: ClientService,
    private fb: FormBuilder,
    private router: Router
  ) {
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

  private cargarDatosIniciales() {
    this.cargando.set(true);
    
    // Cargar servicios
    this.clientService.getServices().subscribe({
      next: (datos) => {
        this.servicios.set(datos);
        // Cuando terminan los servicios, cargamos las obras sociales
        this.clientService.getHealthInsurances().subscribe(obras => {
          this.obrasSociales.set(obras);
          this.cargando.set(false);
        });
      },
      error: () => this.cargando.set(false)
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
      // Volver a inicio
      this.router.navigate(['/client']);
    }
  }

  private cargarTurnos() {
    this.cargando.set(true);
    // Simular carga de horarios para el servicio seleccionado
    this.clientService.getAvailableTimeSlots(this.servicioSeleccionado()!.id).subscribe({
      next: (turnosDisponibles) => {
        this.turnos.set(turnosDisponibles);
        // Inicializar mes/año del calendario al primer turno disponible
        if (turnosDisponibles.length > 0) {
          const firstDate = new Date(this.fechasUnicas()[0] + 'T00:00:00');
          this.mesActual.set(firstDate.getMonth());
          this.anioActual.set(firstDate.getFullYear());
          this.fechaSeleccionada.set(this.fechasUnicas()[0]);
        }
        this.cargando.set(false);
        this.pasoActual.set(2);
      },
      error: () => this.cargando.set(false)
    });
  }

  confirmarReserva() {
    if (this.formularioPaciente.invalid) return;
    
    this.enviando.set(true);
    
    const datosReserva: Appointment = {
      serviceId: this.servicioSeleccionado()!.id,
      professionalId: 'prof-1', // Idealmente viene de contexto o ruta
      date: this.turnoSeleccionado()!.date,
      time: this.turnoSeleccionado()!.startTime,
      patientData: this.formularioPaciente.value,
      status: 'PENDING'
    };

    this.clientService.createAppointment(datosReserva).subscribe({
      next: (res) => {
        this.enviando.set(false);
        this.pasoActual.set(4);
      },
      error: () => {
        this.enviando.set(false);
      }
    });
  }

  reiniciarTurnero() {
    this.pasoActual.set(1);
    this.servicioSeleccionado.set(null);
    this.fechaSeleccionada.set(null);
    this.turnoSeleccionado.set(null);
    this.formularioPaciente.reset();
  }

  obtenerNombreDia(fechaStr: string): string {
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const d = new Date(fechaStr + 'T00:00:00');
    return dias[d.getDay()];
  }

  obtenerNumeroDia(fechaStr: string): string {
    return fechaStr.split('-')[2];
  }
}
