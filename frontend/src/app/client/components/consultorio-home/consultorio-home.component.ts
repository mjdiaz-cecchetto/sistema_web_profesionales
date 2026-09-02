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
  template: `
    <div class="min-h-screen bg-stone-50 font-sans text-stone-800 overflow-x-hidden">

      <!-- Cargando -->
      <div *ngIf="cargando()" class="min-h-screen flex flex-col items-center justify-center gap-4">
        <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600"></div>
        <p class="text-stone-500 text-sm">Cargando…</p>
      </div>

      <!-- Error de API -->
      <div *ngIf="!cargando() && errorCarga()" class="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div class="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center">
          <svg class="w-7 h-7 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        </div>
        <p class="text-stone-600 text-sm font-semibold max-w-sm">
          No se pudo conectar con el servidor local.<br>
          <span class="font-normal text-stone-400">Ejecutá <code class="bg-stone-200 px-1.5 py-0.5 rounded font-mono text-xs">npm run api</code> y recargá la página.</span>
        </p>
      </div>

      <!-- ===== Contenido ===== -->
      <ng-container *ngIf="!cargando() && !errorCarga() && consultorio() as centro">

        <!-- Navbar -->
        <header class="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-xl border-b border-stone-200/60">
          <div class="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex justify-between items-center">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-8 h-8 rounded-lg bg-teal-200 border border-teal-300 text-teal-900 text-xs font-extrabold flex items-center justify-center shrink-0">
                {{ iniciales(centro.nombre) }}
              </div>
              <span class="font-extrabold text-stone-900 text-sm tracking-tight truncate">{{ centro.nombre }}</span>
            </div>
            <a [routerLink]="['/c', slug(), 'mis-turnos']"
               class="inline-flex bg-white text-stone-600 border border-stone-200 px-4 py-2 rounded-full text-xs font-extrabold hover:border-teal-300 hover:text-teal-800 transition-colors">
              Gestionar mi turno
            </a>
          </div>
        </header>

        <!-- Hero del centro -->
        <section class="relative pt-16">
          <div class="relative overflow-hidden bg-teal-100 border-b border-teal-200">
            <div class="absolute top-8 left-[8%] w-16 h-16 rounded-3xl bg-white/50 border border-teal-300/50 anim-float hidden sm:block"></div>
            <div class="absolute bottom-10 right-[10%] w-10 h-10 rounded-2xl bg-teal-200 border border-teal-300/60 anim-float hidden sm:block" style="animation-delay: 1.4s"></div>

            <div class="max-w-5xl mx-auto px-4 sm:px-6 py-14 sm:py-20 text-center relative">
              <p class="text-[11px] font-bold uppercase tracking-[0.22em] text-teal-700 anim-entrada">Bienvenido a</p>
              <h1 class="text-3xl sm:text-5xl font-extrabold tracking-tight text-teal-950 mt-2 anim-entrada" style="animation-delay: 0.1s">
                {{ centro.nombre }}
              </h1>
              <p class="text-sm sm:text-base text-teal-800 mt-4 max-w-2xl mx-auto leading-relaxed anim-entrada" style="animation-delay: 0.2s">
                {{ centro.descripcion }}
              </p>
              <button (click)="scrollAEquipo()"
                      class="anim-halo anim-entrada inline-flex items-center gap-2 bg-white text-teal-900 border border-teal-200 px-8 py-4 rounded-2xl text-sm font-extrabold hover:bg-teal-50 hover:scale-[1.03] active:scale-100 transition-all mt-7"
                      style="animation-delay: 0.3s">
                Conocé al equipo y reservá
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
              </button>
            </div>
          </div>
        </section>

        <!-- Equipo -->
        <main id="equipo" class="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-10 pb-20 scroll-mt-20">
          <div reveal class="text-center max-w-lg mx-auto">
            <p class="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-700">Nuestro Equipo</p>
            <h2 class="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight mt-1.5">¿Con quién querés atenderte?</h2>
            <span class="title-bar mx-auto mt-3"></span>
            <p class="text-sm text-stone-500 mt-3">Elegí un profesional para conocer su perfil y reservar tu turno online.</p>
          </div>

          <!-- Filtro por especialidad -->
          <div *ngIf="especialidades().length > 1" reveal class="flex flex-wrap justify-center gap-2 -mt-4">
            <button (click)="filtro.set('')"
                    [ngClass]="!filtro() ? 'bg-teal-200 text-teal-900 border-teal-300' : 'bg-white text-stone-500 border-stone-200 hover:border-teal-300 hover:text-teal-800'"
                    class="px-4 py-2 rounded-full text-xs font-extrabold border transition-colors">
              Todas
            </button>
            <button *ngFor="let e of especialidades()"
                    (click)="filtro.set(filtro() === e ? '' : e)"
                    [ngClass]="filtro() === e ? 'bg-teal-200 text-teal-900 border-teal-300' : 'bg-white text-stone-500 border-stone-200 hover:border-teal-300 hover:text-teal-800'"
                    class="px-4 py-2 rounded-full text-xs font-extrabold border transition-colors">
              {{ e }}
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            <div *ngFor="let p of profesionalesFiltrados(); let i = index" reveal [revealDelay]="i * 100"
                 class="group bg-white rounded-3xl border border-stone-200 overflow-hidden flex flex-col hover:border-teal-300 hover:-translate-y-1 transition-all duration-300">

              <!-- Cabecera con avatar -->
              <div class="bg-teal-50 border-b border-teal-100 pt-8 pb-6 flex flex-col items-center relative overflow-hidden">
                <div class="absolute top-3 right-4 w-8 h-8 rounded-xl bg-white/60 border border-teal-200/60 anim-float" [style.animation-delay]="(i * 0.8) + 's'"></div>
                <div class="w-24 h-24 rounded-3xl overflow-hidden ring-4 ring-white border border-stone-200 bg-teal-200 flex items-center justify-center text-teal-900 font-extrabold text-2xl group-hover:scale-105 transition-transform duration-300">
                  <img *ngIf="p.avatarUrl" [src]="p.avatarUrl" [alt]="p.nombre" class="w-full h-full object-cover">
                  <ng-container *ngIf="!p.avatarUrl">{{ iniciales(p.nombre) }}</ng-container>
                </div>
              </div>

              <div class="p-6 flex flex-col gap-3 flex-grow">
                <div class="text-center">
                  <span *ngIf="p.especialidad" class="inline-flex text-[10px] font-extrabold uppercase tracking-widest bg-teal-50 text-teal-800 border border-teal-200 px-2.5 py-0.5 rounded-full mb-2">
                    {{ p.especialidad }}
                  </span>
                  <h3 class="font-extrabold text-stone-900 text-lg leading-tight">{{ p.nombre }}</h3>
                  <p class="text-xs font-bold text-teal-700 mt-1">{{ p.titulo }}</p>
                </div>

                <p *ngIf="p.frasePrincipal" class="text-xs text-stone-500 text-center leading-relaxed line-clamp-2">
                  {{ p.frasePrincipal }}
                </p>

                <div *ngIf="p.areas.length" class="flex flex-wrap justify-center gap-1.5 mt-1">
                  <span *ngFor="let a of p.areas.slice(0, 3)"
                        class="text-[10px] font-bold bg-stone-100 text-stone-600 border border-stone-200 px-2 py-0.5 rounded-full">
                    {{ a.nombre }}
                  </span>
                </div>

                <div class="flex gap-2 mt-auto pt-4">
                  <a [routerLink]="['/c', slug(), 'p', p.id]"
                     class="flex-1 inline-flex items-center justify-center bg-white text-stone-600 border border-stone-200 px-3 py-2.5 rounded-xl text-xs font-extrabold hover:border-teal-300 hover:text-teal-800 transition-colors">
                    Ver Perfil
                  </a>
                  <a [routerLink]="['/c', slug(), 'turnos', p.id]"
                     class="flex-1 inline-flex items-center justify-center bg-teal-200 text-teal-900 border border-teal-300 px-3 py-2.5 rounded-xl text-xs font-extrabold hover:bg-teal-300 transition-colors">
                    Agendar
                  </a>
                </div>
              </div>
            </div>
          </div>

          <!-- CTA gestionar -->
          <div reveal class="rounded-3xl bg-teal-100 border border-teal-200 p-8 text-center">
            <h3 class="text-xl font-extrabold text-teal-950 tracking-tight">¿Ya tenés un turno con nosotros?</h3>
            <p class="text-sm text-teal-800 mt-1.5">Gestionalo con tu DNI: cambiá la fecha o cancelalo en segundos.</p>
            <a [routerLink]="['/c', slug(), 'mis-turnos']"
               class="inline-flex items-center gap-2 bg-white text-teal-900 border border-teal-200 px-6 py-3 rounded-2xl text-xs font-extrabold hover:bg-teal-50 transition-colors mt-4">
              Gestionar mi turno
            </a>
          </div>
        </main>

        <footer class="bg-white border-t border-stone-200/60 py-8 text-center">
          <p class="text-xs text-stone-400">&copy; 2026 {{ centro.nombre }} · Turnos online con <span class="font-bold text-teal-700">Sistema Profesionales</span></p>
        </footer>

      </ng-container>
    </div>
  `
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
