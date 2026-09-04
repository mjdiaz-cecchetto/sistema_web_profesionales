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
  templateUrl: './turno-modal.component.html',
  styleUrl: './turno-modal.component.scss'
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
