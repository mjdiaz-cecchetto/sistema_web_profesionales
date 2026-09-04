import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminAppointment } from '../../services/admin.service';
import { AgendaTabsComponent } from '../agenda-tabs/agenda-tabs.component';
import { TurnoModalComponent } from '../turno-modal/turno-modal.component';
import { todayLocal } from '../../../core/date-utils';
import { linkWhatsapp } from '../../../core/whatsapp';

interface CeldaDia {
  date: string | null;
  dayNum: number | null;
  isToday: boolean;
  isSelected: boolean;
  confirmed: number;
  pending: number;
  cancelled: number;
  total: number;
}

type FiltroEstado = 'ALL' | 'CONFIRMED' | 'PENDING' | 'CANCELLED';

@Component({
  selector: 'app-agenda-calendario',
  standalone: true,
  imports: [CommonModule, FormsModule, AgendaTabsComponent, TurnoModalComponent],
  host: { class: 'block xl:h-full' },
  templateUrl: './agenda-calendario.component.html',
  styleUrl: './agenda-calendario.component.scss'
})
export class AgendaCalendarioComponent {
  adminService = inject(AdminService);

  mesActual = signal<number>(new Date().getMonth());
  anioActual = signal<number>(new Date().getFullYear());
  diaSeleccionado = signal<string | null>(todayLocal());
  filtroEstado = signal<FiltroEstado>('ALL');

  // Filtro del panel del día
  filtroDiaAbierto = signal(false);
  busquedaDia = signal('');

  // Modal Nuevo Turno / Edición
  modalAbierto = signal(false);
  fechaParaModal = signal<string | null>(null);
  turnoEnEdicion = signal<AdminAppointment | null>(null);
  toastMensaje = signal('');

  readonly diaHoyNum = new Date().getDate();

  filtrosEstado: { label: string; value: FiltroEstado; dotClass: string; activeClass: string }[] = [
    { label: 'Todos', value: 'ALL', dotClass: '', activeClass: 'bg-teal-100 text-teal-900 border-teal-200' },
    { label: 'Confirmados', value: 'CONFIRMED', dotClass: 'bg-emerald-400', activeClass: 'bg-emerald-100 text-emerald-900 border-emerald-200' },
    { label: 'Pendientes', value: 'PENDING', dotClass: 'bg-amber-400', activeClass: 'bg-amber-100 text-amber-900 border-amber-200' },
    { label: 'Cancelados', value: 'CANCELLED', dotClass: 'bg-rose-400', activeClass: 'bg-rose-100 text-rose-800 border-rose-200' }
  ];

  monthName = computed(() => {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${meses[this.mesActual()]} ${this.anioActual()}`;
  });

  esMesActual = computed(() => {
    const hoy = new Date();
    return this.mesActual() === hoy.getMonth() && this.anioActual() === hoy.getFullYear();
  });

  private turnosFiltrados = computed(() => {
    const filtro = this.filtroEstado();
    const list = this.adminService.turnosVisibles();
    return filtro === 'ALL' ? list : list.filter(a => a.status === filtro);
  });

  contadorPorEstado = computed(() => {
    const list = this.adminService.turnosVisibles();
    return {
      ALL: list.length,
      CONFIRMED: list.filter(a => a.status === 'CONFIRMED').length,
      PENDING: list.filter(a => a.status === 'PENDING').length,
      CANCELLED: list.filter(a => a.status === 'CANCELLED').length
    };
  });

  private turnosPorFecha = computed(() => {
    const map = new Map<string, AdminAppointment[]>();
    for (const a of this.turnosFiltrados()) {
      const arr = map.get(a.date) ?? [];
      arr.push(a);
      map.set(a.date, arr);
    }
    return map;
  });

  calendarCells = computed<CeldaDia[]>(() => {
    const mes = this.mesActual();
    const anio = this.anioActual();
    const seleccionado = this.diaSeleccionado();
    const porFecha = this.turnosPorFecha();

    const primerDia = new Date(anio, mes, 1);
    const totalDias = new Date(anio, mes + 1, 0).getDate();

    let diaSemanaInicio = primerDia.getDay() - 1;
    if (diaSemanaInicio < 0) diaSemanaInicio = 6;

    const cells: CeldaDia[] = [];
    for (let i = 0; i < diaSemanaInicio; i++) {
      cells.push({ date: null, dayNum: null, isToday: false, isSelected: false, confirmed: 0, pending: 0, cancelled: 0, total: 0 });
    }

    const todayStr = todayLocal();

    for (let i = 1; i <= totalDias; i++) {
      const fechaStr = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const turnos = porFecha.get(fechaStr) ?? [];

      cells.push({
        date: fechaStr,
        dayNum: i,
        isToday: fechaStr === todayStr,
        isSelected: fechaStr === seleccionado,
        confirmed: turnos.filter(t => t.status === 'CONFIRMED').length,
        pending: turnos.filter(t => t.status === 'PENDING').length,
        cancelled: turnos.filter(t => t.status === 'CANCELLED').length,
        total: turnos.length
      });
    }

    return cells;
  });

  turnosDelDia = computed(() => {
    const dia = this.diaSeleccionado();
    if (!dia) return [];
    const q = this.busquedaDia().toLowerCase().trim();
    return (this.turnosPorFecha().get(dia) ?? [])
      .filter(a => !q || a.patientName.toLowerCase().includes(q) || a.patientDni.toLowerCase().includes(q))
      .slice()
      .sort((a, b) => a.time.localeCompare(b.time));
  });

  tituloDia = computed(() => {
    const dia = this.diaSeleccionado();
    if (!dia) return 'Turnos del día';
    const [y, m, d] = dia.split('-').map(Number);
    const fecha = new Date(y, m - 1, d);
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${dias[fecha.getDay()]} ${d} de ${meses[m - 1]}`;
  });

