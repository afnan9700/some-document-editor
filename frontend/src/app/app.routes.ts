// src/app/app.routes.ts
import { Routes } from '@angular/router';
// import { LoginComponent } from './auth/login.component';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./auth/login.component').then(m => m.LoginComponent) },
  { path: 'signup', loadComponent: () => import('./auth/signup.component').then(m => m.SignupComponent) },
  // { path: '', loadComponent: () => import('./docs/library.component').then(m => m.LibraryComponent), canActivate: [() => import('./auth/auth.guard').then(g => g.authGuard)] },
  // { path: 'login', component: LoginComponent },
  { path: '**', redirectTo: '' }
];