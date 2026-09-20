import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Plan } from '../core/models';
import { RevealDirective } from '../shared/directives/reveal.directive';

interface Faq {
  question: string;
  answer: string;
  open: boolean;
}

/**
 * Landing B2B (/): la página que le vende el sistema a profesionales
 * y consultorios. Los planes se leen de la API (misma fuente que /gestion).
 */
@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule, RevealDirective],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss'
})
export class LandingComponent implements OnInit {
  private http = inject(HttpClient);

  planes = signal<Plan[]>([]);
  scrolleado = signal(false);

  @HostListener('window:scroll')
  onScroll(): void {
    this.scrolleado.set(window.scrollY > 24);
  }

  ngOnInit(): void {
    this.http.get<Plan[]>(`${environment.apiUrl}/planes`).subscribe({
      next: lista => this.planes.set(lista.filter(p => p.activo)),
      error: () => this.planes.set([]) // sin API: la sección de planes se oculta
    });
  }

  /** Qué incluye cada plan (texto comercial; el precio y límites vienen de la API). */
  bulletsDe(plan: Plan): string[] {
    const base = [
      'Agenda con turnos online 24/7',
      'Página pública personalizable',
      'Pacientes e historial de turnos',
      'Recordatorios por WhatsApp'
    ];
    if (plan.maxProfesionales === 0 || plan.maxProfesionales > 1) {
      return [
        `Hasta ${plan.maxProfesionales === 0 ? 'ilimitados' : plan.maxProfesionales} profesionales`,
        'Página del centro con especialidades',
        'Usuarios con roles (secretaría y profesionales)',
        ...base
      ];
    }
    if (plan.precioMensual === 0) {
      return ['Para probar el sistema sin costo', ...base.slice(0, 3)];
    }
    return ['1 profesional', ...base];
  }

  esRecomendado(plan: Plan): boolean {
    // Destacamos el plan individual pago (el caso más común).
    return plan.precioMensual > 0 && plan.maxProfesionales === 1;
  }

  scrollTo(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  faqs: Faq[] = [
    {
      question: '¿Mis pacientes necesitan crear una cuenta para sacar turno?',
      answer: 'No. Reservan desde tu página pública eligiendo servicio, día y horario, y gestionan sus turnos con su DNI: pueden reprogramar o cancelar solos, respetando la anticipación mínima que vos configures.',
      open: false
    },
    {
      question: 'Somos varios profesionales en un centro, ¿sirve?',
      answer: 'Sí. El plan Consultorio suma la página del centro con sus especialidades, agenda y disponibilidad por profesional, padrón de pacientes compartido y usuarios con roles: secretaría para operar todas las agendas y acceso individual para cada profesional.',
      open: false
    },
    {
      question: '¿Cómo evita superposiciones de turnos?',
      answer: 'La agenda solo ofrece horarios realmente libres: cruza tu disponibilidad semanal, tus bloqueos (vacaciones, feriados) y los turnos ya tomados. Además impide que un mismo paciente tenga dos turnos el mismo día con el mismo profesional.',
      open: false
    },
    {
      question: '¿Puedo cargar turnos que se repiten todas las semanas?',
      answer: 'Sí. Podés crear series semanales, quincenales o mensuales (típico de tratamientos con obra social), y después moverlas o cancelarlas como grupo en un solo paso.',
      open: false
    },
    {
      question: '¿Cómo empiezo?',
      answer: 'Escribinos y te creamos la cuenta con tu página pública lista para compartir. La carga inicial es guiada: especialidades, servicios, horarios y equipo quedan configurados el primer día.',
      open: false
    }
  ];

  toggleFaq(index: number): void {
    this.faqs = this.faqs.map((f, i) => ({ ...f, open: i === index ? !f.open : false }));
  }
}
