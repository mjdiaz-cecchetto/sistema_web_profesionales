import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminProfile } from '../../services/admin.service';
import { BusquedaPersona, EquipoUsuariosService } from '../../services/equipo-usuarios.service';
import { MiembroConUsuario, RolUsuario } from '../../../core/models';

interface OpcionRol {
  valor: RolUsuario;
  etiqueta: string;
  detalle: string;
}

/**
 * Usuarios y accesos de la cuenta (solo administradores; consultorios e
 * independientes). Da de alta PERSONAS con una membresía (rol + profesional
 * que atiende + agendas), o vincula a alguien que ya tiene usuario en la
 * plataforma (multi-centro). La lógica y las reglas viven en
 * EquipoUsuariosService.
 */
@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './usuarios.component.html',
  styleUrl: './usuarios.component.scss'
})
export class UsuariosComponent {
  adminService = inject(AdminService);
  equipo = inject(EquipoUsuariosService);

  readonly roles: OpcionRol[] = [
    { valor: 'administrador', etiqueta: 'Administrador', detalle: 'Todo: equipo, usuarios, configuración, servicios y perfiles.' },
    { valor: 'profesional', etiqueta: 'Profesional', detalle: 'Solo lo suyo: agenda, pacientes que atendió, disponibilidad, perfil e historia clínica.' },
    { valor: 'secretaria', etiqueta: 'Secretaría', detalle: 'Agendas y pacientes (de todo el centro o de los profesionales que elijas).' }
  ];

  toast = signal('');
  error = signal('');

  // ---- Alta ----
  altaAbierta = signal(false);
  dni = signal('');
  busqueda = signal<BusquedaPersona | null>(null);
  buscando = signal(false);
  nombre = signal('');
  email = signal('');
  password = signal('');
  rol = signal<RolUsuario>('secretaria');
  profesionalId = signal<string>('');
  asignados = signal<string[]>([]);

  // ---- Edición inline ----
  editandoId = signal<string | null>(null);
  edRol = signal<RolUsuario>('secretaria');
  edProfesionalId = signal<string>('');
  edAsignados = signal<string[]>([]);
  resetId = signal<string | null>(null);
  resetPassword = signal('');

  /** Con un solo profesional no tiene sentido elegir agendas: la secretaría ve "toda la agenda". */
  hayVariasAgendas = computed(() => this.adminService.profesionalesActivos().length > 1);

  /** La persona del DNI ya existe en la plataforma: se vincula sin pedir sus datos. */
  personaExistente = computed(() => {
    const b = this.busqueda();
    return b?.estado === 'existe' ? b.usuario : null;
  });

  constructor() {
    // Carga al entrar y recarga al cambiar de cuenta (p. ej. "Cambiar de centro").
    effect(() => {
      if (this.adminService.cuenta()?.id) untracked(() => this.equipo.cargar());
    });
  }

  /** Iniciales ignorando títulos abreviados ("Dr.", "Lic."…). */
  iniciales(nombre: string): string {
    const partes = nombre.split(' ').filter(p => p && !p.endsWith('.'));
    return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase();
  }

  etiquetaRol(rol: RolUsuario): string {
    return this.roles.find(r => r.valor === rol)?.etiqueta ?? rol;
  }

  claseRol(rol: RolUsuario): string {
    switch (rol) {
      case 'administrador': return 'bg-teal-100 text-teal-900 border-teal-200';
      case 'profesional': return 'bg-sky-50 text-sky-800 border-sky-200';
      default: return 'bg-violet-50 text-violet-800 border-violet-200';
    }
  }

  nombreProfesional(id: string | null | undefined): string {
    return id ? (this.adminService.nombreDe(id) || '(profesional eliminado)') : '';
  }

  agendasDe(m: MiembroConUsuario): string {
    if (!m.profesionalesAsignados?.length) return this.hayVariasAgendas() ? 'Todo el centro' : 'Toda la agenda';
    return m.profesionalesAsignados.map(id => this.nombreProfesional(id)).join(' · ');
  }

  /** Profesionales que se pueden vincular (sin persona asignada), más el actual del miembro en edición. */
  profesionalesLibres(incluir?: string | null): AdminProfile[] {
    const usados = this.equipo.profesionalesVinculados();
    return this.adminService.profesionalesActivos().filter(p => !usados.has(p.id) || p.id === incluir);
  }

