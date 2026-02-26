// src/app/core/jwt.interceptor.ts
import { inject } from '@angular/core';
import {
  HttpInterceptorFn,
  HttpRequest,
  HttpErrorResponse,
  HttpHandler,
  HttpEvent,
} from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, filter, take, switchMap } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { catchError } from 'rxjs/operators';

// State for handling token refresh (shared across interceptor calls)
let refreshing = false;
let refreshSubject = new BehaviorSubject<string | null>(null);

const isAuthEndpoint = (url: string): boolean => {
  try {
    const u = new URL(url, window.location.origin);
    return u.pathname.startsWith('/auth/signup') || u.pathname.startsWith('/auth/login') || u.pathname.startsWith('/auth/refresh');
  } catch {
    // fallback for relative urls
    return url.startsWith('/auth/signup') || url.startsWith('/auth/login') || url.startsWith('/auth/refresh');
  }
};

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getAccessToken();
  let authReq = req;
  console.log('JWT Interceptor: token is', token ? 'present' : 'absent', 'for request to', req.url);

  // attach token if present and request not to auth endpoints
  if (token && !isAuthEndpoint(req.url)) {
    authReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
      withCredentials: true, // keep cookies for cross-site setups
    });
  } else {
    // for auth endpoints we still send withCredentials to allow refresh cookie flow
    authReq = req.clone({ withCredentials: true });
  }

  return next(authReq).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401 && !isAuthEndpoint(req.url)) {
        if (!refreshing) {
          refreshing = true;
          refreshSubject.next(null);

          // call refresh endpoint
          return auth.refresh().pipe(
            switchMap((tokenResp: unknown) => {
              // after refresh, get new token from service
              const newToken = auth.getAccessToken();
              refreshing = false;
              refreshSubject.next(newToken);
              // retry the original request with new token
              const cloned = authReq.clone({
                setHeaders: newToken ? { Authorization: `Bearer ${newToken}` } : {},
                withCredentials: true,
              });
              return next(cloned);
            }),
            catchError(err => {
              refreshing = false;
              refreshSubject.next(null);
              // clear auth and escalate error to cause redirect to login
              auth.clear();
              return throwError(() => err);
            })
          );
        } else {
          // wait until refresh finishes
          return refreshSubject.pipe(
            filter(t => t !== null),
            take(1),
            switchMap(token => {
              const cloned = authReq.clone({
                setHeaders: token ? { Authorization: `Bearer ${token}` } : {},
                withCredentials: true,
              });
              return next(cloned);
            })
          );
        }
      }
      return throwError(() => err);
    })
  );
};