import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ClientService } from '../../services/client.service';
import { ProfessionalProfile } from '../../../core/models';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.scss'
})
export class InicioComponent implements OnInit {
  private clientService = inject(ClientService);

  /** Perfil del profesional cargado desde la API local. */
  profesional = signal<ProfessionalProfile | null>(null);
  cargando = signal<boolean>(true);
  errorCarga = signal<boolean>(false);

  /** Especialidad expandida en el acordeón. */
  especialidadActiva = signal<number | null>(null);

  ngOnInit(): void {
    this.clientService.getProfile().subscribe({
      next: p => {
        this.profesional.set(p);
        this.cargando.set(false);
      },
      error: () => {
        this.errorCarga.set(true);
        this.cargando.set(false);
      }
    });
  }

  toggleSpecialty(index: number) {
    this.especialidadActiva.set(this.especialidadActiva() === index ? null : index);
  }

  getInitials(nombre: string): string {
    const parts = nombre.split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return nombre.slice(0, 2).toUpperCase();
  }
}
