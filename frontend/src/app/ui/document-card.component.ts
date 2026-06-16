// document-card.component.ts
import { Component, ChangeDetectionStrategy, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { StatusBadgeComponent, DocStatus } from './status-badge.component';

@Component({
  selector: 'app-document-card',
  imports: [DatePipe, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="card bg-base-100 shadow-sm hover:shadow-md transition-shadow border border-base-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      (click)="openDoc.emit(id())"
      role="article"
      tabindex="0"
      (keydown.enter)="openDoc.emit(id())"
    >
      <div class="card-body p-5">
        <div class="flex justify-between items-start mb-2 gap-2">
          <h3 class="card-title text-lg truncate" [title]="title()">{{ title() }}</h3>
          <app-status-badge [status]="status()" />
        </div>

        <p class="text-sm text-base-content/70">
          Edited: {{ lastModified() | date:'mediumDate' }}
        </p>

        @if (status() !== 'owned') {
          <p class="text-xs text-base-content/50 mt-1">
            Owner: {{ ownerName() }}
          </p>
        }

        <div class="card-actions justify-end mt-4">
          <button
            class="btn btn-ghost btn-sm"
            aria-label="Collaborate on this document"
            (click)="$event.stopPropagation(); collaborateDoc.emit(id())"
          >
            Collaborate
          </button>

          <div class="dropdown dropdown-end" [class.dropdown-open]="actionsOpen()">
            <button
              type="button"
              class="btn btn-ghost btn-sm"
              aria-label="More actions"
              aria-haspopup="menu"
              [attr.aria-expanded]="actionsOpen()"
              (click)="toggleActions($event)"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 5.25a1.5 1.5 0 11-.001 3.001A1.5 1.5 0 0112 5.25zm0 5.75a1.5 1.5 0 11-.001 3.001A1.5 1.5 0 0112 11zm0 5.75a1.5 1.5 0 11-.001 3.001A1.5 1.5 0 0112 16.75z"
                />
              </svg>
            </button>

            @if (actionsOpen()) {
              <ul
                class="menu dropdown-content z-[1] mt-2 w-44 rounded-box bg-base-100 p-2 shadow"
                role="menu"
                (click)="$event.stopPropagation()"
              >
                <li role="none">
                  <button
                    type="button"
                    role="menuitem"
                    class="text-left"
                    (click)="handleShare($event)"
                  >
                    Share
                  </button>
                </li>

                @if (status() === 'owned') {
                  <li role="none">
                    <button
                      type="button"
                      role="menuitem"
                      class="text-left text-error"
                      (click)="handleDelete($event)"
                    >
                      Delete
                    </button>
                  </li>
                }
              </ul>
            }
          </div>
        </div>
      </div>
    </div>
  `,
})
export class DocumentCardComponent {
  id = input.required<string>();
  title = input.required<string>();
  lastModified = input.required<string | number>();
  ownerName = input.required<string>();
  status = input.required<DocStatus>();

  openDoc = output<string>();
  collaborateDoc = output<string>();
  shareDoc = output<string>();
  deleteDoc = output<string>();

  readonly actionsOpen = signal(false);

  toggleActions(event: MouseEvent): void {
    event.stopPropagation();
    this.actionsOpen.update((value) => !value);
  }

  handleShare(event: MouseEvent): void {
    event.stopPropagation();
    this.actionsOpen.set(false);
    this.shareDoc.emit(this.id());
  }

  handleDelete(event: MouseEvent): void {
    event.stopPropagation();
    this.actionsOpen.set(false);
    this.deleteDoc.emit(this.id());
  }
}