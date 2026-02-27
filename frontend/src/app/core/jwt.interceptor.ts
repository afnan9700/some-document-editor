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
      // if 401 and not an auth endpoint, try refresh flow
      if (err instanceof HttpErrorResponse && err.status === 401 && !isAuthEndpoint(req.url)) {
        if (!refreshing) {
          refreshing = true;  // refresh process started
          refreshSubject.next(null);  // current access token is null until the refresh succeeds

          // call refresh endpoint
          return auth.refresh().pipe(
            switchMap((tokenResp: unknown) => {
              // after refresh, get new token from service
              const newToken = auth.getAccessToken();
              refreshing = false;  // refresh finished
              refreshSubject.next(newToken);   // emit new token to waiting requests

              // retry the original request with new token
              const cloned = authReq.clone({
                setHeaders: newToken ? { Authorization: `Bearer ${newToken}` } : {},
                withCredentials: true,
              });
              return next(cloned);
            }),
            catchError(err => {
              // refresh failed, reset state and clear auth
              refreshing = false;
              refreshSubject.next(null);
              // clear auth and escalate error to cause redirect to login
              auth.clear();
              return throwError(() => err);
            })
          );
        } else {
          // refresh already in progress
          return refreshSubject.pipe(
            filter(t => t !== null),  // rejecting null emissions until we have a new token
            take(1),  // take the next emitted token (after refresh completes)
            switchMap(token => {
              // retry the original request with the new token
              const cloned = authReq.clone({
                setHeaders: token ? { Authorization: `Bearer ${token}` } : {},
                withCredentials: true,
              }
            );
              
              return next(cloned);
            })
          );
        }
      }
      return throwError(() => err);
    })
  );
};