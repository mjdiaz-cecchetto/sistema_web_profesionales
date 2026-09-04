import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService, AdminProfile } from '../../services/admin.service';
import { todayLocal } from '../../../core/date-utils';

/**
 * Gestión del equipo del consultorio: datos del centro,
 * listado de profesionales, alta y activación/desactivación.
 * Con un solo profesional activo, el sistema funciona como cuenta individual.
 */
@Component({
  selector: 'app-profesionales',
  standalone: true,
  imports: [CommonModule, FormsModule],
  host: { class: 'block xl:h-full' },
  templateUrl: './profesionales.component.html',
  styleUrl: './profesionales.component.scss'
})
export class ProfesionalesComponent {
  adminService = inject(AdminService);
  private router = inject(Router);

  consNombre = signal('');
  consDescripcion = signal('');
  private consInicializado = false;

  modalAbierto = signal(false);
  altaNombre = signal('');
  altaEspecialidad = signal('');
  altaTitulo = signal('');
  altaWhatsapp = signal('');
  mostrarErrores = signal(false);
  guardando = signal(false);
  toastMensaje = signal('');

  constructor() {
    // Copia editable de los datos del consultorio cuando llegan de la API.
    effect(() => {
      const c = this.adminService.cuenta();
      if (c && !this.consInicializado) {
        this.consInicializado = true;
        this.consNombre.set(c.nombre);
        this.consDescripcion.set(c.descripcion);
      }
    });
  }

  iniciales(nombre: string): string {
    const partes = nombre.split(' ').filter(Boolean);
    if (partes.length >= 2) return (partes[0][0] + partes[1][0]).toUpperCase();
    return nombre.slice(0, 2).toUpperCase();
  }

  serviciosDe(profId: string): number {
    return this.adminService.serviciosDe(profId).filter(s => s.activo !== false).length;
  }

  turnosProximosDe(profId: string): number {
    const hoy = todayLocal();
    return this.adminService.appointments()
      .filter(a => a.profesionalId === profId && a.status !== 'CANCELLED' && a.date >= hoy).length;
  }

  async guardarConsultorio() {
    const ok = await this.adminService.updateCuenta({
      nombre: this.consNombre().trim() || 'Mi Consultorio',
      descripcion: this.consDescripcion().trim()
    });
    if (ok) this.mostrarToast('Datos del consultorio actualizados.');
  }

  /** Especialidades ya usadas en la cuenta, para sugerirlas en el alta. */
  especialidadesExistentes(): string[] {
    return Array.from(new Set(this.adminService.professionals().map(p => p.especialidad).filter(Boolean))).sort();
  }

  abrirAlta() {
    this.altaNombre.set('');
    this.altaEspecialidad.set('');
    this.altaTitulo.set('');
    this.altaWhatsapp.set('');
    this.mostrarErrores.set(false);
    this.toastMensaje.set('');
    this.modalAbierto.set(true);
  }

  async crearProfesional() {
    if (this.guardando()) return;
    if (!this.altaNombre().trim() || !this.altaTitulo().trim() || !this.altaEspecialidad().trim()) {
      this.mostrarErrores.set(true);
      return;
    }
    this.guardando.set(true);
    const creado = await this.adminService.addProfessional({
      nombre: this.altaNombre().trim(),
      especialidad: this.altaEspecialidad().trim(),
      titulo: this.altaTitulo().trim(),
      whatsapp: this.altaWhatsapp().trim() || undefined
    });
    this.guardando.set(false);
    if (creado) {
      this.modalAbierto.set(false);
      this.mostrarToast(`${creado.nombre} se sumó al equipo. Completá su perfil, horarios y servicios.`);
    }
  }

  async toggleActivo(p: AdminProfile) {
    const nuevoEstado = !(p.activo !== false);
    const ok = await this.adminService.updateProfessional(p.id, { activo: nuevoEstado });
    if (ok) {
      this.mostrarToast(nuevoEstado
        ? `${p.nombre} está activo nuevamente.`
        : `${p.nombre} quedó inactivo: no recibe turnos nuevos ni aparece para pacientes.`);
    }
  }

  irA(profId: string, ruta: string) {
    this.adminService.seleccionId.set(profId);
    this.router.navigate([ruta]);
  }

  private mostrarToast(mensaje: string) {
    this.toastMensaje.set(mensaje);
    setTimeout(() => this.toastMensaje.set(''), 5000);
  }
}
