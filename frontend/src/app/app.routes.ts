import { Routes } from '@angular/router';
import { LandingComponent } from './landing/landing.component';

export const routes: Routes = [
  {
    path: '',
    component: LandingComponent
  },
  {
    path: 'client',
    loadChildren: () => import('./client/client.routes').then(m => m.clientRoutes)
  }
];
