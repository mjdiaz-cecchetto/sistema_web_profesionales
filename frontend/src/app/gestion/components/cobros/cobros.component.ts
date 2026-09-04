import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Cuenta, MedioPago, Pago } from '../../../core/models';
import { GestionService } from '../../services/gestion.service';

/** Cobros de membresías: historial de pagos + registro manual. */
@Component({
  selector: 'app-gestion-cobros',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cobros.component.html',
  styleUrl: './cobros.component.scss'
})
export class CobrosComponent implements OnInit {
  gestion = inject(GestionService);
  private route = inject(ActivatedRoute);

  // Filtros del listado
  filtroCuenta = signal<string>('');
  filtroPeriodo = signal<string>('');
  filtroMedio = signal<string>('');

  // Modal de registro
  modalAbierto = signal(false);
  regCuentaId = signal('');
  regPeriodo = signal('');
  regMonto = signal<number>(0);
  regMedio = signal<MedioPago>('transferencia');
  regNotas = signal('');
  error = signal<string | null>(null);
  toast = signal('');
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  readonly medios: MedioPago[] = ['transferencia', 'mercadopago', 'efectivo', 'otro'];

  ngOnInit(): void {
    if (this.gestion.cuentas().length === 0 && !this.gestion.loading()) this.gestion.cargar();
    const q = this.route.snapshot.queryParamMap;
    const cuenta = q.get('cuenta');
    if (cuenta) {
      this.filtroCuenta.set(cuenta);
      this.abrirRegistro(cuenta);
    } else if (q.get('registrar')) {
      this.abrirRegistro();
    }
  }

  pagosFiltrados = computed<Pago[]>(() =>
    this.gestion.pagos()
      .filter(p => !this.filtroCuenta() || p.cuentaId === this.filtroCuenta())
      .filter(p => !this.filtroPeriodo() || p.periodo === this.filtroPeriodo())
      .filter(p => !this.filtroMedio() || p.medio === this.filtroMedio())
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.periodo.localeCompare(a.periodo)));

  totalFiltrado = computed(() => this.pagosFiltrados().reduce((acc, p) => acc + p.monto, 0));

  /** Períodos existentes en los pagos (para el filtro), del más nuevo al más viejo. */
  periodos = computed(() =>
    [...new Set(this.gestion.pagos().map(p => p.periodo))].sort((a, b) => b.localeCompare(a)));

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

  abrirRegistro(cuentaId = ''): void {
    this.error.set(null);
    this.regCuentaId.set(cuentaId);
    this.regPeriodo.set(this.gestion.periodoActual());
    this.regMedio.set('transferencia');
    this.regNotas.set('');
    this.regMonto.set(this.montoSugerido(cuentaId));
    this.modalAbierto.set(true);
  }

  /** Al elegir cuenta en el modal, sugiere el precio de su plan. */
  onRegCuenta(id: string): void {
    this.regCuentaId.set(id);
    this.regMonto.set(this.montoSugerido(id));
  }

  private montoSugerido(cuentaId: string): number {
    const c = this.gestion.cuentas().find(x => x.id === cuentaId);
    return c ? (this.gestion.planPorId(c.plan)?.precioMensual ?? 0) : 0;
  }

  cuentasElegibles = computed<Cuenta[]>(() => this.gestion.cuentasActivas());

  async registrar(): Promise<void> {
    if (this.gestion.saving()) return;
    if (!this.regCuentaId()) { this.error.set('Elegí la cuenta.'); return; }
    if (!/^\d{4}-\d{2}$/.test(this.regPeriodo())) { this.error.set('Elegí el período (mes) que salda el cobro.'); return; }
    if (this.regMonto() <= 0) { this.error.set('El monto debe ser mayor a cero.'); return; }
    const duplicado = this.gestion.pagos().some(p =>
      p.cuentaId === this.regCuentaId() && p.periodo === this.regPeriodo());
    if (duplicado) { this.error.set(`Esa cuenta ya tiene un cobro registrado para ${this.regPeriodo()}.`); return; }
    this.error.set(null);

    const creado = await this.gestion.registrarPago({
      cuentaId: this.regCuentaId(),
      periodo: this.regPeriodo(),
      monto: this.regMonto(),
      medio: this.regMedio(),
      notas: this.regNotas().trim() || undefined
    });
    if (!creado) { this.error.set('No se pudo registrar. ¿Está corriendo la API local?'); return; }
    this.modalAbierto.set(false);
    this.mostrarToast(`Cobro de ${this.monto(creado.monto)} registrado a ${this.nombreCuenta(creado.cuentaId)} (período ${creado.periodo}).`);
  }

  mostrarToast(msj: string): void {
    this.toast.set(msj);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set(''), 4500);
  }
}
