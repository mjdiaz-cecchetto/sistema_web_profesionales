import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { GestionService } from '../../services/gestion.service';

interface ItemMenu {
  label: string;
  route: string;
  icon: string; // path SVG (Heroicons)
}

/**
 * Layout del back-office de la plataforma: sidebar oscuro (misma estructura
 * que el panel de las cuentas, look distinto para no confundir los mundos).
 */
@Component({
  selector: 'app-gestion-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './gestion-layout.component.html',
  styleUrl: './gestion-layout.component.scss'
})
export class GestionLayoutComponent implements OnInit {
  auth = inject(AuthService);
  private gestion = inject(GestionService);
  private router = inject(Router);

  readonly menu: ItemMenu[] = [
    { label: 'Dashboard', route: '/gestion/dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { label: 'Cuentas', route: '/gestion/cuentas', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
    { label: 'Membresías', route: '/gestion/membresias', icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z' },
    { label: 'Cobros', route: '/gestion/cobros', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' }
  ];

  ngOnInit(): void {
    // Una sola carga para todo el back-office (dashboard, cuentas, membresías, cobros).
    this.gestion.cargar();
  }

  salir(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
