// src/app/app.routes.ts
import { Routes } from '@angular/router';

// lazy load components for auth routes
export const routes: Routes = [
  {
    path: '',
    // Lazy-load the Auth Layout shell
    loadComponent: () => import('./layout/auth-layout.component').then(m => m.AuthLayoutComponent),
    // canActivate: [guestGuard],
    children: [
      { 
        path: 'login', 
        loadComponent: () => import('./auth/login.component').then(m => m.LoginComponent) 
      },
      { 
        path: 'signup', 
        loadComponent: () => import('./auth/signup.component').then(m => m.SignupComponent) 
      },
    ]
  },
  { path: '**', redirectTo: '' }
];