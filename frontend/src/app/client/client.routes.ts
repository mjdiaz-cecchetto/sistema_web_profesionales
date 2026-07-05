import { Routes } from '@angular/router';

export const clientRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/inicio/inicio.component').then(m => m.InicioComponent),
    title: 'Sistema Profesionales'
  },
  {
    path: 'turnos',
    loadComponent: () => import('./components/asistente-turnos/asistente-turnos.component').then(m => m.AsistenteTurnosComponent),
    title: 'Agendar Turno'
  },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full'
  }
];
