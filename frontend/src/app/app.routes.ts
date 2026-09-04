import { Routes } from '@angular/router';
import { LandingComponent } from './landing/landing.component';
import { authGuard, gestionGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: '',
    component: LandingComponent
  },
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent),
    title: 'Ingresar · Sistema de Turnos'
  },
  // Página pública de un CONSULTORIO: /c/{slug}
  {
    path: 'c/:slug',
    loadChildren: () => import('./client/client.routes').then(m => m.consultorioRoutes)
  },
  // Página pública de un PROFESIONAL independiente: /p/{slug}
  {
    path: 'p/:slug',
    loadChildren: () => import('./client/client.routes').then(m => m.profesionalRoutes)
  },
  {
    path: 'admin',
    canActivate: [authGuard],
    loadChildren: () => import('./admin/admin.routes').then(m => m.adminRoutes)
  },
  // Back-office de la PLATAFORMA (solo administradores): gestión de cuentas
  {
    path: 'gestion',
    canActivate: [gestionGuard],
    loadChildren: () => import('./gestion/gestion.routes').then(m => m.gestionRoutes)
  },
  // Ruta vieja (compatibilidad): la demo del consultorio
  {
    path: 'client',
    redirectTo: 'c/centro-san-martin'
  },
  {
    path: '**',
    redirectTo: ''
  }
];
