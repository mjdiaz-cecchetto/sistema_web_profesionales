import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Cuenta, Pago } from '../../../core/models';
import { GestionService } from '../../services/gestion.service';

interface FilaActividad {
  cuenta: Cuenta;
  turnos: number;
  porcentaje: number; // 0-100 respecto del máximo
}

/** Dashboard de la plataforma: solo agregados, nunca datos de pacientes/turnos. */
@Component({
  selector: 'app-gestion-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './gestion-dashboard.component.html',
  styleUrl: './gestion-dashboard.component.scss'
})
export class GestionDashboardComponent {
  gestion = inject(GestionService);

  /** Actividad del mes por cuenta (turnos agregados), de mayor a menor. */
  actividad = computed<FilaActividad[]>(() => {
    const filas = this.gestion.cuentas()
      .map(c => ({ cuenta: c, turnos: this.gestion.metricas()[c.id]?.turnosMes ?? 0 }))
      .sort((a, b) => b.turnos - a.turnos)
      .slice(0, 8);
    const max = Math.max(1, ...filas.map(f => f.turnos));
    return filas.map(f => ({ ...f, porcentaje: Math.round((f.turnos / max) * 100) }));
  });

  ultimosPagos = computed<Pago[]>(() =>
    [...this.gestion.pagos()].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 5));

  cobranzaAlDia = computed(() =>
    this.gestion.cuentasActivas().filter(c => this.gestion.cobranza(c) === 'al_dia').length);
  cobranzaSinCargo = computed(() =>
    this.gestion.cuentasActivas().filter(c => this.gestion.cobranza(c) === 'sin_cargo').length);

  nombreCuenta(id: string): string {
    return this.gestion.cuentas().find(c => c.id === id)?.nombre ?? '—';
  }

  monto(valor: number): string {
    return '$ ' + valor.toLocaleString('es-AR');
  }

  fechaCorta(iso: string): string {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y.slice(2)}`;
  }

  mesActual(): string {
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const d = new Date();
    return `${meses[d.getMonth()]} ${d.getFullYear()}`;
  }
}
