import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Protect routes that require authentication. */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  if (authService.isLoggedIn) return true;
  return router.createUrlTree(['/login']);
};

/** Redirect already-authenticated users away from login/register. */
export const noAuthGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  if (!authService.isLoggedIn) return true;
  return router.createUrlTree(['/dashboard']);
};

/** Protect routes that require ROLE_ADMIN. */
export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  if (authService.isLoggedIn && authService.currentUser?.role?.toUpperCase().includes('ADMIN')) return true;
  return router.createUrlTree(['/dashboard']);
};
