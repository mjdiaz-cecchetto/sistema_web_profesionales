import { Component, ElementRef, HostListener, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { forkJoin, switchMap } from 'rxjs';
import { ClientService } from '../../services/client.service';
import { Cuenta, DayAvailability, ProfessionalProfile, Service } from '../../../core/models';
import { aceptaParticular, obrasSocialesDeProfesional } from '../../../core/coberturas';
import { RevealDirective } from '../../../shared/directives/reveal.directive';

interface HorarioDia {
  dia: string;
  activo: boolean;
  rangos: string[];
}

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, RouterModule, RevealDirective],
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.scss'
})
export class InicioComponent implements OnInit {
  private clientService = inject(ClientService);
  private route = inject(ActivatedRoute);

  /** Cuenta pública dueña de esta página (resuelta por el :slug de la URL). */
  cuenta = signal<Cuenta | null>(null);
  slug = signal<string>('');
  /** Profesional de esta página (de la URL /c/:slug/p/:profId, o el único de la cuenta en /p/:slug). */
  profId = signal<string>('');
  /** true si la página pertenece a un consultorio (muestra el volver al centro). */
  esConsultorio = computed(() => this.cuenta()?.tipo === 'consultorio');
  nombreConsultorio = computed(() => this.cuenta()?.nombre ?? '');

  /** Base de rutas públicas de la cuenta: ['/c', slug] o ['/p', slug]. */
  base = computed(() => [this.esConsultorio() ? '/c' : '/p', this.slug()]);
  linkVolverCentro = computed(() => ['/c', this.slug()]);
  linkTurnos = computed(() =>
    this.esConsultorio() ? ['/c', this.slug(), 'turnos', this.profId()] : ['/p', this.slug(), 'turnos']
  );
  linkMisTurnos = computed(() => [...this.base(), 'mis-turnos']);

  profesional = signal<ProfessionalProfile | null>(null);
  servicios = signal<Service[]>([]);
  /** Obras sociales que atiende este profesional (nombres) y si atiende particulares. */
  obrasSociales = signal<string[]>([]);
  atiendeParticulares = signal(true);
  horarios = signal<HorarioDia[]>([]);
  cargando = signal<boolean>(true);
  errorCarga = signal<boolean>(false);

  /** Especialidad expandida en el acordeón. */
  especialidadActiva = signal<number | null>(null);

  /** Estado de scroll para la navbar, la barra de progreso y el back-to-top. */
  scrolleado = signal(false);
  progresoScroll = signal(0);
  /** CTA fijo de mobile: solo cuando los botones del hero ya salieron de pantalla (evita CTAs duplicados). */
  mostrarCtaFijo = signal(false);
  private readonly ctaHero = viewChild<ElementRef<HTMLElement>>('ctaHero');

  /** Nombre del día de hoy (para resaltarlo en Horarios). */
  readonly diaHoy = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][new Date().getDay()];

  @HostListener('window:scroll')
  onScroll(): void {
    const y = window.scrollY;
    this.scrolleado.set(y > 24);
    const total = document.documentElement.scrollHeight - window.innerHeight;
    this.progresoScroll.set(total > 0 ? Math.min(100, (y / total) * 100) : 0);
    const cta = this.ctaHero()?.nativeElement;
    this.mostrarCtaFijo.set(!!cta && cta.getBoundingClientRect().bottom < 0);
  }

  volverArriba(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const slug = params.get('slug') ?? '';
      const idParam = params.get('profId') ?? '';
      this.slug.set(slug);
      this.cargando.set(true);

      this.clientService.getCuentaPorSlug(slug).pipe(
        switchMap(cuenta => {
          this.cuenta.set(cuenta);
          return this.clientService.getProfessionals(cuenta.id);
        }),
        switchMap(profesionales => {
          // /p/{slug}: cuenta de un profesional independiente → su único perfil.
          const prof = idParam
            ? profesionales.find(x => x.id === idParam)
            : profesionales[0];
          if (!prof) throw new Error('Profesional no encontrado');
          this.profId.set(prof.id);
          this.profesional.set(prof);
          return forkJoin({
            servicios: this.clientService.getServices(prof.id),
            disponibilidad: this.clientService.getWeeklyAvailability(prof.id),
            obras: this.clientService.getObrasSociales(prof.cuentaId)
          });
        })
      ).subscribe({
        next: ({ servicios, disponibilidad, obras }) => {
          this.servicios.set(servicios);
          const prof = this.profesional();
          this.obrasSociales.set(prof ? obrasSocialesDeProfesional(prof, obras).map(o => o.nombre) : []);
          this.atiendeParticulares.set(prof ? aceptaParticular(prof) : true);
          this.horarios.set(this.armarHorarios(disponibilidad));
          this.cargando.set(false);
        },
        error: () => {
          this.errorCarga.set(true);
          this.cargando.set(false);
        }
      });
    });
  }

  /** Resume la disponibilidad semanal en rangos legibles (ej. 08:00 a 11:00). */
  private armarHorarios(config: DayAvailability[]): HorarioDia[] {
    // Orden lunes → domingo
    const orden = [1, 2, 3, 4, 5, 6, 0];
    return orden
      .map(idx => config.find(c => c.dayIndex === idx))
      .filter((c): c is DayAvailability => !!c)
      .map(c => ({
        dia: c.day,
        activo: c.active && c.slots.length > 0,
        rangos: this.comprimirRangos(c.slots)
      }));
  }

  /** Convierte horas sueltas consecutivas en rangos: 08,09,10,11 → "08:00 a 11:00". */
  private comprimirRangos(slots: string[]): string[] {
    if (slots.length === 0) return [];
    const orden = slots.slice().sort();
    const rangos: string[] = [];
    let inicio = orden[0];
    let anterior = orden[0];

    const aMinutos = (h: string) => {
      const [hh, mm] = h.split(':').map(Number);
      return hh * 60 + mm;
    };

    for (let i = 1; i <= orden.length; i++) {
      const actual = orden[i];
      if (actual !== undefined && aMinutos(actual) - aMinutos(anterior) === 60) {
        anterior = actual;
        continue;
      }
      rangos.push(inicio === anterior ? `${inicio} hs` : `${inicio} a ${anterior} hs`);
      if (actual !== undefined) {
        inicio = actual;
        anterior = actual;
      }
    }
    return rangos;
  }

  toggleSpecialty(index: number) {
    this.especialidadActiva.set(this.especialidadActiva() === index ? null : index);
  }

  scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /** Iniciales del nombre, ignorando títulos abreviados ("Lic.", "Dra.", "Od."…): "Lic. Martín Vega" → "MV". */
  getInitials(nombre: string): string {
    const todas = nombre.split(' ').filter(Boolean);
    const sinTitulo = todas.filter(p => !p.endsWith('.'));
    const parts = sinTitulo.length ? sinTitulo : todas;
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return (parts[0] ?? '').slice(0, 2).toUpperCase();
  }
}
