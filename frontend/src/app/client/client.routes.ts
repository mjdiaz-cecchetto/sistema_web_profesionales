import { Routes } from '@angular/router';

export const clientRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/inicio/inicio.component').then(m => m.InicioComponent),
    title: 'Dra. Elena Ramos - Psicóloga'
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
