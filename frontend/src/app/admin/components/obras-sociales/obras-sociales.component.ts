import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminProfile } from '../../services/admin.service';
import { ObrasSocialesService } from '../../services/obras-sociales.service';
import { AuthService } from '../../../core/auth.service';
import { ObraSocial } from '../../../core/models';

/**
 * Obras sociales de la cuenta (administrador) y cuáles atiende cada
 * profesional. Un usuario con rol profesional solo edita su propia columna.
 */
@Component({
  selector: 'app-obras-sociales',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './obras-sociales.component.html',
  styleUrl: './obras-sociales.component.scss'
})
export class ObrasSocialesComponent {
  adminService = inject(AdminService);
  os = inject(ObrasSocialesService);
  private auth = inject(AuthService);

  nueva = signal('');
  error = signal('');
  toast = signal('');
  /** Id de la obra social recién creada: se resalta para que el usuario marque si la atiende. */
  recienCreada = signal<string | null>(null);

  esAdministrador = this.auth.esAdministrador;

  /** Columnas de la grilla: todo el equipo (administrador) o solo el propio profesional. */
  columnas = computed<AdminProfile[]>(() => {
    const propio = this.auth.profesionalAtado();
    if (propio) return this.adminService.professionals().filter(p => p.id === propio);
    return this.adminService.profesionalesActivos();
  });

  /** Filas: activas primero; las inactivas se muestran al administrador para que pueda reactivarlas. */
  filas = computed<ObraSocial[]>(() => this.esAdministrador() ? this.os.ordenadas() : this.os.activas());

  etiquetaCuenta = computed(() => this.adminService.esConsultorio() ? 'el centro' : 'tu consultorio');

  iniciales(nombre: string): string {
    const partes = nombre.split(' ').filter(p => p && !p.endsWith('.'));
    return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase();
  }

  private mostrarToast(msg: string) {
    this.toast.set(msg);
    setTimeout(() => { if (this.toast() === msg) this.toast.set(''); }, 3000);
  }

  async agregar(nombre = this.nueva()) {
    this.error.set('');
    const limpio = nombre.trim().replace(/\s+/g, ' ');
    const inactiva = this.os.ordenadas().find(o => o.activo === false && o.nombre.trim().toLowerCase() === limpio.toLowerCase());
    if (inactiva && !this.esAdministrador()) {
      this.error.set(`${inactiva.nombre} ya existe pero está desactivada en ${this.etiquetaCuenta()}. Pedile al administrador que la active.`);
      return;
    }
    const err = await this.os.agregar(limpio);
    if (err) { this.error.set(err); return; }
    this.nueva.set('');
    const creada = this.os.ordenadas().find(o => o.nombre.trim().toLowerCase() === limpio.toLowerCase());
    if (creada) {
      this.recienCreada.set(creada.id);
      setTimeout(() => { if (this.recienCreada() === creada.id) this.recienCreada.set(null); }, 6000);
    }
    this.mostrarToast(this.columnas().length > 1
      ? `${limpio} agregada. Marcá qué profesionales la atienden.`
      : `${limpio} creada. Marcá la casilla si la atendés.`);
  }

  async alternarActiva(o: ObraSocial) {
    if (await this.os.setActivo(o, o.activo === false)) {
      this.mostrarToast(o.activo === false ? `${o.nombre} vuelve a ofrecerse a los pacientes.` : `${o.nombre} ya no se ofrece a los pacientes.`);
    }
  }

  async eliminar(o: ObraSocial) {
    this.error.set('');
    const err = await this.os.eliminar(o);
    if (err) this.error.set(`${o.nombre}: ${err}`);
    else this.mostrarToast(`${o.nombre} eliminada.`);
  }

  async alternar(p: AdminProfile, o: ObraSocial) {
    if (this.recienCreada() === o.id) this.recienCreada.set(null);
    await this.os.toggleAtiende(p, o.id);
  }

  async alternarParticular(p: AdminProfile) {
    await this.os.toggleParticular(p);
  }
}
