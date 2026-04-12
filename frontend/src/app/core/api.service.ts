import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from './tokens';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = inject(API_BASE_URL);

  // helper to build absolute urls and include credentials by default
  get<T>(path: string, params?: Record<string, string>): Observable<T> {
    return this.http.get<T>(`${this.base}${path}`, { params });
  }

  post<T>(path: string, body: unknown, params?: Record<string, string>): Observable<T> {
    return this.http.post<T>(`${this.base}${path}`, body, { params });
  }

  put<T>(path: string, body: unknown, params?: Record<string, string>): Observable<T> {
    return this.http.put<T>(`${this.base}${path}`, body, { params });
  }

  delete<T>(path: string, params?: Record<string, string>): Observable<T> {
    return this.http.delete<T>(`${this.base}${path}`, { params });
  }
}