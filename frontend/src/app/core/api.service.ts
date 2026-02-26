import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from './tokens';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = inject(API_BASE_URL);

  // helper to build absolute urls and include credentials by default
  public post<T>(path: string, body: unknown) {
    const url = `${this.base}${path}`;
    return this.http.post<T>(url, body);
  }

  public get<T>(path: string, params?: Record<string, string>) {
    return this.http.get<T>(`${this.base}${path}`, { params });
  }

  // add put/delete as needed
  public put<T>(path: string, body: unknown) {
    const url = `${this.base}${path}`;
    return this.http.put<T>(url, body);
  }

    public delete<T>(path: string) {
        const url = `${this.base}${path}`;
        return this.http.delete<T>(url);
    }
}