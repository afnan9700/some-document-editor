// src/app/auth/auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  // Directly evaluate the signal's current state
  if (!auth.isAuthenticated()) {
    // console.warn('AuthGuard: user not authenticated, redirecting to login');
    router.navigate(['/login']);
    return false;
  }
  return true;
};