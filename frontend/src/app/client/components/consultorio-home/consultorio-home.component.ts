import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { switchMap } from 'rxjs';
import { ClientService } from '../../services/client.service';
import { Cuenta, ProfessionalProfile } from '../../../core/models';
import { RevealDirective } from '../../../shared/directives/reveal.directive';

/**
 * Página pública de un CONSULTORIO (/c/{slug}): presenta al centro,
 * sus especialidades y su equipo. El paciente filtra por especialidad
 * y elige con quién atenderse.
 */
@Component({
  selector: 'app-consultorio-home',
  standalone: true,
  imports: [CommonModule, RouterModule, RevealDirective],
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

  especialidades = computed(() =>
    Array.from(new Set(this.profesionales().map(p => p.especialidad).filter(Boolean))).sort()
  );

  profesionalesFiltrados = computed(() => {
    const f = this.filtro();
    const lista = this.profesionales();
    return f ? lista.filter(p => p.especialidad === f) : lista;
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const slug = params.get('slug') ?? '';
      this.slug.set(slug);
      this.cargando.set(true);

      this.clientService.getCuentaPorSlug(slug).pipe(
        switchMap(cuenta => {
          this.consultorio.set(cuenta);
          return this.clientService.getProfessionals(cuenta.id);
        })
      ).subscribe({
        next: profesionales => {
          this.profesionales.set(profesionales);
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