  private mostrarToast(msg: string) {
    this.toast.set(msg);
    setTimeout(() => { if (this.toast() === msg) this.toast.set(''); }, 3500);
  }

  // ===== Alta =====

  abrirAlta() {
    this.altaAbierta.set(true);
    this.editandoId.set(null);
    this.resetId.set(null);
    this.dni.set(''); this.nombre.set(''); this.email.set(''); this.password.set('');
    this.busqueda.set(null);
    this.asignados.set([]);
    this.elegirRol('secretaria');
    this.error.set('');
  }

  elegirRol(rol: RolUsuario) {
    this.rol.set(rol);
    this.error.set('');
    if (rol === 'profesional') {
      const libre = this.profesionalesLibres()[0];
      this.profesionalId.set(libre?.id ?? '');
      if (libre && !this.nombre().trim() && !this.personaExistente()) this.nombre.set(libre.nombre);
    } else {
      this.profesionalId.set('');
    }
  }

  onDni(valor: string) {
    this.dni.set(valor.replace(/\D/g, '').slice(0, 9));
    this.busqueda.set(null);
  }

  /** Al salir del campo DNI: ¿ya existe esta persona en la plataforma? */
  async buscarDni() {
    const dni = this.dni();
    if (!/^[0-9]{7,9}$/.test(dni)) return;
    this.buscando.set(true);
    this.busqueda.set(await this.equipo.buscarPorDni(dni));
    this.buscando.set(false);
  }

  toggleAsignado(sig: typeof this.asignados, profId: string) {
    sig.set(sig().includes(profId) ? sig().filter(id => id !== profId) : [...sig(), profId]);
  }

  async crear() {
    if (this.equipo.guardando()) return;
    this.error.set('');
    const r = await this.equipo.agregar({
      dni: this.dni(),
      nombre: this.nombre(),
      email: this.email(),
      password: this.password(),
      rol: this.rol(),
      profesionalId: this.profesionalId() || null,
      profesionalesAsignados: this.asignados()
    });
    if (r.error) { this.error.set(r.error); return; }
    this.altaAbierta.set(false);
    this.mostrarToast(r.vinculada
      ? 'Persona vinculada: entra con su DNI y su contraseña de siempre, y elige este centro.'
      : 'Usuario creado. Entra por /login con su DNI o su email.');
  }

  // ===== Edición =====

  editar(m: MiembroConUsuario) {
    this.editandoId.set(m.id);
    this.resetId.set(null);
    this.altaAbierta.set(false);
    this.edRol.set(m.rol);
    this.edProfesionalId.set(m.profesionalId ?? '');
    this.edAsignados.set([...(m.profesionalesAsignados ?? [])]);
    this.error.set('');
  }

  elegirRolEdicion(rol: RolUsuario, m: MiembroConUsuario) {
    this.edRol.set(rol);
    if (rol === 'secretaria') this.edProfesionalId.set('');
    else if (rol === 'profesional' && !this.edProfesionalId()) {
      this.edProfesionalId.set(this.profesionalesLibres(m.profesionalId)[0]?.id ?? '');
    }
  }

  async guardarEdicion(m: MiembroConUsuario) {
    const err = await this.equipo.actualizar(m.id, {
      rol: this.edRol(),
      profesionalId: this.edProfesionalId() || null,
      profesionalesAsignados: this.edAsignados()
    });
    if (err) { this.error.set(err); return; }
    this.editandoId.set(null);
    this.error.set('');
    this.mostrarToast('Acceso actualizado.');
  }

  async toggleAcceso(m: MiembroConUsuario) {
    const activar = m.activo === false;
    const err = await this.equipo.actualizar(m.id, { activo: activar });
    if (err) { this.error.set(err); return; }
    this.error.set('');
    this.mostrarToast(activar ? `${m.usuario.nombre} vuelve a tener acceso.` : `${m.usuario.nombre} ya no puede entrar a esta cuenta.`);
  }

  abrirReset(m: MiembroConUsuario) {
    this.resetId.set(m.id);
    this.resetPassword.set('');
    this.editandoId.set(null);
    this.error.set('');
  }

  async confirmarReset(m: MiembroConUsuario) {
    const err = await this.equipo.resetearPassword(m.usuarioId, this.resetPassword());
    if (err) { this.error.set(err); return; }
    this.resetId.set(null);
    this.error.set('');
    this.mostrarToast('Contraseña actualizada.');
  }
}
