import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { JwtInterceptor } from './core/jwt.interceptor';

providers: [
  { provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true },
]