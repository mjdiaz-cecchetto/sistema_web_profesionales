import { Component, EventEmitter, Input, OnInit, Output, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Cuenta, Plan, Usuario } from '../../../core/models';
import { GestionService } from '../../services/gestion.service';

/** Modal de alta/edición de una cuenta (tenant) desde el back-office. */
@Component({
  selector: 'app-cuenta-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cuenta-modal.component.html',
  styleUrl: './cuenta-modal.component.scss'
})
export class CuentaModalComponent implements OnInit {
  /** null = alta; con valor = edición. */
  @Input() cuenta: Cuenta | null = null;
  @Output() cerrar = new EventEmitter<void>();
  @Output() guardada = new EventEmitter<{ cuenta: Cuenta; esNueva: boolean }>();

  gestion = inject(GestionService);

  tipo = signal<'consultorio' | 'profesional'>('consultorio');
  nombre = signal('');
  especialidad = signal('');
  /** Email de CONTACTO de la organización (no es credencial). */
  email = signal('');

  // ---- Alta: persona que administrará la cuenta ----
  respDni = signal('');
  respNombre = signal('');
  respEmail = signal('');
  password = signal('');
  verPassword = signal(false);
  /** Persona encontrada por DNI (se vincula en vez de crearla). */
  respExistente = signal<Usuario | null>(null);
  buscandoResp = signal(false);
  descripcion = signal('');
  plan = signal('');
  slug = signal('');
  slugEditado = signal(false);
  error = signal<string | null>(null);

  /** Planes elegibles: los activos + el actual de la cuenta aunque esté inactivo. */
  planes = computed<Plan[]>(() => {
    const activos = this.gestion.planesActivos();
    const actual = this.cuenta ? this.gestion.planPorId(this.cuenta.plan) : undefined;
    return actual && !activos.some(p => p.id === actual.id) ? [...activos, actual] : activos;
  });

  get esNueva(): boolean {
    return this.cuenta === null;
  }

  /** Al salir del DNI del administrador: ¿ya tiene usuario en la plataforma? */
  async buscarResponsable(): Promise<void> {
    const dni = this.respDni().trim();
    this.respExistente.set(null);
    if (!/^[0-9]{7,9}$/.test(dni)) return;
    this.buscandoResp.set(true);
    const p = await this.gestion.personaPorDni(dni);
    this.buscandoResp.set(false);
    this.respExistente.set(p ?? null);
  }

  onRespDni(valor: string): void {
    this.respDni.set(valor.replace(/\D/g, '').slice(0, 9));
    this.respExistente.set(null);
  }

  ngOnInit(): void {
    const c = this.cuenta;
    if (!c) this.plan.set(this.gestion.planesActivos()[0]?.id ?? '');
    if (c) {
      this.tipo.set(c.tipo);
      this.nombre.set(c.nombre);
      this.email.set(c.email);
      this.descripcion.set(c.descripcion);
      this.plan.set(c.plan);
      this.slug.set(c.slug);
      this.slugEditado.set(true); // en edición el slug no se regenera solo
    }
  }

  /** El slug se sugiere desde el nombre hasta que el admin lo toque a mano. */
  onNombre(valor: string): void {
    this.nombre.set(valor);
    if (!this.slugEditado()) {
      this.slug.set(this.gestion.generarSlug(valor, this.cuenta?.id));
    }
  }

  onSlug(valor: string): void {
    this.slugEditado.set(true);
    this.slug.set(valor.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'));
  }

  prefijoUrl(): string {
    return this.tipo() === 'consultorio' ? '/c/' : '/p/';
  }

  private async validar(): Promise<string | null> {
    if (!this.nombre().trim()) return 'Ingresá el nombre de la cuenta.';
    const mail = this.email().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) return 'Ingresá un email de contacto válido.';
    if (this.esNueva) {
      const err = await this.validarResponsable();
      if (err) return err;
    }
    if (!this.plan()) return 'Elegí un plan de membresía.';
    if (!this.slug().trim()) return 'Ingresá el slug de la página pública.';
    if (!this.gestion.slugDisponible(this.slug(), this.cuenta?.id)) return 'Ese slug ya está en uso por otra cuenta.';
    const emailUsado = this.gestion.cuentas().some(c =>
      c.email.toLowerCase() === mail.toLowerCase() && c.id !== this.cuenta?.id);
    if (emailUsado) return 'Ya existe una cuenta con ese email.';
    return null;
  }

  /** Alta: valida la persona administradora (nueva o existente). */
  private async validarResponsable(): Promise<string | null> {
    const dni = this.respDni().trim();
    if (!/^[0-9]{7,9}$/.test(dni)) return 'Ingresá el DNI del administrador (entre 7 y 9 números, sin puntos).';
    const existente = await this.gestion.personaPorDni(dni);
    if (existente === undefined) return 'No se pudo conectar con el servidor. ¿Está corriendo la API local?';
    this.respExistente.set(existente);
    if (existente) return null; // se vincula: conserva su nombre, email y contraseña
    if (!this.respNombre().trim()) return 'Ingresá el nombre del administrador.';
    const mail = this.respEmail().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) return 'Ingresá un email válido para el administrador.';
    if (!(await this.gestion.emailPersonaDisponible(mail))) return 'Ese email ya pertenece a otra persona de la plataforma.';
    if (this.password().length < 6) return 'La contraseña inicial debe tener al menos 6 caracteres.';
    return null;
  }

  async guardar(): Promise<void> {
    if (this.gestion.saving()) return;
    const err = await this.validar();
    if (err) { this.error.set(err); return; }
    this.error.set(null);

    if (this.esNueva) {
      const creada = await this.gestion.crearCuenta({
        tipo: this.tipo(),
        nombre: this.nombre(),
        email: this.email(),
        responsable: {
          dni: this.respDni().trim(),
          usuarioExistenteId: this.respExistente()?.id,
          nombre: this.respNombre(),
          email: this.respEmail(),
          password: this.password()
        },
        descripcion: this.descripcion(),
        plan: this.plan(),
        slug: this.slug(),
        especialidad: this.especialidad().trim() || undefined
      });
      if (!creada) { this.error.set('No se pudo crear la cuenta. ¿Está corriendo la API local?'); return; }
      this.guardada.emit({ cuenta: creada, esNueva: true });
      return;
    }

    const cambios: Partial<Cuenta> = {
      nombre: this.nombre().trim(),
      email: this.email().trim().toLowerCase(),
      descripcion: this.descripcion().trim(),
      plan: this.plan(),
      slug: this.slug()
    };
    const ok = await this.gestion.actualizarCuenta(this.cuenta!.id, cambios);
    if (!ok) { this.error.set('No se pudo guardar. ¿Está corriendo la API local?'); return; }
    this.guardada.emit({ cuenta: { ...this.cuenta!, ...cambios } as Cuenta, esNueva: false });
  }
}
