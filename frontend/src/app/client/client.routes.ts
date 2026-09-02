import { Routes } from '@angular/router';

/**
 * Rutas públicas de un CONSULTORIO, montadas bajo /c/:slug.
 * El :slug del padre llega a los hijos por paramsInheritanceStrategy: 'always'.
 */
export const consultorioRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/consultorio-home/consultorio-home.component').then(m => m.ConsultorioHomeComponent),
    title: 'Consultorio'
  },
  {
    path: 'p/:profId',
    loadComponent: () => import('./components/inicio/inicio.component').then(m => m.InicioComponent),
    title: 'Perfil del Profesional'
  },
  {
    path: 'turnos',
    loadComponent: () => import('./components/asistente-turnos/asistente-turnos.component').then(m => m.AsistenteTurnosComponent),
    title: 'Agendar Turno'
  },
  {
    path: 'turnos/:profId',
    loadComponent: () => import('./components/asistente-turnos/asistente-turnos.component').then(m => m.AsistenteTurnosComponent),
    title: 'Agendar Turno'
  },
  {
    path: 'mis-turnos',
    loadComponent: () => import('./components/mis-turnos/mis-turnos.component').then(m => m.MisTurnosComponent),
    title: 'Gestionar mi Turno'
  },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full'
  }
];

/**
 * Rutas públicas de un PROFESIONAL independiente, montadas bajo /p/:slug.
 * No hay landing de equipo: la raíz es directamente su página personal.
 */
export const profesionalRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/inicio/inicio.component').then(m => m.InicioComponent),
    title: 'Perfil del Profesional'
  },
  {
    path: 'turnos',
    loadComponent: () => import('./components/asistente-turnos/asistente-turnos.component').then(m => m.AsistenteTurnosComponent),
    title: 'Agendar Turno'
  },
  {
    path: 'mis-turnos',
    loadComponent: () => import('./components/mis-turnos/mis-turnos.component').then(m => m.MisTurnosComponent),
    title: 'Gestionar mi Turno'
  },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full'
  }
];
