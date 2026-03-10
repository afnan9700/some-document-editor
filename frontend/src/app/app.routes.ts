// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/main-layout.component').then(m => m.MainLayoutComponent),
    // loadComponent: () => import('./layout/main-layout.component').then(m => {console.log('MainLayout loaded'); return m.MainLayoutComponent}),
    
    // The guard protects all child routes and redirects unauthenticated users to /login
    canActivate: [authGuard], 
    children: [
      { 
        // If an authenticated user hits the root path, send them to the library
        path: '', 
        redirectTo: 'library', 
        pathMatch: 'full' 
      },
      { 
        path: 'library', 
        loadComponent: () => import('./documents/library-page.component').then(m => m.LibraryPageComponent) 
        // loadComponent: () => import('./documents/library-page.component').then(m => {console.log('LibraryPage loaded'); return m.LibraryPageComponent})
      },
      // { 
      //   // The :id parameter will be extracted by the EditorPageComponent
      //   path: 'editor/:id', 
      //   loadComponent: () => import('./documents/editor-page.component').then(m => m.EditorPageComponent) 
      // },
    ]
  },
  { 
    // unauthenticated users will only have access to the auth layout and its child routes
    path: '',
    loadComponent: () => import('./layout/auth-layout.component').then(m => m.AuthLayoutComponent),
    // loadComponent: () => import('./layout/auth-layout.component').then(m => {console.log('AuthLayout loaded'); return m.AuthLayoutComponent}),
    children: [
      { 
        path: 'login', 
        loadComponent: () => import('./auth/login.component').then(m => m.LoginComponent) 
      },
      { 
        path: 'signup', 
        loadComponent: () => import('./auth/signup.component').then(m => m.SignupComponent) 
      }
    ]
  },
  { path: '**', redirectTo: '' }  // catch-all wildcard route to handle undefined paths
];