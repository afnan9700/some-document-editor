import { provideAppInitializer, ApplicationConfig, provideBrowserGlobalErrorListeners, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { environment } from '../environments/environment';
import { API_BASE_URL } from './core/tokens';
import { jwtInterceptor } from './core/jwt.interceptor';
import { createCustomImageExtension, provideMarkdownRendererExtensions } from './markdown-editor/markdown-renderer/markdown-renderer.extensions';

import { routes } from './app.routes';
import { AuthService } from './auth/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAppInitializer(() => inject(AuthService).tryRestoreSession()),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([jwtInterceptor])),
    { provide: API_BASE_URL, useValue: environment.apiBaseUrl },
    
    ...provideMarkdownRendererExtensions(
      createCustomImageExtension(),
      // add more custom renderer extensions here later
    ),
  ]
};
