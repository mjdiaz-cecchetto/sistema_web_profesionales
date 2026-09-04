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
  templateUrl: './profesional-picker.component.html',
  styleUrl: './profesional-picker.component.scss'
})
export class ProfesionalPickerComponent {
  adminService = inject(AdminService);

  iniciales(nombre: string): string {
    const partes = nombre.split(' ').filter(Boolean);
    if (partes.length >= 2) return (partes[0][0] + partes[1][0]).toUpperCase();
    return nombre.slice(0, 2).toUpperCase();
  }
}
