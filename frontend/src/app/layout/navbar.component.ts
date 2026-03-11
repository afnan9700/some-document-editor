import { Component, ChangeDetectionStrategy, input, output, inject } from '@angular/core';
import { ThemeService } from '../core/theme.service';
import { TitleCasePipe } from '@angular/common';

@Component({
  selector: 'app-navbar',
  imports: [TitleCasePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="navbar bg-base-100 border-b border-base-200 px-4">
      <div class="flex-1">
        <span class="text-xl font-bold tracking-tight">some-doc-editor</span>
      </div>

      <div class="flex-none gap-4">
        
        <div class="dropdown dropdown-end">
          <div tabindex="0" role="button" class="btn btn-ghost m-1" aria-label="Select Theme">
            Theme
            <svg width="12px" height="12px" class="inline-block h-2 w-2 fill-current opacity-60 ml-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2048 2048">
              <path d="M1799 349l242 241-1017 1017L7 590l242-241 775 775 775-775z"></path>
            </svg>
          </div>
          <ul tabindex="-1" class="dropdown-content bg-base-200 rounded-box z-[1] w-52 p-2 shadow-2xl max-h-64 overflow-y-auto flex-nowrap">
            @for (theme of availableThemes; track theme) {
              <li>
                <input
                  type="radio"
                  name="theme-dropdown"
                  class="theme-controller w-full btn btn-sm btn-block btn-ghost justify-start"
                  [attr.aria-label]="theme | titlecase"
                  [value]="theme"
                  [checked]="themeService.currentTheme() === theme"
                  (change)="themeService.setTheme(theme)" 
                />
              </li>
            }
        </ul>
        </div>

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
  
  logout = output<void>();
  
  // We inject the service directly here so the template can read and write to it
  themeService = inject(ThemeService);
  
  // We define our rigorous list of acceptable themes
  readonly availableThemes = [
    'default', 
    'light', 
    'dark', 
    'cupcake', 
    'bumblebee', 
    'emerald', 
    'corporate', 
    'synthwave', 
    'retro', 
    'cyberpunk', 
    'valentine', 
    'halloween', 
    'garden', 
    'forest', 
    'aqua', 
    'lofi', 
    'pastel', 
    'fantasy', 
    'wireframe', 
    'black', 
    'luxury', 
    'dracula', 
    'cmyk', 
    'autumn', 
    'business', 
    'acid', 
    'lemonade', 
    'night', 
    'coffee', 
    'winter', 
    'dim', 
    'nord', 
    'sunset', 
    'caramellatte', 
    'abyss', 
    'silk'
  ];
}