import { Routes } from '@angular/router';

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
        loadComponent: () => import('./components/agenda/agenda.component').then(m => m.AgendaComponent),
        title: 'Admin - Agenda de Turnos'
      },
      {
        path: 'disponibilidad',
        loadComponent: () => import('./components/disponibilidad/disponibilidad.component').then(m => m.DisponibilidadComponent),
        title: 'Admin - Configurar Disponibilidad'
      },
      {
        path: 'perfil',
        loadComponent: () => import('./components/perfil-editor/perfil-editor.component').then(m => m.PerfilEditorComponent),
        title: 'Admin - Mi Perfil Público'
      }
    ]
  }
];
