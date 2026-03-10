import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul class="menu p-4 w-64 min-h-full bg-base-200 text-base-content border-r border-base-300">
      <li class="mb-2">
        <a routerLink="/library" routerLinkActive="active font-bold bg-base-300">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
          My Library
        </a>
      </li>
      <li>
        <a routerLink="/requests" routerLinkActive="active font-bold bg-base-300">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          Access Requests
          @if (pendingRequests() > 0) {
            <span class="badge badge-primary badge-sm ml-auto">{{ pendingRequests() }}</span>
          }
        </a>
      </li>
    </ul>
  `
})
export class SidebarComponent {
  pendingRequests = input<number>(0);
}