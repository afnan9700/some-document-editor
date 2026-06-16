// src/app/app.routes.ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/main-layout.component').then(m => m.MainLayoutComponent),
    
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
        path: 'documents/:id/open',
        loadComponent: () =>
          import('./documents/document-entry-page.component').then(
            (m) => m.DocumentEntryGatePageComponent,
          ),
      },
      {
        path: 'documents/:id/edit',
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
      // {
      //   path: 'documents/:id/collaborate',
      //   loadComponent: () => ,
      // },
      {
        path: 'requests',
        loadComponent: () =>
          import('./document-sharing/document-requests-page.component').then((m) => m.RequestsPageComponent),
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