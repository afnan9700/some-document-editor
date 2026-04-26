import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { NavbarComponent } from './navbar.component';
import { SidebarComponent } from './sidebar.component'; 
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, NavbarComponent, SidebarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="drawer lg:drawer-open">
      <input id="app-drawer" type="checkbox" class="drawer-toggle" [checked]="isDrawerOpen()" (change)="toggleDrawer()" />
      
      <div class="drawer-content flex flex-col h-screen overflow-hidden">
        <app-navbar 
          (themeToggle)="handleThemeToggle()"
          (logout)="handleLogout()">
        </app-navbar>
        
        <main class="flex-1 overflow-y-auto p-4 md:p-8 bg-base-100">
          <router-outlet></router-outlet> <!-- Routed page content will be rendered here -->
        </main>
      </div> 
      
      <div class="drawer-side z-40">
        <label for="app-drawer" aria-label="Close sidebar" class="drawer-overlay" (click)="closeDrawer()"></label>
        <app-sidebar></app-sidebar>
      </div>
    </div>
  `
})
export class MainLayoutComponent {
  private router = inject(Router);
  private auth = inject(AuthService);

  // Local UI state managed securely via signals
  isDrawerOpen = signal(false);

  toggleDrawer(): void {
    this.isDrawerOpen.update(state => !state);
  }

  closeDrawer(): void {
    this.isDrawerOpen.set(false);
  }

  handleThemeToggle(): void {
    console.log('Theme toggle triggered - pending implementation');
  }

  handleLogout(): void {
    // Clear auth tokens logically here before routing
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}