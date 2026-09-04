import { Routes } from '@angular/router';

/** Back-office de la PLATAFORMA (/gestion): solo administradores. */
export const gestionRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/gestion-layout/gestion-layout.component').then(m => m.GestionLayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./components/gestion-dashboard/gestion-dashboard.component').then(m => m.GestionDashboardComponent),
        title: 'Gestión · Dashboard'
      },
      {
        path: 'cuentas',
        loadComponent: () => import('./components/cuentas/cuentas.component').then(m => m.CuentasComponent),
        title: 'Gestión · Cuentas'
      },
      {
        path: 'membresias',
        loadComponent: () => import('./components/membresias/membresias.component').then(m => m.MembresiasComponent),
        title: 'Gestión · Membresías'
      },
      {
        path: 'cobros',
        loadComponent: () => import('./components/cobros/cobros.component').then(m => m.CobrosComponent),
        title: 'Gestión · Cobros'
      },
      { path: '**', redirectTo: 'dashboard' }
    ]
  }
];
