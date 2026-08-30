import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ClientService } from '../../services/client.service';
import { DayAvailability, ProfessionalProfile, Service } from '../../../core/models';
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

  profesional = signal<ProfessionalProfile | null>(null);
  servicios = signal<Service[]>([]);
  horarios = signal<HorarioDia[]>([]);
  cargando = signal<boolean>(true);
  errorCarga = signal<boolean>(false);

  /** Especialidad expandida en el acordeón. */
  especialidadActiva = signal<number | null>(null);

  /** Estado de scroll para la navbar, la barra de progreso y el back-to-top. */
  scrolleado = signal(false);
  progresoScroll = signal(0);

  /** Nombre del día de hoy (para resaltarlo en Horarios). */
  readonly diaHoy = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][new Date().getDay()];

  @HostListener('window:scroll')
  onScroll(): void {
    const y = window.scrollY;
    this.scrolleado.set(y > 24);
    const total = document.documentElement.scrollHeight - window.innerHeight;
    this.progresoScroll.set(total > 0 ? Math.min(100, (y / total) * 100) : 0);
  }

  volverArriba(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  ngOnInit(): void {
    forkJoin({
      perfil: this.clientService.getProfile(),
      servicios: this.clientService.getServices(),
      disponibilidad: this.clientService.getWeeklyAvailability()
    }).subscribe({
      next: ({ perfil, servicios, disponibilidad }) => {
        this.profesional.set(perfil);
        this.servicios.set(servicios);
        this.horarios.set(this.armarHorarios(disponibilidad));
        this.cargando.set(false);
      },
      error: () => {
        this.errorCarga.set(true);
        this.cargando.set(false);
      }
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

  getInitials(nombre: string): string {
    const parts = nombre.split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return nombre.slice(0, 2).toUpperCase();
  }
}
