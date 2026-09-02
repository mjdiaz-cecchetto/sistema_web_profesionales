import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Protege /admin: sin sesión activa redirige a /login. */
export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const cuenta = await auth.sesion();
  return cuenta ? true : router.createUrlTree(['/login']);
};
