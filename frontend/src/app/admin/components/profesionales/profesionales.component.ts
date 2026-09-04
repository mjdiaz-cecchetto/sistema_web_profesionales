import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService, AdminProfile, Especialidad } from '../../services/admin.service';
import { todayLocal } from '../../../core/date-utils';

/** Grupo del equipo: una especialidad con sus profesionales. */
interface GrupoEquipo {
  nombre: string;
  especialidad: Especialidad | null; // null = "Sin especialidad"
  profesionales: AdminProfile[];
}

/**
 * Gestión del equipo del consultorio: datos del centro, catálogo de
 * ESPECIALIDADES (alta, renombrar, activar/desactivar, eliminar) y
 * profesionales agrupados por especialidad. El alta de profesionales
 * elige una especialidad ya cargada.
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
  consHorasMinimas = signal(24);
  private consInicializado = false;

  // ---- Alta de profesional ----
  modalAbierto = signal(false);
  altaNombre = signal('');
  altaEspecialidad = signal('');
  altaTitulo = signal('');
  altaWhatsapp = signal('');
  mostrarErrores = signal(false);
  guardando = signal(false);
  toastMensaje = signal('');

  // ---- Administración de especialidades ----
  panelEspecialidades = signal(false);
  nuevaEspecialidad = signal('');
  errorEspecialidad = signal('');
  /** Especialidad en edición (id) y su nombre temporal. */
  editandoEspId = signal<string | null>(null);
  editandoEspNombre = signal('');

  constructor() {
    // Copia editable de los datos del consultorio cuando llegan de la API.
    effect(() => {
      const c = this.adminService.cuenta();
      if (c && !this.consInicializado) {
        this.consInicializado = true;
        this.consNombre.set(c.nombre);
        this.consDescripcion.set(c.descripcion);
        this.consHorasMinimas.set(c.horasMinimasCancelacion ?? 24);
      }
    });
  }

  // ===== Equipo agrupado por especialidad =====

  /**
   * Grupos para la vista: cada especialidad del catálogo con sus
   * profesionales (aunque esté vacía), y al final "Sin especialidad"
   * si quedó algún profesional con una especialidad fuera del catálogo.
   */
  grupos = computed<GrupoEquipo[]>(() => {
    const profesionales = this.adminService.professionals();
    const catalogo = this.adminService.especialidadesOrdenadas();

    const grupos: GrupoEquipo[] = catalogo.map(e => ({
      nombre: e.nombre,
      especialidad: e,
      profesionales: profesionales
        .filter(p => p.especialidad === e.nombre)
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    }));

    const nombresCatalogo = new Set(catalogo.map(e => e.nombre));
    const sueltos = profesionales
      .filter(p => !p.especialidad || !nombresCatalogo.has(p.especialidad))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    if (sueltos.length > 0) {
      grupos.push({ nombre: 'Sin especialidad', especialidad: null, profesionales: sueltos });
    }
    return grupos;
  });

  activosDe(grupo: GrupoEquipo): number {
    return grupo.profesionales.filter(p => p.activo !== false).length;
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
    const horas = Math.max(0, Math.min(168, Number(this.consHorasMinimas()) || 0));
    this.consHorasMinimas.set(horas);
    const ok = await this.adminService.updateCuenta({
      nombre: this.consNombre().trim() || 'Mi Consultorio',
      descripcion: this.consDescripcion().trim(),
      horasMinimasCancelacion: horas
    });
    if (ok) this.mostrarToast('Datos del consultorio actualizados.');
  }

  // ===== Límite del plan =====

  /** Texto del límite del plan (para el aviso cuando se alcanza). */
  avisoLimitePlan(): string {
    const plan = this.adminService.plan();
    const limite = this.adminService.limiteProfesionales();
    const activos = this.adminService.profesionalesActivos().length;
    return `Tu plan ${plan?.nombre ?? ''} permite hasta ${limite} ${limite === 1 ? 'profesional activo' : 'profesionales activos'} y ya tenés ${activos}. Desactivá uno o consultá por un plan superior.`;
  }

  // ===== Especialidades =====

  async crearEspecialidad() {
    const nombre = this.nuevaEspecialidad().trim();
    this.errorEspecialidad.set('');
    if (!nombre) return;
    const creada = await this.adminService.addEspecialidad(nombre);
    if (creada) {
      this.nuevaEspecialidad.set('');
      this.mostrarToast(`Especialidad "${creada.nombre}" creada. Ya podés asignarle profesionales.`);
    } else {
      this.errorEspecialidad.set(`"${nombre}" ya existe en el catálogo.`);
    }
  }

  empezarEdicion(e: Especialidad) {
    this.errorEspecialidad.set('');
    this.editandoEspId.set(e.id);
    this.editandoEspNombre.set(e.nombre);
  }

  cancelarEdicion() {
    this.editandoEspId.set(null);
    this.editandoEspNombre.set('');
  }

  async confirmarEdicion() {
    const id = this.editandoEspId();
    if (!id) return;
    const nombre = this.editandoEspNombre().trim();
    if (!nombre) return;
    const ok = await this.adminService.renameEspecialidad(id, nombre);
    if (ok) {
      this.cancelarEdicion();
      this.mostrarToast('Especialidad renombrada (se actualizó en todos sus profesionales).');
    } else {
      this.errorEspecialidad.set(`No se pudo renombrar: "${nombre}" ya existe o hubo un error.`);
    }
  }

  async toggleEspecialidad(e: Especialidad) {
    const ok = await this.adminService.toggleEspecialidad(e.id, !(e.activo !== false));
    if (ok) {
      this.mostrarToast(e.activo !== false
        ? `"${e.nombre}" quedó inactiva: no se ofrece para nuevos profesionales.`
        : `"${e.nombre}" está activa nuevamente.`);
    }
  }

  async eliminarEspecialidad(e: Especialidad) {
    if (this.adminService.usoEspecialidad(e.nombre) > 0) return;
    const ok = await this.adminService.deleteEspecialidad(e.id);
    if (ok) this.mostrarToast(`Especialidad "${e.nombre}" eliminada.`);
  }

  usoDe(e: Especialidad): number {
    return this.adminService.usoEspecialidad(e.nombre);
  }

  // ===== Alta de profesional =====

  abrirAlta(especialidad?: string) {
    if (!this.adminService.puedeSumarProfesional()) {
      this.mostrarToast(this.avisoLimitePlan());
      return;
    }
    this.altaNombre.set('');
    this.altaEspecialidad.set(especialidad ?? '');
    this.altaTitulo.set('');
    this.altaWhatsapp.set('');
    this.mostrarErrores.set(false);
    this.toastMensaje.set('');
    this.modalAbierto.set(true);
  }

  /** Abre el panel de especialidades desde el aviso del modal de alta. */
  irACrearEspecialidades() {
    this.modalAbierto.set(false);
    this.panelEspecialidades.set(true);
  }

  async crearProfesional() {
    if (this.guardando()) return;
    if (!this.altaNombre().trim() || !this.altaTitulo().trim() || !this.altaEspecialidad().trim()) {
      this.mostrarErrores.set(true);
      return;
    }
    if (!this.adminService.puedeSumarProfesional()) {
      this.modalAbierto.set(false);
      this.mostrarToast(this.avisoLimitePlan());
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
      this.mostrarToast(`${creado.nombre} se sumó a ${creado.especialidad}. Completá su perfil, horarios y servicios.`);
    }
  }

  async toggleActivo(p: AdminProfile) {
    const nuevoEstado = !(p.activo !== false);
    // Reactivar también cuenta contra el límite del plan.
    if (nuevoEstado && !this.adminService.puedeSumarProfesional()) {
      this.mostrarToast(this.avisoLimitePlan());
      return;
    }
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
