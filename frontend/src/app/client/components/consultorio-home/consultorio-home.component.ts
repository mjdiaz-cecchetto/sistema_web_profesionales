import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { forkJoin, switchMap } from 'rxjs';
import { ClientService } from '../../services/client.service';
import { Cuenta, ObraSocial, PARTICULAR, ProfessionalProfile } from '../../../core/models';
import { coberturasDeProfesional, obrasSocialesDeProfesional } from '../../../core/coberturas';
import { RevealDirective } from '../../../shared/directives/reveal.directive';

/**
 * Página pública de un CONSULTORIO (/c/{slug}): presenta al centro,
 * sus especialidades y su equipo. El paciente filtra por especialidad
 * y por obra social, y elige con quién atenderse.
 */
@Component({
  selector: 'app-consultorio-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, RevealDirective],
  templateUrl: './consultorio-home.component.html',
  styleUrl: './consultorio-home.component.scss'
})
export class ConsultorioHomeComponent implements OnInit {
  private clientService = inject(ClientService);
  private route = inject(ActivatedRoute);

  slug = signal('');
  consultorio = signal<Cuenta | null>(null);
  profesionales = signal<ProfessionalProfile[]>([]);
  cargando = signal(true);
  errorCarga = signal(false);

  /** Filtro de especialidad ('' = todas). */
  filtro = signal('');

  /** Obras sociales activas del centro. */
  obrasSociales = signal<ObraSocial[]>([]);
  /** Filtro de cobertura ('' = cualquiera; PARTICULAR = sin obra social). */
  filtroOS = signal('');
  readonly PARTICULAR = PARTICULAR;

  /** Opciones del selector: solo las obras sociales que atiende al menos un profesional. */
  opcionesOS = computed(() => {
    const atendidas = new Set(this.profesionales().flatMap(p => obrasSocialesDeProfesional(p, this.obrasSociales()).map(o => o.nombre)));
    return this.obrasSociales().filter(o => atendidas.has(o.nombre)).map(o => o.nombre);
  });

  especialidades = computed(() =>
    Array.from(new Set(this.profesionales().map(p => p.especialidad).filter(Boolean))).sort()
  );

  profesionalesFiltrados = computed(() => {
    const f = this.filtro();
    const os = this.filtroOS();
    return this.profesionales()
      .filter(p => !f || p.especialidad === f)
      .filter(p => !os || coberturasDeProfesional(p, this.obrasSociales()).includes(os));
  });

  /** Resumen de obras sociales de un profesional para su card (ej. "OSDE · Swiss Medical +2"). */
  resumenOS(p: ProfessionalProfile): string {
    const nombres = obrasSocialesDeProfesional(p, this.obrasSociales()).map(o => o.nombre);
    if (!nombres.length) return '';
    return nombres.slice(0, 2).join(' · ') + (nombres.length > 2 ? ` +${nombres.length - 2}` : '');
  }

  /** Query param para que el turnero precargue la cobertura elegida. */
  queryTurno = computed(() => (this.filtroOS() ? { os: this.filtroOS() } : {}));

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const slug = params.get('slug') ?? '';
      this.slug.set(slug);
      this.cargando.set(true);

      this.clientService.getCuentaPorSlug(slug).pipe(
        switchMap(cuenta => {
          this.consultorio.set(cuenta);
          return forkJoin({
            profesionales: this.clientService.getProfessionals(cuenta.id),
            obras: this.clientService.getObrasSociales(cuenta.id)
          });
        })
      ).subscribe({
        next: ({ profesionales, obras }) => {
          this.profesionales.set(profesionales);
          this.obrasSociales.set(obras);
          this.cargando.set(false);
        },
        error: () => {
          this.errorCarga.set(true);
          this.cargando.set(false);
        }
      });
    });
  }

  scrollAEquipo(): void {
    document.getElementById('equipo')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  iniciales(nombre: string): string {
    const partes = nombre.split(' ').filter(Boolean);
    if (partes.length >= 2) return (partes[0][0] + partes[1][0]).toUpperCase();
    return nombre.slice(0, 2).toUpperCase();
  }
}
