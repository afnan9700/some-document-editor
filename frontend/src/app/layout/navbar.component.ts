import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

@Component({
  selector: 'app-navbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="navbar bg-base-100 border-b border-base-200 px-4">
      <div class="flex-1">
        <span class="text-xl font-bold tracking-tight">some-doc-editor</span>
      </div>
      <div class="flex-none gap-4">
        
        <button 
          class="btn btn-ghost btn-circle" 
          aria-label="Toggle Theme"
          (click)="themeToggle.emit()">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        </button>

        <div class="dropdown dropdown-end">
          <button tabindex="0" class="btn btn-ghost btn-circle avatar" aria-label="User Menu">
            <div class="w-10 rounded-full bg-neutral text-neutral-content grid place-items-center">
              <span class="text-lg">{{ userName().charAt(0) }}</span>
            </div>
          </button>
          <ul tabindex="0" class="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-52">
            <li class="menu-title"><span>{{ userName() }}</span></li>
            <li><a>Settings</a></li>
            <li><a (click)="logout.emit()" class="text-error">Logout</a></li>
          </ul>
        </div>
      </div>
    </div>
  `
})
export class NavbarComponent {
  // Signal inputs guarantee strict typing and reactive derived state
  userName = input.required<string>();
  
  // Signal outputs for parent communication
  themeToggle = output<void>();
  logout = output<void>();
}