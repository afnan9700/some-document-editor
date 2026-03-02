// src/app/auth/auth.service.ts
import { inject, Injectable, signal, computed } from '@angular/core';
import type { AuthResponse, LoginRequest, SignupRequest, MeResponse } from './auth.models';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { tap, catchError, map, switchMap } from 'rxjs/operators';
import { ApiService } from '../core/api.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);
  // in-memory access token (not persisted to localStorage by default)
  private accessToken = signal<string | null>(null);
  // expose computed auth state
  readonly isAuthenticated = computed(() => !!this.accessToken());
  // small BehaviorSubject for user info
  private meSubject = new BehaviorSubject<MeResponse | null>(null);
  readonly me$ = this.meSubject.asObservable();

  // expose read-only getter
  getAccessToken(): string | null {
    return this.accessToken();
  }

  // login: sends credentials; backend returns access token and sets refresh cookie
  login(payload: LoginRequest): Observable<MeResponse> {
  return this.api.post<AuthResponse>('/auth/login', payload).pipe(
    tap(res => {
      this.accessToken.set(res.accessToken);
      console.log('Login successful, access token set');
    }),
    switchMap(() => this.loadMe()), // swtichMap automatically subscribes and unscribes to the observable
    catchError(err => throwError(() => err))
  );
}

  // signup behaves like login: backend issues accessToken & sets refresh cookie
  signup(payload: SignupRequest): Observable<MeResponse> {
    return this.api.post<AuthResponse>('/auth/signup', payload).pipe(
        tap(res => {
        this.accessToken.set(res.accessToken);
        }),
        switchMap(() => this.loadMe()), 
        catchError(err => throwError(() => err))
    );
  }

  // refresh: uses httpOnly cookie; backend returns a new access token and re-sets refresh cookie
  refresh(): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('/auth/refresh', {}).pipe(
      tap(res => this.accessToken.set(res.accessToken)),
      catchError(err => throwError(() => err))
    );
  }

  // load /me
  loadMe(): Observable<MeResponse> {
    return this.api.get<MeResponse>('/auth/me').pipe(
      tap(me => {
        this.meSubject.next(me); 
        // console.log('Loaded user info', me);
      }),
      catchError(err => {
        this.meSubject.next(null);
        return throwError(() => err);
      })
    );
  }

  // called by interceptor when refresh fails or user logs out
  clear(): void {
    this.accessToken.set(null);
    this.meSubject.next(null);
  }

  // expose a quick logout that clears client-side state; you may also call a backend logout if available
  logout(): void {
    this.clear();
    // if you have a server logout endpoint you may call it here, e.g. POST /auth/logout withCredentials
  }
}