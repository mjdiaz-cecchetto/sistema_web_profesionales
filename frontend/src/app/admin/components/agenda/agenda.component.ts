import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminAppointment } from '../../services/admin.service';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';
import { AgendaTabsComponent } from '../agenda-tabs/agenda-tabs.component';
import { TurnoModalComponent } from '../turno-modal/turno-modal.component';
import { formatDMY, todayLocal, toLocalDateString } from '../../../core/date-utils';
import { linkWhatsapp } from '../../../core/whatsapp';

type RangoRapido = 'TODOS' | 'HOY' | 'SEMANA' | 'MES';

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePickerComponent, AgendaTabsComponent, TurnoModalComponent],
  host: { class: 'block xl:h-full' },
  templateUrl: './agenda.component.html',
  styleUrl: './agenda.component.scss'
})
export class AgendaComponent {
  adminService = inject(AdminService);

  searchQuery = signal('');
  statusFilter = signal('ALL');
  locationFilter = signal('ALL');
  serviceFilter = signal('ALL');
  insuranceFilter = signal('ALL');
  dateFromFilter = signal('');
  dateToFilter = signal('');
  rangoActivo = signal<RangoRapido>('TODOS');

  filtrosAbiertos = signal(false);

  currentPage = signal(1);
  readonly itemsPerPage = 8;

  // Modal Nuevo Turno / Edición
  modalAbierto = signal(false);
  fechaParaModal = signal<string | null>(null);
  turnoEnEdicion = signal<AdminAppointment | null>(null);
  toastMensaje = signal('');

  rangosRapidos: { label: string; value: RangoRapido }[] = [
    { label: 'Todos', value: 'TODOS' },
    { label: 'Hoy', value: 'HOY' },
    { label: 'Semana', value: 'SEMANA' },
    { label: 'Mes', value: 'MES' }
  ];

  locations = computed(() => [...new Set(this.adminService.turnosVisibles().map(a => a.location))].sort());
  services = computed(() => [...new Set(this.adminService.turnosVisibles().map(a => a.serviceName))].sort());
  insurances = computed(() => [...new Set(this.adminService.turnosVisibles().map(a => a.healthInsurance))].sort());

  /** Filtros avanzados activos (los que viven dentro del panel). */
  filtrosAvanzadosCount = computed(() => {
    let n = 0;
    if (this.locationFilter() !== 'ALL') n++;
    if (this.serviceFilter() !== 'ALL') n++;
    if (this.insuranceFilter() !== 'ALL') n++;
    if (this.dateFromFilter()) n++;
    if (this.dateToFilter()) n++;
    return n;
  });

  /** Todos los filtros activos (incluye búsqueda y estado). */
  filtrosActivosCount = computed(() => {
    let n = this.filtrosAvanzadosCount();
    if (this.searchQuery().trim()) n++;
    if (this.statusFilter() !== 'ALL') n++;
    return n;
  });

  filteredAppointments = computed(() => {
    const list = this.adminService.turnosVisibles();
    const query = this.searchQuery().toLowerCase().trim();
    const status = this.statusFilter();
    const location = this.locationFilter();
    const service = this.serviceFilter();
    const insurance = this.insuranceFilter();
    const fromDate = this.dateFromFilter();
    const toDate = this.dateToFilter();

    return list.filter(a => {
      const matchesSearch = !query ||
        a.patientName.toLowerCase().includes(query) ||
        a.patientDni.toLowerCase().includes(query) ||
        a.patientEmail.toLowerCase().includes(query);

      const matchesStatus = status === 'ALL' || a.status === status;
      const matchesLocation = location === 'ALL' || a.location === location;
      const matchesService = service === 'ALL' || a.serviceName === service;
      const matchesInsurance = insurance === 'ALL' || a.healthInsurance === insurance;

      let matchesDate = true;
      if (fromDate) matchesDate = matchesDate && a.date >= fromDate;
      if (toDate) matchesDate = matchesDate && a.date <= toDate;

      return matchesSearch && matchesStatus && matchesLocation && matchesService && matchesInsurance && matchesDate;
    }).sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.time.localeCompare(b.time);
    });
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredAppointments().length / this.itemsPerPage)));

  paginatedAppointments = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    return this.filteredAppointments().slice(start, start + this.itemsPerPage);
  });

  totalItems = computed(() => this.filteredAppointments().length);
  startIndex = computed(() => this.totalItems() === 0 ? 0 : (this.currentPage() - 1) * this.itemsPerPage + 1);
  endIndex = computed(() => Math.min(this.currentPage() * this.itemsPerPage, this.totalItems()));

  setRango(rango: RangoRapido) {
    this.rangoActivo.set(rango);
    const hoy = new Date();

    if (rango === 'TODOS') {
      this.dateFromFilter.set('');
      this.dateToFilter.set('');
    } else if (rango === 'HOY') {
      const t = todayLocal();
      this.dateFromFilter.set(t);
      this.dateToFilter.set(t);
    } else if (rango === 'SEMANA') {
      const dow = hoy.getDay() === 0 ? 7 : hoy.getDay();
      const lunes = new Date(hoy); lunes.setDate(hoy.getDate() - (dow - 1));
      const domingo = new Date(lunes); domingo.setDate(lunes.getDate() + 6);
      this.dateFromFilter.set(toLocalDateString(lunes));
      this.dateToFilter.set(toLocalDateString(domingo));
    } else if (rango === 'MES') {
      const primero = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      const ultimo = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
      this.dateFromFilter.set(toLocalDateString(primero));
      this.dateToFilter.set(toLocalDateString(ultimo));
    }
    this.currentPage.set(1);
  }

  onSearchChange(val: string) { this.searchQuery.set(val); this.currentPage.set(1); }
  onStatusChange(val: string) { this.statusFilter.set(val); this.currentPage.set(1); }
  onLocationChange(val: string) { this.locationFilter.set(val); this.currentPage.set(1); }
  onServiceChange(val: string) { this.serviceFilter.set(val); this.currentPage.set(1); }
  onInsuranceChange(val: string) { this.insuranceFilter.set(val); this.currentPage.set(1); }
  onDateFromChange(val: string) { this.dateFromFilter.set(val); this.rangoActivo.set('TODOS'); this.currentPage.set(1); }
  onDateToChange(val: string) { this.dateToFilter.set(val); this.rangoActivo.set('TODOS'); this.currentPage.set(1); }

  prevPage() { if (this.currentPage() > 1) this.currentPage.update(p => p - 1); }
  nextPage() { if (this.currentPage() < this.totalPages()) this.currentPage.update(p => p + 1); }

  // ---- Modal ----
  abrirModal() {
    this.turnoEnEdicion.set(null);
    this.fechaParaModal.set(todayLocal());
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

  // ---- Helpers ----
  getInitials(name: string): string {
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }

  formatDate = formatDMY;

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


  resetFilters() {
    this.searchQuery.set('');
    this.statusFilter.set('ALL');
    this.locationFilter.set('ALL');
    this.serviceFilter.set('ALL');
    this.insuranceFilter.set('ALL');
    this.dateFromFilter.set('');
    this.dateToFilter.set('');
    this.rangoActivo.set('TODOS');
    this.currentPage.set(1);
  }
}
