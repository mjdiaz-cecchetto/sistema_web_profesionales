import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../services/admin.service';

/**
 * Fila de chips para elegir sobre qué profesional operan las vistas
 * de configuración (Perfil, Servicios, Disponibilidad).
 * Solo se muestra en modo consultorio (más de un profesional activo).
 */
@Component({
  selector: 'app-profesional-picker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="adminService.esConsultorio()" class="flex gap-1.5 overflow-x-auto no-scrollbar snap-x pb-0.5">
      <button *ngFor="let p of adminService.profesionalesActivos()"
              (click)="adminService.seleccionId.set(p.id)"
              [ngClass]="adminService.focoId() === p.id
                ? 'bg-teal-100 text-teal-900 border-teal-300'
                : 'bg-white text-stone-500 border-stone-200 hover:border-teal-300 hover:text-teal-800'"
              class="snap-start shrink-0 flex items-center gap-2 pl-1.5 pr-3.5 py-1.5 rounded-full border text-[11px] font-bold transition-colors">
        <span class="w-6 h-6 rounded-full overflow-hidden bg-teal-200 border border-teal-300 flex items-center justify-center text-[8px] font-extrabold text-teal-900 shrink-0">
          <img *ngIf="p.avatarUrl" [src]="p.avatarUrl" [alt]="p.nombre" class="w-full h-full object-cover">
          <ng-container *ngIf="!p.avatarUrl">{{ iniciales(p.nombre) }}</ng-container>
        </span>
        {{ p.nombre }}
      </button>
    </div>
  `
})
export class ProfesionalPickerComponent {
  adminService = inject(AdminService);

  iniciales(nombre: string): string {
    const partes = nombre.split(' ').filter(Boolean);
    if (partes.length >= 2) return (partes[0][0] + partes[1][0]).toUpperCase();
    return nombre.slice(0, 2).toUpperCase();
  }
}
