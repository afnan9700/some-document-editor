// src/app/auth/auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { computed } from '@angular/core';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  // derived computed boolean
  const allowed = computed(() => auth.isAuthenticated());
  if (!allowed()) {
    router.navigate(['/login']);
    return false;
  }
  return true;
};