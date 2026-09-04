import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AdminService } from '../../services/admin.service';
import { todayLocal } from '../../../core/date-utils';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  host: { class: 'block xl:h-full' },
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  adminService = inject(AdminService);

  todayDateString = todayLocal();
  todayFormatted = this.formatToday(new Date());

  saludo = computed(() => {
    if (this.adminService.esConsultorio() && this.adminService.seleccionId() === 'ALL') {
      return `Así viene el día en ${this.adminService.cuenta()?.nombre ?? 'tu consultorio'}.`;
    }
    const nombre = this.adminService.profile()?.nombre ?? '';
    const corto = nombre.split(' ').slice(0, 2).join(' ');
    return corto ? `Este es el resumen de ${corto}.` : 'Este es el resumen de tu consultorio.';
  });

  todayAppts = computed(() =>
    this.adminService.turnosVisibles()
      .filter(a => a.date === this.todayDateString)
      .sort((a, b) => a.time.localeCompare(b.time))
  );

  todayApptsCount = computed(() => this.todayAppts().length);
  pendingCount = computed(() => this.adminService.turnosVisibles().filter(a => a.status === 'PENDING').length);
  totalReservationsCount = computed(() => this.adminService.turnosVisibles().filter(a => a.status !== 'CANCELLED').length);
  uniquePatientsCount = computed(() => this.adminService.patients().length);

  statCards = computed(() => [
    {
      label: 'Turnos de Hoy',
      value: this.todayApptsCount(),
      chipClass: 'bg-teal-100 text-teal-700',
      icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
    },
    {
      label: 'Por Confirmar',
      value: this.pendingCount(),
      chipClass: 'bg-amber-100 text-amber-700',
      icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
    },
    {
      label: 'Pacientes',
      value: this.uniquePatientsCount(),
      chipClass: 'bg-blue-100 text-blue-700',
      icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z'
    },
    {
      label: 'Reservas Activas',
      value: this.totalReservationsCount(),
      chipClass: 'bg-purple-100 text-purple-700',
      icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z'
    }
  ]);

  statusLabel(status: string): string {
    return status === 'CONFIRMED' ? 'Confirmado' : status === 'PENDING' ? 'Pendiente' : 'Cancelado';
  }

  private formatToday(d: Date): string {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${days[d.getDay()]} ${d.getDate()} de ${months[d.getMonth()]}`;
  }

  changeStatus(id: string, status: 'CONFIRMED' | 'CANCELLED') {
    this.adminService.updateAppointmentStatus(id, status);
  }
}
