// src/app/core/theme.service.ts
import { Injectable, signal, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private document = inject(DOCUMENT);
  private readonly THEME_KEY = 'app-theme';  // Key for localStorage
  
  // We initialize the signal by checking localStorage, falling back to 'default'
  readonly currentTheme = signal<string>(this.getStoredTheme());

  constructor() {
    // Apply the theme immediately when the service is instantiated
    this.applyThemeToDOM(this.currentTheme());
  }

  setTheme(theme: string): void {
    this.currentTheme.set(theme);
    localStorage.setItem(this.THEME_KEY, theme);
    this.applyThemeToDOM(theme);
  }

  private getStoredTheme(): string {
    // Defensive check to ensure localStorage exists (for SSR safety)
    if (typeof window !== 'undefined' && localStorage) {
      return localStorage.getItem(this.THEME_KEY) || 'default';
    }
    return 'default';
  }

  private applyThemeToDOM(theme: string): void {
    this.document.documentElement.setAttribute('data-theme', theme);
  }
}