  changeMonth(delta: number) {
    let m = this.mesActual() + delta;
    let y = this.anioActual();
    if (m > 11) { m = 0; y++; }
    if (m < 0) { m = 11; y--; }
    this.mesActual.set(m);
    this.anioActual.set(y);
  }

  irAHoy() {
    const hoy = new Date();
    this.mesActual.set(hoy.getMonth());
    this.anioActual.set(hoy.getFullYear());
    this.diaSeleccionado.set(todayLocal());
  }

  seleccionarDia(fecha: string) {
    this.diaSeleccionado.set(fecha);
  }

  setFiltro(f: FiltroEstado) {
    this.filtroEstado.set(f);
  }

  toggleFiltroDia() {
    const abierto = !this.filtroDiaAbierto();
    this.filtroDiaAbierto.set(abierto);
    if (!abierto) this.busquedaDia.set('');
  }

  abrirModal(fecha: string | null = null) {
    this.turnoEnEdicion.set(null);
    this.fechaParaModal.set(fecha ?? this.diaSeleccionado() ?? todayLocal());
    this.toastMensaje.set('');
    this.modalAbierto.set(true);
  }

  abrirEdicion(turno: AdminAppointment) {
    this.fechaParaModal.set(null);
    this.turnoEnEdicion.set(turno);
    this.toastMensaje.set('');
    this.modalAbierto.set(true);
  }

  cerrarModal() {
    this.modalAbierto.set(false);
    this.turnoEnEdicion.set(null);
  }

  onTurnosCreados(cantidad: number) {
    this.cerrarModal();
    this.mostrarToast(cantidad === 1 ? 'Turno creado con éxito.' : `Se crearon ${cantidad} turnos de la serie con éxito.`);
  }

  onTurnoActualizado() {
    this.cerrarModal();
    this.mostrarToast('Turno actualizado con éxito.');
  }

  private mostrarToast(mensaje: string) {
    this.toastMensaje.set(mensaje);
    setTimeout(() => this.toastMensaje.set(''), 5000);
  }

  statusLabel(status: string): string {
    return status === 'CONFIRMED' ? 'Confirmado' : status === 'PENDING' ? 'Pendiente' : 'Cancelado';
  }

  changeStatus(id: string, status: 'CONFIRMED' | 'CANCELLED') {
    this.adminService.updateAppointmentStatus(id, status);
  }

  /** Link wa.me al paciente con la confirmación/recordatorio del turno pre-escrito. */
  linkWhatsappTurno(appt: AdminAppointment): string {
    const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const [y, m, d] = appt.date.split('-').map(Number);
    const dia = dias[new Date(y, m - 1, d).getDay()];
    const fecha = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
    const profesional = this.adminService.nombreDe(appt.profesionalId);
    const estado = appt.status === 'CONFIRMED' ? 'Te confirmo' : 'Te recuerdo';
    const mensaje = `Hola ${appt.patientName}! ${estado} tu turno de ${appt.serviceName} el ${dia} ${fecha} a las ${appt.time} hs en ${appt.location}. Cualquier cambio avisame por acá. ${profesional}`;
    return linkWhatsapp(appt.patientPhone, mensaje);
  }
}
