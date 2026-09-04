import { Routes } from '@angular/router';
import { rolGuard } from '../core/auth.guard';

export const adminRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/admin-layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent),
        title: 'Admin - Dashboard'
      },
      {
        path: 'agenda',
        redirectTo: 'agenda/lista',
        pathMatch: 'full'
      },
      {
        path: 'agenda/lista',
        loadComponent: () => import('./components/agenda/agenda.component').then(m => m.AgendaComponent),
        title: 'Admin - Agenda · Lista'
      },
      {
        path: 'agenda/calendario',
        loadComponent: () => import('./components/agenda-calendario/agenda-calendario.component').then(m => m.AgendaCalendarioComponent),
        title: 'Admin - Agenda · Calendario'
      },
      {
        path: 'equipo',
        canActivate: [rolGuard(['duenio'])],
        loadComponent: () => import('./components/profesionales/profesionales.component').then(m => m.ProfesionalesComponent),
        title: 'Admin - Mi Equipo'
      },
      {
        path: 'servicios',
        canActivate: [rolGuard(['duenio', 'profesional'])],
        loadComponent: () => import('./components/servicios/servicios.component').then(m => m.ServiciosComponent),
        title: 'Admin - Servicios'
      },
      {
        path: 'pacientes',
        loadComponent: () => import('./components/pacientes/pacientes.component').then(m => m.PacientesComponent),
        title: 'Admin - Pacientes'
      },
      {
        path: 'disponibilidad',
        canActivate: [rolGuard(['duenio', 'profesional'])],
        loadComponent: () => import('./components/disponibilidad/disponibilidad.component').then(m => m.DisponibilidadComponent),
        title: 'Admin - Configurar Disponibilidad'
      },
      {
        path: 'perfil',
        canActivate: [rolGuard(['duenio', 'profesional'])],
        loadComponent: () => import('./components/perfil-editor/perfil-editor.component').then(m => m.PerfilEditorComponent),
        title: 'Admin - Mi Perfil Público'
      }
    ]
  }
];
