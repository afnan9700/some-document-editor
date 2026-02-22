import { Routes } from '@angular/router';

// lazy load components for auth routes
export const routes: Routes = [
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () => import('./auth/login.component').then(m => m.LoginComponent)
      },
      {
        path: 'signup',
        loadComponent: () => import('./auth/signup.component').then(m => m.SignupComponent)
      },
      { path: '', pathMatch: 'full', redirectTo: 'login' }
    ]
  },
  // rest of your routes, e.g. library, editor, protected with guards
//   { path: '', loadComponent: () => import('./docs/library.component').then(m => m.LibraryComponent) }
];