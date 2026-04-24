// src/app/app.routes.ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/main-layout.component').then(m => m.MainLayoutComponent),
    // loadComponent: () => import('./layout/main-layout.component').then(m => {console.log('MainLayout loaded'); return m.MainLayoutComponent}),
    
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
      {
        path: 'documents/:id',
        loadComponent: () =>
          import('./document-workspace/document-workspace-page.component').then(
            (m) => m.DocumentWorkspacePageComponent,
          ),
      },
      {
        path: 'documents/:id/readonly',
        loadComponent: () =>
          import('./document-workspace/document-workspace-page-readonly.component').then(
            (m) => m.DocumentWorkspaceReadonlyPageComponent,
          ),
      },
      {
        path: 'requests',
        loadComponent: () =>
          import('./document-sharing/requests-page.component').then((m) => m.RequestsPageComponent),
      },
      {
        path: 'invite/:token',
        loadComponent: () =>
          import('./document-sharing/invite-landing.component').then((m) => m.InviteLandingComponent),
      },
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