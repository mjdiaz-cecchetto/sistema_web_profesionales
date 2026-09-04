import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { RolUsuario } from './models';

/**
 * Protege /admin (panel de una cuenta). Requiere cuenta activa: la logueada
 * o una impersonada por el administrador. Un admin sin impersonar va a /gestion.
 */
export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const cuenta = await auth.sesion();
  if (cuenta) return true;
  const admin = await auth.sesionAdmin();
  return router.createUrlTree([admin ? '/gestion' : '/login']);
};

/** Protege /gestion (back-office de la plataforma): solo administradores. */
export const gestionGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const admin = await auth.sesionAdmin();
  return admin ? true : router.createUrlTree(['/login']);
};

/**
 * Restringe una ruta de /admin a ciertos roles. El menú además la esconde;
 * este guard evita el acceso directo por URL. Redirige al dashboard.
 */
export const rolGuard = (roles: RolUsuario[]): CanActivateFn => async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.sesion();
  return roles.includes(auth.rol()) ? true : router.createUrlTree(['/admin/dashboard']);
};
