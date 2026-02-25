// src/app/core/jwt.interceptor.ts
import { Injectable, inject } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, filter, take, switchMap } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { catchError } from 'rxjs/operators';

// @Injectable({ providedIn: 'root' })
@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  private auth = inject(AuthService);

  // queueing helpers
  private refreshing = false;
  private refreshSubject = new BehaviorSubject<string | null>(null);

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = this.auth.getAccessToken();
    let authReq = req;

    // attach token if present and request not to auth endpoints
    if (token && !this.isAuthEndpoint(req.url)) {
      authReq = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
        withCredentials: true, // keep cookies for cross-site setups
      });
    } else {
      // for auth endpoints we still send withCredentials to allow refresh cookie flow
      authReq = req.clone({ withCredentials: true });
    }

    return next.handle(authReq).pipe(
      catchError((err: unknown) => {
        if (err instanceof HttpErrorResponse && err.status === 401 && !this.isAuthEndpoint(req.url)) {
          return this.handle401(authReq, next);
        }
        return throwError(() => err);
      })
    );
  }

  private isAuthEndpoint(url: string): boolean {
    try {
      // naive: backend endpoints begin with /auth
      const u = new URL(url, window.location.origin);
      return u.pathname.startsWith('/auth');
    } catch {
      // fallback for relative urls
      return url.startsWith('/auth');
    }
  }

  private handle401(req: HttpRequest<unknown>, next: HttpHandler): Observable<any> {
    if (!this.refreshing) {
      this.refreshing = true;
      this.refreshSubject.next(null);

      // call refresh endpoint
      return this.auth.refresh().pipe(
        switchMap((tokenResp: unknown) => {
          // after refresh, get new token from service
          const newToken = this.auth.getAccessToken();
          this.refreshing = false;
          this.refreshSubject.next(newToken);
          // retry the original request with new token
          const cloned = req.clone({
            setHeaders: newToken ? { Authorization: `Bearer ${newToken}` } : {},
            withCredentials: true,
          });
          return next.handle(cloned);
        }),
        catchError(err => {
          this.refreshing = false;
          this.refreshSubject.next(null);
          // clear auth and escalate error to cause redirect to login
          this.auth.clear();
          return throwError(() => err);
        })
      );
    } else {
      // wait until refresh finishes
      return this.refreshSubject.pipe(
        filter(t => t !== null),
        take(1),
        switchMap(token => {
          const cloned = req.clone({
            setHeaders: token ? { Authorization: `Bearer ${token}` } : {},
            withCredentials: true,
          });
          return next.handle(cloned);
        })
      );
    }
  }
}